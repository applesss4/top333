# 工作日程管理系统

一个基于前后端分离架构的工作日程管理系统，支持用户认证、日程管理和店铺管理功能。

## 功能特性

- ✅ 用户注册与登录功能
- ✅ 密码bcrypt加密
- ✅ 前后端分离架构
- ✅ Supabase数据存储
- ✅ 工作日程管理
- ✅ 店铺信息管理
- ✅ 响应式UI设计
- ✅ 表单验证
- ✅ 用户反馈消息

## 技术栈

### 前端
- HTML5
- CSS3
- JavaScript (ES6+)
- bcrypt.js (密码加密)

### 后端
- Node.js
- Express.js
- bcrypt (密码加密)
- Supabase (数据存储)
- JWT (用户认证)

## 项目结构

```
├── backend/              # 后端服务
│   ├── server.js        # Express服务器
│   ├── package.json     # 后端依赖
│   └── .env            # 环境变量配置
├── index.html          # 主页面
├── script.js           # 前端JavaScript
├── styles.css          # 样式文件
└── README.md           # 项目说明
```

## 安装和运行

### 1. 克隆项目
```bash
git clone <repository-url>
cd ab
```

### 2. 安装后端依赖
```bash
cd backend
npm install
```

### 3. 配置环境变量
在 `backend/.env` 文件中配置Supabase信息：
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=your_jwt_secret
PORT=3000
```

### 4. 启动后端服务
```bash
cd backend
npm start
```

### 5. 启动前端服务
在项目根目录启动HTTP服务器：
```bash
python3 -m http.server 8000
```

### 6. 访问应用
打开浏览器访问：`http://localhost:8000`

## Supabase配置

1. 访问 [Supabase官网](https://supabase.com) 注册账号
2. 创建新项目，并设置以下数据表：
   - `users` (用户信息)
   - `schedules` (工作日程)
   - `shops` (店铺信息)
3. 获取项目URL和API密钥
4. 在 `.env` 文件中配置相关信息

## 数据迁移

如果您需要将本地Supabase数据迁移到线上环境，请参考以下步骤：

1. 配置 `.env.online` 文件，设置线上Supabase信息
2. 运行数据迁移脚本：
```bash
node upload-to-online-supabase.js
```
3. 验证数据迁移是否成功：
```bash
node test-supabase-migration.js
```

## API接口

### 用户注册
- **URL**: `POST /api/register`
- **参数**: `{ username, email, password }`
- **返回**: `{ success: boolean, message: string, user?: object }`

### 用户登录
- **URL**: `POST /api/login`
- **参数**: `{ username, password }`
- **返回**: `{ success: boolean, message: string, user?: object }`

## 安全特性

- 密码使用bcrypt进行加密存储
- 前后端分离，API密钥不暴露给前端
- 表单验证防止恶意输入
- 环境变量管理敏感配置

## 开发说明

- 前端使用原生JavaScript，无框架依赖
- 后端使用Express.js提供RESTful API
- 数据存储使用维格表云服务
- 支持本地存储作为备用方案

## 许可证

MIT License