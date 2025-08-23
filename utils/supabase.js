// Supabase 配置和客户端
const { createClient } = require('@supabase/supabase-js');

// Supabase 配置
const supabaseUrl = process.env.SUPABASE_URL || 'https://paumgahictuhluhuudws.supabase.co';
// 后端使用 service_role 密钥以绕过 RLS 策略
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhdW1nYWhpY3R1aGx1aHV1ZHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5MTE0NzYsImV4cCI6MjA3MTQ4NzQ3Nn0.caf1r6TUgDyUFSYf3l-AuYyOAUffTzXfI5HV2rcJR_U';

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Supabase 配置:');
console.log('- URL:', supabaseUrl);
console.log('- 使用密钥类型:', supabaseKey.includes('service_role') ? 'service_role' : 'anon');

// 用户相关操作
class SupabaseUserService {
  // 检查用户是否存在
  static async checkUserExists(username) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }
      
      return !!data;
    } catch (error) {
      console.error('检查用户存在时出错:', error);
      throw error;
    }
  }

  // 创建新用户
  static async createUser(userData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            username: userData.username,
            password: userData.password, // 应该是已加密的密码
            email: userData.email || null,
            created_at: new Date().toISOString()
          }
        ])
        .select();
      
      if (error) {
        throw error;
      }
      
      return data[0];
    } catch (error) {
      console.error('创建用户时出错:', error);
      throw error;
    }
  }

  // 根据用户名获取用户信息
  static async getUserByUsername(username) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('获取用户信息时出错:', error);
      throw error;
    }
  }

  // 更新用户信息
  static async updateUser(username, updateData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('username', username)
        .select();
      
      if (error) {
        throw error;
      }
      
      if (!data || data.length === 0) {
        throw new Error('用户不存在或更新失败');
      }
      
      return data[0];
    } catch (error) {
      console.error('更新用户时出错:', error);
      throw error;
    }
  }

  // 删除用户
  static async deleteUser(username) {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('username', username);
      
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('删除用户时出错:', error);
      throw error;
    }
  }

  // 获取所有用户（分页）
  static async getAllUsers(page = 1, limit = 50) {
    try {
      const offset = (page - 1) * limit;
      
      const { data, error, count } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      return {
        users: data,
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      console.error('获取用户列表时出错:', error);
      throw error;
    }
  }
}

// 测试连接
const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      throw error;
    }
    
    console.log('Supabase 连接成功!');
    return true;
  } catch (error) {
    console.error('Supabase 连接失败:', error);
    return false;
  }
};

module.exports = {
  supabase,
  SupabaseUserService,
  testConnection
};