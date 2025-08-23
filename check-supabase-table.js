require('dotenv').config({ path: '.env.supabase' });
const { supabase } = require('./utils/supabase');

async function checkTableStructure() {
  try {
    console.log('🔍 检查Supabase users表结构...');
    
    // 尝试获取表的列信息
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ 查询表结构失败:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ 表结构 (基于现有数据):');
      console.log('列名:', Object.keys(data[0]));
    } else {
      console.log('⚠️ 表为空，无法从数据推断结构');
    }
    
    // 尝试直接查询last_login_at列
    console.log('\n🧪 测试last_login_at列是否存在...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('username, last_login_at')
      .limit(1);
    
    if (testError) {
      console.error('❌ last_login_at列不存在:', testError.message);
      console.log('\n📝 需要添加last_login_at列到users表');
      console.log('SQL命令:');
      console.log('ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE;');
    } else {
      console.log('✅ last_login_at列存在');
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

checkTableStructure();