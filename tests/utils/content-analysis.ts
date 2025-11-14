import { InstagramScraper } from '../../src/scrapers/instagram';
import { ContentClassifier } from '../../src/utils/content-classifier';
import { config } from '../../src/config';

async function test() {
  console.log('🧪 Testing Content Analysis with Headless Browser + AI\n');

  if (!config.openaiApiKey) {
    console.log('⚠️  OPENAI_API_KEY not set. Please add it to .env to enable content classification.\n');
    return;
  }

  // Use headless mode for richer data
  const scraper = new InstagramScraper(true);
  const classifier = new ContentClassifier();

  console.log('📸 Scraping Instagram profiles with headless browser...\n');

  // Scrape just 3 creators for testing
  const results = await scraper.discoverAndScrape(
    ['recipe'], // Keyword
    false, // No Google search
    3, // Limit to 3 creators
    1 // 1 snowball round
  );

  if (results.length === 0) {
    console.log('❌ No results found\n');
    return;
  }

  console.log(`\n✅ Scraped ${results.length} creators\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Analyze each creator's content
  for (const result of results) {
    console.log(`\n🔹 ${result.display_name} (@${result.handle})`);
    console.log(`   ${result.follower_count?.toLocaleString() || 'unknown'} followers`);
    console.log(`   ${result.content_samples?.length || 0} posts scraped\n`);

    if (!result.content_samples || result.content_samples.length === 0) {
      console.log('   ⚠️  No content samples to analyze\n');
      continue;
    }

    console.log('   🤖 Classifying content with OpenAI...');

    // Prepare content for classification
    const contents = result.content_samples
      .filter((sample) => sample.title_or_caption)
      .map((sample) => ({
        caption: sample.title_or_caption!,
        url: sample.url,
      }))
      .slice(0, 10); // Analyze up to 10 posts

    if (contents.length === 0) {
      console.log('   ⚠️  No captions found to analyze\n');
      continue;
    }

    // Classify content
    const classifications = await classifier.classifyMultipleContents(contents);

    if (classifications.length === 0) {
      console.log('   ❌ Failed to classify content\n');
      continue;
    }

    console.log(`   ✅ Classified ${classifications.length} posts\n`);

    // Analyze creator profile
    const profile = classifier.analyzeCreatorProfile(classifications);

    console.log('   📊 Content Profile:');
    console.log('   ─────────────────────');

    // Show top categories
    console.log(`\n   Top Categories:`);
    profile.topCategories.slice(0, 3).forEach((cat) => {
      console.log(`     • ${cat.category}: ${cat.percentage}% (${cat.count} posts)`);
    });

    // Show specific food types
    if (profile.topSpecificTypes.length > 0) {
      console.log(`\n   Most Posted Foods:`);
      profile.topSpecificTypes.slice(0, 5).forEach((type) => {
        console.log(`     • ${type.type}: ${type.count} times`);
      });
    }

    // Show cuisines
    if (profile.topCuisines.length > 0) {
      console.log(`\n   Cuisines:`);
      profile.topCuisines.forEach((cuisine) => {
        console.log(`     • ${cuisine.cuisine}: ${cuisine.count} posts`);
      });
    }

    // Show dietary focus
    if (profile.dietaryFocus.length > 0) {
      console.log(`\n   Dietary Focus: ${profile.dietaryFocus.join(', ')}`);
    }

    console.log('\n   ─────────────────────');
  }

  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Content analysis complete!\n');
  console.log('💡 This analysis can help you understand:');
  console.log('   • What type of content each creator focuses on');
  console.log('   • Which food categories are most popular');
  console.log('   • Dietary niches (vegan, keto, gluten-free, etc.)');
  console.log('   • Cuisine specializations\n');
}

test().catch(console.error);
