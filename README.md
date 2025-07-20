# Nav-item - 个人导航站

## 📖 项目简介

Nav-item 是一个现代化的个人导航页面系统，提供美观的界面和丰富的功能，帮助用户快速访问常用网站和工具。

## ✨ 功能特性

### 🎯 核心功能
- **导航卡片管理**: 支持添加、编辑、删除导航卡片
- **菜单分类**: 支持多级菜单分类管理
- **用户系统**: 完整的用户注册、登录、权限管理
- **文件上传**: 支持图片上传功能
- **友情链接**: 管理友情链接
- **广告管理**: 支持广告位管理
- **响应式设计**: 适配各种设备屏幕

### 🔧 技术特性
- **前后端分离**: 后端 API + 前端 SPA 架构
- **JWT 认证**: 安全的用户认证机制
- **文件上传**: 支持图片等文件上传
- **数据库**: 使用 SQLite 轻量级数据库
- **现代化 UI**: 美观的用户界面设计

## 🛠️ 技术栈
- **后端: Node.js + Express + SQLite，前端: Vue3 + Vite。**

## 📦 项目结构

```
nav-item/
├── app.js                 # 主应用入口文件
├── config.js             # 配置文件
├── db.js                 # 数据库配置和初始化
├── package.json          # 后端依赖配置
├── routes/               # 后端路由
│   ├── auth.js          # 认证相关路由
│   ├── card.js          # 导航卡片路由
│   ├── menu.js          # 菜单路由
│   ├── upload.js        # 文件上传路由
│   ├── user.js          # 用户管理路由
│   ├── friend.js        # 友情链接路由
│   ├── ad.js            # 广告管理路由
│   └── authMiddleware.js # 认证中间件
├── uploads/              # 上传文件存储目录
├── web/                  # 前端项目目录
│   ├── index.html       # 主页面
│   ├── package.json     # 前端依赖配置
│   ├── vite.config.mjs  # Vite 配置
│   └── src/             # 前端源码
│       ├── main.js      # 前端入口文件
│       ├── App.vue      # 根组件
│       ├── router.js    # 路由配置
│       ├── api.js       # API 接口
│       ├── components/  # 组件目录
│       └── views/       # 页面组件
└── README.md            # 项目说明文档
```

## 🚀 快速开始

### 环境要求
- Node.js >= 14.0.0
- npm 或 yarn 包管理器

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/eooce/nav-item.git
   cd nav-item
   ```

2. **安装后端依赖**
   ```bash
   npm install
   ```

3. **安装前端依赖**
   ```bash
   cd web
   npm install
   ```

4. **配置环境变量**
   创建 `.env` 文件（可选）：
   ```env
   PORT=3000
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=123456
   JWT_SECRET=your-secret-key
   ```

5. **启动开发服务器**
   ```bash
   # 启动后端服务
   npm run dev
   
   # 新开终端，启动前端服务
   cd web
   npm run dev
   ```

6. **访问应用**
   - 后端: http://localhost:3000
   - 后台：http://localhost:3000/admin  默认用户名/密码：admin/123456
   - 前端: http://localhost:5173

## 🔧 配置说明

### 环境变量
- `PORT`: 服务器端口号（默认: 3000）
- `ADMIN_USERNAME`: 管理员用户名（默认: admin）
- `ADMIN_PASSWORD`: 管理员密码（默认: 123456）
- `JWT_SECRET`: JWT 密钥（默认: nav-item-jwt-secret-2024-secure-key）

### 数据库配置
系统使用 SQLite 数据库，数据库文件会自动创建在项目/database/目录下。

## 🚀 部署指南

### 生产环境部署

1. **构建前端**
   ```bash
   cd web
   npm run build
   ```

2. **配置生产环境**
   ```bash
   NODE_ENV=production npm start
   ```

3. **使用 PM2 管理进程**
   ```bash
   npm install -g pm2
   pm2 start app.js --name nav-item
   ```

### Docker 部署

#### 使用 Dockerfile 部署

1. **构建镜像**
   ```bash
   docker build -t nav-item .
   ```

2. **运行容器**
   ```bash
   docker run -d \
     --name nav-item \
     -p 3000:3000 \
     -v $(pwd)/database:/app/database \
     -v $(pwd)/uploads:/app/uploads \
     -e NODE_ENV=production \
     -e ADMIN_USERNAME=admin \
     -e ADMIN_PASSWORD=123456 \
     nav-item
   ```

#### 使用 Docker Compose 部署

1. **启动服务**
   ```bash
   docker-compose up -d
   ```

2. **查看日志**
   ```bash
   docker-compose logs -f
   ```

3. **停止服务**
   ```bash
   docker-compose down
   ```

4. **重新构建并启动**
   ```bash
   docker-compose up -d --build
   ```

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 联系方式

如有问题或建议，请通过以下方式联系：
- GitHub Issues: [项目 Issues](https://github.com/eooce/nav-item/issues)
- TG: [https://t.me/sunuus]
