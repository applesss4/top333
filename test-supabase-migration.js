// 测试Supabase迁移后的系统功能
// 此脚本用于验证系统在完全迁移到Supabase后是否正常工作

require('dotenv').config({ path: '.env.supabase' });
const { createClient } = require('@supabase/supabase-js');

// Supabase配置
const supabaseUrl = process.env.SUPABASE_URL || 'https://paumgahictuhluhuudws.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

// 创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseKey);

// 测试连接
async function testConnection() {
  try {
    console.log('测试Supabase连接...');
    
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Supabase连接成功!');
    return true;
  } catch (error) {
    console.error('❌ Supabase连接失败:', error);
    return false;
  }
}

// 测试用户认证
async function testAuthentication() {
  try {
    console.log('测试用户认证...');
    
    // 获取第一个用户
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (userError || !users || users.length === 0) {
      throw new Error('无法获取测试用户');
    }
    
    const testUser = users[0];
    console.log(`使用测试用户: ${testUser.username}`);
    
    // 模拟登录API调用
    const { data: userData, error: authError } = await supabase
      .from('users')
      .select('*')
      .eq('username', testUser.username)
      .single();
    
    if (authError || !userData) {
      throw new Error(`认证失败: ${authError?.message || '未找到用户'}`);
    }
    
    console.log('✅ 用户认证测试成功!');
    return true;
  } catch (error) {
    console.error('❌ 用户认证测试失败:', error);
    return false;
  }
}

// 测试工作日程API
async function testScheduleApi() {
  try {
    console.log('测试工作日程API...');
    
    // 获取日程列表
    const { data: schedules, error: listError } = await supabase
      .from('schedules')
      .select('*')
      .limit(5);
    
    if (listError) {
      throw listError;
    }
    
    console.log(`成功获取 ${schedules.length} 条工作日程`);
    
    // 创建测试日程
    const testSchedule = {
      username: 'test_user',
      work_date: new Date().toISOString().split('T')[0],
      start_time: '09:00',
      end_time: '17:00',
      shop_code: 'TEST001',
      shop_name: '测试店铺'
    };
    
    const { data: newSchedule, error: createError } = await supabase
      .from('schedules')
      .insert(testSchedule)
      .select();
    
    if (createError) {
      throw createError;
    }
    
    console.log('成功创建测试日程:', newSchedule);
    
    // 删除测试日程
    const { error: deleteError } = await supabase
      .from('schedules')
      .delete()
      .eq('id', newSchedule[0].id);
    
    if (deleteError) {
      throw deleteError;
    }
    
    console.log('成功删除测试日程');
    
    console.log('✅ 工作日程API测试成功!');
    return true;
  } catch (error) {
    console.error('❌ 工作日程API测试失败:', error);
    return false;
  }
}

// 测试店铺API
async function testShopsApi() {
  try {
    console.log('测试店铺API...');
    
    // 获取店铺列表
    const { data: shops, error: listError } = await supabase
      .from('shops')
      .select('*')
      .limit(5);
    
    if (listError) {
      throw listError;
    }
    
    console.log(`成功获取 ${shops.length} 条店铺信息`);
    
    // 创建测试店铺
    const testShop = {
      shop_code: `TEST${Date.now()}`,
      shop_name: '测试店铺',
      address: '测试地址',
      contact: '测试联系人'
    };
    
    const { data: newShop, error: createError } = await supabase
      .from('shops')
      .insert(testShop)
      .select();
    
    if (createError) {
      throw createError;
    }
    
    console.log('成功创建测试店铺:', newShop);
    
    // 删除测试店铺
    const { error: deleteError } = await supabase
      .from('shops')
      .delete()
      .eq('id', newShop[0].id);
    
    if (deleteError) {
      throw deleteError;
    }
    
    console.log('成功删除测试店铺');
    
    console.log('✅ 店铺API测试成功!');
    return true;
  } catch (error) {
    console.error('❌ 店铺API测试失败:', error);
    return false;
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('开始Supabase迁移测试...');
  console.log('==================================');
  
  let allTestsPassed = true;
  
  // 测试连接
  const connectionOk = await testConnection();
  allTestsPassed = allTestsPassed && connectionOk;
  console.log('----------------------------------');
  
  // 测试用户认证
  const authOk = await testAuthentication();
  allTestsPassed = allTestsPassed && authOk;
  console.log('----------------------------------');
  
  // 测试工作日程API
  const scheduleOk = await testScheduleApi();
  allTestsPassed = allTestsPassed && scheduleOk;
  console.log('----------------------------------');
  
  // 测试店铺API
  const shopsOk = await testShopsApi();
  allTestsPassed = allTestsPassed && shopsOk;
  console.log('----------------------------------');
  
  console.log('==================================');
  if (allTestsPassed) {
    console.log('✅✅✅ 所有测试通过! Supabase迁移成功! ✅✅✅');
  } else {
    console.log('❌❌❌ 部分测试失败! 请检查上述错误信息! ❌❌❌');
  }
}

// 执行测试
runAllTests();