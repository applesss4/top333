const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 维格表配置
const VIKA_CONFIG = {
    apiToken: process.env.VIKA_API_TOKEN,
    datasheetId: process.env.VIKA_DATASHEET_ID,
    scheduleDatasheetId: process.env.VIKA_SCHEDULE_DATASHEET_ID,
    profileDatasheetId: process.env.VIKA_PROFILE_DATASHEET_ID || process.env.VIKA_DATASHEET_ID, // 复用用户表或单独配置
    hotelDatasheetId: process.env.VIKA_HOTEL_DATASHEET_ID || process.env.VIKA_DATASHEET_ID, // 复用用户表或单独配置
    baseUrl: process.env.VIKA_BASE_URL || 'https://vika.cn/fusion/v1'
};

// 统一的 Vika API 调用辅助函数
async function callVika(method, endpoint, data = null) {
    const url = `${VIKA_CONFIG.baseUrl}${endpoint}`;
    const headers = {
        'Authorization': `Bearer ${VIKA_CONFIG.apiToken}`,
        'Content-Type': 'application/json'
    };
    try {
        const resp = await axios({ method, url, headers, data });
        return resp.data;
    } catch (err) {
        const e = new Error(err?.response?.data?.message || err?.response?.data?.msg || err?.message || 'Vika API error');
        e.status = err?.response?.status;
        e.details = err?.response?.data;
        e.url = url;
        throw e;
    }
}

// 通用日期格式化：将任意可解析时间值转为 YYYY-MM-DD 字符串
function toYMD(v) {
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch (_) {
    return '';
  }
}

// 移除敏感配置输出日志，避免泄露令牌
app.post('/api/register', async (req, res) => {
    console.log('收到注册请求:', req.body);
    // 已移除敏感配置输出，避免泄露 VIKA 配置信息
    try {
        const { username, email, password } = req.body;
        
        // 验证输入
        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: '用户名、邮箱和密码都是必填项' 
            });
        }
        
        // 检查用户是否已存在
        const existingUser = await checkUserExists(username, email);
        if (existingUser) {
            return res.status(409).json({ 
                success: false, 
                message: '用户名或邮箱已存在' 
            });
        }
        
        // 加密密码
        const hashedPassword = bcrypt.hashSync(password, 10);
        
        // 创建用户记录
        const response = await axios.post(
            `${VIKA_CONFIG.baseUrl}/datasheets/${VIKA_CONFIG.datasheetId}/records`,
            {
                records: [{
                    fields: {
                        username: username,
                        email: email,
                        password: hashedPassword,
                        created_at: new Date().toISOString()
                    }
                }]
            },
            {
                headers: {
                    'Authorization': `Bearer ${VIKA_CONFIG.apiToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('维格表API响应:', response.data);
        console.log('响应状态:', response.status);
        
        // 维格表API成功时通常返回200状态码和数据
        if (response.status === 200 || response.status === 201) {
            console.log('用户创建成功，返回成功响应');
            res.json({ 
                success: true, 
                message: '注册成功',
                user: {
                    username: username,
                    email: email
                }
            });
        } else {
            throw new Error('创建用户记录失败');
        }
        
    } catch (error) {
        console.error('注册失败:', error);
        console.error('错误详情:', error.message);
        if (error.response) {
            console.error('API响应状态:', error.response.status);
            console.error('API响应数据:', error.response.data);
        }
        res.status(500).json({ 
            success: false, 
            message: '注册失败，请稍后重试' 
        });
    }
});

// 用户登录接口
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // 验证输入
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                message: '用户名和密码都是必填项' 
            });
        }
        
        // 获取用户信息
        const response = await axios.get(
            `${VIKA_CONFIG.baseUrl}/datasheets/${VIKA_CONFIG.datasheetId}/records`,
            {
                headers: {
                    'Authorization': `Bearer ${VIKA_CONFIG.apiToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!response.data.success) {
            throw new Error('获取用户数据失败');
        }
        
        const users = response.data.data.records;
        const userRecord = users.find(record => record.fields.username === username);
        
        if (userRecord && bcrypt.compareSync(password, userRecord.fields.password)) {
            res.json({ 
                success: true, 
                message: '登录成功',
                user: {
                    id: userRecord.recordId,
                    username: userRecord.fields.username,
                    email: userRecord.fields.email
                }
            });
        } else {
            res.status(401).json({ 
                success: false, 
                message: '用户名或密码错误' 
            });
        }
        
    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '登录失败，请稍后重试' 
        });
    }
});

// 检查用户是否已存在
async function checkUserExists(username, email) {
    try {
        console.log('正在检查用户是否存在:', { username, email });
        // 已移除敏感配置输出，避免泄露 VIKA 配置信息
        
        const response = await axios.get(
            `${VIKA_CONFIG.baseUrl}/datasheets/${VIKA_CONFIG.datasheetId}/records`,
            {
                headers: {
                    'Authorization': `Bearer ${VIKA_CONFIG.apiToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('checkUserExists API响应状态:', response.status);
        console.log('checkUserExists API响应数据:', response.data);
        
        if (response.data.success) {
            const users = response.data.data.records;
            return users.find(record => 
                record.fields.username === username || record.fields.email === email
            );
        }
        
        return null;
    } catch (error) {
        console.error('检查用户存在性失败:', error);
        console.error('错误详情:', error.message);
        if (error.response) {
            console.error('API响应状态:', error.response.status);
            console.error('API响应数据:', error.response.data);
        }
        return null;
    }
}

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
            return res.status(400).json({ success: false, message: '用户名、邮箱和密码都是必填项' });
        }
        const filter = encodeURIComponent(`{username} = "${username}"`);
        const checkResp = await callVika('GET', `/datasheets/${VIKA_CONFIG.datasheetId}/records?fieldKey=name&filterByFormula=${filter}`);
        if (checkResp.success && Array.isArray(checkResp.data?.records) && checkResp.data.records.length > 0) {
            return res.status(400).json({ success: false, message: '用户名已存在' });
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
            return res.status(201).json({ success: true, message: '用户创建成功', user: { id: rec.recordId, username, email } });
        }
        throw new Error(createResponse.message || '创建用户失败');
    } catch (e) {
        console.error('创建用户失败:', e);
        return res.status(e.status || 500).json({ success: false, message: e.message || '服务器错误', details: e.details });
    }
});

// 验证用户
app.post('/api/users/validate', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: '用户名和密码都是必填项' });
        }
        const filter = encodeURIComponent(`{username} = "${username}"`);
        const userResponse = await callVika('GET', `/datasheets/${VIKA_CONFIG.datasheetId}/records?fieldKey=name&filterByFormula=${filter}`);
        if (!userResponse.success || !Array.isArray(userResponse.data?.records) || userResponse.data.records.length === 0) {
            return res.status(401).json({ success: false, message: '用户名或密码错误' });
        }
        const user = userResponse.data.records[0];
        const isPasswordValid = bcrypt.compareSync(password, user.fields.password);
        if (isPasswordValid) {
            return res.status(200).json({ success: true, message: '登录成功', user: { id: user.recordId, username: user.fields.username, email: user.fields.email } });
        }
        return res.status(401).json({ success: false, message: '用户名或密码错误' });
    } catch (e) {
        console.error('验证用户失败:', e);
        return res.status(e.status || 500).json({ success: false, message: e.message || '服务器错误', details: e.details });
    }
});

// 检查用户是否存在
app.get('/api/users/check/:username', async (req, res) => {
    try {
        const { username } = req.params;
        if (!username) return res.status(400).json({ success: false, message: '用户名参数缺失' });
        const filter = encodeURIComponent(`{username} = "${username}"`);
        const userResponse = await callVika('GET', `/datasheets/${VIKA_CONFIG.datasheetId}/records?fieldKey=name&filterByFormula=${filter}`);
        return res.status(200).json({ exists: userResponse.success && Array.isArray(userResponse.data?.records) && userResponse.data.records.length > 0 });
    } catch (e) {
        console.error('检查用户失败:', e);
        return res.status(e.status || 500).json({ success: false, message: e.message || '服务器错误', details: e.details });
    }
});

// ============ 与前端一致的 /api/schedule 路由 ============
// 诊断与获取列表
app.get('/api/schedule', async (req, res) => {
    try {
        const { diag, username, date } = req.query || {};
        // 使用全局 toYMD
        const envInfo = {
            hasToken: !!VIKA_CONFIG.apiToken,
            hasScheduleId: !!VIKA_CONFIG.scheduleDatasheetId,
            baseUrl: VIKA_CONFIG.baseUrl,
            runtime: process.version,
        };
        if (diag === '1' || diag === 'true') {
            if (!VIKA_CONFIG.apiToken || !VIKA_CONFIG.scheduleDatasheetId) {
                return res.status(200).json({ success: false, message: '缺少必要配置', env: envInfo });
            }
            try {
                const ping = await callVika('GET', `/datasheets/${VIKA_CONFIG.scheduleDatasheetId}/records?pageSize=1&fieldKey=name`);
                const sample = Array.isArray(ping?.data?.records) ? ping.data.records.slice(0,1) : [];
                const fieldKeys = Object.keys(sample?.[0]?.fields || {});
                const hasUsernameField = fieldKeys.includes('用户名') || fieldKeys.includes('username');
                return res.status(200).json({ success: true, total: ping?.data?.total ?? null, sample, env: envInfo, fieldKeys, hasUsernameField });
            } catch (e) {
                return res.status(e.status || 500).json({ success: false, error: e.message, details: e.details, url: e.url, env: envInfo });
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
                return res.status(200).json({ success: true, records: [] });
            }
            if (!all.success) {
                console.warn('Vika全量拉取返回非成功:', all.message);
                return res.status(200).json({ success: true, records: [] });
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
            return res.status(200).json({ success: true, records: schedules });
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
        return res.status(200).json({ success: true, records: schedules });
    } catch (e) {
        console.error('获取工作日程失败:', e);
        // 遇到任何异常，降级为空列表，避免影响前端使用
        return res.status(200).json({ success: true, records: [], warn: 'fallback_empty_on_error', errorMessage: e?.message });
    }
});

// 创建
app.post('/api/schedule', async (req, res) => {
    try {
        const { username, workStore, workDate, startTime, endTime, duration, notes } = req.body || {};
        if (!workStore || !workDate || !startTime || !endTime) {
            return res.status(400).json({ success: false, message: '必填字段缺失' });
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
        const newRecord = createResponse.data.records[0];
        return res.status(201).json({ success: true, message: '工作日程创建成功', data: {
            id: newRecord.recordId,
            username: newRecord.fields['username'] || newRecord.fields['用户名'] || '',
            workStore: newRecord.fields['工作店铺'] || [],
            workDate: toYMD(newRecord.fields['工作日期']) || '',
            startTime: newRecord.fields['开始时间'] || '',
            endTime: newRecord.fields['结束时间'] || '',
            duration: newRecord.fields['工作时长'] ?? 0,
            notes: newRecord.fields['备注'] || '',
            createdAt: newRecord.fields['created_at'] || ''
        }});
    } catch (e) {
        console.error('创建工作日程失败:', e);
        return res.status(e.status || 500).json({ success: false, message: e.message || '服务器错误', details: e.details });
    }
});

// 更新
app.put('/api/schedule/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username, workStore, workDate, startTime, endTime, duration, notes } = req.body || {};
        if (!id) return res.status(400).json({ success: false, message: '工作日程ID缺失' });
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
        return res.status(200).json({ success: true, message: '工作日程更新成功' });
    } catch (e) {
        console.error('更新工作日程失败:', e);
        return res.status(e.status || 500).json({ success: false, message: e.message || '服务器错误', details: e.details });
    }
});

// 删除
app.delete('/api/schedule/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ success: false, message: '工作日程ID缺失' });
        const deleteResp = await callVika('DELETE', `/datasheets/${VIKA_CONFIG.scheduleDatasheetId}/records?recordIds=${encodeURIComponent(JSON.stringify([id]))}`);
        if (!deleteResp.success) throw new Error('删除工作日程失败');
        return res.status(200).json({ success: true, message: '工作日程删除成功' });
    } catch (e) {
        console.error('删除工作日程失败:', e);
        return res.status(e.status || 500).json({ success: false, message: e.message || '服务器错误', details: e.details });
    }
});

// ============ 个人信息管理 API ============
// 获取个人信息
app.get('/api/profile/:username', async (req, res) => {
    try {
        const { username } = req.params;
        if (!username) {
            return res.status(400).json({ success: false, message: '用户名参数缺失' });
        }
        
        // 从用户表中查找用户的个人信息
        const filter = encodeURIComponent(`{username} = "${username}"`);
        const response = await callVika('GET', `/datasheets/${VIKA_CONFIG.profileDatasheetId}/records?fieldKey=name&filterByFormula=${filter}`);
        
        if (!response.success || !Array.isArray(response.data?.records) || response.data.records.length === 0) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }
        
        const userRecord = response.data.records[0];
        const profileData = {
            username: userRecord.fields.username || '',
            displayName: userRecord.fields.displayName || userRecord.fields.username || '',
            welcomeMessage: userRecord.fields.welcomeMessage || '欢迎使用系统'
        };
        
        return res.status(200).json({ success: true, data: profileData });
    } catch (e) {
        console.error('获取个人信息失败:', e);
        return res.status(e.status || 500).json({ success: false, message: e.message || '服务器错误', details: e.details });
    }
});

// 更新个人信息
app.put('/api/profile/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const { displayName, welcomeMessage } = req.body;
        
        if (!username) {
            return res.status(400).json({ success: false, message: '用户名参数缺失' });
        }
        
        // 查找用户记录
        const filter = encodeURIComponent(`{username} = "${username}"`);
        const response = await callVika('GET', `/datasheets/${VIKA_CONFIG.profileDatasheetId}/records?fieldKey=name&filterByFormula=${filter}`);
        
        if (!response.success || !Array.isArray(response.data?.records) || response.data.records.length === 0) {
            return res.status(404).json({ success: false, message: '用户不存在' });
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
        
        return res.status(200).json({ success: true, message: '个人信息更新成功' });
    } catch (e) {
        console.error('更新个人信息失败:', e);
        return res.status(e.status || 500).json({ success: false, message: e.message || '服务器错误', details: e.details });
    }
});

// ============ 酒店信息管理 API ============
// 获取酒店信息
app.get('/api/hotel/:username', async (req, res) => {
    try {
        const { username } = req.params;
        if (!username) {
            return res.status(400).json({ success: false, message: '用户名参数缺失' });
        }
        
        // 从用户表中查找用户的酒店信息
        const filter = encodeURIComponent(`{username} = "${username}"`);
        const response = await callVika('GET', `/datasheets/${VIKA_CONFIG.hotelDatasheetId}/records?fieldKey=name&filterByFormula=${filter}`);
        
        if (!response.success || !Array.isArray(response.data?.records) || response.data.records.length === 0) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }
        
        const userRecord = response.data.records[0];
        const hotelInfo = {
            name: userRecord.fields.hotelName || 'URO Hotel',
            description: userRecord.fields.hotelDescription || 'Hotel & Cafe & Bar'
        };
        
        return res.status(200).json({ success: true, data: hotelInfo });
    } catch (e) {
        console.error('获取酒店信息失败:', e);
        return res.status(e.status || 500).json({ success: false, message: e.message || '服务器错误', details: e.details });
    }
});

// 更新酒店信息
app.put('/api/hotel/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const { name, description } = req.body;
        
        if (!username) {
            return res.status(400).json({ success: false, message: '用户名参数缺失' });
        }
        
        if (!name || !description) {
            return res.status(400).json({ success: false, message: '酒店名称和描述都是必填项' });
        }
        
        // 查找用户记录
        const filter = encodeURIComponent(`{username} = "${username}"`);
        const response = await callVika('GET', `/datasheets/${VIKA_CONFIG.hotelDatasheetId}/records?fieldKey=name&filterByFormula=${filter}`);
        
        if (!response.success || !Array.isArray(response.data?.records) || response.data.records.length === 0) {
            return res.status(404).json({ success: false, message: '用户不存在' });
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
        
        return res.status(200).json({ success: true, message: '酒店信息更新成功' });
    } catch (e) {
        console.error('更新酒店信息失败:', e);
        return res.status(e.status || 500).json({ success: false, message: e.message || '服务器错误', details: e.details });
    }
});

// ============ 基本信息管理 API（合并个人信息和酒店信息）============
// 获取基本信息（酒店名称和用户名）
app.get('/api/basic-info/:username', async (req, res) => {
    try {
        const { username } = req.params;
        if (!username) {
            return res.status(400).json({ success: false, message: '用户名参数缺失' });
        }
        
        // 同时从用户表和网站信息表获取数据
        const userFilter = encodeURIComponent(`{username} = "${username}"`);
        const [userResponse, websiteResponse] = await Promise.all([
            callVika('GET', `/datasheets/${VIKA_CONFIG.datasheetId}/records?fieldKey=name&filterByFormula=${userFilter}`),
            callVika('GET', `/datasheets/${VIKA_CONFIG.hotelDatasheetId}/records?fieldKey=name&filterByFormula=${userFilter}`)
        ]);
        
        // 检查用户是否存在
        if (!userResponse.success || !Array.isArray(userResponse.data?.records) || userResponse.data.records.length === 0) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }
        
        const userRecord = userResponse.data.records[0];
        let websiteName = 'URO Hotel'; // 默认值
        
        // 从网站信息表获取网站名称
        if (websiteResponse.success && Array.isArray(websiteResponse.data?.records) && websiteResponse.data.records.length > 0) {
            const websiteRecord = websiteResponse.data.records[0];
            websiteName = websiteRecord.fields.websiteName || websiteRecord.fields.hotelName || websiteName;
        }
        
        const basicInfo = {
            username: userRecord.fields.username || username,
            websiteName: websiteName
        };
        
        return res.status(200).json({ success: true, data: basicInfo });
    } catch (e) {
        console.error('获取基本信息失败:', e);
        return res.status(e.status || 500).json({ success: false, message: e.message || '服务器错误', details: e.details });
    }
});

// 更新基本信息（酒店名称和用户名）
app.put('/api/basic-info/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const { websiteName } = req.body;
        
        if (!username) {
            return res.status(400).json({ success: false, message: '用户名参数缺失' });
        }
        
        // 查找用户记录以验证用户存在
        const userFilter = encodeURIComponent(`{username} = "${username}"`);
        const userResponse = await callVika('GET', `/datasheets/${VIKA_CONFIG.datasheetId}/records?fieldKey=name&filterByFormula=${userFilter}`);
        
        if (!userResponse.success || !Array.isArray(userResponse.data?.records) || userResponse.data.records.length === 0) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }
        
        // 更新网站信息到网站信息数据表
        if (websiteName !== undefined) {
            // 查找网站信息记录
            const websiteResponse = await callVika('GET', `/datasheets/${VIKA_CONFIG.hotelDatasheetId}/records?fieldKey=name&filterByFormula=${userFilter}`);
            
            const fieldsToUpdate = {
                username: username,
                websiteName: websiteName,
                hotelName: websiteName // 同时更新hotelName字段以保持兼容性
            };
            
            if (websiteResponse.success && Array.isArray(websiteResponse.data?.records) && websiteResponse.data.records.length > 0) {
                // 更新现有记录
                const websiteRecord = websiteResponse.data.records[0];
                const payload = {
                    records: [{ recordId: websiteRecord.recordId, fields: fieldsToUpdate }],
                    fieldKey: 'name'
                };
                const updateResp = await callVika('PATCH', `/datasheets/${VIKA_CONFIG.hotelDatasheetId}/records`, payload);
                if (!updateResp.success) throw new Error('更新网站信息失败');
            } else {
                // 创建新记录
                const payload = {
                    records: [{ fields: fieldsToUpdate }],
                    fieldKey: 'name'
                };
                const createResp = await callVika('POST', `/datasheets/${VIKA_CONFIG.hotelDatasheetId}/records`, payload);
                if (!createResp.success) throw new Error('创建网站信息失败');
            }
        }
        
        return res.status(200).json({ success: true, message: '基本信息更新成功' });
    } catch (e) {
        console.error('更新基本信息失败:', e);
        return res.status(e.status || 500).json({ success: false, message: e.message || '服务器错误', details: e.details });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// 检测日程表字段（用于判断是否存在“用户名/username”字段）
async function detectScheduleFieldKeys() {
    try {
        const ping = await callVika('GET', `/datasheets/${VIKA_CONFIG.scheduleDatasheetId}/records?pageSize=1&fieldKey=name`);
        const sample = Array.isArray(ping?.data?.records) ? ping.data.records[0] : null;
        const fieldKeys = Object.keys(sample?.fields || {});
        const hasUsernameField = fieldKeys.includes('用户名') || fieldKeys.includes('username');
        return { fieldKeys, hasUsernameField };
    } catch (e) {
        return { fieldKeys: [], hasUsernameField: false };
    }
}