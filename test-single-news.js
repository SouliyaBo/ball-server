const puppeteer = require('puppeteer');

async function testSingleNews() {
    console.log('🔍 ทดสอบดึงข่าวเดี่ยว...');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    try {
        // ทดสอบกับข่าวที่รู้ว่าทำงาน
        await page.goto('https://football.kapook.com/news-42246', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        console.log('✅ โหลดหน้าสำเร็จ');

        await new Promise(resolve => setTimeout(resolve, 2000));

        const newsDetail = await page.evaluate(() => {
            // หาหัวข้อข่าว
            const titleSelectors = ['h1', 'h2', '.title', '.news-title'];
            let title = '';
            for (const selector of titleSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent?.trim()) {
                    title = element.textContent.trim();
                    break;
                }
            }

            // หาเนื้อหาข่าว - ใช้ .content ที่พบจากการทดสอบ
            let content = '';
            const contentElement = document.querySelector('.content');
            if (contentElement) {
                // ลบ script, style tags ก่อน
                const scripts = contentElement.querySelectorAll('script, style, .bb_wrapper');
                scripts.forEach(el => el.remove());

                // ดึงเฉพาะ text content และทำความสะอาด
                content = contentElement.textContent?.trim() || '';

                // ทำความสะอาดข้อความ
                content = content
                    .replace(/\s+/g, ' ') // ลดช่องว่างเกิน
                    .replace(/\n{3,}/g, '\n\n') // ลดบรรทัดว่างเกิน
                    .replace(/\.bb_wrapper.*?}/g, '') // ลบ CSS code
                    .replace(/\{[^}]*\}/g, '') // ลบ CSS rules
                    .replace(/\s*googletag\s*\.\s*cmd.*?$/gm, '') // ลบ Google tags
                    .replace(/\s*\(\s*function.*?\).*?$/gm, '') // ลบ JavaScript
                    .trim();
            }

            // หาวันที่
            const dateSelectors = ['.date', '.time', 'time', '.publish-date'];
            let publishDate = '';
            for (const selector of dateSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent?.trim()) {
                    publishDate = element.textContent.trim();
                    break;
                }
            }

            // หารูปภาพ - เฉพาะรูปข่าวจริงและเรียงตามความสำคัญ
            const allImages = Array.from(document.querySelectorAll('img'))
                .map(img => ({
                    src: img.src,
                    alt: img.alt || '',
                    className: img.className || '',
                    width: img.width || 0,
                    height: img.height || 0
                }))
                .filter(img => {
                    if (!img.src) return false;

                    // เอาเฉพาะรูปข่าวจาก cms/upload และกรองออกรูปที่ไม่ต้องการ
                    if (!img.src.includes('football.kapook.com/cms/upload')) return false;

                    // กรองออกรูปที่ไม่ต้องการ
                    if (img.src.includes('logo') ||
                        img.src.includes('svg') ||
                        img.src.includes('truehits') ||
                        img.src.includes('goggen.php') ||
                        img.src.includes('ic-sv-') ||
                        img.src.includes('banner') ||
                        img.src.includes('icon')) return false;

                    return true;
                })
                .sort((a, b) => {
                    // เรียงตามความสำคัญ (รูปใหญ่ก่อน, รูปที่มี news ในชื่อก่อน)
                    const aScore = (a.width * a.height) +
                                 (a.src.includes('/large/') ? 100000 : 0) +
                                 (a.src.includes('news-') ? 50000 : 0);
                    const bScore = (b.width * b.height) +
                                 (b.src.includes('/large/') ? 100000 : 0) +
                                 (b.src.includes('news-') ? 50000 : 0);
                    return bScore - aScore;
                });

            const images = allImages.map(img => img.src).slice(0, 5); // เอาไว้ 5 รูป

            // แสดงรายละเอียดรูปภาพ
            console.log('\n=== รายละเอียดรูปภาพ ===');
            allImages.forEach((img, i) => {
                const score = (img.width * img.height) +
                             (img.src.includes('/large/') ? 100000 : 0) +
                             (img.src.includes('news-') ? 50000 : 0);
                console.log(`${i+1}. ${img.src}`);
                console.log(`   Size: ${img.width}x${img.height}, Score: ${score}`);
                console.log(`   Alt: ${img.alt}`);
            });            return {
                title: title || '',
                content: content || '',
                publishDate: publishDate || '',
                images: images,
                url: window.location.href
            };
        });

        console.log('=== ผลการดึงข้อมูล ===');
        console.log('Title:', newsDetail.title.substring(0, 100));
        console.log('Content length:', newsDetail.content.length);
        console.log('Content preview:', newsDetail.content.substring(0, 300));
        console.log('Images:', newsDetail.images);
        console.log('URL:', newsDetail.url);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await browser.close();
    }
}

testSingleNews().catch(console.error);
