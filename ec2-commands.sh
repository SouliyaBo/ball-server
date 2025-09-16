#!/bin/bash

echo "🚀 Step-by-step deployment commands for EC2"
echo "Copy และ paste คำสั่งเหล่านี้ทีละคำสั่งบน EC2 server ของคุณ:"
echo ""

echo "# 1. Navigate to project directory และ pull latest changes"
echo "cd ~/football-api"
echo "git pull origin ball-api-server"
echo ""

echo "# 2. Make debug script executable"
echo "chmod +x debug-chrome.sh"
echo "chmod +x quick-fix-deploy.sh"
echo ""

echo "# 3. Run debug script to test"
echo "./debug-chrome.sh"
echo ""

echo "# 4. If debug shows issues, run the enhanced deploy"
echo "./quick-fix-deploy.sh"
echo ""

echo "# 5. Test the API manually"
echo "curl http://localhost:8080/api/health"
echo "curl http://localhost:8080/api/data/matches/today"
echo ""

echo "# 6. Check logs if still having issues"
echo "docker-compose logs -f football-api"
echo ""

echo "# Alternative: Run individual commands"
echo "# docker-compose down"
echo "# docker-compose build --no-cache football-api"
echo "# docker-compose up -d football-api"
echo "# docker-compose logs -f football-api"
