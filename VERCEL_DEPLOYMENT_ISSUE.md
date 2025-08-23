# Vercel 部署问题诊断和解决方案

## 问题描述
前端请求 `POST /api/register` 返回 404 错误，实际上是被 Vercel 的身份验证页面拦截。

## 问题分析

### 1. 当前状态
- ✅ `vercel.json` 路由配置已正确设置
- ✅ `users-supabase.js` API 路由匹配逻辑已修复
- ❌ Vercel 项目被 SSO 保护，阻止公开访问
- ❌ 缺少必要的环境变量配置

### 2. 根本原因
Vercel 项目启用了单点登录（SSO）保护，所有请求都被重定向到身份验证页面。

## 解决方案

### 步骤 1: 禁用 Vercel 项目保护
1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 进入项目 `top333`
3. 点击 **Settings** 标签
4. 在左侧菜单中选择 **Security**
5. 找到 **Deployment Protection** 部分
6. 将保护级别设置为 **Disabled** 或 **Only Preview Deployments**
7. 保存设置

### 步骤 2: 配置环境变量
在 Vercel Dashboard 的 **Settings > Environment Variables** 中添加：

```bash
# Supabase 配置
SUPABASE_URL=你的supabase项目URL
SUPABASE_ANON_KEY=你的supabase匿名密钥
SUPABASE_SERVICE_ROLE_KEY=你的supabase服务角色密钥
SUPABASE_JWT_SECRET=你的supabase_jwt密钥

# JWT 配置
JWT_SECRET=你的jwt密钥
```

### 步骤 3: 重新部署
1. 在 Vercel Dashboard 中点击 **Deployments** 标签
2. 点击最新部署旁边的三个点
3. 选择 **Redeploy**
4. 等待部署完成

### 步骤 4: 测试 API
部署完成后，测试以下端点：

```bash
# 测试注册
curl -X POST https://your-vercel-url/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass","email":"test@example.com"}'

# 测试登录
curl -X POST https://your-vercel-url/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'
```

## 技术修复记录

### 已完成的修复
1. **路由配置修复** (`vercel.json`):
   ```json
   {
     "source": "/api/register",
     "destination": "/api/users-supabase"
   }
   ```

2. **API 路由匹配修复** (`api/users-supabase.js`):
   ```javascript
   // 支持多种路径匹配
   if ((pathname === '/api/users' || pathname === '/api/register') && method === 'POST') {
   ```

3. **添加 Token 验证端点**:
   ```javascript
   if (pathname === '/api/users/validate' && method === 'POST') {
   ```

### 预期结果
修复完成后，前端应该能够：
- ✅ 成功注册新用户
- ✅ 用户登录获取 JWT token
- ✅ 验证 token 有效性
- ✅ 检查用户是否存在

## 故障排除

如果问题仍然存在：

1. **检查 Vercel 函数日志**:
   - 在 Vercel Dashboard > Functions 标签中查看实时日志

2. **验证环境变量**:
   ```bash
   curl https://your-vercel-url/api/users-supabase?diag=1
   ```

3. **本地测试**:
   ```bash
   cd backend
   npm start
   # 测试 http://localhost:3001/api/register
   ```

## 联系支持
如果以上步骤无法解决问题，请联系 Vercel 支持或检查 Supabase 项目配置。