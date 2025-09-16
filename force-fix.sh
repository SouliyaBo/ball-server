#!/bin/bash

echo "🔧 Force fix server routes..."

# Stop container
echo "Stopping container..."
docker-compose down

# Remove container and image to force rebuild
echo "Removing container and image..."
docker-compose rm -f football-api
docker rmi ball-script_football-api 2>/dev/null || true

# Show current server.js content for verification
echo ""
echo "Current server.js routes (first 150 lines):"
head -150 server.js | grep -n "app.get\|app.post\|app.use"

echo ""
echo "Building fresh container..."
docker-compose build --no-cache football-api

echo "Starting container..."
docker-compose up -d football-api

# Wait for startup
sleep 10

echo ""
echo "Testing routes after fresh build:"
echo "1. Root route:"
curl -s http://localhost:8080/ | head -5

echo ""
echo "2. Today matches route:"
curl -s http://localhost:8080/api/data/matches/today | head -5

echo ""
echo "3. Container logs:"
docker-compose logs --tail=20 football-api

echo ""
echo "4. Making actual test calls:"
echo "curl http://localhost:8080/api/data/matches/today"