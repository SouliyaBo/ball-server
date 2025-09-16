#!/bin/bash

# Enhanced deployment script with Chrome/Puppeteer fixes
echo "🔧 Enhanced Fix: Building Football API with Chrome optimizations..."

# Stop any running containers
echo "Stopping existing containers..."
docker-compose down

# Remove containers, networks, and volumes
echo "Cleaning Docker resources..."
docker-compose down -v --remove-orphans
docker system prune -f

# Build with no cache to ensure fresh build
echo "Building application with Chrome optimizations..."
docker-compose build --no-cache football-api

# Start the services
echo "Starting services..."
docker-compose up -d

# Wait for container to start
echo "Waiting for container to start..."
sleep 10

# Check the status
echo "Checking container status..."
docker-compose ps

# Show logs for debugging
echo ""
echo "📋 Recent logs:"
docker-compose logs --tail=20 football-api

echo ""
echo "✅ Deployment completed!"
echo ""
echo "📊 Service URLs:"
echo "- API Server: http://$(curl -s ifconfig.me 2>/dev/null || echo 'localhost'):8080"
echo "- Health Check: http://$(curl -s ifconfig.me 2>/dev/null || echo 'localhost'):8080/api/health"
echo "- API Documentation: http://$(curl -s ifconfig.me 2>/dev/null || echo 'localhost'):8080/"
echo ""
echo "🔍 Commands:"
echo "- Check logs: docker-compose logs -f football-api"
echo "- Restart: docker-compose restart football-api"
echo "- Debug Chrome: docker-compose exec football-api google-chrome-stable --version"
echo ""
echo "🧪 Test API:"
echo "curl http://localhost:8080/api/health"
