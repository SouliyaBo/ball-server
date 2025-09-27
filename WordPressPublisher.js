const axios = require('axios');
const FormData = require('form-data');

class WordPressPublisher {
    constructor(config) {
        this.wpSiteUrl = config.wpSiteUrl; // เช่น https://yoursite.com
        this.username = config.username;
        this.password = config.password; // Application Password
        this.apiBase = `${this.wpSiteUrl}/wp-json/wp/v2`;

        // Basic Auth header
        this.authHeader = Buffer.from(`${this.username}:${this.password}`).toString('base64');

        console.log(`🔧 WordPress Publisher เชื่อมต่อกับ: ${this.wpSiteUrl}`);
    }

    // ฟังก์ชันทำความสะอาดเนื้อหา
    cleanContent(content) {
        if (!content) return '';

        return content
            // ลบ HTML tags
            .replace(/<[^>]*>/g, '')
            // ลบ CSS/JavaScript code
            .replace(/\{[^}]*display[^}]*\}/g, '')
            .replace(/googletag\.cmd\.push.*?}\);/g, '')
            .replace(/window\._taboola.*?}\);/g, '')
            .replace(/taboola\.push.*?}\);/g, '')
            // ลบ special characters และ control characters
            .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
            // ลบ whitespace ส่วนเกิน
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n')
            // ทำความสะอาด quotes
            .replace(/[""]/g, '"')
            .replace(/['']/g, "'")
            .trim();
    }

    async testConnection() {
        try {
            console.log('🔗 ทดสอบการเชื่อมต่อ WordPress...');

            const response = await axios.get(`${this.apiBase}/users/me`, {
                headers: {
                    'Authorization': `Basic ${this.authHeader}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`✅ เชื่อมต่อสำเร็จ! ผู้ใช้: ${response.data.name}`);
            return {
                success: true,
                user: response.data
            };

        } catch (error) {
            console.error('❌ การเชื่อมต่อ WordPress ล้มเหลว:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    async uploadImage(imageUrl, title = '') {
        try {
            console.log(`📷 กำลังอัพโหลดรูปภาพ: ${imageUrl}`);

            // ดาวน์โหลดรูปภาพ
            const imageResponse = await axios.get(imageUrl, {
                responseType: 'stream',
                timeout: 30000
            });

            // สร้าง FormData
            const formData = new FormData();
            formData.append('file', imageResponse.data, {
                filename: `kapook-${Date.now()}.jpg`,
                contentType: imageResponse.headers['content-type'] || 'image/jpeg'
            });

            // อัพโหลดไป WordPress
            const uploadResponse = await axios.post(`${this.apiBase}/media`, formData, {
                headers: {
                    'Authorization': `Basic ${this.authHeader}`,
                    ...formData.getHeaders()
                }
            });

            console.log(`✅ อัพโหลดรูปภาพสำเร็จ: ${uploadResponse.data.source_url}`);

            return {
                success: true,
                mediaId: uploadResponse.data.id,
                url: uploadResponse.data.source_url
            };

        } catch (error) {
            console.error('❌ การอัพโหลดรูปภาพล้มเหลว:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    async createPost(newsData, options = {}) {
        try {
            console.log(`📝 กำลังสร้างโพสต์: ${newsData.title.substring(0, 50)}...`);

            let featuredMediaId = null;
            // ทำความสะอาดเนื้อหาก่อนโพสต์
            let postContent = this.cleanContent(newsData.content || '');

            // อัพโหลดรูปภาพหลัก (ถ้ามี)
            if (newsData.images && newsData.images.length > 0) {
                const firstImage = newsData.images[0];
                const uploadResult = await this.uploadImage(firstImage, newsData.title);

                if (uploadResult.success) {
                    featuredMediaId = uploadResult.mediaId;

                    // เพิ่มรูปภาพอื่นๆ ในเนื้อหา
                    for (let i = 1; i < Math.min(newsData.images.length, 3); i++) {
                        const additionalImage = newsData.images[i];
                        const additionalUpload = await this.uploadImage(additionalImage);

                        if (additionalUpload.success) {
                            postContent += `\n\n<img src="${additionalUpload.url}" alt="${newsData.title}" style="max-width: 100%; height: auto;">`;
                        }
                    }
                }
            }

            // เพิ่มข้อมูลแหล่งที่มา
            postContent += `\n\n<hr>\n<p><small>ที่มา: <a href="${newsData.url}" target="_blank" rel="noopener">Kapook Football</a></small></p>`;

            // แปลง tags เป็น IDs
            let tagIds = [];
            if (options.tags && options.tags.length > 0) {
                tagIds = await this.getOrCreateTags(options.tags);
            }

            // แปลง category เป็น ID
            let categoryIds = [];
            if (options.category) {
                const categoryId = await this.getOrCreateCategory(options.category);
                if (categoryId) {
                    categoryIds.push(categoryId);
                }
            }

            // สร้างโพสต์
            const postData = {
                title: this.cleanContent(newsData.title), // ทำความสะอาด title ด้วย
                content: postContent,
                status: options.status || 'publish', // draft หรือ publish
                author: options.authorId || 1,
                categories: categoryIds, // array ของ category IDs
                tags: tagIds, // array ของ tag IDs (แปลงแล้ว)
                featured_media: featuredMediaId,
                meta: {
                    'kapook_original_url': newsData.url,
                    'kapook_news_id': newsData.id,
                    'kapook_scraped_at': newsData.scrapedAt
                }
            };

            const response = await axios.post(`${this.apiBase}/posts`, postData, {
                headers: {
                    'Authorization': `Basic ${this.authHeader}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`✅ สร้างโพสต์สำเร็จ! ID: ${response.data.id}, URL: ${response.data.link}`);

            return {
                success: true,
                postId: response.data.id,
                postUrl: response.data.link,
                wpData: response.data
            };

        } catch (error) {
            console.error('❌ การสร้างโพสต์ล้มเหลว:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    async checkPostExists(newsId, title = '') {
        try {
            // ถ้าไม่มี newsId ให้ return null (ไม่ค้นหา)
            if (!newsId || newsId.trim() === '') {
                return null;
            }

            // ค้นหาโพสต์ที่มี meta key 'kapook_news_id' ตรงกัน
            const response = await axios.get(`${this.apiBase}/posts`, {
                params: {
                    meta_key: 'kapook_news_id',
                    meta_value: newsId,
                    per_page: 1
                },
                headers: {
                    'Authorization': `Basic ${this.authHeader}`
                }
            });

            if (response.data.length > 0) {
                const existingPost = response.data[0];
                console.log(`🔍 พบโพสต์ที่มี ID ${newsId}: "${existingPost.title.rendered}"`);

                // เปรียบเทียบ title เพื่อความแน่ใจ
                if (title) {
                    const similarity = this.calculateTitleSimilarity(existingPost.title.rendered, title);
                    console.log(`📊 ความคล้าย title: ${(similarity * 100).toFixed(1)}%`);

                    // ถ้า title คล้ายกันมากกว่า 80% จึงถือว่าซ้ำ
                    if (similarity > 0.8) {
                        return existingPost;
                    } else {
                        console.log(`⚠️ ID ซ้ำแต่ title ต่างกัน - อนุญาตให้โพสต์`);
                        return null;
                    }
                } else {
                    return existingPost;
                }
            }

            return null;

        } catch (error) {
            console.error('❌ การตรวจสอบโพสต์ล้มเหลว:', error.message);
            return null;
        }
    }

    calculateTitleSimilarity(title1, title2) {
        // ฟังก์ชันง่ายๆ สำหรับเปรียบเทียบความคล้าย
        const normalize = (str) => str.toLowerCase().replace(/[^\u0E00-\u0E7Fa-z0-9]/g, '');
        const norm1 = normalize(title1);
        const norm2 = normalize(title2);

        if (norm1 === norm2) return 1.0;

        const longer = norm1.length > norm2.length ? norm1 : norm2;
        const shorter = norm1.length > norm2.length ? norm2 : norm1;

        if (longer.length === 0) return 1.0;

        const matches = shorter.split('').filter(char => longer.includes(char)).length;
        return matches / longer.length;
    }

    async getOrCreateTags(tagNames) {
        try {
            const tagIds = [];

            for (const tagName of tagNames) {
                if (typeof tagName === 'string') {
                    // ค้นหา tag ที่มีอยู่
                    const existingTags = await axios.get(`${this.apiBase}/tags`, {
                        headers: {
                            'Authorization': `Basic ${this.authHeader}`
                        },
                        params: {
                            search: tagName,
                            per_page: 1
                        }
                    });

                    if (existingTags.data.length > 0) {
                        // ใช้ tag ที่มีอยู่
                        tagIds.push(existingTags.data[0].id);
                        console.log(`🏷️  ใช้ tag ที่มีอยู่: ${tagName} (ID: ${existingTags.data[0].id})`);
                    } else {
                        // สร้าง tag ใหม่
                        const newTag = await axios.post(`${this.apiBase}/tags`, {
                            name: tagName,
                            slug: tagName.toLowerCase().replace(/\s+/g, '-')
                        }, {
                            headers: {
                                'Authorization': `Basic ${this.authHeader}`,
                                'Content-Type': 'application/json'
                            }
                        });

                        tagIds.push(newTag.data.id);
                        console.log(`🏷️  สร้าง tag ใหม่: ${tagName} (ID: ${newTag.data.id})`);
                    }
                } else if (typeof tagName === 'number') {
                    // ถ้าเป็น ID อยู่แล้ว
                    tagIds.push(tagName);
                }
            }

            return tagIds;

        } catch (error) {
            console.error('❌ การจัดการ tags ล้มเหลว:', error.response?.data || error.message);
            return [];
        }
    }

    async getCategories() {
        try {
            const response = await axios.get(`${this.apiBase}/categories`, {
                headers: {
                    'Authorization': `Basic ${this.authHeader}`
                },
                params: {
                    per_page: 100
                }
            });

            return response.data;

        } catch (error) {
            console.error('❌ การดึงหมวดหมู่ล้มเหลว:', error.message);
            return [];
        }
    }

    async createCategory(name, slug = null) {
        try {
            const categoryData = {
                name: name,
                slug: slug || name.toLowerCase().replace(/\s+/g, '-')
            };

            const response = await axios.post(`${this.apiBase}/categories`, categoryData, {
                headers: {
                    'Authorization': `Basic ${this.authHeader}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`✅ สร้างหมวดหมู่สำเร็จ: ${response.data.name}`);
            return response.data;

        } catch (error) {
            console.error('❌ การสร้างหมวดหมู่ล้มเหลว:', error.response?.data || error.message);
            return null;
        }
    }

    async getOrCreateCategory(categoryName) {
        try {
            // ดึงหมวดหมู่ทั้งหมด
            const categories = await this.getCategories();

            // หาหมวดหมู่ที่ต้องการ
            const existingCategory = categories.find(cat =>
                cat.name.toLowerCase() === categoryName.toLowerCase()
            );

            if (existingCategory) {
                console.log(`🏷️  ใช้หมวดหมู่ที่มีอยู่: ${existingCategory.name} (ID: ${existingCategory.id})`);
                return existingCategory.id;
            }

            // สร้างหมวดหมู่ใหม่ถ้าไม่มี
            const newCategory = await this.createCategory(categoryName);
            if (newCategory) {
                console.log(`🆕 สร้างหมวดหมู่ใหม่: ${newCategory.name} (ID: ${newCategory.id})`);
                return newCategory.id;
            }

            return null;

        } catch (error) {
            console.error('❌ Error getting or creating category:', error.message);
            return null;
        }
    }

    async publishNewsArray(newsArray, options = {}) {
        const results = {
            success: 0,
            failed: 0,
            skipped: 0,
            details: []
        };

        console.log(`🚀 เริ่มโพสต์ข่าว ${newsArray.length} รายการ...`);

        for (let i = 0; i < newsArray.length; i++) {
            const news = newsArray[i];
            console.log(`\n📰 [${i + 1}/${newsArray.length}] ${news.title.substring(0, 60)}...`);

            try {
                // ตรวจสอบว่าข่าวนี้เคยโพสต์แล้วหรือไม่
                if (news.id && news.id.trim() !== '') {
                    const existingPost = await this.checkPostExists(news.id, news.title);
                    if (existingPost) {
                        console.log(`⏭️  ข่าวนี้เคยโพสต์แล้ว: ${existingPost.link}`);
                        results.skipped++;
                        results.details.push({
                            title: news.title,
                            status: 'skipped',
                            reason: 'Already exists',
                            existingUrl: existingPost.link
                        });
                        continue;
                    }
                } else {
                    console.log(`⚠️  ข่าวนี้ไม่มี ID: ${news.title.substring(0, 50)}... - ข้ามการตรวจสอบซ้ำ`);
                }

                // สร้างโพสต์ใหม่
                const publishResult = await this.createPost(news, options);

                if (publishResult.success) {
                    results.success++;
                    results.details.push({
                        title: news.title,
                        status: 'success',
                        postId: publishResult.postId,
                        postUrl: publishResult.postUrl
                    });
                } else {
                    results.failed++;
                    results.details.push({
                        title: news.title,
                        status: 'failed',
                        error: publishResult.error
                    });
                }

                // รอระหว่างการโพสต์
                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error) {
                console.error(`❌ Error processing news ${i + 1}:`, error.message);
                results.failed++;
                results.details.push({
                    title: news.title,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        console.log(`\n🎉 สรุปผลการโพสต์:`);
        console.log(`✅ สำเร็จ: ${results.success} รายการ`);
        console.log(`❌ ล้มเหลว: ${results.failed} รายการ`);
        console.log(`⏭️  ข้าม: ${results.skipped} รายการ`);

        return results;
    }
}

module.exports = WordPressPublisher;
