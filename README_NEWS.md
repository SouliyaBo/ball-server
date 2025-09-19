# News Automation System

ระบบดึงข่าวฟุตบอลจาก Kapook และโพสต์อัตโนมัติไปยัง WordPress

## 🚀 Quick Start

### 1. ติดตั้ง Dependencies
```bash
npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth axios node-cron express
```

### 2. ตั้งค่า Configuration
แก้ไขไฟล์ `config.json`:

```json
{
  "wordpress": {
    "url": "https://yoursite.com",
    "username": "your-username",
    "password": "your-application-password"
  },
  "scraping": {
    "maxNewsPerRun": 5,
    "delayBetweenRequests": 2000
  }
}
```

### 3. รันระบบ

#### รันครั้งเดียว
```bash
node news-automation.js --run
```

#### เริ่ม API Server พร้อม Scheduling
```bash
node news-automation.js --server
```

#### ดูสถานะ
```bash
node news-automation.js --status
```

## 📋 คำสั่งที่มี

| คำสั่ง | คำอธิบาย |
|--------|----------|
| `--run, -r` | รันการดึงและโพสต์ข่าวทันที |
| `--status, -s` | แสดงสถานะระบบ |
| `--cleanup, -c` | ทำความสะอาดข้อมูลเก่า |
| `--server, -sv` | เริ่ม API server (default) |
| `--help, -h` | แสดงวิธีการใช้งาน |

## 🌐 API Endpoints

เมื่อรัน server mode:

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/health` | Health check |
| GET | `/status` | ดูสถานะระบบ |
| POST | `/run` | รันแบบ manual |
| POST | `/cleanup` | ทำความสะอาดข้อมูล |

## ⚙️ Configuration

### WordPress Settings
```json
{
  "wordpress": {
    "url": "https://yoursite.com",
    "username": "admin",
    "password": "xxxx xxxx xxxx xxxx",
    "defaultCategory": "ข่าวฟุตบอล",
    "defaultStatus": "publish",
    "defaultAuthor": 1
  }
}
```

### Automation Settings
```json
{
  "automation": {
    "enabled": true,
    "schedule": {
      "enabled": true,
      "cron": "0 */2 * * *",
      "timezone": "Asia/Bangkok"
    }
  }
}
```

## 📁 โครงสร้างไฟล์

```
ball-script/
├── news-automation.js      # Main CLI และ API server
├── NewsAutomation.js       # ระบบควบคุมหลัก
├── KapookNewsScraper.js    # ดึงข่าวจาก Kapook
├── WordPressPublisher.js   # โพสต์ไป WordPress
├── NewsDatabase.js         # จัดการข้อมูลและป้องกันซ้ำ
├── config.json            # การตั้งค่า
└── README_NEWS.md         # เอกสารนี้
```

## 🔧 การตั้งค่าขั้นสูง

### WordPress Application Password
1. ไปที่ WordPress Admin → Users → Profile
2. เลื่อนลงไปหา "Application Passwords"
3. สร้าง password ใหม่สำหรับ application
4. ใช้ password นี้ใน config.json

### Cron Schedule Examples
```json
{
  "cron": "0 */2 * * *",    // ทุก 2 ชั่วโมง
  "cron": "0 8,12,16,20 * * *", // 8:00, 12:00, 16:00, 20:00
  "cron": "0 0 * * *",      // ทุกวันเที่ยงคืน
  "cron": "*/30 * * * *"    // ทุก 30 นาที
}
```

### Notification Settings
```json
{
  "notifications": {
    "discord": {
      "enabled": true,
      "webhook": "https://discord.com/api/webhooks/..."
    },
    "line": {
      "enabled": false,
      "token": "your-line-token"
    }
  }
}
```

## 🛠️ Troubleshooting

### ข้อผิดพลาดทั่วไป

1. **WordPress Connection Failed**
   - ตรวจสอบ URL, username, password
   - ตรวจสอบ WordPress REST API เปิดใช้งาน

2. **Chrome/Puppeteer Issues**
   - ติดตั้ง dependencies: `sudo apt-get install -y chromium-browser`
   - ตรวจสอบ headless mode

3. **Duplicate Detection Too Sensitive**
   - ปรับ `duplicateThreshold` ใน config.json
   - ลดค่า similarity threshold

### Debug Mode
เปิด debug mode โดยตั้งค่า environment variable:
```bash
DEBUG=true node news-automation.js --run
```

## 📊 Monitoring

### ดูสถานะแบบ Real-time
```bash
# Terminal 1: เริ่ม server
node news-automation.js --server

# Terminal 2: ดูสถานะ
watch -n 5 'curl -s http://localhost:3002/status | jq'
```

### Log Files
ระบบจะสร้าง log files:
- `news_automation.log` - การทำงานหลัก
- `scraper.log` - การดึงข้อมูล
- `publisher.log` - การโพสต์

## 🚀 Production Deployment

### PM2 (Process Manager)
```bash
# ติดตั้ง PM2
npm install -g pm2

# เริ่มต้น
pm2 start news-automation.js --name "news-automation"

# ดูสถานะ
pm2 status

# ดู logs
pm2 logs news-automation

# หยุด
pm2 stop news-automation
```

### Docker
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

# ติดตั้ง Chrome dependencies
RUN apk add --no-cache chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY . .

CMD ["node", "news-automation.js", "--server"]
```

### Environment Variables
```bash
# ใช้ environment variables แทน config.json
export WP_URL="https://yoursite.com"
export WP_USERNAME="admin"
export WP_PASSWORD="xxxx xxxx xxxx xxxx"
export PORT=3002
export DEBUG=false
```

## 📈 Performance Tips

1. **ปรับแต่ง Rate Limiting**
   ```json
   {
     "scraping": {
       "delayBetweenRequests": 2000,
       "maxConcurrentRequests": 3
     }
   }
   ```

2. **Optimize Image Processing**
   ```json
   {
     "wordpress": {
       "uploadImages": true,
       "imageQuality": 80,
       "maxImageSize": "1024x768"
     }
   }
   ```

3. **Database Cleanup**
   ```bash
   # ทำความสะอาดข้อมูลเก่าทุกวัน
   crontab -e
   0 2 * * * cd /path/to/app && node news-automation.js --cleanup
   ```

## 🤝 Support

สำหรับการสนับสนุนหรือรายงานปัญหา:
1. ตรวจสอบ logs และ error messages
2. ลองรัน `--status` เพื่อดูสถานะระบบ
3. ตรวจสอบ WordPress REST API connectivity
4. อ่าน troubleshooting section ในเอกสารนี้
