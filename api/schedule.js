// Vercel无服务器函数 - 工作日程管理
// 使用无SDK的简化实现，避免Vercel环境依赖问题
const safeFetch = (typeof fetch === 'function') ? fetch : require('node-fetch');

// 维格表配置
const VIKA_CONFIG = {
    apiToken: process.env.VIKA_API_TOKEN,
    scheduleDatasheetId: process.env.VIKA_SCHEDULE_DATASHEET_ID, // 工作日程表ID
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

    const response = await safeFetch(url, options);
    const rawText = await response.text();
    let result;
    try {
        result = rawText ? JSON.parse(rawText) : {};
    } catch (_) {
        result = { raw: rawText };
    }
    if (!response.ok) {
        const err = new Error(result?.message || result?.msg || result?.code || `Vika API error: ${response.status}`);
        err.status = response.status;
        err.details = result;
        err.url = url;
        throw err;
    }
    return result;
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

// 确保备注中包含用户标签 [@user:username]
function ensureUserTag(notes, username) {
    if (!username) return notes || '';
    const tag = `[@user:${username}]`;
    const src = (notes || '').trim();
    return src.includes(tag) ? src : `${src}${src ? ' ' : ''}${tag}`;
}

module.exports = async (req, res) => {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // 处理预检请求
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const { method, url, query } = req;
    const urlParts = url.split('/');

    // 统一获取查询参数的工具函数（兼容不同平台）
    const getQueryParam = (name) => {
        try {
            if (query && Object.prototype.hasOwnProperty.call(query, name)) return query[name];
            const u = new URL(req.url, 'http://localhost');
            return u.searchParams.get(name);
        } catch (_) { return undefined; }
    };

    // 统一解析 JSON 请求体
    const body = await parseJsonBody(req);
    
    try {
        if (method === 'GET') {
            // 诊断模式：仅检查与维格表的连通性，避免被业务逻辑干扰
            const diag = getQueryParam('diag');
            if (diag === '1' || diag === 'true') {
                const envInfo = {
                    hasGlobalFetch: typeof fetch === 'function',
                    runtime: process.version,
                    hasToken: !!VIKA_CONFIG.apiToken,
                    hasScheduleId: !!VIKA_CONFIG.scheduleDatasheetId,
                    baseUrl: VIKA_CONFIG.baseUrl,
                };
                try {
                    const ping = await callVikaAPI('GET', `/datasheets/${VIKA_CONFIG.scheduleDatasheetId}/records?pageSize=1&fieldKey=name`);
                    return res.status(200).json({
                        success: true,
                        total: ping?.data?.total ?? null,
                        sample: Array.isArray(ping?.data?.records) ? ping.data.records.slice(0,1) : [],
                        message: 'Vika API accessible via fetch',
                        env: envInfo
                    });
                } catch (e) {
                    return res.status(500).json({
                        success: false,
                        error: e?.message || String(e),
                        code: e?.code || e?.status || undefined,
                        details: e?.details || undefined,
                        url: e?.url || undefined,
                        env: envInfo
                    });
                }
            }

            // 获取工作日程列表（为避免字段名不一致导致 filter 报错，先取全量再本地筛选）
            const username = getQueryParam('username');
            const date = getQueryParam('date');
            
            const response = await callVikaAPI('GET', `/datasheets/${VIKA_CONFIG.scheduleDatasheetId}/records?fieldKey=name`);
            
            if (response.success) {
                let schedules = response.data.records.map(record => ({
                    id: record.recordId,
                    username: record.fields['username'] || record.fields['用户名'] || '',
                    workStore: Array.isArray(record.fields['工作店铺']) ? record.fields['工作店铺'] : [record.fields['工作店铺']].filter(Boolean),
                    workDate: record.fields['工作日期'] ? new Date(record.fields['工作日期']).toISOString().split('T')[0] : '',
                    startTime: record.fields['开始时间'] || '',
                    endTime: record.fields['结束时间'] || '',
                    duration: record.fields['工作时长'] ?? 0,
                    notes: record.fields['备注'] || '',
                    createdAt: record.fields['created_at'] || record.fields['创建时间'] || ''
                }));

                // 本地筛选，避免远程公式因字段差异报错
                if (username) {
                    const tag = `[@user:${username}]`;
                    schedules = schedules.filter(r => r.username === username || (r.notes || '').includes(tag));
                }
                if (date) {
                    schedules = schedules.filter(r => r.workDate === date);
                }
                
                res.status(200).json({
                    success: true,
                    records: schedules
                });
            } else {
                throw new Error(response.message || '获取工作日程失败');
            }
            
        } else if (method === 'POST') {
            // 创建工作日程（POST）中的必填校验与字段映射
            const { username, workStore, workDate, startTime, endTime, duration, notes } = body;
            
            if (!workStore || !workDate || !startTime || !endTime) {
                return res.status(400).json({
                    success: false,
                    message: '必填字段缺失'
                });
            }
            
            const fieldsToCreate = {
                '工作店铺': Array.isArray(workStore) ? workStore : [workStore],
                '工作日期': new Date(workDate).toISOString(),
                '开始时间': startTime,
                '结束时间': endTime,
                '工作时长': duration ?? null,
                '备注': ensureUserTag(notes || '', username),
                'created_at': new Date().toISOString()
            };
            if (username) {
                fieldsToCreate['username'] = username;
            }
            
            const data = {
                records: [{ fields: fieldsToCreate }],
                fieldKey: 'name'
            };
            
            const createResponse = await callVikaAPI('POST', `/datasheets/${VIKA_CONFIG.scheduleDatasheetId}/records`, data);
            
            if (createResponse.success) {
                const newRecord = createResponse.data.records[0];
                res.status(201).json({
                    success: true,
                    message: '工作日程创建成功',
                    data: {
                        id: newRecord.recordId,
                        username: newRecord.fields['username'] || '',
                        workStore: newRecord.fields['工作店铺'] || [],
                        workDate: newRecord.fields['工作日期'] ? new Date(newRecord.fields['工作日期']).toISOString().split('T')[0] : '',
                        startTime: newRecord.fields['开始时间'] || '',
                        endTime: newRecord.fields['结束时间'] || '',
                        duration: newRecord.fields['工作时长'] ?? 0,
                        notes: newRecord.fields['备注'] || '',
                        createdAt: newRecord.fields['created_at'] || ''
                    }
                });
            } else {
                throw new Error('创建工作日程失败');
            }
            
        } else if (method === 'PUT') {
            // 更新工作日程
            const scheduleId = urlParts[urlParts.length - 1];
            const { username, workStore, workDate, startTime, endTime, duration, notes } = body;
            
            if (!scheduleId) {
                return res.status(400).json({
                    success: false,
                    message: '工作日程ID缺失'
                });
            }
            
            const updateFields = {};
            if (username !== undefined) updateFields['username'] = username;
            if (workStore !== undefined) updateFields['工作店铺'] = Array.isArray(workStore) ? workStore : [workStore];
            if (workDate !== undefined) updateFields['工作日期'] = new Date(workDate).toISOString();
            if (startTime !== undefined) updateFields['开始时间'] = startTime;
            if (endTime !== undefined) updateFields['结束时间'] = endTime;
            if (duration !== undefined) updateFields['工作时长'] = duration;
            if (notes !== undefined) updateFields['备注'] = ensureUserTag(notes, username);
            
            const updateData = {
                records: [{
                    recordId: scheduleId,
                    fields: updateFields
                }],
                fieldKey: 'name'
            };
            
            const updateResponse = await callVikaAPI('PATCH', `/datasheets/${VIKA_CONFIG.scheduleDatasheetId}/records`, updateData);
            
            if (updateResponse.success) {
                const updatedRecord = updateResponse.data.records[0];
                res.status(200).json({
                    success: true,
                    message: '工作日程更新成功',
                    data: {
                        id: updatedRecord.recordId,
                        username: updatedRecord.fields['username'] || '',
                        workStore: updatedRecord.fields['工作店铺'] || [],
                        workDate: updatedRecord.fields['工作日期'] ? new Date(updatedRecord.fields['工作日期']).toISOString().split('T')[0] : '',
                        startTime: updatedRecord.fields['开始时间'] || '',
                        endTime: updatedRecord.fields['结束时间'] || '',
                        duration: updatedRecord.fields['工作时长'] ?? 0,
                        notes: updatedRecord.fields['备注'] || ''
                    }
                });
            } else {
                throw new Error('更新工作日程失败');
            }
            
        } else if (method === 'DELETE') {
            // 删除工作日程
            const scheduleId = urlParts[urlParts.length - 1];
            
            if (!scheduleId) {
                return res.status(400).json({
                    success: false,
                    message: '工作日程ID缺失'
                });
            }
            
            await callVikaAPI('DELETE', `/datasheets/${VIKA_CONFIG.scheduleDatasheetId}/records/${scheduleId}`);
            
            res.status(200).json({
                success: true,
                message: '工作日程删除成功'
            });
        }
        
        else {
            res.status(405).json({ error: 'Method not allowed' });
        }
        
    } catch (error) {
        console.error('工作日程API错误:', error);
        // 同时兼容 req.query 和 URL 参数两种方式
        let isDebug = false;
        try {
            const dbg = getQueryParam('debug');
            isDebug = dbg === '1' || dbg === 'true';
        } catch (_) {}
        const errMsg = error?.message || String(error);
        const details = {
            message: errMsg,
            name: error?.name,
            code: error?.code || error?.status,
            stack: error?.stack,
            response: error?.response || error?.data || error?.details || null,
            url: error?.url || undefined
        };
        res.status(500).json({
            success: false,
            error: errMsg,
            ...(isDebug ? { details } : {})
        });
    }
};