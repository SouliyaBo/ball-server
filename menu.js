const FootballExtractor = require('./FootballExtractor');

async function showMenu() {
    const extractor = new FootballExtractor();

    try {
        await extractor.init();

        console.log('\n🏆 ระบบดูผลบอลสด');
        console.log('='.repeat(50));
        console.log('1. 📅 ผลการแข่งขันวันนี้');
        console.log('2. 📅 ผลการแข่งขันเมื่อวาน');
        console.log('3. 📅 ผลการแข่งขัน 3 วันย้อนหลัง');
        console.log('4. 📅 ผลการแข่งขัน 7 วันย้อนหลัง');
        console.log('5. 🔍 ค้นหาการแข่งขันของทีม');
        console.log('6. 🌟 แสดงการแข่งขันสำคัญ');

        // อ่านจาก command line arguments
        const choice = process.argv[2] || '1';

        switch(choice) {
            case '1':
                console.log('\n📅 กำลังโหลดผลการแข่งขันวันนี้...');
                await extractor.getMatchesToday();
                break;

            case '2':
                console.log('\n📅 กำลังโหลดผลการแข่งขันเมื่อวาน...');
                await extractor.getMatchesYesterday();
                break;

            case '3':
                console.log('\n📅 กำลังโหลดผลการแข่งขัน 3 วันย้อนหลัง...');
                await extractor.getMatchesForDates(3);
                break;

            case '4':
                console.log('\n📅 กำลังโหลดผลการแข่งขัน 7 วันย้อนหลัง...');
                await extractor.getMatchesForDates(7);
                break;

            case '5':
                const teamName = process.argv[3] || 'Arsenal';
                console.log(`\n🔍 กำลังค้นหาการแข่งขันของ ${teamName}...`);
                await extractor.searchTeamMatches(teamName, 30);
                break;

            case '6':
                console.log('\n🌟 กำลังโหลดการแข่งขันสำคัญ...');
                await showImportantMatches(extractor);
                break;

            default:
                console.log('\n❌ ตัวเลือกไม่ถูกต้อง กรุณาเลือก 1-6');
                console.log('\nวิธีใช้: node menu.js [หมายเลข] [ชื่อทีม]');
                console.log('ตัวอย่าง:');
                console.log('  node menu.js 1              # ดูผลวันนี้');
                console.log('  node menu.js 5 Barcelona    # ค้นหาทีม Barcelona');
        }

    } catch (error) {
        console.log('❌ เกิดข้อผิดพลาด:', error.message);
    } finally {
        await extractor.close();
    }
}

async function showImportantMatches(extractor) {
    // ลิสต์ทีมสำคัญที่หลายคนสนใจ
    const importantTeams = [
        'Barcelona', 'Real Madrid', 'Arsenal', 'Liverpool', 'Manchester',
        'Chelsea', 'Bayern', 'Dortmund', 'PSG', 'Juventus', 'Milan',
        'Inter', 'Brazil', 'Argentina', 'Uruguay', 'Peru', 'Ecuador'
    ];

    console.log('\n🌟 การแข่งขันของทีมดัง (7 วันย้อนหลัง)');
    console.log('='.repeat(80));

    const allMatches = [];
    const endDate = extractor.getDateString(0);
    const startDate = extractor.getDateString(7);

    const matches = await extractor.getFixturesData(startDate, endDate);

    // กรองเฉพาะการแข่งขันของทีมสำคัญ
    const importantMatches = matches.filter(match => {
        const homeTeam = match.home_team_name?.toLowerCase() || '';
        const awayTeam = match.away_team_name?.toLowerCase() || '';

        return importantTeams.some(team =>
            homeTeam.includes(team.toLowerCase()) ||
            awayTeam.includes(team.toLowerCase())
        );
    });

    if (importantMatches.length > 0) {
        // จัดกลุ่มตามวันที่
        const matchesByDate = {};
        importantMatches.forEach(match => {
            const date = match.starting_at.split('T')[0];
            if (!matchesByDate[date]) {
                matchesByDate[date] = [];
            }
            matchesByDate[date].push(match);
        });

        // แสดงผลแยกตามวัน
        Object.keys(matchesByDate).sort().reverse().forEach(date => {
            extractor.displayMatchesCompactFormat(matchesByDate[date], date);
        });

        console.log(`\n✨ พบการแข่งขันของทีมดัง ${importantMatches.length} นัด`);
    } else {
        console.log('\n❌ ไม่พบการแข่งขันของทีมดังในช่วงนี้');
    }
}

// เพิ่มฟังก์ชันแสดงสถิติ
async function showStats() {
    const extractor = new FootballExtractor();

    try {
        await extractor.init();

        console.log('\n📊 สถิติการแข่งขัน 7 วันย้อนหลัง');
        console.log('='.repeat(50));

        let totalMatches = 0;
        let totalGoals = 0;
        let completedMatches = 0;

        for (let i = 0; i < 7; i++) {
            const date = extractor.getDateString(i);
            const matches = await extractor.getFixturesData(date, date);

            totalMatches += matches.length;

            matches.forEach(match => {
                if (match.state_id === 5) { // จบแล้ว
                    completedMatches++;
                    totalGoals += (match.home_score || 0) + (match.away_score || 0);
                }
            });

            await new Promise(resolve => setTimeout(resolve, 200)); // รอไม่ให้โหลดหนัก
        }

        const avgGoalsPerMatch = completedMatches > 0 ? (totalGoals / completedMatches).toFixed(2) : 0;

        console.log(`⚽ รวมการแข่งขันทั้งหมด: ${totalMatches} นัด`);
        console.log(`✅ การแข่งขันที่เสร็จสิ้น: ${completedMatches} นัด`);
        console.log(`🥅 รวมประตูทั้งหมด: ${totalGoals} ประตู`);
        console.log(`📈 เฉลี่ยประตูต่อการแข่งขัน: ${avgGoalsPerMatch} ประตู`);

    } catch (error) {
        console.log('❌ เกิดข้อผิดพลาด:', error.message);
    } finally {
        await extractor.close();
    }
}

// ตรวจสอบว่าไฟล์ถูกเรียกใช้โดยตรงหรือไม่
if (require.main === module) {
    // ตรวจสอบ argument พิเศษ
    if (process.argv[2] === 'stats') {
        showStats();
    } else {
        showMenu();
    }
}

module.exports = { showMenu, showStats };
