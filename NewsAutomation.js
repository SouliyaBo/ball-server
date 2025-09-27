const KapookNewsScraper = require('./KapookNewsScraper');
const WordPressPublisher = require('./WordPressPublisher');
const NewsDatabase = require('./NewsDatabase');
const fs = require('fs').promises;
const path = require('path');

class NewsAutomation {
    constructor(configPath = './config.json') {
        this.configPath = configPath;
        this.config = null;
        this.scraper = null;
        this.publisher = null;
        this.database = null;
        this.isRunning = false;
    }

    async init() {
        try {
            console.log('🚀 เริ่มต้น News Automation System...');

            // โหลด config
            await this.loadConfig();

            // เริ่มต้น components
            this.scraper = new KapookNewsScraper();
            this.publisher = new WordPressPublisher(this.config.wordpress);
            this.database = new NewsDatabase(this.config.database.path);

            await this.database.init();

            // ทดสอบการเชื่อมต่อ WordPress
            const wpTest = await this.publisher.testConnection();
            if (!wpTest.success) {
                throw new Error(`WordPress connection failed: ${wpTest.error}`);
            }

            console.log('✅ News Automation System พร้อมใช้งาน');

        } catch (error) {
            console.error('❌ Error initializing News Automation:', error.message);
            throw error;
        }
    }

    async loadConfig() {
        try {
            const configContent = await fs.readFile(this.configPath, 'utf8');
            this.config = JSON.parse(configContent);
            console.log('📄 โหลด config สำเร็จ');
        } catch (error) {
            console.error('❌ Error loading config:', error.message);
            throw error;
        }
    }

    async runScrapeAndPublish() {
        if (this.isRunning) {
            console.log('⚠️  ระบบกำลังทำงานอยู่แล้ว');
            return;
        }

        this.isRunning = true;
        const startTime = new Date();

        try {
            console.log('\n🎯 เริ่มการดึงและโพสต์ข่าว...');
            console.log('⏰ เวลาเริ่มต้น:', startTime.toLocaleString('th-TH'));

            // ดึงข่าวจาก Kapook
            console.log('\n📰 กำลังดึงข่าวจาก Kapook...');
            const news = await this.scraper.scrapeNewsWithDetails(this.config.scraping.maxNewsPerRun);

            if (!news || news.length === 0) {
                console.log('ℹ️  ไม่มีข่าวใหม่');
                return;
            }

            console.log(`✅ ดึงข่าวสำเร็จ: ${news.length} รายการ`);

            // กรองข่าวที่ซ้ำ
            console.log('\n🔍 ตรวจสอบข่าวซ้ำ...');
            const newsToPublish = [];
            const duplicateNews = [];

            for (const newsItem of news) {
                const duplicateCheck = this.database.checkDuplicate(newsItem);

                if (duplicateCheck.isDuplicate) {
                    duplicateNews.push({
                        ...newsItem,
                        duplicateInfo: duplicateCheck
                    });
                    console.log(`⏭️  ข้าม (ซ้ำ): ${newsItem.title.substring(0, 50)}...`);
                } else {
                    newsToPublish.push(newsItem);
                }
            }

            console.log(`🆕 ข่าวใหม่: ${newsToPublish.length} รายการ`);
            console.log(`🔄 ข่าวซ้ำ: ${duplicateNews.length} รายการ`);

            if (newsToPublish.length === 0) {
                console.log('ℹ️  ไม่มีข่าวใหม่ที่ต้องโพสต์');
                return;
            }

            // เตรียม WordPress options
            const wpOptions = {
                status: this.config.wordpress.postStatus,
                authorId: this.config.wordpress.authorId,
                category: this.config.wordpress.defaultCategory,
                tags: this.config.wordpress.defaultTags
            };

            // โพสต์ข่าวไป WordPress
            console.log('\n📝 กำลังโพสต์ไป WordPress...');
            const publishResults = await this.publisher.publishNewsArray(newsToPublish, wpOptions);

            // บันทึกข่าวที่โพสต์สำเร็จ
            for (const result of publishResults.details) {
                if (result.status === 'success') {
                    const originalNews = newsToPublish.find(n => n.title === result.title);
                    if (originalNews) {
                        await this.database.addPublishedNews(originalNews, result);
                    }
                }
            }

            // อัพเดทสถิติ
            this.database.updateStats(
                news.length,
                publishResults.success,
                publishResults.skipped + duplicateNews.length,
                publishResults.failed
            );

            await this.database.save();

            // สรุปผล
            const endTime = new Date();
            const duration = Math.round((endTime - startTime) / 1000);

            console.log('\n🎉 สรุปผลการดำเนินการ:');
            console.log(`📊 ข่าวที่ดึงมา: ${news.length} รายการ`);
            console.log(`✅ โพสต์สำเร็จ: ${publishResults.success} รายการ`);
            console.log(`⏭️  ข้ามข่าวซ้ำ: ${duplicateNews.length} รายการ`);
            console.log(`❌ โพสต์ล้มเหลว: ${publishResults.failed} รายการ`);
            console.log(`⏱️  ใช้เวลา: ${duration} วินาที`);
            console.log(`⏰ เสร็จสิ้นเมื่อ: ${endTime.toLocaleString('th-TH')}`);

            // ส่งการแจ้งเตือน (ถ้ามี)
            await this.sendNotification({
                scraped: news.length,
                published: publishResults.success,
                skipped: duplicateNews.length,
                failed: publishResults.failed,
                duration: duration
            });

            return {
                success: true,
                stats: {
                    scraped: news.length,
                    published: publishResults.success,
                    skipped: duplicateNews.length,
                    failed: publishResults.failed,
                    duration: duration
                }
            };

        } catch (error) {
            console.error('❌ Error in automation run:', error.message);

            await this.sendNotification({
                error: error.message,
                success: false
            });

            throw error;

        } finally {
            this.isRunning = false;
        }
    }

    async getOrCreateCategories() {
        try {
            const categories = await this.publisher.getCategories();
            const defaultCategoryName = this.config.wordpress.defaultCategory;

            let categoryId = categories.find(cat => cat.name === defaultCategoryName)?.id;

            if (!categoryId) {
                console.log(`📁 สร้างหมวดหมู่ใหม่: ${defaultCategoryName}`);
                const newCategory = await this.publisher.createCategory(defaultCategoryName);
                categoryId = newCategory?.id;
            }

            return categoryId ? [categoryId] : [];

        } catch (error) {
            console.error('❌ Error handling categories:', error.message);
            return [];
        }
    }

    async getOrCreateTags() {
        // WordPress tags จะถูกสร้างอัตโนมัติเมื่อโพสต์
        // แค่ return array ของ tag names
        return this.config.wordpress.defaultTags || [];
    }

    async sendNotification(data) {
        // ส่งการแจ้งเตือนผ่านช่องทางต่างๆ
        if (this.config.notifications.discordWebhook) {
            await this.sendDiscordNotification(data);
        }

        if (this.config.notifications.lineNotify) {
            await this.sendLineNotification(data);
        }
    }

    async sendDiscordNotification(data) {
        try {
            const axios = require('axios');

            let message;
            if (data.success !== false) {
                message = `🤖 **News Automation Report**\n\n` +
                         `📊 ดึงข่าว: ${data.scraped} รายการ\n` +
                         `✅ โพสต์สำเร็จ: ${data.published} รายการ\n` +
                         `⏭️ ข้ามข่าวซ้ำ: ${data.skipped} รายการ\n` +
                         `❌ ล้มเหลว: ${data.failed} รายการ\n` +
                         `⏱️ ใช้เวลา: ${data.duration} วินาที`;
            } else {
                message = `🚨 **News Automation Error**\n\n❌ ${data.error}`;
            }

            await axios.post(this.config.notifications.discordWebhook, {
                content: message
            });

        } catch (error) {
            console.error('❌ Discord notification failed:', error.message);
        }
    }

    async sendLineNotification(data) {
        try {
            const axios = require('axios');

            let message;
            if (data.success !== false) {
                message = `News Automation สำเร็จ!\n` +
                         `ดึงข่าว: ${data.scraped}\n` +
                         `โพสต์สำเร็จ: ${data.published}\n` +
                         `ข้ามซ้ำ: ${data.skipped}\n` +
                         `ล้มเหลว: ${data.failed}`;
            } else {
                message = `News Automation ล้มเหลว!\nError: ${data.error}`;
            }

            await axios.post('https://notify-api.line.me/api/notify',
                `message=${encodeURIComponent(message)}`, {
                headers: {
                    'Authorization': `Bearer ${this.config.notifications.lineNotify}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

        } catch (error) {
            console.error('❌ LINE notification failed:', error.message);
        }
    }

    async getStatus() {
        const stats = this.database.getStats();
        const recentNews = await this.database.getRecentNews(5);

        return {
            isRunning: this.isRunning,
            stats: stats,
            recentNews: recentNews,
            config: {
                maxNewsPerRun: this.config.scraping.maxNewsPerRun,
                wpSite: this.config.wordpress.siteUrl
            }
        };
    }

    async cleanup() {
        try {
            console.log('🧹 ทำความสะอาดข้อมูลเก่า...');

            const removedCount = await this.database.cleanup(this.config.database.cleanupAfterDays);

            if (this.scraper) {
                await this.scraper.close();
            }

            console.log('✅ ทำความสะอาดเสร็จสิ้น');
            return removedCount;

        } catch (error) {
            console.error('❌ Cleanup error:', error.message);
            throw error;
        }
    }
}

module.exports = NewsAutomation;
