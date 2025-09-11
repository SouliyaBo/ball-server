const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

class FootballDataExtractor {
    constructor() {
        this.browser = null;
        this.page = null;
        this.baseURL = 'https://football-dw3.pages.dev';
    }

    async init() {
        console.log('🚀 เริ่มระบบดึงข้อมูลผลบอล...');
        this.browser = await puppeteer.launch({ headless: true });
        this.page = await this.browser.newPage();

        await this.page.goto(`${this.baseURL}/result/`, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('✅ เชื่อมต่อกับเซิร์ฟเวอร์สำเร็จ');
    }

    async getFixturesData(startDate, endDate) {
        const url = `${this.baseURL}/api/fixtures/between/${startDate}/${endDate}`;

        try {
            const response = await this.page.evaluate(async (url) => {
                const res = await fetch(url);
                return await res.json();
            }, url);

            return response.data || [];
        } catch (error) {
            console.log(`❌ เกิดข้อผิดพลาดในการดึงข้อมูล: ${error.message}`);
            return [];
        }
    }

    async getLeaguesData() {
        try {
            const response = await this.page.evaluate(async (baseURL) => {
                const res = await fetch(`${baseURL}/api/livescore/leagues`);
                return await res.json();
            }, this.baseURL);
            return response;
        } catch (error) {
            console.log(`❌ เกิดข้อผิดพลาดในการดึงข้อมูลลีก: ${error.message}`);
            return [];
        }
    }

    getDateString(daysAgo = 0) {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date.toISOString().split('T')[0];
    }

    getThaiDate(dateString) {
        const date = new Date(dateString);
        const thaiMonths = [
            'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
            'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
        ];

        const day = date.getDate().toString().padStart(2, '0');
        const month = thaiMonths[date.getMonth()];
        const year = (date.getFullYear() + 543).toString().slice(-2);

        return `${day} ${month} ${year}`;
    }

    getCountryFlag(teamName) {
        const flags = {
            'Thailand': '🇹🇭', 'ไทย': '🇹🇭',
            'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Arsenal': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Manchester': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Liverpool': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Chelsea': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
            'Spain': '🇪🇸', 'Barcelona': '🇪🇸', 'Real Madrid': '🇪🇸', 'Atletico': '🇪🇸',
            'Italy': '🇮🇹', 'Juventus': '🇮🇹', 'Milan': '🇮🇹', 'Inter': '🇮🇹', 'Roma': '🇮🇹',
            'Germany': '🇩🇪', 'Bayern': '🇩🇪', 'Dortmund': '🇩🇪',
            'France': '🇫🇷', 'PSG': '🇫🇷', 'Marseille': '🇫🇷',
            'Portugal': '🇵🇹', 'Porto': '🇵🇹', 'Benfica': '🇵🇹',
            'Netherlands': '🇳🇱', 'Ajax': '🇳🇱',
            'Argentina': '🇦🇷', 'Boca': '🇦🇷', 'River': '🇦🇷',
            'Brazil': '🇧🇷', 'Santos': '🇧🇷', 'Flamengo': '🇧🇷', 'Palmeiras': '🇧🇷',
            'Uruguay': '🇺🇾', 'Peru': '🇵🇪', 'Ecuador': '🇪🇨', 'Paraguay': '🇵🇾', 'Venezuela': '🇻🇪',
            'Korea': '🇰🇷', 'Japan': '🇯🇵', 'China': '🇨🇳'
        };

        for (const [country, flag] of Object.entries(flags)) {
            if (teamName.includes(country)) {
                return flag;
            }
        }
        return '⚽';
    }

    displayMatchesInTableFormat(matches, date) {
        const thaiDate = this.getThaiDate(date);
        console.log(`\n┌─────────────────────────────────────────────────────────────────────────────────────────┐`);
        console.log(`│                          🏆 ผลบอลสด วันที่ ${thaiDate}                          │`);
        console.log(`├─────────────────────────────────────────────────────────────────────────────────────────┤`);

        if (matches.length === 0) {
            console.log(`│                              🔴 ไม่มีการแข่งขันในวันนี้                              │`);
            console.log(`└─────────────────────────────────────────────────────────────────────────────────────────┘`);
            return;
        }

        matches.forEach((match, index) => {
            const time = new Date(match.starting_at).toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Bangkok'
            });

            const homeTeam = (match.home_team_name || 'ทีมเจ้าบ้าน').substring(0, 25);
            const awayTeam = (match.away_team_name || 'ทีมเยือน').substring(0, 25);
            const homeFlag = this.getCountryFlag(homeTeam);
            const awayFlag = this.getCountryFlag(awayTeam);

            let scoreDisplay;
            let statusIcon = '';

            if (match.state_id === 1) {
                scoreDisplay = 'VS';
                statusIcon = '⏳';
            } else if (match.state_id === 2) {
                scoreDisplay = `${match.home_score} - ${match.away_score}`;
                statusIcon = '🔴';
            } else if (match.state_id === 5) {
                scoreDisplay = `${match.home_score} - ${match.away_score}`;
                statusIcon = '✅';
            } else {
                scoreDisplay = `${match.home_score} - ${match.away_score}`;
                statusIcon = '⚫';
            }

            // แสดงผลเป็นรูปแบบตารางที่สวย
            const number = (index + 1).toString().padStart(2, '0');
            const homeDisplay = `${homeFlag} ${homeTeam}`.padEnd(32);
            const scoreCenter = scoreDisplay.padStart(8);
            const awayDisplay = `${awayTeam} ${awayFlag}`.padStart(32);

            console.log(`│ ${number}. ${time} ${statusIcon} │ ${homeDisplay} ${scoreCenter} ${awayDisplay} │`);
            console.log(`├─────────────────────────────────────────────────────────────────────────────────────────┤`);
        });

        console.log(`│                              📊 รวม ${matches.length} การแข่งขัน                              │`);
        console.log(`└─────────────────────────────────────────────────────────────────────────────────────────┘`);
    }

    // แสดงข้อมูลแบบรูปภาพตารางสวยงาม (คล้ายกับรูปที่คุณให้มา)
    displayMatchesCompactFormat(matches, date) {
        const thaiDate = this.getThaiDate(date);
        console.log(`\n📅 ผลบอลสดวันนี้`);
        console.log(`${thaiDate}`);
        console.log('─'.repeat(80));

        if (matches.length === 0) {
            console.log('🔴 ไม่มีการแข่งขันในวันนี้');
            return;
        }

        matches.forEach((match, index) => {
            const time = new Date(match.starting_at).toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Bangkok'
            });

            const homeTeam = match.home_team_name || 'ทีมเจ้าบ้าน';
            const awayTeam = match.away_team_name || 'ทีมเยือน';
            const homeFlag = this.getCountryFlag(homeTeam);
            const awayFlag = this.getCountryFlag(awayTeam);

            let scoreDisplay;
            let status = '';

            if (match.state_id === 1) {
                scoreDisplay = 'VS';
                status = 'ยังไม่เริ่ม';
            } else if (match.state_id === 2) {
                scoreDisplay = `${match.home_score} - ${match.away_score}`;
                status = 'กำลังแข่ง';
            } else if (match.state_id === 5) {
                scoreDisplay = `${match.home_score} - ${match.away_score}`;
                status = 'FT';
            } else {
                scoreDisplay = `${match.home_score} - ${match.away_score}`;
                status = 'FT';
            }

            console.log(`\n${time}     ${homeFlag} ${homeTeam.padEnd(30)} ${scoreDisplay.padStart(5)}    ${status}`);
            console.log(`         ${awayFlag} ${awayTeam.padEnd(30)} ${' '.repeat(5)}    ${status === 'FT' ? 'FT' : ''}`);
        });

        console.log('\n' + '─'.repeat(80));
        console.log(`📊 รวม ${matches.length} การแข่งขัน | มุมมอง: ผลการแข่งขัน | เวลา: ${new Date().toLocaleTimeString('th-TH')}`);
    }

    async getMatchesForDate(date) {
        const matches = await this.getFixturesData(date, date);
        return matches;
    }

    async getMatchesToday() {
        const today = this.getDateString(0);
        const matches = await this.getMatchesForDate(today);
        this.displayMatchesCompactFormat(matches, today);
        return matches;
    }

    async getMatchesYesterday() {
        const yesterday = this.getDateString(1);
        const matches = await this.getMatchesForDate(yesterday);
        this.displayMatchesCompactFormat(matches, yesterday);
        return matches;
    }

    async getMatchesForDates(days = 7) {
        console.log(`\n📅 กำลังดึงข้อมูลการแข่งขัน ${days} วันย้อนหลัง...`);

        const results = [];

        for (let i = 0; i < days; i++) {
            const date = this.getDateString(i);
            const matches = await this.getMatchesForDate(date);

            if (matches.length > 0) {
                this.displayMatchesCompactFormat(matches, date);
                results.push({ date, matches });
            } else {
                console.log(`\n📅 ${this.getThaiDate(date)}: ไม่มีการแข่งขัน`);
            }

            // รอสักครู่ระหว่างการโหลด
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        return results;
    }

    // ฟังก์ชันค้นหาการแข่งขันของทีมเฉพาะ
    async searchTeamMatches(teamName, days = 30) {
        console.log(`\n🔍 ค้นหาการแข่งขันของ "${teamName}" ใน ${days} วันที่ผ่านมา...`);

        const allMatches = [];
        const endDate = this.getDateString(0);
        const startDate = this.getDateString(days);

        const matches = await this.getFixturesData(startDate, endDate);

        const teamMatches = matches.filter(match =>
            match.home_team_name?.toLowerCase().includes(teamName.toLowerCase()) ||
            match.away_team_name?.toLowerCase().includes(teamName.toLowerCase())
        );

        if (teamMatches.length > 0) {
            console.log(`\n✅ พบการแข่งขันของ "${teamName}" จำนวน ${teamMatches.length} นัด:`);
            teamMatches.forEach((match, index) => {
                const date = new Date(match.starting_at).toLocaleDateString('th-TH');
                const time = new Date(match.starting_at).toLocaleTimeString('th-TH', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                console.log(`\n${index + 1}. ${date} ${time}`);
                console.log(`   ${match.home_team_name} ${match.home_score} - ${match.away_score} ${match.away_team_name}`);
                console.log(`   สถานะ: ${this.getMatchStatus(match.state_id)}`);
            });
        } else {
            console.log(`❌ ไม่พบการแข่งขันของ "${teamName}"`);
        }

        return teamMatches;
    }

    getMatchStatus(stateId) {
        const statuses = {
            1: 'ยังไม่เริ่ม',
            2: 'กำลังแข่ง',
            3: 'พักครึ่ง',
            4: 'ครึ่งที่สอง',
            5: 'จบแล้ว',
            6: 'เลื่อนการแข่งขัน',
            7: 'ยกเลิก'
        };
        return statuses[stateId] || 'ไม่ทราบสถานะ';
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('\n🔚 ปิดการเชื่อมต่อแล้ว');
        }
    }
}

// ใช้งานง่ายๆ
async function main() {
    const extractor = new FootballDataExtractor();

    try {
        await extractor.init();

        // ตัวอย่างการใช้งาน
        console.log('\n🎯 เลือกสิ่งที่ต้องการ:');
        console.log('1. ดูผลการแข่งขันวันนี้');
        console.log('2. ดูผลการแข่งขันเมื่อวาน');
        console.log('3. ดูผลการแข่งขัน 7 วันย้อนหลัง');
        console.log('4. ค้นหาการแข่งขันของทีม');

        // สำหรับตัวอย่าง จะแสดงผลการแข่งขันวันนี้
        await extractor.getMatchesToday();

        // หากต้องการค้นหาทีม (ตัวอย่าง)
        // await extractor.searchTeamMatches('Arsenal', 30);

    } catch (error) {
        console.log('❌ เกิดข้อผิดพลาด:', error.message);
    } finally {
        await extractor.close();
    }
}

// สำหรับ export ให้ไฟล์อื่นใช้งาน
if (require.main === module) {
    main();
}

module.exports = FootballDataExtractor;
