const { Client } = require('pg');
// 从环境变量获取Supabase数据库连接配置
require('dotenv').config({ path: '.env.supabase' });

// 从SUPABASE_URL提取数据库连接信息
const supabaseUrl = process.env.SUPABASE_URL;
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

// 检查是否提供了数据库密码
if (!process.env.SUPABASE_DB_PASSWORD) {
  console.log('❌ 错误: 未找到数据库密码');
  console.log('\n请按以下步骤获取并设置数据库密码:');
  console.log('1. 访问 https://supabase.com/dashboard');
  console.log('2. 选择您的项目');
  console.log('3. 进入 Settings > Database');
  console.log('4. 在 "Connection string" 部分找到密码');
  console.log('5. 在 .env.supabase 文件中添加: SUPABASE_DB_PASSWORD=您的密码');
  console.log('\n或者运行: export SUPABASE_DB_PASSWORD=您的密码');
  process.exit(1);
}

// 尝试直接连接到Supabase数据库（不使用连接池）
const dbConfig = {
  host: `db.${projectRef}.supabase.co`, // 直接连接
  port: 5432,
  database: 'postgres',
  user: 'postgres', // 直接连接使用postgres用户名
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
}

console.log('数据库连接配置:', {
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  user: dbConfig.user,
  ssl: dbConfig.ssl
});

// 构建PostgreSQL连接配置
const client = new Client(dbConfig);

async function fixDatabaseTrigger() {
  try {
    console.log('连接到PostgreSQL数据库...');
    await client.connect();
    console.log('✅ 数据库连接成功');
    
    // 检查当前触发器
    console.log('\n检查现有触发器...');
    const checkTriggersQuery = `
      SELECT trigger_name, event_object_table, action_statement
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public' 
      AND trigger_name LIKE '%updated_at%';
    `;
    
    const triggerResult = await client.query(checkTriggersQuery);
    console.log('现有触发器:', triggerResult.rows);
    
    // 检查users表结构
    console.log('\n检查users表结构...');
    const checkColumnsQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;
    
    const columnsResult = await client.query(checkColumnsQuery);
    console.log('users表字段:', columnsResult.rows);
    
    const hasUpdatedAt = columnsResult.rows.some(row => row.column_name === 'updated_at');
    console.log('是否有updated_at字段:', hasUpdatedAt);
    
    if (!hasUpdatedAt) {
      console.log('\n方案1: 添加updated_at字段...');
      
      // 添加updated_at字段
      const addColumnQuery = `
        ALTER TABLE public.users 
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      `;
      
      await client.query(addColumnQuery);
      console.log('✅ updated_at字段添加成功');
      
      // 更新现有记录
      const updateExistingQuery = `
        UPDATE public.users 
        SET updated_at = created_at 
        WHERE updated_at IS NULL;
      `;
      
      const updateResult = await client.query(updateExistingQuery);
      console.log(`✅ 更新了 ${updateResult.rowCount} 条现有记录`);
      
    } else {
      console.log('\n方案2: 删除有问题的触发器...');
      
      // 删除触发器
      const dropTriggerQuery = `
        DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
        DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
      `;
      
      await client.query(dropTriggerQuery);
      console.log('✅ 触发器删除成功');
      
      // 删除函数
      const dropFunctionQuery = `
        DROP FUNCTION IF EXISTS update_updated_at_column();
      `;
      
      await client.query(dropFunctionQuery);
      console.log('✅ 函数删除成功');
    }
    
    // 测试更新操作
    console.log('\n测试用户更新操作...');
    const testUpdateQuery = `
      UPDATE public.users 
      SET last_login = NOW() 
      WHERE username = (
        SELECT username FROM public.users LIMIT 1
      )
      RETURNING username, last_login;
    `;
    
    const testResult = await client.query(testUpdateQuery);
    if (testResult.rows.length > 0) {
      console.log('✅ 用户更新测试成功:', testResult.rows[0]);
    } else {
      console.log('❌ 没有找到用户进行测试');
    }
    
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
    
    if (error.message.includes('password authentication failed')) {
      console.log('\n请确保在.env.supabase文件中设置了正确的SUPABASE_DB_PASSWORD');
      console.log('你可以在Supabase项目设置 > Database > Connection string中找到密码');
    }
    
  } finally {
    await client.end();
    console.log('\n数据库连接已关闭');
  }
}

fixDatabaseTrigger();