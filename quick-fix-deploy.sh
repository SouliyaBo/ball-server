#!/bin/bash

# Quick fix deployment script for pnpm lockfile issue
echo "🔧 Quick Fix: Building Football API with npm instead of pnpm..."

# Stop any running containers
echo "Stopping existing containers..."
docker-compose down

# Remove any cached build layers
echo "Cleaning Docker build cache..."
docker system prune -f

# Build with no cache to ensure fresh build
echo "Building application with npm..."
docker-compose build --no-cache football-api

# Start the services
echo "Starting services..."
docker-compose up -d

# Check the status
echo "Checking container status..."
docker-compose ps

echo ""
echo "✅ Deployment completed!"
echo ""
echo "📊 Service URLs:"
echo "- API Server: http://$(curl -s ifconfig.me):8080"
echo "- Health Check: http://$(curl -s ifconfig.me):8080/api/health"
echo "- API Documentation: http://$(curl -s ifconfig.me):8080/"
echo ""
echo "🔍 To check logs: docker-compose logs -f football-api"
echo "🔄 To restart: docker-compose restart football-api"
