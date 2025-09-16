#!/bin/bash

echo "🧹 Complete Docker cleanup and rebuild..."

# Stop all containers
echo "1. Stopping all containers..."
docker-compose down -v --remove-orphans

# Remove specific containers and images
echo "2. Removing containers and images..."
docker container rm -f football-api-server 2>/dev/null || true
docker image rm -f ball-script_football-api 2>/dev/null || true
docker image rm -f football-api_football-api 2>/dev/null || true

# Clean docker system
echo "3. Cleaning Docker system..."
docker system prune -af
docker volume prune -f

# Show current user setup in Dockerfile
echo "4. Current Dockerfile user setup:"
grep -A 10 -B 2 "groupadd\|useradd" Dockerfile

# Build with verbose output
echo "5. Building with verbose output..."
docker-compose build --no-cache --progress=plain football-api

echo "6. Starting container..."
docker-compose up -d football-api

# Wait for startup
echo "7. Waiting for container to start..."
sleep 15

# Test user permissions inside container
echo "8. Testing user permissions:"
docker-compose exec football-api id
docker-compose exec football-api whoami
docker-compose exec football-api ls -la /home/
docker-compose exec football-api ls -la /home/nodejs/ 2>/dev/null || echo "nodejs home still not accessible"

# Test Chrome
echo "9. Testing Chrome access:"
docker-compose exec football-api google-chrome-stable --version 2>/dev/null || echo "Chrome not accessible"

# Test API
echo "10. Testing API:"
sleep 5
curl -s http://localhost:8080/api/data/matches/today | head -5

echo ""
echo "=== CLEANUP AND REBUILD COMPLETE ==="