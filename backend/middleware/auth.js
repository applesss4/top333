const jwt = require('jsonwebtoken');
const { responseFormatter } = require('./response');

// JWT验证中间件
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.apiError('访问被拒绝，需要认证令牌', 401);
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.apiError('令牌已过期，请重新登录', 401);
            } else if (err.name === 'JsonWebTokenError') {
                return res.apiError('无效的令牌', 403);
            } else {
                return res.apiError('令牌验证失败', 403);
            }
        }
        
        req.user = user;
        next();
    });
};

// 可选的JWT验证中间件（用于可选认证的端点）
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            req.user = null;
        } else {
            req.user = user;
        }
        next();
    });
};

// 检查用户权限的中间件
const checkUserPermission = (req, res, next) => {
    const { username } = req.params;
    
    // 检查用户是否有权限访问该资源
    if (req.user && (req.user.username === username || req.user.role === 'admin')) {
        next();
    } else {
        return res.apiError('权限不足，无法访问该资源', 403);
    }
};

module.exports = {
    authenticateToken,
    optionalAuth,
    checkUserPermission
};