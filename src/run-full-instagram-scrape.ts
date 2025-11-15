import { InstagramScraper } from './scrapers/instagram';
import { DatabaseManager } from './storage/database';
import { SEED_INSTAGRAM } from './data/seeds';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  console.log('🚀 Full Instagram Scrape - Complete Data Collection\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check for backup flag
  const shouldBackup = process.argv.includes('--backup');
  const shouldClear = process.argv.includes('--clear');
  const shouldSkipExisting = !process.argv.includes('--force-rescrape');

  // Initialize database
  const db = new DatabaseManager();

  // Backup existing database if requested
  if (shouldBackup) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const backupPath = `./data/creators_backup_${timestamp}.db`;
    fs.copyFileSync('./data/creators.db', backupPath);
    console.log(`✅ Database backed up to: ${backupPath}\n`);
  }

  // Clear database if requested
  if (shouldClear) {
    console.log('🗑️  Clearing database...');
    (db as any).db.exec(`
      DELETE FROM content_samples;
      DELETE FROM platform_accounts;
      DELETE FROM creators;
    `);
    console.log('✅ Database cleared\n');
  }

  // Get existing Instagram profiles to skip
  let existingHandles = new Set<string>();
  if (shouldSkipExisting) {
    const existing = (db as any).db
      .prepare('SELECT handle FROM platform_accounts WHERE platform = ?')
      .all('instagram') as { handle: string }[];
    existingHandles = new Set(existing.map(e => e.handle.toLowerCase()));
    if (existingHandles.size > 0) {
      console.log(`⏭️  Will skip ${existingHandles.size} already-scraped profiles\n`);
    }
  }

  const stats = db.getStats();
  console.log('📊 Starting Database State:');
  console.log(`   Creators: ${stats.total_creators}`);
  console.log(`   Instagram Accounts: ${(stats.accounts_by_platform as any[]).find(p => p.platform === 'instagram')?.count || 0}`);
  console.log(`   Content Samples: ${stats.total_content_samples}\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Filter out existing handles if needed
  const handlesToScrape = SEED_INSTAGRAM.filter(handle =>
    !shouldSkipExisting || !existingHandles.has(handle.toLowerCase())
  );

  console.log(`📋 Profiles to scrape: ${handlesToScrape.length}/${SEED_INSTAGRAM.length}`);
  console.log(`⏱️  Estimated time: ~${Math.round(handlesToScrape.length * 84 / 60)} minutes (${(handlesToScrape.length * 84 / 3600).toFixed(1)} hours)\n`);
  console.log('🔍 Mode: FULL (all 20 posts with engagement metrics)\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Initialize scraper with FULL metrics (all 20 posts)
  const scraper = new InstagramScraper(true, true, 20);

  let successCount = 0;
  let errorCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < handlesToScrape.length; i++) {
    const handle = handlesToScrape[i];
    const progress = `[${i + 1}/${handlesToScrape.length}]`;
    const profileUrl = `https://www.instagram.com/${handle}/`;

    try {
      console.log(`\n${progress} Scraping @${handle}...`);

      const result = await scraper.scrapeProfileHeadless(profileUrl);

      if (result) {
        // Save to database
        db.upsertCreatorFromPlatformData('instagram', result);

        const postsWithMetrics = result.content_samples?.filter(p => p.likes || p.comments).length || 0;
        console.log(`   ✅ @${handle}`);
        console.log(`      Followers: ${result.follower_count?.toLocaleString() || 'unknown'}`);
        console.log(`      Posts with metrics: ${postsWithMetrics}/${result.content_samples?.length || 0}`);
        console.log(`      Similar accounts: ${result.similar_accounts?.length || 0}`);

        successCount++;
      } else {
        console.log(`   ⚠️  No data returned for @${handle}`);
        errorCount++;
      }
    } catch (error: any) {
      console.error(`   ❌ Error scraping @${handle}: ${error.message}`);
      errorCount++;
    }

    // Progress update every 10 profiles
    if ((i + 1) % 10 === 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = (i + 1) / elapsed;
      const remaining = (handlesToScrape.length - (i + 1)) / rate / 60;

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📊 Progress: ${i + 1}/${handlesToScrape.length} (${((i + 1) / handlesToScrape.length * 100).toFixed(1)}%)`);
      console.log(`   ✅ Success: ${successCount} | ❌ Errors: ${errorCount}`);
      console.log(`   ⏱️  Estimated time remaining: ${remaining.toFixed(0)} minutes`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
  }

  await scraper.cleanup();

  // Final stats
  const finalStats = db.getStats();
  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ SCRAPING COMPLETE!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`⏱️  Total Time: ${totalTime} minutes`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}\n`);

  console.log('📊 Final Database State:');
  console.log(`   Total Creators: ${finalStats.total_creators}`);
  console.log(`   Instagram Accounts: ${(finalStats.accounts_by_platform as any[]).find(p => p.platform === 'instagram')?.count || 0}`);
  console.log(`   Content Samples: ${finalStats.total_content_samples}\n`);

  db.close();

  console.log('💡 Next Steps:');
  console.log('   • Export data: npm run export');
  console.log('   • Analyze engagement: npm run analyze');
  console.log('   • Content classification: npm run classify\n');
}

run().catch(console.error);
