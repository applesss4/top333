/**
 * 统一API响应格式中间件
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
const responseFormatter = (req, res, next) => {
    // 成功响应
    res.apiSuccess = (data = null, message = '操作成功', statusCode = 200) => {
        return res.status(statusCode).json({
            success: true,
            message,
            data,
            timestamp: new Date().toISOString()
        });
    };

    // 错误响应
    res.apiError = (message = '操作失败', statusCode = 400, details = null) => {
        return res.status(statusCode).json({
            success: false,
            message,
            details,
            timestamp: new Date().toISOString()
        });
    };

    next();
};

module.exports = {
    responseFormatter
};