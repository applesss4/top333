# Vercel 部署指南

本项目已经配置为支持 Vercel 无服务器部署，解决了移动端登录注册问题。

## 部署步骤

### 1. 准备维格表

#### 用户数据表字段结构：
- `username` (单行文本) - 用户名
- `email` (单行文本) - 邮箱
- `password` (单行文本) - 加密后的密码
- `created_at` (单行文本) - 创建时间

#### 工作日程数据表字段结构：
- `username` (单行文本) - 用户名
- `workStore` (多选) - 工作门店
- `workDate` (日期) - 工作日期
- `startTime` (单行文本) - 开始时间
- `endTime` (单行文本) - 结束时间
- `duration` (数字) - 工作时长（小时）
- `notes` (多行文本) - 备注
- `createdAt` (单行文本) - 创建时间

### 2. 获取维格表配置

1. 登录 [维格表](https://vika.cn)
2. 创建或打开现有的数据表
3. 获取 API Token：个人中心 -> API Token
4. 获取数据表 ID：打开数据表 -> 地址栏中的 ID

### 3. 部署到 Vercel

#### 方法一：通过 Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录 Vercel
vercel login

# 部署项目
vercel
```

#### 方法二：通过 GitHub 集成

1. 将代码推送到 GitHub 仓库
2. 在 [Vercel](https://vercel.com) 中导入 GitHub 仓库
3. Vercel 会自动检测配置并部署

### 4. 配置环境变量

在 Vercel 项目设置中添加以下环境变量：

| 变量名 | 描述 | 示例值 |
|--------|------|--------|
| `VIKA_API_TOKEN` | 维格表 API Token | `uskXXXXXXXXXXXXXXXX` |
| `VIKA_DATASHEET_ID` | 用户数据表 ID | `dstXXXXXXXXXXXXXX` |
| `VIKA_SCHEDULE_DATASHEET_ID` | 工作日程数据表 ID | `dstXXXXXXXXXXXXXX` |

#### 配置步骤：
1. 进入 Vercel 项目控制台
2. 点击 "Settings" 选项卡
3. 点击 "Environment Variables"
4. 添加上述环境变量
5. 重新部署项目

### 5. 验证部署

部署完成后，访问你的 Vercel 域名：

- 主页：`https://your-project.vercel.app`
- 工作台：`https://your-project.vercel.app/dashboard`
- API 测试：`https://your-project.vercel.app/api/test`

## 技术架构

### 前端
- 静态 HTML/CSS/JavaScript
- 自动检测环境（本地开发 vs 生产环境）
- 动态 API 端点配置

### 后端
- Vercel 无服务器函数
- 维格表作为数据库
- bcryptjs 密码加密

### API 端点
- `/api/test` - 测试维格表连接
- `/api/users` - 用户管理（创建、验证、检查）
- `/api/schedule` - 工作日程管理（增删改查）

## 故障排除

### 移动端登录问题
- ✅ 已修复：API 端点现在支持相对路径
- ✅ 已修复：CORS 配置适配 Vercel 环境

### 常见问题

1. **API 请求失败**
   - 检查环境变量是否正确配置
   - 确认维格表 API Token 有效
   - 验证数据表 ID 正确

2. **数据表字段错误**
   - 确保维格表字段名称与代码中一致
   - 检查字段类型是否匹配

3. **部署失败**
   - 检查 `package.json` 依赖是否完整
   - 确认 `vercel.json` 配置正确

## 本地开发

```bash
# 安装依赖
npm install

# 启动本地服务器（前端）
npm run start

# 启动代理服务器（后端）
npm run dev
```

本地开发时，前端会自动使用 `localhost:3001` 作为 API 端点。
生产环境中，前端会自动使用相对路径 `/api` 调用 Vercel 无服务器函数。