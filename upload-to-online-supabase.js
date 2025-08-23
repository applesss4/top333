// 本地Supabase数据上传到线上Supabase脚本
// 将工作日程表和店铺信息表从本地Supabase迁移到线上Supabase

require('dotenv').config({ path: '.env.supabase' }); // 本地Supabase配置
const { createClient } = require('@supabase/supabase-js');

// 本地Supabase配置
const localSupabaseUrl = process.env.SUPABASE_URL || 'https://paumgahictuhluhuudws.supabase.co';
const localSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

// 线上Supabase配置 - 需要在环境变量中设置
const onlineSupabaseUrl = process.env.ONLINE_SUPABASE_URL;
const onlineSupabaseKey = process.env.ONLINE_SUPABASE_SERVICE_ROLE_KEY;

// 检查线上Supabase配置
if (!onlineSupabaseUrl || !onlineSupabaseKey) {
  console.error('错误: 缺少线上Supabase配置');
  console.error('请设置以下环境变量:');
  console.error('- ONLINE_SUPABASE_URL: 线上Supabase项目URL');
  console.error('- ONLINE_SUPABASE_SERVICE_ROLE_KEY: 线上Supabase服务角色密钥');
  console.error('\n可以通过创建.env.online文件并运行以下命令设置:');
  console.error('export ONLINE_SUPABASE_URL=你的线上项目URL');
  console.error('export ONLINE_SUPABASE_SERVICE_ROLE_KEY=你的线上服务角色密钥');
  process.exit(1);
}

// 创建Supabase客户端
const localSupabase = createClient(localSupabaseUrl, localSupabaseKey);
const onlineSupabase = createClient(onlineSupabaseUrl, onlineSupabaseKey);

console.log('Supabase配置:');
console.log('- 本地URL:', localSupabaseUrl);
console.log('- 线上URL:', onlineSupabaseUrl);

// 从本地Supabase获取所有工作日程数据
async function fetchAllSchedulesFromLocal() {
  try {
    console.log('正在从本地Supabase获取工作日程数据...');
    
    const { data, error, count } = await localSupabase
      .from('schedules')
      .select('*');
    
    if (error) {
      throw error;
    }
    
    console.log(`成功获取 ${data.length} 条工作日程数据`);
    return data;
  } catch (error) {
    console.error('获取工作日程数据时出错:', error);
    throw error;
  }
}

// 从本地Supabase获取所有店铺数据
async function fetchAllShopsFromLocal() {
  try {
    console.log('正在从本地Supabase获取店铺数据...');
    
    const { data, error } = await localSupabase
      .from('shops')
      .select('*');
    
    if (error) {
      throw error;
    }
    
    console.log(`成功获取 ${data.length} 条店铺数据`);
    return data;
  } catch (error) {
    console.error('获取店铺数据时出错:', error);
    throw error;
  }
}

// 从本地Supabase获取所有用户数据
async function fetchAllUsersFromLocal() {
  try {
    console.log('正在从本地Supabase获取用户数据...');
    
    const { data, error } = await localSupabase
      .from('users')
      .select('*');
    
    if (error) {
      throw error;
    }
    
    console.log(`成功获取 ${data.length} 条用户数据`);
    return data;
  } catch (error) {
    console.error('获取用户数据时出错:', error);
    throw error;
  }
}

// 将工作日程数据上传到线上Supabase
async function uploadSchedulesToOnline(schedules) {
  try {
    console.log('正在将工作日程数据上传到线上Supabase...');
    
    // 过滤掉无效数据
    const validSchedules = schedules.filter(schedule => 
      schedule.username && schedule.work_date && schedule.start_time && schedule.end_time
    );
    
    if (validSchedules.length === 0) {
      console.log('没有有效的工作日程数据需要上传');
      return;
    }
    
    // 批量插入数据
    const { data, error } = await onlineSupabase
      .from('schedules')
      .insert(validSchedules);
    
    if (error) {
      throw error;
    }
    
    console.log(`成功上传 ${validSchedules.length} 条工作日程数据到线上Supabase`);
  } catch (error) {
    console.error('上传工作日程数据到线上Supabase时出错:', error);
    throw error;
  }
}

// 将店铺数据上传到线上Supabase
async function uploadShopsToOnline(shops) {
  try {
    console.log('正在将店铺数据上传到线上Supabase...');
    
    // 过滤掉无效数据
    const validShops = shops.filter(shop => shop.shop_code && shop.shop_name);
    
    if (validShops.length === 0) {
      console.log('没有有效的店铺数据需要上传');
      return;
    }
    
    // 批量插入数据
    const { data, error } = await onlineSupabase
      .from('shops')
      .insert(validShops);
    
    if (error) {
      throw error;
    }
    
    console.log(`成功上传 ${validShops.length} 条店铺数据到线上Supabase`);
  } catch (error) {
    console.error('上传店铺数据到线上Supabase时出错:', error);
    throw error;
  }
}

// 将用户数据上传到线上Supabase
async function uploadUsersToOnline(users) {
  try {
    console.log('正在将用户数据上传到线上Supabase...');
    
    // 过滤掉无效数据
    const validUsers = users.filter(user => user.username && user.password_hash);
    
    if (validUsers.length === 0) {
      console.log('没有有效的用户数据需要上传');
      return;
    }
    
    // 批量插入数据
    const { data, error } = await onlineSupabase
      .from('users')
      .insert(validUsers);
    
    if (error) {
      throw error;
    }
    
    console.log(`成功上传 ${validUsers.length} 条用户数据到线上Supabase`);
  } catch (error) {
    console.error('上传用户数据到线上Supabase时出错:', error);
    throw error;
  }
}

// 主函数
async function uploadData() {
  try {
    console.log('开始数据上传...');
    
    // 测试连接
    console.log('测试本地Supabase连接...');
    const { data: localTest, error: localError } = await localSupabase.from('users').select('count', { count: 'exact', head: true });
    if (localError) {
      throw new Error(`本地Supabase连接失败: ${localError.message}`);
    }
    console.log('本地Supabase连接成功!');
    
    console.log('测试线上Supabase连接...');
    const { data: onlineTest, error: onlineError } = await onlineSupabase.from('users').select('count', { count: 'exact', head: true });
    if (onlineError) {
      throw new Error(`线上Supabase连接失败: ${onlineError.message}`);
    }
    console.log('线上Supabase连接成功!');
    
    // 获取本地数据
    const schedules = await fetchAllSchedulesFromLocal();
    const shops = await fetchAllShopsFromLocal();
    const users = await fetchAllUsersFromLocal();
    
    // 上传数据到线上Supabase
    await uploadShopsToOnline(shops);
    await uploadUsersToOnline(users);
    await uploadSchedulesToOnline(schedules);
    
    console.log('数据上传完成！');
  } catch (error) {
    console.error('数据上传失败:', error);
    process.exit(1);
  }
}

// 执行上传
uploadData();