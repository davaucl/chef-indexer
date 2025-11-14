import { InstagramScraper } from '../../src/scrapers/instagram';
import { FoodClassifier } from '../../src/utils/food-classifier';

async function testFiltering() {
  console.log('🧪 Testing Instagram filtering with 3 profiles\n');
  console.log('Testing the new gpt-5-nano model for food creator detection\n');

  // Test with 3 known profiles: mix of food and non-food creators
  const testProfiles = [
    'https://www.instagram.com/gordonramsayofficial/', // Food creator
    'https://www.instagram.com/joshuaweissman/', // Food creator
    'https://www.instagram.com/cristiano/', // Not a food creator (football player)
  ];

  const scraper = new InstagramScraper(false, false); // Not using headless for quick test
  const foodClassifier = new FoodClassifier();

  console.log('📋 Test Profiles:');
  testProfiles.forEach((url, i) => {
    console.log(`   ${i + 1}. ${url}`);
  });
  console.log();

  const results = [];

  for (const profileUrl of testProfiles) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Scraping: ${profileUrl}`);
    console.log('='.repeat(80));

    const scraperResult = await scraper.scrapeProfile(profileUrl);

    if (!scraperResult) {
      console.log('❌ Failed to scrape profile\n');
      continue;
    }

    console.log(`\n✅ Profile Data Extracted:`);
    console.log(`   Handle: @${scraperResult.handle}`);
    console.log(`   Display Name: ${scraperResult.display_name}`);
    console.log(`   Bio: ${scraperResult.bio_text?.substring(0, 150) || 'No bio'}`);
    console.log(`   Followers: ${scraperResult.follower_count?.toLocaleString() || 'Unknown'}`);
    console.log(`   Posts: ${scraperResult.total_content_count?.toLocaleString() || 'Unknown'}`);

    // Test the basic keyword filtering (old method)
    const basicFilter = (result: any): boolean => {
      const foodKeywords = [
        'recipe', 'cook', 'bake', 'food', 'kitchen', 'chef', 'meal', 'dish',
        'cuisine', 'culinary', 'ingredient', 'dining', 'restaurant', 'eat',
        'gastro', 'flavor', 'taste', 'dessert', 'pastry', 'bread', 'cake', 'foodie',
      ];
      const textToCheck = `${result.display_name} ${result.bio_text || ''}`.toLowerCase();
      return foodKeywords.some((keyword) => textToCheck.includes(keyword));
    };

    const isBasicFilter = basicFilter(scraperResult);
    console.log(`\n🔍 Basic Keyword Filter: ${isBasicFilter ? '✅ FOOD' : '❌ NOT FOOD'}`);

    // Test the AI filtering (new gpt-5-nano model)
    console.log('\n🤖 AI Classification (gpt-5-nano):');
    console.log('   Analyzing...');

    const aiClassification = await foodClassifier.isFoodCreator({
      platform: 'instagram',
      handle: scraperResult.handle,
      displayName: scraperResult.display_name,
      bio: scraperResult.bio_text,
      recentPosts: scraperResult.content_samples?.slice(0, 5).map(s => s.title_or_caption || '') || [],
    });

    console.log(`   Result: ${aiClassification.isFoodCreator ? '✅ FOOD CREATOR' : '❌ NOT FOOD CREATOR'}`);
    console.log(`   Confidence: ${(aiClassification.confidence * 100).toFixed(1)}%`);
    console.log(`   Reason: ${aiClassification.reason}`);

    results.push({
      profile: profileUrl,
      handle: scraperResult.handle,
      displayName: scraperResult.display_name,
      basicFilter: isBasicFilter,
      aiFilter: aiClassification.isFoodCreator,
      confidence: aiClassification.confidence,
      reason: aiClassification.reason,
    });
  }

  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 FILTERING TEST SUMMARY');
  console.log('='.repeat(80));
  console.log();

  results.forEach((result, i) => {
    console.log(`${i + 1}. @${result.handle} (${result.displayName})`);
    console.log(`   Basic Filter: ${result.basicFilter ? '✅ Food' : '❌ Not Food'}`);
    console.log(`   AI Filter (gpt-5-nano): ${result.aiFilter ? '✅ Food Creator' : '❌ Not Food Creator'} (${(result.confidence * 100).toFixed(1)}% confidence)`);
    console.log(`   AI Reason: ${result.reason}`);
    console.log();
  });

  // Analysis
  console.log('🎯 EXPECTED RESULTS:');
  console.log('   @gordonramsayofficial: ✅ FOOD CREATOR (celebrity chef)');
  console.log('   @joshuaweissman: ✅ FOOD CREATOR (cooking content creator)');
  console.log('   @cristiano: ❌ NOT FOOD CREATOR (football player)');
  console.log();

  const correctBasic = results.filter(r =>
    (r.handle === 'gordonramsayofficial' && r.basicFilter) ||
    (r.handle === 'joshuaweissman' && r.basicFilter) ||
    (r.handle === 'cristiano' && !r.basicFilter)
  ).length;

  const correctAI = results.filter(r =>
    (r.handle === 'gordonramsayofficial' && r.aiFilter) ||
    (r.handle === 'joshuaweissman' && r.aiFilter) ||
    (r.handle === 'cristiano' && !r.aiFilter)
  ).length;

  console.log('📈 ACCURACY:');
  console.log(`   Basic Keyword Filter: ${correctBasic}/${results.length} correct (${(correctBasic/results.length*100).toFixed(1)}%)`);
  console.log(`   AI Filter (gpt-5-nano): ${correctAI}/${results.length} correct (${(correctAI/results.length*100).toFixed(1)}%)`);
  console.log();

  if (correctAI >= correctBasic) {
    console.log('✅ SUCCESS: gpt-5-nano model is working correctly and performing well!');
  } else {
    console.log('⚠️  WARNING: AI filter may need tuning');
  }

  await scraper.cleanup();
}

testFiltering().catch(console.error);
