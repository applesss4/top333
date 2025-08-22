const Joi = require('joi');

// 验证模式定义
const schemas = {
    registration: Joi.object({
        username: Joi.string().alphanum().min(3).max(30).required()
            .messages({
                'string.alphanum': '用户名只能包含字母和数字',
                'string.min': '用户名至少需要3个字符',
                'string.max': '用户名不能超过30个字符',
                'any.required': '用户名是必填项'
            }),
        email: Joi.string().email().required()
            .messages({
                'string.email': '请输入有效的邮箱地址',
                'any.required': '邮箱是必填项'
            }),
        password: Joi.string().min(6).max(128).required()
            .messages({
                'string.min': '密码至少需要6个字符',
                'string.max': '密码不能超过128个字符',
                'any.required': '密码是必填项'
            })
    }),
    login: Joi.object({
        username: Joi.string().required()
            .messages({
                'any.required': '用户名是必填项'
            }),
        password: Joi.string().required()
            .messages({
                'any.required': '密码是必填项'
            })
    }),
    schedule: Joi.object({
        workStore: Joi.alternatives().try(
            Joi.string(),
            Joi.array().items(Joi.string())
        ).required(),
        workDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required()
            .messages({
                'string.pattern.base': '日期格式必须为YYYY-MM-DD'
            }),
        startTime: Joi.string().pattern(/^\d{2}:\d{2}$/).required()
            .messages({
                'string.pattern.base': '时间格式必须为HH:MM'
            }),
        endTime: Joi.string().pattern(/^\d{2}:\d{2}$/).required()
            .messages({
                'string.pattern.base': '时间格式必须为HH:MM'
            }),
        notes: Joi.string().max(500).allow('').optional()
            .messages({
                'string.max': '备注不能超过500个字符'
            })
    }),
    profile: Joi.object({
        username: Joi.string().alphanum().min(3).max(30).required(),
        email: Joi.string().email().required(),
        phone: Joi.string().pattern(/^1[3-9]\d{9}$/).allow('').optional()
            .messages({
                'string.pattern.base': '请输入有效的手机号码'
            }),
        address: Joi.string().max(200).allow('').optional()
    }),
    hotel: Joi.object({
        name: Joi.string().min(1).max(100).required()
            .messages({
                'string.min': '酒店名称不能为空',
                'string.max': '酒店名称不能超过100个字符'
            }),
        description: Joi.string().max(1000).allow('').optional()
            .messages({
                'string.max': '酒店描述不能超过1000个字符'
            })
    }),
    shop: Joi.object({
        name: Joi.string().min(1).max(100).required()
            .messages({
                'string.min': '店铺名称不能为空',
                'string.max': '店铺名称不能超过100个字符',
                'any.required': '店铺名称是必填项'
            }),
        code: Joi.string().min(1).max(50).required()
            .messages({
                'string.min': '店铺代码不能为空',
                'string.max': '店铺代码不能超过50个字符',
                'any.required': '店铺代码是必填项'
            })
    })
};

/**
 * 输入验证中间件
 * @param {Object} schema - Joi验证模式
 * @returns {Function} Express中间件函数
 */
const validateInput = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, { abortEarly: false });
        if (error) {
            return res.status(400).json({
                success: false,
                message: '输入数据验证失败',
                errors: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message
                }))
            });
        }
        next();
    };
};

/**
 * 输入清理中间件
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
const sanitizeInput = (req, res, next) => {
    const sanitizeValue = (value) => {
        if (typeof value === 'string') {
            // 移除潜在的恶意脚本标签
            return value
                .replace(/<script[^>]*>.*?<\/script>/gi, '')
                .replace(/<[^>]*>/g, '') // 移除所有HTML标签
                .trim();
        }
        if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value)) {
                return value.map(sanitizeValue);
            }
            const sanitized = {};
            for (const [key, val] of Object.entries(value)) {
                sanitized[key] = sanitizeValue(val);
            }
            return sanitized;
        }
        return value;
    };

    // 清理请求体
    if (req.body) {
        req.body = sanitizeValue(req.body);
    }

    // 清理查询参数
    if (req.query) {
        req.query = sanitizeValue(req.query);
    }

    // 清理路由参数
    if (req.params) {
        req.params = sanitizeValue(req.params);
    }

    next();
};

module.exports = {
    schemas,
    validateInput,
    sanitizeInput
};