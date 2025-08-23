# Supabase 表结构设置指南

由于我们无法通过API直接创建表结构，需要通过Supabase Studio界面手动创建表。以下是创建必要表的步骤：

## 1. 登录Supabase控制台

1. 访问 [Supabase控制台](https://app.supabase.io)
2. 使用您的账号登录
3. 选择您的项目

## 2. 创建工作日程表(schedules)

1. 在左侧导航栏中，点击 **Table Editor**
2. 点击 **Create a new table** 按钮
3. 输入表名: `schedules`
4. 添加以下列:

| 列名 | 数据类型 | 默认值 | 其他设置 |
|------|---------|-------|----------|
| id | uuid | gen_random_uuid() | 主键 |
| username | varchar | | 可为空 |
| work_store | text[] | | 可为空 |
| work_date | date | | 不可为空 |
| start_time | varchar(10) | | 不可为空 |
| end_time | varchar(10) | | 不可为空 |
| duration | numeric | | 可为空 |
| notes | text | | 可为空 |
| created_at | timestamptz | now() | 可为空 |
| updated_at | timestamptz | now() | 可为空 |

5. 点击 **Save** 按钮创建表

## 3. 创建店铺信息表(shops)

1. 在左侧导航栏中，点击 **Table Editor**
2. 点击 **Create a new table** 按钮
3. 输入表名: `shops`
4. 添加以下列:

| 列名 | 数据类型 | 默认值 | 其他设置 |
|------|---------|-------|----------|
| id | uuid | gen_random_uuid() | 主键 |
| shop_code | varchar(50) | | 不可为空，唯一 |
| shop_name | varchar(100) | | 不可为空 |
| address | text | | 可为空 |
| contact_phone | varchar(20) | | 可为空 |
| manager | varchar(50) | | 可为空 |
| status | varchar(20) | 'active' | 可为空 |
| created_at | timestamptz | now() | 可为空 |
| updated_at | timestamptz | now() | 可为空 |

5. 点击 **Save** 按钮创建表

## 4. 设置行级安全策略(RLS)

### 工作日程表(schedules)的RLS策略

1. 在左侧导航栏中，点击 **Authentication** > **Policies**
2. 找到 `schedules` 表，点击 **New Policy** 按钮
3. 添加以下策略:

   - **策略名称**: Users can view their own schedules
   - **操作**: SELECT
   - **使用表达式**: `username = auth.uid() OR auth.role() = 'admin'`
   - 点击 **Save Policy**

4. 继续添加以下策略:

   - **策略名称**: Users can update their own schedules
   - **操作**: UPDATE
   - **使用表达式**: `username = auth.uid() OR auth.role() = 'admin'`
   - 点击 **Save Policy**

   - **策略名称**: Users can delete their own schedules
   - **操作**: DELETE
   - **使用表达式**: `username = auth.uid() OR auth.role() = 'admin'`
   - 点击 **Save Policy**

   - **策略名称**: Users can insert their own schedules
   - **操作**: INSERT
   - **使用表达式**: `username = auth.uid() OR auth.role() = 'admin'`
   - 点击 **Save Policy**

### 店铺信息表(shops)的RLS策略

1. 在左侧导航栏中，点击 **Authentication** > **Policies**
2. 找到 `shops` 表，点击 **New Policy** 按钮
3. 添加以下策略:

   - **策略名称**: All users can view shops
   - **操作**: SELECT
   - **使用表达式**: `true`
   - 点击 **Save Policy**

4. 继续添加以下策略:

   - **策略名称**: Only admins can update shops
   - **操作**: UPDATE
   - **使用表达式**: `auth.role() = 'admin'`
   - 点击 **Save Policy**

   - **策略名称**: Only admins can delete shops
   - **操作**: DELETE
   - **使用表达式**: `auth.role() = 'admin'`
   - 点击 **Save Policy**

   - **策略名称**: Only admins can insert shops
   - **操作**: INSERT
   - **使用表达式**: `auth.role() = 'admin'`
   - 点击 **Save Policy**

## 5. 创建索引以提高查询性能

在SQL编辑器中执行以下SQL语句:

```sql
-- 为工作日程表创建索引
CREATE INDEX IF NOT EXISTS idx_schedules_username ON public.schedules(username);
CREATE INDEX IF NOT EXISTS idx_schedules_work_date ON public.schedules(work_date);
CREATE INDEX IF NOT EXISTS idx_schedules_created_at ON public.schedules(created_at);

-- 为店铺信息表创建索引
CREATE INDEX IF NOT EXISTS idx_shops_shop_code ON public.shops(shop_code);
CREATE INDEX IF NOT EXISTS idx_shops_shop_name ON public.shops(shop_name);
```

## 6. 添加测试数据

### 添加工作日程测试数据

在SQL编辑器中执行以下SQL语句:

```sql
INSERT INTO public.schedules (username, work_store, work_date, start_time, end_time, duration, notes)
VALUES 
('test_user', ARRAY['测试店铺1', '测试店铺2'], '2023-10-01', '09:00', '18:00', 9, '测试记录');
```

### 添加店铺测试数据

在SQL编辑器中执行以下SQL语句:

```sql
INSERT INTO public.shops (shop_code, shop_name, address, contact_phone, manager, status)
VALUES 
('TEST001', '测试店铺1', '测试地址1', '12345678901', '测试经理', 'active');
```

## 7. 验证表结构

完成上述步骤后，运行测试脚本验证表结构是否正确:

```bash
node test-supabase-migration.js
```

如果测试通过，说明表结构创建成功。