const puppeteer = require('puppeteer');

async function testKapookStructure() {
    console.log('🔍 ตรวจสอบโครงสร้างหน้าข่าว Kapook...');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    try {
        await page.goto('https://football.kapook.com/news-42246', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        console.log('✅ โหลดหน้าสำเร็จ');

        // ตรวจสอบ title selectors
        console.log('\n=== TITLE SELECTORS ===');
        const titleTests = await page.evaluate(() => {
            const selectors = ['h1', 'h2', '.title', '.news-title', '.headline'];
            return selectors.map(sel => {
                const el = document.querySelector(sel);
                return {
                    selector: sel,
                    found: !!el,
                    text: el?.textContent?.trim()?.substring(0, 100) || 'Not found'
                };
            });
        });
        titleTests.forEach(t => console.log(`${t.selector}: ${t.found ? '✅' : '❌'} ${t.text}`));

        // ตรวจสอบ content selectors
        console.log('\n=== CONTENT SELECTORS ===');
        const contentTests = await page.evaluate(() => {
            const selectors = [
                '.content',
                '.news-content',
                '.article-content',
                '.text',
                '.story',
                '.detail',
                'article',
                '.entry-content'
            ];
            return selectors.map(sel => {
                const el = document.querySelector(sel);
                const content = el?.textContent?.trim() || '';
                return {
                    selector: sel,
                    found: !!el,
                    length: content.length,
                    preview: content.substring(0, 200) || 'Not found'
                };
            });
        });
        contentTests.forEach(t => console.log(`${t.selector}: ${t.found ? '✅' : '❌'} Length: ${t.length}, Preview: ${t.preview.substring(0, 100)}...`));

        // ตรวจสอบ images
        console.log('\n=== IMAGES ===');
        const images = await page.evaluate(() => {
            const imgs = Array.from(document.querySelectorAll('img'));
            return imgs.map(img => ({
                src: img.src,
                alt: img.alt,
                class: img.className
            })).filter(img => img.src.includes('kapook')).slice(0, 5);
        });
        images.forEach((img, i) => console.log(`${i+1}. ${img.src} (${img.alt})`));

        // ตรวจสอบทั้งหน้า
        console.log('\n=== ALL TEXT CONTENT ===');
        const allText = await page.evaluate(() => {
            return document.body.textContent?.trim().substring(0, 500) || 'No content';
        });
        console.log(allText);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await browser.close();
    }
}

testKapookStructure().catch(console.error);
