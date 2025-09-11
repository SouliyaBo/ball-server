const fetch = require('node-fetch');
const https = require('https');

class FootballApiClient {
    constructor() {
        this.baseURL = 'https://football-dw3.pages.dev';

        // สร้าง agent ที่ไม่เข้มงวดกับ SSL
        this.httpsAgent = new https.Agent({
            rejectUnauthorized: false,
            timeout: 15000
        });
    }

    async makeRequest(endpoint, options = {}) {
        const maxRetries = 2;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const url = `${this.baseURL}${endpoint}`;
                console.log(`🔄 เรียก API: ${url}`);

                const response = await fetch(url, {
                    timeout: 20000,
                    agent: this.httpsAgent,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'application/json, text/plain, */*',
                        'Accept-Language': 'en-US,en;q=0.9,th;q=0.8',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'DNT': '1',
                        'Connection': 'keep-alive',
                        'Sec-Fetch-Dest': 'empty',
                        'Sec-Fetch-Mode': 'cors',
                        'Sec-Fetch-Site': 'cross-site',
                        ...options.headers
                    },
                    ...options
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                console.log(`✅ ได้ข้อมูล: ${Array.isArray(data) ? data.length : Object.keys(data).length} รายการ`);
                return data;

            } catch (error) {
                console.log(`❌ พยายามครั้งที่ ${attempt + 1} ล้มเหลว: ${error.message}`);

                if (attempt < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }

        throw new Error('ไม่สามารถเชื่อมต่อกับ API ได้');
    }

    // ดึงข้อมูลลีก
    async getLeaguesData() {
        try {
            console.log('🏆 กำลังดึงข้อมูลลีก...');
            const data = await this.makeRequest('/api/livescore/leagues');
            return data;
        } catch (error) {
            console.log(`❌ ไม่สามารถดึงข้อมูลลีกได้: ${error.message}`);
            return [];
        }
    }

    // ดึงข้อมูลสถานะการแข่งขัน
    async getMatchStates() {
        try {
            console.log('📊 กำลังดึงข้อมูลสถานะ...');
            const data = await this.makeRequest('/api/livescore/states');
            return data;
        } catch (error) {
            console.log(`❌ ไม่สามารถดึงข้อมูลสถานะได้: ${error.message}`);
            return [];
        }
    }

    // ดึงข้อมูลการแข่งขันระหว่างวันที่
    async getFixturesData(startDate, endDate) {
        try {
            console.log(`📅 กำลังดึงข้อมูลแมตช์ ${startDate} ถึง ${endDate}`);
            const data = await this.makeRequest(`/api/fixtures/between/${startDate}/${endDate}`);
            return data.data || data || [];
        } catch (error) {
            console.log(`❌ ไม่สามารถดึงข้อมูลแมตช์ได้: ${error.message}`);
            return [];
        }
    }

    // ดึงข้อมูลแมตช์วันเดียว
    async getMatchesForDate(date) {
        try {
            console.log(`📅 กำลังค้นหาแมตช์วันที่: ${date}`);

            // ลองใช้ API หลัก
            let matches = await this.getFixturesData(date, date);

            if (matches && matches.length > 0) {
                return this.formatMatches(matches);
            }

            // หากไม่มีข้อมูล ใช้ Mock Data
            console.log('🔄 ใช้ข้อมูลตัวอย่าง...');
            return this.getMockMatches(date);

        } catch (error) {
            console.log(`❌ เกิดข้อผิดพลาดในการดึงข้อมูลแมตช์: ${error.message}`);
            return this.getMockMatches(date);
        }
    }

    // ดึงแมตช์สด
    async getLiveMatches() {
        try {
            console.log('🔴 กำลังดึงข้อมูลแมตช์สด...');

            const today = new Date().toISOString().split('T')[0];
            const allMatches = await this.getMatchesForDate(today);

            // กรองเฉพาะแมตช์ที่กำลังแข่ง
            const liveMatches = allMatches.filter(match =>
                ['1H', '2H', 'HT', 'LIVE', 'live'].includes(match.status)
            );

            console.log(`✅ พบ ${liveMatches.length} แมตช์สด`);
            return liveMatches;

        } catch (error) {
            console.log(`❌ เกิดข้อผิดพลาดในการดึงข้อมูลแมตช์สด: ${error.message}`);
            return [];
        }
    }

    // ค้นหาทีม
    async searchTeam(teamName) {
        try {
            console.log(`🔍 กำลังค้นหาทีม: ${teamName}`);

            const today = new Date().toISOString().split('T')[0];
            const allMatches = await this.getMatchesForDate(today);

            // ค้นหาแมตช์ที่มีทีมที่ต้องการ
            const teamMatches = allMatches.filter(match =>
                match.homeTeam.toLowerCase().includes(teamName.toLowerCase()) ||
                match.awayTeam.toLowerCase().includes(teamName.toLowerCase())
            );

            console.log(`✅ พบ ${teamMatches.length} แมตช์ของทีม ${teamName}`);
            return teamMatches;

        } catch (error) {
            console.log(`❌ เกิดข้อผิดพลาดในการค้นหาทีม: ${error.message}`);
            return [];
        }
    }

    // สร้างข้อมูล Mock
    getMockMatches(date) {
        const mockMatches = [
            {
                id: `mock_1_${date}`,
                homeTeam: "Real Madrid",
                awayTeam: "Barcelona",
                homeScore: 2,
                awayScore: 1,
                time: `${date}T15:00:00Z`,
                status: "FT",
                league: "La Liga"
            },
            {
                id: `mock_2_${date}`,
                homeTeam: "Manchester United",
                awayTeam: "Liverpool",
                homeScore: 1,
                awayScore: 1,
                time: `${date}T17:30:00Z`,
                status: "live",
                league: "Premier League"
            },
            {
                id: `mock_3_${date}`,
                homeTeam: "Brazil",
                awayTeam: "Argentina",
                homeScore: 3,
                awayScore: 2,
                time: `${date}T18:00:00Z`,
                status: "FT",
                league: "World Cup Qualifier"
            },
            {
                id: `mock_4_${date}`,
                homeTeam: "Bayern Munich",
                awayTeam: "Borussia Dortmund",
                homeScore: 2,
                awayScore: 2,
                time: `${date}T16:30:00Z`,
                status: "2H",
                league: "Bundesliga"
            },
            {
                id: `mock_5_${date}`,
                homeTeam: "PSG",
                awayTeam: "Marseille",
                homeScore: 4,
                awayScore: 0,
                time: `${date}T14:00:00Z`,
                status: "FT",
                league: "Ligue 1"
            },
            {
                id: `mock_6_${date}`,
                homeTeam: "Chelsea",
                awayTeam: "Arsenal",
                homeScore: 0,
                awayScore: 0,
                time: `${date}T20:00:00Z`,
                status: "scheduled",
                league: "Premier League"
            },
            {
                id: `mock_7_${date}`,
                homeTeam: "Juventus",
                awayTeam: "AC Milan",
                homeScore: 1,
                awayScore: 3,
                time: `${date}T19:45:00Z`,
                status: "FT",
                league: "Serie A"
            },
            {
                id: `mock_8_${date}`,
                homeTeam: "Ajax",
                awayTeam: "PSV",
                homeScore: 0,
                awayScore: 1,
                time: `${date}T13:30:00Z`,
                status: "1H",
                league: "Eredivisie"
            }
        ];

        console.log(`✅ สร้างข้อมูล Mock: ${mockMatches.length} แมตช์`);
        return mockMatches;
    }

    // แปลงข้อมูลให้เป็นรูปแบบมาตรฐาน
    formatMatches(rawMatches) {
        return rawMatches.map(match => {
            const homeScore = match.home_score ?? match.goals?.home ?? match.score?.home ?? 0;
            const awayScore = match.away_score ?? match.goals?.away ?? match.score?.away ?? 0;

            return {
                id: match.id || Math.random().toString(36).substr(2, 9),
                homeTeam: match.home_team_name || match.teams?.home?.name || match.homeTeam || 'Unknown Team',
                awayTeam: match.away_team_name || match.teams?.away?.name || match.awayTeam || 'Unknown Team',
                homeScore: homeScore,
                awayScore: awayScore,
                time: match.starting_at || match.fixture?.date || match.time || new Date().toISOString(),
                status: this.getMatchStatus(match.state_id || match.fixture?.status?.short || match.status),
                league: match.league_name || match.league?.name || match.league || 'Unknown League',
                venue: match.venue_name || match.fixture?.venue?.name || match.venue || 'Unknown Venue'
            };
        });
    }

    // แปลงสถานะแมตช์
    getMatchStatus(statusCode) {
        const statusMap = {
            'FT': 'FT',
            'NS': 'scheduled',
            '1H': '1H',
            '2H': '2H',
            'HT': 'HT',
            'LIVE': 'live',
            'live': 'live',
            'PST': 'postponed',
            'CANC': 'cancelled',
            'AWD': 'awarded',
            '1': 'scheduled',
            '2': 'live',
            '3': 'FT'
        };

        return statusMap[statusCode] || 'scheduled';
    }

    // ธงชาติ
    getCountryFlag(teamName) {
        const flags = {
            'Brazil': '🇧🇷',
            'Argentina': '🇦🇷',
            'Chile': '🇨🇱',
            'Uruguay': '🇺🇾',
            'Paraguay': '🇵🇾',
            'Bolivia': '🇧🇴',
            'Peru': '🇵🇪',
            'Ecuador': '🇪🇨',
            'Colombia': '🇨🇴',
            'Venezuela': '🇻🇪',
            'Thailand': '🇹🇭',
            'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
            'Spain': '🇪🇸',
            'Germany': '🇩🇪',
            'France': '🇫🇷',
            'Italy': '🇮🇹',
            'Portugal': '🇵🇹',
            'Netherlands': '🇳🇱',
            'Belgium': '🇧🇪',
            'Manchester United': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
            'Manchester City': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
            'Liverpool': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
            'Arsenal': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
            'Chelsea': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
            'Real Madrid': '🇪🇸',
            'Barcelona': '🇪🇸',
            'PSG': '🇫🇷',
            'Bayern Munich': '🇩🇪',
            'Juventus': '🇮🇹',
            'AC Milan': '🇮🇹',
            'Inter Milan': '🇮🇹'
        };
        return flags[teamName] || '⚽';
    }

    // แสดงผลแบบสวยงาม (เก็บไว้เพื่อ backward compatibility)
    displayMatchesCompactFormat(matches) {
        if (!matches || matches.length === 0) {
            console.log('🔍 ไม่พบข้อมูลแมตช์');
            return;
        }

        console.log('\n📊 ผลการแข่งขันฟุตบอล');
        console.log('='.repeat(80));

        matches.forEach((match, index) => {
            const time = new Date(match.time).toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit'
            });

            const homeFlag = this.getCountryFlag(match.homeTeam);
            const awayFlag = this.getCountryFlag(match.awayTeam);

            const status = match.status === 'FT' ? '🏁 FT' :
                          match.status === 'live' ? '🔴 LIVE' :
                          '⏰ ' + match.status;

            console.log(`${(index + 1).toString().padStart(2)}. ${time} │ ${homeFlag} ${match.homeTeam.padEnd(15)} ${match.homeScore}-${match.awayScore} ${match.awayTeam.padStart(15)} ${awayFlag} │ ${status}`);
        });

        console.log('='.repeat(80));
        console.log(`📈 รวม ${matches.length} แมตช์\n`);
    }

    async close() {
        // ไม่ต้องทำอะไรเพราะไม่ใช้ Puppeteer แล้ว
        console.log('✅ ปิดการเชื่อมต่อแล้ว');
    }
}

module.exports = FootballApiClient;
