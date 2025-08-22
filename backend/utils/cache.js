const NodeCache = require('node-cache');

// 创建缓存实例
const cache = new NodeCache({
    stdTTL: 300, // 默认5分钟过期
    checkperiod: 60, // 每60秒检查过期项
    useClones: false // 提高性能，不克隆对象
});

// 用户缓存（较长过期时间）
const userCache = new NodeCache({
    stdTTL: 1800, // 30分钟过期
    checkperiod: 120,
    useClones: false
});

// 日程缓存（较短过期时间）
const scheduleCache = new NodeCache({
    stdTTL: 180, // 3分钟过期
    checkperiod: 30,
    useClones: false
});

/**
 * 生成缓存键
 * @param {string} prefix - 前缀
 * @param {...any} parts - 键的组成部分
 * @returns {string} 缓存键
 */
function generateCacheKey(prefix, ...parts) {
    return `${prefix}:${parts.filter(p => p != null).join(':')}`;
}

/**
 * 通用缓存包装器
 * @param {NodeCache} cacheInstance - 缓存实例
 * @param {string} key - 缓存键
 * @param {Function} fetchFunction - 获取数据的函数
 * @param {number} ttl - 过期时间（秒）
 * @returns {Promise<any>} 缓存或新获取的数据
 */
async function cacheWrapper(cacheInstance, key, fetchFunction, ttl = null) {
    // 尝试从缓存获取
    const cached = cacheInstance.get(key);
    if (cached !== undefined) {
        return cached;
    }
    
    try {
        // 缓存未命中，执行获取函数
        const result = await fetchFunction();
        
        // 只缓存成功的结果
        if (result && (result.success !== false)) {
            if (ttl) {
                cacheInstance.set(key, result, ttl);
            } else {
                cacheInstance.set(key, result);
            }
        }
        
        return result;
    } catch (error) {
        // 错误不缓存，直接抛出
        throw error;
    }
}

/**
 * 用户相关缓存操作
 */
const userCacheOps = {
    /**
     * 获取用户信息（带缓存）
     * @param {string} username - 用户名
     * @param {Function} fetchFunction - 获取用户的函数
     * @returns {Promise<any>} 用户信息
     */
    getUser: async (username, fetchFunction) => {
        const key = generateCacheKey('user', username);
        return cacheWrapper(userCache, key, fetchFunction, 1800); // 30分钟
    },
    
    /**
     * 检查用户是否存在（带缓存）
     * @param {string} username - 用户名
     * @param {Function} fetchFunction - 检查用户的函数
     * @returns {Promise<boolean>} 用户是否存在
     */
    checkExists: async (username, fetchFunction) => {
        const key = generateCacheKey('user_exists', username);
        return cacheWrapper(userCache, key, fetchFunction, 900); // 15分钟
    },
    
    /**
     * 清除用户缓存
     * @param {string} username - 用户名
     */
    clearUser: (username) => {
        const userKey = generateCacheKey('user', username);
        const existsKey = generateCacheKey('user_exists', username);
        userCache.del([userKey, existsKey]);
    }
};

/**
 * 日程相关缓存操作
 */
const scheduleCacheOps = {
    /**
     * 获取日程列表（带缓存）
     * @param {string} username - 用户名
     * @param {string} date - 日期
     * @param {Function} fetchFunction - 获取日程的函数
     * @returns {Promise<any>} 日程列表
     */
    getSchedules: async (username, date, fetchFunction) => {
        const key = generateCacheKey('schedules', username, date);
        return cacheWrapper(scheduleCache, key, fetchFunction, 180); // 3分钟
    },
    
    /**
     * 清除日程缓存
     * @param {string} username - 用户名
     * @param {string} date - 日期（可选）
     */
    clearSchedules: (username, date = null) => {
        if (date) {
            const key = generateCacheKey('schedules', username, date);
            scheduleCache.del(key);
        } else {
            // 清除该用户的所有日程缓存
            const keys = scheduleCache.keys().filter(key => key.startsWith(`schedules:${username}:`));
            scheduleCache.del(keys);
        }
    }
};

/**
 * 通用缓存操作
 */
const cacheOps = {
    /**
     * 获取缓存统计信息
     * @returns {Object} 缓存统计
     */
    getStats: () => {
        return {
            general: cache.getStats(),
            user: userCache.getStats(),
            schedule: scheduleCache.getStats()
        };
    },
    
    /**
     * 清除所有缓存
     */
    clearAll: () => {
        cache.flushAll();
        userCache.flushAll();
        scheduleCache.flushAll();
    },
    
    /**
     * 获取缓存键数量
     * @returns {Object} 各缓存的键数量
     */
    getKeyCounts: () => {
        return {
            general: cache.keys().length,
            user: userCache.keys().length,
            schedule: scheduleCache.keys().length
        };
    }
};

module.exports = {
    cache,
    userCache,
    scheduleCache,
    generateCacheKey,
    cacheWrapper,
    userCacheOps,
    scheduleCacheOps,
    cacheOps
};