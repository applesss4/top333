// Vercel无服务器函数 - 用户管理
// 使用无SDK的简化实现，避免Vercel环境依赖问题
const safeFetch = (typeof fetch === 'function') ? fetch : require('node-fetch');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken, optionalAuth } = require('./middleware/auth');

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 维格表配置
const VIKA_CONFIG = {
  apiToken: process.env.VIKA_API_TOKEN,
  datasheetId: process.env.VIKA_DATASHEET_ID,
  baseUrl: process.env.VIKA_BASE_URL || 'https://vika.cn/fusion/v1'
};

// 直接调用 Vika REST API 的辅助函数
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
        console.log(`调用Vika API: ${method} ${url}`);
        const response = await safeFetch(url, options);
        const rawText = await response.text();
        let result;
        try {
            result = rawText ? JSON.parse(rawText) : {};
        } catch (parseError) {
            console.error('解析Vika API响应失败:', parseError, 'Raw text:', rawText);
            result = { raw: rawText };
        }
        
        if (!response.ok) {
            console.error(`Vika API错误: ${response.status}`, result);
            const err = new Error(result?.message || result?.msg || result?.code || `Vika API error: ${response.status}`);
            err.status = response.status;
            err.details = result;
            err.url = url;
            throw err;
        }
        
        console.log(`Vika API成功响应: ${method} ${url}`);
        return result;
    } catch (error) {
        console.error(`Vika API请求失败: ${method} ${url}`, error);
        throw error;
    }
}

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

  // 检查必要的环境变量
  if (!VIKA_CONFIG.apiToken || !VIKA_CONFIG.datasheetId) {
    console.error('缺少必要的环境变量:', {
      hasToken: !!VIKA_CONFIG.apiToken,
      hasDatasheetId: !!VIKA_CONFIG.datasheetId
    });
    return res.status(500).json({
      success: false,
      error: '服务器配置错误：缺少必要的环境变量'
    });
  }

  // 统一获取查询参数的工具函数（兼容 Vercel/Node 环境）
  const getQueryParam = (name) => {
    try {
      if (req.query && Object.prototype.hasOwnProperty.call(req.query, name)) return req.query[name];
      const u = new URL(req.url, 'http://localhost');
      return u.searchParams.get(name);
    } catch (_) { return undefined; }
  };

  // 诊断模式：GET /api/users?diag=1
  try {
    const diag = getQueryParam('diag');
    if ((req.method === 'GET') && (diag === '1' || diag === 'true')) {
      return res.status(200).json({
        success: true,
        message: 'Users API diagnostic',
        env: {
          hasGlobalFetch: typeof fetch === 'function',
          runtime: process.version,
          hasToken: !!VIKA_CONFIG.apiToken,
          hasUserSheetId: !!VIKA_CONFIG.datasheetId,
          baseUrl: VIKA_CONFIG.baseUrl
        }
      });
    }
  } catch (_) {}

  // 统一解析 URL 和 body
  const { method } = req;
  const urlObj = new URL(req.url, 'http://localhost'); // 使用本地兜底，避免 req.headers.host 缺失
  const pathname = urlObj.pathname; // e.g. /api/users, /api/users/validate, /api/users/check/xxx
  const body = await parseJsonBody(req);

  try {
    // 创建用户
    if (method === 'POST' && pathname === '/api/users') {
      const { username, email, password } = body;
      if (!username || !email || !password) {
        return res.status(400).json({ success: false, message: '用户名、邮箱和密码都是必填项' });
      }

      // 查询是否已存在
      const checkResp = await callVikaAPI('GET', `/datasheets/${VIKA_CONFIG.datasheetId}/records?fieldKey=name&filterByFormula=${encodeURIComponent(`{username} = "${username}"`)}`);
      if (checkResp.success && Array.isArray(checkResp.data?.records) && checkResp.data.records.length > 0) {
        return res.status(400).json({ success: false, message: '用户名已存在' });
      }

      const hashedPassword = await hashPassword(password);
      const payload = {
        records: [{
          fields: {
            username,
            email,
            password: hashedPassword,
            created_at: new Date().toISOString()
          }
        }],
        fieldKey: 'name'
      };
      const createResponse = await callVikaAPI('POST', `/datasheets/${VIKA_CONFIG.datasheetId}/records`, payload);

      if (createResponse.success) {
        const rec = createResponse.data.records[0];
        return res.status(201).json({
          success: true,
          message: '用户创建成功',
          user: {
            id: rec.recordId,
            username,
            email
          }
        });
      }
      throw new Error(createResponse.message || '创建用户失败');
    }

    // 验证用户 (支持两个路径: /api/users/validate 和 /api/login)，以及 /api/users 上的登录形态（username+password 且无 email）
    if (
      method === 'POST' && (
        pathname === '/api/users/validate' ||
        pathname === '/api/login' ||
        (pathname === '/api/users' && body && body.username && body.password && !body.email)
      )
    ) {
      const { username, password } = body;
      if (!username || !password) {
        return res.status(400).json({ success: false, message: '用户名和密码都是必填项' });
      }

      const userResponse = await callVikaAPI('GET', `/datasheets/${VIKA_CONFIG.datasheetId}/records?fieldKey=name&filterByFormula=${encodeURIComponent(`{username} = "${username}"`)}`);
      if (!userResponse.success || !Array.isArray(userResponse.data?.records) || userResponse.data.records.length === 0) {
        return res.status(401).json({ success: false, message: '用户名或密码错误' });
      }

      const user = userResponse.data.records[0];
      const isPasswordValid = await verifyPassword(password, user.fields.password);
      if (isPasswordValid) {
        // 生成JWT token
        const token = jwt.sign(
          {
            id: user.recordId,
            username: user.fields.username,
            email: user.fields.email
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );
        
        return res.status(200).json({
          success: true,
          message: '登录成功',
          token,
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
      const userResponse = await callVikaAPI('GET', `/datasheets/${VIKA_CONFIG.datasheetId}/records?fieldKey=name&filterByFormula=${encodeURIComponent(`{username} = "${username}"`)}`);
      return res.status(200).json({ exists: userResponse.success && Array.isArray(userResponse.data?.records) && userResponse.data.records.length > 0 });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('用户API错误:', error);
    return res.status(500).json({ success: false, error: error.message || '服务器内部错误' });
  }
};