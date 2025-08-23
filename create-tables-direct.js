// 直接使用Supabase客户端创建表
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

// 创建工作日程表
async function createSchedulesTable() {
  console.log('创建工作日程表...');
  
  try {
    // 使用SQL创建表
    const { data, error } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.schedules (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          username VARCHAR(50) REFERENCES public.users(username) ON DELETE SET NULL,
          work_store TEXT[], 
          work_date DATE NOT NULL,
          start_time VARCHAR(10) NOT NULL,
          end_time VARCHAR(10) NOT NULL,
          duration NUMERIC,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_schedules_username ON public.schedules(username);
        CREATE INDEX IF NOT EXISTS idx_schedules_work_date ON public.schedules(work_date);
        CREATE INDEX IF NOT EXISTS idx_schedules_created_at ON public.schedules(created_at);
        
        ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can view their own schedules" ON public.schedules;
        CREATE POLICY "Users can view their own schedules" 
            ON public.schedules FOR SELECT 
            USING (username = auth.uid() OR auth.role() = 'admin');
        
        DROP POLICY IF EXISTS "Users can update their own schedules" ON public.schedules;
        CREATE POLICY "Users can update their own schedules" 
            ON public.schedules FOR UPDATE 
            USING (username = auth.uid() OR auth.role() = 'admin');
        
        DROP POLICY IF EXISTS "Users can delete their own schedules" ON public.schedules;
        CREATE POLICY "Users can delete their own schedules" 
            ON public.schedules FOR DELETE 
            USING (username = auth.uid() OR auth.role() = 'admin');
        
        DROP POLICY IF EXISTS "Users can insert their own schedules" ON public.schedules;
        CREATE POLICY "Users can insert their own schedules" 
            ON public.schedules FOR INSERT 
            WITH CHECK (username = auth.uid() OR auth.role() = 'admin');
      `
    });
    
    if (error) {
      console.error('❌ 工作日程表创建失败:', error);
    } else {
      console.log('✅ 工作日程表创建成功');
    }
  } catch (error) {
    console.error('❌ 工作日程表创建出错:', error);
  }
}

// 创建店铺信息表
async function createShopsTable() {
  console.log('创建店铺信息表...');
  
  try {
    // 使用SQL创建表
    const { data, error } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.shops (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          shop_code VARCHAR(50) UNIQUE NOT NULL,
          shop_name VARCHAR(100) NOT NULL,
          address TEXT,
          contact_phone VARCHAR(20),
          manager VARCHAR(50),
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_shops_shop_code ON public.shops(shop_code);
        CREATE INDEX IF NOT EXISTS idx_shops_shop_name ON public.shops(shop_name);
        
        ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "All users can view shops" ON public.shops;
        CREATE POLICY "All users can view shops" 
            ON public.shops FOR SELECT 
            USING (true);
        
        DROP POLICY IF EXISTS "Only admins can update shops" ON public.shops;
        CREATE POLICY "Only admins can update shops" 
            ON public.shops FOR UPDATE 
            USING (auth.role() = 'admin');
        
        DROP POLICY IF EXISTS "Only admins can delete shops" ON public.shops;
        CREATE POLICY "Only admins can delete shops" 
            ON public.shops FOR DELETE 
            USING (auth.role() = 'admin');
        
        DROP POLICY IF EXISTS "Only admins can insert shops" ON public.shops;
        CREATE POLICY "Only admins can insert shops" 
            ON public.shops FOR INSERT 
            WITH CHECK (auth.role() = 'admin');
      `
    });
    
    if (error) {
      console.error('❌ 店铺信息表创建失败:', error);
    } else {
      console.log('✅ 店铺信息表创建成功');
    }
  } catch (error) {
    console.error('❌ 店铺信息表创建出错:', error);
  }
}

// 创建表结构
async function createTables() {
  console.log('开始创建Supabase表结构...');
  
  try {
    await createSchedulesTable();
    await createShopsTable();
    console.log('表结构创建完成');
  } catch (error) {
    console.error('创建表结构时出错:', error);
  }
}

// 执行创建表操作
createTables();