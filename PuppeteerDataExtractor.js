const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// เพิ่ม stealth plugin
puppeteer.use(StealthPlugin());

class PuppeteerDataExtractor {
    constructor() {
        // เอา browser และ page ออก เพื่อให้แต่ละ request สร้างใหม่
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
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--run-all-compositor-stages-before-draw',
                    '--disable-background-timer-throttling',
                    '--disable-renderer-backgrounding',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-ipc-flooding-protection',
                    '--disable-extensions',
                    '--disable-default-apps',
                    '--disable-sync',
                    '--disable-translate',
                    '--hide-scrollbars',
                    '--mute-audio',
                    '--no-default-browser-check',
                    '--no-first-run',
                    '--disable-background-networking',
                    '--disable-background-timer-throttling',
                    '--disable-client-side-phishing-detection',
                    '--disable-default-apps',
                    '--disable-hang-monitor',
                    '--disable-popup-blocking',
                    '--disable-prompt-on-repost',
                    '--disable-sync',
                    '--disable-web-resources',
                    '--metrics-recording-only',
                    '--no-default-browser-check',
                    '--no-first-run',
                    '--password-store=basic',
                    '--use-mock-keychain',
                    '--disable-dev-shm-usage',
                    '--single-process'
                ],
                // executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable'
                // ให้ Puppeteer หา Chrome เอง
            });
            console.log('✅ Puppeteer Browser พร้อมใช้งานสำหรับ Data Extraction');
        }
    }

    async extractMatchData(url = 'https://football-dw3.pages.dev/program/') {
        let browser = null;
        let page = null;

        try {
            console.log('📊 กำลังดึงข้อมูลแมตช์จาก:', url);

            // สร้าง browser ใหม่ทุกครั้งเพื่อป้องกัน detached frame
            console.log('🚀 เริ่มต้น Puppeteer Browser สำหรับ Data Extraction...');
            browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--run-all-compositor-stages-before-draw',
                    '--disable-background-timer-throttling',
                    '--disable-renderer-backgrounding',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-ipc-flooding-protection',
                    '--disable-extensions',
                    '--disable-default-apps',
                    '--disable-sync',
                    '--disable-translate',
                    '--hide-scrollbars',
                    '--mute-audio',
                    '--no-default-browser-check',
                    '--no-first-run',
                    '--disable-background-networking',
                    '--disable-background-timer-throttling',
                    '--disable-client-side-phishing-detection',
                    '--disable-default-apps',
                    '--disable-hang-monitor',
                    '--disable-popup-blocking',
                    '--disable-prompt-on-repost',
                    '--disable-sync',
                    '--disable-web-resources',
                    '--metrics-recording-only',
                    '--no-default-browser-check',
                    '--no-first-run',
                    '--password-store=basic',
                    '--use-mock-keychain',
                    '--disable-dev-shm-usage',
                    '--single-process'
                ],
                // ให้ Puppeteer หา Chrome เอง
            });

            console.log('✅ Puppeteer Browser พร้อมใช้งานสำหรับ Data Extraction');

            page = await browser.newPage();

            // ตั้งค่า User Agent - รองรับทั้ง macOS และ Linux
            const userAgent = process.platform === 'darwin'
                ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                : 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
            await page.setUserAgent(userAgent);

            // ตั้งค่า viewport
            await page.setViewport({ width: 1920, height: 1080 });

            // ตั้งค่า timeout ให้เร็วขึ้น
            await page.setDefaultNavigationTimeout(30000);
            await page.setDefaultTimeout(30000);

            console.log('🔄 เริ่มเข้าสู่หน้าเว็บ...');

            // เข้าสู่หน้าเว็บ - รอให้โหลดเสร็จดี
            await page.goto(url, {
                waitUntil: ['domcontentloaded', 'networkidle0'],
                timeout: 30000
            });

            console.log('✅ หน้าเว็บโหลดเสร็จแล้ว, รอให้ content โหลดเสร็จ...');

            // รอให้ dynamic content โหลด
            await page.waitForSelector('body', { timeout: 10000 });

            // รอให้ content โหลดเสร็จ
            await new Promise(resolve => setTimeout(resolve, 3000));

            console.log('🔍 เริ่มดึงข้อมูลแมตช์...');

            // ตรวจสอบ page state ก่อนดึงข้อมูล
            const pageUrl = await page.url();
            console.log(`✅ Page URL: ${pageUrl}`);

            if (page.isClosed()) {
                throw new Error('Page is closed');
            }

            // ดึงข้อมูลแมตช์ทั้งหมด - ใช้ try-catch เพิ่มเติม
            let matchesData;
            let retryCount = 0;
            const maxRetries = 3;

            while (retryCount < maxRetries) {
                try {
                    console.log(`🔄 Attempt ${retryCount + 1}/${maxRetries} to extract data...`);

                    matchesData = await page.evaluate(() => {
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
                        // ดึงข้อมูลวันที่และเวลา - วิธีใหม่ที่ครอบคลุมมากขึ้น
                        let dateTime = '';
                        let date = '';
                        let time = '';

                        // วิธีที่ 1: ค้นหาจาก element ที่อยู่ข้างๆ หรือข้างบน
                        let searchElements = [];

                        // หาจาก parent และ siblings
                        let parentElement = element.parentElement;
                        while (parentElement && searchElements.length < 20) {
                            // เพิ่ม element ปัจจุบัน
                            searchElements.push(parentElement);

                            // เพิ่ม previous siblings
                            let prev = parentElement.previousElementSibling;
                            while (prev && searchElements.length < 20) {
                                searchElements.push(prev);
                                prev = prev.previousElementSibling;
                            }

                            // เพิ่ม next siblings
                            let next = parentElement.nextElementSibling;
                            while (next && searchElements.length < 20) {
                                searchElements.push(next);
                                next = next.nextElementSibling;
                            }

                            parentElement = parentElement.parentElement;
                        }

                        // ค้นหาในทุก element ที่รวบรวมมา
                        for (let searchElement of searchElements) {
                            // ค้นหาจาก text content โดยตรง
                            const text = searchElement.textContent || '';

                            // ลองหา pattern วันที่และเวลา
                            const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
                            const timeMatch = text.match(/(\d{1,2}:\d{2})/);

                            if (dateMatch || timeMatch) {
                                if (dateMatch) date = dateMatch[1];
                                if (timeMatch) time = timeMatch[1];
                                dateTime = text.trim();
                                console.log(`พบวันที่เวลา: ${dateTime} (date: ${date}, time: ${time})`);
                                break;
                            }

                            // ค้นหาจาก child elements ที่มี class เกี่ยวกับเวลา
                            const timeElements = searchElement.querySelectorAll(`
                                .text-gray-400, .text-slate-400, .text-gray-500, .text-slate-500,
                                .text-xs, .text-sm, [class*="text-gray"], [class*="text-slate"],
                                .opacity-70, .opacity-60, [class*="opacity"]
                            `);

                            for (let timeElement of timeElements) {
                                const timeText = timeElement.textContent || '';
                                const timeDateMatch = timeText.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
                                const timeTimeMatch = timeText.match(/(\d{1,2}:\d{2})/);

                                if (timeDateMatch || timeTimeMatch) {
                                    if (timeDateMatch) date = timeDateMatch[1];
                                    if (timeTimeMatch) time = timeTimeMatch[1];
                                    dateTime = timeText.trim();
                                    console.log(`พบวันที่เวลาใน child: ${dateTime} (date: ${date}, time: ${time})`);
                                    break;
                                }
                            }

                            if (date || time) break;
                        }

                        // วิธีที่ 2: ถ้ายังไม่เจอ ลองค้นหาจาก DOM structure ที่เป็นไปได้
                        if (!date && !time) {
                            // ค้นหาจากโครงสร้าง HTML โดยทั่วไป
                            const commonTimeSelectors = [
                                'div:has(.hidden.sm\\:flex) .text-xs',
                                'div:has(.hidden.sm\\:flex) .text-sm',
                                'div:has(.hidden.sm\\:flex) [class*="text-gray"]',
                                '.space-y-2 .text-gray-400',
                                '.space-y-4 .text-gray-400'
                            ];

                            for (let selector of commonTimeSelectors) {
                                try {
                                    const timeElement = document.querySelector(selector);
                                    if (timeElement) {
                                        const timeText = timeElement.textContent || '';
                                        const timeDateMatch = timeText.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
                                        const timeTimeMatch = timeText.match(/(\d{1,2}:\d{2})/);

                                        if (timeDateMatch || timeTimeMatch) {
                                            if (timeDateMatch) date = timeDateMatch[1];
                                            if (timeTimeMatch) time = timeTimeMatch[1];
                                            dateTime = timeText.trim();
                                            console.log(`พบวันที่เวลาจาก common selector: ${dateTime}`);
                                            break;
                                        }
                                    }
                                } catch (e) {
                                    // ข้าม selector ที่ error
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
                } // ปิด function extractMatchFromElement

                console.log(`🎯 รวมพบ ${matches.length} แมตช์`);
                return matches;
            });

                    break; // ถ้า evaluate สำเร็จ ให้ออกจาก loop
                } catch (evaluateError) {
                    console.error(`❌ Attempt ${retryCount + 1} failed:`, evaluateError.message);
                    retryCount++;

                    if (retryCount >= maxRetries) {
                        throw new Error(`Failed after ${maxRetries} attempts: ${evaluateError.message}`);
                    }

                    // รอ 1 วินาทีก่อนลองใหม่
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // ตรวจสอบ page state อีกครั้ง
                    if (page.isClosed()) {
                        throw new Error('Page is closed during retry');
                    }
                }
            }

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
        } finally {
            // ปิด browser ที่สร้างในฟังก์ชันนี้
            if (page) {
                try {
                    await page.close();
                } catch (e) {
                    console.error('Error closing page:', e);
                }
            }
            if (browser) {
                try {
                    await browser.close();
                    console.log('🔒 ปิด Puppeteer Browser หลังดึงข้อมูล');
                } catch (e) {
                    console.error('Error closing browser:', e);
                }
            }
        }
    }

    async extractMatchesByDate(dateOffset = 0) {
        try {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + dateOffset);
            const dateString = targetDate.toISOString().split('T')[0];

            console.log(`🗓️ กำลังดึงข้อมูลสำหรับวันที่: ${dateString} (offset: ${dateOffset})`);

            // วิธีที่ 1: ลองใช้ URL parameter
            let url = `https://football-dw3.pages.dev/program/?date=${dateString}`;
            console.log(`🔗 URL ที่ลอง: ${url}`);

            let result = await this.extractMatchDataWithDate(url, dateString);

            // ตรวจสอบว่าได้ข้อมูลที่ถูกต้องไหม
            if (result.matches && result.matches.length > 0) {
                const sampleMatch = result.matches[0];
                console.log(`🔍 ตัวอย่างข้อมูลที่ได้: วันที่=${sampleMatch.date}, เวลา=${sampleMatch.time}`);

                // ถ้าข้อมูลที่ได้ไม่ตรงกับวันที่ที่ต้องการ
                if (sampleMatch.date && !sampleMatch.date.includes(dateString.split('-')[2])) {
                    console.log(`⚠️ ข้อมูลไม่ตรงกับวันที่ที่ต้องการ, ลองวิธีอื่น...`);

                    // วิธีที่ 2: ลองใช้การคลิกปุ่มวันที่ในเว็บ
                    result = await this.extractMatchDataByClickingDate(dateOffset);
                }
            }

            return result;
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

    async extractMatchDataWithDate(url, targetDateString) {
        // ใช้ extractMatchData เดิมแต่เพิ่มการตรวจสอบ
        const result = await this.extractMatchData(url);

        // เพิ่มข้อมูลวันที่เป้าหมาย
        if (result.success) {
            result.targetDate = targetDateString;
            result.requestedUrl = url;
        }

        return result;
    }

    async extractMatchDataByClickingDate(dateOffset) {
        try {
            console.log(`🖱️ ลองใช้วิธีคลิกปุ่มวันที่ (offset: ${dateOffset})`);

            await this.init();

            if (this.page) {
                await this.page.close();
                this.page = null;
            }

            this.page = await this.browser.newPage();
            await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            await this.page.setViewport({ width: 1920, height: 1080 });

            console.log(`🌐 เข้าสู่หน้าเว็บหลัก...`);
            await this.page.goto('https://football-dw3.pages.dev/program/', {
                waitUntil: 'domcontentloaded',
                timeout: 15000
            });

            // ลดเวลารอ
            await new Promise(resolve => setTimeout(resolve, 1500));

            // หาปุ่มวันที่ตาม offset
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + dateOffset);
            const dayInThai = targetDate.getDate();

            console.log(`🔍 ค้นหาปุ่มวันที่ ${dayInThai}...`);

            // ลองคลิกปุ่มวันที่
            const dateButtons = await this.page.$$eval('button', buttons =>
                buttons.map(btn => ({
                    text: btn.textContent.trim(),
                    classList: btn.className
                }))
            );

            console.log(`📱 พบปุ่ม: ${JSON.stringify(dateButtons.slice(0, 5))}`);

            // หาปุ่มที่มีวันที่ที่ต้องการ
            const targetButtonSelector = `button:contains("${dayInThai}")`;

            try {
                await this.page.evaluate((dayInThai) => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const targetButton = buttons.find(btn =>
                        btn.textContent.includes(String(dayInThai)) &&
                        btn.textContent.includes('ก.ย.')
                    );
                    if (targetButton) {
                        console.log(`🖱️ คลิกปุ่ม: ${targetButton.textContent}`);
                        targetButton.click();
                        return true;
                    }
                    return false;
                }, dayInThai);

                // รอให้ข้อมูลโหลด - ลดเวลารอ
                await new Promise(resolve => setTimeout(resolve, 2000));

                // ดึงข้อมูลหลังจากคลิก
                return await this.extractCurrentPageMatches();

            } catch (clickError) {
                console.log(`⚠️ ไม่สามารถคลิกปุ่มได้: ${clickError.message}`);
                return await this.extractCurrentPageMatches();
            }

        } catch (error) {
            console.error('❌ เกิดข้อผิดพลาดในการคลิกปุ่มวันที่:', error);
            return {
                success: false,
                error: error.message,
                matches: [],
                extractedAt: new Date().toISOString()
            };
        }
    }

    async extractCurrentPageMatches() {
        // ดึงข้อมูลจากหน้าปัจจุบันโดยใช้ logic เดิม
        const matchesData = await this.page.evaluate(() => {
            // ใช้ logic เดียวกับใน extractMatchData
            const matches = [];

            const leagueSections = document.querySelectorAll('.bg-slate-700');
            console.log(`พบ ${leagueSections.length} ส่วนลีก`);

            if (leagueSections.length > 0) {
                leagueSections.forEach((leagueSection, leagueIndex) => {
                    const leagueTitle = leagueSection.querySelector('h3');
                    let leagueName = '';
                    if (leagueTitle) {
                        leagueName = leagueTitle.textContent.replace(/\s*\(\d+\s*คู่\)\s*$/, '').trim();
                    }

                    let currentElement = leagueSection.nextElementSibling;
                    let matchIndex = 0;

                    while (currentElement && !currentElement.classList.contains('bg-slate-700')) {
                        const matchElements = currentElement.querySelectorAll('.hidden.sm\\:flex, .block.sm\\:hidden');

                        matchElements.forEach((element) => {
                            // ใช้ logic ใน extractMatchFromElement แต่ซ้ำที่นี่
                            try {
                                // ดึงข้อมูลวันที่และเวลา
                                let dateTime = '';
                                let date = '';
                                let time = '';

                                // ค้นหาวันที่และเวลาจาก element และ siblings
                                let searchElements = [element];
                                let parentElement = element.parentElement;

                                while (parentElement && searchElements.length < 10) {
                                    searchElements.push(parentElement);
                                    let prev = parentElement.previousElementSibling;
                                    while (prev && searchElements.length < 10) {
                                        searchElements.push(prev);
                                        prev = prev.previousElementSibling;
                                    }
                                    parentElement = parentElement.parentElement;
                                }

                                // ค้นหาในทุก element ที่รวบรวมมา
                                for (let searchElement of searchElements) {
                                    const text = searchElement.textContent || '';
                                    const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
                                    const timeMatch = text.match(/(\d{1,2}:\d{2})/);

                                    if (dateMatch || timeMatch) {
                                        if (dateMatch) date = dateMatch[1];
                                        if (timeMatch) time = timeMatch[1];
                                        dateTime = text.trim();
                                        break;
                                    }
                                }

                                const homeTeamSection = element.querySelector('.w-2\\/5:not(.text-right)');
                                const awayTeamSection = element.querySelector('.w-2\\/5.text-right');

                                if (homeTeamSection && awayTeamSection) {
                                    const homeTeamName = homeTeamSection.querySelector('.truncate');
                                    const awayTeamName = awayTeamSection.querySelector('.truncate');
                                    const homeTeamImg = homeTeamSection.querySelector('img');
                                    const awayTeamImg = awayTeamSection.querySelector('img');

                                    // ดึงข้อมูลลิงก์แมตช์
                                    const matchLink = element.querySelector('.font-bold.text-yellow-300 a');
                                    const matchUrl = matchLink ? matchLink.href : '';
                                    const matchIdExtracted = matchUrl ? matchUrl.split('/').filter(Boolean).pop() : '';

                                    if (homeTeamName && awayTeamName) {
                                        matches.push({
                                            id: `match_${leagueIndex}_${matchIndex}`,
                                            matchId: matchIdExtracted,
                                            dateTime: dateTime,
                                            date: date,
                                            time: time,
                                            homeTeam: {
                                                name: homeTeamName.textContent.trim(),
                                                logo: homeTeamImg ? homeTeamImg.src : '',
                                                alt: homeTeamImg ? homeTeamImg.alt : ''
                                            },
                                            awayTeam: {
                                                name: awayTeamName.textContent.trim(),
                                                logo: awayTeamImg ? awayTeamImg.src : '',
                                                alt: awayTeamImg ? awayTeamImg.alt : ''
                                            },
                                            matchUrl: matchUrl,
                                            league: leagueName,
                                            elementType: element.className,
                                            isDesktop: element.classList.contains('hidden'),
                                            isMobile: element.classList.contains('block')
                                        });
                                        matchIndex++;
                                    }
                                }
                            } catch (e) {
                                console.error('Error processing match:', e);
                            }
                        });

                        currentElement = currentElement.nextElementSibling;
                    }
                });
            }

            return matches;
        });

        return {
            success: true,
            totalMatches: matchesData.length,
            matches: matchesData,
            extractedAt: new Date().toISOString(),
            method: 'click-navigation'
        };
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
