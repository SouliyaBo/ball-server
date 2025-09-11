const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// ใช้ stealth plugin เพื่อหลีกเลี่ยงการตรวจจับ bot
puppeteer.use(StealthPlugin());

class PuppeteerFootballClient {
    constructor() {
        this.browser = null;
        this.page = null;
        this.isInitialized = false;

        // Cache สำหรับข้อมูลลีก เพื่อลด API calls
        this.leaguesCache = null;
        this.leaguesCacheTime = null;
        this.CACHE_DURATION = 30 * 60 * 1000; // 30 นาที

        // Mock data สำหรับกรณี error
        this.mockData = {
            fixtures: [
                {
                    id: 'mock1',
                    homeTeam: 'Real Madrid',
                    awayTeam: 'Barcelona',
                    homeScore: 2,
                    awayScore: 1,
                    status: 'FT',
                    startTime: '2025-09-10T15:00:00Z',
                    league: 'La Liga'
                },
                {
                    id: 'mock2',
                    homeTeam: 'Manchester City',
                    awayTeam: 'Liverpool',
                    homeScore: 1,
                    awayScore: 1,
                    status: 'LIVE',
                    startTime: '2025-09-10T17:30:00Z',
                    league: 'Premier League'
                },
                {
                    id: 'mock3',
                    homeTeam: 'Bayern Munich',
                    awayTeam: 'Borussia Dortmund',
                    homeScore: 3,
                    awayScore: 0,
                    status: 'FT',
                    startTime: '2025-09-10T18:30:00Z',
                    league: 'Bundesliga'
                },
                {
                    id: 'mock4',
                    homeTeam: 'PSG',
                    awayTeam: 'Lyon',
                    homeScore: null,
                    awayScore: null,
                    status: 'SCHEDULED',
                    startTime: '2025-09-10T20:00:00Z',
                    league: 'Ligue 1'
                },
                {
                    id: 'mock5',
                    homeTeam: 'Arsenal',
                    awayTeam: 'Chelsea',
                    homeScore: 0,
                    awayScore: 2,
                    status: 'LIVE',
                    startTime: '2025-09-10T14:30:00Z',
                    league: 'Premier League'
                }
            ]
        };
    }

    async init() {
        if (this.isInitialized) return;

        try {
            console.log('🚀 เริ่มต้น Puppeteer Browser...');

            this.browser = await puppeteer.launch({
                headless: 'new', // ใช้ headless mode ใหม่
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            });

            this.page = await this.browser.newPage();

            // ตั้งค่า user agent เพื่อปกปิดการเป็น bot
            await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            // ตั้งค่า viewport
            await this.page.setViewport({ width: 1920, height: 1080 });

            this.isInitialized = true;
            console.log('✅ Puppeteer Browser พร้อมใช้งาน');

        } catch (error) {
            console.log('❌ ไม่สามารถเริ่มต้น Puppeteer:', error.message);
            throw error;
        }
    }

    async fetchWithPuppeteer(url, retries = 2) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                console.log(`🔄 พยายามครั้งที่ ${attempt}: ${url}`);

                if (!this.isInitialized) {
                    await this.init();
                }

                // ไปยัง URL
                const response = await this.page.goto(url, {
                    waitUntil: 'networkidle0',
                    timeout: 30000
                });

                if (!response.ok()) {
                    throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
                }

                // รอให้หน้าโหลดเสร็จ และดึงข้อมูล JSON
                await new Promise(resolve => setTimeout(resolve, 2000));

                // ตรวจสอบว่าเป็น JSON หรือไม่
                const contentType = response.headers()['content-type'];
                if (contentType && contentType.includes('application/json')) {
                    // ดึงข้อมูล JSON จากหน้า
                    const jsonData = await this.page.evaluate(() => {
                        const preElement = document.querySelector('pre');
                        if (preElement) {
                            try {
                                return JSON.parse(preElement.textContent);
                            } catch (e) {
                                return null;
                            }
                        }

                        // ลองดึงจาก body ทั้งหมด
                        try {
                            return JSON.parse(document.body.textContent);
                        } catch (e) {
                            return null;
                        }
                    });

                    if (jsonData) {
                        console.log(`✅ ได้ข้อมูลจาก ${url}`);
                        return jsonData;
                    }
                }

                throw new Error('ไม่พบข้อมูล JSON ในหน้า');

            } catch (error) {
                console.log(`❌ ครั้งที่ ${attempt} ล้มเหลว:`, error.message);

                if (attempt === retries) {
                    throw new Error(`ไม่สามารถดึงข้อมูลจาก ${url} ได้หลังจากพยายาม ${retries} ครั้ง`);
                }

                // รอก่อนลองใหม่
                await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            }
        }
    }

    async getFixturesData(fromDate, toDate) {
        try {
            console.log(`📅 กำลังดึงข้อมูลแมตช์ ${fromDate} ถึง ${toDate}`);

            const url = `https://football-dw3.pages.dev/api/fixtures/between/${fromDate}/${toDate}`;
            const data = await this.fetchWithPuppeteer(url);

            console.log('📋 ข้อมูลที่ได้:', typeof data);
            if (data) {
                console.log('🔍 Keys:', Object.keys(data));
                if (data.data) {
                    console.log('📊 data.data type:', typeof data.data, 'length:', data.data?.length);
                    if (data.data.length > 0) {
                        console.log('📝 ตัวอย่างข้อมูลแมตช์แรก:', JSON.stringify(data.data[0], null, 2));
                    }
                }
            }

            // ตรวจสอบโครงสร้างข้อมูล
            let fixtures = [];
            if (Array.isArray(data)) {
                fixtures = data;
            } else if (data && data.fixtures && Array.isArray(data.fixtures)) {
                fixtures = data.fixtures;
            } else if (data && data.data && Array.isArray(data.data)) {
                fixtures = data.data;
            } else if (data && data.matches && Array.isArray(data.matches)) {
                fixtures = data.matches;
            } else if (data && typeof data === 'object') {
                // ลองหาค่าที่เป็น array ในข้อมูล
                const values = Object.values(data);
                const arrayValue = values.find(val => Array.isArray(val));
                if (arrayValue) {
                    fixtures = arrayValue;
                }
            }

            if (fixtures.length > 0) {
                console.log(`✅ พบ ${fixtures.length} แมตช์จาก API`);
                return this.normalizeFixtures(fixtures);
            }

            throw new Error('ไม่พบข้อมูลแมตช์ในรูปแบบที่คาดหวัง');

        } catch (error) {
            console.log('❌ ไม่สามารถดึงข้อมูลแมตช์ได้:', error.message);
            console.log('🔄 ใช้ข้อมูลตัวอย่าง...');
            return this.getMockFixtures();
        }
    }

    normalizeFixtures(rawData) {
        if (!Array.isArray(rawData)) return [];

        return rawData.map(match => {
            const status = this.normalizeStatusFromStateId(match.state_id);

            return {
                id: match.id || Math.random().toString(36).substr(2, 9),
                homeTeam: match.home_team_name || 'ทีมเหย้า',
                awayTeam: match.away_team_name || 'ทีมเยือน',
                homeScore: match.home_score,
                awayScore: match.away_score,
                status: status,
                startTime: match.starting_at || match.date,
                league: match.league_name || 'ไม่ระบุ',
                homeTeamImage: match.home_team_image_path,
                awayTeamImage: match.away_team_image_path
            };
        }).filter(match => match.homeTeam !== 'ทีมเหย้า'); // กรองข้อมูลที่ไม่สมบูรณ์
    }

    normalizeStatusFromStateId(stateId) {
        // แปลง state_id เป็น status text ตามข้อมูลจริงจาก API
        const stateMap = {
            1: 'SCHEDULED',     // Not Started
            2: 'LIVE',          // 1st Half
            3: 'HT',            // Half Time
            4: 'BREAK',         // Break
            5: 'FT',            // Full Time
            6: 'LIVE',          // Extra Time
            7: 'FT',            // After Extra Time
            8: 'FT',            // After Penalties
            9: 'LIVE',          // Penalties
            10: 'POSTPONED',    // Postponed
            11: 'SUSPENDED',    // Suspended
            12: 'CANCELLED',    // Cancelled
            13: 'SCHEDULED',    // To Be Announced
            14: 'FT',           // Walk Over
            15: 'CANCELLED',    // Abandoned
            16: 'DELAYED',      // Delayed
            17: 'FT',           // Awarded
            18: 'SUSPENDED',    // Interrupted
            19: 'SCHEDULED',    // Awaiting Updates
            20: 'CANCELLED',    // Deleted
            21: 'BREAK',        // Extra Time - Break
            22: 'LIVE',         // 2nd Half
            23: 'LIVE',         // ET - 2nd Half
            25: 'BREAK',        // Penalties - Break
            26: 'SCHEDULED'     // Pending
        };

        return stateMap[stateId] || 'UNKNOWN';
    }

    normalizeStatus(status) {
        if (!status) return 'SCHEDULED';

        const statusMap = {
            'finished': 'FT',
            'live': 'LIVE',
            'in_progress': 'LIVE',
            'scheduled': 'SCHEDULED',
            'postponed': 'POSTPONED',
            'cancelled': 'CANCELLED'
        };

        return statusMap[status.toLowerCase()] || status.toUpperCase();
    }

    getMockFixtures() {
        console.log('✅ สร้างข้อมูล Mock:', this.mockData.fixtures.length, 'แมตช์');
        return this.mockData.fixtures;
    }

    async getMatchesForDate(date) {
        return await this.getFixturesData(date, date);
    }

    async getUpcomingMatches(days = 7) {
        console.log(`📅 กำลังดึงข้อมูลแมตช์ ${days} วันข้างหน้า...`);

        const today = new Date();
        const endDate = new Date();
        endDate.setDate(today.getDate() + days);

        const fromDate = today.toISOString().split('T')[0];
        const toDate = endDate.toISOString().split('T')[0];

        return await this.getFixturesData(fromDate, toDate);
    }

    async getNextWeekMatches() {
        return await this.getUpcomingMatches(7);
    }

    async getLiveMatches() {
        console.log('🔴 กำลังดึงข้อมูลแมตช์สด...');
        const today = new Date().toISOString().split('T')[0];
        const matches = await this.getFixturesData(today, today);
        const liveMatches = matches.filter(match => match.status === 'LIVE');
        console.log(`✅ พบ ${liveMatches.length} แมตช์สด`);
        return liveMatches;
    }

    async searchTeam(teamName) {
        console.log(`🔍 กำลังค้นหาทีม: ${teamName}`);
        const today = new Date().toISOString().split('T')[0];
        const matches = await this.getFixturesData(today, today);

        const teamMatches = matches.filter(match =>
            match.homeTeam.toLowerCase().includes(teamName.toLowerCase()) ||
            match.awayTeam.toLowerCase().includes(teamName.toLowerCase())
        );

        console.log(`✅ พบ ${teamMatches.length} แมตช์ของทีม ${teamName}`);
        return teamMatches;
    }

    async getLeagues() {
        try {
            // ตรวจสอบ cache ก่อน
            if (this.leaguesCache && this.leaguesCacheTime) {
                const cacheAge = Date.now() - this.leaguesCacheTime;
                if (cacheAge < this.CACHE_DURATION) {
                    console.log(`🔄 ใช้ข้อมูลลีกจาก cache (${Math.round(cacheAge / 1000)}s ago)`);
                    return this.leaguesCache;
                }
            }

            console.log('🏆 กำลังดึงข้อมูลลีกจาก API...');
            const url = 'https://football-dw3.pages.dev/api/livescore/leagues/';
            const leagues = await this.fetchWithPuppeteer(url);

            if (Array.isArray(leagues)) {
                console.log(`✅ พบ ${leagues.length} ลีกทั้งหมด`);

                // กรองและเรียงข้อมูลลีก (client-side filtering)
                const processedLeagues = leagues
                    .filter(league => league.active && league.priority > 0)
                    .sort((a, b) => b.priority - a.priority) // เรียงตาม priority สูงสุดก่อน
                    .map(league => ({
                        id: league.id,
                        name: league.name,
                        name_th: league.name_th,
                        shortCode: league.short_code,
                        priority: league.priority,
                        active: league.active
                    }));

                console.log(`✅ กรองได้ ${processedLeagues.length} ลีกที่ใช้งานได้`);

                // เก็บลง cache
                this.leaguesCache = processedLeagues;
                this.leaguesCacheTime = Date.now();
                console.log('💾 บันทึกข้อมูลลงใน cache');

                return processedLeagues;
            }

            throw new Error('ไม่พบข้อมูลลีกในรูปแบบที่คาดหวัง');

        } catch (error) {
            console.log('❌ ไม่สามารถดึงข้อมูลลีกได้:', error.message);
            console.log('🔄 ใช้ข้อมูลลีกตัวอย่าง...');
            return this.getMockLeagues();
        }
    }

    getMockLeagues() {
        return [
            { id: 1, name: 'Premier League', name_th: 'พรีเมียร์ลีก', shortCode: 'EPL', priority: 100, active: true },
            { id: 2, name: 'La Liga', name_th: 'ลา ลีกา', shortCode: 'LAL', priority: 95, active: true },
            { id: 3, name: 'Bundesliga', name_th: 'บุนเดสลีกา', shortCode: 'BUN', priority: 90, active: true },
            { id: 4, name: 'Serie A', name_th: 'เซเรีย อา', shortCode: 'SA', priority: 85, active: true },
            { id: 5, name: 'Ligue 1', name_th: 'ลีก เอิง', shortCode: 'L1', priority: 80, active: true }
        ];
    }

    async getTopLeagues(limit = 20) {
        console.log(`🏆 กำลังดึงข้อมูลลีกยอดนิยม ${limit} อันดับแรก...`);
        const leagues = await this.getLeagues();
        return leagues.slice(0, limit);
    }

    // ค้นหาลีกตาม ID
    async getLeagueById(leagueId) {
        console.log(`🔍 กำลังค้นหาลีก ID: ${leagueId}`);
        const leagues = await this.getLeagues();
        const league = leagues.find(l => l.id == leagueId);

        if (league) {
            console.log(`✅ พบลีก: ${league.name}`);
            return league;
        } else {
            console.log(`❌ ไม่พบลีก ID: ${leagueId}`);
            return null;
        }
    }

    // ค้นหาลีกตามชื่อ
    async searchLeagues(searchTerm, limit = 10) {
        console.log(`🔍 กำลังค้นหาลีก: "${searchTerm}"`);
        const leagues = await this.getLeagues();

        const results = leagues.filter(league => {
            const name = league.name.toLowerCase();
            const nameTh = (league.name_th || '').toLowerCase();
            const shortCode = (league.shortCode || '').toLowerCase();
            const search = searchTerm.toLowerCase();

            return name.includes(search) ||
                   nameTh.includes(search) ||
                   shortCode.includes(search);
        }).slice(0, limit);

        console.log(`✅ พบ ${results.length} ลีกที่ตรงกับ "${searchTerm}"`);
        return results;
    }

    // ดึงลีกตาม priority range
    async getLeaguesByPriority(minPriority = 50, maxPriority = 100, limit = 20) {
        console.log(`🏆 กำลังดึงลีกที่มี priority ${minPriority}-${maxPriority}`);
        const leagues = await this.getLeagues();

        const filtered = leagues
            .filter(league => league.priority >= minPriority && league.priority <= maxPriority)
            .slice(0, limit);

        console.log(`✅ พบ ${filtered.length} ลีกในช่วง priority ที่กำหนด`);
        return filtered;
    }

    // ล้าง cache ลีก
    clearLeaguesCache() {
        console.log('🗑️ ล้าง cache ข้อมูลลีก');
        this.leaguesCache = null;
        this.leaguesCacheTime = null;
    }

    // ตรวจสอบสถานะ cache
    getCacheInfo() {
        if (!this.leaguesCacheTime) {
            return { cached: false, age: 0, leagues: 0 };
        }

        const age = Date.now() - this.leaguesCacheTime;
        return {
            cached: true,
            age: Math.round(age / 1000), // seconds
            leagues: this.leaguesCache ? this.leaguesCache.length : 0,
            isExpired: age > this.CACHE_DURATION
        };
    }

    async getStats() {
        const today = new Date().toISOString().split('T')[0];
        const matches = await this.getFixturesData(today, today);

        const liveMatches = matches.filter(match => match.status === 'LIVE');
        const finishedMatches = matches.filter(match => match.status === 'FT');
        const scheduledMatches = matches.filter(match => match.status === 'SCHEDULED');

        return {
            total: matches.length,
            live: liveMatches.length,
            finished: finishedMatches.length,
            scheduled: scheduledMatches.length
        };
    }

    // ฟังก์ชันใหม่: วิเคราะห์จำนวนคู่การแข่งขันตามลีก
    async getMatchesGroupedByLeague(fromDate, toDate) {
        try {
            console.log(`📊 กำลังวิเคราะห์การแข่งขันตามลีก ${fromDate} ถึง ${toDate}`);

            // ดึงข้อมูลการแข่งขันทั้งหมดในช่วงวันที่กำหนด
            const url = `https://football-dw3.pages.dev/api/fixtures/between/${fromDate}/${toDate}`;
            const data = await this.fetchWithPuppeteer(url);

            // ดึงข้อมูลลีกเพื่อใช้ในการแปลง league_id เป็นชื่อลีก
            const leagues = await this.getLeagues();
            const leagueMap = {};
            leagues.forEach(league => {
                leagueMap[league.id] = league;
            });

            // ตรวจสอบโครงสร้างข้อมูล
            let fixtures = [];
            if (Array.isArray(data)) {
                fixtures = data;
            } else if (data && data.data && Array.isArray(data.data)) {
                fixtures = data.data;
            } else if (data && typeof data === 'object') {
                const values = Object.values(data);
                const arrayValue = values.find(val => Array.isArray(val));
                if (arrayValue) {
                    fixtures = arrayValue;
                }
            }

            if (fixtures.length === 0) {
                console.log('❌ ไม่พบข้อมูลการแข่งขัน');
                return {
                    totalMatches: 0,
                    dateRange: `${fromDate} ถึง ${toDate}`,
                    leagueGroups: []
                };
            }

            console.log(`✅ พบการแข่งขันทั้งหมด ${fixtures.length} คู่`);

            // นับจำนวนคู่การแข่งขันตามลีก
            const leagueCounts = {};
            const leagueMatches = {};

            fixtures.forEach(fixture => {
                const leagueId = fixture.league_id;

                // นับจำนวน
                if (leagueCounts[leagueId]) {
                    leagueCounts[leagueId]++;
                } else {
                    leagueCounts[leagueId] = 1;
                    leagueMatches[leagueId] = [];
                }

                // เก็บข้อมูลแมตช์
                leagueMatches[leagueId].push({
                    id: fixture.id,
                    homeTeam: fixture.home_team_name,
                    awayTeam: fixture.away_team_name,
                    homeScore: fixture.home_score,
                    awayScore: fixture.away_score,
                    status: this.normalizeStatusFromStateId(fixture.state_id),
                    startTime: fixture.starting_at,
                    homeTeamImage: fixture.home_team_image_path,
                    awayTeamImage: fixture.away_team_image_path
                });
            });

            // สร้างผลลัพธ์จัดกลุ่มตามลีก
            const leagueGroups = Object.keys(leagueCounts).map(leagueId => {
                const league = leagueMap[leagueId];
                const matchCount = leagueCounts[leagueId];
                const matches = leagueMatches[leagueId];

                return {
                    leagueId: parseInt(leagueId),
                    leagueName: league ? (league.name_th || league.name) : `ลีก ID ${leagueId}`,
                    leagueNameEn: league ? league.name : `League ${leagueId}`,
                    priority: league ? league.priority : 0,
                    matchCount: matchCount,
                    matches: matches
                };
            }).sort((a, b) => b.priority - a.priority); // เรียงตาม priority

            console.log(`✅ จัดกลุ่มได้ ${leagueGroups.length} ลีก`);

            return {
                totalMatches: fixtures.length,
                dateRange: `${fromDate} ถึง ${toDate}`,
                leagueGroups: leagueGroups
            };

        } catch (error) {
            console.log('❌ ไม่สามารถวิเคราะห์การแข่งขันตามลีกได้:', error.message);
            return {
                totalMatches: 0,
                dateRange: `${fromDate} ถึง ${toDate}`,
                leagueGroups: [],
                error: error.message
            };
        }
    }

    // ฟังก์ชันสำหรับดึงข้อมูลการแข่งขันของวันนี้จัดกลุ่มตามลีก
    async getTodayMatchesGroupedByLeague() {
        const today = new Date().toISOString().split('T')[0];
        return await this.getMatchesGroupedByLeague(today, today);
    }

    // ฟังก์ชันสำหรับดึงข้อมูลการแข่งขันของวันที่กำหนดจัดกลุ่มตามลีก
    async getDateMatchesGroupedByLeague(date) {
        return await this.getMatchesGroupedByLeague(date, date);
    }

    // ฟังก์ชันสำหรับดึงเฉพาะแมตช์ที่ยังไม่เริ่ม (SCHEDULED) จัดกลุ่มตามลีก
    async getScheduledMatchesGroupedByLeague(fromDate, toDate) {
        try {
            console.log(`📅 กำลังดึงข้อมูลแมตช์ที่ยังไม่เริ่ม ${fromDate} ถึง ${toDate}`);

            // ดึงข้อมูลการแข่งขันทั้งหมด
            const allMatches = await this.getMatchesGroupedByLeague(fromDate, toDate);

            if (!allMatches || allMatches.totalMatches === 0) {
                return {
                    totalMatches: 0,
                    scheduledMatches: 0,
                    dateRange: `${fromDate} ถึง ${toDate}`,
                    leagueGroups: []
                };
            }

            // กรองเฉพาะแมตช์ที่ยังไม่เริ่ม และจัดกลุ่มใหม่
            const scheduledLeagueGroups = allMatches.leagueGroups
                .map(leagueGroup => {
                    const scheduledMatches = leagueGroup.matches.filter(match =>
                        match.status === 'SCHEDULED'
                    );

                    return {
                        ...leagueGroup,
                        matchCount: scheduledMatches.length,
                        matches: scheduledMatches
                    };
                })
                .filter(leagueGroup => leagueGroup.matchCount > 0) // เฉพาะลีกที่มีแมตช์ที่ยังไม่เริ่ม
                .sort((a, b) => b.priority - a.priority); // เรียงตาม priority

            const totalScheduledMatches = scheduledLeagueGroups.reduce(
                (sum, group) => sum + group.matchCount, 0
            );

            console.log(`✅ พบ ${totalScheduledMatches} แมตช์ที่ยังไม่เริ่มใน ${scheduledLeagueGroups.length} ลีก`);

            return {
                totalMatches: allMatches.totalMatches,
                scheduledMatches: totalScheduledMatches,
                dateRange: `${fromDate} ถึง ${toDate}`,
                leagueGroups: scheduledLeagueGroups
            };

        } catch (error) {
            console.log('❌ ไม่สามารถดึงข้อมูลแมตช์ที่ยังไม่เริ่มได้:', error.message);
            return {
                totalMatches: 0,
                scheduledMatches: 0,
                dateRange: `${fromDate} ถึง ${toDate}`,
                leagueGroups: [],
                error: error.message
            };
        }
    }

    // ฟังก์ชันสำหรับดึงแมตช์ที่ยังไม่เริ่มของวันนี้
    async getTodayScheduledMatchesGroupedByLeague() {
        const today = new Date().toISOString().split('T')[0];
        return await this.getScheduledMatchesGroupedByLeague(today, today);
    }

    // ฟังก์ชันสำหรับดึงแมตช์ที่ยังไม่เริ่มของสัปดาห์หน้า
    async getUpcomingScheduledMatchesGroupedByLeague(days = 7) {
        const today = new Date();
        const endDate = new Date();
        endDate.setDate(today.getDate() + days);

        const fromDate = today.toISOString().split('T')[0];
        const toDate = endDate.toISOString().split('T')[0];

        return await this.getScheduledMatchesGroupedByLeague(fromDate, toDate);
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
            this.isInitialized = false;
            console.log('🔐 ปิด Puppeteer Browser');
        }
    }
}

module.exports = PuppeteerFootballClient;
