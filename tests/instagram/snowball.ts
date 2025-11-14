import { InstagramScraper } from '../../src/scrapers/instagram';

async function test() {
  console.log('🧪 Testing Instagram snowball discovery (starting with 3 seeds, target 10 creators)\n');

  const scraper = new InstagramScraper();

  // Override the seed list with just 3 accounts to demonstrate snowball
  const originalMethod = scraper.getKnownFoodInstagram.bind(scraper);
  scraper.getKnownFoodInstagram = () => [
    'https://www.instagram.com/platedbylily/',
    'https://www.instagram.com/taliacooks4you/',
    'https://www.instagram.com/foodjars/',
  ];

  const results = await scraper.discoverAndScrape(['recipe'], true, 10, 2);

  console.log('\n\n📊 Snowball Discovery Results:');
  console.log('================================\n');
  console.log(`Started with: 3 seed accounts`);
  console.log(`Found: ${results.length} food creators`);
  console.log('\nCreators discovered:');

  results.forEach((r, i) => {
    console.log(`  ${i + 1}. @${r.handle} - ${r.follower_count?.toLocaleString() || 'unknown'} followers`);
  });
}

test().catch(console.error);
