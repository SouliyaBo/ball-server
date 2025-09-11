const express = require('express');
const path = require('path');
const PuppeteerFootballClient = require('./PuppeteerFootballClient');

const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.json());

const apiClient = new PuppeteerFootballClient();

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/matches/today', async (req, res) => {
    try {
        console.log('🔄 กำลังดึงข้อมูลแมตช์วันนี้...');
        const today = new Date().toISOString().split('T')[0];
        const matches = await apiClient.getMatchesForDate(today);
        console.log(`✅ พบ ${matches.length} แมตช์วันนี้`);
        res.json(matches);
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลแมตช์ได้' });
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
        res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลแมตช์สดได้' });
    }
});

app.get('/api/search/:teamName', async (req, res) => {
    try {
        const teamName = req.params.teamName;
        console.log(`🔍 กำลังค้นหาทีม: ${teamName}`);
        const matches = await apiClient.searchTeam(teamName);
        console.log(`✅ พบ ${matches.length} แมตช์ของทีม ${teamName}`);
        res.json(matches);
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ error: 'ไม่สามารถค้นหาทีมได้' });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        console.log('📊 กำลังดึงสถิติ...');
        const stats = await apiClient.getStats();
        console.log('✅ ได้สถิติแล้ว');
        res.json(stats);
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ error: 'ไม่สามารถดึงสถิติได้' });
    }
});

app.get('/api/export', async (req, res) => {
    try {
        console.log('📤 กำลังส่งออกข้อมูล...');
        const today = new Date().toISOString().split('T')[0];
        const matches = await apiClient.getMatchesForDate(today);
        const exportData = {
            exportDate: new Date().toISOString(),
            totalMatches: matches.length,
            matches: matches
        };
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=football-matches-${today}.json`);
        res.json(exportData);
        console.log('✅ ส่งออกข้อมูลสำเร็จ');
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ error: 'ไม่สามารถส่งออกข้อมูลได้' });
    }
});

app.listen(PORT, () => {
    console.log('\n🚀 เซิร์ฟเวอร์เริ่มทำงานแล้ว!');
    console.log(`\n🌐 เปิดเว็บไซต์ที่: http://localhost:${PORT}`);
    console.log('\n🤖 ใช้ Puppeteer สำหรับดึงข้อมูล');

    // เริ่มต้น Puppeteer
    initializePuppeteer();
});

async function initializePuppeteer() {
    try {
        await apiClient.init();
        console.log('✅ Puppeteer พร้อมใช้งาน');

        const today = new Date().toISOString().split('T')[0];
        const matches = await apiClient.getMatchesForDate(today);
        console.log(`✅ พบ ${matches.length} แมตช์วันนี้`);

        const liveMatches = await apiClient.getLiveMatches();
        console.log(`✅ พบ ${liveMatches.length} แมตช์สด`);

    } catch (error) {
        console.log('⚠️ เตือน: Puppeteer ไม่สามารถเริ่มต้นได้:', error.message);
    }
}
