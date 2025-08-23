require('dotenv').config({ path: '.env.supabase' });
const { supabase } = require('./utils/supabase');
const bcrypt = require('bcryptjs');

async function checkUsersData() {
  try {
    console.log('🔍 检查Supabase中的用户数据...');
    
    // 获取所有用户
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('❌ 查询用户失败:', error);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('⚠️ 数据库中没有用户');
      return;
    }
    
    console.log(`✅ 找到 ${users.length} 个用户:`);
    
    for (const user of users) {
      console.log(`\n👤 用户: ${user.username}`);
      console.log('- ID:', user.id);
      console.log('- 邮箱:', user.email);
      console.log('- 创建时间:', user.created_at);
      console.log('- 最后登录:', user.last_login);
      console.log('- 密码哈希长度:', user.password ? user.password.length : 'null');
      console.log('- 密码开头:', user.password ? user.password.substring(0, 10) + '...' : 'null');
      
      // 测试密码验证
      if (user.password) {
        const testPassword = 'test123456';
        try {
          const isValid = await bcrypt.compare(testPassword, user.password);
          console.log(`- 密码 '${testPassword}' 验证:`, isValid ? '✅ 正确' : '❌ 错误');
        } catch (err) {
          console.log('- 密码验证出错:', err.message);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

checkUsersData();