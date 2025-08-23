// JWT认证中间件 - Vercel无服务器函数版本
const jwt = require('jsonwebtoken');

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * JWT认证中间件
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @returns {Object|null} - 返回用户信息或null（如果认证失败）
 */
function authenticateToken(req, res) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        res.status(401).json({ 
            success: false, 
            message: '访问令牌缺失' 
        });
        return null;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded; // 返回解码后的用户信息
    } catch (error) {
        res.status(403).json({ 
            success: false, 
            message: '无效的访问令牌' 
        });
        return null;
    }
}

/**
 * 可选JWT认证中间件
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @returns {Object|null} - 返回用户信息或null（如果没有token或认证失败）
 */
function optionalAuth(req, res) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return null; // 没有token，但不返回错误
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded;
    } catch (error) {
        return null; // token无效，但不返回错误
    }
}

module.exports = {
    authenticateToken,
    optionalAuth
};