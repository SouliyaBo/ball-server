#!/bin/bash

# EC2 Fix and Deploy Script - แก้ไขปัญหาทั้งหมด

echo "🔧 กำลังแก้ไขปัญหา EC2..."

# ========== แก้ไขปัญหา dpkg ==========
echo "1️⃣ แก้ไข dpkg ที่ถูกขัดจังหวะ..."
sudo dpkg --configure -a
sudo apt --fix-broken install -y

# ========== ตรวจสอบ disk space ==========
echo "2️⃣ ตรวจสอบ disk space..."
df -h
echo ""

AVAILABLE_SPACE=$(df / | awk 'NR==2 {print $4}' | sed 's/[^0-9]//g')
if [ "$AVAILABLE_SPACE" -lt 1000000 ]; then  # น้อยกว่า 1GB
    echo "⚠️ Disk space เหลือน้อย กำลังล้างข้อมูลไม่จำเป็น..."

    # ล้าง apt cache
    sudo apt clean
    sudo apt autoclean
    sudo apt autoremove -y

    # ล้าง system logs เก่า
    sudo journalctl --vacuum-time=3d

    # ล้าง tmp files
    sudo rm -rf /tmp/*
    sudo rm -rf /var/tmp/*

    # ล้าง npm cache
    npm cache clean --force 2>/dev/null || true
    sudo npm cache clean --force 2>/dev/null || true

    echo "✅ ล้างข้อมูลเสร็จแล้ว"
    echo "Disk space หลังล้าง:"
    df -h
    echo ""
fi

# ========== Update system ==========
echo "3️⃣ Update system..."
sudo apt update

# ========== ติดตั้ง tools พื้นฐาน ==========
echo "4️⃣ ติดตั้ง tools พื้นฐาน..."
sudo apt install -y \
    curl \
    wget \
    net-tools \
    htop \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# ========== ตรวจสอบ Node.js ==========
echo "5️⃣ ตรวจสอบ Node.js..."
if ! command -v node &> /dev/null || [ "$(node --version | cut -c2-3)" -lt "18" ]; then
    echo "📦 กำลังติดตั้ง Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs

    # สร้าง npm directory สำหรับ ubuntu user
    mkdir -p /home/ubuntu/.npm
    sudo chown -R ubuntu:ubuntu /home/ubuntu/.npm

    # แก้ไข npm permissions
    npm config set cache /home/ubuntu/.npm
fi

echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"

# ========== ติดตั้ง Google Chrome ==========
echo "6️⃣ ติดตั้ง Google Chrome..."
if ! command -v google-chrome &> /dev/null; then
    echo "🌐 กำลังติดตั้ง Google Chrome..."

    # เพิ่ม Google Chrome repository
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg
    sudo sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'

    sudo apt update
    sudo apt install -y google-chrome-stable
fi

# ========== ติดตั้ง Chrome dependencies ==========
echo "7️⃣ ติดตั้ง Chrome dependencies..."
sudo apt install -y \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcairo-gobject2 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb-dri3-0 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    fonts-liberation \
    libappindicator1 \
    lsb-release \
    xdg-utils

# ========== ทดสอบ Chrome ==========
echo "8️⃣ ทดสอบ Chrome..."
if google-chrome --headless --disable-gpu --no-sandbox --disable-dev-shm-usage --dump-dom https://www.google.com > /dev/null 2>&1; then
    echo "✅ Chrome ทำงานได้"
else
    echo "❌ Chrome ยังไม่ทำงาน กำลังแก้ไข..."

    # ติดตั้ง dependencies เพิ่มเติม
    sudo apt install -y \
        libgbm-dev \
        libxcb-dri3-0 \
        libxss1 \
        libasound2-dev

    # ทดสอบอีกครั้ง
    if google-chrome --headless --disable-gpu --no-sandbox --disable-dev-shm-usage --dump-dom https://www.google.com > /dev/null 2>&1; then
        echo "✅ Chrome ทำงานได้แล้วหลังแก้ไข"
    else
        echo "❌ Chrome ยังไม่ทำงาน กรุณาตรวจสอบ manually"
    fi
fi

# ========== ติดตั้ง PM2 ==========
echo "9️⃣ ติดตั้ง PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# ========== ติดตั้ง project dependencies ==========
echo "🔟 ติดตั้ง project dependencies..."
if [ -f "package.json" ]; then
    # ล้าง node_modules หากมีปัญหา
    if [ -d "node_modules" ]; then
        rm -rf node_modules
    fi

    # ติดตั้งใหม่
    npm install --no-optional --production
else
    echo "❌ ไม่พบ package.json"
    exit 1
fi

# ========== ตรวจสอบ ports ==========
echo "1️⃣1️⃣ ตรวจสอบ ports..."
if netstat -tuln | grep :8080 > /dev/null 2>&1; then
    echo "⚠️ Port 8080 ถูกใช้อยู่ กำลังหยุด process..."
    sudo pkill -f "node.*server.js" || true
    sudo fuser -k 8080/tcp 2>/dev/null || true
    sleep 3
fi

# ========== สร้าง directories ==========
echo "1️⃣2️⃣ สร้าง directories..."
mkdir -p logs
sudo chown -R ubuntu:ubuntu logs

# ========== Set environment variables ==========
export HOST=0.0.0.0
export PORT=8080
export NODE_ENV=production

# ========== ทดสอบ Node.js app ==========
echo "1️⃣3️⃣ ทดสอบ Node.js app..."
timeout 15s node -e "
const app = require('./server.js');
console.log('✅ App test passed');
setTimeout(() => process.exit(0), 1000);
" || {
    echo "❌ App test failed"
    echo "กรุณาตรวจสอบ server.js"
}

# ========== เริ่ม server ด้วย PM2 ==========
echo "1️⃣4️⃣ เริ่ม server ด้วย PM2..."

# หยุด process เก่า
pm2 delete football-api 2>/dev/null || true

# เริ่ม process ใหม่
if [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js --env production
else
    pm2 start server.js --name football-api
fi

# บันทึก configuration
pm2 save
pm2 startup ubuntu -u ubuntu --hp /home/ubuntu

echo "✅ Deployment เสร็จสิ้น!"
echo ""

# ========== แสดงข้อมูลสำคัญ ==========
if curl -s http://169.254.169.254/latest/meta-data/instance-id > /dev/null 2>&1; then
    PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
    echo "🌐 API URLs:"
    echo "   Health Check: http://$PUBLIC_IP:8080/api/health"
    echo "   Matches API:  http://$PUBLIC_IP:8080/api/data/matches/today"
    echo "   Status:       http://$PUBLIC_IP:8080/api/status"
    echo ""
fi

echo "📊 PM2 Commands:"
echo "   pm2 status"
echo "   pm2 logs football-api"
echo "   pm2 restart football-api"
echo ""

echo "🔍 Troubleshooting:"
echo "   ./ec2-troubleshoot.sh"
