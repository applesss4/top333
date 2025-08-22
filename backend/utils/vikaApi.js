const axios = require('axios');
const { userCacheOps, scheduleCacheOps, generateCacheKey, cacheWrapper, cache } = require('./cache');

// 确保环境变量已加载
require('dotenv').config();

// 维格表API配置
const VIKA_CONFIG = {
    apiToken: process.env.VIKA_API_TOKEN,
    datasheetId: process.env.VIKA_DATASHEET_ID,
    scheduleDatasheetId: process.env.VIKA_SCHEDULE_DATASHEET_ID,
    profileDatasheetId: process.env.VIKA_PROFILE_DATASHEET_ID || process.env.VIKA_DATASHEET_ID,
    hotelDatasheetId: process.env.VIKA_HOTEL_DATASHEET_ID || process.env.VIKA_DATASHEET_ID,
    basicInfoDatasheetId: process.env.VIKA_BASIC_INFO_DATASHEET_ID || process.env.VIKA_DATASHEET_ID,
    shopDatasheetId: process.env.VIKA_SHOP_DATASHEET_ID || process.env.VIKA_DATASHEET_ID,
    baseUrl: process.env.VIKA_BASE_URL || 'https://vika.cn/fusion/v1'
};

// 创建axios实例，配置连接池和超时
const vikaAxios = axios.create({
    baseURL: VIKA_CONFIG.baseUrl,
    timeout: 10000,
    headers: {
        'Authorization': `Bearer ${VIKA_CONFIG.apiToken}`,
        'Content-Type': 'application/json'
    },
    // 连接池配置
    maxRedirects: 3,
    maxContentLength: 50 * 1024 * 1024, // 50MB
    maxBodyLength: 50 * 1024 * 1024
});

/**
 * 统一的 Vika API 调用辅助函数（优化版）
 * @param {string} method - HTTP方法
 * @param {string} endpoint - API端点
 * @param {Object} data - 请求数据
 * @param {number} retries - 重试次数
 * @param {boolean} useCache - 是否使用缓存（仅GET请求）
 * @returns {Promise<Object>} API响应结果
 */
async function callVika(method, endpoint, data = null, retries = 3, useCache = false) {
    const cacheKey = useCache && method === 'GET' ? generateCacheKey('vika_api', method, endpoint, JSON.stringify(data)) : null;
    
    // 如果是GET请求且启用缓存，先尝试从缓存获取
    if (cacheKey) {
        const cached = cache.get(cacheKey);
        if (cached) {
            return cached;
        }
    }
    
    // 智能重试策略：根据错误类型决定是否重试
    const shouldRetry = (error, attempt) => {
        if (attempt >= retries) return false;
        
        const status = error?.response?.status;
        // 不重试的状态码：4xx客户端错误（除了429）
        if (status >= 400 && status < 500 && status !== 429) {
            return false;
        }
        
        // 重试的情况：网络错误、超时、5xx服务器错误、429频率限制
        return true;
    };
    
    // 动态退避策略
    const getBackoffDelay = (attempt, error) => {
        const baseDelay = 1000; // 1秒基础延迟
        const status = error?.response?.status;
        
        if (status === 429) {
            // 频率限制：更长的延迟
            return baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        }
        
        // 其他错误：标准指数退避 + 随机抖动
        return baseDelay * Math.pow(1.5, attempt) + Math.random() * 500;
    };
    
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const resp = await vikaAxios({
                method,
                url: endpoint,
                data
            });
            
            const result = { success: true, data: resp.data };
            
            // 缓存成功的GET请求结果
            if (cacheKey && result.success) {
                const ttl = endpoint.includes('/records') ? 180 : 300; // 记录类API缓存3分钟，其他5分钟
                cache.set(cacheKey, result, ttl);
            }
            
            return result;
        } catch (err) {
            lastError = err;
            console.error(`Vika API调用失败 (尝试 ${attempt}/${retries}):`, {
                endpoint,
                status: err?.response?.status,
                message: err?.message
            });
            
            if (!shouldRetry(err, attempt)) {
                break;
            }
            
            // 等待后重试
            if (attempt < retries) {
                const delay = getBackoffDelay(attempt, err);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    // 所有重试都失败，抛出错误
    const e = new Error(lastError?.response?.data?.message || lastError?.response?.data?.msg || lastError?.message || 'Vika API error');
    e.status = lastError?.response?.status;
    e.details = lastError?.response?.data;
    e.url = `${VIKA_CONFIG.baseUrl}${endpoint}`;
    e.code = 'VIKA_API_ERROR';
    throw e;
}

/**
 * 检测日程表字段（用于判断是否存在"用户名/username"字段）
 * @returns {Promise<Object>} 字段检测结果
 */
async function detectScheduleFieldKeys() {
    try {
        const ping = await callVika('GET', `/datasheets/${VIKA_CONFIG.scheduleDatasheetId}/records?pageSize=1&fieldKey=name`);
        const sample = Array.isArray(ping?.data?.records) ? ping.data.records[0] : null;
        const fieldKeys = Object.keys(sample?.fields || {});
        const hasUsernameField = fieldKeys.includes('用户名') || fieldKeys.includes('username');
        return { fieldKeys, hasUsernameField };
    } catch (e) {
        return { fieldKeys: [], hasUsernameField: false };
    }
}

/**
 * 检查用户是否已存在（优化版，带缓存）
 * @param {string} username - 用户名
 * @param {string} email - 邮箱（可选）
 * @returns {Promise<Object|null>} 用户记录或null
 */
async function checkUserExists(username, email = null) {
    try {
        if (!username || typeof username !== 'string') {
            return null;
        }
        
        const trimmedUsername = username.trim();
        
        // 使用缓存包装器
        return await userCacheOps.checkExists(trimmedUsername, async () => {
            console.log('正在检查用户是否存在:', { username: trimmedUsername, email });
            
            // 构建查询条件
            let filterFormula;
            if (email) {
                filterFormula = `OR({username} = "${trimmedUsername}", {email} = "${email}")`;
            } else {
                filterFormula = `{username} = "${trimmedUsername}"`;
            }
            
            const encodedFilter = encodeURIComponent(filterFormula);
            const response = await callVika('GET', 
                `/datasheets/${VIKA_CONFIG.datasheetId}/records?fieldKey=name&filterByFormula=${encodedFilter}&maxRecords=1`,
                null, 3, true
            );
            
            if (!response.success) {
                console.error('检查用户存在性失败:', response.error);
                return null;
            }
            
            const userExists = response.data?.records && response.data.records.length > 0;
            console.log('用户存在性检查结果:', userExists);
            
            return userExists ? response.data.records[0] : null;
        });
        
    } catch (error) {
        console.error('检查用户存在性失败:', error);
        console.error('错误详情:', error.message);
        const e = new Error('检查用户失败');
        e.code = 'VIKA_API_ERROR';
        e.status = error.status || 500;
        e.details = error.details;
        throw e;
    }
}

/**
 * 获取店铺数据
 * @returns {Promise<Array>} 店铺数据数组
 */
async function getShopData() {
    try {
        const endpoint = `/datasheets/${VIKA_CONFIG.shopDatasheetId}/records`;
        const result = await callVika('GET', endpoint, null, 3, true);
        
        if (!result.success || !result.data?.data?.records) {
            console.warn('获取店铺数据失败或数据为空');
            return [];
        }
        
        // 转换维格表数据格式为前端需要的格式
        const shops = result.data.data.records.map(record => {
            const fields = record.fields;
            return {
                id: fields.id || record.recordId,
                name: fields.name || fields['店铺名称'] || '',
                code: fields.code || fields['店铺代码'] || ''
            };
        }).filter(shop => shop.name && shop.code); // 过滤掉无效数据
        
        return shops;
    } catch (error) {
        console.error('获取店铺数据失败:', error);
        // 返回默认店铺数据作为后备
        return [
            { id: '1', name: '主店', code: 'main' },
            { id: '2', name: '分店1', code: 'branch1' },
            { id: '3', name: '分店2', code: 'branch2' }
        ];
    }
}

module.exports = {
    VIKA_CONFIG,
    callVika,
    detectScheduleFieldKeys,
    checkUserExists,
    getShopData
};