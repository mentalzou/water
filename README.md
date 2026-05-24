# 💧 好水到家 - 卖水管理系统

一个完整的卖水 H5 管理系统，支持消费者购买、分销商推广返佣、派送员自动配送。

## 🚀 快速开始

### 环境要求
- Node.js >= 18
- npm >= 9

### 安装依赖

```bash
# 安装所有依赖（根目录 + 前端 + 后端）
npm install
cd client && npm install
cd ../server && npm install
```

### 启动开发服务器

```bash
# 方式1：同时启动前后端（推荐）
npm run dev

# 方式2：分别启动
npm run dev:client  # 前端 http://localhost:5173
npm run dev:server  # 后端 http://localhost:3001
```

## 📱 功能模块

| 角色 | 入口 | 功能 |
|------|------|------|
| **消费者** | `http://localhost:5173/` | 下单购买、查看订单 |
| **分销商** | `http://localhost:5173/distributor` | 仪表盘、充值、推广分享、佣金明细 |
| **派送员** | `http://localhost:5173/deliveryman` | 登录接单、配送管理、导航 |
| **管理员** | `http://localhost:5173/admin/login` | 全部管理功能 |

### 消费者端流程
1. 打开 H5 页面，选择商品
2. 输入手机号、收货地址、数量
3. 点击"立即购买"完成支付（开发模式自动模拟）
4. 可通过分销商链接进入，自动绑定返佣关系

### 分销商端功能
- 查看佣金统计（累计/可提现/冻结）
- 生成专属推广链接
- 分享链接给好友获取返佣
- 充值/购买水

### 派送员端功能
- 手机号登录
- 查看待配送/配送中/已完成任务
- 接单、开始配送、确认送达
- 导航到收货地址

### 管理后台功能
- 📊 数据仪表盘（销售额、用户数、图表）
- 👥 分销商管理（CRUD）
- 🚚 派送员管理（含区域分配）
- 📍 区域管理（定义片区）
- 📦 订单管理（查看/筛选）
- 🛒 产品管理（定价）
- ⚙️ 系统配置（返佣规则、微信支付）

## 🔧 技术栈

- **前端**: React 18 + TypeScript + Vite 5 + Tailwind CSS
- **后端**: Node.js + Express 4 + TypeScript
- **数据库**: SQLite (better-sqlite3)
- **支付**: 微信 H5 支付 (API v3) - 开发模式模拟
- **状态管理**: Zustand
- **图表**: Recharts

## 📁 项目结构

```
water/
├── client/                  # 前端 H5 应用 (React)
│   ├── src/
│   │   ├── api/            # API 调用层
│   │   ├── pages/
│   │   │   ├── customer/   # 消费者页面
│   │   │   ├── distributor/# 分销商页面
│   │   │   ├── deliveryman/# 派送员页面
│   │   │   └── admin/      # 管理后台页面
│   │   └── stores/         # Zustand 状态管理
│   └── package.json
├── server/                  # 后端 API 服务 (Express)
│   └── src/
│       ├── routes/         # 路由定义
│       ├── controllers/     # 控制器
│       ├── services/        # 业务服务
│       ├── models/          # 数据模型
│       ├── middleware/      # 中间件
│       └── utils/           # 工具函数
├── plan.md                 # 开发计划文档
└── package.json            # 根配置 (workspaces)
```

## 🎨 设计风格

采用**清新流体风格(Fluid Fresh)** - 以水的流动感为核心设计语言：
- 主色调：蓝绿渐变色系 (#0EA5E9 → #06B6D4)
- 移动端优先的 H5 响应式布局
- 玻璃拟态效果 + 圆角卡片 + 微动效

## ⚙️ 返佣系统

- 支持**百分比**和**固定金额**两种模式
- 在管理后台「系统配置」中灵活切换
- 支付成功后自动计算并记录佣金
- 分销商可在「佣金明细」页查看所有记录

## 🗺️ 区域匹配逻辑

订单地址 → 关键词匹配区域表 → 找到负责该区域的派送员 → 自动分配

管理员需先在后台设置区域和对应的派送员。

## 📝 默认账号

- **管理员密码**: `admin123456`
- **默认产品**: 纯天然矿泉水(¥3)、山泉水大桶装(¥25)、高端冰川水(¥8)

## 🔄 生产环境部署

1. 配置微信支付参数（管理后台 → 系统配置）
2. 将 SQLite 切换为 PostgreSQL
3. 设置 JWT 密钥和环境变量
4. 配置 HTTPS 域名（微信支付要求）

---

Built with ❤️ using CodeBuddy
