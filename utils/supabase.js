// Supabase 配置和客户端
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env.supabase' });

// Supabase 配置
const supabaseUrl = process.env.SUPABASE_URL || 'https://paumgahictuhluhuudws.supabase.co';
// 后端使用 service_role 密钥以绕过 RLS 策略
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhdW1nYWhpY3R1aGx1aHV1ZHdzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkxMTQ3NiwiZXhwIjoyMDcxNDg3NDc2fQ.Y2-T7_oae0udT9WbBFDyLw9Q7ctOUCzxzjv4jU3fSzU';

console.log('强制使用 service_role 密钥进行数据库操作');

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('强制使用 service_role 密钥进行数据库操作');
console.log('Supabase 配置:');
console.log('- URL:', supabaseUrl);
// 解码JWT token来检查角色
try {
  const payload = JSON.parse(Buffer.from(supabaseKey.split('.')[1], 'base64').toString());
  console.log('- 使用密钥类型:', payload.role || 'unknown');
} catch (e) {
  console.log('- 使用密钥类型: 无法解析');
}

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
      // 首先尝试正常更新
      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('username', username)
        .select();
      
      if (error) {
        // 如果是触发器相关的updated_at字段错误，尝试添加updated_at字段
        if (error.message && (error.message.includes('updated_at') || error.code === '42703')) {
          console.log('检测到updated_at字段问题，尝试添加updated_at字段...');
          const updateDataWithTimestamp = {
            ...updateData,
            updated_at: new Date().toISOString()
          };
          
          // 重试更新，这次包含updated_at字段
          const { data: retryData, error: retryError } = await supabase
            .from('users')
            .update(updateDataWithTimestamp)
            .eq('username', username)
            .select();
            
          if (retryError) {
            throw retryError;
          }
          
          if (!retryData || retryData.length === 0) {
            throw new Error('用户不存在或更新失败');
          }
          
          return retryData[0];
        }
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