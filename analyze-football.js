const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function analyzeFootballSite() {
    console.log('กำลังเปิดเบราว์เซอร์...');
    const browser = await puppeteer.launch({ headless: false }); // เปลี่ยนเป็น false เพื่อดูการทำงาน
    const page = await browser.newPage();

    const targetUrl = 'https://football-dw3.pages.dev/result/';
    console.log(`กำลังเข้าไปที่ ${targetUrl} ...`);

    try {
        // ตั้งค่าให้ intercept network requests
        await page.setRequestInterception(true);

        const apiRequests = [];

        page.on('request', (request) => {
            const url = request.url();
            // จับ API calls ที่เป็น JSON หรือ AJAX
            if (url.includes('api') ||
                request.headers()['content-type']?.includes('application/json') ||
                url.includes('result') ||
                url.includes('match') ||
                url.includes('football')) {
                apiRequests.push({
                    url: url,
                    method: request.method(),
                    headers: request.headers(),
                    postData: request.postData()
                });
                console.log(`🔍 API Request detected: ${request.method()} ${url}`);
            }
            request.continue();
        });

        // จับ response ด้วย
        page.on('response', async (response) => {
            const url = response.url();
            if (url.includes('api') ||
                response.headers()['content-type']?.includes('application/json')) {
                try {
                    const data = await response.text();
                    console.log(`📥 API Response from ${url}:`);
                    console.log(data.substring(0, 200) + '...');
                } catch (err) {
                    console.log(`❌ ไม่สามารถอ่าน response จาก ${url}`);
                }
            }
        });

        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        console.log('หน้าเว็บโหลดเสร็จแล้ว');

        // รอสักครู่ให้ JavaScript โหลดข้อมูล
        await page.waitForTimeout(3000);

        // ตรวจสอบโครงสร้าง HTML
        console.log('\n📋 ตรวจสอบโครงสร้างหน้าเว็บ...');

        // หาตารางหรือส่วนที่แสดงผลการแข่งขัน
        const tableSelector = 'table, .match-list, .result-list, .matches, .games';
        const tables = await page.$$(tableSelector);
        console.log(`พบตาราง/รายการ: ${tables.length} รายการ`);

        // หาปุ่มวันที่
        const dateButtons = await page.$$('button, .date-button, .tab, [role="tab"]');
        console.log(`พบปุ่ม/แท็บ: ${dateButtons.length} รายการ`);

        // ลองหาข้อมูลการแข่งขัน
        const matchElements = await page.$$('.match, .game, .fixture, .result');
        console.log(`พบองค์ประกอบการแข่งขัน: ${matchElements.length} รายการ`);

        // ลองคลิกปุ่มวันที่ต่างๆ (ถ้ามี)
        if (dateButtons.length > 0) {
            console.log('\n🔄 ลองคลิกปุ่มวันที่เพื่อดู API calls...');
            for (let i = 0; i < Math.min(3, dateButtons.length); i++) {
                try {
                    await dateButtons[i].click();
                    console.log(`คลิกปุ่มที่ ${i + 1}`);
                    await page.waitForTimeout(2000); // รอให้ API calls เสร็จ
                } catch (err) {
                    console.log(`ไม่สามารถคลิกปุ่มที่ ${i + 1} ได้`);
                }
            }
        }

        // แสดงข้อมูลที่มีอยู่ในหน้า
        console.log('\n📊 ข้อมูลที่แสดงในหน้า:');
        const pageText = await page.evaluate(() => document.body.innerText);

        // หาข้อมูลการแข่งขัน
        const matchInfo = await page.evaluate(() => {
            const matches = [];

            // ลองหาตารางหรือรายการการแข่งขัน
            const rows = document.querySelectorAll('tr, .match-row, .match-item, .game-item');

            rows.forEach((row, index) => {
                const text = row.innerText || row.textContent;
                if (text && (text.includes('-') || text.includes('vs') || text.includes(':'))) {
                    matches.push({
                        index: index,
                        text: text.trim(),
                        html: row.innerHTML.substring(0, 200)
                    });
                }
            });

            return matches;
        });

        console.log('ข้อมูลการแข่งขันที่พบ:');
        matchInfo.forEach(match => {
            console.log(`${match.index}: ${match.text}`);
        });

        console.log('\n🌐 API Requests ที่พบทั้งหมด:');
        apiRequests.forEach((req, index) => {
            console.log(`${index + 1}. ${req.method} ${req.url}`);
        });

        // ถ่ายภาพหน้าจอ
        await page.screenshot({ path: 'football-analysis.png', fullPage: true });
        console.log('📸 บันทึกภาพหน้าจอแล้ว: football-analysis.png');

    } catch (error) {
        console.log('เกิดข้อผิดพลาด:', error.message);
    }

    await browser.close();
}

analyzeFootballSite();
