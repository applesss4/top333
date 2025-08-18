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
    baseUrl: process.env.VIKA_BASE_URL
};

// 用户注册接口
app.post('/api/register', async (req, res) => {
    console.log('收到注册请求:', req.body);
    console.log('当前维格表配置:', VIKA_CONFIG);
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
        console.log('维格表配置:', VIKA_CONFIG);
        
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

// 启动服务器
app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});