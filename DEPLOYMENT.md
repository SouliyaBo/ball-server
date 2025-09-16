# 🚀 Football API Server - AWS EC2 Deployment Guide

ระบบ API สำหรับดึงข้อมูลฟุตบอลแบบ Real-time พร้อม Docker Compose สำหรับ Ubuntu EC2

## 📋 สิ่งที่ต้องเตรียม

### AWS EC2 Requirements
- **Instance Type**: t3.medium หรือสูงกว่า (แนะนำ t3.large สำหรับ production)
- **Operating System**: Ubuntu 22.04 LTS
- **Storage**: อย่างน้อย 20GB SSD
- **Memory**: อย่างน้อย 4GB RAM
- **Network**: Security Group ที่เปิด ports: 22, 80, 443, 3001

### Security Group Settings
```
Port 22   (SSH)     - Your IP only
Port 80   (HTTP)    - 0.0.0.0/0
Port 443  (HTTPS)   - 0.0.0.0/0
Port 3001 (API)     - 0.0.0.0/0
Port 9000 (Monitor) - Your IP only (optional)
```

## 🎯 Quick Deployment

### วิธีที่ 1: ใช้ Auto Deployment Script (แนะนำ)

1. **อัพโหลดไฟล์โปรเจค**:
```bash
# สร้าง directory และอัพโหลดไฟล์
mkdir -p ~/football-api
cd ~/football-api

# อัพโหลดไฟล์ทั้งหมดจาก project directory
# ใช้ scp หรือ git clone
```

2. **รันสคริปต์ deployment**:
```bash
chmod +x deploy.sh
./deploy.sh
```

Script จะติดตั้งและตั้งค่าทุกอย่างอัตโนมัติ!

### วิธีที่ 2: Manual Deployment

<details>
<summary>คลิกเพื่อดู Manual Setup</summary>

#### 1. อัพเดทระบบ
```bash
sudo apt update && sudo apt upgrade -y
```

#### 2. ติดตั้ง Docker
```bash
# ลบ Docker เวอร์ชันเก่า
sudo apt-get remove -y docker docker-engine docker.io containerd runc

# ติดตั้ง dependencies
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# เพิ่ม Docker GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# เพิ่ม repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# ติดตั้ง Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# เพิ่ม user ให้ docker group
sudo usermod -aG docker $USER
```

#### 3. ติดตั้ง Docker Compose
```bash
LATEST_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep -Po '"tag_name": "\K.*?(?=")')
sudo curl -L "https://github.com/docker/compose/releases/download/${LATEST_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 4. ตั้งค่า Firewall
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3001/tcp
sudo ufw --force enable
```

#### 5. Deploy Application
```bash
cd ~/football-api
docker-compose up -d
```

</details>

## ⚙️ Configuration

### Environment Variables (`.env`)
```env
# Server Configuration
NODE_ENV=production
PORT=3001

# Puppeteer Settings
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage,--disable-gpu

# API Settings
API_CACHE_DURATION=120000
API_TIMEOUT=30000

# Redis Password (เปลี่ยนใหม่!)
REDIS_PASSWORD=your-secure-password

# Domain (เปลี่ยนเป็น domain ของคุณ)
DOMAIN=your-domain.com
```

### SSL Certificate Setup
```bash
# ติดตั้ง Certbot
sudo apt install certbot python3-certbot-nginx

# สร้าง SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renew setup
sudo crontab -e
# เพิ่มบรรทัด: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔧 Management Commands

### Docker Compose Commands
```bash
# เริ่มบริการ
docker-compose up -d

# หยุดบริการ
docker-compose down

# ดู logs
docker-compose logs -f

# ดูสถานะ containers
docker-compose ps

# Restart specific service
docker-compose restart football-api

# Rebuild และ restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Monitoring Commands
```bash
# ดู resource usage
docker stats

# ดู logs แบบ real-time
docker-compose logs -f football-api

# ตรวจสอบ API health
curl http://localhost:3001/api/health

# ดูจำนวน requests
curl http://localhost:3001/api/status
```

## 📊 Service URLs

หลังจาก deployment สำเร็จ:

- **API Server**: `http://your-server-ip:3001`
- **Web Interface**: `http://your-server-ip`
- **API Documentation**: `http://your-server-ip:3001/`
- **Health Check**: `http://your-server-ip:3001/api/health`
- **Portainer (Monitoring)**: `http://your-server-ip:9000`

### API Endpoints
```
GET /                           - API Documentation
GET /api/health                 - Health Check
GET /api/status                 - Server Status
GET /api/data/matches/today     - วันนี้
GET /api/data/matches/date/1    - พรุ่งนี้
GET /api/data/matches/date/2    - มะรืนนี้
```

## 🔍 Troubleshooting

### ปัญหาที่พบบ่อย

#### 1. Container ไม่เริ่มต้น
```bash
# ดู logs เพื่อหาสาเหตุ
docker-compose logs football-api

# ลอง rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

#### 2. Puppeteer Error
```bash
# ตรวจสอบ Chrome installation
docker-compose exec football-api which google-chrome-stable

# ตรวจสอบ environment variables
docker-compose exec football-api env | grep PUPPETEER
```

#### 3. Memory Issues
```bash
# ดู memory usage
free -h
docker stats

# เพิ่ม swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### 4. Network Issues
```bash
# ตรวจสอบ ports
netstat -tlnp | grep :3001

# ตรวจสอบ firewall
sudo ufw status

# ตรวจสอบ Security Group ใน AWS Console
```

## 🔒 Security Best Practices

### 1. Update System Regularly
```bash
# ตั้ง auto-update
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 2. Secure SSH
```bash
# เปลี่ยน SSH port (optional)
sudo nano /etc/ssh/sshd_config
# เปลี่ยน Port 22 เป็น Port 2222
sudo systemctl restart ssh
```

### 3. Setup Fail2Ban
```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 4. Regular Backups
```bash
# สร้าง backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf "/backup/football-api-$DATE.tar.gz" /home/ubuntu/football-api
# เก็บแค่ 7 วันล่าสุด
find /backup -name "football-api-*.tar.gz" -mtime +7 -delete
```

## 📈 Performance Optimization

### 1. Nginx Caching
เพิ่มใน `nginx.conf`:
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 2. Redis Caching
เปิดใช้ Redis service ใน `docker-compose.yml`

### 3. Resource Limits
ปรับ limits ใน `docker-compose.yml`:
```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 2G
```

## 🆘 Support

หากพบปัญหา:

1. ตรวจสอบ logs: `docker-compose logs -f`
2. ตรวจสอบ system resources: `htop`
3. ดู container status: `docker-compose ps`
4. Test API manually: `curl http://localhost:3001/api/health`

## 🔄 Updates

### การอัพเดท Application
```bash
cd ~/football-api
git pull  # หรือ upload ไฟล์ใหม่
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### การอัพเดท Docker Images
```bash
docker-compose pull
docker-compose up -d
```

---

## 📝 Notes

- เซิร์ฟเวอร์จะรีสตาร์ทอัตโนมัติหากมีปัญหา
- Monitoring script รันทุก 5 นาที
- Logs จะถูกลบอัตโนมัติหลัง 7 วัน
- SSL certificate จะต่ออายุอัตโนมัติ

**สำคัญ**: อย่าลืมเปลี่ยน default passwords ใน `.env`!
