// 使用 Supabase 的用户管理 API
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { SupabaseUserService, testConnection } = require('../utils/supabase');

// JWT 密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

// 解析请求体的辅助函数
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

// 设置 CORS 头
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// 发送 JSON 响应
function sendJsonResponse(res, statusCode, data) {
  setCorsHeaders(res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// 主处理函数
module.exports = async (req, res) => {
  try {
    setCorsHeaders(res);
    
    // 处理 OPTIONS 请求
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    const method = req.method;
    
    console.log(`[Supabase API] ${method} ${pathname}`);

    // 诊断端点
    if (pathname === '/api/users' && url.searchParams.get('diag') === '1') {
      const isConnected = await testConnection();
      return sendJsonResponse(res, 200, {
        status: 'success',
        message: 'Supabase 用户 API 诊断',
        database: isConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
        endpoints: {
          'POST /api/users': '用户注册',
          'POST /api/users/login': '用户登录',
          'GET /api/users/check/{username}': '检查用户是否存在',
          'GET /api/users/profile/{username}': '获取用户资料',
          'PUT /api/users/profile/{username}': '更新用户资料',
          'GET /api/users?diag=1': '诊断端点'
        }
      });
    }

    // 用户注册
    if ((pathname === '/api/users' || pathname === '/api/register') && method === 'POST') {
      try {
        const body = await parseRequestBody(req);
        const { username, password, email, phone } = body;

        // 验证必填字段
        if (!username || !password) {
          return sendJsonResponse(res, 400, {
            success: false,
            message: '用户名和密码为必填项'
          });
        }

        // 检查用户是否已存在
        const userExists = await SupabaseUserService.checkUserExists(username);
        if (userExists) {
          return sendJsonResponse(res, 400, {
            success: false,
            message: '用户名已存在'
          });
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);

        // 创建用户
        const newUser = await SupabaseUserService.createUser({
          username,
          password: hashedPassword,
          email,
          phone
        });

        // 生成 JWT token
        const token = jwt.sign(
          { 
            userId: newUser.id, 
            username: newUser.username 
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        return sendJsonResponse(res, 201, {
          success: true,
          message: '用户注册成功',
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            phone: newUser.phone,
            created_at: newUser.created_at
          },
          token
        });

      } catch (error) {
        console.error('用户注册错误:', error);
        return sendJsonResponse(res, 500, {
          success: false,
          message: '注册失败',
          error: error.message
        });
      }
    }

    // 用户登录
    if ((pathname === '/api/users/login' || pathname === '/api/login') && method === 'POST') {
      try {
        const body = await parseRequestBody(req);
        const { username, password } = body;

        if (!username || !password) {
          return sendJsonResponse(res, 400, {
            success: false,
            message: '用户名和密码为必填项'
          });
        }

        // 获取用户信息
        const user = await SupabaseUserService.getUserByUsername(username);
        if (!user) {
          return sendJsonResponse(res, 401, {
            success: false,
            message: '用户名或密码错误'
          });
        }

        // 验证密码
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return sendJsonResponse(res, 401, {
            success: false,
            message: '用户名或密码错误'
          });
        }

        // 更新最后登录时间
        await SupabaseUserService.updateUser(username, {
          last_login: new Date().toISOString()
        });

        // 生成 JWT token
        const token = jwt.sign(
          { 
            userId: user.id, 
            username: user.username 
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        return sendJsonResponse(res, 200, {
          success: true,
          message: '登录成功',
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            phone: user.phone,
            last_login: user.last_login
          },
          token
        });

      } catch (error) {
        console.error('用户登录错误:', error);
        return sendJsonResponse(res, 500, {
          success: false,
          message: '登录失败',
          error: error.message
        });
      }
    }

    // 验证用户token
    if (pathname === '/api/users/validate' && method === 'POST') {
      try {
        const body = await parseRequestBody(req);
        const { token } = body;

        if (!token) {
          return sendJsonResponse(res, 400, {
            success: false,
            message: 'Token不能为空'
          });
        }

        // 验证 JWT token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // 获取用户信息
        const user = await SupabaseUserService.getUserByUsername(decoded.username);
        if (!user) {
          return sendJsonResponse(res, 401, {
            success: false,
            message: '用户不存在'
          });
        }

        // 不返回密码
        const { password, ...userProfile } = user;
        
        return sendJsonResponse(res, 200, {
          success: true,
          message: 'Token验证成功',
          user: userProfile
        });

      } catch (error) {
        console.error('Token验证错误:', error);
        return sendJsonResponse(res, 401, {
          success: false,
          message: 'Token无效或已过期',
          error: error.message
        });
      }
    }

    // 检查用户是否存在
    if (pathname.startsWith('/api/users/check/') && method === 'GET') {
      try {
        const username = pathname.split('/').pop();
        
        if (!username) {
          return sendJsonResponse(res, 400, {
            success: false,
            message: '用户名不能为空'
          });
        }

        const userExists = await SupabaseUserService.checkUserExists(username);
        
        return sendJsonResponse(res, 200, {
          success: true,
          exists: userExists,
          username: username
        });

      } catch (error) {
        console.error('检查用户存在错误:', error);
        return sendJsonResponse(res, 500, {
          success: false,
          message: '检查用户失败',
          error: error.message
        });
      }
    }

    // 获取用户资料
    if (pathname.startsWith('/api/users/profile/') && method === 'GET') {
      try {
        const username = pathname.split('/').pop();
        
        if (!username) {
          return sendJsonResponse(res, 400, {
            success: false,
            message: '用户名不能为空'
          });
        }

        const user = await SupabaseUserService.getUserByUsername(username);
        
        if (!user) {
          return sendJsonResponse(res, 404, {
            success: false,
            message: '用户不存在'
          });
        }

        // 不返回密码
        const { password, ...userProfile } = user;
        
        return sendJsonResponse(res, 200, {
          success: true,
          user: userProfile
        });

      } catch (error) {
        console.error('获取用户资料错误:', error);
        return sendJsonResponse(res, 500, {
          success: false,
          message: '获取用户资料失败',
          error: error.message
        });
      }
    }

    // 更新用户资料
    if (pathname.startsWith('/api/users/profile/') && method === 'PUT') {
      try {
        const username = pathname.split('/').pop();
        const body = await parseRequestBody(req);
        
        if (!username) {
          return sendJsonResponse(res, 400, {
            success: false,
            message: '用户名不能为空'
          });
        }

        // 验证用户是否存在
        const userExists = await SupabaseUserService.checkUserExists(username);
        if (!userExists) {
          return sendJsonResponse(res, 404, {
            success: false,
            message: '用户不存在'
          });
        }

        // 过滤允许更新的字段
        const allowedFields = ['email', 'phone', 'full_name', 'bio', 'avatar_url'];
        const updateData = {};
        
        for (const field of allowedFields) {
          if (body[field] !== undefined) {
            updateData[field] = body[field];
          }
        }

        if (Object.keys(updateData).length === 0) {
          return sendJsonResponse(res, 400, {
            success: false,
            message: '没有提供有效的更新字段'
          });
        }

        const updatedUser = await SupabaseUserService.updateUser(username, updateData);
        
        // 不返回密码
        const { password, ...userProfile } = updatedUser;
        
        return sendJsonResponse(res, 200, {
          success: true,
          message: '用户资料更新成功',
          user: userProfile
        });

      } catch (error) {
        console.error('更新用户资料错误:', error);
        return sendJsonResponse(res, 500, {
          success: false,
          message: '更新用户资料失败',
          error: error.message
        });
      }
    }

    // 未找到的路由
    return sendJsonResponse(res, 404, {
      success: false,
      message: '未找到请求的端点',
      available_endpoints: [
        'POST /api/users - 用户注册',
        'POST /api/users/login - 用户登录',
        'GET /api/users/check/{username} - 检查用户是否存在',
        'GET /api/users/profile/{username} - 获取用户资料',
        'PUT /api/users/profile/{username} - 更新用户资料',
        'GET /api/users?diag=1 - 诊断端点'
      ]
    });

  } catch (error) {
    console.error('API 处理错误:', error);
    return sendJsonResponse(res, 500, {
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
};