import { DatabaseManager } from './storage/database';
import { SubstackScraper } from './scrapers/substack';
import { PatreonScraper } from './scrapers/patreon';
import { YouTubeScraper } from './scrapers/youtube';
import { InstagramScraper } from './scrapers/instagram';
import { FOOD_KEYWORDS } from './config';

async function main() {
  const command = process.argv[2] || 'help';
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : Infinity;

  const platformArg = process.argv.find((arg) => arg.startsWith('--platform='));
  const platform = platformArg ? platformArg.split('=')[1] : 'all';

  const db = new DatabaseManager();

  switch (command) {
    case 'discover':
      console.log('🔍 Starting discovery process...');
      console.log(`Platform: ${platform}`);
      console.log(`Keywords: ${FOOD_KEYWORDS.length} food-related terms`);
      if (limit !== Infinity) {
        console.log(`Limit: ${limit} creators per platform\n`);
      } else {
        console.log('Limit: No limit (will run until exhausted)\n');
      }

      let totalSaved = 0;

      if (platform === 'all' || platform === 'substack') {
        console.log('\n═══════════════════════════════════════');
        console.log('           SUBSTACK DISCOVERY');
        console.log('═══════════════════════════════════════');

        const substackScraper = new SubstackScraper(true); // Enable AI classification
        const substackResults = await substackScraper.discoverAndScrape(FOOD_KEYWORDS, false, 2, limit);

        console.log('\n💾 Saving Substack creators to database...');
        let skipped = 0;
        for (const result of substackResults) {
          try {
            // Check if already exists before saving
            if (db.creatorExists('substack', result.handle)) {
              skipped++;
              continue;
            }
            db.upsertCreatorFromPlatformData('substack', result);
            totalSaved++;
          } catch (error: any) {
            console.error(`Error saving ${result.profile_url}:`, error.message);
          }
        }
        console.log(`✅ Saved ${substackResults.length - skipped} Substack creators (${skipped} already existed)`);
      }

      if (platform === 'all' || platform === 'patreon') {
        console.log('\n═══════════════════════════════════════');
        console.log('           PATREON DISCOVERY');
        console.log('═══════════════════════════════════════');

        const patreonScraper = new PatreonScraper();
        const patreonResults = await patreonScraper.discoverAndScrape(FOOD_KEYWORDS, false, 2, limit);

        console.log('\n💾 Saving Patreon creators to database...');
        let skipped = 0;
        for (const result of patreonResults) {
          try {
            if (db.creatorExists('patreon', result.handle)) {
              skipped++;
              continue;
            }
            db.upsertCreatorFromPlatformData('patreon', result);
            totalSaved++;
          } catch (error: any) {
            console.error(`Error saving ${result.profile_url}:`, error.message);
          }
        }
        console.log(`✅ Saved ${patreonResults.length - skipped} Patreon creators (${skipped} already existed)`);
      }

      if (platform === 'all' || platform === 'youtube') {
        console.log('\n═══════════════════════════════════════');
        console.log('           YOUTUBE DISCOVERY');
        console.log('═══════════════════════════════════════');

        const youtubeScraper = new YouTubeScraper();
        const youtubeResults = await youtubeScraper.discoverAndScrape(FOOD_KEYWORDS, 1, limit);

        console.log('\n💾 Saving YouTube creators to database...');
        let skipped = 0;
        for (const result of youtubeResults) {
          try {
            if (db.creatorExists('youtube', result.handle)) {
              skipped++;
              continue;
            }
            db.upsertCreatorFromPlatformData('youtube', result);
            totalSaved++;
          } catch (error: any) {
            console.error(`Error saving ${result.profile_url}:`, error.message);
          }
        }
        console.log(`✅ Saved ${youtubeResults.length - skipped} YouTube creators (${skipped} already existed)`);
      }

      if (platform === 'all' || platform === 'instagram') {
        console.log('\n═══════════════════════════════════════');
        console.log('           INSTAGRAM DISCOVERY');
        console.log('═══════════════════════════════════════');

        const instagramScraper = new InstagramScraper();
        const instagramResults = await instagramScraper.discoverAndScrape(FOOD_KEYWORDS, true, limit, 2);

        console.log('\n💾 Saving Instagram creators to database...');
        let skipped = 0;
        for (const result of instagramResults) {
          try {
            if (db.creatorExists('instagram', result.handle)) {
              skipped++;
              continue;
            }
            db.upsertCreatorFromPlatformData('instagram', result);
            totalSaved++;
          } catch (error: any) {
            console.error(`Error saving ${result.profile_url}:`, error.message);
          }
        }
        console.log(`✅ Saved ${instagramResults.length - skipped} Instagram creators (${skipped} already existed)`);
      }

      console.log(`\n🎉 Discovery complete! Total saved: ${totalSaved} creators`);
      console.log('\n📤 Auto-exporting to JSON...');

      try {
        const exportPath = './data/export.json';
        db.exportToJson(exportPath);
        console.log(`✅ Exported to ${exportPath}`);
      } catch (error: any) {
        console.error(`⚠️  Export failed: ${error.message}`);
      }

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ SCRAPING SESSION COMPLETE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n📊 Final Stats:');
      const finalStats = db.getStats();
      console.log(`   Total Creators: ${finalStats.total_creators}`);
      console.log(`   Total Content Samples: ${finalStats.total_content_samples}`);
      console.log('\n   Accounts by Platform:');
      finalStats.accounts_by_platform.forEach((p: any) => {
        console.log(`     ${p.platform}: ${p.count}`);
      });
      console.log('\n💡 Next Steps:');
      console.log('   - View detailed stats: npm start stats');
      console.log('   - Run AI enrichment: npm run enrich');
      console.log('   - Download database: See DEPLOYMENT.md');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      break;

    case 'enrich':
      console.log('🤖 Starting AI enrichment...');
      console.log('Not implemented yet. Coming in next checkpoint!');
      break;

    case 'export':
      console.log('📤 Exporting data...');
      const outputPath = './data/export.json';
      db.exportToJson(outputPath);
      console.log(`✅ Exported to ${outputPath}`);
      break;

    case 'stats':
      console.log('📊 Database Statistics:\n');
      const stats = db.getStats();
      console.log(`Total Creators: ${stats.total_creators}`);
      console.log(`Total Content Samples: ${stats.total_content_samples}`);
      console.log('\nAccounts by Platform:');
      stats.accounts_by_platform.forEach((p: any) => {
        console.log(`  ${p.platform}: ${p.count}`);
      });
      break;

    case 'help':
    default:
      console.log(`
Chef Indexer - Food Creator Discovery System

Commands:
  discover [options]      Start discovering creators from platforms
  enrich                  Run AI enrichment on discovered creators
  export                  Export database to JSON
  stats                   Show database statistics
  help                    Show this help message

Options for discover:
  --limit=N               Stop after finding N creators per platform
  --platform=P            Specify platform: substack, patreon, youtube, instagram, or all (default: all)

Examples:
  npm run discover                            # Full discovery on all platforms
  npm run discover -- --limit=10              # 10 creators per platform
  npm run discover -- --platform=substack     # Only Substack
  npm run discover -- --platform=patreon --limit=20   # 20 Patreon creators
  npm run discover -- --platform=youtube --limit=20   # 20 YouTube creators
  npm run discover -- --platform=instagram --limit=20 # 20 Instagram creators
  npm test                                    # Quick Substack test (5 creators)
      `);
  }

  db.close();
}

main().catch(console.error);
