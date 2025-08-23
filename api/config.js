// API配置文件
// Supabase API配置

// 始终使用Supabase API
const useSupabase = true;

module.exports = {
    useSupabase,
    apiPaths: {
        schedule: '/api/schedule-supabase',
        shops: '/api/shops-supabase',
        users: '/api/users-supabase', // 使用Supabase用户API
        auth: '/api/users-supabase'   // 使用Supabase认证API
    }
};