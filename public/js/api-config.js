// 前端API配置文件
// 使用Supabase API

const ApiConfig = {
    // API路径
    apiPaths: {
        schedule: '/api/schedule-supabase',
        shops: '/api/shops-supabase',
        users: '/api/users-supabase', // 使用Supabase用户API
        auth: '/api/users-supabase'   // 使用Supabase认证API
    },
    
    // 获取API路径
    getApiPath: function(name) {
        return this.apiPaths[name];
    }
};

// 如果在全局环境中，将ApiConfig暴露给window对象
if (typeof window !== 'undefined') {
    window.ApiConfig = ApiConfig;
}

// 如果在Node.js环境中，导出ApiConfig
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiConfig;
}