#!/bin/bash

echo "🔍 Debug script for Chrome permissions..."

# Stop containers
echo "Stopping containers..."
docker-compose down

# Build with latest changes
echo "Building with latest fixes..."
docker-compose build --no-cache football-api

# Start container
echo "Starting container..."
docker-compose up -d football-api

# Wait for startup
echo "Waiting for container to start..."
sleep 5

# Debug commands
echo ""
echo "=== DEBUGGING CONTAINER ==="

# Check if user exists
echo "1. Checking user permissions:"
docker-compose exec football-api id
docker-compose exec football-api whoami

# Check home directory
echo ""
echo "2. Checking home directory:"
docker-compose exec football-api ls -la /home/
docker-compose exec football-api ls -la /home/nodejs/ || echo "nodejs home not found"

# Check Chrome installation
echo ""
echo "3. Checking Chrome:"
docker-compose exec football-api which google-chrome-stable
docker-compose exec football-api google-chrome-stable --version || echo "Chrome not accessible"

# Test directory creation
echo ""
echo "4. Testing directory creation:"
docker-compose exec football-api mkdir -p /home/nodejs/test && echo "Directory creation: OK" || echo "Directory creation: FAILED"

# Check environment variables
echo ""
echo "5. Environment variables:"
docker-compose exec football-api env | grep PUPPETEER

# Show recent logs
echo ""
echo "6. Recent container logs:"
docker-compose logs --tail=10 football-api

echo ""
echo "=== END DEBUG ==="
echo ""
echo "Now test the API:"
echo "curl http://localhost:8080/api/health"
