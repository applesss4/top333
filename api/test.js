// Vercel无服务器函数 - 测试维格表连接
const { Vika } = require('@vikadata/vika');

// 维格表配置
const VIKA_CONFIG = {
  apiToken: process.env.VIKA_API_TOKEN || 'uskPGemFgQLFNdWMMNm8KRL',
  datasheetId: process.env.VIKA_DATASHEET_ID || 'dstj2Cp49ca1bXcfZ6',
  baseUrl: 'https://vika.cn/fusion/v1'
};

module.exports = async (req, res) => {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 初始化维格表
    const vika = new Vika({ token: VIKA_CONFIG.apiToken });
    const datasheet = vika.datasheet(VIKA_CONFIG.datasheetId);

    // 测试连接 - 获取数据表信息
    const response = await datasheet.records.query({ maxRecords: 1 });

    if (response.success) {
      return res.status(200).json({
        success: true,
        message: '维格表连接成功',
        recordCount: response.data.total
      });
    } else {
      throw new Error(response.message || '维格表连接失败');
    }
  } catch (error) {
    console.error('维格表连接测试失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '维格表连接失败'
    });
  }
};