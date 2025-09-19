const fs = require('fs').promises;
const path = require('path');

class NewsDatabase {
    constructor(dbPath = './news-database.json') {
        this.dbPath = dbPath;
        this.cache = new Map(); // In-memory cache
        this.data = {
            publishedNews: [],
            lastScrape: null,
            stats: {
                totalScraped: 0,
                totalPublished: 0,
                totalSkipped: 0,
                totalFailed: 0
            }
        };
    }

    async init() {
        try {
            console.log('🗄️  เริ่มต้น News Database...');

            // อ่านข้อมูลจากไฟล์ (ถ้ามี)
            try {
                const fileContent = await fs.readFile(this.dbPath, 'utf8');
                this.data = JSON.parse(fileContent);

                // สร้าง cache index สำหรับการค้นหาที่รวดเร็ว
                this.buildCache();

                console.log(`✅ โหลดข้อมูลจาก database: ${this.data.publishedNews.length} รายการ`);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    console.log('📄 สร้าง database ใหม่');
                    await this.save();
                } else {
                    throw error;
                }
            }

        } catch (error) {
            console.error('❌ Error initializing database:', error.message);
            throw error;
        }
    }

    buildCache() {
        this.cache.clear();
        for (const news of this.data.publishedNews) {
            // Index by Kapook news ID
            if (news.kapookId) {
                this.cache.set(`kapook_${news.kapookId}`, news);
            }

            // Index by URL
            if (news.originalUrl) {
                this.cache.set(`url_${news.originalUrl}`, news);
            }

            // Index by title hash (สำหรับข่าวที่ไม่มี ID)
            if (news.title) {
                const titleHash = this.hashString(news.title);
                this.cache.set(`title_${titleHash}`, news);
            }
        }
    }

    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString();
    }

    async save() {
        try {
            await fs.writeFile(this.dbPath, JSON.stringify(this.data, null, 2), 'utf8');
            console.log('💾 บันทึก database สำเร็จ');
        } catch (error) {
            console.error('❌ Error saving database:', error.message);
            throw error;
        }
    }

    checkDuplicate(newsItem) {
        // ตรวจสอบการซ้ำด้วยหลายวิธี
        const checks = [];

        // 1. ตรวจสอบด้วย Kapook ID
        if (newsItem.id) {
            const existingByKapookId = this.cache.get(`kapook_${newsItem.id}`);
            if (existingByKapookId) {
                checks.push({
                    method: 'kapook_id',
                    existing: existingByKapookId,
                    isDuplicate: true
                });
            }
        }

        // 2. ตรวจสอบด้วย URL
        if (newsItem.url) {
            const existingByUrl = this.cache.get(`url_${newsItem.url}`);
            if (existingByUrl) {
                checks.push({
                    method: 'url',
                    existing: existingByUrl,
                    isDuplicate: true
                });
            }
        }

        // 3. ตรวจสอบด้วย title hash
        if (newsItem.title) {
            const titleHash = this.hashString(newsItem.title);
            const existingByTitle = this.cache.get(`title_${titleHash}`);
            if (existingByTitle) {
                // ตรวจสอบความคล้ายคลึงของ title เพิ่มเติม
                const similarity = this.calculateSimilarity(newsItem.title, existingByTitle.title);
                if (similarity > 0.95) { // เปลี่ยนเป็น 95% คล้ายกันถึงจะถือว่าซ้ำ
                    checks.push({
                        method: 'title_similarity',
                        existing: existingByTitle,
                        similarity: similarity,
                        isDuplicate: true
                    });
                }
            }
        }

        const isDuplicate = checks.length > 0;
        return {
            isDuplicate,
            checks,
            existingNews: isDuplicate ? checks[0].existing : null
        };
    }

    calculateSimilarity(str1, str2) {
        // Simple similarity calculation using Levenshtein distance
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) {
            return 1.0;
        }

        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    async addPublishedNews(newsItem, wpPostData) {
        const publishedNews = {
            kapookId: newsItem.id,
            title: newsItem.title,
            originalUrl: newsItem.url,
            wpPostId: wpPostData.postId,
            wpPostUrl: wpPostData.postUrl,
            publishedAt: new Date().toISOString(),
            scrapedAt: newsItem.scrapedAt
        };

        // เพิ่มเข้า database
        this.data.publishedNews.push(publishedNews);

        // อัพเดท cache
        if (publishedNews.kapookId) {
            this.cache.set(`kapook_${publishedNews.kapookId}`, publishedNews);
        }
        if (publishedNews.originalUrl) {
            this.cache.set(`url_${publishedNews.originalUrl}`, publishedNews);
        }
        if (publishedNews.title) {
            const titleHash = this.hashString(publishedNews.title);
            this.cache.set(`title_${titleHash}`, publishedNews);
        }

        // อัพเดทสถิติ
        this.data.stats.totalPublished++;

        await this.save();

        console.log(`📋 บันทึกข่าวที่โพสต์แล้ว: ${newsItem.title.substring(0, 50)}...`);
    }

    updateStats(scraped, published, skipped, failed) {
        this.data.stats.totalScraped += scraped;
        this.data.stats.totalPublished += published;
        this.data.stats.totalSkipped += skipped;
        this.data.stats.totalFailed += failed;
        this.data.lastScrape = new Date().toISOString();
    }

    getStats() {
        return {
            ...this.data.stats,
            lastScrape: this.data.lastScrape,
            totalNewsInDb: this.data.publishedNews.length
        };
    }

    async cleanup(daysOld = 30) {
        // ลบข้อมูลเก่าที่เกิน X วัน
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const originalCount = this.data.publishedNews.length;
        this.data.publishedNews = this.data.publishedNews.filter(news => {
            const publishedDate = new Date(news.publishedAt);
            return publishedDate > cutoffDate;
        });

        const removedCount = originalCount - this.data.publishedNews.length;

        if (removedCount > 0) {
            // Rebuild cache after cleanup
            this.buildCache();
            await this.save();
            console.log(`🧹 ล้างข้อมูลเก่า: ลบ ${removedCount} รายการ`);
        }

        return removedCount;
    }

    async getRecentNews(limit = 10) {
        return this.data.publishedNews
            .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
            .slice(0, limit);
    }

    async exportData(filePath) {
        const exportData = {
            ...this.data,
            exportedAt: new Date().toISOString(),
            totalRecords: this.data.publishedNews.length
        };

        await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf8');
        console.log(`📤 ส่งออกข้อมูล: ${filePath}`);
    }
}

module.exports = NewsDatabase;
