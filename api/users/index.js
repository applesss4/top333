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
    const { username, email, password } = body || {};

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: '用户名、邮箱和密码都是必填项' });
    }

    const existingUsers = await userDatasheet.records.query({
      filterByFormula: `{username} = "${username}"`
    });
    if (existingUsers.success && existingUsers.data.records.length > 0) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const createResponse = await userDatasheet.records.create([
      {
        fields: {
          username,
          email,
          password: hashedPassword,
          created_at: new Date().toISOString()
        }
      }
    ]);

    if (createResponse.success) {
      return res.status(201).json({
        success: true,
        message: '用户创建成功',
        user: {
          id: createResponse.data.records[0].recordId,
          username,
          email
        }
      });
    }

    throw new Error(createResponse.message || '创建用户失败');
  } catch (error) {
    console.error('创建用户API错误:', error);
    return res.status(500).json({ success: false, error: error.message || '服务器内部错误' });
  }
};