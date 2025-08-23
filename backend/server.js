const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 导入自定义模块
const { SupabaseUserService, testConnection } = require('../utils/supabase');
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
const { userCacheOps, scheduleCacheOps } = require('./utils/cache');
require('dotenv').config();
require('dotenv').config({ path: '../.env.supabase' });

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
app.use(express.json({ limit: '1mb' })); // 减少限制以防止攻击
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(responseFormatter);
app.use(generalLimiter);

// 性能优化中间件
app.use(responseCompression);
app.use(performanceMonitor);
app.use(requestDeduplication);

// 缓存管理路由
app.get('/api/cache/stats', cacheStatsHandler);
app.post('/api/cache/clear', clearCacheHandler);



// 通用日期格式化：将任意可解析时间值转为 YYYY-MM-DD 字符串
function toYMD(v) {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

// 健康检查
app.get('/api/health', async (req, res) => {
  const isSupabaseConnected = await testConnection();
  res.apiSuccess({
    status: 'ok',
    database: isSupabaseConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});


// 用户注册接口
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



// 用户登录接口
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
        
        if (error.code === 'VIKA_API_ERROR') {
            return res.apiError('数据库连接失败，请稍后重试', 503, error);
        }
        
        res.apiError('登录失败，请稍后重试', 500, error);
    }
});



// 健康检查接口
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Backend server is running',
        timestamp: new Date().toISOString()
    });
});

// ============ 与前端一致的 /api/users 路由 ============
// 创建用户
app.post('/api/users', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.apiError('用户名、邮箱和密码都是必填项', 400);
        }
        const filter = encodeURIComponent(`{username} = "${username}"`);
        const checkResp = await callVika('GET', `/datasheets/${VIKA_CONFIG.datasheetId}/records?fieldKey=name&filterByFormula=${filter}`);
        if (checkResp.success && Array.isArray(checkResp.data?.records) && checkResp.data.records.length > 0) {
            return res.apiError('用户名已存在', 400);
        }
        const hashedPassword = bcrypt.hashSync(password, 10);
        const payload = {
            records: [{
                fields: { username, email, password: hashedPassword, created_at: new Date().toISOString() }
            }],
            fieldKey: 'name'
        };
        const createResponse = await callVika('POST', `/datasheets/${VIKA_CONFIG.datasheetId}/records`, payload);
        if (createResponse.success) {
            const rec = createResponse.data.records[0];
            return res.apiSuccess({ id: rec.recordId, username, email }, '用户创建成功', 201);
        }
        throw new Error(createResponse.message || '创建用户失败');
    } catch (e) {
        console.error('创建用户失败:', e);
        return res.apiError(e.message || '服务器错误', e.status || 500, e);
    }
});

// 验证用户
app.post('/api/users/validate', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.apiError('用户名和密码都是必填项', 400);
        }
        const filter = encodeURIComponent(`{username} = "${username}"`);
        const userResponse = await callVika('GET', `/datasheets/${VIKA_CONFIG.datasheetId}/records?fieldKey=name&filterByFormula=${filter}`);
        if (!userResponse.success || !Array.isArray(userResponse.data?.records) || userResponse.data.records.length === 0) {
            return res.apiError('用户名或密码错误', 401);
        }
        const user = userResponse.data.records[0];
        const isPasswordValid = bcrypt.compareSync(password, user.fields.password);
        if (isPasswordValid) {
            return res.apiSuccess({ id: user.recordId, username: user.fields.username, email: user.fields.email }, '登录成功');
        }
        return res.apiError('用户名或密码错误', 401);
    } catch (e) {
        console.error('验证用户失败:', e);
        return res.apiError(e.message || '服务器错误', e.status || 500, e);
    }
});

// 检查用户是否存在（优化版）
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
        
        const userRecord = await SupabaseUserService.checkUserExists(username.trim());
        const exists = !!userRecord;
        
        return res.apiSuccess({ exists }, '检查完成');
        
    } catch (e) {
        console.error('检查用户失败:', e);
        
        if (e.code === 'SUPABASE_ERROR') {
            return res.apiError('数据库连接失败，请稍后重试', 503, e);
        }
        
        return res.apiError('检查用户失败，请稍后重试', 500, e);
    }
});

// ============ 与前端一致的 /api/schedule 路由 ============
// 诊断与获取列表
app.get('/api/schedule', optionalAuth, async (req, res) => {
    try {
        const { diag, username, date } = req.query || {};
        
        // 检查缓存（非诊断模式）
        if (diag !== '1' && diag !== 'true') {
            const cacheKey = `schedule_${username || 'all'}_${date || 'all'}`;
            const cachedData = scheduleCacheOps.get(cacheKey);
            if (cachedData) {
                return res.apiSuccess(cachedData, '获取工作日程成功（缓存）');
            }
        }
        // 使用全局 toYMD
        const envInfo = {
            hasToken: !!VIKA_CONFIG.apiToken,
            hasScheduleId: !!VIKA_CONFIG.scheduleDatasheetId,
            baseUrl: VIKA_CONFIG.baseUrl,
            runtime: process.version,
        };
        if (diag === '1' || diag === 'true') {
            if (!VIKA_CONFIG.apiToken || !VIKA_CONFIG.scheduleDatasheetId) {
                return res.apiError('缺少必要配置', 200, envInfo);
            }
            try {
                const ping = await callVika('GET', `/datasheets/${VIKA_CONFIG.scheduleDatasheetId}/records?pageSize=1&fieldKey=name`);
                const sample = Array.isArray(ping?.data?.records) ? ping.data.records.slice(0,1) : [];
                const fieldKeys = Object.keys(sample?.[0]?.fields || {});
                const hasUsernameField = fieldKeys.includes('用户名') || fieldKeys.includes('username');
                return res.apiSuccess({ total: ping?.data?.total ?? null, sample, env: envInfo, fieldKeys, hasUsernameField }, '诊断信息获取成功');
            } catch (e) {
                return res.apiError(e.message, e.status || 500, { details: e.details, url: e.url, env: envInfo });
            }
        }

        let endpoint = `/datasheets/${VIKA_CONFIG.scheduleDatasheetId}/records?fieldKey=name`;
        
        const buildEncoded = (formula) => `&filterByFormula=${encodeURIComponent(formula)}`;
        const tryFetch = async (suffix) => callVika('GET', `${endpoint}${suffix || ''}`);

        // 如果表里没有 用户名/username 字段，则跳过远程过滤，改为服务端全量+本地过滤（基于备注标签）
        const { hasUsernameField } = await detectScheduleFieldKeys();

        let response;
        if (hasUsernameField && username && date) {
            const candidates = [
                `AND(OR({用户名} = "${username}", {username} = "${username}"), {工作日期} = "${date}")`,
                `AND({用户名} = "${username}", {工作日期} = "${date}")`,
                `AND({username} = "${username}", {工作日期} = "${date}")`,
            ];
            for (const f of candidates) {
                try {
                    const resp = await tryFetch(buildEncoded(f));
                    if (resp && resp.success) { response = resp; break; }
                    continue;
                } catch (e) {
                    console.warn('Vika过滤查询失败(用户名+日期):', { status: e?.status, message: e?.message });
                    continue;
                }
            }
        } else if (hasUsernameField && username) {
            const candidates = [
                `OR({用户名} = "${username}", {username} = "${username}")`,
                `{用户名} = "${username}"`,
                `{username} = "${username}"`,
            ];
            for (const f of candidates) {
                try {
                    const resp = await tryFetch(buildEncoded(f));
                    if (resp && resp.success) { response = resp; break; }
                    continue;
                } catch (e) {
                    console.warn('Vika过滤查询失败(仅用户名):', { status: e?.status, message: e?.message });
                    continue;
                }
            }
        }

        if (!response) {
            // 若未能通过远程过滤获取，则全量拉取并在服务端过滤
            let all;
            try {
                all = await callVika('GET', `${endpoint}&pageSize=500&pageNum=1`);
            } catch (err) {
                console.warn('Vika全量拉取调用异常:', { status: err?.status, message: err?.message });
                return res.apiSuccess([], '获取工作日程成功');
            }
            if (!all.success) {
                console.warn('Vika全量拉取返回非成功:', all.message);
                return res.apiSuccess([], '获取工作日程成功');
            }
            let records = Array.isArray(all.data?.records) ? all.data.records : [];
            if (username) {
                records = records.filter(r => {
                    const u = r.fields['用户名'] || r.fields['username'] || '';
                    const notes = r.fields['备注'] || '';
                    const tag = `[@user:${username}]`;
                    return u === username || (typeof notes === 'string' && notes.includes(tag));
                });
            }
            if (date) {
                records = records.filter(r => {
                    const d = r.fields['工作日期'];
                    const ds = toYMD(d);
                    return !!ds && ds === date;
                });
            }
            const schedules = records.map(record => ({
                id: record.recordId,
                username: record.fields['username'] || record.fields['用户名'] || '',
                workStore: Array.isArray(record.fields['工作店铺']) ? record.fields['工作店铺'] : [record.fields['工作店铺']].filter(Boolean),
                workDate: toYMD(record.fields['工作日期']) || '',
                startTime: record.fields['开始时间'] || '',
                endTime: record.fields['结束时间'] || '',
                duration: record.fields['工作时长'] ?? 0,
                notes: record.fields['备注'] || '',
                createdAt: record.fields['created_at'] || record.fields['创建时间'] || ''
            }));
            // 缓存结果
            const cacheKey = `schedule_${username || 'all'}_${date || 'all'}`;
            scheduleCacheOps.set(cacheKey, schedules);
            
            return res.apiSuccess(schedules, '获取工作日程成功');
        }

        // 有 response 则直接按远程返回转换
        const schedules = (response.data?.records || []).map(record => ({
            id: record.recordId,
            username: record.fields['username'] || record.fields['用户名'] || '',
            workStore: Array.isArray(record.fields['工作店铺']) ? record.fields['工作店铺'] : [record.fields['工作店铺']].filter(Boolean),
            workDate: toYMD(record.fields['工作日期']) || '',
            startTime: record.fields['开始时间'] || '',
            endTime: record.fields['结束时间'] || '',
            duration: record.fields['工作时长'] ?? 0,
            notes: record.fields['备注'] || '',
            createdAt: record.fields['created_at'] || record.fields['创建时间'] || ''
        }));
        
        // 缓存结果
        const cacheKey = `schedule_${username || 'all'}_${date || 'all'}`;
        scheduleCacheOps.set(cacheKey, schedules);
        
        return res.apiSuccess(schedules, '获取工作日程成功');
    } catch (e) {
        console.error('获取工作日程失败:', e);
        // 遇到任何异常，降级为空列表，避免影响前端使用
        return res.apiSuccess([], '获取工作日程成功', 200, { warn: 'fallback_empty_on_error', errorMessage: e?.message });
    }
});

// 创建
app.post('/api/schedule', authenticateToken, validateInput(schemas.schedule), async (req, res) => {
    try {
        const { username, workStore, workDate, startTime, endTime, duration, notes } = req.body || {};
        if (!workStore || !workDate || !startTime || !endTime) {
            return res.apiError('必填字段缺失', 400);
        }
        const { hasUsernameField } = await detectScheduleFieldKeys();
        const tag = username ? `[@user:${username}]` : '';
        const mergedNotes = (() => {
            const base = notes || '';
            if (!username) return base;
            if (typeof base === 'string' && base.includes(tag)) return base; // 避免重复追加
            return base ? `${base} ${tag}` : tag;
        })();
        const fieldsToCreate = {
            '工作店铺': Array.isArray(workStore) ? workStore : [workStore],
            '工作日期': new Date(workDate).toISOString(),
            '开始时间': startTime,
            '结束时间': endTime,
            '工作时长': duration ?? null,
            '备注': mergedNotes,
            'created_at': new Date().toISOString()
        };
        if (username && hasUsernameField) {
            fieldsToCreate['username'] = username; // 英文字段（若存在）
            fieldsToCreate['用户名'] = username;    // 中文显示名（常见场景）
        }
        const payload = { records: [{ fields: fieldsToCreate }], fieldKey: 'name' };
        const createResponse = await callVika('POST', `/datasheets/${VIKA_CONFIG.scheduleDatasheetId}/records`, payload);
        if (!createResponse.success) throw new Error('创建工作日程失败');
        
        // 清除相关缓存
        scheduleCacheOps.clearPattern('schedule_');
        
        const newRecord = createResponse.data.records[0];
        return res.apiSuccess({
            id: newRecord.recordId,
            username: newRecord.fields['username'] || newRecord.fields['用户名'] || '',
            workStore: newRecord.fields['工作店铺'] || [],
            workDate: toYMD(newRecord.fields['工作日期']) || '',
            startTime: newRecord.fields['开始时间'] || '',
            endTime: newRecord.fields['结束时间'] || '',
            duration: newRecord.fields['工作时长'] ?? 0,
            notes: newRecord.fields['备注'] || '',
            createdAt: newRecord.fields['created_at'] || ''
        }, '工作日程创建成功', 201);
    } catch (e) {
        console.error('创建工作日程失败:', e);
        return res.apiError(e.message || '服务器错误', e.status || 500, e.details);
    }
});

// 更新
app.put('/api/schedule/:id', authenticateToken, validateInput(schemas.schedule), async (req, res) => {
    try {
        const { id } = req.params;
        const { username, workStore, workDate, startTime, endTime, duration, notes } = req.body || {};
        if (!id) return res.apiError('工作日程ID缺失', 400);
        const fieldsToUpdate = {};
        if (username) {
            fieldsToUpdate['username'] = username; // 英文字段（若存在）
            fieldsToUpdate['用户名'] = username;    // 中文显示名（常见场景）
        }
        if (workStore) fieldsToUpdate['工作店铺'] = Array.isArray(workStore) ? workStore : [workStore];
        if (workDate) fieldsToUpdate['工作日期'] = new Date(workDate).toISOString();
        if (startTime) fieldsToUpdate['开始时间'] = startTime;
        if (endTime) fieldsToUpdate['结束时间'] = endTime;
        if (duration !== undefined) fieldsToUpdate['工作时长'] = duration;
        if (notes !== undefined) {
            const tag = username ? `[@user:${username}]` : '';
            const nextNotes = (() => {
                const base = notes || '';
                if (!username) return base;
                if (typeof base === 'string' && base.includes(tag)) return base;
                return base ? `${base} ${tag}` : tag;
            })();
            fieldsToUpdate['备注'] = nextNotes;
        }
        const payload = { records: [{ recordId: id, fields: fieldsToUpdate }], fieldKey: 'name' };
        const updateResp = await callVika('PATCH', `/datasheets/${VIKA_CONFIG.scheduleDatasheetId}/records`, payload);
        if (!updateResp.success) throw new Error('更新工作日程失败');
        
        // 清除相关缓存
        scheduleCacheOps.clearPattern('schedule_');
        
        return res.apiSuccess(null, '工作日程更新成功');
    } catch (e) {
        console.error('更新工作日程失败:', e);
        return res.apiError(e.message || '服务器错误', e.status || 500, e.details);
    }
});

// 删除
app.delete('/api/schedule/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.apiError('工作日程ID缺失', 400);
        const deleteResp = await callVika('DELETE', `/datasheets/${VIKA_CONFIG.scheduleDatasheetId}/records?recordIds=${encodeURIComponent(JSON.stringify([id]))}`);
        if (!deleteResp.success) throw new Error('删除工作日程失败');
        
        // 清除相关缓存
        scheduleCacheOps.clearPattern('schedule_');
        
        return res.apiSuccess(null, '工作日程删除成功');
    } catch (e) {
        console.error('删除工作日程失败:', e);
        return res.apiError(e.message || '服务器错误', e.status || 500, e.details);
    }
});

// ============ 个人信息管理 API ============
// 获取个人信息
app.get('/api/profile/:username', authenticateToken, checkUserPermission, async (req, res) => {
    try {
        const { username } = req.params;
        if (!username) {
            return res.apiError('用户名参数缺失', 400);
        }
        
        // 从用户表中查找用户的个人信息
        const filter = encodeURIComponent(`{username} = "${username}"`);
        const response = await callVika('GET', `/datasheets/${VIKA_CONFIG.profileDatasheetId}/records?fieldKey=name&filterByFormula=${filter}`);
        
        if (!response.success || !Array.isArray(response.data?.records) || response.data.records.length === 0) {
            return res.apiError('用户不存在', 404);
        }
        
        const userRecord = response.data.records[0];
        const profileData = {
            username: userRecord.fields.username || '',
            displayName: userRecord.fields.displayName || userRecord.fields.username || '',
            welcomeMessage: userRecord.fields.welcomeMessage || '欢迎使用系统'
        };
        
        return res.apiSuccess(profileData, '获取个人信息成功');
    } catch (e) {
        console.error('获取个人信息失败:', e);
        return res.apiError(e.message || '服务器错误', e.status || 500, e.details);
    }
});

// 更新个人信息
app.put('/api/profile/:username', authenticateToken, checkUserPermission, validateInput(schemas.profile), async (req, res) => {
    try {
        const { username } = req.params;
        const { displayName, welcomeMessage } = req.body;
        
        if (!username) {
            return res.apiError('用户名参数缺失', 400);
        }
        
        // 查找用户记录
        const filter = encodeURIComponent(`{username} = "${username}"`);
        const response = await callVika('GET', `/datasheets/${VIKA_CONFIG.profileDatasheetId}/records?fieldKey=name&filterByFormula=${filter}`);
        
        if (!response.success || !Array.isArray(response.data?.records) || response.data.records.length === 0) {
            return res.apiError('用户不存在', 404);
        }
        
        const userRecord = response.data.records[0];
        const recordId = userRecord.recordId;
        
        // 更新字段
        const fieldsToUpdate = {};
        if (displayName !== undefined) fieldsToUpdate.displayName = displayName;
        if (welcomeMessage !== undefined) fieldsToUpdate.welcomeMessage = welcomeMessage;
        
        const payload = {
            records: [{ recordId, fields: fieldsToUpdate }],
            fieldKey: 'name'
        };
        
        const updateResp = await callVika('PATCH', `/datasheets/${VIKA_CONFIG.profileDatasheetId}/records`, payload);
        if (!updateResp.success) throw new Error('更新个人信息失败');
        
        return res.apiSuccess(null, '个人信息更新成功');
    } catch (e) {
        console.error('更新个人信息失败:', e);
        return res.apiError(e.message || '服务器错误', e.status || 500, e.details);
    }
});

// ============ 酒店信息管理 API ============
// 获取酒店信息
app.get('/api/hotel/:username', authenticateToken, checkUserPermission, async (req, res) => {
    try {
        const { username } = req.params;
        if (!username) {
            return res.apiError('用户名参数缺失', 400);
        }
        
        // 从用户表中查找用户的酒店信息
        const filter = encodeURIComponent(`{username} = "${username}"`);
        const response = await callVika('GET', `/datasheets/${VIKA_CONFIG.hotelDatasheetId}/records?fieldKey=name&filterByFormula=${filter}`);
        
        if (!response.success || !Array.isArray(response.data?.records) || response.data.records.length === 0) {
            return res.apiError('用户不存在', 404);
        }
        
        const userRecord = response.data.records[0];
        const hotelInfo = {
            name: userRecord.fields.hotelName || 'URO Hotel',
            description: userRecord.fields.hotelDescription || 'Hotel & Cafe & Bar'
        };
        
        return res.apiSuccess(hotelInfo, '获取酒店信息成功');
    } catch (e) {
        console.error('获取酒店信息失败:', e);
        return res.apiError(e.message || '服务器错误', e.status || 500, e.details);
    }
});

// 更新酒店信息
app.put('/api/hotel/:username', authenticateToken, checkUserPermission, validateInput(schemas.hotel), async (req, res) => {
    try {
        const { username } = req.params;
        const { name, description } = req.body;
        
        if (!username) {
            return res.apiError('用户名参数缺失', 400);
        }
        
        if (!name || !description) {
            return res.apiError('酒店名称和描述都是必填项', 400);
        }
        
        // 查找用户记录
        const filter = encodeURIComponent(`{username} = "${username}"`);
        const response = await callVika('GET', `/datasheets/${VIKA_CONFIG.hotelDatasheetId}/records?fieldKey=name&filterByFormula=${filter}`);
        
        if (!response.success || !Array.isArray(response.data?.records) || response.data.records.length === 0) {
            return res.apiError('用户不存在', 404);
        }
        
        const userRecord = response.data.records[0];
        const recordId = userRecord.recordId;
        
        // 更新字段
        const fieldsToUpdate = {
            hotelName: name,
            hotelDescription: description
        };
        
        const payload = {
            records: [{ recordId, fields: fieldsToUpdate }],
            fieldKey: 'name'
        };
        
        const updateResp = await callVika('PATCH', `/datasheets/${VIKA_CONFIG.hotelDatasheetId}/records`, payload);
        if (!updateResp.success) throw new Error('更新酒店信息失败');
        
        return res.apiSuccess(null, '酒店信息更新成功');
    } catch (e) {
        console.error('更新酒店信息失败:', e);
        return res.apiError(e.message || '服务器错误', e.status || 500, e.details);
    }
});

// ============ 基本信息管理 API（合并个人信息和酒店信息）============
// 获取基本信息（酒店名称和用户名）
app.get('/api/basic-info/:username', authenticateToken, checkUserPermission, async (req, res) => {
    try {
        const { username } = req.params;
        if (!username) {
            return res.apiError('用户名参数缺失', 400);
        }
        
        // 从基本信息数据表获取数据
        const userFilter = encodeURIComponent(`{username} = "${username}"`);
        const response = await callVika('GET', `/datasheets/${VIKA_CONFIG.basicInfoDatasheetId}/records?fieldKey=name&filterByFormula=${userFilter}`);
        
        if (!response.success || !Array.isArray(response.data?.records) || response.data.records.length === 0) {
            // 如果基本信息表中没有记录，返回默认值
            return res.apiSuccess({
                username: username,
                websiteName: 'URO Hotel'
            }, '获取基本信息成功');
        }
        
        const record = response.data.records[0];
        const basicInfo = {
            username: record.fields.username || username,
            websiteName: record.fields.websiteName || record.fields.hotelName || 'URO Hotel'
        };
        
        return res.apiSuccess(basicInfo, '获取基本信息成功');
    } catch (e) {
        console.error('获取基本信息失败:', e);
        return res.apiError(e.message || '服务器错误', e.status || 500, e.details);
    }
});

// 更新基本信息（酒店名称和用户名）
app.put('/api/basic-info/:username', authenticateToken, checkUserPermission, async (req, res) => {
    try {
        const { username } = req.params;
        const { websiteName } = req.body;
        
        if (!username) {
            return res.apiError('用户名参数缺失', 400);
        }
        
        // 查找用户记录以验证用户存在
        const userFilter = encodeURIComponent(`{username} = "${username}"`);
        const userResponse = await callVika('GET', `/datasheets/${VIKA_CONFIG.datasheetId}/records?fieldKey=name&filterByFormula=${userFilter}`);
        
        if (!userResponse.success || !Array.isArray(userResponse.data?.records) || userResponse.data.records.length === 0) {
            return res.apiError('用户不存在', 404);
        }
        
        // 更新基本信息到基本信息数据表
        if (websiteName !== undefined) {
            // 查找基本信息记录
            const basicInfoResponse = await callVika('GET', `/datasheets/${VIKA_CONFIG.basicInfoDatasheetId}/records?fieldKey=name&filterByFormula=${userFilter}`);
            
            const fieldsToUpdate = {
                username: username,
                websiteName: websiteName,
                hotelName: websiteName // 同时更新hotelName字段以保持兼容性
            };
            
            if (basicInfoResponse.success && Array.isArray(basicInfoResponse.data?.records) && basicInfoResponse.data.records.length > 0) {
                // 更新现有记录
                const basicInfoRecord = basicInfoResponse.data.records[0];
                const payload = {
                    records: [{ recordId: basicInfoRecord.recordId, fields: fieldsToUpdate }],
                    fieldKey: 'name'
                };
                const updateResp = await callVika('PATCH', `/datasheets/${VIKA_CONFIG.basicInfoDatasheetId}/records`, payload);
                if (!updateResp.success) throw new Error('更新基本信息失败');
            } else {
                // 创建新记录
                const payload = {
                    records: [{ fields: fieldsToUpdate }],
                    fieldKey: 'name'
                };
                const createResp = await callVika('POST', `/datasheets/${VIKA_CONFIG.basicInfoDatasheetId}/records`, payload);
                if (!createResp.success) throw new Error('创建基本信息失败');
            }
        }
        
        return res.apiSuccess(null, '基本信息更新成功');
    } catch (e) {
        console.error('更新基本信息失败:', e);
        return res.apiError(e.message || '服务器错误', e.status || 500, e.details);
    }
});

// ============ 店铺数据管理 API ============
// 获取店铺数据
app.get('/api/shops', authenticateToken, async (req, res) => {
    try {
        const shops = await getShopData();
        res.json({
            success: true,
            data: shops,
            message: '获取店铺数据成功'
        });
    } catch (error) {
        console.error('获取店铺数据失败:', error);
        res.status(500).json({
            success: false,
            message: '获取店铺数据失败',
            error: error.message
        });
    }
});

// 创建店铺
app.post('/api/shops', authenticateToken, validateInput(schemas.shop), async (req, res) => {
    try {
        const { name, code } = req.body;
        
        if (!name || !code) {
            return res.apiError('店铺名称和代码都是必填项', 400);
        }
        
        // 检查代码是否重复
        const existingShops = await getShopData();
        const duplicateShop = existingShops.find(shop => shop.code === code);
        if (duplicateShop) {
            return res.apiError('店铺代码已存在，请使用其他代码', 400);
        }
        
        // 创建新店铺记录
        const fieldsToCreate = {
            name: name,
            code: code,
            '店铺名称': name,
            '店铺代码': code,
            'created_at': new Date().toISOString()
        };
        
        const payload = {
            records: [{ fields: fieldsToCreate }],
            fieldKey: 'name'
        };
        
        const createResp = await callVika('POST', `/datasheets/${VIKA_CONFIG.shopDatasheetId}/records`, payload);
        if (!createResp.success) throw new Error('创建店铺失败');
        
        return res.apiSuccess({
            id: createResp.data.data.records[0].recordId,
            name: name,
            code: code
        }, '店铺创建成功');
    } catch (e) {
        console.error('创建店铺失败:', e);
        return res.apiError(e.message || '服务器错误', e.status || 500, e.details);
    }
});

// 更新店铺
app.put('/api/shops/:id', authenticateToken, validateInput(schemas.shop), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code } = req.body;
        
        if (!id) return res.apiError('店铺ID缺失', 400);
        if (!name || !code) {
            return res.apiError('店铺名称和代码都是必填项', 400);
        }
        
        // 检查代码是否重复（排除当前店铺）
        const existingShops = await getShopData();
        const duplicateShop = existingShops.find(shop => shop.code === code && shop.id !== id);
        if (duplicateShop) {
            return res.apiError('店铺代码已存在，请使用其他代码', 400);
        }
        
        const fieldsToUpdate = {
            name: name,
            code: code,
            '店铺名称': name,
            '店铺代码': code,
            'updated_at': new Date().toISOString()
        };
        
        const payload = {
            records: [{ recordId: id, fields: fieldsToUpdate }],
            fieldKey: 'name'
        };
        
        const updateResp = await callVika('PATCH', `/datasheets/${VIKA_CONFIG.shopDatasheetId}/records`, payload);
        if (!updateResp.success) throw new Error('更新店铺失败');
        
        return res.apiSuccess(null, '店铺更新成功');
    } catch (e) {
        console.error('更新店铺失败:', e);
        return res.apiError(e.message || '服务器错误', e.status || 500, e.details);
    }
});

// 删除店铺
app.delete('/api/shops/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.apiError('店铺ID缺失', 400);
        
        const deleteResp = await callVika('DELETE', `/datasheets/${VIKA_CONFIG.shopDatasheetId}/records?recordIds=${encodeURIComponent(JSON.stringify([id]))}`);
        if (!deleteResp.success) throw new Error('删除店铺失败');
        
        return res.apiSuccess(null, '店铺删除成功');
    } catch (e) {
        console.error('删除店铺失败:', e);
        return res.apiError(e.message || '服务器错误', e.status || 500, e.details);
    }
});

app.listen(PORT, async () => {
    console.log(`🚀 服务器已启动，运行在端口 ${PORT}`);
    console.log(`📊 健康检查: http://localhost:${PORT}/api/health`);
    
    // 启动时预热缓存
    try {
        await cacheWarmup();
        console.log('✅ 缓存预热完成');
    } catch (error) {
        console.log('⚠️ 缓存预热失败，但不影响服务启动');
    }
});