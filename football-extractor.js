const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

class FootballDataExtractor {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    async init() {
        console.log('🚀 เริ่มระบบดึงข้อมูลผลบอล...');
        this.browser = await puppeteer.launch({ headless: true });
        this.page = await this.browser.newPage();

        // ไปที่หน้าหลักก่อนเพื่อให้ได้ session ที่ถูกต้อง
        await this.page.goto('https://football-dw3.pages.dev/result/', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('✅ เชื่อมต่อกับเซิร์ฟเวอร์สำเร็จ');
    }

    async getFixturesData(startDate, endDate) {
        const url = `https://football-dw3.pages.dev/api/fixtures/between/${startDate}/${endDate}`;

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
            const response = await this.page.evaluate(async () => {
                const res = await fetch('https://football-dw3.pages.dev/api/livescore/leagues');
                return await res.json();
            });
            return response;
        } catch (error) {
            console.log(`❌ เกิดข้อผิดพลาดในการดึงข้อมูลลีก: ${error.message}`);
            return [];
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const thaiMonths = [
            'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
            'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
        ];

        const day = date.getDate().toString().padStart(2, '0');
        const month = thaiMonths[date.getMonth()];
        const year = (date.getFullYear() + 543);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');

        return `${day}/${month}/${year} ${hours}:${minutes}`;
    }

    formatScore(homeScore, awayScore, stateId) {
        // state_id: 1=ยังไม่เริ่ม, 2=กำลังแข่ง, 5=จบแล้ว
        if (stateId === 1) {
            return 'VS';
        } else if (stateId === 2) {
            return `${homeScore} - ${awayScore} (กำลังแข่ง)`;
        } else {
            return `${homeScore} - ${awayScore}`;
        }
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

    displayMatchesTable(matches, date) {
        console.log(`\n📅 ผลการแข่งขันวันที่ ${date}`);
        console.log('='.repeat(120));
        console.log('เวลา'.padEnd(20) + 'ทีมเจ้าบ้าน'.padEnd(30) + 'ผลการแข่งขัน'.padEnd(20) + 'ทีมเยือน'.padEnd(30) + 'สถานะ'.padEnd(15));
        console.log('-'.repeat(120));

        if (matches.length === 0) {
            console.log('ไม่มีการแข่งขันในวันนี้'.padStart(60));
            return;
        }

        matches.forEach((match, index) => {
            const time = this.formatDate(match.starting_at);
            const homeTeam = (match.home_team_name || 'ทีมเจ้าบ้าน').substring(0, 28);
            const awayTeam = (match.away_team_name || 'ทีมเยือน').substring(0, 28);
            const score = this.formatScore(match.home_score, match.away_score, match.state_id);
            const status = this.getMatchStatus(match.state_id);

            console.log(
                time.padEnd(20) +
                homeTeam.padEnd(30) +
                score.padEnd(20) +
                awayTeam.padEnd(30) +
                status.padEnd(15)
            );
        });

        console.log('-'.repeat(120));
        console.log(`รวม ${matches.length} นัด`);
    }

    // แสดงข้อมูลแบบตารางที่สวยงาม (คล้ายรูปที่คุณให้มา)
    displayMatchesFormattedTable(matches, date) {
        console.log(`\n🏆 ผลบอลสด วันที่ ${date}`);
        console.log('=' .repeat(100));

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
                status = '⏳ ยังไม่เริ่ม';
            } else if (match.state_id === 2) {
                scoreDisplay = `${match.home_score} - ${match.away_score}`;
                status = '🔴 กำลังแข่ง';
            } else if (match.state_id === 5) {
                scoreDisplay = `${match.home_score} - ${match.away_score}`;
                status = '✅ จบแล้ว';
            } else {
                scoreDisplay = `${match.home_score} - ${match.away_score}`;
                status = this.getMatchStatus(match.state_id);
            }

            console.log(`\n${(index + 1).toString().padStart(2, '0')}. ${time} | ${status}`);
            console.log(`    ${homeFlag} ${homeTeam.padEnd(35)} ${scoreDisplay.padStart(10)}`);
            console.log(`    ${awayFlag} ${awayTeam.padEnd(35)} ${' '.repeat(10)}`);
        });

        console.log('\n' + '='.repeat(100));
        console.log(`📊 รวม ${matches.length} การแข่งขัน`);
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
            'Uruguay': '🇺🇾', 'Peru': '🇵🇪', 'Ecuador': '🇪🇨', 'Paraguay': '🇵🇾', 'Venezuela': '🇻🇪'
        };

        for (const [country, flag] of Object.entries(flags)) {
            if (teamName.includes(country)) {
                return flag;
            }
        }
        return '⚽'; // default football icon
    }

    async getMatchesToday() {
        const today = new Date().toISOString().split('T')[0];
        const matches = await this.getFixturesData(today, today);
        this.displayMatchesFormattedTable(matches, today);
        return matches;
    }

    async getMatchesForDates(days = 7) {
        console.log(`\n📅 กำลังดึงข้อมูลการแข่งขัน ${days} วันย้อนหลัง...`);

        const results = [];
        const today = new Date();

        for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateString = date.toISOString().split('T')[0];

            const matches = await this.getFixturesData(dateString, dateString);

            if (matches.length > 0) {
                this.displayMatchesFormattedTable(matches, dateString);
                results.push({ date: dateString, matches });
            } else {
                console.log(`\n📅 ${dateString}: ไม่มีการแข่งขัน`);
            }

            // รอสักครู่ระหว่างการโหลดเพื่อไม่ให้เซิร์ฟเวอร์โหลดหนัก
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        return results;
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('\n🔚 ปิดการเชื่อมต่อแล้ว');
        }
    }
}

// ใช้งานตัวอย่าง
async function main() {
    const extractor = new FootballDataExtractor();

    try {
        await extractor.init();

        // แสดงผลการแข่งขันวันนี้
        await extractor.getMatchesToday();

        // แสดงผลการแข่งขัน 5 วันย้อนหลัง
        await extractor.getMatchesForDates(5);

    } catch (error) {
        console.log('❌ เกิดข้อผิดพลาด:', error.message);
    } finally {
        await extractor.close();
    }
}

main();
