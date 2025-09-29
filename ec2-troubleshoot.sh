#!/bin/bash

# EC2 Troubleshooting Script

echo "🔍 EC2 Football API Troubleshooting"
echo "================================="

# Check system info
echo "📊 System Information:"
echo "OS: $(lsb_release -d | cut -f2)"
echo "Architecture: $(uname -m)"
echo "Memory: $(free -h | grep Mem | awk '{print $2}')"
echo ""

# Check Node.js
echo "📦 Node.js & Dependencies:"
echo "Node.js: $(node --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "NPM: $(npm --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "Chrome: $(google-chrome --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "PM2: $(pm2 --version 2>/dev/null || echo 'NOT INSTALLED')"
echo ""

# Check processes
echo "🔄 Process Status:"
echo "Node processes:"
ps aux | grep node | grep -v grep || echo "No Node.js processes found"
echo ""
echo "PM2 status:"
pm2 status 2>/dev/null || echo "PM2 not running or not installed"
echo ""

# Check ports
echo "🌐 Port Status:"
echo "Port 8080 usage:"
netstat -tuln | grep :8080 || echo "Port 8080 is available"
echo ""
echo "All listening ports:"
netstat -tuln | grep LISTEN
echo ""

# Check logs
echo "📄 Recent Logs:"
if [ -f "logs/error.log" ]; then
    echo "--- Error Log (last 20 lines) ---"
    tail -20 logs/error.log
else
    echo "No error log found"
fi

if [ -f "logs/out.log" ]; then
    echo "--- Output Log (last 20 lines) ---"
    tail -20 logs/out.log
else
    echo "No output log found"
fi
echo ""

# Check security groups (if on EC2)
if curl -s http://169.254.169.254/latest/meta-data/instance-id > /dev/null 2>&1; then
    echo "🔒 EC2 Security Information:"
    PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null)
    PRIVATE_IP=$(curl -s http://169.254.169.254/latest/meta-data/local-ipv4 2>/dev/null)
    echo "Public IP: $PUBLIC_IP"
    echo "Private IP: $PRIVATE_IP"
    echo ""
    echo "⚠️ Make sure your Security Group allows:"
    echo "   - Inbound TCP 8080 from 0.0.0.0/0"
    echo "   - Inbound SSH (22) from your IP"
    echo ""
fi

# Test API locally
echo "🧪 API Tests:"
echo "Testing localhost health check..."
LOCAL_HEALTH=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:8080/api/health 2>/dev/null)
if [ "$LOCAL_HEALTH" = "200" ]; then
    echo "✅ Local health check: OK"
else
    echo "❌ Local health check: Failed (HTTP $LOCAL_HEALTH)"
fi

# Test Chrome
echo ""
echo "Testing Chrome headless..."
google-chrome --headless --disable-gpu --dump-dom https://www.google.com > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Chrome headless: OK"
else
    echo "❌ Chrome headless: Failed"
fi

echo ""
echo "🛠️ Common Solutions:"
echo "1. Install missing dependencies:"
echo "   sudo apt update && sudo apt install -y google-chrome-stable nodejs npm"
echo ""
echo "2. Fix PM2 issues:"
echo "   pm2 delete all && pm2 start ecosystem.config.js"
echo ""
echo "3. Check Security Group:"
echo "   EC2 Console > Security Groups > Add Inbound Rule > Port 8080"
echo ""
echo "4. Restart everything:"
echo "   pm2 delete all && ./ec2-deploy.sh"
echo ""
echo "5. Manual start (for debugging):"
echo "   HOST=0.0.0.0 PORT=8080 node server.js"
