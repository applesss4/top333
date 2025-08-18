const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const crypto = require('crypto');

const app = express();
const PORT = 3001;

// 维格表配置
const VIKA_CONFIG = {
    apiToken: 'uskPGemFgQLFNdWMMNm8KRL',
    datasheetId: 'dstj2Cp49ca1bXcfZ6',
    baseUrl: 'https://vika.cn/fusion/v1'
};

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
        const response = await fetch(`${VIKA_CONFIG.baseUrl}/datasheets/${VIKA_CONFIG.datasheetId}/records?maxRecords=1`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${VIKA_CONFIG.apiToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            res.json({ success: true, message: '维格表连接成功', data });
        } else {
            res.status(response.status).json({ success: false, message: '维格表连接失败', status: response.status });
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
        
        const response = await fetch(`${VIKA_CONFIG.baseUrl}/datasheets/${VIKA_CONFIG.datasheetId}/records`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${VIKA_CONFIG.apiToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                records: [{
                    fields: {
                        username,
                        email,
                        password: hashedPassword,
                        created_at: new Date().toISOString()
                    }
                }]
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            res.json({ success: true, message: '用户创建成功', data });
        } else {
            const errorData = await response.json();
            res.status(response.status).json({ success: false, message: '用户创建失败', error: errorData });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: '服务器错误', error: error.message });
    }
});

// 验证用户
app.post('/api/users/validate', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const response = await fetch(`${VIKA_CONFIG.baseUrl}/datasheets/${VIKA_CONFIG.datasheetId}/records`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${VIKA_CONFIG.apiToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const user = data.data.records.find(record => 
                record.fields.username === username
            );
            
            if (user) {
                // 使用加密密码验证
                const isPasswordValid = await verifyPassword(password, user.fields.password);
                if (isPasswordValid) {
                    res.json({ success: true, message: '用户验证成功', user: user.fields });
                } else {
                    res.status(401).json({ success: false, message: '用户名或密码错误' });
                }
            } else {
                res.status(401).json({ success: false, message: '用户名或密码错误' });
            }
        } else {
            res.status(response.status).json({ success: false, message: '验证失败' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: '服务器错误', error: error.message });
    }
});

// 检查用户是否存在
app.get('/api/users/check/:username', async (req, res) => {
    try {
        const { username } = req.params;
        
        const response = await fetch(`${VIKA_CONFIG.baseUrl}/datasheets/${VIKA_CONFIG.datasheetId}/records`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${VIKA_CONFIG.apiToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const userExists = data.data.records.some(record => record.fields.username === username);
            res.json({ exists: userExists });
        } else {
            res.status(response.status).json({ success: false, message: '检查失败' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: '服务器错误', error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`维格表代理服务器运行在 http://localhost:${PORT}`);
    console.log('API端点:');
    console.log('- GET /api/test - 测试维格表连接');
    console.log('- POST /api/users - 创建用户');
    console.log('- POST /api/users/validate - 验证用户');
    console.log('- GET /api/users/check/:username - 检查用户是否存在');
});