const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// เพิ่ม stealth plugin
puppeteer.use(StealthPlugin());

class PuppeteerDataExtractor {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    async init() {
        if (!this.browser) {
            console.log('🚀 เริ่มต้น Puppeteer Browser สำหรับ Data Extraction...');
            this.browser = await puppeteer.launch({
                headless: true,
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
            console.log('✅ Puppeteer Browser พร้อมใช้งานสำหรับ Data Extraction');
        }
    }

    async extractMatchData(url = 'https://football-dw3.pages.dev/program/') {
        try {
            await this.init();

            // ปิด page เก่าและสร้างใหม่เพื่อให้แน่ใจ
            if (this.page) {
                await this.page.close();
                this.page = null;
            }

            this.page = await this.browser.newPage();

            // ตั้งค่า User Agent
            await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            // ตั้งค่า viewport
            await this.page.setViewport({ width: 1920, height: 1080 });

            // ตั้งค่า timeout
            await this.page.setDefaultNavigationTimeout(30000);
            await this.page.setDefaultTimeout(30000);

            console.log(`📊 กำลังดึงข้อมูลแมตช์จาก: ${url}`);

            // เข้าสู่หน้าเว็บ
            await this.page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            // รอให้เนื้อหาโหลดเสร็จ
            await new Promise(resolve => setTimeout(resolve, 5000));

            // ดึงข้อมูลแมตช์ทั้งหมด
            const matchesData = await this.page.evaluate(() => {
                const matches = [];

                console.log('🔍 เริ่มต้นค้นหาแมตช์และลีก...');

                // วิธีที่ 1: ค้นหาจาก .bg-slate-700 (ส่วนหัวลีก)
                const leagueSections = document.querySelectorAll('.bg-slate-700');
                console.log(`พบ ${leagueSections.length} ส่วนลีก`);

                if (leagueSections.length > 0) {
                    leagueSections.forEach((leagueSection, leagueIndex) => {
                        // ดึงชื่อลีกจาก h3
                        const leagueTitle = leagueSection.querySelector('h3');
                        let leagueName = '';
                        if (leagueTitle) {
                            leagueName = leagueTitle.textContent.replace(/\s*\(\d+\s*คู่\)\s*$/, '').trim();
                            console.log(`ลีก ${leagueIndex}: ${leagueName}`);
                        }

                        // หาแมตช์ทั้งหมดหลังจากส่วนลีกนี้
                        let currentElement = leagueSection.nextElementSibling;
                        let matchIndex = 0;

                        while (currentElement && !currentElement.classList.contains('bg-slate-700')) {
                            const matchElements = currentElement.querySelectorAll('.hidden.sm\\:flex, .block.sm\\:hidden');

                            matchElements.forEach((element) => {
                                const match = extractMatchFromElement(element, leagueName, `${leagueIndex}_${matchIndex}`);
                                if (match) {
                                    matches.push(match);
                                    matchIndex++;
                                }
                            });

                            currentElement = currentElement.nextElementSibling;
                        }
                    });
                } else {
                    // วิธีที่ 2: ถ้าไม่เจอ .bg-slate-700 ให้ใช้วิธีเดิม
                    console.log('ไม่พบ .bg-slate-700 ลองใช้วิธีอื่น...');

                    // ค้นหาส่วนหัวลีกจาก selector อื่น
                    const alternativeLeagueSections = document.querySelectorAll('h2, h3, .font-semibold');
                    console.log(`พบส่วนหัวทางเลือก ${alternativeLeagueSections.length} ส่วน`);

                    // หรือดึงแมตช์ทั้งหมดก่อนแล้วหาลีกทีหลัง
                    const allMatchElements = document.querySelectorAll('.hidden.sm\\:flex, .block.sm\\:hidden');
                    console.log(`พบแมตช์ทั้งหมด ${allMatchElements.length} แมตช์`);

                    allMatchElements.forEach((element, index) => {
                        // หาลีกจากการไล่ขึ้นไปหา element ที่มีชื่อลีก
                        let leagueName = findLeagueForElement(element);
                        const match = extractMatchFromElement(element, leagueName, index);
                        if (match) {
                            matches.push(match);
                        }
                    });
                }

                function findLeagueForElement(element) {
                    let current = element;
                    let attempts = 0;

                    // ไล่ขึ้นไปหา parent elements เพื่อหาชื่อลีก
                    while (current && attempts < 10) {
                        // ลองหาใน element ปัจจุบัน
                        const leagueCandidate = current.querySelector('h2, h3, .font-semibold');
                        if (leagueCandidate && leagueCandidate.textContent.trim()) {
                            const text = leagueCandidate.textContent.replace(/\s*\(\d+\s*คู่\)\s*$/, '').trim();
                            if (text.length > 3) { // ตรวจสอบว่าเป็นชื่อลีกจริง
                                return text;
                            }
                        }

                        // ไล่หา previous sibling
                        let prev = current.previousElementSibling;
                        while (prev) {
                            const leagueInPrev = prev.querySelector('h2, h3, .font-semibold, .bg-slate-700 h3');
                            if (leagueInPrev && leagueInPrev.textContent.trim()) {
                                const text = leagueInPrev.textContent.replace(/\s*\(\d+\s*คู่\)\s*$/, '').trim();
                                if (text.length > 3) {
                                    return text;
                                }
                            }
                            prev = prev.previousElementSibling;
                        }

                        current = current.parentElement;
                        attempts++;
                    }

                    return 'ไม่ระบุลีก';
                }

                function extractMatchFromElement(element, leagueName, matchId) {
                    try {
                        // ดึงข้อมูลวันที่และเวลา
                        let dateTime = '';
                        let date = '';
                        let time = '';

                        // ค้นหาจากหลายๆ selector
                        const timeSelectors = [
                            '.text-gray-400',
                            '.text-slate-400',
                            '.text-xs',
                            '.text-sm',
                            '[class*="text-gray"]',
                            '[class*="text-slate"]'
                        ];

                        for (let selector of timeSelectors) {
                            const timeElement = element.closest('div').parentElement.querySelector(selector);
                            if (timeElement) {
                                const text = timeElement.textContent || '';
                                const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
                                const timeMatch = text.match(/(\d{2}:\d{2})/);

                                if (dateMatch || timeMatch) {
                                    if (dateMatch) date = dateMatch[1];
                                    if (timeMatch) time = timeMatch[1];
                                    dateTime = text.trim();
                                    break;
                                }
                            }
                        }

                        // ดึงข้อมูลทีมเหย้า (ทีมขวา)
                        const homeTeam = {};
                        const homeTeamSection = element.querySelector('.w-2\\/5:not(.text-right)');
                        if (homeTeamSection) {
                            const homeTeamImg = homeTeamSection.querySelector('img');
                            const homeTeamName = homeTeamSection.querySelector('.truncate');

                            homeTeam.name = homeTeamName ? homeTeamName.textContent.trim() : '';
                            homeTeam.logo = homeTeamImg ? homeTeamImg.src : '';
                            homeTeam.alt = homeTeamImg ? homeTeamImg.alt : '';
                        }

                        // ดึงข้อมูลทีมเยือน (ทีมซ้าย)
                        const awayTeam = {};
                        const awayTeamSection = element.querySelector('.w-2\\/5.text-right');
                        if (awayTeamSection) {
                            const awayTeamImg = awayTeamSection.querySelector('img');
                            const awayTeamName = awayTeamSection.querySelector('.truncate');

                            awayTeam.name = awayTeamName ? awayTeamName.textContent.trim() : '';
                            awayTeam.logo = awayTeamImg ? awayTeamImg.src : '';
                            awayTeam.alt = awayTeamImg ? awayTeamImg.alt : '';
                        }

                        // ดึงข้อมูลลิงก์แมตช์
                        const matchLink = element.querySelector('.font-bold.text-yellow-300 a');
                        const matchUrl = matchLink ? matchLink.href : '';
                        const matchIdExtracted = matchUrl ? matchUrl.split('/').filter(Boolean).pop() : '';

                        // ตรวจสอบว่ามีข้อมูลทีมหรือไม่
                        if (homeTeam.name || awayTeam.name) {
                            return {
                                id: `match_${matchId}`,
                                matchId: matchIdExtracted,
                                dateTime: dateTime,
                                date: date,
                                time: time,
                                homeTeam: homeTeam,
                                awayTeam: awayTeam,
                                matchUrl: matchUrl,
                                league: leagueName,
                                elementType: element.className,
                                isDesktop: element.classList.contains('hidden'),
                                isMobile: element.classList.contains('block')
                            };
                        }
                    } catch (error) {
                        console.error('Error processing match element:', error);
                    }
                    return null;
                }

                console.log(`🎯 รวมพบ ${matches.length} แมตช์`);
                return matches;
            });

            console.log(`✅ ดึงข้อมูลแมตช์สำเร็จ: ${matchesData.length} แมตช์`);

            // ลบข้อมูลซ้ำ (เอาเฉพาะ desktop version)
            const uniqueMatches = [];
            const seenMatches = new Set();

            matchesData.forEach(match => {
                const signature = `${match.homeTeam.name}-${match.awayTeam.name}-${match.time}`;

                if (!seenMatches.has(signature)) {
                    seenMatches.add(signature);
                    uniqueMatches.push(match);
                } else if (match.isDesktop) {
                    // ถ้าเจอแมตช์เดียวกัน แต่เป็น desktop version ให้แทนที่
                    const existingIndex = uniqueMatches.findIndex(m =>
                        `${m.homeTeam.name}-${m.awayTeam.name}-${m.time}` === signature
                    );
                    if (existingIndex !== -1) {
                        uniqueMatches[existingIndex] = match;
                    }
                }
            });

            console.log(`🔍 ข้อมูลหลังลบซ้ำ: ${uniqueMatches.length} แมตช์`);

            return {
                success: true,
                totalMatches: uniqueMatches.length,
                matches: uniqueMatches,
                extractedAt: new Date().toISOString(),
                source: url
            };

        } catch (error) {
            console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูล:', error);
            return {
                success: false,
                error: error.message,
                matches: [],
                extractedAt: new Date().toISOString(),
                source: url
            };
        }
    }

    async extractMatchesByDate(dateOffset = 0) {
        try {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + dateOffset);

            // สร้าง URL สำหรับวันที่เฉพาะ (ถ้า API รองรับ)
            const url = `https://football-dw3.pages.dev/program/?date=${targetDate.toISOString().split('T')[0]}`;

            return await this.extractMatchData(url);
        } catch (error) {
            console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูลตามวันที่:', error);
            return {
                success: false,
                error: error.message,
                matches: [],
                extractedAt: new Date().toISOString()
            };
        }
    }

    async close() {
        if (this.page) {
            await this.page.close();
            this.page = null;
        }
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            console.log('🔒 ปิด Puppeteer Browser สำหรับ Data Extraction');
        }
    }
}

module.exports = PuppeteerDataExtractor;
