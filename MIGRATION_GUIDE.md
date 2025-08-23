# 从维格表迁移到Supabase的指南

本文档提供了将系统从维格表完全迁移到Supabase的步骤指南。

## 目录

1. [数据迁移](#数据迁移)
2. [将本地Supabase数据上传到线上Supabase](#将本地supabase数据上传到线上supabase)
3. [移除维格表相关代码](#移除维格表相关代码)
4. [系统测试](#系统测试)

## 数据迁移

系统已经完成了从维格表到本地Supabase的数据迁移。如果您需要重新执行此步骤，可以使用以下命令：

```bash
node migrate-schedule-shops-data.js
```

## 将本地Supabase数据上传到线上Supabase

### 1. 配置线上Supabase环境

复制`.env.online.example`文件并重命名为`.env.online`，然后填入您的线上Supabase项目信息：

```bash
cp .env.online.example .env.online
```

编辑`.env.online`文件，填入以下信息：

```
# 线上 Supabase 项目 URL
ONLINE_SUPABASE_URL=https://your-online-project.supabase.co

# 线上 Supabase 服务角色密钥（用于数据迁移）
ONLINE_SUPABASE_SERVICE_ROLE_KEY=your-online-service-role-key

# 线上 Supabase 匿名密钥（公开密钥）
ONLINE_SUPABASE_ANON_KEY=your-online-anon-key
```

### 2. 确保线上Supabase数据库结构正确

在线上Supabase项目中执行以下SQL脚本，创建必要的表结构：

```sql
-- 创建工作日程表
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT NOT NULL,
  work_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  shop_code TEXT,
  shop_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建店铺信息表
CREATE TABLE IF NOT EXISTS shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_code TEXT NOT NULL UNIQUE,
  shop_name TEXT NOT NULL,
  address TEXT,
  contact TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. 运行数据上传脚本

执行以下命令，将本地Supabase数据上传到线上Supabase：

```bash
# 加载线上Supabase环境变量
source .env.online

# 运行上传脚本
node upload-to-online-supabase.js
```

## 移除维格表相关代码

系统已经完成了维格表相关代码的移除，主要包括：

1. 更新了`api-config.js`，移除了API切换功能，默认使用Supabase API
2. 更新了`dashboard.js`，移除了维格表配置
3. 将`api-switch.html`页面更新为系统升级通知页面
4. 更新了`dashboard.html`，将侧边栏中的"API切换"链接改为"系统升级通知"

如果您需要进一步清理维格表相关代码，可以考虑删除以下文件：

```bash
# 维格表API文件
rm -f api/schedule.js
rm -f api/shops.js
rm -f api/users.js
rm -f api/auth.js

# 维格表测试和工具文件
rm -f test-vika-connection.js
rm -f backend/utils/vikaApi.js
```

## 系统测试

完成迁移后，请进行以下测试以确保系统正常工作：

1. 启动后端服务器：

```bash
cd backend
npm start
```

2. 启动前端服务器：

```bash
python3 -m http.server 3000
```

3. 访问系统并测试以下功能：
   - 用户登录
   - 查看工作日程
   - 添加/编辑/删除工作日程
   - 查看店铺信息
   - 添加/编辑/删除店铺信息

如果所有功能正常工作，则迁移成功完成！