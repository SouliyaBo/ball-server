const PuppeteerDataExtractor = require('./PuppeteerDataExtractor');

async function testExtractor() {
    console.log('🧪 ทดสอบ PuppeteerDataExtractor...');

    const extractor = new PuppeteerDataExtractor();

    try {
        console.log('📊 เริ่มดึงข้อมูล...');
        const result = await extractor.extractMatchData();

        console.log('✅ ผลลัพธ์:');
        console.log(`   • จำนวนแมตช์: ${result.matches ? result.matches.length : 0}`);
        console.log(`   • สำเร็จ: ${result.success}`);

        if (result.matches && result.matches.length > 0) {
            console.log('📋 ตัวอย่างแมตช์แรก:', result.matches[0]);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await extractor.close();
        console.log('🏁 เสร็จสิ้น');
    }
}

testExtractor();
