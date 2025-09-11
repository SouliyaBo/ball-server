const FootballApiClient = require('./FootballApiClient');
const fs = require('fs').promises;
const path = require('path');

class FootballDataSaver {
    constructor() {
        this.apiClient = new FootballApiClient();
        this.dataDir = './football-data';
    }

    async init() {
        // สร้างโฟลเดอร์สำหรับเก็บข้อมูล
        try {
            await fs.mkdir(this.dataDir, { recursive: true });
        } catch (error) {
            // โฟลเดอร์อาจมีอยู่แล้ว
        }
    }

    async saveMatchesToday(matches = null) {
        console.log('💾 กำลังบันทึกผลการแข่งขันวันนี้...');

        const today = this.getDateString(0);
        const todayMatches = matches || await this.apiClient.getMatchesForDate(today);

        const data = {
            date: today,
            thaiDate: this.getThaiDate(today),
            totalMatches: todayMatches.length,
            matches: matches.map(match => ({
                id: match.id,
                homeTeam: match.home_team_name,
                awayTeam: match.away_team_name,
                homeScore: match.home_score,
                awayScore: match.away_score,
                startTime: match.starting_at,
                status: this.extractor.getMatchStatus(match.state_id),
                leagueId: match.league_id
            })),
            timestamp: new Date().toISOString()
        };

        const filename = `matches-${today}.json`;
        const filepath = path.join(this.dataDir, filename);

        await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`✅ บันทึกข้อมูล ${matches.length} การแข่งขันลงไฟล์ ${filename}`);

        return filepath;
    }

    async saveWeeklyMatches() {
        console.log('💾 กำลังบันทึกผลการแข่งขัน 7 วันย้อนหลัง...');

        const weeklyData = [];

        for (let i = 0; i < 7; i++) {
            const date = this.extractor.getDateString(i);
            const matches = await this.extractor.getMatchesForDate(date);

            weeklyData.push({
                date: date,
                thaiDate: this.extractor.getThaiDate(date),
                totalMatches: matches.length,
                matches: matches
            });

            console.log(`  📅 ${date}: ${matches.length} การแข่งขัน`);
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        const data = {
            period: '7 days',
            startDate: this.extractor.getDateString(6),
            endDate: this.extractor.getDateString(0),
            totalDays: 7,
            totalMatches: weeklyData.reduce((sum, day) => sum + day.totalMatches, 0),
            days: weeklyData,
            timestamp: new Date().toISOString()
        };

        const filename = `weekly-matches-${this.extractor.getDateString(0)}.json`;
        const filepath = path.join(this.dataDir, filename);

        await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`✅ บันทึกข้อมูล ${data.totalMatches} การแข่งขันลงไฟล์ ${filename}`);

        return filepath;
    }

    async saveTeamHistory(teamName, days = 30) {
        console.log(`💾 กำลังบันทึกประวัติการแข่งขันของ ${teamName}...`);

        const endDate = this.extractor.getDateString(0);
        const startDate = this.extractor.getDateString(days);

        const allMatches = await this.extractor.getFixturesData(startDate, endDate);

        const teamMatches = allMatches.filter(match =>
            match.home_team_name?.toLowerCase().includes(teamName.toLowerCase()) ||
            match.away_team_name?.toLowerCase().includes(teamName.toLowerCase())
        );

        const data = {
            teamName: teamName,
            searchPeriod: days,
            startDate: startDate,
            endDate: endDate,
            totalMatches: teamMatches.length,
            matches: teamMatches.map(match => ({
                id: match.id,
                date: match.starting_at.split('T')[0],
                time: match.starting_at,
                homeTeam: match.home_team_name,
                awayTeam: match.away_team_name,
                homeScore: match.home_score,
                awayScore: match.away_score,
                status: this.extractor.getMatchStatus(match.state_id),
                isHomeTeam: match.home_team_name?.toLowerCase().includes(teamName.toLowerCase()),
                result: this.getMatchResult(match, teamName)
            })),
            statistics: this.calculateTeamStats(teamMatches, teamName),
            timestamp: new Date().toISOString()
        };

        const safeName = teamName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        const filename = `team-${safeName}-${this.extractor.getDateString(0)}.json`;
        const filepath = path.join(this.dataDir, filename);

        await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`✅ บันทึกประวัติของ ${teamName} (${teamMatches.length} การแข่งขัน) ลงไฟล์ ${filename}`);

        return filepath;
    }

    getMatchResult(match, teamName) {
        if (match.state_id !== 5) return 'ยังไม่จบ'; // ยังไม่จบการแข่งขัน

        const isHome = match.home_team_name?.toLowerCase().includes(teamName.toLowerCase());
        const homeScore = match.home_score || 0;
        const awayScore = match.away_score || 0;

        if (homeScore === awayScore) return 'เสมอ';

        const teamWin = isHome ? homeScore > awayScore : awayScore > homeScore;
        return teamWin ? 'ชนะ' : 'แพ้';
    }

    calculateTeamStats(matches, teamName) {
        const completedMatches = matches.filter(m => m.state_id === 5);

        if (completedMatches.length === 0) {
            return {
                totalMatches: matches.length,
                completedMatches: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                goalDifference: 0
            };
        }

        let wins = 0, draws = 0, losses = 0;
        let goalsFor = 0, goalsAgainst = 0;

        completedMatches.forEach(match => {
            const result = this.getMatchResult(match, teamName);
            const isHome = match.home_team_name?.toLowerCase().includes(teamName.toLowerCase());

            if (result === 'ชนะ') wins++;
            else if (result === 'เสมอ') draws++;
            else if (result === 'แพ้') losses++;

            if (isHome) {
                goalsFor += match.home_score || 0;
                goalsAgainst += match.away_score || 0;
            } else {
                goalsFor += match.away_score || 0;
                goalsAgainst += match.home_score || 0;
            }
        });

        return {
            totalMatches: matches.length,
            completedMatches: completedMatches.length,
            wins,
            draws,
            losses,
            goalsFor,
            goalsAgainst,
            goalDifference: goalsFor - goalsAgainst,
            winPercentage: ((wins / completedMatches.length) * 100).toFixed(1)
        };
    }

    async exportToCSV(jsonFilepath) {
        console.log('📊 กำลังแปลงเป็นไฟล์ CSV...');

        const jsonData = JSON.parse(await fs.readFile(jsonFilepath, 'utf8'));
        let csvContent = '';

        if (jsonData.matches) {
            // CSV Headers
            csvContent = 'Date,Time,Home Team,Away Team,Home Score,Away Score,Status\n';

            jsonData.matches.forEach(match => {
                const row = [
                    match.date || match.startTime?.split('T')[0] || '',
                    match.startTime?.split('T')[1]?.split('.')[0] || '',
                    `"${match.homeTeam || ''}"`,
                    `"${match.awayTeam || ''}"`,
                    match.homeScore || 0,
                    match.awayScore || 0,
                    `"${match.status || ''}"`
                ].join(',');
                csvContent += row + '\n';
            });

            const csvFilepath = jsonFilepath.replace('.json', '.csv');
            await fs.writeFile(csvFilepath, csvContent, 'utf8');
            console.log(`✅ ส่งออกเป็น CSV: ${csvFilepath}`);
            return csvFilepath;
        }
    }

    async generateSummaryReport() {
        console.log('📋 กำลังสร้างรายงานสรุป...');

        const today = this.extractor.getDateString(0);
        const todayMatches = await this.extractor.getMatchesForDate(today);

        // สถิติสำคัญ 7 วัน
        let totalMatches = 0;
        let totalGoals = 0;
        let completedMatches = 0;

        for (let i = 0; i < 7; i++) {
            const date = this.extractor.getDateString(i);
            const matches = await this.extractor.getFixturesData(date, date);

            totalMatches += matches.length;

            matches.forEach(match => {
                if (match.state_id === 5) {
                    completedMatches++;
                    totalGoals += (match.home_score || 0) + (match.away_score || 0);
                }
            });

            await new Promise(resolve => setTimeout(resolve, 200));
        }

        const report = {
            reportDate: today,
            thaiDate: this.extractor.getThaiDate(today),
            summary: {
                todayMatches: todayMatches.length,
                weeklyStats: {
                    totalMatches,
                    completedMatches,
                    totalGoals,
                    averageGoalsPerMatch: completedMatches > 0 ? (totalGoals / completedMatches).toFixed(2) : 0
                }
            },
            todayHighlights: todayMatches.slice(0, 5).map(match => ({
                homeTeam: match.home_team_name,
                awayTeam: match.away_team_name,
                score: `${match.home_score} - ${match.away_score}`,
                time: match.starting_at
            })),
            timestamp: new Date().toISOString()
        };

        const filename = `summary-report-${today}.json`;
        const filepath = path.join(this.dataDir, filename);

        await fs.writeFile(filepath, JSON.stringify(report, null, 2), 'utf8');
        console.log(`✅ สร้างรายงานสรุป: ${filename}`);

        return filepath;
    }

    async close() {
        await this.extractor.close();
    }
}

// ใช้งาน
async function main() {
    const saver = new FootballDataSaver();

    try {
        await saver.init();

        const option = process.argv[2] || 'today';

        switch (option) {
            case 'today':
                await saver.saveMatchesToday();
                break;

            case 'week':
                await saver.saveWeeklyMatches();
                break;

            case 'team':
                const teamName = process.argv[3] || 'Arsenal';
                await saver.saveTeamHistory(teamName, 30);
                break;

            case 'report':
                await saver.generateSummaryReport();
                break;

            case 'all':
                const todayFile = await saver.saveMatchesToday();
                const weekFile = await saver.saveWeeklyMatches();
                await saver.generateSummaryReport();
                await saver.exportToCSV(todayFile);
                await saver.exportToCSV(weekFile);
                break;

            default:
                console.log('❌ ตัวเลือกไม่ถูกต้อง');
                console.log('วิธีใช้:');
                console.log('  node save-data.js today         # บันทึกผลวันนี้');
                console.log('  node save-data.js week          # บันทึกผล 7 วัน');
                console.log('  node save-data.js team Arsenal  # บันทึกประวัติทีม');
                console.log('  node save-data.js report        # สร้างรายงานสรุป');
                console.log('  node save-data.js all           # บันทึกทั้งหมด');
        }

    } catch (error) {
        console.log('❌ เกิดข้อผิดพลาด:', error.message);
    } finally {
        await saver.close();
    }
}

if (require.main === module) {
    main();
}

module.exports = FootballDataSaver;
