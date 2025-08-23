// 测试真实Supabase连接
require('dotenv').config({ path: '.env.supabase' });
const { supabase, SupabaseUserService, testConnection } = require('./utils/supabase');

async function testRealSupabase() {
    console.log('🔍 测试真实Supabase连接...');
    console.log('Project URL:', process.env.SUPABASE_URL);
    console.log('Anon Key:', process.env.SUPABASE_ANON_KEY ? '已配置' : '未配置');
    
    try {
        // 1. 测试基本连接
        console.log('\n1. 测试基本连接...');
        await testConnection();
        console.log('✅ 基本连接成功');
        
        // 2. 测试数据库表是否存在
        console.log('\n2. 检查users表是否存在...');
        const { data: tables, error: tableError } = await supabase
            .from('users')
            .select('*')
            .limit(1);
            
        if (tableError) {
            if (tableError.code === '42P01') {
                console.log('❌ users表不存在，需要创建数据库表');
                console.log('请在Supabase控制台执行supabase-schema.sql中的SQL语句');
                return;
            } else {
                throw tableError;
            }
        }
        console.log('✅ users表存在');
        
        // 3. 测试用户操作
        console.log('\n3. 测试用户操作...');
        const testUsername = 'test_user_' + Date.now();
        
        // 检查用户是否存在
        const userExists = await SupabaseUserService.checkUserExists(testUsername);
        console.log(`用户 ${testUsername} 是否存在:`, userExists);
        
        // 创建测试用户
        console.log('创建测试用户...');
        const newUser = await SupabaseUserService.createUser({
            username: testUsername,
            password: 'hashed_password_123',
            email: 'test@example.com'
        });
        console.log('✅ 用户创建成功:', newUser.username);
        
        // 获取用户信息
        const user = await SupabaseUserService.getUserByUsername(testUsername);
        console.log('✅ 用户信息获取成功:', user.username);
        
        // 更新用户信息
        const updatedUser = await SupabaseUserService.updateUser(testUsername, {
            email: 'updated@example.com'
        });
        console.log('✅ 用户信息更新成功:', updatedUser.email);
        
        // 删除测试用户
        await SupabaseUserService.deleteUser(testUsername);
        console.log('✅ 测试用户删除成功');
        
        console.log('\n🎉 所有Supabase功能测试通过！');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        if (error.details) {
            console.error('详细信息:', error.details);
        }
        if (error.hint) {
            console.error('提示:', error.hint);
        }
        process.exit(1);
    }
}

// 运行测试
testRealSupabase();