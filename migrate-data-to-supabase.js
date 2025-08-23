// 数据迁移脚本 - 将本地数据上传到线上Supabase
require('dotenv').config({ path: '.env.supabase' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase配置
const supabaseUrl = process.env.SUPABASE_URL || 'https://paumgahictuhluhuudws.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

// 创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseKey);

// 本地数据文件路径
const DATA_DIR = path.join(__dirname, 'local_data');
const SCHEDULES_FILE = path.join(DATA_DIR, 'schedules.json');
const SHOPS_FILE = path.join(DATA_DIR, 'shops.json');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 从本地文件加载数据
function loadLocalData(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error(`加载本地数据失败 (${filePath}):`, error);
    return [];
  }
}

// 保存数据到本地文件
function saveLocalData(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`数据已保存到 ${filePath}`);
  } catch (error) {
    console.error(`保存本地数据失败 (${filePath}):`, error);
  }
}

// 从模拟服务器导出数据
async function exportDataFromMockServer() {
  try {
    console.log('从模拟服务器导出数据...');
    
    // 这里可以添加从模拟服务器获取数据的逻辑
    // 例如使用fetch或axios调用模拟服务器的API
    
    // 示例：手动创建一些测试数据
    const schedules = [
      {
        username: 'test_user',
        work_store: ['TEST001'],
        work_date: '2023-05-15',
        start_time: '09:00',
        end_time: '17:00',
        duration: 8,
        notes: '测试数据'
      },
      {
        username: 'test_user',
        work_store: ['TEST002'],
        work_date: '2023-05-16',
        start_time: '10:00',
        end_time: '18:00',
        duration: 8,
        notes: '测试数据2'
      }
    ];
    
    const shops = [
      {
        shop_code: 'TEST001',
        shop_name: '测试店铺1',
        address: '测试地址1',
        contact_phone: '12345678901',
        manager: '测试经理1',
        status: 'active'
      },
      {
        shop_code: 'TEST002',
        shop_name: '测试店铺2',
        address: '测试地址2',
        contact_phone: '12345678902',
        manager: '测试经理2',
        status: 'active'
      }
    ];
    
    // 保存到本地文件
    saveLocalData(SCHEDULES_FILE, schedules);
    saveLocalData(SHOPS_FILE, shops);
    
    return { schedules, shops };
  } catch (error) {
    console.error('导出数据失败:', error);
    throw error;
  }
}

// 上传数据到Supabase
async function uploadDataToSupabase(data) {
  try {
    console.log('上传数据到Supabase...');
    
    // 上传工作日程数据
    if (data.schedules && data.schedules.length > 0) {
      console.log(`上传 ${data.schedules.length} 条工作日程数据...`);
      const { data: insertedSchedules, error: schedulesError } = await supabase
        .from('schedules')
        .insert(data.schedules);
      
      if (schedulesError) {
        console.error('上传工作日程数据失败:', schedulesError);
      } else {
        console.log('工作日程数据上传成功!');
      }
    }
    
    // 上传店铺数据
    if (data.shops && data.shops.length > 0) {
      console.log(`上传 ${data.shops.length} 条店铺数据...`);
      const { data: insertedShops, error: shopsError } = await supabase
        .from('shops')
        .insert(data.shops);
      
      if (shopsError) {
        console.error('上传店铺数据失败:', shopsError);
      } else {
        console.log('店铺数据上传成功!');
      }
    }
    
    console.log('数据上传完成!');
  } catch (error) {
    console.error('上传数据失败:', error);
    throw error;
  }
}

// 主函数
async function migrateData() {
  try {
    console.log('开始数据迁移...');
    
    // 检查是否可以连接到Supabase
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    if (error) {
      throw new Error(`无法连接到Supabase: ${error.message}`);
    }
    
    console.log('Supabase连接成功!');
    
    // 1. 从本地文件加载数据（如果存在）
    let schedules = loadLocalData(SCHEDULES_FILE);
    let shops = loadLocalData(SHOPS_FILE);
    
    // 2. 如果本地文件不存在，从模拟服务器导出数据
    if (schedules.length === 0 || shops.length === 0) {
      const exportedData = await exportDataFromMockServer();
      schedules = exportedData.schedules;
      shops = exportedData.shops;
    }
    
    // 3. 上传数据到Supabase
    await uploadDataToSupabase({ schedules, shops });
    
    console.log('数据迁移完成!');
  } catch (error) {
    console.error('数据迁移失败:', error);
  }
}

// 执行迁移
migrateData();