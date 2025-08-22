const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// 通用频率限制
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 限制每个IP 15分钟内最多100个请求
    message: {
        success: false,
        message: '请求过于频繁，请稍后再试'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// 认证频率限制
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 5, // 限制每个IP 15分钟内最多5次登录尝试
    message: {
        success: false,
        message: '登录尝试过于频繁，请15分钟后再试'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// 注册频率限制
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1小时
    max: 3, // 限制每个IP 1小时内最多3次注册尝试
    message: {
        success: false,
        message: '注册尝试过于频繁，请1小时后再试'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Helmet安全配置
const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false
});

module.exports = {
    generalLimiter,
    authLimiter,
    registerLimiter,
    helmetConfig
};