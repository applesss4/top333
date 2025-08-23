// 使用Supabase REST API创建表
require('dotenv').config({ path: '.env.supabase' });
const { createClient } = require('@supabase/supabase-js');

// Supabase 配置
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('错误: 缺少Supabase配置。请确保.env.supabase文件中包含SUPABASE_URL和SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseKey);

// 创建工作日程记录
async function createScheduleRecord() {
  console.log('创建工作日程记录...');
  
  try {
    const { data, error } = await supabase
      .from('schedules')
      .insert([
        { 
          username: 'test_user', 
          work_store: ['测试店铺1', '测试店铺2'],
          work_date: '2023-10-01',
          start_time: '09:00',
          end_time: '18:00',
          duration: 9,
          notes: '测试记录'
        }
      ]);
    
    if (error) {
      // 如果表不存在，尝试创建表
      if (error.code === 'PGRST205') {
        console.log('工作日程表不存在，尝试创建表...');
        await createSchedulesTable();
        return;
      }
      console.error('❌ 工作日程记录创建失败:', error);
    } else {
      console.log('✅ 工作日程记录创建成功:', data);
    }
  } catch (error) {
    console.error('❌ 工作日程记录创建出错:', error);
  }
}

// 创建店铺记录
async function createShopRecord() {
  console.log('创建店铺记录...');
  
  try {
    const { data, error } = await supabase
      .from('shops')
      .insert([
        { 
          shop_code: 'TEST001',
          shop_name: '测试店铺1',
          address: '测试地址1',
          contact_phone: '12345678901',
          manager: '测试经理',
          status: 'active'
        }
      ]);
    
    if (error) {
      // 如果表不存在，尝试创建表
      if (error.code === 'PGRST205') {
        console.log('店铺表不存在，尝试创建表...');
        await createShopsTable();
        return;
      }
      console.error('❌ 店铺记录创建失败:', error);
    } else {
      console.log('✅ 店铺记录创建成功:', data);
    }
  } catch (error) {
    console.error('❌ 店铺记录创建出错:', error);
  }
}

// 创建工作日程表
async function createSchedulesTable() {
  console.log('创建工作日程表...');
  
  try {
    // 使用REST API创建表
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        name: 'schedules',
        schema: 'public',
        columns: [
          { name: 'id', type: 'uuid', primaryKey: true, defaultValue: 'gen_random_uuid()' },
          { name: 'username', type: 'varchar' },
          { name: 'work_store', type: 'text[]' },
          { name: 'work_date', type: 'date', notNull: true },
          { name: 'start_time', type: 'varchar(10)', notNull: true },
          { name: 'end_time', type: 'varchar(10)', notNull: true },
          { name: 'duration', type: 'numeric' },
          { name: 'notes', type: 'text' },
          { name: 'created_at', type: 'timestamptz', defaultValue: 'NOW()' },
          { name: 'updated_at', type: 'timestamptz', defaultValue: 'NOW()' }
        ]
      })
    });
    
    if (response.ok) {
      console.log('✅ 工作日程表创建成功');
      // 创建一条测试记录
      await createScheduleRecord();
    } else {
      const errorData = await response.json();
      console.error('❌ 工作日程表创建失败:', errorData);
    }
  } catch (error) {
    console.error('❌ 工作日程表创建出错:', error);
  }
}

// 创建店铺信息表
async function createShopsTable() {
  console.log('创建店铺信息表...');
  
  try {
    // 使用REST API创建表
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        name: 'shops',
        schema: 'public',
        columns: [
          { name: 'id', type: 'uuid', primaryKey: true, defaultValue: 'gen_random_uuid()' },
          { name: 'shop_code', type: 'varchar(50)', notNull: true, unique: true },
          { name: 'shop_name', type: 'varchar(100)', notNull: true },
          { name: 'address', type: 'text' },
          { name: 'contact_phone', type: 'varchar(20)' },
          { name: 'manager', type: 'varchar(50)' },
          { name: 'status', type: 'varchar(20)', defaultValue: "'active'" },
          { name: 'created_at', type: 'timestamptz', defaultValue: 'NOW()' },
          { name: 'updated_at', type: 'timestamptz', defaultValue: 'NOW()' }
        ]
      })
    });
    
    if (response.ok) {
      console.log('✅ 店铺信息表创建成功');
      // 创建一条测试记录
      await createShopRecord();
    } else {
      const errorData = await response.json();
      console.error('❌ 店铺信息表创建失败:', errorData);
    }
  } catch (error) {
    console.error('❌ 店铺信息表创建出错:', error);
  }
}

// 创建表结构
async function createTables() {
  console.log('开始创建Supabase表结构...');
  
  try {
    // 先尝试创建记录，如果表不存在会自动创建表
    await createScheduleRecord();
    await createShopRecord();
    console.log('表结构创建完成');
  } catch (error) {
    console.error('创建表结构时出错:', error);
  }
}

// 执行创建表操作
createTables();