#!/usr/bin/env node

const NewsAutomation = require('./NewsAutomation');
const express = require('express');
const cron = require('node-cron');

// สร้าง Express app สำหรับ API และ monitoring
const app = express();
app.use(express.json());

// สร้าง NewsAutomation instance
const newsAutomation = new NewsAutomation('./config.json');
let isInitialized = false;

// Initialize system
async function initializeSystem() {
    try {
        await newsAutomation.init();
        isInitialized = true;
        console.log('✅ ระบบพร้อมใช้งาน');

        // ตั้งค่า cron job ถ้าเปิดใช้งาน
        setupSchedule();

    } catch (error) {
        console.error('❌ การเริ่มต้นระบบล้มเหลว:', error.message);
        process.exit(1);
    }
}

// ตั้งค่า cron schedule
function setupSchedule() {
    const config = require('./config.json');

    if (config.automation.enabled && config.automation.schedule.enabled) {
        console.log(`⏰ ตั้งค่า Schedule: ${config.automation.schedule.cron}`);

        cron.schedule(config.automation.schedule.cron, async () => {
            console.log('\n🔔 เริ่มการทำงานตามตารางเวลา...');
            try {
                await newsAutomation.runScrapeAndPublish();
            } catch (error) {
                console.error('❌ Scheduled run failed:', error.message);
            }
        }, {
            timezone: config.automation.schedule.timezone
        });

        console.log('📅 Schedule ถูกตั้งค่าแล้ว');
    }
}

// API Endpoints

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        initialized: isInitialized,
        timestamp: new Date().toISOString()
    });
});

// Get status
app.get('/status', async (req, res) => {
    try {
        if (!isInitialized) {
            return res.status(503).json({ error: 'System not initialized' });
        }

        const status = await newsAutomation.getStatus();
        res.json(status);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Manual run
app.post('/run', async (req, res) => {
    try {
        if (!isInitialized) {
            return res.status(503).json({ error: 'System not initialized' });
        }

        console.log('🎯 การเริ่มต้นแบบ Manual...');
        const result = await newsAutomation.runScrapeAndPublish();

        res.json({
            success: true,
            message: 'Automation run completed',
            result: result
        });

    } catch (error) {
        console.error('❌ Manual run failed:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Cleanup
app.post('/cleanup', async (req, res) => {
    try {
        if (!isInitialized) {
            return res.status(503).json({ error: 'System not initialized' });
        }

        const removedCount = await newsAutomation.cleanup();

        res.json({
            success: true,
            message: `Cleaned up ${removedCount} old records`
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// CLI Arguments handling
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🤖 News Automation System

Usage:
  node news-automation.js [options]

Options:
  --run, -r          รันการดึงและโพสต์ข่าวทันที
  --status, -s       แสดงสถานะระบบ
  --cleanup, -c      ทำความสะอาดข้อมูลเก่า
  --server, -sv      เริ่ม API server (default)
  --help, -h         แสดงวิธีการใช้งาน

API Endpoints:
  GET  /health       - Health check
  GET  /status       - ดูสถานะระบบ
  POST /run          - รันแบบ manual
  POST /cleanup      - ทำความสะอาดข้อมูล

Examples:
  node news-automation.js --run
  node news-automation.js --status
  node news-automation.js --server
    `);
    process.exit(0);
}

// Main execution
async function main() {
    console.log('🤖 News Automation System Starting...');
    console.log('==========================================');

    await initializeSystem();

    if (args.includes('--run') || args.includes('-r')) {
        // รันทันที
        console.log('🎯 รันการดึงและโพสต์ข่าวทันที...');
        try {
            const result = await newsAutomation.runScrapeAndPublish();
            console.log('✅ การดำเนินการเสร็จสิ้น');
            process.exit(0);
        } catch (error) {
            console.error('❌ การดำเนินการล้มเหลว:', error.message);
            process.exit(1);
        }

    } else if (args.includes('--status') || args.includes('-s')) {
        // แสดงสถานะ
        try {
            const status = await newsAutomation.getStatus();
            console.log('\n📊 สถานะระบบ:');
            console.log('==========================================');
            console.log(`Running: ${status.isRunning ? '✅' : '❌'}`);
            console.log(`Total Published: ${status.stats.totalPublished}`);
            console.log(`Total Scraped: ${status.stats.totalScraped}`);
            console.log(`Last Scrape: ${status.stats.lastScrape || 'Never'}`);
            console.log(`WordPress Site: ${status.config.wpSite}`);
            console.log(`Max News Per Run: ${status.config.maxNewsPerRun}`);

            if (status.recentNews.length > 0) {
                console.log('\n📰 ข่าวล่าสุด:');
                status.recentNews.forEach((news, index) => {
                    console.log(`${index + 1}. ${news.title.substring(0, 60)}...`);
                });
            }

            process.exit(0);
        } catch (error) {
            console.error('❌ ไม่สามารถดูสถานะได้:', error.message);
            process.exit(1);
        }

    } else if (args.includes('--cleanup') || args.includes('-c')) {
        // ทำความสะอาด
        try {
            const removedCount = await newsAutomation.cleanup();
            console.log(`✅ ทำความสะอาดเสร็จสิ้น: ลบ ${removedCount} รายการ`);
            process.exit(0);
        } catch (error) {
            console.error('❌ การทำความสะอาดล้มเหลว:', error.message);
            process.exit(1);
        }

    } else {
        // เริ่ม API server (default)
        const PORT = process.env.PORT || 3002;
        app.listen(PORT, () => {
            console.log(`\n🌐 API Server เริ่มทำงานที่ port ${PORT}`);
            console.log('==========================================');
            console.log(`Health Check: http://localhost:${PORT}/health`);
            console.log(`Status: http://localhost:${PORT}/status`);
            console.log(`Manual Run: POST http://localhost:${PORT}/run`);
            console.log('==========================================');
            console.log('กด Ctrl+C เพื่อหยุดการทำงาน');
        });
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 กำลังหยุดการทำงาน...');
    try {
        await newsAutomation.cleanup();
        console.log('✅ หยุดการทำงานเรียบร้อย');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error.message);
        process.exit(1);
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// เริ่มการทำงาน
main().catch(error => {
    console.error('❌ Main execution failed:', error);
    process.exit(1);
});
