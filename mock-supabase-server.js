// 简化版模拟 Supabase 服务器 - 用于本地测试
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = 3005;

// 中间件
app.use(cors());
app.use(express.json());

// 模拟数据库
const mockDatabase = {
    users: [],
    user_profiles: [],
    user_sessions: [],
    schedules: [],
    shops: []
};

// 工具函数
function generateId() {
    return 'mock_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 简单的密码哈希（仅用于测试）
function hashPassword(password) {
    return crypto.createHash('sha256').update(password + 'salt').digest('hex');
}

function verifyPassword(password, hash) {
    return hashPassword(password) === hash;
}

// 简单的JWT生成（仅用于测试）
function generateToken(userId, username) {
    const payload = {
        userId,
        username,
        iat: Date.now(),
        exp: Date.now() + 24 * 60 * 60 * 1000 // 24小时
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function verifyToken(token) {
    try {
        const payload = JSON.parse(Buffer.from(token, 'base64').toString());
        if (payload.exp < Date.now()) {
            return null; // 令牌过期
        }
        return payload;
    } catch (error) {
        return null;
    }
}

// 认证中间件
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: '缺少认证令牌'
        });
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(403).json({
            success: false,
            message: '无效的认证令牌'
        });
    }
    
    req.user = decoded;
    next();
}

// API 路由

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: '模拟 Supabase 服务器运行正常',
        timestamp: new Date().toISOString(),
        database: {
            users: mockDatabase.users.length,
            profiles: mockDatabase.user_profiles.length,
            sessions: mockDatabase.user_sessions.length
        }
    });
});

// Supabase 诊断
app.get('/api/supabase/diag', (req, res) => {
    res.json({
        success: true,
        message: '模拟 Supabase 连接正常',
        data: {
            connection: 'mock',
            status: 'connected',
            database: 'mock_database',
            tables: ['users', 'user_profiles', 'user_sessions', 'schedules', 'shops'],
            timestamp: new Date().toISOString()
        }
    });
});

// 检查用户是否存在
app.get('/api/users/check/:username', (req, res) => {
    const { username } = req.params;
    const user = mockDatabase.users.find(u => u.username === username);
    
    res.json({
        success: true,
        data: {
            exists: !!user,
            username: username
        }
    });
});

// 用户注册
app.post('/api/register', (req, res) => {
    try {
        const { username, email, password, phone } = req.body;
        
        // 验证必填字段
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: '用户名、邮箱和密码为必填项'
            });
        }
        
        // 检查用户是否已存在
        const existingUser = mockDatabase.users.find(
            u => u.username === username || u.email === email
        );
        
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: '用户名或邮箱已存在'
            });
        }
        
        // 创建新用户
        const userId = generateId();
        const hashedPassword = hashPassword(password);
        
        const newUser = {
            id: userId,
            username,
            email,
            password_hash: hashedPassword,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const newProfile = {
            id: generateId(),
            user_id: userId,
            username,
            email,
            phone: phone || null,
            full_name: null,
            bio: null,
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        mockDatabase.users.push(newUser);
        mockDatabase.user_profiles.push(newProfile);
        
        // 生成认证令牌
        const token = generateToken(userId, username);
        
        res.status(201).json({
            success: true,
            message: '用户注册成功',
            data: {
                user: {
                    id: userId,
                    username,
                    email
                },
                token
            }
        });
        
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 用户登录
app.post('/api/login', (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: '用户名和密码为必填项'
            });
        }
        
        // 查找用户
        const user = mockDatabase.users.find(
            u => u.username === username || u.email === username
        );
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: '用户名或密码错误'
            });
        }
        
        // 验证密码
        if (!verifyPassword(password, user.password_hash)) {
            return res.status(401).json({
                success: false,
                message: '用户名或密码错误'
            });
        }
        
        // 生成认证令牌
        const token = generateToken(user.id, user.username);
        
        res.json({
            success: true,
            message: '登录成功',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                },
                token
            }
        });
        
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 用户验证（兼容API）
app.post('/api/users/validate', (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: '用户名和密码为必填项'
            });
        }
        
        // 查找用户
        const user = mockDatabase.users.find(
            u => u.username === username || u.email === username
        );
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: '用户验证失败'
            });
        }
        
        // 验证密码
        if (!verifyPassword(password, user.password_hash)) {
            return res.status(401).json({
                success: false,
                message: '用户验证失败'
            });
        }
        
        res.json({
            success: true,
            message: '用户验证成功',
            data: {
                valid: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                }
            }
        });
        
    } catch (error) {
        console.error('验证错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 获取用户资料
app.get('/api/profile/:username', authenticateToken, (req, res) => {
    try {
        const { username } = req.params;
        
        // 查找用户资料
        const profile = mockDatabase.user_profiles.find(p => p.username === username);
        
        if (!profile) {
            return res.status(404).json({
                success: false,
                message: '用户资料不存在'
            });
        }
        
        res.json({
            success: true,
            data: {
                profile: {
                    username: profile.username,
                    email: profile.email,
                    phone: profile.phone,
                    full_name: profile.full_name,
                    bio: profile.bio,
                    avatar_url: profile.avatar_url,
                    created_at: profile.created_at,
                    updated_at: profile.updated_at
                }
            }
        });
        
    } catch (error) {
        console.error('获取资料错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 更新用户资料
app.put('/api/profile/:username', authenticateToken, (req, res) => {
    try {
        const { username } = req.params;
        const { email, phone, full_name, bio, avatar_url } = req.body;
        
        // 查找用户资料
        const profileIndex = mockDatabase.user_profiles.findIndex(p => p.username === username);
        
        if (profileIndex === -1) {
            return res.status(404).json({
                success: false,
                message: '用户资料不存在'
            });
        }
        
        // 更新资料
        const profile = mockDatabase.user_profiles[profileIndex];
        if (email !== undefined) profile.email = email;
        if (phone !== undefined) profile.phone = phone;
        if (full_name !== undefined) profile.full_name = full_name;
        if (bio !== undefined) profile.bio = bio;
        if (avatar_url !== undefined) profile.avatar_url = avatar_url;
        profile.updated_at = new Date().toISOString();
        
        mockDatabase.user_profiles[profileIndex] = profile;
        
        res.json({
            success: true,
            message: '用户资料更新成功',
            data: {
                profile: {
                    username: profile.username,
                    email: profile.email,
                    phone: profile.phone,
                    full_name: profile.full_name,
                    bio: profile.bio,
                    avatar_url: profile.avatar_url,
                    updated_at: profile.updated_at
                }
            }
        });
        
    } catch (error) {
        console.error('更新资料错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 获取所有用户（调试用）
app.get('/api/debug/users', (req, res) => {
    res.json({
        success: true,
        data: {
            users: mockDatabase.users.map(u => ({
                id: u.id,
                username: u.username,
                email: u.email,
                created_at: u.created_at
            })),
            profiles: mockDatabase.user_profiles.map(p => ({
                username: p.username,
                email: p.email,
                phone: p.phone,
                full_name: p.full_name
            }))
        }
    });
});

// 清空数据库（调试用）
app.post('/api/debug/reset', (req, res) => {
    mockDatabase.users = [];
    mockDatabase.user_profiles = [];
    mockDatabase.user_sessions = [];
    mockDatabase.schedules = [];
    mockDatabase.shops = [];
    
    res.json({
        success: true,
        message: '模拟数据库已重置'
    });
});

// 工作日程API

// 获取工作日程
app.get('/api/schedules', authenticateToken, (req, res) => {
    try {
        const { username } = req.user;
        
        // 过滤当前用户的日程
        const userSchedules = mockDatabase.schedules.filter(s => s.username === username);
        
        res.json({
            success: true,
            data: userSchedules
        });
        
    } catch (error) {
        console.error('获取日程错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 创建工作日程
app.post('/api/schedules', authenticateToken, (req, res) => {
    try {
        const { username } = req.user;
        const { work_store, work_date, start_time, end_time, duration, notes } = req.body;
        
        // 验证必填字段
        if (!work_date || !start_time || !end_time) {
            return res.status(400).json({
                success: false,
                message: '工作日期、开始时间和结束时间为必填项'
            });
        }
        
        // 创建新日程
        const newSchedule = {
            id: generateId(),
            username,
            work_store: work_store || [],
            work_date,
            start_time,
            end_time,
            duration: duration || 0,
            notes: notes || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        mockDatabase.schedules.push(newSchedule);
        
        res.status(201).json({
            success: true,
            message: '工作日程创建成功',
            data: newSchedule
        });
        
    } catch (error) {
        console.error('创建日程错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 更新工作日程
app.put('/api/schedules/:id', authenticateToken, (req, res) => {
    try {
        const { id } = req.params;
        const { username } = req.user;
        const { work_store, work_date, start_time, end_time, duration, notes } = req.body;
        
        // 查找日程
        const scheduleIndex = mockDatabase.schedules.findIndex(s => s.id === id && s.username === username);
        
        if (scheduleIndex === -1) {
            return res.status(404).json({
                success: false,
                message: '工作日程不存在或无权限修改'
            });
        }
        
        // 更新日程
        const schedule = mockDatabase.schedules[scheduleIndex];
        if (work_store !== undefined) schedule.work_store = work_store;
        if (work_date !== undefined) schedule.work_date = work_date;
        if (start_time !== undefined) schedule.start_time = start_time;
        if (end_time !== undefined) schedule.end_time = end_time;
        if (duration !== undefined) schedule.duration = duration;
        if (notes !== undefined) schedule.notes = notes;
        schedule.updated_at = new Date().toISOString();
        
        mockDatabase.schedules[scheduleIndex] = schedule;
        
        res.json({
            success: true,
            message: '工作日程更新成功',
            data: schedule
        });
        
    } catch (error) {
        console.error('更新日程错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 删除工作日程
app.delete('/api/schedules/:id', authenticateToken, (req, res) => {
    try {
        const { id } = req.params;
        const { username } = req.user;
        
        // 查找日程
        const scheduleIndex = mockDatabase.schedules.findIndex(s => s.id === id && s.username === username);
        
        if (scheduleIndex === -1) {
            return res.status(404).json({
                success: false,
                message: '工作日程不存在或无权限删除'
            });
        }
        
        // 删除日程
        mockDatabase.schedules.splice(scheduleIndex, 1);
        
        res.json({
            success: true,
            message: '工作日程删除成功'
        });
        
    } catch (error) {
        console.error('删除日程错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 店铺API

// 获取店铺信息
app.get('/api/shops', authenticateToken, (req, res) => {
    try {
        res.json({
            success: true,
            data: mockDatabase.shops
        });
        
    } catch (error) {
        console.error('获取店铺错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 创建店铺信息
app.post('/api/shops', authenticateToken, (req, res) => {
    try {
        const { shop_code, shop_name, address, contact_phone, manager, status } = req.body;
        
        // 验证必填字段
        if (!shop_code || !shop_name) {
            return res.status(400).json({
                success: false,
                message: '店铺代码和店铺名称为必填项'
            });
        }
        
        // 检查店铺代码是否已存在
        const existingShop = mockDatabase.shops.find(s => s.shop_code === shop_code);
        
        if (existingShop) {
            return res.status(400).json({
                success: false,
                message: '店铺代码已存在'
            });
        }
        
        // 创建新店铺
        const newShop = {
            id: generateId(),
            shop_code,
            shop_name,
            address: address || '',
            contact_phone: contact_phone || '',
            manager: manager || '',
            status: status || 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        mockDatabase.shops.push(newShop);
        
        res.status(201).json({
            success: true,
            message: '店铺信息创建成功',
            data: newShop
        });
        
    } catch (error) {
        console.error('创建店铺错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 更新店铺信息
app.put('/api/shops/:id', authenticateToken, (req, res) => {
    try {
        const { id } = req.params;
        const { shop_code, shop_name, address, contact_phone, manager, status } = req.body;
        
        // 查找店铺
        const shopIndex = mockDatabase.shops.findIndex(s => s.id === id);
        
        if (shopIndex === -1) {
            return res.status(404).json({
                success: false,
                message: '店铺信息不存在'
            });
        }
        
        // 如果更改了店铺代码，检查是否与其他店铺冲突
        if (shop_code && shop_code !== mockDatabase.shops[shopIndex].shop_code) {
            const existingShop = mockDatabase.shops.find(s => s.shop_code === shop_code && s.id !== id);
            
            if (existingShop) {
                return res.status(400).json({
                    success: false,
                    message: '店铺代码已存在'
                });
            }
        }
        
        // 更新店铺
        const shop = mockDatabase.shops[shopIndex];
        if (shop_code !== undefined) shop.shop_code = shop_code;
        if (shop_name !== undefined) shop.shop_name = shop_name;
        if (address !== undefined) shop.address = address;
        if (contact_phone !== undefined) shop.contact_phone = contact_phone;
        if (manager !== undefined) shop.manager = manager;
        if (status !== undefined) shop.status = status;
        shop.updated_at = new Date().toISOString();
        
        mockDatabase.shops[shopIndex] = shop;
        
        res.json({
            success: true,
            message: '店铺信息更新成功',
            data: shop
        });
        
    } catch (error) {
        console.error('更新店铺错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 删除店铺信息
app.delete('/api/shops/:id', authenticateToken, (req, res) => {
    try {
        const { id } = req.params;
        
        // 查找店铺
        const shopIndex = mockDatabase.shops.findIndex(s => s.id === id);
        
        if (shopIndex === -1) {
            return res.status(404).json({
                success: false,
                message: '店铺信息不存在'
            });
        }
        
        // 删除店铺
        mockDatabase.shops.splice(shopIndex, 1);
        
        res.json({
            success: true,
            message: '店铺信息删除成功'
        });
        
    } catch (error) {
        console.error('删除店铺错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 错误处理中间件
app.use((error, req, res, next) => {
    console.error('服务器错误:', error);
    res.status(500).json({
        success: false,
        message: '服务器内部错误'
    });
});

// 404 处理
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: '接口不存在'
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 模拟 Supabase 服务器启动成功!`);
    console.log(`📍 服务地址: http://localhost:${PORT}`);
    console.log(`🔧 这是一个模拟服务器，用于测试 Supabase API 结构`);
    console.log(`📊 当前数据库状态:`);
    console.log(`   - 用户: ${mockDatabase.users.length}`);
    console.log(`   - 资料: ${mockDatabase.user_profiles.length}`);
    console.log(`   - 会话: ${mockDatabase.user_sessions.length}`);
    console.log(`   - 日程: ${mockDatabase.schedules.length}`);
    console.log(`   - 店铺: ${mockDatabase.shops.length}`);
    console.log(`\n🔗 可用的 API 端点:`);
    console.log(`   GET  /api/health - 健康检查`);
    console.log(`   GET  /api/supabase/diag - Supabase 诊断`);
    console.log(`   GET  /api/users/check/:username - 检查用户`);
    console.log(`   POST /api/register - 用户注册`);
    console.log(`   POST /api/login - 用户登录`);
    console.log(`   POST /api/users/validate - 用户验证`);
    console.log(`   GET  /api/profile/:username - 获取用户资料`);
    console.log(`   PUT  /api/profile/:username - 更新用户资料`);
    console.log(`   GET  /api/schedules - 获取工作日程`);
    console.log(`   POST /api/schedules - 创建工作日程`);
    console.log(`   PUT  /api/schedules/:id - 更新工作日程`);
    console.log(`   DELETE /api/schedules/:id - 删除工作日程`);
    console.log(`   GET  /api/shops - 获取店铺信息`);
    console.log(`   POST /api/shops - 创建店铺信息`);
    console.log(`   PUT  /api/shops/:id - 更新店铺信息`);
    console.log(`   DELETE /api/shops/:id - 删除店铺信息`);
    console.log(`   GET  /api/debug/users - 查看所有用户`);
    console.log(`   POST /api/debug/reset - 重置数据库`);
    console.log(`\n💡 提示: 使用 test-supabase-api.js 脚本测试所有功能`);
});

module.exports = app;