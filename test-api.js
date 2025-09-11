const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function testFootballAPI() {
    console.log('🚀 เริ่มทดสอบ API ของเว็บฟุตบอล...');

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        // ไปที่หน้าหลักก่อนเพื่อให้ได้ cookies และ headers ที่ถูกต้อง
        await page.goto('https://football-dw3.pages.dev/result/', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        console.log('✅ โหลดหน้าเว็บสำเร็จ');

        // รอให้หน้าโหลดเสร็จ
        await new Promise(resolve => setTimeout(resolve, 3000));

        // ทดสอบ API endpoints ที่เราพบ
        const apiTests = [
            {
                name: 'ข้อมูลลีก',
                url: 'https://football-dw3.pages.dev/api/livescore/leagues'
            },
            {
                name: 'สถานะการแข่งขัน',
                url: 'https://football-dw3.pages.dev/api/livescore/states'
            },
            {
                name: 'ผลการแข่งขันวันนี้',
                url: `https://football-dw3.pages.dev/api/fixtures/between/${new Date().toISOString().split('T')[0]}/${new Date().toISOString().split('T')[0]}`
            },
            {
                name: 'ผลการแข่งขัน 7 วันที่ผ่านมา',
                url: `https://football-dw3.pages.dev/api/fixtures/between/2025-09-05/2025-09-11`
            }
        ];

        for (const test of apiTests) {
            console.log(`\n📡 ทดสอบ ${test.name}...`);
            console.log(`URL: ${test.url}`);

            try {
                const response = await page.evaluate(async (url) => {
                    const res = await fetch(url);
                    const data = await res.text();
                    return {
                        status: res.status,
                        statusText: res.statusText,
                        headers: Object.fromEntries(res.headers.entries()),
                        data: data
                    };
                }, test.url);

                console.log(`✅ Status: ${response.status} ${response.statusText}`);

                try {
                    const jsonData = JSON.parse(response.data);
                    console.log(`📊 ข้อมูลที่ได้รับ:`);

                    if (Array.isArray(jsonData)) {
                        console.log(`   - จำนวนรายการ: ${jsonData.length}`);
                        if (jsonData.length > 0) {
                            console.log(`   - ตัวอย่างข้อมูลแรก:`, JSON.stringify(jsonData[0], null, 2));
                        }
                    } else if (jsonData.data && Array.isArray(jsonData.data)) {
                        console.log(`   - จำนวนรายการ: ${jsonData.data.length}`);
                        if (jsonData.data.length > 0) {
                            console.log(`   - ตัวอย่างข้อมูลแรก:`, JSON.stringify(jsonData.data[0], null, 2));
                        }
                    } else {
                        console.log(`   - ข้อมูล:`, JSON.stringify(jsonData, null, 2));
                    }
                } catch (parseError) {
                    console.log(`   - ข้อมูลไม่ใช่ JSON:`, response.data.substring(0, 200));
                }
            } catch (error) {
                console.log(`❌ เกิดข้อผิดพลาด: ${error.message}`);
            }
        }

        // ทดสอบดึงข้อมูลการแข่งขันในช่วงวันที่ต่างๆ
        console.log('\n🗓️ ทดสอบดึงข้อมูลตามช่วงวันที่...');

        const today = new Date();
        const dates = [];

        // สร้างรายการวันที่ 7 วันย้อนหลัง
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            dates.push(date.toISOString().split('T')[0]);
        }

        for (const date of dates) {
            const apiUrl = `https://football-dw3.pages.dev/api/fixtures/between/${date}/${date}`;
            console.log(`\n📅 ทดสอบวันที่ ${date}...`);

            try {
                const response = await page.evaluate(async (url) => {
                    const res = await fetch(url);
                    const data = await res.json();
                    return data;
                }, apiUrl);

                if (response.data && response.data.length > 0) {
                    console.log(`   ✅ พบการแข่งขัน ${response.data.length} นัด`);

                    // แสดงตัวอย่างการแข่งขัน 3 นัดแรก
                    response.data.slice(0, 3).forEach((match, index) => {
                        console.log(`   ${index + 1}. ${match.home_team_name || 'ทีมเจ้าบ้าน'} vs ${match.away_team_name || 'ทีมเยือน'}`);
                        console.log(`      สกอร์: ${match.home_score || 0} - ${match.away_score || 0}`);
                        console.log(`      เวลา: ${match.starting_at}`);
                    });
                } else {
                    console.log(`   ⚪ ไม่มีการแข่งขันในวันนี้`);
                }
            } catch (error) {
                console.log(`   ❌ เกิดข้อผิดพลาด: ${error.message}`);
            }
        }

    } catch (error) {
        console.log('❌ เกิดข้อผิดพลาดหลัก:', error.message);
    }

    await browser.close();
    console.log('\n🏁 เสร็จสิ้นการทดสอบ');
}

testFootballAPI();
