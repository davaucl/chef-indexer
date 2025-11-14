import { InstagramScraper } from '../../src/scrapers/instagram';
import { DatabaseManager } from '../../src/storage/database';

async function test() {
  console.log('🧪 Testing Instagram HEADLESS scraper (limit: 5 creators)\n');

  const scraper = new InstagramScraper(true); // Enable headless mode
  const results = await scraper.discoverAndScrape(
    ['recipe'], // Keywords
    false, // Don't use Google search
    5, // Limit to 5 creators
    1 // Only 1 snowball round for testing
  );

  if (results.length > 0) {
    console.log('\n📊 Data Quality Summary:');
    console.log('========================\n');

    for (const result of results) {
      console.log(`\n🔹 ${result.display_name}`);
      console.log(`   Handle: @${result.handle}`);
      console.log(`   URL: ${result.profile_url}`);
      console.log(
        `   Bio: ${result.bio_text?.substring(0, 150)}${result.bio_text && result.bio_text.length > 150 ? '...' : ''}`
      );
      console.log(`   Followers: ${result.follower_count?.toLocaleString() || 'Unknown'}`);
      console.log(`   Following: ${result.following_count?.toLocaleString() || 'Unknown'}`);
      console.log(`   Total Posts: ${result.total_content_count?.toLocaleString() || 'Unknown'}`);
      console.log(`   Social Links: ${result.social_links?.length || 0}`);
      if (result.social_links && result.social_links.length > 0) {
        result.social_links.forEach((link) => console.log(`     - ${link}`));
      }
      console.log(`   Content Samples: ${result.content_samples?.length || 0}`);

      if (result.content_samples && result.content_samples.length > 0) {
        console.log('\n   Recent Posts:');
        result.content_samples.slice(0, 3).forEach((post, i) => {
          console.log(`     ${i + 1}. ${post.url}`);
          if (post.title_or_caption) {
            console.log(`        Caption: ${post.title_or_caption.substring(0, 60)}...`);
          }
        });
      }

      // Show similar accounts
      const similarAccounts = (result as any).similar_accounts;
      if (similarAccounts && similarAccounts.length > 0) {
        console.log(`\n   Similar Accounts: ${similarAccounts.length}`);
        similarAccounts.slice(0, 5).forEach((account: string) => {
          console.log(`     - @${account}`);
        });
      }
    }

    console.log('\n\n💾 Testing database save...');
    const db = new DatabaseManager();

    for (const result of results) {
      db.upsertCreatorFromPlatformData('instagram', result);
    }

    const stats = db.getStats();
    console.log('\n✅ Database Statistics:');
    console.log(`   Total Creators: ${stats.total_creators}`);
    console.log(`   Total Content Samples: ${stats.total_content_samples}`);
    console.log(`   Platforms: ${stats.accounts_by_platform.map((p: any) => `${p.platform}(${p.count})`).join(', ')}`);

    db.close();
  } else {
    console.log('\n⚠️  No results found');
  }

  console.log('\n✅ Test complete!');
}

test().catch(console.error);
