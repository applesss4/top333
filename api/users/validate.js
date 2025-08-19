const { Vika } = require('@vikadata/vika');
const bcrypt = require('bcryptjs');

const VIKA_CONFIG = {
  apiToken: process.env.VIKA_API_TOKEN || 'uskPGemFgQLFNdWMMNm8KRL',
  datasheetId: process.env.VIKA_DATASHEET_ID || 'dstj2Cp49ca1bXcfZ6'
};

const vika = new Vika({ token: VIKA_CONFIG.apiToken });
const userDatasheet = vika.datasheet(VIKA_CONFIG.datasheetId);

async function parseJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('application/json')) return {};
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => {
      try {
        const parsed = data ? JSON.parse(data) : {};
        resolve(parsed);
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const body = await parseJsonBody(req);
    const { username, password } = body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码都是必填项' });
    }

    const userResponse = await userDatasheet.records.query({
      filterByFormula: `{username} = "${username}"`
    });

    if (!userResponse.success || userResponse.data.records.length === 0) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const user = userResponse.data.records[0];
    const isPasswordValid = await bcrypt.compare(password, user.fields.password);
    if (isPasswordValid) {
      return res.status(200).json({
        success: true,
        message: '登录成功',
        user: {
          id: user.recordId,
          username: user.fields.username,
          email: user.fields.email
        }
      });
    }
    return res.status(401).json({ success: false, message: '用户名或密码错误' });
  } catch (error) {
    console.error('用户验证API错误:', error);
    return res.status(500).json({ success: false, error: error.message || '服务器内部错误' });
  }
};