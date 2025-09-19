const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

class KapookNewsScraper {
    constructor() {
        this.newsListUrl = 'https://football.kapook.com/newslist.php';
        this.browser = null;
        this.page = null;
    }

    async init() {
        if (!this.browser) {
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
                    '--disable-features=VizDisplayCompositor'
                ]
            });
            console.log('✅ Kapook News Scraper Browser พร้อมใช้งาน');
        }
    }

    async scrapeNewsList(maxNews = 10) {
        try {
            console.log('📰 กำลังดึงรายการข่าวจาก Kapook...');
            console.log('🔍 URL เป้าหมาย:', this.newsListUrl);

            if (!this.browser) {
                await this.init();
            }

            this.page = await this.browser.newPage();

            // ตั้งค่า user agent
            await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

            // ไปที่หน้าข่าว
            await this.page.goto(this.newsListUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });

            // รอให้หน้าโหลดเสร็จ
            await this.page.waitForSelector('body', { timeout: 10000 });

            // เพิ่ม delay เพื่อให้ JavaScript โหลดเสร็จ
            await new Promise(resolve => setTimeout(resolve, 3000));

            console.log('📄 หน้าเว็บโหลดเสร็จแล้ว เริ่มค้นหาข่าว...');

            // ดึงข่าวทั้งหมดจากหน้าแรก - เพิ่มการค้นหาหลายรูปแบบ
            const newsItems = await this.page.evaluate(() => {
                const items = [];

                // ลองหลายรูปแบบของ selector
                const selectors = [
                    '.news-item',
                    '.article-item',
                    '[class*="news"]',
                    '[class*="article"]',
                    '.list-news li',
                    '.news-list li',
                    'tr[onclick*="news-"]',
                    'a[href*="/news-"]'
                ];

                let foundElements = [];

                // รวบรวม elements จากทุก selector
                selectors.forEach(selector => {
                    const elements = document.querySelectorAll(selector);
                    foundElements.push(...Array.from(elements));
                });

                // ลบ duplicate elements
                foundElements = [...new Set(foundElements)];

                console.log(`พบ elements ทั้งหมด: ${foundElements.length}`);

                foundElements.forEach(element => {
                    // ลองหาชื่อข่าวจากหลายแหล่ง
                    let titleElement = element.querySelector('h2 a, h3 a, .title a, strong a, td a, span a');
                    let linkElement = element.querySelector('a[href*="/news-"]');

                    // ถ้าไม่เจอ ลองดูว่า element นี้เป็น link เองไหม
                    if (!titleElement && element.tagName === 'A' && element.href.includes('/news-')) {
                        titleElement = element;
                        linkElement = element;
                    }

                    // ถ้าไม่เจอ ลองดูใน parent element
                    if (!titleElement || !linkElement) {
                        const parentElement = element.closest('tr, li, div');
                        if (parentElement) {
                            titleElement = titleElement || parentElement.querySelector('a[href*="/news-"]');
                            linkElement = linkElement || parentElement.querySelector('a[href*="/news-"]');
                        }
                    }

                    if (titleElement && linkElement) {
                        const title = titleElement.textContent.trim();
                        let link = linkElement.href;

                        // แปลง relative URL เป็น absolute URL
                        if (link.startsWith('/')) {
                            link = 'https://football.kapook.com' + link;
                        }

                        if (title && link && link.includes('/news-')) {
                            const id = link.match(/news-(\d+)/)?.[1];
                            if (id) {
                                items.push({
                                    title: title,
                                    url: link,
                                    id: id
                                });
                            }
                        }
                    }
                });

                // ลบข่าวที่ซ้ำกัน (ตาม ID)
                const uniqueItems = [];
                const seenIds = new Set();

                items.forEach(item => {
                    if (!seenIds.has(item.id)) {
                        seenIds.add(item.id);
                        uniqueItems.push(item);
                    }
                });

                console.log(`ข่าวทั้งหมดหลังลบซ้ำ: ${uniqueItems.length} รายการ`);
                return uniqueItems;
            });

            console.log(`✅ พบข่าวทั้งหมด ${newsItems.length} รายการ`);

            // เพิ่มข้อมูลเวลาและจำกัดจำนวน (เพิ่มเป็น 10 รายการ)
            const limitedNews = newsItems.slice(0, maxNews).map(item => ({
                ...item,
                scrapedAt: new Date().toISOString()
            }));

            return limitedNews;

        } catch (error) {
            console.error('❌ Error scraping news list:', error.message);
            throw new Error(`Scraping failed: ${error.message}`);
        } finally {
            if (this.page) {
                await this.page.close();
                this.page = null;
            }
        }
    }

    async scrapeNewsDetail(newsUrl) {
        try {
            console.log(`📖 กำลังดึงรายละเอียดข่าว: ${newsUrl}`);

            if (!this.browser) {
                await this.init();
            }

            const page = await this.browser.newPage();

            // ตั้งค่า user agent
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

            // ไปที่หน้าข่าว
            await page.goto(newsUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });

            // รอให้หน้าโหลด
            await new Promise(resolve => setTimeout(resolve, 2000));

            // ดึงข้อมูลข่าว
            const newsDetail = await page.evaluate(() => {
                // ลองหา title จากหลายแหล่ง
                const titleSelectors = [
                    'h1',
                    '.news-title',
                    '.article-title',
                    '[class*="title"]',
                    'title'
                ];

                let title = '';
                for (const selector of titleSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.textContent.trim()) {
                        title = element.textContent.trim();
                        break;
                    }
                }

                // ลองหา content จากหลายแหล่ง
                const contentSelectors = [
                    '.news-content',
                    '.article-content',
                    '.content',
                    '[class*="content"]',
                    '.post-content',
                    'article',
                    '.main-content'
                ];

                let content = '';
                for (const selector of contentSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.textContent.trim()) {
                        content = element.textContent.trim();
                        break;
                    }
                }

                // ดึงรูปภาพทั้งหมด
                const images = [];
                const imgElements = document.querySelectorAll('img');

                imgElements.forEach(img => {
                    let src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy');

                    if (src) {
                        // แปลง relative URL เป็น absolute URL
                        if (src.startsWith('/')) {
                            src = 'https://football.kapook.com' + src;
                        } else if (src.startsWith('//')) {
                            src = 'https:' + src;
                        }

                        // กรองรูปที่ไม่ต้องการ
                        const unwantedPatterns = [
                            'logo',
                            'icon',
                            'banner',
                            'ads',
                            'advertisement',
                            'tracking',
                            'pixel',
                            'social',
                            'share',
                            'button',
                            'widget'
                        ];

                        const srcLower = src.toLowerCase();
                        const shouldSkip = unwantedPatterns.some(pattern =>
                            srcLower.includes(pattern)
                        );

                        // ตรวจสอบขนาดรูป
                        const width = img.naturalWidth || img.width || 0;
                        const height = img.naturalHeight || img.height || 0;

                        if (!shouldSkip && src.includes('kapook.com') && width > 100 && height > 100) {
                            images.push({
                                src: src,
                                alt: img.alt || '',
                                width: width,
                                height: height,
                                size: width * height
                            });
                        }
                    }
                });

                // เรียงรูปตามความสำคัญ
                images.sort((a, b) => {
                    // ให้คะแนนรูปภาพ
                    let scoreA = a.size;
                    let scoreB = b.size;

                    // รูปใน /large/ folder ได้คะแนนเพิ่ม
                    if (a.src.includes('/large/')) scoreA += 100000;
                    if (b.src.includes('/large/')) scoreB += 100000;

                    // รูปที่มีชื่อขึ้นต้นด้วย "news-" ได้คะแนนเพิ่ม
                    if (a.src.includes('news-')) scoreA += 50000;
                    if (b.src.includes('news-')) scoreB += 50000;

                    return scoreB - scoreA; // เรียงจากมากไปน้อย
                });

                return {
                    title: title,
                    content: content,
                    images: images.slice(0, 3).map(img => img.src) // เอาแค่ 3 รูปแรก
                };
            });

            await page.close();

            console.log(`✅ ดึงรายละเอียดข่าวสำเร็จ: ${newsDetail.title.substring(0, 50)}...`);

            return newsDetail;

        } catch (error) {
            console.error(`❌ Error scraping news detail from ${newsUrl}:`, error.message);
            return null;
        }
    }

    async scrapeNewsWithDetails(maxNews = 2) {
        try {
            console.log('🔄 เริ่มดึงข่าวพร้อมรายละเอียด...');

            // ดึงรายการข่าว
            const newsList = await this.scrapeNewsList(maxNews);

            if (!newsList || newsList.length === 0) {
                console.log('❌ ไม่พบข่าวจากรายการ');
                return [];
            }

            // ดึงรายละเอียดของแต่ละข่าว
            const newsWithDetails = [];

            for (let i = 0; i < newsList.length; i++) {
                const newsItem = newsList[i];
                console.log(`📖 [${i + 1}/${newsList.length}] กำลังดึง: ${newsItem.title.substring(0, 50)}...`);

                const detail = await this.scrapeNewsDetail(newsItem.url);

                if (detail) {
                    newsWithDetails.push({
                        ...newsItem,
                        ...detail
                    });
                }

                // รอหน่อยระหว่างการดึงข่าวแต่ละข่าว
                if (i < newsList.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            console.log(`✅ ดึงข่าวพร้อมรายละเอียดเสร็จสิ้น: ${newsWithDetails.length} รายการ`);
            return newsWithDetails;

        } catch (error) {
            console.error('❌ Error in scrapeNewsWithDetails:', error.message);
            throw error;
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

module.exports = KapookNewsScraper;
