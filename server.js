const express = require('express');
const path = require('path');
const PuppeteerFootballClient = require('./PuppeteerFootballClient');
const PuppeteerProgramScraper = require('./PuppeteerProgramScraper');
const PuppeteerDataExtractor = require('./PuppeteerDataExtractor');

const app = express();
const PORT = 3000;

// Middleware
app.use((req, res, next) => {
    console.log(`📢 Request: ${req.method} ${req.url}`);
    next();
});
app.use(express.static('public'));
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

// Route สำหรับหน้าหลัก
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route สำหรับหน้าโปรแกรมบอล
app.get('/program', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'program.html'));
});

// ===== New JSON Data Extraction Routes =====
// Route สำหรับดึงข้อมูลแมตช์เป็น JSON วันนี้
app.get('/api/data/matches/today', async (req, res) => {
    try {
        const cacheKey = getCacheKey('matches_today', {});
        const cachedResult = getCachedData(cacheKey);

        if (cachedResult) {
            return res.json(cachedResult);
        }

        console.log('📊 กำลังดึงข้อมูลแมตช์วันนี้เป็น JSON...');
        const jsonData = await dataExtractor.extractMatchData();
        console.log(`✅ ดึงข้อมูล JSON สำเร็จ: ${jsonData.totalMatches} แมตช์`);

        // เก็บใน cache
        setCachedData(cacheKey, jsonData);

        // Debug: แสดงตัวอย่างข้อมูลแมตช์แรก
        if (jsonData.matches && jsonData.matches.length > 0) {
            const firstMatch = jsonData.matches[0];
            console.log('🔍 Debug ตัวอย่างแมตช์แรก:', {
                league: firstMatch.league,
                date: firstMatch.date,
                time: firstMatch.time,
                dateTime: firstMatch.dateTime,
                homeTeam: firstMatch.homeTeam?.name,
                awayTeam: firstMatch.awayTeam?.name
            });
        }

        res.json(jsonData);
    } catch (error) {
        console.error('❌ Error extracting today JSON data:', error.message);
        res.status(500).json({
            success: false,
            error: 'ไม่สามารถดึงข้อมูลแมตช์วันนี้เป็น JSON ได้',
            message: error.message,
            matches: []
        });
    }
});

// Route สำหรับดึงข้อมูลแมตช์เป็น JSON ตามวันที่
app.get('/api/data/matches/date/:offset', async (req, res) => {
    try {
        const dateOffset = parseInt(req.params.offset) || 0;
        const cacheKey = getCacheKey('matches_date', { offset: dateOffset });
        const cachedResult = getCachedData(cacheKey);

        if (cachedResult) {
            return res.json(cachedResult);
        }

        console.log(`📊 กำลังดึงข้อมูลแมตช์เป็น JSON สำหรับ offset ${dateOffset} วัน...`);
        const jsonData = await dataExtractor.extractMatchesByDate(dateOffset);
        console.log(`✅ ดึงข้อมูล JSON สำเร็จ: ${jsonData.totalMatches} แมตช์`);

        // เก็บใน cache
        setCachedData(cacheKey, jsonData);

        res.json(jsonData);
    } catch (error) {
        console.error('❌ Error extracting JSON data by date:', error.message);
        res.status(500).json({
            success: false,
            error: 'ไม่สามารถดึงข้อมูลแมตช์เป็น JSON ได้',
            message: error.message,
            matches: []
        });
    }
});

// Route สำหรับดึงข้อมูลแมตช์เป็น JSON ข้างหน้า
app.get('/api/data/matches/upcoming', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 1;
        console.log(`📊 กำลังดึงข้อมูลแมตช์เป็น JSON สำหรับ ${days} วันข้างหน้า...`);
        const jsonData = await dataExtractor.extractMatchesByDate(days);
        console.log(`✅ ดึงข้อมูล JSON สำเร็จ: ${jsonData.totalMatches} แมตช์`);
        res.json(jsonData);
    } catch (error) {
        console.error('❌ Error extracting upcoming JSON data:', error.message);
        res.status(500).json({
            success: false,
            error: 'ไม่สามารถดึงข้อมูลแมตช์ข้างหน้าเป็น JSON ได้',
            message: error.message,
            matches: []
        });
    }
});

// ===== Program Scraper Routes (HTML Direct) =====
// Route สำหรับ scrape HTML โปรแกรมวันนี้
app.get('/api/program/today', async (req, res) => {
    try {
        console.log('🌐 กำลัง scrape HTML โปรแกรมวันนี้จากเว็บเป้าหมาย...');
        const htmlData = await programScraper.getTodayHTML();
        console.log(`✅ Scrape HTML สำเร็จ: ได้ ${htmlData.html.length} characters`);
        res.json(htmlData);
    } catch (error) {
        console.error('❌ Error scraping today HTML:', error.message);
        res.status(500).json({
            error: 'ไม่สามารถ scrape HTML โปรแกรมวันนี้ได้',
            message: error.message
        });
    }
});

// Route สำหรับ scrape HTML โปรแกรมวันข้างหน้า
app.get('/api/program/upcoming', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 1;
        console.log(`🌐 กำลัง scrape HTML โปรแกรม ${days} วันข้างหน้าจากเว็บเป้าหมาย...`);
        const htmlData = await programScraper.getUpcomingHTML(days);
        console.log(`✅ Scrape HTML สำเร็จ: ได้ ${htmlData.html.length} characters`);
        res.json(htmlData);
    } catch (error) {
        console.error('❌ Error scraping upcoming HTML:', error.message);
        res.status(500).json({
            error: 'ไม่สามารถ scrape HTML โปรแกรมข้างหน้าได้',
            message: error.message
        });
    }
});

// Route สำหรับ scrape HTML โปรแกรมวันที่เฉพาะ
app.get('/api/program/date/:offset', async (req, res) => {
    try {
        const dateOffset = parseInt(req.params.offset) || 0;
        console.log(`🌐 กำลัง scrape HTML โปรแกรมวันที่ offset ${dateOffset} จากเว็บเป้าหมาย...`);
        const htmlData = await programScraper.getDateHTML(dateOffset);
        console.log(`✅ Scrape HTML สำเร็จ: ได้ ${htmlData.html.length} characters`);
        res.json(htmlData);
    } catch (error) {
        console.error('❌ Error scraping HTML by date:', error.message);
        res.status(500).json({
            error: 'ไม่สามารถ scrape HTML โปรแกรมวันที่ได้',
            message: error.message
        });
    }
});

// ===== Original API Routes (Keep for backward compatibility) =====

// API Routes
app.get('/api/matches/today', async (req, res) => {
    try {
        console.log('🔄 กำลังดึงข้อมูลแมตช์วันนี้...');

        const today = new Date().toISOString().split('T')[0];
        const matches = await apiClient.getMatchesForDate(today);

        console.log(`✅ พบ ${matches.length} แมตช์วันนี้`);
        res.json(matches);
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            error: 'ไม่สามารถดึงข้อมูลแมตช์ได้',
            message: error.message
        });
    }
});

app.get('/api/matches/live', async (req, res) => {
    try {
        console.log('🔄 กำลังดึงข้อมูลแมตช์สด...');

        const liveMatches = await apiClient.getLiveMatches();

        console.log(`✅ พบ ${liveMatches.length} แมตช์สด`);
        res.json(liveMatches);
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            error: 'ไม่สามารถดึงข้อมูลแมตช์สดได้',
            message: error.message
        });
    }
});

app.get('/api/matches/upcoming', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        console.log(`📅 กำลังดึงข้อมูลแมตช์ ${days} วันข้างหน้า...`);

        const upcomingMatches = await apiClient.getUpcomingMatches(days);

        console.log(`✅ พบ ${upcomingMatches.length} แมตช์ข้างหน้า`);
        res.json(upcomingMatches);
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลแมตช์ข้างหน้าได้' });
    }
});

app.get('/api/matches/next-week', async (req, res) => {
    try {
        console.log('📅 กำลังดึงข้อมูลแมตช์สัปดาห์หน้า...');

        const nextWeekMatches = await apiClient.getNextWeekMatches();

        console.log(`✅ พบ ${nextWeekMatches.length} แมตช์สัปดาห์หน้า`);
        res.json(nextWeekMatches);
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลแมตช์สัปดาห์หน้าได้' });
    }
});

// API สำหรับดึงการแข่งขันจัดกลุ่มตามลีก - วันนี้
app.get('/api/matches/today/by-league', async (req, res) => {
    try {
        console.log('📊 กำลังดึงข้อมูลการแข่งขันวันนี้จัดกลุ่มตามลีก...');

        const groupedData = await apiClient.getTodayMatchesGroupedByLeague();

        console.log(`✅ จัดกลุ่มได้ ${groupedData.leagueGroups.length} ลีก (${groupedData.totalMatches} คู่)`);
        res.json(groupedData);
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            error: 'ไม่สามารถดึงข้อมูลการแข่งขันจัดกลุ่มตามลีกได้',
            message: error.message
        });
    }
});

// API สำหรับดึงการแข่งขันจัดกลุ่มตามลีก - วันที่กำหนด
app.get('/api/matches/:date/by-league', async (req, res) => {
    try {
        const date = req.params.date;
        console.log(`📊 กำลังดึงข้อมูลการแข่งขัน ${date} จัดกลุ่มตามลีก...`);

        const groupedData = await apiClient.getDateMatchesGroupedByLeague(date);

        console.log(`✅ จัดกลุ่มได้ ${groupedData.leagueGroups.length} ลีก (${groupedData.totalMatches} คู่)`);
        res.json(groupedData);
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            error: 'ไม่สามารถดึงข้อมูลการแข่งขันจัดกลุ่มตามลีกได้',
            message: error.message
        });
    }
});

// API สำหรับดึงการแข่งขันจัดกลุ่มตามลีก - ช่วงวันที่
app.get('/api/matches/between/:fromDate/:toDate/by-league', async (req, res) => {
    try {
        const { fromDate, toDate } = req.params;
        console.log(`📊 กำลังดึงข้อมูลการแข่งขัน ${fromDate} ถึง ${toDate} จัดกลุ่มตามลีก...`);

        const groupedData = await apiClient.getMatchesGroupedByLeague(fromDate, toDate);

        console.log(`✅ จัดกลุ่มได้ ${groupedData.leagueGroups.length} ลีก (${groupedData.totalMatches} คู่)`);
        res.json(groupedData);
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            error: 'ไม่สามารถดึงข้อมูลการแข่งขันจัดกลุ่มตามลีกได้',
            message: error.message
        });
    }
});

// API สำหรับดึงแมตช์ที่ยังไม่เริ่ม (SCHEDULED) จัดกลุ่มตามลีก - วันนี้
app.get('/api/matches/today/scheduled/by-league', async (req, res) => {
    try {
        console.log('📅 กำลังดึงข้อมูลแมตช์ที่ยังไม่เริ่มวันนี้จัดกลุ่มตามลีก...');

        const groupedData = await apiClient.getTodayScheduledMatchesGroupedByLeague();

        console.log(`✅ จัดกลุ่มได้ ${groupedData.leagueGroups.length} ลีก (${groupedData.scheduledMatches}/${groupedData.totalMatches} คู่ที่ยังไม่เริ่ม)`);
        res.json(groupedData);
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            error: 'ไม่สามารถดึงข้อมูลแมตช์ที่ยังไม่เริ่มได้',
            message: error.message
        });
    }
});

// API สำหรับดึงแมตช์ที่ยังไม่เริ่ม - สัปดาห์หน้า
app.get('/api/matches/upcoming/scheduled/by-league', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        console.log(`📅 กำลังดึงข้อมูลแมตช์ที่ยังไม่เริ่ม ${days} วันข้างหน้าจัดกลุ่มตามลีก...`);

        const groupedData = await apiClient.getUpcomingScheduledMatchesGroupedByLeague(days);

        console.log(`✅ จัดกลุ่มได้ ${groupedData.leagueGroups.length} ลีก (${groupedData.scheduledMatches}/${groupedData.totalMatches} คู่ที่ยังไม่เริ่ม)`);
        res.json(groupedData);
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            error: 'ไม่สามารถดึงข้อมูลแมตช์ที่ยังไม่เริ่มข้างหน้าได้',
            message: error.message
        });
    }
});

// API สำหรับดึงแมตช์ที่ยังไม่เริ่ม - ช่วงวันที่กำหนด
app.get('/api/matches/between/:fromDate/:toDate/scheduled/by-league', async (req, res) => {
    try {
        const { fromDate, toDate } = req.params;
        console.log(`📅 กำลังดึงข้อมูลแมตช์ที่ยังไม่เริ่ม ${fromDate} ถึง ${toDate} จัดกลุ่มตามลีก...`);

        const groupedData = await apiClient.getScheduledMatchesGroupedByLeague(fromDate, toDate);

        console.log(`✅ จัดกลุ่มได้ ${groupedData.leagueGroups.length} ลีก (${groupedData.scheduledMatches}/${groupedData.totalMatches} คู่ที่ยังไม่เริ่ม)`);
        res.json(groupedData);
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            error: 'ไม่สามารถดึงข้อมูลแมตช์ที่ยังไม่เริ่มได้',
            message: error.message
        });
    }
});

app.get('/api/leagues', async (req, res) => {
    try {
        console.log('🏆 กำลังดึงข้อมูลลีกทั้งหมด...');

        const leagues = await apiClient.getLeagues();

        console.log(`✅ พบ ${leagues.length} ลีก`);
        res.json(leagues);
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            error: 'ไม่สามารถดึงข้อมูลลีกได้',
            message: error.message
        });
    }
});

app.get('/api/leagues/top', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        console.log(`🏆 กำลังดึงข้อมูลลีกยอดนิยม ${limit} อันดับแรก...`);

        const topLeagues = await apiClient.getTopLeagues(limit);

        console.log(`✅ พบ ${topLeagues.length} ลีกยอดนิยม`);
        res.json(topLeagues);
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            error: 'ไม่สามารถดึงข้อมูลลีกยอดนิยมได้',
            message: error.message
        });
    }
});

// API สำหรับค้นหาลีกตาม ID
app.get('/api/leagues/:id', async (req, res) => {
    try {
        const leagueId = req.params.id;
        console.log(`🔍 กำลังค้นหาลีก ID: ${leagueId}`);

        const league = await apiClient.getLeagueById(leagueId);

        if (league) {
            console.log(`✅ พบลีก: ${league.name}`);
            res.json(league);
        } else {
            res.status(404).json({ error: `ไม่พบลีก ID: ${leagueId}` });
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            error: 'ไม่สามารถค้นหาลีกได้',
            message: error.message
        });
    }
});

// API สำหรับค้นหาลีกตามชื่อ
app.get('/api/leagues/search/:term', async (req, res) => {
    try {
        const searchTerm = req.params.term;
        const limit = parseInt(req.query.limit) || 10;
        console.log(`🔍 กำลังค้นหาลีก: "${searchTerm}"`);

        const results = await apiClient.searchLeagues(searchTerm, limit);

        console.log(`✅ พบ ${results.length} ลีกที่ตรงกับ "${searchTerm}"`);
        res.json(results);
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            error: 'ไม่สามารถค้นหาลีกได้',
            message: error.message
        });
    }
});

// API สำหรับดึงลีกตาม priority
app.get('/api/leagues/priority/:range', async (req, res) => {
    try {
        const range = req.params.range; // เช่น "50-100"
        const limit = parseInt(req.query.limit) || 20;

        let minPriority = 50, maxPriority = 100;
        if (range.includes('-')) {
            const [min, max] = range.split('-').map(n => parseInt(n));
            if (!isNaN(min)) minPriority = min;
            if (!isNaN(max)) maxPriority = max;
        }

        console.log(`🏆 กำลังดึงลีกที่มี priority ${minPriority}-${maxPriority}`);
        const leagues = await apiClient.getLeaguesByPriority(minPriority, maxPriority, limit);

        console.log(`✅ พบ ${leagues.length} ลีกในช่วง priority ที่กำหนด`);
        res.json(leagues);
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            error: 'ไม่สามารถดึงลีกตาม priority ได้',
            message: error.message
        });
    }
});

// API สำหรับข้อมูล cache
app.get('/api/leagues/cache/info', async (req, res) => {
    try {
        const cacheInfo = apiClient.getCacheInfo();
        res.json(cacheInfo);
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            error: 'ไม่สามารถดึงข้อมูล cache ได้',
            message: error.message
        });
    }
});

// API สำหรับล้าง cache
app.post('/api/leagues/cache/clear', async (req, res) => {
    try {
        apiClient.clearLeaguesCache();
        console.log('✅ ล้าง cache ลีกเรียบร้อย');
        res.json({ message: 'ล้าง cache เรียบร้อย' });
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            error: 'ไม่สามารถล้าง cache ได้',
            message: error.message
        });
    }
});

app.get('/api/search/:teamName', async (req, res) => {
    try {
        const teamName = req.params.teamName;
        console.log(`🔍 กำลังค้นหาทีม: ${teamName}`);

        const teamMatches = await apiClient.searchTeam(teamName);
        console.log(`✅ พบ ${teamMatches.length} แมตช์ของทีม ${teamName}`);

        res.json(teamMatches);
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            error: 'ไม่สามารถค้นหาทีมได้',
            message: error.message
        });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        console.log('📊 กำลังสร้างรายงานสถิติ...');

        const stats = await apiClient.getStats();
        console.log('✅ สร้างรายงานสถิติเสร็จสิ้น');

        res.json(stats);
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            error: 'ไม่สามารถสร้างรายงานสถิติได้',
            message: error.message
        });
    }
});

app.get('/api/export', async (req, res) => {
    try {
        console.log('💾 กำลังส่งออกข้อมูล...');

        const today = new Date().toISOString().split('T')[0];
        const matches = await apiClient.getMatchesForDate(today);
        console.log('✅ ส่งออกข้อมูลเสร็จสิ้น');

        const exportData = {
            date: new Date().toISOString().split('T')[0],
            totalMatches: matches.length,
            matches: matches,
            timestamp: new Date().toISOString()
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=football-data-${exportData.date}.json`);
        res.json(exportData);
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            error: 'ไม่สามารถส่งออกข้อมูลได้',
            message: error.message
        });
    }
});

// Error handler
app.use((error, req, res, next) => {
    console.error('Server Error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'ไม่พบหน้าที่ต้องการ' });
});

// เริ่มเซิร์ฟเวอร์
app.listen(PORT, () => {
    console.log('');
    console.log('🚀 เซิร์ฟเวอร์เริ่มทำงานแล้ว!');
    console.log('');
    console.log('🌐 เปิดเว็บไซต์ที่: http://localhost:3000');
    console.log('');
    console.log('📱 Features:');
    console.log('   • ดูแมตช์วันนี้แบบเรียลไทม์');
    console.log('   • ดูแมตช์สด');
    console.log('   • ดูลีกยอดนิยม');
    console.log('   • ค้นหาทีม');
    console.log('   • ดูสถิติ');
    console.log('   • ส่งออกข้อมูล');
    console.log('');
    console.log('⚡ Auto-refresh ทุก 30 วินาที');
    console.log('📱 รองรับ Mobile & Desktop');
    console.log('');

    // เริ่มต้น Puppeteer
    initializePuppeteer();
});

async function initializePuppeteer() {
    try {
        console.log('🚀 เริ่มต้น Puppeteer Browser...');
        await apiClient.init();
        console.log('✅ Puppeteer Browser พร้อมใช้งาน');

        // ทดสอบดึงข้อมูลแมตช์วันนี้
        const today = new Date().toISOString().split('T')[0];
        const matches = await apiClient.getMatchesForDate(today);
        console.log(`✅ พบ ${matches.length} แมตช์วันนี้`);

        // ทดสอบดึงข้อมูลลีก
        const leagues = await apiClient.getTopLeagues(5);
        console.log(`✅ พบ ${leagues.length} ลีกยอดนิยม`);

    } catch (error) {
        console.log('⚠️ เตือน: Puppeteer ไม่สามารถเริ่มต้นได้:', error.message);
        console.log('🔄 ระบบจะใช้ข้อมูลตัวอย่างแทน');
    }
}

module.exports = app;
