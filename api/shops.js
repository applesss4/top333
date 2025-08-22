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
          // 获取单个店铺
          const result = await callVikaAPI('GET', 
            `/datasheets/${VIKA_CONFIG.userDatasheetId}/records?filterByFormula=AND({code}='${shopId}')&fieldKey=name`);
          
          if (result.data && result.data.records && result.data.records.length > 0) {
            const shop = result.data.records[0];
            return res.status(200).json({
              ok: true,
              data: {
                id: shop.recordId,
                name: shop.fields.name,
                code: shop.fields.code
              }
            });
          } else {
            return res.status(404).json({ ok: false, message: 'Shop not found' });
          }
        } else {
          // 获取所有店铺
          const result = await callVikaAPI('GET', 
            `/datasheets/${VIKA_CONFIG.userDatasheetId}/records?fieldKey=name`);
          
          const shops = result.data?.records?.map(record => ({
            id: record.recordId,
            name: record.fields.name,
            code: record.fields.code
          })) || [];
          
          return res.status(200).json({ ok: true, data: shops });
        }

      case 'POST':
        // 创建新店铺
        const { name, code } = req.body;
        if (!name || !code) {
          return res.status(400).json({ 
            ok: false, 
            message: 'Name and code are required' 
          });
        }

        const createData = {
          records: [{
            fields: { name, code }
          }]
        };

        const createResult = await callVikaAPI('POST', 
          `/datasheets/${VIKA_CONFIG.userDatasheetId}/records`, createData);
        
        if (createResult.data && createResult.data.records && createResult.data.records.length > 0) {
          const newShop = createResult.data.records[0];
          return res.status(201).json({
            ok: true,
            data: {
              id: newShop.recordId,
              name: newShop.fields.name,
              code: newShop.fields.code
            }
          });
        } else {
          return res.status(500).json({ ok: false, message: 'Failed to create shop' });
        }

      case 'PUT':
        // 更新店铺
        if (!shopId) {
          return res.status(400).json({ ok: false, message: 'Shop ID is required' });
        }

        // 先查找记录ID
        const findResult = await callVikaAPI('GET', 
          `/datasheets/${VIKA_CONFIG.userDatasheetId}/records?filterByFormula=AND({code}='${shopId}')&fieldKey=name`);
        
        if (!findResult.data || !findResult.data.records || findResult.data.records.length === 0) {
          return res.status(404).json({ ok: false, message: 'Shop not found' });
        }

        const recordId = findResult.data.records[0].recordId;
        const updateFields = {};
        if (req.body.name) updateFields.name = req.body.name;
        if (req.body.code) updateFields.code = req.body.code;

        const updateData = {
          records: [{
            recordId,
            fields: updateFields
          }]
        };

        const updateResult = await callVikaAPI('PATCH', 
          `/datasheets/${VIKA_CONFIG.userDatasheetId}/records`, updateData);
        
        if (updateResult.data && updateResult.data.records && updateResult.data.records.length > 0) {
          const updatedShop = updateResult.data.records[0];
          return res.status(200).json({
            ok: true,
            data: {
              id: updatedShop.recordId,
              name: updatedShop.fields.name,
              code: updatedShop.fields.code
            }
          });
        } else {
          return res.status(500).json({ ok: false, message: 'Failed to update shop' });
        }

      case 'DELETE':
        // 删除店铺
        if (!shopId) {
          return res.status(400).json({ ok: false, message: 'Shop ID is required' });
        }

        // 先查找记录ID
        const deleteSearchResult = await callVikaAPI('GET', 
          `/datasheets/${VIKA_CONFIG.userDatasheetId}/records?filterByFormula=AND({code}='${shopId}')&fieldKey=name`);
        
        if (!deleteSearchResult.data || !deleteSearchResult.data.records || deleteSearchResult.data.records.length === 0) {
          return res.status(404).json({ ok: false, message: 'Shop not found' });
        }

        const deleteRecordId = deleteSearchResult.data.records[0].recordId;
        
        await callVikaAPI('DELETE', 
          `/datasheets/${VIKA_CONFIG.userDatasheetId}/records?recordIds=${deleteRecordId}`);
        
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