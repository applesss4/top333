# Vercel 环境变量配置指南

## 问题描述
当前 API 接口返回 500 内部服务器错误，这是因为 Vercel 部署缺少必要的环境变量配置。

## 解决方案

### 1. 登录 Vercel 控制台
访问 [Vercel Dashboard](https://vercel.com/dashboard) 并登录您的账户。

### 2. 找到您的项目
在项目列表中找到 `top333` 项目并点击进入。

### 3. 配置环境变量
1. 点击项目页面顶部的 **Settings** 标签
2. 在左侧菜单中选择 **Environment Variables**
3. 添加以下环境变量：

#### 必需的 Supabase 环境变量：
```
SUPABASE_URL=https://paumgahictuhluhuudws.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhdW1nYWhpY3R1aGx1aHV1ZHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5MTE0NzYsImV4cCI6MjA3MTQ4NzQ3Nn0.caf1r6TUgDyUFSYf3l-AuYyOAUffTzXfI5HV2rcJR_U
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhdW1nYWhpY3R1aGx1aHV1ZHdzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkxMTQ3NiwiZXhwIjoyMDcxNDg3NDc2fQ.Y2-T7_oae0udT9WbBFDyLw9Q7ctOUCzxzjv4jU3fSzU
SUPABASE_JWT_SECRET=demo-jwt-secret
JWT_SECRET=your-jwt-secret-key
```

### 4. 重新部署
配置完环境变量后，Vercel 会自动触发重新部署。您也可以手动触发：
1. 在项目页面点击 **Deployments** 标签
2. 点击最新部署右侧的三个点菜单
3. 选择 **Redeploy**

### 5. 测试 API
部署完成后，测试以下端点：
- `GET https://top333-5phxqd5up-datuhao888s-projects.vercel.app/api/users-supabase`
- `POST https://top333-5phxqd5up-datuhao888s-projects.vercel.app/api/register`

## 当前路由配置

已更新 `vercel.json` 配置，所有用户相关 API 路由现在指向 Supabase 版本：
- `/api/register` → `/api/users-supabase`
- `/api/login` → `/api/users-supabase`
- `/api/users/validate` → `/api/users-supabase`
- `/api/users/check/*` → `/api/users-supabase`

## 注意事项

1. **安全性**：确保不要在公开代码中暴露真实的 API 密钥
2. **环境隔离**：生产环境应使用不同的 Supabase 项目和密钥
3. **监控**：配置完成后监控 API 响应和错误日志

## 故障排除

如果配置后仍有问题：
1. 检查 Vercel 部署日志中的错误信息
2. 确认 Supabase 项目状态正常
3. 验证环境变量值是否正确复制
4. 检查 Supabase 数据库表是否已创建

## 联系支持

如需进一步帮助，请提供：
- Vercel 部署日志
- 具体的错误信息
- API 请求和响应详情