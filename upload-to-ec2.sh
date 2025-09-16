#!/bin/bash

# Script to upload files to EC2
echo "📤 Uploading files to EC2..."

# Variables - แก้ไขตามข้อมูลของคุณ
EC2_IP="18.141.175.73"
KEY_FILE="~/manga-scraper.pem"  # หรือ path ที่ถูกต้องของ key file
EC2_USER="ubuntu"
PROJECT_DIR="~/football-api"

echo "Uploading to $EC2_USER@$EC2_IP:$PROJECT_DIR"

# อัพโหลดไฟล์ที่สำคัญ
echo "Uploading Dockerfile..."
scp -i $KEY_FILE Dockerfile $EC2_USER@$EC2_IP:$PROJECT_DIR/

echo "Uploading docker-compose.yml..."
scp -i $KEY_FILE docker-compose.yml $EC2_USER@$EC2_IP:$PROJECT_DIR/

echo "Uploading debug script..."
scp -i $KEY_FILE debug-chrome.sh $EC2_USER@$EC2_IP:$PROJECT_DIR/

echo "Uploading deploy script..."
scp -i $KEY_FILE quick-fix-deploy.sh $EC2_USER@$EC2_IP:$PROJECT_DIR/

echo "Uploading server.js..."
scp -i $KEY_FILE server.js $EC2_USER@$EC2_IP:$PROJECT_DIR/

echo "Uploading PuppeteerDataExtractor.js..."
scp -i $KEY_FILE PuppeteerDataExtractor.js $EC2_USER@$EC2_IP:$PROJECT_DIR/

echo "Uploading package.json..."
scp -i $KEY_FILE package.json $EC2_USER@$EC2_IP:$PROJECT_DIR/

echo ""
echo "✅ Upload completed!"
echo ""
echo "ตอนนี้ SSH เข้า EC2 และรันคำสั่งต่อไปนี้:"
echo "ssh -i $KEY_FILE $EC2_USER@$EC2_IP"
echo "cd $PROJECT_DIR"
echo "chmod +x debug-chrome.sh quick-fix-deploy.sh"
echo "./debug-chrome.sh"
