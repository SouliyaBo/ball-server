// Call necessary programs
const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const FormData = require('form-data');
const { Readable } = require('stream');

// --- ⚙️ User Configuration ---
const WP_SITE_URL = 'https://super-manga.com';
const WP_USERNAME = 'xeadm';
const WP_APP_PASSWORD = 'HREU qMue Iu6K 0dzS IlZi MSF5';
// ---------------------------------------------

// --- 🎯 Target URL ---
const MANGA_URL_TO_SCRAPE = 'https://www.up-manga.com';
const TOTAL_PAGES_TO_SCRAPE = 17;
// ----------------------------------------------------------------

// Utility function for delays
const delay = ms => new Promise(res => setTimeout(res, ms));

// =================================================================
// ## Main Scraper Logic
// =================================================================
async function main() {
   console.log(`🚀 Starting the Multi-Page Scraper... Will scrape ${TOTAL_PAGES_TO_SCRAPE} pages.`);
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    console.log('✅ Browser launched.');

    // --- 1. Scrape all pages to get a master list of manga URLs ---
    const allMangaUrls = [];
    for (let i = 1; i <= TOTAL_PAGES_TO_SCRAPE; i++) {
        const pageUrl = `${MANGA_URL_TO_SCRAPE}/page/${i}/`;
        console.log(`\n--- Scraping Page ${i} ---`);
        console.log(`⏳ Navigating to: ${pageUrl}`);
        await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 90000 });

        const mangaUrlsOnPage = await page.evaluate(() =>
            Array.from(document.querySelectorAll('.listupd .bs .bsx > a, .listo .bs .bsx > a')).map(a => a.href)
        );

        console.log(`    ✅ Found ${mangaUrlsOnPage.length} manga on this page.`);
        allMangaUrls.push(...mangaUrlsOnPage);
        await delay(2000); // หยุดพัก 2 วินาทีระหว่างแต่ละหน้า
    }

    if (allMangaUrls.length === 0) {
        console.error('❌ No manga URLs found. Exiting.');
        await browser.close();
        return;
    }

    const uniqueMangaUrls = [...new Set(allMangaUrls)]; // ลบรายการที่ซ้ำกันออก
    console.log(`\n✅ Found a total of ${uniqueMangaUrls.length} unique manga to process.`);

    // --- 2. Loop through each unique manga URL ---
    for (const mangaUrl of uniqueMangaUrls) {
        console.log(`\n=================================================`);
        console.log(`Processing Manga: ${mangaUrl}`);
        console.log(`=================================================`);
        try {
            await processSingleManga(browser, mangaUrl);
        } catch (e) {
            console.error(`❌❌❌ An error occurred while processing ${mangaUrl}:`, e);
        }
        await delay(10000); // หยุดพัก 10 วินาทีระหว่างแต่ละเรื่อง
    }

    await browser.close();
    console.log('🎉🎉🎉 All tasks completed successfully! 🎉🎉🎉');

   // Function to process a single manga series
async function processSingleManga(browser, mangaUrl) {
    const page = await browser.newPage();

    // --- Scrape the manga page ---
    await page.goto(mangaUrl, { waitUntil: 'networkidle2', timeout: 90000 });

    const mangaData = await page.evaluate(() => {
        // ... (scraping logic remains the same as the last working version)
        const title = document.querySelector('h1.entry-title')?.innerText.trim() || '';
        const synopsis = document.querySelector('div.entry-content[itemprop="description"]')?.innerText.trim() || '';
        const cover_image_url = document.querySelector('div.thumb[itemprop="image"] img')?.src || '';
        const genres = Array.from(document.querySelectorAll('.genres-content a, div.seriestugenre a')).map(el => el.innerText.trim());
        const tags = Array.from(document.querySelectorAll('.seriestu-tags a')).map(el => el.innerText.trim());
        const alternative = document.querySelector('.seriestualt')?.innerText.trim() || '';
        const score = document.querySelector('.num[itemprop="ratingValue"]')?.innerText.trim() || '';
        let meta_description = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
        if (meta_description.includes('Up-Manga')) {
            meta_description = meta_description.replace(/Up-Manga/gi, 'Super-manga');
        } else {
            meta_description = meta_description.replace( ' Super-manga.com');
        }
        const info = {};
        const infoRows = document.querySelectorAll('table.infotable tr');
        infoRows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length === 2) {
                const heading = cells[0].innerText.trim().toLowerCase();
                const content = cells[1].innerText.trim();
                if (heading.includes('สถานะ')) info.status = content;
                else if (heading.includes('ประเภท')) info.type = content;
                else if (heading.includes('ผู้แต่ง')) info.author = content;
                else if (heading.includes('ผู้เขียน')) info.artist = content;
                else if (heading.includes('ปีที่ปล่อย')) info.published = content;
                else if (heading.includes('ที่มา')) info.serialization = content;
            }
        });
        return { title, synopsis, cover_image_url, genres, tags, alternative, score, meta_description, ...info };
    });

    if (!mangaData || !mangaData.title) {
        console.error('❌ Failed to scrape manga data.');
        await page.close(); return;
    }
    console.log(`✅ Scraped Manga Data: ${mangaData.title}`);

    // --- Create/Update the manga post ---
    const mangaPostId = await createOrUpdateMangaPost(mangaData);
    if (!mangaPostId) { await page.close(); return; }
    console.log(`✅ Manga Post Updated. ID: ${mangaPostId}`);

    // --- Scrape the chapter list ---
    const chapters = await page.evaluate(() =>
        Array.from(document.querySelectorAll('#chapterlist ul li a')).map(a => ({
            url: a.href,
            title: a.querySelector('.chapternum')?.innerText.trim() || '',
        })).reverse().filter(chapter => !chapter.title.includes('ตอนที่ 0'))
    );
    console.log(`✅ Found ${chapters.length} chapters.`);

    // --- Loop through and create each chapter ---
    for (const chapter of chapters) {
        await processSingleChapter(page, mangaPostId, mangaData.title, chapter);
        await delay(5000);
    }

    await page.close();
}

}


// =================================================================
// ## WordPress Handler Functions
// =================================================================

// Function to create/update the main manga post
async function createOrUpdateMangaPost(data) {
    const headers = { 'Authorization': 'Basic ' + Buffer.from(`${WP_USERNAME}:${WP_APP_PASSWORD}`).toString('base64'), 'Content-Type': 'application/json' };

    // ใช้ slug ในการค้นหาซึ่งแม่นยำกว่า
    const slug = data.title.replace(/\s+/g, '-').toLowerCase();
    let response = await fetch(`${WP_SITE_URL}/wp-json/wp/v2/manga?slug=${slug}`, { headers });
    let existingPosts = await response.json();
    let postId;
    const postData = {
        title: data.title,
        content: data.synopsis,
        status: 'publish',
        meta: {
            ero_status: data.status || 'Ongoing',
            ero_type: data.type || 'Manga',
            ero_author: data.author || '',
            ero_artist: data.artist || '',
            ero_published: data.published || '',
            ero_serialization: data.serialization || '',
            ero_japanese: data.alternative || '',
            ero_score: data.score || '',
            _yoast_wpseo_metadesc: data.meta_description || ''
        }
    };

    if (existingPosts.length > 0) {
        postId = existingPosts[0].id;
        console.log(`⏩ Manga "${data.title}" already exists. Updating ID: ${postId}.`);
    } else {
        console.log(`✨ Manga "${data.title}" not found. Creating new post...`);
    }

    const apiEndpoint = postId ? `${WP_SITE_URL}/wp-json/wp/v2/manga/${postId}` : `${WP_SITE_URL}/wp-json/wp/v2/manga`;
    const updateResponse = await fetch(apiEndpoint, { method: 'POST', headers, body: JSON.stringify(postData) });
    if (!updateResponse.ok) { console.error('❌ Failed to create/update manga post', await updateResponse.json()); return null; }

    if (!postId) {
        postId = (await updateResponse.json()).id;
    }

    console.log(`✅ Manga Post Updated. ID: ${postId}`);

    // Update Terms (Genres and Tags)
    if (data.genres && data.genres.length > 0) {
        await updateTerms(postId, data.genres, 'genres');
    }

    if (data.cover_image_url) await updateFeaturedImage(postId, data.cover_image_url, data.title);

    return postId;
}

// ฟังก์ชันประมวลผลแต่ละตอน (เพิ่มการตรวจสอบตอนซ้ำ)
async function processSingleChapter(page, mangaId, mangaTitle, chapter) {
    const chapterPostTitle = `${mangaTitle} ${chapter.title}`;
    const headers = { 'Authorization': 'Basic ' + Buffer.from(`${WP_USERNAME}:${WP_APP_PASSWORD}`).toString('base64') };

// [แก้ไข] สร้าง slug ที่คาดว่า WordPress จะสร้างขึ้น
   const expectedSlug = encodeURIComponent(chapterPostTitle.replace(/\s+/g, '-').toLowerCase());
    // [แก้ไข] ตรวจสอบโพสต์ซ้ำด้วย slug ซึ่งแม่นยำกว่า
    const checkResponse = await fetch(`${WP_SITE_URL}/wp-json/wp/v2/posts?slug=${expectedSlug}&_fields=id`, { headers });
    const existingPosts = await checkResponse.json();

    if (existingPosts.length > 0) {
        console.log(`    ⏩ Skipping chapter "${chapter.title}" (already exists).`);
        return;
    }

    console.log(`    ✨ New chapter found! Processing "${chapter.title}"...`);
    await page.goto(chapter.url, { waitUntil: 'networkidle2', timeout: 90000 });
    const imageUrls = await page.evaluate(() => Array.from(document.querySelectorAll('div.reading-content img, div#readerarea img')).map(img => (img.dataset.src || img.src).trim()));
    console.log(`    ✅ Found ${imageUrls.length} images.`);

    const chapterNumber = chapter.title.match(/(\d+(\.\d+)?)/)[0] || '';
    const imageCodeContent = imageUrls.map(url => `<img src='${url}' />`).join('\n');
    const groupData = [{ 'ab_hostname': 'Default (Auto)', 'ab_embed': imageCodeContent }];
    const categoryId = await getOrCreateCategory(mangaTitle);

    const response = await fetch(`${WP_SITE_URL}/wp-json/wp/v2/posts`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: chapterPostTitle,
            status: 'publish',
            categories: categoryId ? [categoryId] : [],
            meta: { ero_chapter: chapterNumber, ero_seri: mangaId, ab_embedgroup: groupData },
        })
    });
    if (response.ok) console.log(`    ✅ Successfully created post.`);
    else console.error(`    ❌ Failed to create post.`, await response.json());
}

// --- Helper Functions ---
async function updateFeaturedImage(postId, imageUrl, title) {
    console.log('    ⏳ Uploading featured image...');
    const headers = { 'Authorization': 'Basic ' + Buffer.from(`${WP_USERNAME}:${WP_APP_PASSWORD}`).toString('base64') };
    try {
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) { console.error('    ❌ Could not download image.'); return; }
        const imageBuffer = await imageResponse.buffer();

        const form = new FormData();
        const imageName = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-cover.jpg`;
        form.append('file', imageBuffer, { filename: imageName });
        form.append('title', `${title} Cover`);
        form.append('post', postId);

        const uploadResponse = await fetch(`${WP_SITE_URL}/wp-json/wp/v2/media`, {
            method: 'POST', headers: { ...headers }, body: form
        });
        if (!uploadResponse.ok) { console.error('    ❌ Could not upload image to WordPress.', await uploadResponse.text()); return; }

        const media = await uploadResponse.json();
        console.log(`    ✅ Image uploaded. Media ID: ${media.id}`);

        const setFeaturedResponse = await fetch(`${WP_SITE_URL}/wp-json/wp/v2/manga/${postId}`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ featured_media: media.id })
        });
        if(!setFeaturedResponse.ok) { console.error('    ❌ Failed to set featured image.', await setFeaturedResponse.json()); return; }

        console.log('    ✅ Featured image set.');
    } catch (e) { console.error('    ❌ Error during image processing:', e); }
}

async function updateTerms(postId, terms, taxonomy) {
    const headers = { 'Authorization': 'Basic ' + Buffer.from(`${WP_USERNAME}:${WP_APP_PASSWORD}`).toString('base64'), 'Content-Type': 'application/json' };
    const termIds = [];
    console.log(`    ⏳ Preparing to assign ${terms.length} terms to taxonomy: ${taxonomy}`);
    for (const termName of terms) {
        // const endpoint = taxonomy === 'post_tag' ? 'tags' : taxonomy;
        const endpoint = 'genres';
        let response = await fetch(`${WP_SITE_URL}/wp-json/wp/v2/${endpoint}?search=${encodeURIComponent(termName)}`, { headers });
        let existingTerms = await response.json();
        if (existingTerms.length > 0) {
            termIds.push(existingTerms[0].id);
        } else {
            let createResponse = await fetch(`${WP_SITE_URL}/wp-json/wp/v2/${endpoint}`, { method: 'POST', headers, body: JSON.stringify({ name: termName }) });
            console.log()
            if (createResponse.ok) {
                const newTerm = await createResponse.json();
                termIds.push(newTerm.id);
                console.log(`    ✨ Created new term "${termName}" in ${taxonomy}.`);
            }
        }
    }
    if (termIds.length > 0) {
        // const endpoint = taxonomy === 'post_tag' ? 'tags' : 'genres';
        const endpoint = 'genres';
        const updateResponse = await fetch(`${WP_SITE_URL}/wp-json/wp/v2/manga/${postId}`, {
            method: 'POST', headers, body: JSON.stringify({ [endpoint]: termIds })
        });
        if (updateResponse.ok) console.log(`    ✅ Successfully assigned ${taxonomy}: ${terms.join(', ')}`);
        else console.error(`    ❌ Failed to assign ${taxonomy}.`, await updateResponse.json());
    }
}

async function getOrCreateCategory(name) {
    const headers = { 'Authorization': 'Basic ' + Buffer.from(`${WP_USERNAME}:${WP_APP_PASSWORD}`).toString('base64') };
    let response = await fetch(`${WP_SITE_URL}/wp-json/wp/v2/categories?search=${encodeURIComponent(name)}`, { headers });
    let categories = await response.json();
    if (categories.length > 0) return categories[0].id;

    response = await fetch(`${WP_SITE_URL}/wp-json/wp/v2/categories`, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name })
    });
    if (response.ok) return (await response.json()).id;
    return null;
}

// Run the main function
main();
