// 前端性能优化工具模块

// 防抖函数 - 延迟执行，只执行最后一次调用
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// 节流函数 - 限制执行频率
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 简单的前端缓存管理
class FrontendCache {
    constructor(maxSize = 100, ttl = 5 * 60 * 1000) { // 默认5分钟TTL
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttl;
    }

    set(key, value) {
        // 如果缓存已满，删除最旧的条目
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        // 检查是否过期
        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }
        
        return item.value;
    }

    clear() {
        this.cache.clear();
    }

    delete(key) {
        return this.cache.delete(key);
    }

    size() {
        return this.cache.size;
    }
}

// API请求缓存实例
const apiCache = new FrontendCache(50, 2 * 60 * 1000); // 2分钟缓存

// 带缓存的fetch包装器
async function cachedFetch(url, options = {}) {
    const cacheKey = `${url}_${JSON.stringify(options)}`;
    
    // 只缓存GET请求
    if (!options.method || options.method.toUpperCase() === 'GET') {
        const cached = apiCache.get(cacheKey);
        if (cached) {
            // 使用缓存数据
            return Promise.resolve(cached);
        }
    }
    
    try {
        const response = await fetch(url, options);
        const clonedResponse = response.clone();
        
        // 只缓存成功的GET请求
        if (response.ok && (!options.method || options.method.toUpperCase() === 'GET')) {
            apiCache.set(cacheKey, clonedResponse);
        }
        
        return response;
    } catch (error) {
        console.error('API请求失败:', error);
        throw error;
    }
}

// 请求去重管理
class RequestDeduplicator {
    constructor() {
        this.pendingRequests = new Map();
    }

    async request(key, requestFn) {
        // 如果已有相同请求在进行中，返回该请求的Promise
        if (this.pendingRequests.has(key)) {
            // 请求去重处理
            return this.pendingRequests.get(key);
        }

        // 创建新请求
        const promise = requestFn().finally(() => {
            // 请求完成后清除
            this.pendingRequests.delete(key);
        });

        this.pendingRequests.set(key, promise);
        return promise;
    }

    clear() {
        this.pendingRequests.clear();
    }
}

// 全局请求去重器
const requestDeduplicator = new RequestDeduplicator();

// 智能重试机制
async function retryRequest(requestFn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await requestFn();
        } catch (error) {
            lastError = error;
            
            // 最后一次尝试失败，抛出错误
            if (attempt === maxRetries) {
                throw error;
            }
            
            // 某些错误不需要重试
            if (error.status === 400 || error.status === 401 || error.status === 403) {
                throw error;
            }
            
            // 指数退避延迟
            const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
            // 请求失败，准备重试
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError;
}

// 批量请求处理
class BatchProcessor {
    constructor(batchSize = 5, delay = 100) {
        this.batchSize = batchSize;
        this.delay = delay;
        this.queue = [];
        this.processing = false;
    }

    add(request) {
        return new Promise((resolve, reject) => {
            this.queue.push({ request, resolve, reject });
            this.process();
        });
    }

    async process() {
        if (this.processing || this.queue.length === 0) return;
        
        this.processing = true;
        
        while (this.queue.length > 0) {
            const batch = this.queue.splice(0, this.batchSize);
            
            try {
                const promises = batch.map(({ request }) => request());
                const results = await Promise.allSettled(promises);
                
                results.forEach((result, index) => {
                    const { resolve, reject } = batch[index];
                    if (result.status === 'fulfilled') {
                        resolve(result.value);
                    } else {
                        reject(result.reason);
                    }
                });
            } catch (error) {
                batch.forEach(({ reject }) => reject(error));
            }
            
            // 批次间延迟
            if (this.queue.length > 0) {
                await new Promise(resolve => setTimeout(resolve, this.delay));
            }
        }
        
        this.processing = false;
    }
}

// 全局批量处理器
const batchProcessor = new BatchProcessor();

// 性能监控
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            apiCalls: 0,
            cacheHits: 0,
            errors: 0,
            totalResponseTime: 0
        };
    }

    recordApiCall(responseTime) {
        this.metrics.apiCalls++;
        this.metrics.totalResponseTime += responseTime;
    }

    recordCacheHit() {
        this.metrics.cacheHits++;
    }

    recordError() {
        this.metrics.errors++;
    }

    getStats() {
        return {
            ...this.metrics,
            averageResponseTime: this.metrics.apiCalls > 0 
                ? this.metrics.totalResponseTime / this.metrics.apiCalls 
                : 0,
            cacheHitRate: this.metrics.apiCalls > 0 
                ? (this.metrics.cacheHits / this.metrics.apiCalls * 100).toFixed(2) + '%'
                : '0%'
        };
    }

    reset() {
        this.metrics = {
            apiCalls: 0,
            cacheHits: 0,
            errors: 0,
            totalResponseTime: 0
        };
    }
}

// 全局性能监控器
const performanceMonitor = new PerformanceMonitor();

// 导出所有工具
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        debounce,
        throttle,
        FrontendCache,
        apiCache,
        cachedFetch,
        requestDeduplicator,
        retryRequest,
        batchProcessor,
        performanceMonitor
    };
} else {
    // 浏览器环境，添加到全局对象
    window.PerformanceUtils = {
        debounce,
        throttle,
        FrontendCache,
        apiCache,
        cachedFetch,
        requestDeduplicator,
        retryRequest,
        batchProcessor,
        performanceMonitor
    };
}