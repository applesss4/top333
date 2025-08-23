// Vercel无服务器函数 - 酒店信息管理
const bcrypt = require('bcryptjs');
const { authenticateToken, optionalAuth } = require('./middleware/auth');

// 维格表配置
const VIKA_CONFIG = {
  apiToken: process.env.VIKA_API_TOKEN,
  hotelDatasheetId: process.env.VIKA_HOTEL_DATASHEET_ID || process.env.VIKA_DATASHEET_ID,
  baseUrl: process.env.VIKA_BASE_URL || 'https://vika.cn/fusion/v1'
};

// 调用维格表API的通用函数
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
  
  try {
    const response = await fetch(url, options);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`维格表API错误: ${result.message || response.statusText}`);
    }
    
    return { success: true, data: result.data };
  } catch (error) {
    console.error('维格表API调用失败:', error);
    return { success: false, error: error.message };
  }
}

// 解析请求体
async function parseJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

// 主处理函数
export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 检查维格表配置
  if (!VIKA_CONFIG.apiToken || !VIKA_CONFIG.hotelDatasheetId) {
    return res.status(500).json({
      success: false,
      message: '服务器配置错误：缺少维格表配置'
    });
  }

  // JWT认证检查
  const user = authenticateToken(req, res);
  if (!user) {
    return; // 认证失败，已在中间件中返回错误响应
  }
  req.user = user; // 将用户信息附加到请求对象

  const { method } = req;
  const urlParts = req.url.split('/');
  const username = urlParts[urlParts.length - 1];

  try {
    if (method === 'GET') {
      // 获取酒店信息
      const response = await callVikaAPI(
        'GET',
        `/datasheets/${VIKA_CONFIG.hotelDatasheetId}/records?fieldKey=name&filterByFormula=${encodeURIComponent(`{username} = "${username}"`)}`
      );
      
      if (!response.success) {
        return res.status(500).json({
          success: false,
          message: '获取酒店信息失败',
          error: response.error
        });
      }
      
      const records = response.data?.records || [];
      if (records.length === 0) {
        return res.status(404).json({
          success: false,
          message: '未找到酒店信息'
        });
      }
      
      const hotelData = records[0].fields;
      return res.status(200).json({
        success: true,
        data: hotelData
      });
      
    } else if (method === 'PUT') {
      // 更新酒店信息
      const body = await parseJsonBody(req);
      const { websiteName, hotelName, username: newUsername } = body;
      
      // 先查找是否存在记录
      const existingResponse = await callVikaAPI(
        'GET',
        `/datasheets/${VIKA_CONFIG.hotelDatasheetId}/records?fieldKey=name&filterByFormula=${encodeURIComponent(`{username} = "${username}"`)}`
      );
      
      const hotelData = {
        username: newUsername || username,
        websiteName: hotelName || websiteName || 'URO Hotel',
        updatedAt: new Date().toISOString()
      };
      
      let response;
      if (existingResponse.success && existingResponse.data?.records?.length > 0) {
        // 更新现有记录
        const recordId = existingResponse.data.records[0].recordId;
        response = await callVikaAPI(
          'PATCH',
          `/datasheets/${VIKA_CONFIG.hotelDatasheetId}/records`,
          {
            records: [{
              recordId,
              fields: hotelData
            }]
          }
        );
      } else {
        // 创建新记录
        hotelData.createdAt = new Date().toISOString();
        response = await callVikaAPI(
          'POST',
          `/datasheets/${VIKA_CONFIG.hotelDatasheetId}/records`,
          {
            records: [{
              fields: hotelData
            }]
          }
        );
      }
      
      if (!response.success) {
        return res.status(500).json({
          success: false,
          message: '保存酒店信息失败',
          error: response.error
        });
      }
      
      return res.status(200).json({
        success: true,
        message: '酒店信息保存成功',
        data: hotelData
      });
      
    } else {
      return res.status(405).json({
        success: false,
        message: '不支持的请求方法'
      });
    }
    
  } catch (error) {
    console.error('酒店信息API错误:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
}