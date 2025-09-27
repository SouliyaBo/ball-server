# 🏈 Football Data API Server

Real-time football match data extraction API server รองรับทั้ง macOS และ Ubuntu

## 📋 Prerequisites

### Ubuntu/Linux
- Ubuntu 18.04+ or similar Linux distribution
- Node.js 18.0.0+
- Google Chrome (จะติดตั้งอัตโนมัติ)

### macOS
- macOS 10.14+
- Node.js 18.0.0+
- Google Chrome

## 🚀 Quick Start (Ubuntu)

### วิธี 1: ใช้ Setup Script (แนะนำ)
```bash
# Clone repository
git clone https://github.com/SouliyaBo/ball-server.git
cd ball-server

# รัน setup script สำหรับ Ubuntu
chmod +x ubuntu-setup.sh
./ubuntu-setup.sh

# รัน server
npm start
```

### วิธี 2: Manual Installation
```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install Google Chrome
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'
sudo apt update
sudo apt install -y google-chrome-stable

# 4. Install dependencies
sudo apt install -y \
    libasound2 libatk1.0-0 libcairo-gobject2 \
    libcups2 libdbus-1-3 libexpat1 libfontconfig1 \
    libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 \
    libgtk-3-0 libnspr4 libpango-1.0-0 libxss1 \
    fonts-liberation libappindicator1 libnss3 \
    lsb-release xdg-utils

# 5. Clone และ install
git clone https://github.com/SouliyaBo/ball-server.git
cd ball-server
npm install

# 6. รัน server
npm start
```

## 🔧 การใช้งาน

### รัน Server
```bash
# Development mode
npm run dev

# Production mode
npm start

# Test extractor
npm test
```

### PM2 (Production)
```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
npm run pm2:start

# Check status
pm2 status

# View logs
npm run pm2:logs

# Restart
npm run pm2:restart

# Stop
npm run pm2:stop
```

## 🌐 API Endpoints

- **Health Check:** `GET /api/health`
- **Server Status:** `GET /api/status`
- **Today's Matches:** `GET /api/data/matches/today`
- **API Documentation:** `GET /`

### ตัวอย่างการใช้งาน
```bash
# Health check
curl http://localhost:8080/api/health

# ดึงข้อมูลแมตช์วันนี้
curl http://localhost:8080/api/data/matches/today | jq .

# ตรวจสอบสถานะ server
curl http://localhost:8080/api/status
```

## 📊 Response Format

```json
{
  "success": true,
  "date": "2025-09-28",
  "totalMatches": 409,
  "matches": [
    {
      "id": 1,
      "homeTeam": "Liverpool",
      "awayTeam": "Manchester City",
      "time": "18:30",
      "date": "28/09/2025",
      "league": "Premier League",
      "homeTeamLogo": "https://...",
      "awayTeamLogo": "https://..."
    }
  ],
  "timestamp": "2025-09-28T10:00:00.000Z"
}
```

## 🚀 วิธีติดตั้ง

1. ติดตั้ง dependencies:

```bash
npm install puppeteer-extra puppeteer-extra-plugin-stealth
```

2. รันสคริปต์:

```bash
node app.js
```

## 📖 วิธีใช้งาน

### การใช้งานแบบง่าย

```bash
# แสดงเมนู
node app.js

# ดูผลการแข่งขันวันนี้
node app.js 1

# ค้นหาการแข่งขันของทีม
node app.js 5 Arsenal

# แสดงสถิติ
node app.js 7
```

## ✨ ฟีเจอร์หลัก

- ✅ ดูผลการแข่งขันแบบเรียลไทม์
- ✅ ค้นหาการแข่งขันของทีมเฉพาะ
- ✅ แสดงผลแบบตารางสวยงาม พร้อมสีสัน
- ✅ รองรับธงชาติของทีม
- ✅ แสดงสถานะการแข่งขัน (ยังไม่เริ่ม, กำลังแข่ง, จบแล้ว)
- ✅ รองรับวันที่แบบไทย
- ✅ สถิติการแข่งขันแบบละเอียด
- ✅ บันทึกข้อมูลเป็นไฟล์ JSON และ CSV
- ✅ สร้างรายงานสรุป

## 🎯 สิ่งที่สำเร็จแล้ว

1. ✅ **เปลี่ยน URL สำเร็จ** - จาก baan-ball.com เป็น football-dw3.pages.dev
2. ✅ **พบ API endpoints ที่ใช้งานได้** - ดึงข้อมูลผลบอลได้แบบเรียลไทม์
3. ✅ **สร้างระบบแสดงผลสวยงาม** - คล้ายรูปที่คุณต้องการ
4. ✅ **เพิ่มฟีเจอร์ค้นหาทีม** - หาประวัติการแข่งขันของทีมเฉพาะ
5. ✅ **สร้างระบบสถิติ** - วิเคราะห์ข้อมูลการแข่งขัน
6. ✅ **บันทึกข้อมูล** - เก็บข้อมูลเป็นไฟล์ JSON/CSV
7. ✅ **ระบบเมนูครบครัน** - ใช้งานง่าย มีสีสัน

## วิธีติดตั้ง

1. ติดตั้ง dependencies:
```bash
npm install puppeteer-extra puppeteer-extra-plugin-stealth
```

2. รันสคริปต์:
```bash
node menu.js
```

## วิธีใช้งาน

### การใช้งานพื้นฐาน
```bash
# ดูผลการแข่งขันวันนี้
node menu.js 1

# ดูผลการแข่งขันเมื่อวาน
node menu.js 2

# ดูผลการแข่งขัน 3 วันย้อนหลัง
node menu.js 3

# ดูผลการแข่งขัน 7 วันย้อนหลัง
node menu.js 4

# ค้นหาการแข่งขันของทีม
node menu.js 5 Arsenal

# ดูการแข่งขันสำคัญ
node menu.js 6

# ดูสถิติ
node menu.js stats
```

### การใช้งานขั้นสูง
```javascript
const FootballExtractor = require('./FootballExtractor');

async function customUsage() {
    const extractor = new FootballExtractor();
    await extractor.init();

    // ดูผลการแข่งขันวันที่กำหนด
    const matches = await extractor.getMatchesForDate('2025-09-10');

    // ค้นหาทีม
    const teamMatches = await extractor.searchTeamMatches('Barcelona', 30);

    await extractor.close();
}
```

## ฟีเจอร์หลัก

- ✅ ดูผลการแข่งขันแบบเรียลไทม์
- ✅ ค้นหาการแข่งขันของทีมเฉพาะ
- ✅ แสดงผลแบบตารางสวยงาม
- ✅ รองรับธงชาติของทีม
- ✅ แสดงสถานะการแข่งขัน (ยังไม่เริ่ม, กำลังแข่ง, จบแล้ว)
- ✅ รองรับวันที่แบบไทย
- ✅ สถิติการแข่งขัน

## API Endpoints ที่ใช้

- `/api/livescore/leagues` - ข้อมูลลีก
- `/api/livescore/states` - สถานะการแข่งขัน
- `/api/fixtures/between/{startDate}/{endDate}` - ข้อมูลการแข่งขัน

## ตัวอย่างผลลัพธ์

```
📅 ผลบอลสดวันนี้
10 ก.ย. 68
────────────────────────────────────────────────────────────────────────────────

13:00     🇪🇨 Ecuador                        1 - 0    FT
         🇦🇷 Argentina                               FT

13:30     🇵🇪 Peru                           0 - 1    FT
         🇵🇾 Paraguay                                FT

────────────────────────────────────────────────────────────────────────────────
📊 รวม 2 การแข่งขัน | มุมมอง: ผลการแข่งขัน | เวลา: 00:47:13
```

## ไฟล์ในโปรเจค

- `FootballExtractor.js` - คลาสหลักสำหรับดึงข้อมูล
- `menu.js` - เมนูสำหรับใช้งาน
- `test-api.js` - ทดสอบ API
- `analyze-football.js` - วิเคราะห์เว็บ
- `screenshot.js` - สคริปต์เดิม

## หมายเหตุ

- ใช้ Puppeteer เพื่อหลีกเลี่ยงการถูกบล็อกจากเว็บไซต์
- ข้อมูลมาจาก API ของ football-dw3.pages.dev
- รองรับการแสดงผลในภาษาไทย
