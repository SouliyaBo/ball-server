const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// ใช้ stealth plugin เพื่อหลีกเลี่ยงการตรวจจับ bot
puppeteer.use(StealthPlugin());

class PuppeteerProgramScraper {
    constructor() {
        this.browser = null;
        this.page = null;
        this.isInitialized = false;

        // Cache สำหรับข้อมูล HTML
        this.htmlCache = null;
        this.htmlCacheTime = null;
        this.CACHE_DURATION = 3 * 60 * 1000; // 3 นาที
    }

    async init() {
        try {
            console.log('🚀 เริ่มต้น Puppeteer Browser สำหรับ HTML Scraper...');

            this.browser = await puppeteer.launch({
                headless: 'new',
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

            // ตั้งค่า User Agent
            await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            // ตั้งค่า viewport
            await this.page.setViewport({ width: 1366, height: 768 });

            this.isInitialized = true;
            console.log('✅ Puppeteer Browser สำหรับ HTML Scraper พร้อมใช้งาน');

        } catch (error) {
            console.error('❌ ไม่สามารถเริ่มต้น Puppeteer Browser ได้:', error);
            throw error;
        }
    }

    async scrapeFullHTML(dateOffset = 0) {
        try {
            if (!this.isInitialized) {
                await this.init();
            }

            // ตรวจสอบ cache
            if (this.htmlCache && this.htmlCacheTime &&
                (Date.now() - this.htmlCacheTime) < this.CACHE_DURATION &&
                dateOffset === 0) {
                console.log('🔄 ใช้ข้อมูล HTML จาก cache');
                return this.htmlCache;
            }

            console.log('🌐 กำลัง scrape HTML จาก https://football-dw3.pages.dev/program/...');

            // ไปที่หน้าโปรแกรม
            await this.page.goto('https://football-dw3.pages.dev/program/', {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            // รอให้หน้าโหลดเสร็จสมบูรณ์
            await new Promise(resolve => setTimeout(resolve, 8000));

            // ถ้าต้องการเปลี่ยนวันที่
            if (dateOffset !== 0) {
                await this.changeDateIfNeeded(dateOffset);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }

            // รอให้ข้อมูลโหลดครบ และดูว่ามี element ที่เราต้องการหรือไม่
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Scrape HTML content เฉพาะส่วนที่ต้องการ
            const scrapedData = await this.page.evaluate(() => {
                // หา div ที่มี class ที่ระบุ แต่ใช้วิธีที่ยืดหยุ่นกว่า
                const selectors = [
                    'div.space-y-4.bg-gradient-to-l.from-slate-700.to-slate-900.bg-radial.text-white.pb-6.min-h-64',
                    '.space-y-4.bg-gradient-to-l.from-slate-700.to-slate-900',
                    'div[class*="space-y-4"][class*="bg-gradient-to-l"]',
                    'div[class*="bg-gradient-to-l"][class*="text-white"]',
                    '.space-y-4.text-white',
                    'div[class*="space-y-4"]',
                    '.bg-radial.text-white',
                    'main .container',
                    'main',
                    '.container'
                ];

                let targetDiv = null;

                // ลองหา element ตาม selector ต่างๆ
                for (const selector of selectors) {
                    try {
                        targetDiv = document.querySelector(selector);
                        if (targetDiv && targetDiv.textContent.trim().length > 100) {
                            console.log(`Found target div with selector: ${selector}`);
                            break;
                        }
                    } catch (e) {
                        console.log(`Failed selector: ${selector}`, e.message);
                    }
                }

                if (!targetDiv) {
                    // ถ้าไม่เจอ ให้หาโดยดูจาก textContent ที่มี "โปรแกรมบอล"
                    const allDivs = document.querySelectorAll('div');
                    for (const div of allDivs) {
                        if (div.textContent.includes('โปรแกรมบอล') && div.textContent.length > 200) {
                            targetDiv = div;
                            console.log('Found target div by content search');
                            break;
                        }
                    }
                }

                if (!targetDiv) {
                    return {
                        html: `
                            <div class="error">
                                <h2>ไม่พบ div ที่ต้องการ</h2>
                                <p>ไม่พบ div ที่มี class="space-y-4 bg-gradient-to-l from-slate-700 to-slate-900 bg-radial text-white pb-6 min-h-64"</p>
                                <p>หน้าเว็บอาจยังโหลดไม่เสร็จ หรือโครงสร้าง HTML เปลี่ยนไป</p>
                                <div style="background:#f8f9fa;padding:20px;border-radius:8px;margin:20px 0;">
                                    <h3>ข้อมูลที่พบ:</h3>
                                    <p>Title: ${document.title}</p>
                                    <p>Available divs: ${document.querySelectorAll('div').length}</p>
                                    <p>Body text length: ${document.body.textContent.length}</p>
                                </div>
                            </div>
                        `,
                        title: 'ข้อผิดพลาด - ไม่พบข้อมูล',
                        styles: '.error { padding: 20px; text-align: center; color: #666; }'
                    };
                }

                const mainContent = targetDiv;

                // ดึง CSS styles ทั้งหมด
                let allStyles = '';
                const styleSheets = Array.from(document.styleSheets);

                styleSheets.forEach(sheet => {
                    try {
                        const rules = Array.from(sheet.cssRules || sheet.rules || []);
                        rules.forEach(rule => {
                            if (rule.type === CSSRule.STYLE_RULE) {
                                allStyles += rule.cssText + '\n';
                            }
                        });
                    } catch (e) {
                        // ข้าม stylesheet ที่เข้าถึงไม่ได้ (CORS)
                        console.log('Cannot access stylesheet:', e.message);
                    }
                });

                // ดึง inline styles
                const styleTags = document.querySelectorAll('style');
                styleTags.forEach(style => {
                    allStyles += style.textContent + '\n';
                });

                // ปรับ relative URLs ให้เป็น absolute URLs
                const baseUrl = 'https://football-dw3.pages.dev';
                let htmlContent = mainContent.innerHTML;

                // แทนที่ relative URLs
                htmlContent = htmlContent.replace(/href="\/([^"]*)"/, `href="${baseUrl}/$1"`);
                htmlContent = htmlContent.replace(/src="\/([^"]*)"/, `src="${baseUrl}/$1"`);
                htmlContent = htmlContent.replace(/url\(\/([^)]*)\)/g, `url(${baseUrl}/$1)`);

                // ปรับ CSS
                allStyles = allStyles.replace(/url\(\/([^)]*)\)/g, `url(${baseUrl}/$1)`);
                allStyles = allStyles.replace(/href="\/([^"]*)"/, `href="${baseUrl}/$1"`);

                return {
                    html: htmlContent,
                    title: document.title || 'โปรแกรมบอลวันนี้',
                    styles: allStyles,
                    baseUrl: baseUrl,
                    scrapedAt: new Date().toISOString()
                };
            });

            console.log(`✅ Scrape HTML สำเร็จ: ได้ ${scrapedData.html.length} characters`);

            // บันทึกลง cache ถ้าเป็นวันปัจจุบัน
            if (dateOffset === 0) {
                this.htmlCache = scrapedData;
                this.htmlCacheTime = Date.now();
                console.log('💾 บันทึกข้อมูล HTML ลง cache');
            }

            return scrapedData;

        } catch (error) {
            console.error('❌ เกิดข้อผิดพลาดในการ scrape HTML:', error);

            // ส่งข้อมูล fallback กรณีเกิดข้อผิดพลาด
            return {
                html: `
                    <div class="error-container" style="text-align: center; padding: 40px; color: #666;">
                        <h2>ไม่สามารถเชื่อมต่อได้</h2>
                        <p>ขณะนี้ไม่สามารถดึงข้อมูลจากเว็บต้นทางได้</p>
                        <p>กรุณาลองใหม่อีกครั้งในภายหลัง</p>
                        <small>Error: ${error.message}</small>
                    </div>
                `,
                title: 'ข้อผิดพลาด - โปรแกรมบอลวันนี้',
                styles: `
                    .error-container {
                        background: #f8f9fa;
                        border: 1px solid #dee2e6;
                        border-radius: 8px;
                        margin: 20px;
                    }
                `,
                baseUrl: 'https://football-dw3.pages.dev',
                scrapedAt: new Date().toISOString()
            };
        }
    }

    async changeDateIfNeeded(dateOffset) {
        try {
            console.log(`🗓️ กำลังเปลี่ยนวันที่ offset: ${dateOffset}`);

            // หาปุ่มเปลี่ยนวันที่ - ลองหลายวิธี
            const selectors = [
                `button[data-days="${dateOffset}"]`,
                `.date-btn[data-days="${dateOffset}"]`,
                `.date-selector button:nth-child(${dateOffset + 5})`, // สมมติว่ามี 7 ปุ่ม เริ่มจากกลาง
                `[data-date-offset="${dateOffset}"]`,
                `.calendar button:nth-child(${dateOffset + 4})`
            ];

            for (const selector of selectors) {
                try {
                    const button = await this.page.$(selector);
                    if (button) {
                        console.log(`📅 พบปุ่มวันที่: ${selector}`);
                        await button.click();
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        return;
                    }
                } catch (e) {
                    // ข้าม selector ที่ใช้ไม่ได้
                }
            }

            // ถ้าไม่เจอปุ่ม ลองดูว่ามี date picker อื่นไหม
            const datePickers = await this.page.$$('.date, .calendar, [class*="date"], [class*="day"]');
            if (datePickers.length > 0) {
                console.log(`📅 พบ date picker ${datePickers.length} ตัว`);
                // ลองคลิกตัวที่เหมาะสม
                const index = Math.max(0, Math.min(datePickers.length - 1, dateOffset + 3));
                if (datePickers[index]) {
                    await datePickers[index].click();
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

        } catch (error) {
            console.log('⚠️ ไม่สามารถเปลี่ยนวันที่ได้:', error.message);
        }
    }

    async getTodayHTML() {
        return await this.scrapeFullHTML(0);
    }

    async getUpcomingHTML(days = 1) {
        return await this.scrapeFullHTML(days);
    }

    async getDateHTML(dateOffset) {
        return await this.scrapeFullHTML(dateOffset);
    }

    async close() {
        try {
            if (this.browser) {
                await this.browser.close();
                console.log('🔐 ปิด Puppeteer Browser สำหรับ HTML Scraper');
            }
        } catch (error) {
            console.error('❌ เกิดข้อผิดพลาดในการปิด browser:', error);
        }
    }
}

module.exports = PuppeteerProgramScraper;
