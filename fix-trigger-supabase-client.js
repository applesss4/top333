const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.supabase' });

// 使用Supabase客户端连接
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixTriggerIssue() {
  console.log('开始修复数据库触发器问题...');
  
  try {
    // 方案1: 尝试添加 updated_at 字段到 users 表
    console.log('\n方案1: 尝试添加 updated_at 字段...');
    
    // 使用 RPC 调用执行 SQL（如果有权限）
    const { data: addColumnResult, error: addColumnError } = await supabase.rpc('exec_sql', {
      query: 'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();'
    });
    
    if (addColumnError) {
      console.log('❌ 添加字段失败:', addColumnError.message);
      console.log('\n方案2: 尝试通过Supabase客户端测试更新...');
      
      // 测试更新一个用户来触发错误
      const { data: users, error: fetchError } = await supabase
        .from('users')
        .select('id, username')
        .limit(1);
        
      if (fetchError) {
        console.log('❌ 获取用户失败:', fetchError.message);
        return;
      }
      
      if (users && users.length > 0) {
        const testUser = users[0];
        console.log(`测试更新用户: ${testUser.username}`);
        
        const { data: updateResult, error: updateError } = await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', testUser.id)
          .select();
          
        if (updateError) {
          console.log('❌ 更新失败:', updateError.message);
          console.log('\n🔧 解决方案:');
          console.log('需要在Supabase控制台手动执行以下操作之一:');
          console.log('\n选项A - 添加 updated_at 字段:');
          console.log('ALTER TABLE public.users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();');
          console.log('UPDATE public.users SET updated_at = NOW() WHERE updated_at IS NULL;');
          console.log('\n选项B - 删除触发器:');
          console.log('DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;');
          console.log('DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;');
          console.log('DROP FUNCTION IF EXISTS update_updated_at_column();');
        } else {
          console.log('✅ 用户更新成功！触发器问题已解决。');
          console.log('更新结果:', updateResult);
        }
      } else {
        console.log('❌ 没有找到用户进行测试');
      }
    } else {
      console.log('✅ 成功添加 updated_at 字段');
      
      // 更新现有记录
      const { error: updateExistingError } = await supabase.rpc('exec_sql', {
        query: 'UPDATE public.users SET updated_at = NOW() WHERE updated_at IS NULL;'
      });
      
      if (updateExistingError) {
        console.log('⚠️ 更新现有记录失败:', updateExistingError.message);
      } else {
        console.log('✅ 现有记录已更新');
      }
      
      // 测试更新功能
      console.log('\n测试更新功能...');
      const { data: users, error: fetchError } = await supabase
        .from('users')
        .select('id, username')
        .limit(1);
        
      if (!fetchError && users && users.length > 0) {
        const testUser = users[0];
        const { data: updateResult, error: updateError } = await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', testUser.id)
          .select();
          
        if (updateError) {
          console.log('❌ 测试更新失败:', updateError.message);
        } else {
          console.log('✅ 测试更新成功！问题已解决。');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
    console.log('\n🔧 手动解决方案:');
    console.log('请在Supabase控制台的SQL编辑器中执行以下SQL:');
    console.log('\n-- 选项A: 添加 updated_at 字段');
    console.log('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();');
    console.log('UPDATE public.users SET updated_at = NOW() WHERE updated_at IS NULL;');
    console.log('\n-- 或选项B: 删除触发器');
    console.log('DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;');
    console.log('DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;');
    console.log('DROP FUNCTION IF EXISTS update_updated_at_column();');
  }
}

// 运行修复函数
fixTriggerIssue().then(() => {
  console.log('\n修复操作完成。');
}).catch(error => {
  console.error('修复操作失败:', error);
});