// 使用 service_role 密钥测试真实 Supabase 连接
require('dotenv').config({ path: '.env.supabase' });
const { createClient } = require('@supabase/supabase-js');

// 使用 service_role 密钥创建客户端
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ 缺少必要的环境变量');
    console.log('SUPABASE_URL:', supabaseUrl ? '已配置' : '未配置');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '已配置' : '未配置');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 创建 SupabaseUserService 类（使用 service_role）
class SupabaseUserServiceWithServiceRole {
    // 检查用户是否存在
    static async checkUserExists(username) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id')
                .eq('username', username)
                .single();
            
            if (error && error.code !== 'PGRST116') {
                throw error;
            }
            
            return !!data;
        } catch (error) {
            console.error('检查用户是否存在时出错:', error);
            return false;
        }
    }
    
    // 创建新用户
    static async createUser(userData) {
        try {
            const { data, error } = await supabase
                .from('users')
                .insert([userData])
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
    
    // 根据用户名获取用户
    static async getUserByUsername(username) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('username', username)
                .single();
            
            if (error) {
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
            console.error('更新用户信息时出错:', error);
            throw error;
        }
    }
    
    // 删除用户
    static async deleteUser(username) {
        try {
            const { data, error } = await supabase
                .from('users')
                .delete()
                .eq('username', username)
                .select();
            
            if (error) {
                throw error;
            }
            
            return data[0];
        } catch (error) {
            console.error('删除用户时出错:', error);
            throw error;
        }
    }
}

async function testRealSupabaseWithServiceRole() {
    console.log('🔍 使用 service_role 测试真实Supabase连接...');
    console.log('Project URL:', supabaseUrl);
    console.log('Service Role Key:', supabaseServiceKey ? '已配置' : '未配置');
    
    try {
        // 1. 测试基本连接
        console.log('\n1. 测试基本连接...');
        const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
        if (error) {
            throw error;
        }
        console.log('Supabase 连接成功!');
        console.log('✅ 基本连接成功');
        
        // 2. 检查users表是否存在
        console.log('\n2. 检查users表是否存在...');
        const { data: tableData, error: tableError } = await supabase
            .from('users')
            .select('*')
            .limit(1);
        
        if (tableError) {
            throw new Error(`users表不存在: ${tableError.message}`);
        }
        console.log('✅ users表存在');
        
        // 3. 测试用户操作
        console.log('\n3. 测试用户操作...');
        const testUsername = `test_user_${Date.now()}`;
        
        // 检查用户是否存在
        const userExists = await SupabaseUserServiceWithServiceRole.checkUserExists(testUsername);
        console.log(`用户 ${testUsername} 是否存在:`, userExists);
        
        // 创建测试用户
        console.log('创建测试用户...');
        const newUser = await SupabaseUserServiceWithServiceRole.createUser({
            username: testUsername,
            password: 'test_password_123',
            email: 'test@example.com'
        });
        console.log('✅ 用户创建成功:', newUser.username);
        
        // 获取用户信息
        const user = await SupabaseUserServiceWithServiceRole.getUserByUsername(testUsername);
        console.log('✅ 用户信息获取成功:', user.username);
        
        // 更新用户信息
        const updatedUser = await SupabaseUserServiceWithServiceRole.updateUser(testUsername, {
            email: 'updated@example.com'
        });
        console.log('✅ 用户信息更新成功:', updatedUser.email);
        
        // 删除测试用户
        await SupabaseUserServiceWithServiceRole.deleteUser(testUsername);
        console.log('✅ 测试用户删除成功');
        
        console.log('\n🎉 所有Supabase功能测试通过！');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        if (error.details) {
            console.error('详细信息:', error.details);
        }
        process.exit(1);
    }
}

testRealSupabaseWithServiceRole();