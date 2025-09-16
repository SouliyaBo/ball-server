#!/bin/bash

echo "🔧 Quick Docker Permission Fix..."

# Fix Docker permissions
echo "1. Adding user to docker group..."
sudo usermod -aG docker $USER

echo "2. Applying group changes..."
newgrp docker

echo "3. Testing Docker access..."
docker ps || echo "Need to logout/login or use sudo"

echo "4. Starting containers with current permissions..."
if docker ps > /dev/null 2>&1; then
    echo "Using docker without sudo..."
    docker-compose up -d football-api football-redis
else
    echo "Using sudo with docker..."
    sudo docker-compose up -d football-api football-redis
fi

echo "5. Check container status..."
if docker ps > /dev/null 2>&1; then
    docker-compose ps
else
    sudo docker-compose ps
fi

echo ""
echo "6. Testing API..."
sleep 5
curl -s http://localhost:8080/api/health || echo "API not ready yet"

echo ""
echo "✅ Quick fix completed!"
echo "If still having issues, logout and login again with:"
echo "exit"
echo "ssh -i ~/manga-scraper.pem ubuntu@18.141.175.73"