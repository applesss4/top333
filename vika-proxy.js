const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const crypto = require('crypto');
const { Vika } = require('@vikadata/vika');

const app = express();
const PORT = 3001;

// 维格表配置
const VIKA_CONFIG = {
    apiToken: 'uskPGemFgQLFNdWMMNm8KRL',
    datasheetId: 'dstj2Cp49ca1bXcfZ6',
    baseUrl: 'https://vika.cn/fusion/v1'
};

// 初始化维格表SDK
const vika = new Vika({ 
    token: VIKA_CONFIG.apiToken, 
    fieldKey: "name" 
});

// 用户数据表
const userDatasheet = vika.datasheet(VIKA_CONFIG.datasheetId);

// 密码加密函数（与前端保持一致）
async function hashPassword(password) {
    const data = password + 'salt123'; // 添加简单的盐值
    const hash = crypto.createHash('sha256');
    hash.update(data);
    return hash.digest('hex');
}

// 验证密码
async function verifyPassword(password, hashedPassword) {
    const inputHash = await hashPassword(password);
    return inputHash === hashedPassword;
}

// 启用CORS
app.use(cors());
app.use(express.json());

// 测试连接
app.get('/api/test', async (req, res) => {
    try {
        const response = await userDatasheet.records.query({ maxRecords: 1 });
        
        if (response.success) {
            res.json({ success: true, message: '维格表连接成功', data: response.data });
        } else {
            res.status(500).json({ success: false, message: '维格表连接失败', error: response.message });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: '连接错误', error: error.message });
    }
});

// 创建用户
app.post('/api/users', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // 加密密码
        const hashedPassword = await hashPassword(password);
        
        const recordData = [{
            fields: {
                username,
                email,
                password: hashedPassword,
                created_at: new Date().toISOString()
            }
        }];
        
        const response = await userDatasheet.records.create(recordData);
        
        if (response.success) {
            res.json({ success: true, message: '用户创建成功', data: response.data });
        } else {
            res.status(500).json({ success: false, message: '用户创建失败', error: response.message });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: '服务器错误', error: error.message });
    }
});

// 验证用户
app.post('/api/users/validate', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log(`验证用户: ${username}`);
        
        // 设置超时处理
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('维格表API请求超时')), 10000);
        });
        
        const queryPromise = userDatasheet.records.query();
        
        const response = await Promise.race([queryPromise, timeoutPromise]);
        
        console.log('维格表查询响应:', response.success ? '成功' : '失败');
        
        if (response.success) {
            const user = response.data.records.find(record => 
                record.fields.username === username
            );
            
            if (user) {
                console.log(`找到用户: ${username}`);
                // 使用加密密码验证
                const isPasswordValid = await verifyPassword(password, user.fields.password);
                if (isPasswordValid) {
                    console.log(`用户 ${username} 验证成功`);
                    res.json({ success: true, message: '用户验证成功', user: user.fields });
                } else {
                    console.log(`用户 ${username} 密码错误`);
                    res.status(401).json({ success: false, message: '用户名或密码错误' });
                }
            } else {
                console.log(`用户 ${username} 不存在`);
                res.status(401).json({ success: false, message: '用户名或密码错误' });
            }
        } else {
            console.error('维格表查询失败:', response.message);
            res.status(500).json({ success: false, message: '验证失败', error: response.message });
        }
    } catch (error) {
        console.error('验证用户时发生错误:', error.message);
        res.status(500).json({ success: false, message: '服务器错误', error: error.message });
    }
});

// 检查用户是否存在
app.get('/api/users/check/:username', async (req, res) => {
    try {
        const { username } = req.params;
        console.log(`检查用户是否存在: ${username}`);
        
        // 设置超时处理
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('维格表API请求超时')), 10000);
        });
        
        const queryPromise = userDatasheet.records.query();
        
        const response = await Promise.race([queryPromise, timeoutPromise]);
        
        console.log('维格表查询响应:', response.success ? '成功' : '失败');
        
        if (response.success) {
            const userExists = response.data.records.some(record => record.fields.username === username);
            console.log(`用户 ${username} 存在: ${userExists}`);
            res.json({ exists: userExists });
        } else {
            console.error('维格表查询失败:', response.message);
            res.status(500).json({ success: false, message: '检查失败', error: response.message });
        }
    } catch (error) {
        console.error('检查用户存在时发生错误:', error.message);
        res.status(500).json({ success: false, message: '服务器错误', error: error.message });
    }
});

// 工作日程表配置
const SCHEDULE_CONFIG = {
    datasheetId: 'dstPwqoXLlbSvSHwmE', // 工作日程表ID
    baseUrl: 'https://vika.cn/fusion/v1'
};

// 工作日程数据表
const scheduleDatasheet = vika.datasheet(SCHEDULE_CONFIG.datasheetId);

// 获取所有工作日程
app.get('/api/schedule', async (req, res) => {
    try {
        const response = await scheduleDatasheet.records.query();
        
        if (response.success) {
            // 转换数据格式
            const records = response.data.records.map(record => ({
                id: record.recordId,
                workStore: record.fields['工作店铺'],
                workDate: record.fields['工作日期'] ? new Date(record.fields['工作日期']).toISOString().split('T')[0] : '',
                startTime: record.fields['开始时间'],
                endTime: record.fields['结束时间'],
                notes: record.fields['备注'] || ''
            }));
            res.json({ success: true, records });
        } else {
            res.status(500).json({ success: false, message: '获取工作日程失败', error: response.message });
        }
    } catch (error) {
        console.error('获取工作日程错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 创建工作日程
app.post('/api/schedule', async (req, res) => {
    try {
        const { workStore, workDate, startTime, endTime, notes, duration } = req.body;
        
        // 验证必填字段
        if (!workStore || !workDate || !startTime || !endTime) {
            return res.status(400).json({ success: false, message: '请填写所有必填字段' });
        }
        
        const recordData = [{
            fields: {
                '工作店铺': [workStore],
                '工作日期': new Date(workDate).toISOString(),
                '开始时间': startTime,
                '结束时间': endTime,
                '工作时长': duration ?? null,
                '备注': notes || ''
            }
        }];
        
        const response = await scheduleDatasheet.records.create(recordData);
        
        if (response.success) {
            res.json({ success: true, message: '工作日程创建成功', data: response.data });
        } else {
            res.status(500).json({ success: false, message: '创建工作日程失败', error: response.message });
        }
    } catch (error) {
        console.error('创建工作日程错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 更新工作日程
app.put('/api/schedule/:recordId', async (req, res) => {
    try {
        const { recordId } = req.params;
        const { workStore, workDate, startTime, endTime, notes, duration } = req.body;
        
        // 验证必填字段
        if (!workStore || !workDate || !startTime || !endTime) {
            return res.status(400).json({ success: false, message: '请填写所有必填字段' });
        }
        
        const recordData = [{
            recordId: recordId,
            fields: {
                '工作店铺': [workStore],
                '工作日期': new Date(workDate).toISOString(),
                '开始时间': startTime,
                '结束时间': endTime,
                '工作时长': duration ?? null,
                '备注': notes || ''
            }
        }];
        
        const response = await scheduleDatasheet.records.update(recordData);
        
        if (response.success) {
            res.json({ success: true, message: '工作日程更新成功', data: response.data });
        } else {
            res.status(500).json({ success: false, message: '更新工作日程失败', error: response.message });
        }
    } catch (error) {
        console.error('更新工作日程错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 删除工作日程
app.delete('/api/schedule/:recordId', async (req, res) => {
    try {
        const { recordId } = req.params;
        
        const response = await scheduleDatasheet.records.delete([recordId]);
        
        if (response.success) {
            res.json({ success: true, message: '工作日程删除成功' });
        } else {
            res.status(500).json({ success: false, message: '删除工作日程失败', error: response.message });
        }
    } catch (error) {
        console.error('删除工作日程错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

app.listen(PORT, () => {
    console.log(`维格表代理服务器运行在 http://localhost:${PORT}`);
    console.log('可用的API端点:');
    console.log('- GET /api/test - 测试维格表连接');
    console.log('- POST /api/users - 创建用户');
    console.log('- POST /api/users/validate - 验证用户');
    console.log('- GET /api/users/check/:username - 检查用户是否存在');
    console.log('- GET /api/schedule - 获取所有工作日程');
    console.log('- POST /api/schedule - 创建工作日程');
    console.log('- PUT /api/schedule/:recordId - 更新工作日程');
    console.log('- DELETE /api/schedule/:recordId - 删除工作日程');
});