import { SubstackScraper } from '../../src/scrapers/substack';
import { DatabaseManager } from '../../src/storage/database';

async function test() {
  console.log('🧪 Testing Substack scraper (limit: 5 creators)\n');

  const scraper = new SubstackScraper();
  const results = await scraper.discoverAndScrape(
    ['recipe'],
    false,
    2,
    5
  );

  if (results.length > 0) {
    console.log('\n📊 Data Quality Summary:');
    console.log('========================\n');

    for (const result of results) {
      console.log(`\n🔹 ${result.display_name}`);
      console.log(`   Handle: @${result.handle}`);
      console.log(`   URL: ${result.profile_url}`);
      console.log(`   Bio: ${result.bio_text?.substring(0, 100)}${result.bio_text && result.bio_text.length > 100 ? '...' : ''}`);
      console.log(`   Subscribers: ${result.follower_count?.toLocaleString() || 'Unknown'}`);
      console.log(`   Total Posts: ${result.total_content_count || 'Unknown'}`);
      console.log(`   Subscription: ${result.subscription_price_lowest ? `$${result.subscription_price_lowest}/${result.subscription_currency}` : 'Free/Unknown'}`);
      console.log(`   Social Links: ${result.social_links?.length || 0} (${result.social_links?.join(', ') || 'none'})`);
      console.log(`   Content Samples: ${result.content_samples?.length || 0}`);

      if (result.content_samples && result.content_samples.length > 0) {
        console.log('\n   Recent Posts:');
        result.content_samples.slice(0, 3).forEach((post, i) => {
          console.log(`     ${i + 1}. ${post.title_or_caption || 'Untitled'}`);
          console.log(`        ${post.url}`);
          if (post.published_at) console.log(`        Published: ${post.published_at}`);
        });
      }
    }

    console.log('\n\n💾 Testing database save...');
    const db = new DatabaseManager();

    for (const result of results) {
      db.upsertCreatorFromPlatformData('substack', result);
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
}

test().catch(console.error);
