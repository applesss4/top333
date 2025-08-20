// Vercel无服务器函数 - 工作日程管理（简化版本，直接调用 Vika REST API）

// 维格表配置
const VIKA_CONFIG = {
    apiToken: process.env.VIKA_API_TOKEN,
    scheduleDatasheetId: process.env.VIKA_SCHEDULE_DATASHEET_ID,
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
    
    const response = await fetch(url, options);
    const result = await response.json();
    
    if (!response.ok) {
        throw new Error(result.message || `Vika API error: ${response.status}`);
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
            // 诊断模式：仅检查与维格表的连通性
            const diag = getQueryParam('diag');
            if (diag === '1' || diag === 'true') {
                try {
                    const result = await callVikaAPI('GET', `/datasheets/${VIKA_CONFIG.scheduleDatasheetId}/records?maxRecords=1&fieldKey=name`);
                    return res.status(200).json({
                        success: true,
                        total: result.data?.total ?? null,
                        message: 'Vika API accessible via fetch',
                        env: {
                            hasToken: !!VIKA_CONFIG.apiToken,
                            hasScheduleId: !!VIKA_CONFIG.scheduleDatasheetId,
                        }
                    });
                } catch (e) {
                    return res.status(500).json({
                        success: false,
                        error: e?.message || String(e),
                        code: e?.code || undefined
                    });
                }
            }

            // 获取工作日程列表
            const username = getQueryParam('username');
            const date = getQueryParam('date');
            
            let endpoint = `/datasheets/${VIKA_CONFIG.scheduleDatasheetId}/records?fieldKey=name`;
            
            // 构建过滤条件
            if (username && date) {
                const filter = encodeURIComponent(`AND({用户名} = "${username}", {工作日期} = "${date}")`);
                endpoint += `&filterByFormula=${filter}`;
            } else if (username) {
                const filter = encodeURIComponent(`{用户名} = "${username}"`);
                endpoint += `&filterByFormula=${filter}`;
            }
            
            const result = await callVikaAPI('GET', endpoint);
            
            if (result.success) {
                const schedules = result.data.records.map(record => ({
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
                
                res.status(200).json({
                    success: true,
                    records: schedules
                });
            } else {
                throw new Error('获取工作日程失败');
            }
            
        } else if (method === 'POST') {
            // 创建工作日程
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
                '备注': notes || '',
                'created_at': new Date().toISOString()
            };
            if (username) {
                fieldsToCreate['username'] = username;
            }
            
            const data = {
                records: [{ fields: fieldsToCreate }],
                fieldKey: 'name'
            };
            
            const result = await callVikaAPI('POST', `/datasheets/${VIKA_CONFIG.scheduleDatasheetId}/records`, data);
            
            if (result.success) {
                const newRecord = result.data.records[0];
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
            if (notes !== undefined) updateFields['备注'] = notes;
            
            const data = {
                records: [{
                    recordId: scheduleId,
                    fields: updateFields
                }],
                fieldKey: 'name'
            };
            
            const result = await callVikaAPI('PATCH', `/datasheets/${VIKA_CONFIG.scheduleDatasheetId}/records`, data);
            
            if (result.success) {
                const updatedRecord = result.data.records[0];
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
            
            await callVikaAPI('DELETE', `/datasheets/${VIKA_CONFIG.scheduleDatasheetId}/records?records=${scheduleId}`);
            
            res.status(200).json({
                success: true,
                message: '工作日程删除成功'
            });
            
        } else {
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
        res.status(500).json({
            success: false,
            error: errMsg
        });
    }
};