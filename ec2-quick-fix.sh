#!/bin/bash

# Quick Fix Script - แก้ปัญหาด่วนบน EC2

echo "🚀 Quick Fix for EC2 Issues"
echo "==========================="

# 1. แก้ dpkg ที่ถูกขัดจังหวะ
echo "1️⃣ Fixing dpkg..."
sudo dpkg --configure -a
sudo apt --fix-broken install -y

# 2. ล้าง disk space
echo "2️⃣ Cleaning disk space..."
sudo apt clean
sudo apt autoclean
sudo apt autoremove -y
sudo rm -rf /tmp/*
sudo rm -rf /var/tmp/*
npm cache clean --force 2>/dev/null || true

echo "💾 Disk space after cleanup:"
df -h
echo ""

# 3. ติดตั้ง netstat
echo "3️⃣ Installing net-tools..."
sudo apt update
sudo apt install -y net-tools

# 4. แก้ไข npm permissions
echo "4️⃣ Fixing npm permissions..."
mkdir -p ~/.npm
npm config set cache ~/.npm
sudo chown -R $USER:$USER ~/.npm

# 5. ติดตั้ง Chrome dependencies พื้นฐาน
echo "5️⃣ Installing Chrome dependencies..."
sudo apt install -y \
    libgbm-dev \
    libnss3 \
    libxss1 \
    libasound2 \
    libxtst6 \
    libatk-bridge2.0-0

# 6. ทดสอบ Chrome
echo "6️⃣ Testing Chrome..."
if google-chrome --headless --disable-gpu --no-sandbox --disable-dev-shm-usage --dump-dom https://www.google.com > /dev/null 2>&1; then
    echo "✅ Chrome works!"
else
    echo "❌ Chrome still not working"
fi

# 7. หยุด processes ที่อาจจะขัดแย้ง
echo "7️⃣ Stopping conflicting processes..."
sudo pkill -f "node.*server.js" 2>/dev/null || true
pm2 delete all 2>/dev/null || true

echo ""
echo "✅ Quick fixes completed!"
echo "💡 Now try running: ./ec2-fix-deploy.sh"
