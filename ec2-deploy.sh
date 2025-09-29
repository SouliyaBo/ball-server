#!/bin/bash

# EC2 Deployment Script for Football Data API Server

echo "🌍 กำลังเตรียม EC2 environment..."

# Check if running on EC2
if curl -s http://169.254.169.254/latest/meta-data/instance-id > /dev/null 2>&1; then
    echo "✅ ตรวจพบ EC2 instance"
    INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
    PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
    echo "📍 Instance ID: $INSTANCE_ID"
    echo "🌐 Public IP: $PUBLIC_IP"
else
    echo "⚠️ ไม่ได้รันบน EC2 instance"
fi

# Install Node.js if not installed
if ! command -v node &> /dev/null; then
    echo "📦 กำลังติดตั้ง Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install Google Chrome if not installed
if ! command -v google-chrome &> /dev/null; then
    echo "🌐 กำลังติดตั้ง Google Chrome..."
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
    sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'
    sudo apt-get update
    sudo apt-get install -y google-chrome-stable
fi

# Install dependencies
sudo apt-get install -y \
    libasound2 libatk1.0-0 libcairo-gobject2 \
    libcups2 libdbus-1-3 libexpat1 libfontconfig1 \
    libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 \
    libgtk-3-0 libnspr4 libpango-1.0-0 libxss1 \
    fonts-liberation libappindicator1 libnss3 \
    lsb-release xdg-utils libgbm-dev

# Install PM2 globally
sudo npm install -g pm2

# Install project dependencies
npm install

# Check if port 8080 is available
if netstat -tuln | grep :8080; then
    echo "⚠️ Port 8080 is already in use"
    echo "🔄 Stopping existing processes on port 8080..."
    sudo pkill -f "node.*server.js"
    sudo fuser -k 8080/tcp 2>/dev/null || true
    sleep 3
fi

# Set environment variables
export HOST=0.0.0.0
export PORT=8080
export NODE_ENV=production

# Create logs directory
mkdir -p logs

# Test Chrome
echo "🧪 Testing Chrome installation..."
google-chrome --headless --disable-gpu --dump-dom https://www.google.com > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Chrome test passed"
else
    echo "❌ Chrome test failed"
    exit 1
fi

# Test Node.js app
echo "🧪 Testing Node.js app..."
timeout 10s node -e "
const app = require('./server.js');
console.log('✅ App test passed');
process.exit(0);
" || {
    echo "❌ App test failed"
    exit 1
}

echo "🚀 Starting server with PM2..."

# Stop existing PM2 processes
pm2 delete football-api 2>/dev/null || true

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
pm2 startup

echo "✅ Deployment completed!"
echo ""
echo "🌐 API URLs:"
echo "   Health Check: http://$PUBLIC_IP:8080/api/health"
echo "   Matches API:  http://$PUBLIC_IP:8080/api/data/matches/today"
echo "   Status:       http://$PUBLIC_IP:8080/api/status"
echo ""
echo "📊 PM2 Commands:"
echo "   pm2 status"
echo "   pm2 logs football-api"
echo "   pm2 restart football-api"
echo "   pm2 stop football-api"
