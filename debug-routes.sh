#!/bin/bash

echo "🔍 Debug API Routes..."

echo ""
echo "=== TESTING API ENDPOINTS ==="

# Test root endpoint
echo "1. Testing root endpoint (should show API docs):"
curl -s http://localhost:8080/ | jq '.' || curl -s http://localhost:8080/

echo ""
echo "2. Testing health endpoint:"
curl -s http://localhost:8080/api/health | jq '.' || curl -s http://localhost:8080/api/health

echo ""
echo "3. Testing today matches endpoint:"
curl -s http://localhost:8080/api/data/matches/today | jq '.' || curl -s http://localhost:8080/api/data/matches/today

echo ""
echo "4. Check container logs for routing info:"
docker-compose logs --tail=20 football-api

echo ""
echo "5. Test direct container:"
docker-compose exec football-api curl -s http://localhost:8080/api/data/matches/today

echo ""
echo "6. Check if files are correct in container:"
docker-compose exec football-api head -50 server.js

echo ""
echo "=== DEBUG COMPLETE ==="