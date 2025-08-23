-- Supabase 工作日程表和店铺信息表结构设置脚本
-- 请在 Supabase 控制台的 SQL 编辑器中执行此脚本

-- 创建工作日程表
CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(50) REFERENCES public.users(username) ON DELETE SET NULL,
    work_store TEXT[], -- 工作店铺（数组类型，可以存储多个店铺）
    work_date DATE NOT NULL, -- 工作日期
    start_time VARCHAR(10) NOT NULL, -- 开始时间
    end_time VARCHAR(10) NOT NULL, -- 结束时间
    duration NUMERIC, -- 工作时长
    notes TEXT, -- 备注
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建店铺信息表
CREATE TABLE IF NOT EXISTS public.shops (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_code VARCHAR(50) UNIQUE NOT NULL, -- 店铺代码
    shop_name VARCHAR(100) NOT NULL, -- 店铺名称
    address TEXT, -- 店铺地址
    contact_phone VARCHAR(20), -- 联系电话
    manager VARCHAR(50), -- 店长
    status VARCHAR(20) DEFAULT 'active', -- 状态：active, inactive
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_schedules_username ON public.schedules(username);
CREATE INDEX IF NOT EXISTS idx_schedules_work_date ON public.schedules(work_date);
CREATE INDEX IF NOT EXISTS idx_schedules_created_at ON public.schedules(created_at);
CREATE INDEX IF NOT EXISTS idx_shops_shop_code ON public.shops(shop_code);
CREATE INDEX IF NOT EXISTS idx_shops_shop_name ON public.shops(shop_name);

-- 添加RLS策略（行级安全）
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

-- 创建策略：用户只能查看自己的工作日程
CREATE POLICY "Users can view their own schedules" 
    ON public.schedules FOR SELECT 
    USING (username = auth.uid() OR auth.role() = 'admin');

-- 创建策略：用户只能修改自己的工作日程
CREATE POLICY "Users can update their own schedules" 
    ON public.schedules FOR UPDATE 
    USING (username = auth.uid() OR auth.role() = 'admin');

-- 创建策略：用户只能删除自己的工作日程
CREATE POLICY "Users can delete their own schedules" 
    ON public.schedules FOR DELETE 
    USING (username = auth.uid() OR auth.role() = 'admin');

-- 创建策略：用户只能插入自己的工作日程
CREATE POLICY "Users can insert their own schedules" 
    ON public.schedules FOR INSERT 
    WITH CHECK (username = auth.uid() OR auth.role() = 'admin');

-- 创建策略：所有用户可以查看店铺信息
CREATE POLICY "All users can view shops" 
    ON public.shops FOR SELECT 
    USING (true);

-- 创建策略：只有管理员可以修改店铺信息
CREATE POLICY "Only admins can update shops" 
    ON public.shops FOR UPDATE 
    USING (auth.role() = 'admin');

-- 创建策略：只有管理员可以删除店铺信息
CREATE POLICY "Only admins can delete shops" 
    ON public.shops FOR DELETE 
    USING (auth.role() = 'admin');

-- 创建策略：只有管理员可以插入店铺信息
CREATE POLICY "Only admins can insert shops" 
    ON public.shops FOR INSERT 
    WITH CHECK (auth.role() = 'admin');