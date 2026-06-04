#!/bin/bash
# ============================================================
# 桶装水配送管理系统 - 一键部署脚本
# 用法: chmod +x deploy.sh && ./deploy.sh
# ============================================================

set -e

echo "========================================="
echo "  桶装水系统 - 开始部署"
echo "========================================="

# ---------- 1. 安装依赖 ----------
echo ""
echo "[1/7] 检查并安装 Node.js..."
if ! command -v node &>/dev/null; then
    echo "安装 Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
echo "Node 版本: $(node -v)"

if ! command -v pm2 &>/dev/null; then
    echo "[1/7] 安装 PM2..."
    sudo npm install -g pm2
fi

if ! command -v nginx &>/dev/null; then
    echo "[1/7] 安装 Nginx..."
    sudo apt-get update && sudo apt-get install -y nginx
fi

# ---------- 2. 创建项目目录 ----------
echo ""
echo "[2/7] 准备项目目录..."
sudo mkdir -p /var/www/water/data
sudo chown -R $USER:$USER /var/www/water

# ---------- 3. 克隆代码 ----------
echo ""
echo "[3/7] 克隆项目代码..."
PROJECT_DIR="/home/ubuntu/water"
MIRROR="https://ghproxy.net"

if [ -d "$PROJECT_DIR" ]; then
    echo "项目已存在，更新代码..."
    cd "$PROJECT_DIR"
    git pull origin main || {
        echo "git pull 失败，尝试重新克隆..."
        cd ..
        # 备份 data 目录（生产数据库）
        if [ -d "$PROJECT_DIR/data" ]; then
            cp -r "$PROJECT_DIR/data" /tmp/water_data_backup
            echo "已备份 data 目录"
        fi
        rm -rf "$PROJECT_DIR"
        git clone "$MIRROR/https://github.com/mentalzou/water.git" "$PROJECT_DIR"
        # 恢复 data 目录
        if [ -d /tmp/water_data_backup ]; then
            cp -r /tmp/water_data_backup "$PROJECT_DIR/data"
            rm -rf /tmp/water_data_backup
            echo "已恢复 data 目录"
        fi
    }
else
    # 尝试多个镜像源
    for mirror in \
        "https://ghproxy.net/https://github.com/mentalzou/water.git" \
        "https://mirror.ghproxy.com/https://github.com/mentalzou/water.git" \
        "https://gh-proxy.com/https://github.com/mentalzou/water.git"; do
        if git clone "$mirror" "$PROJECT_DIR" 2>/dev/null; then
            echo "克隆成功: $mirror"
            break
        fi
        echo "尝试下一个镜像..."
    done
fi

cd "$PROJECT_DIR"

# ---------- 4. 安装依赖 & 构建 ----------
echo ""
echo "[4/7] 安装前端依赖并构建..."
cd client
npm install --production=false
npm run build
echo "前端构建完成: dist/"

cd "$PROJECT_DIR/server"
echo ""
echo "[4/7] 安装后端依赖..."
npm install --production

# ---------- 5. 配置环境变量 ----------
echo ""
echo "[5/7] 配置环境变量..."
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
JWT_SECRET=CHANGE_ME_TO_A_RANDOM_SECRET_KEY_AT_LEAST_32_CHARS
DB_PATH=/var/www/water/data/water.db
FRONTEND_URL=http://你的服务器公网IP
EOF

# 自动生成 JWT_SECRET
JWT=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
sed -i "s|CHANGE_ME_TO_A_RANDOM_SECRET_KEY_AT_LEAST_32_CHARS|$JWT|" .env

# 获取服务器公网IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo 'localhost')
sed -i "s|http://你的服务器公网IP|http://${SERVER_IP}|" .env

echo ".env 已创建（请检查 JWT_SECRET 和 FRONTEND_URL）"
cat .env

# ---------- 6. 数据库初始化 ----------
echo ""
echo "[6/7] 初始化数据库..."
mkdir -p /var/www/water/data
npx tsx src/app.ts &
SERVER_PID=$!
sleep 3
kill $SERVER_PID 2>/dev/null || true
echo "数据库已初始化"

# ---------- 7. 启动服务 ----------
echo ""
echo "[7/7] 启动服务..."

# 启动后端 (PM2)
pm2 delete water-server 2>/dev/null || true
pm2 start npm --name "water-server" -- start --prefix "$PROJECT_DIR/server" --
pm2 save
pm2 startup | tail -n 1 | sudo bash 2>/dev/null || true

# 配置 Nginx 反向代理
echo ""
echo "配置 Nginx..."
sudo tee /etc/nginx/sites-available/water > /dev/null << 'NGINX'
server {
    listen 80;
    server_name _;

    # 前端静态文件
    location / {
        root /home/ubuntu/water/client/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/water /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "========================================="
echo "  部署完成!"
echo "========================================="
echo ""
echo "  访问地址: http://${SERVER_IP}"
echo "  管理员账号: admin / admin123"
echo ""
echo "  常用命令:"
echo "    pm2 logs water-server     # 查看日志"
echo "    pm2 restart water-server   # 重启服务"
echo "    pm2 status                # 查看状态"
echo ""
echo "  下一步:"
echo "    1. 修改 .env 中的 JWT_SECRET（已完成自动生成）"
echo "    2. 配置 HTTPS（建议用 Let's Encrypt）"
echo "    3. 配置防火墙: sudo ufw allow 80/tcp && sudo ufw allow 443/tcp"
echo ""
echo "========================================="
