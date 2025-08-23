-- 给users表添加updated_at字段来解决触发器问题
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 更新现有记录的updated_at字段
UPDATE public.users SET updated_at = created_at WHERE updated_at IS NULL;

-- 验证字段已添加
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;