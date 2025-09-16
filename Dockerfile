# ใช้ Node.js 18 เป็น base image
FROM node:18-slim

# ติดตั้ง dependencies ที่จำเป็นสำหรับ Puppeteer
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libnss3 \
    libnspr4 \
    libdbus-1-3 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libatspi2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libxkbcommon0 \
    wget \
    gnupg \
    --no-install-recommends

# ติดตั้ง Google Chrome
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# ตั้งค่า environment variables สำหรับ Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# สร้าง directory สำหรับ app
WORKDIR /usr/src/app

# คัดลอก package files
COPY package*.json ./

# ติดตั้ง dependencies ด้วย npm (เพื่อความเสถียร)
RUN npm ci --only=production

# คัดลอกไฟล์ source code ทั้งหมด
COPY . .

# สร้าง user ที่ไม่ใช่ root เพื่อความปลอดภัย
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs
RUN chown -R nodejs:nodejs /usr/src/app
USER nodejs

# เปิด port 8080
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "const http = require('http'); \
    const req = http.request('http://localhost:8080/api/health', (res) => { \
    process.exit(res.statusCode === 200 ? 0 : 1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.end();"

# รันแอปพลิเคชัน
CMD ["node", "server.js"]
