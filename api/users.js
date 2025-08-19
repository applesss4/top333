// Vercel无服务器函数 - 用户管理
const { Vika } = require('@vikadata/vika');
const bcrypt = require('bcryptjs');

// 维格表配置
const VIKA_CONFIG = {
    apiToken: process.env.VIKA_API_TOKEN || 'uskPGemFgQLFNdWMMNm8KRL',
    datasheetId: process.env.VIKA_DATASHEET_ID || 'dstj2Cp49ca1bXcfZ6',
    baseUrl: 'https://vika.cn/fusion/v1'
};

// 初始化维格表
const vika = new Vika({ token: VIKA_CONFIG.apiToken });
const userDatasheet = vika.datasheet(VIKA_CONFIG.datasheetId);

// 密码加密
async function hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
}

// 密码验证
async function verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
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
    
    const { method, url } = req;
    const urlParts = url.split('/');
    
    try {
        if (method === 'POST' && url === '/api/users') {
            // 创建用户
            const { username, email, password } = req.body;
            
            if (!username || !email || !password) {
                return res.status(400).json({
                    success: false,
                    message: '用户名、邮箱和密码都是必填项'
                });
            }
            
            // 检查用户是否已存在
            const existingUsers = await userDatasheet.records.query({
                filterByFormula: `{username} = "${username}"`
            });
            
            if (existingUsers.success && existingUsers.data.records.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: '用户名已存在'
                });
            }
            
            // 加密密码
            const hashedPassword = await hashPassword(password);
            
            // 创建用户记录
            const createResponse = await userDatasheet.records.create([
                {
                    fields: {
                        username: username,
                        email: email,
                        password: hashedPassword,
                        created_at: new Date().toISOString()
                    }
                }
            ]);
            
            if (createResponse.success) {
                res.status(201).json({
                    success: true,
                    message: '用户创建成功',
                    user: {
                        id: createResponse.data.records[0].recordId,
                        username: username,
                        email: email
                    }
                });
            } else {
                throw new Error(createResponse.message || '创建用户失败');
            }
            
        } else if (method === 'POST' && url === '/api/users/validate') {
            // 验证用户
            const { username, password } = req.body;
            
            if (!username || !password) {
                return res.status(400).json({
                    success: false,
                    message: '用户名和密码都是必填项'
                });
            }
            
            // 查找用户
            const userResponse = await userDatasheet.records.query({
                filterByFormula: `{username} = "${username}"`
            });
            
            if (!userResponse.success || userResponse.data.records.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: '用户名或密码错误'
                });
            }
            
            const user = userResponse.data.records[0];
            const isPasswordValid = await verifyPassword(password, user.fields.password);
            
            if (isPasswordValid) {
                res.status(200).json({
                    success: true,
                    message: '登录成功',
                    user: {
                        id: user.recordId,
                        username: user.fields.username,
                        email: user.fields.email
                    }
                });
            } else {
                res.status(401).json({
                    success: false,
                    message: '用户名或密码错误'
                });
            }
            
        } else if (method === 'GET' && urlParts[3] === 'check') {
            // 检查用户是否存在
            const username = urlParts[4];
            
            if (!username) {
                return res.status(400).json({
                    success: false,
                    message: '用户名参数缺失'
                });
            }
            
            const userResponse = await userDatasheet.records.query({
                filterByFormula: `{username} = "${username}"`
            });
            
            res.status(200).json({
                exists: userResponse.success && userResponse.data.records.length > 0
            });
            
        } else {
            res.status(404).json({ error: 'Not found' });
        }
        
    } catch (error) {
        console.error('用户API错误:', error);
        res.status(500).json({
            success: false,
            error: error.message || '服务器内部错误'
        });
    }
};