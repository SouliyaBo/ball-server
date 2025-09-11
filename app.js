#!/usr/bin/env node

const FootballExtractor = require('./FootballExtractor');
const FootballDataSaver = require('./save-data');

// ANSI color codes สำหรับทำสี
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

function colorize(text, color) {
    return `${colors[color]}${text}${colors.reset}`;
}

function showBanner() {
    console.log(colorize('\n⚽ ====================================== ⚽', 'cyan'));
    console.log(colorize('      ระบบดูผลบอลสด & บันทึกข้อมูล', 'bright'));
    console.log(colorize('         Football Live Score System', 'blue'));
    console.log(colorize('⚽ ====================================== ⚽', 'cyan'));
}

function showMainMenu() {
    console.log(colorize('\n📋 เมนูหลัก:', 'yellow'));
    console.log('1. 📅 ดูผลการแข่งขันวันนี้');
    console.log('2. 📅 ดูผลการแข่งขันเมื่อวาน');
    console.log('3. 📅 ดูผลการแข่งขัน 3 วันย้อนหลัง');
    console.log('4. 📅 ดูผลการแข่งขัน 7 วันย้อนหลัง');
    console.log('5. 🔍 ค้นหาการแข่งขันของทีม');
    console.log('6. 🌟 แสดงการแข่งขันสำคัญ');
    console.log('7. 📊 แสดงสถิติการแข่งขัน');
    console.log('8. 💾 บันทึกข้อมูลวันนี้');
    console.log('9. 💾 บันทึกข้อมูล 7 วัน');
    console.log('10. 📋 สร้างรายงานสรุป');
    console.log('0. ❌ ออกจากโปรแกรม');
}

function showUsageExamples() {
    console.log(colorize('\n💡 ตัวอย่างการใช้งาน:', 'magenta'));
    console.log('# ดูผลวันนี้');
    console.log(colorize('node app.js 1', 'green'));
    console.log('\n# ค้นหาทีม Arsenal');
    console.log(colorize('node app.js 5 Arsenal', 'green'));
    console.log('\n# บันทึกข้อมูลทั้งหมด');
    console.log(colorize('node app.js 10', 'green'));
    console.log('\n# แสดงเมนู');
    console.log(colorize('node app.js', 'green'));
}

async function handleChoice(choice, params = []) {
    const extractor = new FootballExtractor();
    const saver = new FootballDataSaver();

    try {
        await extractor.init();

        switch (choice) {
            case '1':
                console.log(colorize('\n📅 กำลังโหลดผลการแข่งขันวันนี้...', 'yellow'));
                await extractor.getMatchesToday();
                break;

            case '2':
                console.log(colorize('\n📅 กำลังโหลดผลการแข่งขันเมื่อวาน...', 'yellow'));
                await extractor.getMatchesYesterday();
                break;

            case '3':
                console.log(colorize('\n📅 กำลังโหลดผลการแข่งขัน 3 วันย้อนหลัง...', 'yellow'));
                await extractor.getMatchesForDates(3);
                break;

            case '4':
                console.log(colorize('\n📅 กำลังโหลดผลการแข่งขัน 7 วันย้อนหลัง...', 'yellow'));
                await extractor.getMatchesForDates(7);
                break;

            case '5':
                const teamName = params[0] || 'Arsenal';
                console.log(colorize(`\n🔍 กำลังค้นหาการแข่งขันของ ${teamName}...`, 'yellow'));
                await extractor.searchTeamMatches(teamName, 30);
                break;

            case '6':
                console.log(colorize('\n🌟 กำลังโหลดการแข่งขันสำคัญ...', 'yellow'));
                await showImportantMatches(extractor);
                break;

            case '7':
                console.log(colorize('\n📊 กำลังคำนวณสถิติ...', 'yellow'));
                await showStatistics(extractor);
                break;

            case '8':
                await saver.init();
                console.log(colorize('\n💾 กำลังบันทึกข้อมูลวันนี้...', 'yellow'));
                await saver.saveMatchesToday();
                await saver.close();
                break;

            case '9':
                await saver.init();
                console.log(colorize('\n💾 กำลังบันทึกข้อมูล 7 วัน...', 'yellow'));
                await saver.saveWeeklyMatches();
                await saver.close();
                break;

            case '10':
                await saver.init();
                console.log(colorize('\n📋 กำลังสร้างรายงานสรุป...', 'yellow'));
                await saver.generateSummaryReport();
                await saver.close();
                break;

            case '0':
                console.log(colorize('\n👋 ขอบคุณที่ใช้งาน!', 'green'));
                process.exit(0);

            default:
                console.log(colorize('\n❌ ตัวเลือกไม่ถูกต้อง กรุณาเลือก 0-10', 'red'));
                showUsageExamples();
        }

    } catch (error) {
        console.log(colorize(`\n❌ เกิดข้อผิดพลาด: ${error.message}`, 'red'));
    } finally {
        await extractor.close();
    }
}

async function showImportantMatches(extractor) {
    const importantTeams = [
        'Barcelona', 'Real Madrid', 'Arsenal', 'Liverpool', 'Manchester',
        'Chelsea', 'Bayern', 'Dortmund', 'PSG', 'Juventus', 'Milan',
        'Inter', 'Brazil', 'Argentina', 'Uruguay', 'Peru', 'Ecuador'
    ];

    console.log(colorize('\n🌟 การแข่งขันของทีมดัง (7 วันย้อนหลัง)', 'cyan'));
    console.log('='.repeat(80));

    const endDate = extractor.getDateString(0);
    const startDate = extractor.getDateString(7);

    const matches = await extractor.getFixturesData(startDate, endDate);

    const importantMatches = matches.filter(match => {
        const homeTeam = match.home_team_name?.toLowerCase() || '';
        const awayTeam = match.away_team_name?.toLowerCase() || '';

        return importantTeams.some(team =>
            homeTeam.includes(team.toLowerCase()) ||
            awayTeam.includes(team.toLowerCase())
        );
    });

    if (importantMatches.length > 0) {
        const matchesByDate = {};
        importantMatches.forEach(match => {
            const date = match.starting_at.split('T')[0];
            if (!matchesByDate[date]) {
                matchesByDate[date] = [];
            }
            matchesByDate[date].push(match);
        });

        Object.keys(matchesByDate).sort().reverse().forEach(date => {
            extractor.displayMatchesCompactFormat(matchesByDate[date], date);
        });

        console.log(colorize(`\n✨ พบการแข่งขันของทีมดัง ${importantMatches.length} นัด`, 'green'));
    } else {
        console.log(colorize('\n❌ ไม่พบการแข่งขันของทีมดังในช่วงนี้', 'red'));
    }
}

async function showStatistics(extractor) {
    console.log(colorize('\n📊 สถิติการแข่งขัน 7 วันย้อนหลัง', 'cyan'));
    console.log('='.repeat(50));

    let totalMatches = 0;
    let totalGoals = 0;
    let completedMatches = 0;
    let dailyStats = [];

    for (let i = 0; i < 7; i++) {
        const date = extractor.getDateString(i);
        const matches = await extractor.getFixturesData(date, date);

        let dayGoals = 0;
        let dayCompleted = 0;

        matches.forEach(match => {
            if (match.state_id === 5) {
                dayCompleted++;
                completedMatches++;
                const goals = (match.home_score || 0) + (match.away_score || 0);
                dayGoals += goals;
                totalGoals += goals;
            }
        });

        totalMatches += matches.length;
        dailyStats.push({
            date: extractor.getThaiDate(date),
            total: matches.length,
            completed: dayCompleted,
            goals: dayGoals
        });

        await new Promise(resolve => setTimeout(resolve, 200));
    }

    const avgGoalsPerMatch = completedMatches > 0 ? (totalGoals / completedMatches).toFixed(2) : 0;

    console.log(colorize('📈 สถิติรวม:', 'yellow'));
    console.log(`⚽ รวมการแข่งขันทั้งหมด: ${colorize(totalMatches, 'bright')} นัด`);
    console.log(`✅ การแข่งขันที่เสร็จสิ้น: ${colorize(completedMatches, 'bright')} นัด`);
    console.log(`🥅 รวมประตูทั้งหมด: ${colorize(totalGoals, 'bright')} ประตู`);
    console.log(`📊 เฉลี่ยประตูต่อการแข่งขัน: ${colorize(avgGoalsPerMatch, 'bright')} ประตู`);

    console.log(colorize('\n📅 สถิติรายวัน:', 'yellow'));
    dailyStats.forEach(day => {
        const completionRate = day.total > 0 ? ((day.completed / day.total) * 100).toFixed(1) : 0;
        console.log(`${day.date}: ${day.total} นัด (เสร็จ ${day.completed} นัด, ${day.goals} ประตู, ${completionRate}%)`);
    });
}

async function main() {
    showBanner();

    const args = process.argv.slice(2);
    const choice = args[0];
    const params = args.slice(1);

    if (!choice) {
        showMainMenu();
        showUsageExamples();
        return;
    }

    await handleChoice(choice, params);
}

// รันโปรแกรม
if (require.main === module) {
    main().catch(error => {
        console.log(colorize(`\n💥 เกิดข้อผิดพลาดร้ายแรง: ${error.message}`, 'red'));
        process.exit(1);
    });
}

module.exports = { handleChoice, showBanner, showMainMenu };
