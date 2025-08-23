const { supabase, SupabaseUserService } = require('./utils/supabase');

async function testLoginAfterFix() {
    try {
        console.log('测试登录功能是否已修复...');
        
        // 首先尝试更新一个用户来测试触发器是否还有问题
        console.log('\n1. 测试用户更新功能...');
        const { data: users, error: selectError } = await supabase
            .from('users')
            .select('*')
            .limit(1);
            
        if (selectError) {
            console.error('查询用户错误:', selectError);
            return;
        }
        
        if (!users || users.length === 0) {
            console.log('没有找到用户');
            return;
        }
        
        const user = users[0];
        console.log('找到用户:', user.username);
        
        // 尝试更新用户的last_login字段
        console.log('尝试更新last_login字段...');
        try {
            const updateData = await SupabaseUserService.updateUser(user.username, {
                last_login: new Date().toISOString()
            });
            console.log('✅ 用户更新成功!', updateData);
        } catch (updateError) {
            console.error('更新用户仍然失败:', updateError);
            console.log('\n解决方案：需要在Supabase控制台的SQL编辑器中执行以下命令:');
            console.log('-- 方案1: 添加updated_at字段');
            console.log('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();');
            console.log('UPDATE public.users SET updated_at = created_at WHERE updated_at IS NULL;');
            console.log('\n-- 方案2: 删除触发器');
            console.log('DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;');
            console.log('DROP FUNCTION IF EXISTS update_updated_at_column();');
            return;
        }
        
        // 测试登录功能
        console.log('\n2. 测试登录功能...');
        
        // 使用testuser4进行登录测试
        const loginData = {
            username: 'testuser4',
            password: 'password123'
        };
        
        console.log('尝试登录用户:', loginData.username);
        
        // 模拟登录过程
        const { data: loginUser, error: loginError } = await supabase
            .from('users')
            .select('*')
            .eq('username', loginData.username)
            .single();
            
        if (loginError) {
            console.error('查找登录用户失败:', loginError);
            return;
        }
        
        console.log('找到登录用户:', loginUser.username);
        
        // 验证密码（这里简化处理，实际应该使用bcrypt）
        const bcrypt = require('bcrypt');
        const passwordMatch = await bcrypt.compare(loginData.password, loginUser.password);
        
        if (!passwordMatch) {
            console.log('❌ 密码验证失败');
            return;
        }
        
        console.log('✅ 密码验证成功');
        
        // 更新last_login（这是之前失败的操作）
        const { data: loginUpdateData, error: loginUpdateError } = await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('username', loginData.username)
            .select();
            
        if (loginUpdateError) {
            console.error('❌ 更新last_login失败:', loginUpdateError);
        } else {
            console.log('✅ 登录成功，last_login已更新!', loginUpdateData);
        }
        
    } catch (error) {
        console.error('测试时出错:', error);
    }
}

testLoginAfterFix();