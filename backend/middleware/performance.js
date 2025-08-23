const { userCacheOps, scheduleCacheOps, cacheOps } = require('../utils/cache');

/**
 * 请求去重中间件 - 防止短时间内的重复请求
 */
const requestDeduplication = (() => {
    const pendingRequests = new Map();
    
    return (req, res, next) => {
        // 只对GET请求进行去重
        if (req.method !== 'GET') {
            return next();
        }
        
        // 生成请求唯一标识
        const requestKey = `${req.method}:${req.originalUrl}:${JSON.stringify(req.query)}`;
        
        // 检查是否有相同的请求正在处理
        if (pendingRequests.has(requestKey)) {
            const pendingPromise = pendingRequests.get(requestKey);
            
            // 等待正在处理的请求完成
            pendingPromise.then((result) => {
                if (result.success) {
                    res.apiSuccess(result.data, result.message);
                } else {
                    res.apiError(result.message, result.status, result.error);
                }
            }).catch((error) => {
                res.apiError('请求处理失败', 500, error);
            });
            
            return;
        }
        
        // 创建请求Promise
        const requestPromise = new Promise((resolve, reject) => {
            // 保存原始的响应方法
            const originalApiSuccess = res.apiSuccess;
            const originalApiError = res.apiError;
            
            // 重写响应方法以捕获结果
            res.apiSuccess = function(data, message, status = 200) {
                resolve({ success: true, data, message, status });
                return originalApiSuccess.call(this, data, message, status);
            };
            
            res.apiError = function(message, status = 500, error = null) {
                resolve({ success: false, message, status, error });
                return originalApiError.call(this, message, status, error);
            };
            
            // 设置清理定时器
            setTimeout(() => {
                pendingRequests.delete(requestKey);
            }, 5000); // 5秒后清理
            
            next();
        });
        
        pendingRequests.set(requestKey, requestPromise);
    };
})();

/**
 * 响应压缩中间件
 */
const responseCompression = (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
        // 对大型响应数据进行优化
        if (data && typeof data === 'object') {
            // 移除空值和undefined
            const cleanData = removeEmptyValues(data);
            return originalJson.call(this, cleanData);
        }
        
        return originalJson.call(this, data);
    };
    
    next();
};

/**
 * 移除对象中的空值
 * @param {any} obj - 要清理的对象
 * @returns {any} 清理后的对象
 */
function removeEmptyValues(obj) {
    if (Array.isArray(obj)) {
        return obj.map(removeEmptyValues).filter(item => item !== null && item !== undefined);
    }
    
    if (obj && typeof obj === 'object') {
        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value !== null && value !== undefined && value !== '') {
                cleaned[key] = removeEmptyValues(value);
            }
        }
        return cleaned;
    }
    
    return obj;
}

/**
 * 批量请求处理中间件
 */
const batchRequestHandler = (() => {
    const batchQueues = new Map();
    
    return {
        /**
         * 添加请求到批量队列
         * @param {string} batchKey - 批量处理的键
         * @param {Function} processor - 批量处理函数
         * @param {number} maxBatchSize - 最大批量大小
         * @param {number} maxWaitTime - 最大等待时间（毫秒）
         */
        addToBatch: (batchKey, processor, maxBatchSize = 10, maxWaitTime = 100) => {
            return (req, res, next) => {
                if (!batchQueues.has(batchKey)) {
                    batchQueues.set(batchKey, {
                        requests: [],
                        processor,
                        maxBatchSize,
                        maxWaitTime,
                        timer: null
                    });
                }
                
                const batch = batchQueues.get(batchKey);
                batch.requests.push({ req, res, next });
                
                // 如果达到最大批量大小，立即处理
                if (batch.requests.length >= batch.maxBatchSize) {
                    processBatch(batchKey);
                } else if (!batch.timer) {
                    // 设置定时器，在最大等待时间后处理
                    batch.timer = setTimeout(() => {
                        processBatch(batchKey);
                    }, batch.maxWaitTime);
                }
            };
        }
    };
    
    function processBatch(batchKey) {
        const batch = batchQueues.get(batchKey);
        if (!batch || batch.requests.length === 0) return;
        
        const requests = batch.requests.splice(0);
        if (batch.timer) {
            clearTimeout(batch.timer);
            batch.timer = null;
        }
        
        // 执行批量处理
        batch.processor(requests).catch(error => {
            console.error('批量处理失败:', error);
            // 对所有请求返回错误
            requests.forEach(({ res }) => {
                res.apiError('批量处理失败', 500, error);
            });
        });
    }
})();

/**
 * 缓存预热中间件
 */
const cacheWarmup = {
    /**
     * 预热用户相关缓存
     * @param {string} username - 用户名
     */
    warmupUserCache: async (username) => {
        try {
            // 预热用户存在性检查
            await userCacheOps.checkExists(username, async () => {
                const { checkUserExists } = require('../utils/vikaApi');
                return await checkUserExists(username);
            });
        } catch (error) {
            console.warn('用户缓存预热失败:', error.message);
        }
    },
    
    /**
     * 预热日程缓存
     * @param {string} username - 用户名
     * @param {string} date - 日期
     */
    warmupScheduleCache: async (username, date) => {
        try {
            await scheduleCacheOps.getSchedules(username, date, async () => {
                // 这里应该调用实际的日程获取函数
                return [];
            });
        } catch (error) {
            console.warn('日程缓存预热失败:', error.message);
        }
    }
};

/**
 * 性能监控中间件
 */
const performanceMonitor = (req, res, next) => {
    const startTime = Date.now();
    
    // 监听响应完成
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        // 记录慢请求
        if (duration > 1000) { // 超过1秒的请求
            console.warn('慢请求检测:', {
                method: req.method,
                url: req.originalUrl,
                duration: `${duration}ms`,
                status: res.statusCode
            });
        }
        
        // 记录性能指标
        if (process.env.NODE_ENV === 'development') {
            // 记录请求性能数据
        }
    });
    
    next();
};

/**
 * 缓存统计API
 */
const cacheStatsHandler = (req, res) => {
    try {
        const stats = cacheOps.getStats();
        const keyCounts = cacheOps.getKeyCounts();
        
        res.apiSuccess({
            stats,
            keyCounts,
            timestamp: new Date().toISOString()
        }, '缓存统计获取成功');
    } catch (error) {
        res.apiError('获取缓存统计失败', 500, error);
    }
};

/**
 * 清除缓存API
 */
const clearCacheHandler = (req, res) => {
    try {
        const { type, username, date } = req.query;
        
        switch (type) {
            case 'user':
                if (username) {
                    userCacheOps.clearUser(username);
                    res.apiSuccess(null, `用户 ${username} 的缓存已清除`);
                } else {
                    res.apiError('清除用户缓存需要提供用户名', 400);
                }
                break;
                
            case 'schedule':
                if (username) {
                    scheduleCacheOps.clearSchedules(username, date);
                    res.apiSuccess(null, `用户 ${username} 的日程缓存已清除`);
                } else {
                    res.apiError('清除日程缓存需要提供用户名', 400);
                }
                break;
                
            case 'all':
                cacheOps.clearAll();
                res.apiSuccess(null, '所有缓存已清除');
                break;
                
            default:
                res.apiError('无效的缓存类型', 400);
        }
    } catch (error) {
        res.apiError('清除缓存失败', 500, error);
    }
};

module.exports = {
    requestDeduplication,
    responseCompression,
    batchRequestHandler,
    cacheWarmup,
    performanceMonitor,
    cacheStatsHandler,
    clearCacheHandler,
    removeEmptyValues
};