const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { SupabaseUserService, testConnection } = require('../utils/supabase');

// 导入中间件（保持原有的中间件）
const { schemas, validateInput, sanitizeInput } = require('./middleware/validation');
const { responseFormatter } = require('./middleware/response');
const { generalLimiter, authLimiter, registerLimiter, helmetConfig } = require('./middleware/security');
const { authenticateToken, optionalAuth, checkUserPermission } = require('./middleware/auth');
const { 
    requestDeduplication, 
    responseCompression, 
    performanceMonitor, 
    cacheStatsHandler, 
    clearCacheHandler,
    cacheWarmup 
} = require('./middleware/performance');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// JWT密钥配置
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    console.error('警告: 生产环境未设置JWT_SECRET环境变量');
    process.exit(1);
}

// Supabase配置检查
if (!process.env.SUPABASE_URL && process.env.NODE_ENV === 'production') {
    console.error('警告: 生产环境未设置SUPABASE_URL环境变量');
    process.exit(1);
}

if (!process.env.SUPABASE_ANON_KEY && process.env.NODE_ENV === 'production') {
    console.error('警告: 生产环境未设置SUPABASE_ANON_KEY环境变量');
    process.exit(1);
}

// 中间件配置
app.use(helmetConfig);
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(responseFormatter);
app.use(generalLimiter);

// 性能中间件
app.use(responseCompression);
app.use(performanceMonitor);
app.use(requestDeduplication);

// 缓存管理端点
app.get('/api/cache/stats', cacheStatsHandler);
app.post('/api/cache/clear', clearCacheHandler);

// 工具函数
function toYMD(v) {
    if (!v) return null;
    const d = new Date(v);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
}

// ============ 用户认证相关API (使用Supabase) ============

// 用户注册
app.post('/api/register', registerLimiter, validateInput(schemas.registration), async (req, res) => {
    try {
        const { username, email, password, phone } = req.body;
        
        // 检查用户是否已存在
        const userExists = await SupabaseUserService.checkUserExists(username);
        if (userExists) {
            return res.apiError('用户名已存在', 400);
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
        
        // 生成JWT token
        const token = jwt.sign(
            { 
                userId: newUser.id, 
                username: newUser.username 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        return res.apiSuccess({
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                phone: newUser.phone
            },
            token
        }, '注册成功', 201);
        
    } catch (error) {
        console.error('注册失败:', error);
        return res.apiError('注册失败', 500, error);
    }
});

// 用户登录
app.post('/api/login', authLimiter, validateInput(schemas.login), async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // 获取用户信息
        const user = await SupabaseUserService.getUserByUsername(username);
        if (!user) {
            return res.apiError('用户名或密码错误', 401);
        }
        
        // 验证密码
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.apiError('用户名或密码错误', 401);
        }
        
        // 更新最后登录时间
        await SupabaseUserService.updateUser(username, {
            last_login: new Date().toISOString()
        });
        
        // 生成JWT token
        const token = jwt.sign(
            { 
                userId: user.id, 
                username: user.username 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        return res.apiSuccess({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                phone: user.phone
            },
            token
        }, '登录成功');
        
    } catch (error) {
        console.error('登录失败:', error);
        return res.apiError('登录失败', 500, error);
    }
});

// 健康检查
app.get('/api/health', async (req, res) => {
    const isSupabaseConnected = await testConnection();
    res.apiSuccess({
        status: 'ok',
        database: isSupabaseConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// ============ 用户管理API (使用Supabase) ============

// 创建用户（兼容原API）
app.post('/api/users', async (req, res) => {
    try {
        const { username, email, password, phone } = req.body;
        
        if (!username || !email || !password) {
            return res.apiError('用户名、邮箱和密码都是必填项', 400);
        }
        
        // 检查用户是否已存在
        const userExists = await SupabaseUserService.checkUserExists(username);
        if (userExists) {
            return res.apiError('用户名已存在', 400);
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
        
        return res.apiSuccess({
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            phone: newUser.phone
        }, '用户创建成功', 201);
        
    } catch (error) {
        console.error('创建用户失败:', error);
        return res.apiError('创建用户失败', 500, error);
    }
});

// 验证用户（兼容原API）
app.post('/api/users/validate', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.apiError('用户名和密码都是必填项', 400);
        }
        
        // 获取用户信息
        const user = await SupabaseUserService.getUserByUsername(username);
        if (!user) {
            return res.apiError('用户名或密码错误', 401);
        }
        
        // 验证密码
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.apiError('用户名或密码错误', 401);
        }
        
        return res.apiSuccess({
            id: user.id,
            username: user.username,
            email: user.email,
            phone: user.phone
        }, '验证成功');
        
    } catch (error) {
        console.error('验证用户失败:', error);
        return res.apiError('验证用户失败', 500, error);
    }
});

// 检查用户是否存在
app.get('/api/users/check/:username', async (req, res) => {
    try {
        const { username } = req.params;
        
        // 输入验证
        if (!username || typeof username !== 'string' || username.trim().length === 0) {
            return res.apiError('用户名不能为空', 400);
        }
        
        if (username.length > 20) {
            return res.apiError('用户名长度不能超过20个字符', 400);
        }
        
        const exists = await SupabaseUserService.checkUserExists(username.trim());
        
        return res.apiSuccess({ exists }, '检查完成');
        
    } catch (error) {
        console.error('检查用户失败:', error);
        return res.apiError('检查用户失败，请稍后重试', 500, error);
    }
});

// 获取用户资料
app.get('/api/profile/:username', authenticateToken, checkUserPermission, async (req, res) => {
    try {
        const { username } = req.params;
        
        const user = await SupabaseUserService.getUserByUsername(username);
        if (!user) {
            return res.apiError('用户不存在', 404);
        }
        
        // 不返回密码
        const { password, ...userProfile } = user;
        
        return res.apiSuccess(userProfile, '获取用户资料成功');
        
    } catch (error) {
        console.error('获取用户资料失败:', error);
        return res.apiError('获取用户资料失败', 500, error);
    }
});

// 更新用户资料
app.put('/api/profile/:username', authenticateToken, checkUserPermission, validateInput(schemas.profile), async (req, res) => {
    try {
        const { username } = req.params;
        const updateData = req.body;
        
        // 验证用户是否存在
        const userExists = await SupabaseUserService.checkUserExists(username);
        if (!userExists) {
            return res.apiError('用户不存在', 404);
        }
        
        // 过滤允许更新的字段
        const allowedFields = ['email', 'phone', 'full_name', 'bio', 'avatar_url'];
        const filteredData = {};
        
        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                filteredData[field] = updateData[field];
            }
        }
        
        if (Object.keys(filteredData).length === 0) {
            return res.apiError('没有提供有效的更新字段', 400);
        }
        
        const updatedUser = await SupabaseUserService.updateUser(username, filteredData);
        
        // 不返回密码
        const { password, ...userProfile } = updatedUser;
        
        return res.apiSuccess(userProfile, '用户资料更新成功');
        
    } catch (error) {
        console.error('更新用户资料失败:', error);
        return res.apiError('更新用户资料失败', 500, error);
    }
});

// ============ 诊断端点 ============

// Supabase 诊断端点
app.get('/api/supabase/diag', async (req, res) => {
    try {
        const isConnected = await testConnection();
        const allUsers = await SupabaseUserService.getAllUsers();
        
        return res.apiSuccess({
            status: 'success',
            message: 'Supabase 诊断信息',
            database: isConnected ? 'connected' : 'disconnected',
            user_count: allUsers.length,
            timestamp: new Date().toISOString(),
            endpoints: {
                'POST /api/register': '用户注册',
                'POST /api/login': '用户登录',
                'POST /api/users': '创建用户',
                'POST /api/users/validate': '验证用户',
                'GET /api/users/check/{username}': '检查用户是否存在',
                'GET /api/profile/{username}': '获取用户资料',
                'PUT /api/profile/{username}': '更新用户资料',
                'GET /api/supabase/diag': 'Supabase诊断端点'
            }
        });
        
    } catch (error) {
        console.error('Supabase 诊断失败:', error);
        return res.apiError('Supabase 诊断失败', 500, error);
    }
});

// 404 处理
app.use('*', (req, res) => {
    res.apiError('未找到请求的端点', 404);
});

// 错误处理中间件
app.use((error, req, res, next) => {
    console.error('服务器错误:', error);
    res.apiError('服务器内部错误', 500, error);
});

// 启动服务器
app.listen(PORT, async () => {
    console.log(`🚀 Supabase 后端服务器启动在端口 ${PORT}`);
    
    // 测试 Supabase 连接
    try {
        const isConnected = await testConnection();
        if (isConnected) {
            console.log('✅ Supabase 连接成功');
        } else {
            console.log('❌ Supabase 连接失败，请检查配置');
        }
    } catch (error) {
        console.error('❌ Supabase 连接测试失败:', error.message);
    }
    
    console.log('📋 可用端点:');
    console.log('  POST /api/register - 用户注册');
    console.log('  POST /api/login - 用户登录');
    console.log('  POST /api/users - 创建用户');
    console.log('  POST /api/users/validate - 验证用户');
    console.log('  GET /api/users/check/:username - 检查用户');
    console.log('  GET /api/profile/:username - 获取用户资料');
    console.log('  PUT /api/profile/:username - 更新用户资料');
    console.log('  GET /api/health - 健康检查');
    console.log('  GET /api/supabase/diag - Supabase诊断');
});

module.exports = app;