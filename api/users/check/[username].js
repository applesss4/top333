const { Vika } = require('@vikadata/vika');

const VIKA_CONFIG = {
  apiToken: process.env.VIKA_API_TOKEN || 'uskPGemFgQLFNdWMMNm8KRL',
  datasheetId: process.env.VIKA_DATASHEET_ID || 'dstj2Cp49ca1bXcfZ6'
};

const vika = new Vika({ token: VIKA_CONFIG.apiToken });
const userDatasheet = vika.datasheet(VIKA_CONFIG.datasheetId);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 从路径中解析用户名（/api/users/check/<username>）
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const parts = urlObj.pathname.split('/');
    const username = decodeURIComponent(parts.pop());

    if (!username) {
      return res.status(400).json({ success: false, message: '用户名参数缺失' });
    }

    const userResponse = await userDatasheet.records.query({
      filterByFormula: `{username} = "${username}"`
    });

    const exists = userResponse.success && userResponse.data.records.length > 0;
    return res.status(200).json({ exists });
  } catch (error) {
    console.error('检查用户是否存在API错误:', error);
    return res.status(500).json({ success: false, error: error.message || '服务器内部错误' });
  }
};