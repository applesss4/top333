# Supabase 设置指南

本指南将帮助您设置 Supabase 项目并配置数据库。

## 1. 创建 Supabase 项目

1. 访问 [Supabase](https://supabase.com)
2. 点击 "Start your project"
3. 使用 GitHub 账号登录
4. 点击 "New Project"
5. 选择组织（或创建新组织）
6. 填写项目信息：
   - **Name**: `user-management-system`
   - **Database Password**: 设置一个强密码（请记住这个密码）
   - **Region**: 选择离您最近的区域（推荐 Singapore 或 Tokyo）
7. 点击 "Create new project"

## 2. 获取项目配置信息

项目创建完成后：

1. 进入项目仪表板
2. 点击左侧菜单的 "Settings" → "API"
3. 复制以下信息：
   - **Project URL** (类似: `https://xxxxx.supabase.co`)
   - **anon public** key (以 `eyJ` 开头的长字符串)
   - **service_role** key (以 `eyJ` 开头的长字符串，用于服务端)

## 3. 配置环境变量

1. 复制 `.env.supabase` 文件为 `.env`：
   ```bash
   cp .env.supabase .env
   ```

2. 编辑 `.env` 文件，填入您的实际配置：
   ```env
   # Supabase 配置
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   
   # JWT 密钥（可选，用于自定义 JWT）
   JWT_SECRET=your-jwt-secret-key
   ```

## 4. 创建数据库表

1. 在 Supabase 仪表板中，点击左侧菜单的 "SQL Editor"
2. 点击 "New query"
3. 复制 `supabase-schema.sql` 文件的内容
4. 粘贴到 SQL 编辑器中
5. 点击 "Run" 执行 SQL

或者，您也可以使用 Supabase CLI：
```bash
# 安装 Supabase CLI
npm install -g supabase

# 登录
supabase login

# 链接项目
supabase link --project-ref your-project-id

# 运行迁移
supabase db push
```

## 5. 配置行级安全 (RLS)

数据库表创建后，确保行级安全策略已启用：

1. 在 Supabase 仪表板中，点击 "Authentication" → "Policies"
2. 确认以下表的 RLS 已启用：
   - `users`
   - `user_profiles` 
   - `user_sessions`

## 6. 测试连接

运行测试脚本验证配置：
```bash
node test-supabase.js
```

如果一切配置正确，您应该看到：
- ✅ Supabase 连接成功
- ✅ 用户管理功能正常
- ✅ 数据库操作正常

## 7. 常见问题

### 连接失败
- 检查 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY` 是否正确
- 确认项目状态为 "Active"
- 检查网络连接

### 表不存在错误
- 确认已运行 `supabase-schema.sql`
- 检查表名拼写是否正确
- 在 Supabase 仪表板的 "Table Editor" 中确认表已创建

### 权限错误
- 检查 RLS 策略是否正确配置
- 确认使用了正确的 API 密钥
- 对于服务端操作，使用 `service_role` 密钥

## 8. 下一步

配置完成后，您可以：
1. 运行 `node test-supabase.js` 测试功能
2. 更新后端代码使用 Supabase API
3. 测试完整的用户注册和登录流程
4. 部署到生产环境

## 安全提醒

- 🔒 **永远不要**将 `service_role` 密钥暴露在前端代码中
- 🔒 将 `.env` 文件添加到 `.gitignore`
- 🔒 在生产环境中使用强密码和安全的 JWT 密钥
- 🔒 定期轮换 API 密钥