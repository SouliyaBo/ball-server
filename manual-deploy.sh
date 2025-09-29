#!/bin/bash

# Manual Deployment - สำหรับกรณีฉุกเฉิน

echo "🔧 Manual Football API Deployment"
echo "================================"

# Check if files exist
if [ ! -f "server.js" ]; then
    echo "❌ server.js not found!"
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo "❌ package.json not found!"
    exit 1
fi

# Set environment variables
export HOST=0.0.0.0
export PORT=8080
export NODE_ENV=production

echo "📦 Installing minimal dependencies..."

# ติดตั้งเฉพาะที่จำเป็น
npm install --no-optional express puppeteer puppeteer-extra puppeteer-extra-plugin-stealth

echo "🧪 Testing server manually..."

# ทดสอบ server โดยไม่ใช้ PM2
echo "Starting server manually (press Ctrl+C to stop)..."
echo ""
echo "🌐 Server will be available at:"
echo "   http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):8080/api/health"
echo ""

# รัน server
node server.js
