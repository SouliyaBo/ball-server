const express = require('express');
const PuppeteerFootballClient = require('./PuppeteerFootballClient');
const PuppeteerProgramScraper = require('./PuppeteerProgramScraper');
const PuppeteerDataExtractor = require('./PuppeteerDataExtractor');

const app = express();
const PORT = 8080;

// Middleware
app.use((req, res, next) => {
    console.log(`📢 API Request: ${req.method} ${req.url}`);
    next();
});

// CORS Middleware สำหรับให้เว็บไซต์อื่นเรียกใช้ได้
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

app.use(express.json());

// สร้าง instances
const apiClient = new PuppeteerFootballClient();
const programScraper = new PuppeteerProgramScraper();
const dataExtractor = new PuppeteerDataExtractor();

// เพิ่ม simple cache
const dataCache = new Map();
const CACHE_DURATION = 2 * 60 * 1000; // 2 นาที

function getCacheKey(endpoint, params) {
    return `${endpoint}_${JSON.stringify(params)}`;
}

function getCachedData(key) {
    const cached = dataCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        console.log(`🚀 ใช้ข้อมูลจาก cache: ${key}`);
        return cached.data;
    }
    return null;
}

function setCachedData(key, data) {
    dataCache.set(key, {
        data: data,
        timestamp: Date.now()
    });
}

// ===== API DOCUMENTATION ENDPOINT =====
app.get('/', (req, res) => {
    res.json({
        name: "Football Data API Server",
        version: "1.0.0",
        description: "API Server สำหรับข้อมูลฟุตบอล",
        endpoints: {
            "JSON_DATA_EXTRACTION": {
                "GET /api/data/matches/today": "ดึงข้อมูลแมตช์วันนี้เป็น JSON",
                "GET /api/data/matches/date/{offset}": "ดึงข้อมูลแมตช์ตามวันที่ (offset = จำนวนวันจากวันนี้)",
                "GET /api/data/matches/upcoming?days={n}": "ดึงข้อมูลแมตช์ข้างหน้า n วัน"
            },
            "HEALTH_ENDPOINTS": {
                "GET /api/health": "ตรวจสอบสถานะ server",
                "GET /api/status": "สถานะละเอียด"
            }
        },
        examples: {
            "ดึงแมตช์วันนี้": "GET /api/data/matches/today",
            "ดึงแมตช์พรุ่งนี้": "GET /api/data/matches/date/1",
            "ดึงแมตช์ 3 วันข้างหน้า": "GET /api/data/matches/date/3"
        },
        usage: "เรียกใช้ API endpoints เหล่านี้เพื่อดึงข้อมูลฟุตบอล",
        cors: "รองรับ CORS - สามารถเรียกใช้จากเว็บไซต์อื่นได้",
        cache: "ข้อมูลจะถูก cache ไว้ 2 นาทีเพื่อความเร็ว"
    });
});

// ===== API STATUS & HEALTH CHECK =====
app.get('/api/status', (req, res) => {
    res.json({
        status: "online",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        cache: {
            entries: dataCache.size,
            duration_minutes: CACHE_DURATION / 1000 / 60
        },
        memory: process.memoryUsage()
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        server: "Football Data API",
        version: "1.0.0"
    });
});

// ===== TEST ENDPOINT =====
app.get('/api/test', (req, res) => {
    res.json({
        message: "API Server ทำงานปกติ",
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url
    });
});

// ===== FOOTBALL DATA ENDPOINTS =====
// ดึงข้อมูลแมตช์วันนี้ (Real Data)
app.get('/api/data/matches/today', async (req, res) => {
    try {
        const cacheKey = getCacheKey('matches_today', {});
        let cachedData = getCachedData(cacheKey);

        if (cachedData) {
            return res.json(cachedData);
        }

        console.log('🔍 กำลังดึงข้อมูลแมตช์วันนี้จากเว็บไซต์จริง...');

        // ใช้ dataExtractor เพื่อดึงข้อมูลจริง
        const extractResult = await dataExtractor.extractMatchData();

        if (extractResult.success && extractResult.matches) {
            // แปลงข้อมูลให้เป็นรูปแบบที่ API ต้องการ
            const processedMatches = extractResult.matches.map((match, index) => ({
                id: index + 1,
                homeTeam: match.homeTeam.name || 'ทีมเหย้า',
                awayTeam: match.awayTeam.name || 'ทีมเยือน',
                time: match.time || 'TBD',
                date: match.date || new Date().toISOString().split('T')[0],
                league: match.league || 'ไม่ระบุลีก',
                matchUrl: match.matchUrl || '',
                homeTeamLogo: match.homeTeam.logo || '',
                awayTeamLogo: match.awayTeam.logo || ''
            }));

            const response = {
                success: true,
                date: new Date().toISOString().split('T')[0],
                totalMatches: processedMatches.length,
                matches: processedMatches,
                timestamp: new Date().toISOString(),
                source: 'real-time-extraction',
                extractedAt: extractResult.extractedAt
            };

            setCachedData(cacheKey, response);
            res.json(response);
        } else {
            throw new Error(extractResult.error || 'ไม่สามารถดึงข้อมูลได้');
        }

    } catch (error) {
        console.error('❌ Error fetching today matches:', error.message);
        res.status(500).json({
            success: false,
            error: 'ไม่สามารถดึงข้อมูลแมตช์วันนี้ได้',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ดึงข้อมูลแมตช์ตามวันที่ (Real Data)
app.get('/api/data/matches/date/:offset', async (req, res) => {
    try {
        const offset = parseInt(req.params.offset) || 0;
        const cacheKey = getCacheKey('matches_date', { offset });
        let cachedData = getCachedData(cacheKey);

        if (cachedData) {
            return res.json(cachedData);
        }

        console.log(`🔍 กำลังดึงข้อมูลแมตช์วันที่ ${offset} วันจากวันนี้จากเว็บไซต์จริง...`);

        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + offset);

        // ใช้ dataExtractor เพื่อดึงข้อมูลจริงตามวันที่
        const extractResult = await dataExtractor.extractMatchesByDate(offset);

        if (extractResult.success && extractResult.matches) {
            // แปลงข้อมูลให้เป็นรูปแบบที่ API ต้องการ
            const processedMatches = extractResult.matches.map((match, index) => ({
                id: index + 1,
                homeTeam: match.homeTeam.name || 'ทีมเหย้า',
                awayTeam: match.awayTeam.name || 'ทีมเยือน',
                time: match.time || 'TBD',
                date: match.date || targetDate.toISOString().split('T')[0],
                league: match.league || 'ไม่ระบุลีก',
                matchUrl: match.matchUrl || '',
                homeTeamLogo: match.homeTeam.logo || '',
                awayTeamLogo: match.awayTeam.logo || ''
            }));

            const response = {
                success: true,
                date: targetDate.toISOString().split('T')[0],
                offset: offset,
                totalMatches: processedMatches.length,
                matches: processedMatches,
                timestamp: new Date().toISOString(),
                source: 'real-time-extraction',
                extractedAt: extractResult.extractedAt
            };

            setCachedData(cacheKey, response);
            res.json(response);
        } else {
            throw new Error(extractResult.error || 'ไม่สามารถดึงข้อมูลได้');
        }

    } catch (error) {
        console.error('❌ Error fetching matches by date:', error.message);
        res.status(500).json({
            success: false,
            error: 'ไม่สามารถดึงข้อมูลแมตช์ตามวันที่ได้',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// เริ่มเซิร์ฟเวอร์
app.listen(PORT, () => {
    console.log('');
    console.log('🚀 Football Data API Server (Simple) เริ่มทำงานแล้ว!');
    console.log('');
    console.log(`🌐 API Endpoint: http://localhost:${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`📊 Status: http://localhost:${PORT}/api/status`);
    console.log(`🧪 Test: http://localhost:${PORT}/api/test`);
    console.log('');
    console.log('⚡ Features:');
    console.log('   • CORS enabled - เรียกใช้จากเว็บไซต์อื่นได้');
    console.log('   • Auto Cache - ข้อมูลถูก cache 2 นาที');
    console.log('   • Pure API server');
    console.log('   • Real-time data extraction');
    console.log('');
});

module.exports = app;
