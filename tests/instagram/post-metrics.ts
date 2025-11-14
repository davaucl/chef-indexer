import { InstagramScraper } from '../../src/scrapers/instagram';

async function test() {
  console.log('🧪 Testing Instagram with POST METRICS (likes & comments)\n');
  console.log('⚠️  This will be slower (~60-80 seconds per creator) but gets engagement data\n');

  // Enable both headless mode AND post metrics
  const scraper = new InstagramScraper(true, true); // useHeadless=true, fetchPostMetrics=true

  const results = await scraper.discoverAndScrape(
    ['recipe'], // Keywords
    false, // Don't use Google search
    2, // Limit to 2 creators for testing
    1 // 1 snowball round
  );

  if (results.length > 0) {
    console.log('\n\n📊 Engagement Data Summary:');
    console.log('===========================\n');

    for (const result of results) {
      console.log(`\n🔹 ${result.display_name} (@${result.handle})`);
      console.log(`   ${result.follower_count?.toLocaleString() || 'unknown'} followers`);

      if (!result.content_samples || result.content_samples.length === 0) {
        console.log('   ⚠️  No content samples found\n');
        continue;
      }

      // Calculate engagement metrics
      let totalLikes = 0;
      let totalComments = 0;
      let postsWithMetrics = 0;

      result.content_samples.forEach((post) => {
        if (post.likes || post.comments) {
          totalLikes += post.likes || 0;
          totalComments += post.comments || 0;
          postsWithMetrics++;
        }
      });

      if (postsWithMetrics > 0) {
        const avgLikes = Math.round(totalLikes / postsWithMetrics);
        const avgComments = Math.round(totalComments / postsWithMetrics);
        const engagementRate = result.follower_count
          ? (((avgLikes + avgComments) / result.follower_count) * 100).toFixed(2)
          : 'N/A';

        console.log(`\n   📊 Engagement Metrics:`);
        console.log(`   ─────────────────────`);
        console.log(`   Posts analyzed: ${postsWithMetrics}`);
        console.log(`   Avg likes per post: ${avgLikes.toLocaleString()}`);
        console.log(`   Avg comments per post: ${avgComments.toLocaleString()}`);
        console.log(`   Engagement rate: ${engagementRate}%`);

        // Show top performing posts
        const topPosts = result.content_samples
          .filter((p) => p.likes || p.comments)
          .sort((a, b) => (b.likes || 0) - (a.likes || 0))
          .slice(0, 3);

        if (topPosts.length > 0) {
          console.log(`\n   🔥 Top Performing Posts:`);
          topPosts.forEach((post, i) => {
            console.log(`\n   ${i + 1}. ${post.url}`);
            console.log(`      Likes: ${(post.likes || 0).toLocaleString()}`);
            console.log(`      Comments: ${(post.comments || 0).toLocaleString()}`);
            if (post.title_or_caption) {
              console.log(`      Caption: ${post.title_or_caption.substring(0, 60)}...`);
            }
          });
        }
      } else {
        console.log(`   ⚠️  No engagement metrics extracted`);
      }
    }

    console.log('\n\n✅ Test complete!');
    console.log('💡 You can now analyze which content types get the most engagement!');
  } else {
    console.log('\n⚠️  No results found');
  }

  await scraper.cleanup();
}

test().catch(console.error);
