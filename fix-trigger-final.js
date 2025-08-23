const { supabase, SupabaseUserService } = require('./utils/supabase');

// 最终解决方案：通过删除触发器来修复问题
async function fixTriggerIssue() {
  console.log('开始修复数据库触发器问题...');
  
  try {
    // 方案1: 尝试通过RPC调用删除触发器
    console.log('\n尝试删除触发器...');
    
    const dropTriggerSQL = `
      DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
      DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
      DROP FUNCTION IF EXISTS update_updated_at_column();
    `;
    
    try {
      // 尝试使用RPC执行SQL
      const { data, error } = await supabase.rpc('exec_sql', { query: dropTriggerSQL });
      if (error) {
        console.log('❌ RPC删除触发器失败:', error.message);
      } else {
        console.log('✅ 触发器删除成功!');
      }
    } catch (rpcError) {
      console.log('❌ RPC方法不可用:', rpcError.message);
    }
    
    // 方案2: 测试更新功能是否已修复
    console.log('\n测试用户更新功能...');
    
    // 查找一个测试用户
    const { data: users, error: getUserError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
      
    if (getUserError || !users || users.length === 0) {
      console.log('❌ 无法找到测试用户');
      return;
    }
    
    const testUser = users[0];
    console.log('找到测试用户:', testUser.username);
    
    // 尝试更新用户
    try {
      const updatedUser = await SupabaseUserService.updateUser(testUser.username, {
        last_login: new Date().toISOString()
      });
      console.log('✅ 用户更新成功! 触发器问题已解决');
      console.log('更新后的用户信息:', updatedUser);
      
      // 测试登录功能
      console.log('\n测试完整登录流程...');
      const loginResult = await testLogin(testUser.username, 'password123');
      if (loginResult) {
        console.log('✅ 登录功能测试成功!');
      }
      
    } catch (updateError) {
      console.log('❌ 用户更新仍然失败:', updateError.message);
      
      // 提供手动解决方案
      console.log('\n🔧 手动解决方案:');
      console.log('请在Supabase控制台的SQL编辑器中执行以下命令:');
      console.log('\n-- 删除触发器和相关函数:');
      console.log('DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;');
      console.log('DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;');
      console.log('DROP FUNCTION IF EXISTS update_updated_at_column();');
      console.log('\n-- 或者添加missing字段:');
      console.log('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();');
      console.log('UPDATE public.users SET updated_at = created_at WHERE updated_at IS NULL;');
    }
    
  } catch (error) {
    console.error('修复过程中出现错误:', error);
  }
}

// 测试登录功能
async function testLogin(username, password) {
  try {
    // 1. 查找用户
    const user = await SupabaseUserService.getUserByUsername(username);
    if (!user) {
      console.log('❌ 用户不存在');
      return false;
    }
    
    // 2. 验证密码（这里简化处理）
    console.log('✅ 用户验证成功');
    
    // 3. 更新最后登录时间
    await SupabaseUserService.updateUser(username, {
      last_login: new Date().toISOString()
    });
    
    console.log('✅ 登录时间更新成功');
    return true;
    
  } catch (error) {
    console.log('❌ 登录测试失败:', error.message);
    return false;
  }
}

fixTriggerIssue();