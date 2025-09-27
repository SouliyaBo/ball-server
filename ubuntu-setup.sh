#!/bin/bash

# Ubuntu Setup Script for Football Data API Server

echo "🐧 กำลังเตรียม Ubuntu environment..."

# Update system
sudo apt update
sudo apt upgrade -y

# Install Node.js (version 18 or higher)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install essential packages
sudo apt install -y \
    wget \
    gnupg \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    curl

# Install Google Chrome (required for Puppeteer)
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'
sudo apt update
sudo apt install -y google-chrome-stable

# Install Puppeteer dependencies
sudo apt install -y \
    gconf-service \
    libasound2 \
    libatk1.0-0 \
    libc6 \
    libcairo-gobject2 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
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
    ca-certificates \
    fonts-liberation \
    libappindicator1 \
    libnss3 \
    lsb-release \
    xdg-utils

echo "✅ Ubuntu environment พร้อมแล้ว!"

# Check installations
echo "🔍 ตรวจสอบการติดตั้ง:"
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "Chrome: $(google-chrome --version)"

echo "📦 ติดตั้ง npm dependencies..."
npm install

echo "🚀 พร้อมรัน Football API Server บน Ubuntu!"
echo "รันคำสั่ง: node server.js"
