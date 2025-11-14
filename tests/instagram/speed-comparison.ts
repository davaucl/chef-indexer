import { InstagramScraper } from '../../src/scrapers/instagram';

async function test() {
  console.log('⚡ Instagram Scraper Speed Comparison\n');
  console.log('Testing with platedbylily profile...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const testUrl = 'https://www.instagram.com/platedbylily/';

  // Option 1: Fast Mode (No Metrics)
  console.log('🚀 Option 1: FAST MODE (No Engagement Metrics)');
  console.log('   Gets: Profile info, 20 post URLs, captions, similar accounts');
  const start1 = Date.now();
  const scraper1 = new InstagramScraper(true, false); // No metrics
  const result1 = await scraper1.scrapeProfileHeadless(testUrl);
  await scraper1.cleanup();
  const time1 = ((Date.now() - start1) / 1000).toFixed(1);
  console.log(`   ✅ Completed in ${time1}s`);
  console.log(`   📊 Posts captured: ${result1?.content_samples?.length || 0}\n`);

  // Option 2: Medium Mode (5 posts with metrics)
  console.log('⚡ Option 2: MEDIUM MODE (First 5 Posts with Metrics)');
  console.log('   Gets: Everything + likes/comments for 5 most recent posts');
  const start2 = Date.now();
  const scraper2 = new InstagramScraper(true, true, 5); // 5 posts with metrics
  const result2 = await scraper2.scrapeProfileHeadless(testUrl);
  await scraper2.cleanup();
  const time2 = ((Date.now() - start2) / 1000).toFixed(1);
  console.log(`   ✅ Completed in ${time2}s`);
  if (result2?.content_samples) {
    const withMetrics = result2.content_samples.filter(p => p.likes || p.comments).length;
    console.log(`   📊 Posts with metrics: ${withMetrics}/20\n`);
  }

  // Option 3: Full Mode (All posts with metrics)
  console.log('🐢 Option 3: FULL MODE (All 20 Posts with Metrics)');
  console.log('   Gets: Everything + likes/comments for all 20 posts');
  const start3 = Date.now();
  const scraper3 = new InstagramScraper(true, true, 20); // All posts with metrics
  const result3 = await scraper3.scrapeProfileHeadless(testUrl);
  await scraper3.cleanup();
  const time3 = ((Date.now() - start3) / 1000).toFixed(1);
  console.log(`   ✅ Completed in ${time3}s`);
  if (result3?.content_samples) {
    const withMetrics = result3.content_samples.filter(p => p.likes || p.comments).length;
    console.log(`   📊 Posts with metrics: ${withMetrics}/20\n`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📈 Speed Comparison Summary:');
  console.log('═══════════════════════════════════════════════\n');
  console.log(`   Fast Mode:   ${time1}s  (${(268 / parseFloat(time1) * 60).toFixed(0)} profiles/hour)`);
  console.log(`   Medium Mode: ${time2}s  (${(268 / parseFloat(time2) * 60).toFixed(0)} profiles/hour)`);
  console.log(`   Full Mode:   ${time3}s  (${(268 / parseFloat(time3) * 60).toFixed(0)} profiles/hour)\n`);

  console.log('💡 Recommendations:');
  console.log('   • Fast Mode: Initial scrape of all 268 profiles (~30min)');
  console.log('   • Medium Mode: Balanced approach (~1-2 hours)');
  console.log('   • Full Mode: Most detailed data (~4-5 hours)\n');

  console.log('   Or run Fast Mode first, then add metrics later for top creators!');
}

test().catch(console.error);
