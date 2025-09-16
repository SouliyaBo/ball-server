# ใช้ Node.js 18 เป็น base image
FROM node:18-slim

# ติดตั้ง dependencies ที่จำเป็นสำหรับ Puppeteer และ Chrome
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
    libxss1 \
    libgconf-2-4 \
    libxtst6 \
    libxrandr2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libcairo-gobject2 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0 \
    wget \
    curl \
    gnupg \
    xvfb \
    --no-install-recommends

# ติดตั้ง Google Chrome
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# สร้าง user nodejs และ home directory
RUN groupadd nodejs && useradd -m -g nodejs -G audio,video nodejs \
    && mkdir -p /home/nodejs/.local/share/applications \
    && mkdir -p /home/nodejs/Downloads \
    && mkdir -p /tmp/.X11-unix \
    && chmod 1777 /tmp/.X11-unix \
    && chown -R nodejs:nodejs /home/nodejs \
    && chmod -R 755 /home/nodejs

# ตั้งค่า environment variables สำหรับ Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable \
    DISPLAY=:99 \
    HOME=/home/nodejs

# สร้าง directory สำหรับ app
WORKDIR /usr/src/app

# คัดลอก package files
COPY package*.json ./

# ติดตั้ง dependencies ด้วย npm (เพื่อความเสถียร)
RUN npm ci --only=production

# คัดลอกไฟล์ source code ทั้งหมด
COPY . .

# ตั้งค่า permissions สำหรับ app directory และเปลี่ยนเป็น user nodejs
RUN chown -R nodejs:nodejs /usr/src/app \
    && chmod -R 755 /usr/src/app

USER nodejs

# เปิด port 8080
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# รันแอปพลิเคชันด้วย Xvfb (virtual display)
CMD ["sh", "-c", "Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 & node server.js"]
