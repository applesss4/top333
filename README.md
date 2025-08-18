# 用户注册登录系统

一个基于前后端分离架构的用户注册登录系统，支持密码加密和数据持久化。

## 功能特性

- ✅ 用户注册功能
- ✅ 用户登录功能
- ✅ 密码bcrypt加密
- ✅ 前后端分离架构
- ✅ 维格表数据存储
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
- 维格表API (数据存储)

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
在 `backend/.env` 文件中配置维格表API信息：
```
VIKA_API_TOKEN=your_vika_api_token
VIKA_DATASHEET_ID=your_datasheet_id
VIKA_BASE_URL=https://vika.cn/fusion/v1
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

## 维格表配置

1. 访问 [维格表官网](https://vika.cn) 注册账号
2. 创建新的数据表，包含以下字段：
   - `username` (单行文本)
   - `email` (单行文本)
   - `password` (单行文本)
   - `created_at` (单行文本)
3. 获取API Token和数据表ID
4. 在 `.env` 文件中配置相关信息

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