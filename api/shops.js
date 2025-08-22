// Vercel 无服务器函数 - 店铺管理端点
// 处理店铺的创建、读取、更新、删除操作

const safeFetch = fetch;

const VIKA_CONFIG = {
  apiToken: process.env.VIKA_API_TOKEN,
  userDatasheetId: process.env.VIKA_DATASHEET_ID,
  scheduleDatasheetId: process.env.VIKA_SCHEDULE_DATASHEET_ID,
  baseUrl: process.env.VIKA_BASE_URL || 'https://vika.cn/fusion/v1'
};

async function callVikaAPI(method, endpoint, data = null) {
  const url = `${VIKA_CONFIG.baseUrl}${endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${VIKA_CONFIG.apiToken}`,
      'Content-Type': 'application/json'
    }
  };
  
  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }
  
  const response = await safeFetch(url, options);
  const rawText = await response.text();
  let result;
  try {
    result = rawText ? JSON.parse(rawText) : {};
  } catch (_) {
    result = { raw: rawText };
  }
  
  if (!response.ok) {
    const error = new Error(`API call failed: ${response.status}`);
    error.status = response.status;
    error.response = result;
    throw error;
  }
  
  return result;
}

module.exports = async (req, res) => {
  // CORS 配置 - 支持所有必要的方法
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 检查必要的环境变量
  if (!VIKA_CONFIG.apiToken || !VIKA_CONFIG.userDatasheetId) {
    return res.status(500).json({ 
      ok: false, 
      message: 'Missing required environment variables' 
    });
  }

  try {
    const { query, url } = req;
    // 从URL路径中提取店铺ID (例如: /api/shops/branch1 -> branch1)
    const urlParts = url.split('/');
    const shopId = urlParts.length > 3 ? urlParts[3] : null;

    switch (req.method) {
      case 'GET':
        // 获取店铺列表或单个店铺
        if (shopId) {
          // 获取单个店铺 - 从日程表中查找包含该店铺的记录
          const result = await callVikaAPI('GET', 
            `/datasheets/${VIKA_CONFIG.scheduleDatasheetId}/records?filterByFormula=FIND('${shopId}',{工作店铺})&fieldKey=name`);
          
          if (result.data && result.data.records && result.data.records.length > 0) {
            return res.status(200).json({
              ok: true,
              data: {
                id: shopId,
                name: shopId,
                code: shopId
              }
            });
          } else {
            return res.status(404).json({ ok: false, message: 'Shop not found' });
          }
        } else {
          // 获取所有店铺 - 从日程表中提取所有唯一的店铺名称
          const result = await callVikaAPI('GET', 
            `/datasheets/${VIKA_CONFIG.scheduleDatasheetId}/records?fieldKey=name`);
          
          const shopSet = new Set();
          result.data?.records?.forEach(record => {
            const shops = record.fields['工作店铺'];
            if (Array.isArray(shops)) {
              shops.forEach(shop => shopSet.add(shop));
            }
          });
          
          const shops = Array.from(shopSet).map(shopName => ({
            id: shopName,
            name: shopName,
            code: shopName
          }));
          
          return res.status(200).json({ ok: true, data: shops });
        }

      case 'POST':
        // 创建新店铺 - 实际上是创建一个包含新店铺的日程记录
        const { name, code } = req.body;
        if (!name || !code) {
          return res.status(400).json({ 
            ok: false, 
            message: 'Name and code are required' 
          });
        }

        // 创建一个示例日程记录来添加新店铺
        const createData = {
          records: [{
            fields: {
              '工作店铺': [name],
              '工作日期': new Date().getTime(),
              '开始时间': '09:00',
              '结束时间': '17:00',
              '工作时长': 8
            }
          }]
        };

        const createResult = await callVikaAPI('POST', 
          `/datasheets/${VIKA_CONFIG.scheduleDatasheetId}/records`, createData);
        
        if (createResult.data && createResult.data.records && createResult.data.records.length > 0) {
          return res.status(201).json({
            ok: true,
            data: {
              id: name,
              name: name,
              code: code
            }
          });
        } else {
          return res.status(500).json({ ok: false, message: 'Failed to create shop' });
        }

      case 'PUT':
        // 更新店铺 - 更新所有包含该店铺的日程记录
        if (!shopId) {
          return res.status(400).json({ ok: false, message: 'Shop ID is required' });
        }

        const { name: newName } = req.body;
        if (!newName) {
          return res.status(400).json({ ok: false, message: 'New name is required' });
        }

        // 查找所有包含该店铺的记录
        const findResult = await callVikaAPI('GET', 
          `/datasheets/${VIKA_CONFIG.scheduleDatasheetId}/records?filterByFormula=FIND('${shopId}',{工作店铺})&fieldKey=name`);
        
        if (!findResult.data || !findResult.data.records || findResult.data.records.length === 0) {
          return res.status(404).json({ ok: false, message: 'Shop not found' });
        }

        // 更新所有相关记录
        const updatePromises = findResult.data.records.map(record => {
          const updatedShops = record.fields['工作店铺'].map(shop => 
            shop === shopId ? newName : shop
          );
          
          const updateData = {
            records: [{
              recordId: record.recordId,
              fields: { '工作店铺': updatedShops }
            }]
          };
          
          return callVikaAPI('PATCH', `/datasheets/${VIKA_CONFIG.scheduleDatasheetId}/records`, updateData);
        });

        await Promise.all(updatePromises);
        
        return res.status(200).json({
          ok: true,
          data: {
            id: newName,
            name: newName,
            code: newName
          }
        });

      case 'DELETE':
        // 删除店铺 - 从所有日程记录中移除该店铺
        if (!shopId) {
          return res.status(400).json({ ok: false, message: 'Shop ID is required' });
        }

        // 查找所有包含该店铺的记录
        const deleteSearchResult = await callVikaAPI('GET', 
          `/datasheets/${VIKA_CONFIG.scheduleDatasheetId}/records?filterByFormula=FIND('${shopId}',{工作店铺})&fieldKey=name`);
        
        if (!deleteSearchResult.data || !deleteSearchResult.data.records || deleteSearchResult.data.records.length === 0) {
          return res.status(404).json({ ok: false, message: 'Shop not found' });
        }

        // 从所有相关记录中移除该店铺
        const deletePromises = deleteSearchResult.data.records.map(record => {
          const updatedShops = record.fields['工作店铺'].filter(shop => shop !== shopId);
          
          if (updatedShops.length === 0) {
            // 如果没有其他店铺，删除整个记录
            return callVikaAPI('DELETE', 
              `/datasheets/${VIKA_CONFIG.scheduleDatasheetId}/records?recordIds=${record.recordId}`);
          } else {
            // 否则更新记录，移除该店铺
            const updateData = {
              records: [{
                recordId: record.recordId,
                fields: { '工作店铺': updatedShops }
              }]
            };
            return callVikaAPI('PATCH', `/datasheets/${VIKA_CONFIG.scheduleDatasheetId}/records`, updateData);
          }
        });

        await Promise.all(deletePromises);
        
        return res.status(200).json({ ok: true, message: 'Shop deleted successfully' });

      default:
        return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
    }
  } catch (error) {
    console.error('Shop API Error:', error);
    return res.status(error.status || 500).json({ 
      ok: false, 
      message: error.message || 'Internal Server Error',
      details: error.response || null
    });
  }
};