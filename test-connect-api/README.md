# Test Connect API

📁 โฟลเดอร์นี้สำหรับทดสอบการเชื่อมต่อ API ของ Football Data Server

## 📋 ไฟล์ในโฟลเดอร์

- `index.html` - หน้าเว็บสำหรับทดสอบ API

## 🚀 วิธีใช้งาน

### 1. เริ่มต้น Server
```bash
# ไปที่โฟลเดอร์หลัก
cd /Users/devbo/Desktop/ball-script

# รัน server
node server.js
```

### 2. เปิดหน้าทดสอบ
- เปิดไฟล์ `index.html` ในเบราว์เซอร์
- หรือใช้ VS Code Simple Browser

### 3. ทดสอบ API

#### 🔗 ฟีเจอร์การทดสอบ:
- **ทดสอบการเชื่อมต่อ** - ตรวจสอบว่า server ตอบสนอง
- **ดูเอกสาร API** - ดึงข้อมูล API endpoints ทั้งหมด
- **ตรวจสุขภาพ Server** - ตรวจสอบสถานะพื้นฐาน
- **สถานะ Server** - ดูข้อมูลละเอียด (uptime, memory, cache)
- **ทดสอบทั้งหมด** - รันการทดสอบทุกอย่างพร้อมกัน

#### 📊 ข้อมูลที่แสดง:
- Response time สำหรับแต่ละ request
- Server uptime
- Memory usage
- Cache entries
- Average response time

## 🌐 API Endpoints ที่ทดสอบ

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API Documentation |
| `/api/test` | GET | Connection Test |
| `/api/health` | GET | Health Check |
| `/api/status` | GET | Server Status |

## 🎯 การใช้งาน

1. **เริ่มต้น**: กดปุ่ม "ทดสอบการเชื่อมต่อ" เพื่อตรวจสอบว่า server ทำงาน
2. **ดูเอกสาร**: กดปุ่ม "ดูเอกสาร API" เพื่อดู endpoints ทั้งหมด
3. **ตรวจสุขภาพ**: กดปุ่ม "ตรวจสุขภาพ Server" เพื่อดูสถานะ
4. **ดูรายละเอียด**: กดปุ่ม "สถานะ Server" เพื่อดูข้อมูลละเอียด
5. **ทดสอบครบ**: กดปุ่ม "ทดสอบทั้งหมด" เพื่อรันทุกการทดสอบ

## 🔧 การแก้ไขปัญหา

### ❌ ไม่สามารถเชื่อมต่อได้
- ตรวจสอบว่า server รันอยู่ที่ port 3001
- ตรวจสอบว่า URL ถูกต้อง: `http://localhost:3001`

### ❌ CORS Error
- Server มี CORS enabled แล้ว
- ตรวจสอบว่า server รันด้วย `node server.js`

### ❌ JSON Parse Error
- ตรวจสอบว่า server ส่ง valid JSON
- ดู console log ใน browser developer tools

## 📝 ตัวอย่างผลลัพธ์

```json
{
  "message": "API Server ทำงานปกติ",
  "timestamp": "2025-09-13T20:37:03.768Z",
  "method": "GET",
  "url": "/api/test"
}
```

## 🎨 Features

- 📱 Responsive design
- 🎯 Real-time testing
- 📊 Performance monitoring
- 🔍 JSON viewer
- ⚡ Fast API calls
- 📈 Statistics display
