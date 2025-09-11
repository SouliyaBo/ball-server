const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function findAndClickToReveal() {
    console.log('กำลังเปิดเบราว์เซอร์...');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    const targetUrl = 'https://football-dw3.pages.dev/result/';
    console.log(`กำลังเข้าไปที่ ${targetUrl} ...`);

    try {
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        console.log('โครงสร้างหน้าเว็บโหลดเสร็จแล้ว');

        // --- ส่วนสำคัญ ---
        // 1. หา "กรอบ" ของเครื่องเล่นวิดีโอที่ปรากฏขึ้นมาก่อน
        const playerContainerSelector = '.container[data-container]';
        console.log(`กำลังรอให้กรอบวิดีโอ (${playerContainerSelector}) ปรากฏ...`);
        await page.waitForSelector(playerContainerSelector, { visible: true, timeout: 15000 });

        // 2. คลิกที่กรอบนั้นเพื่อกระตุ้นให้วิดีโอโหลด
        console.log('เจอแล้ว! กำลังคลิกที่กรอบวิดีโอ...');
        await page.click(playerContainerSelector);

        // 3. ตอนนี้ค่อยรอให้ iframe ถูกสร้างขึ้นมา
        const iframeSelector = 'iframe';
        console.log(`คลิกเรียบร้อย กำลังรอให้ ${iframeSelector} ถูกสร้างขึ้นมา...`);
        await page.waitForSelector(iframeSelector, { timeout: 10000 });

        // 4. ดึง URL ของ iframe ออกมา
        console.log('เจอ iframe แล้ว! กำลังดึง URL...');
        const iframeSrc = await page.$eval(iframeSelector, iframe => iframe.src);

        console.log('-------------------------------------------');
        console.log('สำเร็จ! URL ของหน้าเครื่องเล่นวิดีโอคือ:');
        console.log(iframeSrc);
        console.log('-------------------------------------------');

    } catch (error) {
        console.log('เกิดข้อผิดพลาด:', error.message);
    }

    await browser.close();
}

findAndClickToReveal();
