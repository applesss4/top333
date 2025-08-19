// Vercel无服务器函数 - 用户管理
const { Vika } = require('@vikadata/vika');
const bcrypt = require('bcryptjs');

// 维格表配置
const VIKA_CONFIG = {
  apiToken: process.env.VIKA_API_TOKEN || 'uskPGemFgQLFNdWMMNm8KRL',
  datasheetId: process.env.VIKA_DATASHEET_ID || 'dstj2Cp49ca1bXcfZ6',
  baseUrl: 'https://vika.cn/fusion/v1'
};

// 初始化维格表
const vika = new Vika({ token: VIKA_CONFIG.apiToken });
const userDatasheet = vika.datasheet(VIKA_CONFIG.datasheetId);

// 密码加密
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

// 密码验证
async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

// 解析请求体（在某些环境中 req.body 可能未被自动解析）
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
  // 设置CORS头（同源部署下也安全）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 统一解析 URL 和 body
  const { method } = req;
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = urlObj.pathname; // e.g. /api/users, /api/users/validate, /api/users/check/xxx
  const body = await parseJsonBody(req);

  try {
    // 创建用户
    if (method === 'POST' && pathname === '/api/users') {
      const { username, email, password } = body;
      if (!username || !email || !password) {
        return res.status(400).json({ success: false, message: '用户名、邮箱和密码都是必填项' });
      }

      const existingUsers = await userDatasheet.records.query({
        filterByFormula: `{username} = "${username}"`
      });
      if (existingUsers.success && existingUsers.data.records.length > 0) {
        return res.status(400).json({ success: false, message: '用户名已存在' });
      }

      const hashedPassword = await hashPassword(password);
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
    }

    // 验证用户
    if (method === 'POST' && pathname === '/api/users/validate') {
      const { username, password } = body;
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
      const isPasswordValid = await verifyPassword(password, user.fields.password);
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
    }

    // 检查用户是否存在
    if (method === 'GET' && pathname.startsWith('/api/users/check/')) {
      const username = decodeURIComponent(pathname.split('/').pop());
      if (!username) {
        return res.status(400).json({ success: false, message: '用户名参数缺失' });
      }
      const userResponse = await userDatasheet.records.query({
        filterByFormula: `{username} = "${username}"`
      });
      return res.status(200).json({ exists: userResponse.success && userResponse.data.records.length > 0 });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('用户API错误:', error);
    return res.status(500).json({ success: false, error: error.message || '服务器内部错误' });
  }
};