import { InstagramScraper } from './scrapers/instagram';
import { YouTubeScraper } from './scrapers/youtube';
import { PatreonScraper } from './scrapers/patreon';
import { SubstackScraper } from './scrapers/substack';
import { DatabaseManager } from './storage/database';
import { SEED_INSTAGRAM, SEED_YOUTUBE, SEED_PATREON, SEED_SUBSTACKS } from './data/seeds';
import { FoodClassifier } from './utils/food-classifier';
import * as fs from 'fs';
import * as path from 'path';

interface DiscoveryQueue {
  handle: string;
  platform: 'instagram' | 'youtube' | 'tiktok' | 'patreon' | 'substack';
  source: string; // Which profile discovered this one
  priority: number; // 0 = seed, 1 = first-degree, 2 = second-degree, etc.
}

class DiscoveryEngine {
  private db: DatabaseManager;
  private queue: DiscoveryQueue[] = [];
  private processed = new Set<string>(); // track "platform:handle"
  private instagramScraper: InstagramScraper;
  private youtubeScraper: YouTubeScraper;
  private patreonScraper: PatreonScraper;
  private substackScraper: SubstackScraper;
  private foodClassifier: FoodClassifier | null = null;
  private stats = {
    totalDiscovered: 0,
    totalProcessed: 0,
    foodCreators: 0,
    nonFoodFiltered: 0,
    byPlatform: {
      instagram: 0,
      youtube: 0,
      tiktok: 0,
      patreon: 0,
      substack: 0,
    },
    startTime: Date.now(),
  };

  constructor() {
    this.db = new DatabaseManager();

    // Check if AI is available
    const aiEnabled = !!process.env.OPENAI_API_KEY;

    this.instagramScraper = new InstagramScraper(true, true, 20); // Full metrics
    this.youtubeScraper = new YouTubeScraper(aiEnabled); // Enable AI if available
    this.patreonScraper = new PatreonScraper(aiEnabled); // Enable AI if available
    this.substackScraper = new SubstackScraper(aiEnabled); // Enable AI if available

    // Initialize food classifier if OpenAI key available
    try {
      this.foodClassifier = new FoodClassifier();
      console.log('✅ Food classifier enabled for discovery engine (using OpenAI)\n');
    } catch {
      console.log('⚠️  Food classifier disabled (OPENAI_API_KEY not set)\n');
      console.log('   Instagram will use keyword-based filtering only.\n');
      console.log('   All other platforms will use keyword-based detection.\n');
    }
  }

  // Add seeds to queue
  initializeSeeds() {
    console.log('🌱 Initializing seed profiles...\n');

    // Add Instagram seeds
    SEED_INSTAGRAM.forEach((handle) => {
      this.addToQueue({
        handle,
        platform: 'instagram',
        source: 'SEED',
        priority: 0,
      });
    });
    console.log(`✅ Added ${SEED_INSTAGRAM.length} Instagram seeds`);

    // Add YouTube seeds
    if (SEED_YOUTUBE && SEED_YOUTUBE.length > 0) {
      SEED_YOUTUBE.forEach((channelId) => {
        this.addToQueue({
          handle: channelId,
          platform: 'youtube',
          source: 'SEED',
          priority: 0,
        });
      });
      console.log(`✅ Added ${SEED_YOUTUBE.length} YouTube seeds`);
    }

    // Add Patreon seeds
    if (SEED_PATREON && SEED_PATREON.length > 0) {
      SEED_PATREON.forEach((handle) => {
        this.addToQueue({
          handle,
          platform: 'patreon',
          source: 'SEED',
          priority: 0,
        });
      });
      console.log(`✅ Added ${SEED_PATREON.length} Patreon seeds`);
    }

    // Add Substack seeds
    if (SEED_SUBSTACKS && SEED_SUBSTACKS.length > 0) {
      SEED_SUBSTACKS.forEach((handle: string) => {
        this.addToQueue({
          handle,
          platform: 'substack',
          source: 'SEED',
          priority: 0,
        });
      });
      console.log(`✅ Added ${SEED_SUBSTACKS.length} Substack seeds`);
    }

    console.log('');
  }

  // Add profile to queue if not already processed
  addToQueue(item: DiscoveryQueue) {
    const key = `${item.platform}:${item.handle.toLowerCase()}`;

    if (this.processed.has(key)) {
      return; // Already processed
    }

    // Check if already in database
    const existing = (this.db as any).db
      .prepare('SELECT 1 FROM platform_accounts WHERE platform = ? AND LOWER(handle) = ?')
      .get(item.platform, item.handle.toLowerCase());

    if (existing) {
      this.processed.add(key);
      return; // Already in DB
    }

    // Not in queue yet
    if (!this.queue.find((q) => `${q.platform}:${q.handle.toLowerCase()}` === key)) {
      this.queue.push(item);
      this.stats.totalDiscovered++;
    }
  }

  // Process Instagram profile with AI pre-filtering
  async processInstagram(item: DiscoveryQueue) {
    const profileUrl = `https://www.instagram.com/${item.handle}/`;

    try {
      // STEP 1: Lightweight scrape for AI classification (if enabled)
      if (this.foodClassifier && item.priority > 0) {
        // Only filter discovered accounts, not seeds
        console.log(`   🔍 Pre-checking @${item.handle} (AI filter)...`);

        // Use light scraper to get bio + 3 posts (no metrics)
        const lightScraper = new InstagramScraper(true, false); // Headless but no metrics
        await (lightScraper as any).headless.initialize();

        const lightData = await (lightScraper as any).headless.extractInstagramProfile(
          profileUrl,
          false,
          3
        ); // 3 posts max

        await lightScraper.cleanup();

        if (lightData) {
          // Classify with AI
          const classification = await this.foodClassifier.isFoodCreator({
            platform: 'instagram',
            handle: item.handle,
            displayName: lightData.displayName,
            bio: lightData.bio,
            recentPosts: lightData.posts?.slice(0, 3).map((p: any) => p.altText).filter(Boolean),
          });

          console.log(
            `      ${classification.isFoodCreator ? '✅' : '❌'} Food creator: ${classification.isFoodCreator} (confidence: ${(classification.confidence * 100).toFixed(0)}%)`
          );
          console.log(`      Reason: ${classification.reason}`);

          // If not food creator with high confidence, mark in DB and skip
          if (!classification.isFoodCreator && classification.confidence > 0.4) {
            // Mark as non-food in database
            const creatorId = (this.db as any).db
              .prepare('INSERT INTO creators (display_name, is_food_creator, food_confidence) VALUES (?, 0, ?)')
              .run(lightData.displayName, classification.confidence).lastInsertRowid;

            (this.db as any).db
              .prepare(
                `INSERT INTO platform_accounts (
                creator_id, platform, handle, display_name, profile_url, bio_text
              ) VALUES (?, ?, ?, ?, ?, ?)`
              )
              .run(creatorId, 'instagram', item.handle, lightData.displayName, profileUrl, lightData.bio || null);

            this.stats.nonFoodFiltered++;
            console.log(`      ⏭️  Skipping non-food account\n`);
            return;
          }
        }
      }

      // STEP 2: Full scrape with metrics (for seeds or food creators)
      console.log(`   📸 Full scrape @${item.handle}...`);

      const result = await this.instagramScraper.scrapeProfileHeadless(profileUrl);

      if (!result) {
        console.log(`   ⚠️  No data returned`);
        return;
      }

      // Save to database
      this.db.upsertCreatorFromPlatformData('instagram', result);

      const postsWithMetrics = result.content_samples?.filter((p) => p.likes || p.comments).length || 0;
      console.log(`   ✅ @${item.handle}`);
      console.log(`      Followers: ${result.follower_count?.toLocaleString() || 'unknown'}`);
      console.log(`      Posts with metrics: ${postsWithMetrics}/${result.content_samples?.length || 0}`);
      console.log(`      Similar accounts: ${result.similar_accounts?.length || 0}`);

      this.stats.byPlatform.instagram++;
      this.stats.foodCreators++;

      // SNOWBALL: Add similar Instagram accounts to queue
      if (result.similar_accounts && result.similar_accounts.length > 0) {
        result.similar_accounts.forEach((similarHandle) => {
          this.addToQueue({
            handle: similarHandle,
            platform: 'instagram',
            source: `@${item.handle}`,
            priority: item.priority + 1,
          });
        });
        console.log(`      🔄 Discovered ${result.similar_accounts.length} similar accounts`);
      }

      // CROSS-PLATFORM: Extract social links
      if (result.social_links && result.social_links.length > 0) {
        const discovered = this.extractCrossPlatformLinks(result.social_links, item.handle);
        if (discovered > 0) {
          console.log(`      🔗 Discovered ${discovered} cross-platform links`);
        }
      }
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  // Process YouTube channel
  async processYouTube(item: DiscoveryQueue) {
    const channelId = item.handle;

    try {
      console.log(`   🎥 Scraping YouTube ${channelId}...`);

      const result = await this.youtubeScraper.scrapeChannel(channelId);

      if (!result) {
        console.log(`   ⚠️  No data returned`);
        return;
      }

      // Save to database
      this.db.upsertCreatorFromPlatformData('youtube', result);

      const videosWithMetrics = result.content_samples?.filter((v) => v.views || v.likes).length || 0;
      console.log(`   ✅ ${result.display_name}`);
      console.log(`      Subscribers: ${result.follower_count?.toLocaleString() || 'unknown'}`);
      console.log(`      Videos with metrics: ${videosWithMetrics}/${result.content_samples?.length || 0}`);

      this.stats.byPlatform.youtube++;

      // SNOWBALL: Find related YouTube channels (featured channels)
      try {
        const relatedChannels = await this.youtubeScraper.findRelatedChannels(channelId);
        if (relatedChannels.length > 0) {
          relatedChannels.forEach((relatedChannelId) => {
            this.addToQueue({
              handle: relatedChannelId,
              platform: 'youtube',
              source: item.handle,
              priority: item.priority + 1,
            });
          });
          console.log(`      🔄 Discovered ${relatedChannels.length} featured YouTube channels`);
        }
      } catch {
        // Ignore errors finding related channels
      }

      // CROSS-PLATFORM: Extract social links
      if (result.social_links && result.social_links.length > 0) {
        const discovered = this.extractCrossPlatformLinks(result.social_links, item.handle);
        if (discovered > 0) {
          console.log(`      🔗 Discovered ${discovered} cross-platform links`);
        }
      }
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  // Process Patreon creator
  async processPatreon(item: DiscoveryQueue) {
    const creatorUrl = `https://www.patreon.com/${item.handle}`;

    try {
      console.log(`   💰 Scraping Patreon @${item.handle}...`);

      const result = await this.patreonScraper.scrapeCreator(creatorUrl);

      if (!result) {
        console.log(`   ⚠️  No data returned`);
        return;
      }

      // Save to database
      this.db.upsertCreatorFromPlatformData('patreon', result);

      console.log(`   ✅ ${result.display_name}`);
      console.log(`      Patrons: ${result.follower_count?.toLocaleString() || 'unknown'}`);
      console.log(`      Posts: ${result.content_samples?.length || 0}`);

      this.stats.byPlatform.patreon++;

      // SNOWBALL: Find related Patreon creators
      try {
        const relatedCreators = await this.patreonScraper.findRelatedCreators(creatorUrl);
        if (relatedCreators.length > 0) {
          relatedCreators.forEach((relatedUrl) => {
            const handleMatch = relatedUrl.match(/patreon\.com\/([^\/\?]+)/);
            if (handleMatch) {
              this.addToQueue({
                handle: handleMatch[1],
                platform: 'patreon',
                source: `@${item.handle}`,
                priority: item.priority + 1,
              });
            }
          });
          console.log(`      🔄 Discovered ${relatedCreators.length} related Patreon creators`);
        }
      } catch {
        // Ignore errors finding related creators
      }

      // CROSS-PLATFORM: Extract social links
      if (result.social_links && result.social_links.length > 0) {
        const discovered = this.extractCrossPlatformLinks(result.social_links, item.handle);
        if (discovered > 0) {
          console.log(`      🔗 Discovered ${discovered} cross-platform links`);
        }
      }
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  // Process Substack publication
  async processSubstack(item: DiscoveryQueue) {
    // Handle both full URLs and just handles
    const publicationUrl = item.handle.startsWith('http')
      ? item.handle
      : `https://${item.handle}.substack.com`;

    try {
      const displayHandle = item.handle.startsWith('http')
        ? item.handle.match(/https?:\/\/([^.]+)\.substack\.com/)?.[1] || item.handle
        : item.handle;
      console.log(`   📝 Scraping Substack ${displayHandle}...`);

      const result = await this.substackScraper.scrapePublication(publicationUrl);

      if (!result) {
        console.log(`   ⚠️  No data returned`);
        return;
      }

      // Save to database
      this.db.upsertCreatorFromPlatformData('substack', result);

      console.log(`   ✅ ${result.display_name}`);
      console.log(`      Subscribers: ${result.follower_count?.toLocaleString() || 'unknown'}`);
      console.log(`      Posts: ${result.content_samples?.length || 0}`);

      this.stats.byPlatform.substack++;

      // SNOWBALL: Find related Substack publications
      try {
        const relatedPublications = await this.substackScraper.findRelatedPublications(publicationUrl);
        if (relatedPublications.length > 0) {
          relatedPublications.forEach((relatedUrl) => {
            const handleMatch = relatedUrl.match(/https?:\/\/([^.]+)\.substack\.com/);
            if (handleMatch) {
              this.addToQueue({
                handle: handleMatch[1],
                platform: 'substack',
                source: item.handle,
                priority: item.priority + 1,
              });
            }
          });
          console.log(`      🔄 Discovered ${relatedPublications.length} related Substack publications`);
        }
      } catch {
        // Ignore errors finding related publications
      }

      // CROSS-PLATFORM: Extract social links
      if (result.social_links && result.social_links.length > 0) {
        const discovered = this.extractCrossPlatformLinks(result.social_links, item.handle);
        if (discovered > 0) {
          console.log(`      🔗 Discovered ${discovered} cross-platform links`);
        }
      }
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  // Extract and queue profiles from social links
  extractCrossPlatformLinks(urls: string[], source: string): number {
    let count = 0;

    urls.forEach((url) => {
      const lower = url.toLowerCase();

      // Instagram
      if (lower.includes('instagram.com')) {
        const match = url.match(/instagram\.com\/([a-zA-Z0-9_.]+)/);
        if (match && match[1] !== 'p' && match[1] !== 'reel' && match[1] !== 'reels') {
          this.addToQueue({
            handle: match[1],
            platform: 'instagram',
            source: `@${source}`,
            priority: 1,
          });
          count++;
        }
      }

      // YouTube
      if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
        const match = url.match(/(?:youtube\.com\/(?:c\/|channel\/|@)?|youtu\.be\/)([a-zA-Z0-9_-]+)/);
        if (match) {
          this.addToQueue({
            handle: match[1],
            platform: 'youtube',
            source: `@${source}`,
            priority: 1,
          });
          count++;
        }
      }

      // TikTok
      if (lower.includes('tiktok.com')) {
        const match = url.match(/tiktok\.com\/@([a-zA-Z0-9_.]+)/);
        if (match) {
          this.addToQueue({
            handle: match[1],
            platform: 'tiktok',
            source: `@${source}`,
            priority: 1,
          });
          count++;
        }
      }

      // Patreon
      if (lower.includes('patreon.com')) {
        const match = url.match(/patreon\.com\/([a-zA-Z0-9_]+)/);
        if (match) {
          this.addToQueue({
            handle: match[1],
            platform: 'patreon',
            source: `@${source}`,
            priority: 1,
          });
          count++;
        }
      }

      // Substack
      if (lower.includes('substack.com')) {
        const match = url.match(/([a-zA-Z0-9-]+)\.substack\.com/);
        if (match) {
          this.addToQueue({
            handle: match[1],
            platform: 'substack',
            source: `@${source}`,
            priority: 1,
          });
          count++;
        }
      }
    });

    return count;
  }

  // Process next item in queue
  async processNext(): Promise<boolean> {
    if (this.queue.length === 0) {
      return false; // Queue empty
    }

    // Sort by priority (seeds first, then first-degree, etc.)
    this.queue.sort((a, b) => a.priority - b.priority);

    const item = this.queue.shift()!;
    const key = `${item.platform}:${item.handle.toLowerCase()}`;
    this.processed.add(key);
    this.stats.totalProcessed++;

    const progress = `[${this.stats.totalProcessed}/${this.stats.totalDiscovered}]`;
    console.log(`\n${progress} Processing ${item.platform}:${item.handle} (from ${item.source})`);

    // Process based on platform
    switch (item.platform) {
      case 'instagram':
        await this.processInstagram(item);
        break;
      case 'youtube':
        await this.processYouTube(item);
        break;
      case 'patreon':
        await this.processPatreon(item);
        break;
      case 'substack':
        await this.processSubstack(item);
        break;
      case 'tiktok':
        console.log(`   ⏭️  Skipping TikTok (not implemented yet)`);
        break;
    }

    return true;
  }

  // Show progress
  showProgress() {
    const elapsed = (Date.now() - this.stats.startTime) / 1000 / 60;
    const rate = this.stats.totalProcessed / elapsed;

    // Calculate ETA for remaining queue
    const remainingQueue = this.queue.length;
    const etaMinutes = remainingQueue > 0 && rate > 0 ? remainingQueue / rate : 0;
    const etaHours = Math.floor(etaMinutes / 60);
    const etaMinutesRemainder = Math.floor(etaMinutes % 60);

    // Progress percentage
    const totalItems = this.stats.totalProcessed + remainingQueue;
    const progressPercent = totalItems > 0 ? (this.stats.totalProcessed / totalItems * 100).toFixed(1) : 0;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 DISCOVERY ENGINE STATUS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`⏱️  Runtime: ${elapsed.toFixed(1)} minutes (${(elapsed/60).toFixed(1)} hours)`);
    console.log(`📈 Processing Rate: ${rate.toFixed(1)} profiles/min`);
    if (etaMinutes > 0) {
      console.log(`⏳ Estimated Time Remaining: ${etaHours}h ${etaMinutesRemainder}m\n`);
    } else {
      console.log('');
    }
    console.log(`🔍 Discovery Progress:`);
    console.log(`   Total Discovered: ${this.stats.totalDiscovered}`);
    console.log(`   Total Processed: ${this.stats.totalProcessed} (${progressPercent}%)`);
    console.log(`   Queue Remaining: ${this.queue.length}\n`);

    if (this.foodClassifier) {
      console.log(`🍕 Food Creator Filter:`);
      console.log(`   ✅ Food Creators: ${this.stats.foodCreators}`);
      console.log(`   ❌ Non-Food Filtered: ${this.stats.nonFoodFiltered}`);
      const filterRate = this.stats.totalProcessed > 0 ? (this.stats.nonFoodFiltered / this.stats.totalProcessed * 100).toFixed(1) : 0;
      console.log(`   📊 Filter Rate: ${filterRate}% rejected\n`);
    }

    console.log(`📊 By Platform:`);
    Object.entries(this.stats.byPlatform).forEach(([platform, count]) => {
      if (count > 0) {
        console.log(`   ${platform}: ${count}`);
      }
    });

    // Database stats
    const dbStats = this.db.getStats();
    const totalCreators = dbStats.total_creators;
    const totalAccounts = (dbStats.accounts_by_platform as any[]).reduce((sum, p) => sum + p.count, 0);

    console.log(`\n💾 Database:`);
    console.log(`   Total Creators: ${totalCreators.toLocaleString()}`);
    console.log(`   Total Accounts: ${totalAccounts.toLocaleString()}`);
    console.log(`   Content Samples: ${dbStats.total_content_samples.toLocaleString()}`);

    // Growth metrics
    const elapsedHours = elapsed / 60;
    const profilesPerHour = elapsedHours > 0 ? (this.stats.totalProcessed / elapsedHours) : 0;

    console.log(`\n📈 Growth Metrics:`);
    console.log(`   Processing Rate: ${profilesPerHour.toFixed(1)} profiles/hour`);

    if (totalCreators < 10000 && profilesPerHour > 0) {
      const remainingProfiles = 10000 - totalCreators;
      const hoursTo10k = remainingProfiles / profilesPerHour;
      if (hoursTo10k < 100) {
        console.log(`   Estimated time to 10,000 profiles: ${hoursTo10k.toFixed(1)} hours`);
      }
    } else if (totalCreators >= 10000) {
      console.log(`   🎉 Target of 10,000 profiles reached!`);
    }

    // Database file size
    try {
      const dbPath = (this.db as any).dbPath || './data/creators.db';
      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`   Database file size: ${sizeInMB} MB`);
      }
    } catch {
      // Ignore file size errors
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  // Main discovery loop
  async run() {
    console.log('🚀 DISCOVERY ENGINE - Starting...\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🎯 Goal: Discover ALL food content creators across platforms');
    console.log('🔄 Method: Snowball discovery from seed profiles');
    console.log('📊 Expected: Tens of thousands of profiles\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Initialize with seeds
    this.initializeSeeds();

    // Process queue until empty
    let count = 0;
    while (await this.processNext()) {
      count++;

      // Show progress every 10 profiles
      if (count % 10 === 0) {
        this.showProgress();
      }

      // Save progress checkpoint every 50 profiles
      if (count % 50 === 0) {
        this.saveCheckpoint();
      }
    }

    // Final report
    await this.instagramScraper.cleanup();
    this.showProgress();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DISCOVERY COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Auto-export to JSON
    console.log('📤 Auto-exporting database to JSON...');
    try {
      const exportPath = './data/export.json';
      const exportDir = path.dirname(exportPath);

      // Ensure export directory exists
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
        console.log(`   Created export directory: ${exportDir}`);
      }

      this.db.exportToJson(exportPath);
      console.log(`✅ Exported to ${exportPath}\n`);
    } catch (error: any) {
      console.error(`⚠️  Export failed: ${error.message}\n`);
    }

    console.log('💡 Next Steps:');
    console.log('   - Download database: ./scripts/download-database.sh');
    console.log('   - View stats: npm run db:status');
    console.log('   - Run AI enrichment: npm run enrich');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    this.db.close();
  }

  // Save checkpoint to resume later if needed
  saveCheckpoint() {
    const checkpoint = {
      queue: this.queue,
      processed: Array.from(this.processed),
      stats: this.stats,
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync('./data/discovery_checkpoint.json', JSON.stringify(checkpoint, null, 2));
  }

  // Load checkpoint to resume
  loadCheckpoint() {
    try {
      const data = fs.readFileSync('./data/discovery_checkpoint.json', 'utf-8');
      const checkpoint = JSON.parse(data);

      this.queue = checkpoint.queue;
      this.processed = new Set(checkpoint.processed);
      this.stats = checkpoint.stats;

      console.log(`✅ Loaded checkpoint from ${checkpoint.timestamp}`);
      console.log(`   Queue: ${this.queue.length} profiles`);
      console.log(`   Processed: ${this.processed.size} profiles\n`);

      return true;
    } catch {
      return false;
    }
  }
}

// Run the discovery engine
async function main() {
  const engine = new DiscoveryEngine();

  // Try to load checkpoint if exists
  const resumed = engine.loadCheckpoint();
  if (resumed) {
    console.log('🔄 Resuming from checkpoint...\n');
  }

  await engine.run();
}

main().catch(console.error);
