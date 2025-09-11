const express = require('express');
const path = require('path');
const PuppeteerFootballClient = require('./PuppeteerFootballClient');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.static('public'));
app.use(express.json());

// สร้าง instance
const apiClient = new PuppeteerFootballClient();

// Route สำหรับหน้าหลัก
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

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

app.get('/api/search/:teamName', async (req, res) => {
    try {
        const teamName = req.params.teamName;
        console.log(`🔍 กำลังค้นหาทีม: ${teamName}`);

        let teamMatches;
        if (USE_MOCK_DATA) {
            teamMatches = mockData.matches.filter(match =>
                match.homeTeam.toLowerCase().includes(teamName.toLowerCase()) ||
                match.awayTeam.toLowerCase().includes(teamName.toLowerCase())
            );
            console.log(`✅ ใช้ Mock Data: พบ ${teamMatches.length} แมตช์ของทีม ${teamName}`);
        } else {
            teamMatches = await apiClient.searchTeam(teamName);
            console.log(`✅ พบ ${teamMatches.length} แมตช์ของทีม ${teamName}`);
        }

        res.json(teamMatches);
    } catch (error) {
        console.error('❌ Error searching team:', error);
        // Fallback to mock data
        const teamName = req.params.teamName;
        const teamMatches = mockData.matches.filter(match =>
            match.homeTeam.toLowerCase().includes(teamName.toLowerCase()) ||
            match.awayTeam.toLowerCase().includes(teamName.toLowerCase())
        );
        res.json(teamMatches);
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        console.log('📊 กำลังสร้างรายงานสถิติ...');

        let stats;
        if (USE_MOCK_DATA) {
            stats = mockData.stats;
            console.log('✅ ใช้ Mock Data: สร้างรายงานสถิติเสร็จสิ้น');
        } else {
            stats = await dataSaver.generateSummaryReport();
            console.log('✅ สร้างรายงานสถิติเสร็จสิ้น');
        }

        res.json(stats);
    } catch (error) {
        console.error('❌ Error generating stats:', error);
        // Fallback to mock data
        res.json(mockData.stats);
    }
});

app.get('/api/export', async (req, res) => {
    try {
        console.log('💾 กำลังส่งออกข้อมูล...');

        let matches;
        if (USE_MOCK_DATA) {
            matches = mockData.matches;
            console.log('✅ ใช้ Mock Data: ส่งออกข้อมูลเสร็จสิ้น');
        } else {
            const today = new Date().toISOString().split('T')[0];
            matches = await apiClient.getMatchesForDate(today);
            console.log('✅ ส่งออกข้อมูลเสร็จสิ้น');
        }

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
        console.error('❌ Error exporting data:', error);
        // Fallback to mock data
        const exportData = {
            date: new Date().toISOString().split('T')[0],
            totalMatches: mockData.matches.length,
            matches: mockData.matches,
            timestamp: new Date().toISOString()
        };
        res.json(exportData);
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
    console.log('   • ค้นหาทีม');
    console.log('   • ดูสถิติ');
    console.log('   • ส่งออกข้อมูล');
    console.log('');
    console.log('⚡ Auto-refresh ทุก 30 วินาที');
    console.log('📱 รองรับ Mobile & Desktop');
    console.log('');
});

module.exports = app;
