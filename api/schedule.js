// Vercel无服务器函数 - 工作日程管理
const { Vika } = require('@vikadata/vika');

// 维格表配置
const VIKA_CONFIG = {
    apiToken: process.env.VIKA_API_TOKEN || 'uskPGemFgQLFNdWMMNm8KRL',
    scheduleDatasheetId: process.env.VIKA_SCHEDULE_DATASHEET_ID || 'dstCJGLdJJhKJGLdJJ', // 工作日程表ID
    baseUrl: 'https://vika.cn/fusion/v1'
};

// 初始化维格表
const vika = new Vika({ token: VIKA_CONFIG.apiToken });
const scheduleDatasheet = vika.datasheet(VIKA_CONFIG.scheduleDatasheetId);

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
    
    try {
        if (method === 'GET') {
            // 获取工作日程列表
            const { username, date } = query || {};
            
            let filterFormula = '';
            if (username && date) {
                filterFormula = `AND({username} = "${username}", {workDate} = "${date}")`;
            } else if (username) {
                filterFormula = `{username} = "${username}"`;
            }
            
            const response = await scheduleDatasheet.records.query({
                filterByFormula: filterFormula,
                sort: [{ field: 'workDate', order: 'desc' }]
            });
            
            if (response.success) {
                const schedules = response.data.records.map(record => ({
                    id: record.recordId,
                    username: record.fields.username,
                    workStore: Array.isArray(record.fields.workStore) ? record.fields.workStore : [record.fields.workStore].filter(Boolean),
                    workDate: record.fields.workDate,
                    startTime: record.fields.startTime,
                    endTime: record.fields.endTime,
                    duration: record.fields.duration,
                    notes: record.fields.notes || '',
                    createdAt: record.fields.createdAt
                }));
                
                res.status(200).json({
                    success: true,
                    data: schedules
                });
            } else {
                throw new Error(response.message || '获取工作日程失败');
            }
            
        } else if (method === 'POST') {
            // 创建工作日程
            const { username, workStore, workDate, startTime, endTime, duration, notes } = req.body;
            
            if (!username || !workStore || !workDate || !startTime || !endTime) {
                return res.status(400).json({
                    success: false,
                    message: '必填字段缺失'
                });
            }
            
            const createResponse = await scheduleDatasheet.records.create([
                {
                    fields: {
                        username: username,
                        workStore: Array.isArray(workStore) ? workStore : [workStore],
                        workDate: workDate,
                        startTime: startTime,
                        endTime: endTime,
                        duration: duration || 0,
                        notes: notes || '',
                        createdAt: new Date().toISOString()
                    }
                }
            ]);
            
            if (createResponse.success) {
                const newRecord = createResponse.data.records[0];
                res.status(201).json({
                    success: true,
                    message: '工作日程创建成功',
                    data: {
                        id: newRecord.recordId,
                        username: newRecord.fields.username,
                        workStore: newRecord.fields.workStore,
                        workDate: newRecord.fields.workDate,
                        startTime: newRecord.fields.startTime,
                        endTime: newRecord.fields.endTime,
                        duration: newRecord.fields.duration,
                        notes: newRecord.fields.notes,
                        createdAt: newRecord.fields.createdAt
                    }
                });
            } else {
                throw new Error(createResponse.message || '创建工作日程失败');
            }
            
        } else if (method === 'PUT') {
            // 更新工作日程
            const scheduleId = urlParts[urlParts.length - 1];
            const { username, workStore, workDate, startTime, endTime, duration, notes } = req.body;
            
            if (!scheduleId) {
                return res.status(400).json({
                    success: false,
                    message: '工作日程ID缺失'
                });
            }
            
            const updateFields = {};
            if (username) updateFields.username = username;
            if (workStore) updateFields.workStore = Array.isArray(workStore) ? workStore : [workStore];
            if (workDate) updateFields.workDate = workDate;
            if (startTime) updateFields.startTime = startTime;
            if (endTime) updateFields.endTime = endTime;
            if (duration !== undefined) updateFields.duration = duration;
            if (notes !== undefined) updateFields.notes = notes;
            
            const updateResponse = await scheduleDatasheet.records.update([
                {
                    recordId: scheduleId,
                    fields: updateFields
                }
            ]);
            
            if (updateResponse.success) {
                const updatedRecord = updateResponse.data.records[0];
                res.status(200).json({
                    success: true,
                    message: '工作日程更新成功',
                    data: {
                        id: updatedRecord.recordId,
                        username: updatedRecord.fields.username,
                        workStore: updatedRecord.fields.workStore,
                        workDate: updatedRecord.fields.workDate,
                        startTime: updatedRecord.fields.startTime,
                        endTime: updatedRecord.fields.endTime,
                        duration: updatedRecord.fields.duration,
                        notes: updatedRecord.fields.notes
                    }
                });
            } else {
                throw new Error(updateResponse.message || '更新工作日程失败');
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
            
            const deleteResponse = await scheduleDatasheet.records.delete([scheduleId]);
            
            if (deleteResponse.success) {
                res.status(200).json({
                    success: true,
                    message: '工作日程删除成功'
                });
            } else {
                throw new Error(deleteResponse.message || '删除工作日程失败');
            }
            
        } else {
            res.status(405).json({ error: 'Method not allowed' });
        }
        
    } catch (error) {
        console.error('工作日程API错误:', error);
        res.status(500).json({
            success: false,
            error: error.message || '服务器内部错误'
        });
    }
};