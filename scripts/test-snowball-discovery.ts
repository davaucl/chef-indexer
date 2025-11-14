import { YouTubeScraper } from '../src/scrapers/youtube';
import { PatreonScraper } from '../src/scrapers/patreon';
import { SubstackScraper } from '../src/scrapers/substack';

async function testSnowballDiscovery() {
  console.log('🧪 Testing Snowball Discovery for All Platforms\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test YouTube Snowball
  console.log('📺 Testing YouTube Snowball (Featured Channels)...\n');
  try {
    const youtubeScraper = new YouTubeScraper();
    const testChannelId = 'UCukv2MTdwivOGgfGd0xBWBw'; // Binging with Babish

    console.log(`   Testing with: Binging with Babish (${testChannelId})`);
    const relatedYT = await youtubeScraper.findRelatedChannels(testChannelId);

    if (relatedYT.length > 0) {
      console.log(`   ✅ Found ${relatedYT.length} featured channels:`);
      relatedYT.slice(0, 5).forEach(id => console.log(`      - ${id}`));
      if (relatedYT.length > 5) {
        console.log(`      ... and ${relatedYT.length - 5} more`);
      }
    } else {
      console.log(`   ⚠️  No featured channels found (channel may not have featured channels section)`);
    }
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test Patreon Snowball
  console.log('💰 Testing Patreon Snowball (Related Creators)...\n');
  try {
    const patreonScraper = new PatreonScraper();
    const testPatreonUrl = 'https://www.patreon.com/bingingwithbabish';

    console.log(`   Testing with: ${testPatreonUrl}`);
    const relatedPatreon = await patreonScraper.findRelatedCreators(testPatreonUrl);

    if (relatedPatreon.length > 0) {
      console.log(`   ✅ Found ${relatedPatreon.length} related Patreon creators:`);
      relatedPatreon.slice(0, 5).forEach(url => {
        const handle = url.match(/patreon\.com\/([^\/\?]+)/)?.[1];
        console.log(`      - @${handle}`);
      });
      if (relatedPatreon.length > 5) {
        console.log(`      ... and ${relatedPatreon.length - 5} more`);
      }
    } else {
      console.log(`   ⚠️  No related creators found (page may not have links to other creators)`);
    }
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test Substack Snowball
  console.log('📝 Testing Substack Snowball (Related Publications)...\n');
  try {
    const substackScraper = new SubstackScraper();
    const testSubstackUrl = 'https://alisoneroman.substack.com';

    console.log(`   Testing with: ${testSubstackUrl}`);
    const relatedSubstack = await substackScraper.findRelatedPublications(testSubstackUrl);

    if (relatedSubstack.length > 0) {
      console.log(`   ✅ Found ${relatedSubstack.length} related Substack publications:`);
      relatedSubstack.slice(0, 5).forEach(url => {
        const handle = url.match(/https?:\/\/([^.]+)\.substack\.com/)?.[1];
        console.log(`      - ${handle}`);
      });
      if (relatedSubstack.length > 5) {
        console.log(`      ... and ${relatedSubstack.length - 5} more`);
      }
    } else {
      console.log(`   ⚠️  No related publications found (page may not have links to other Substacks)`);
    }
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✅ Snowball Discovery Test Complete!');
  console.log('\n💡 All three platforms now have snowball discovery enabled.');
  console.log('   When you run the full discovery engine, it will:');
  console.log('   - Extract similar Instagram accounts');
  console.log('   - Find featured YouTube channels');
  console.log('   - Discover related Patreon creators');
  console.log('   - Find linked Substack publications');
  console.log('   - Extract cross-platform social links from all platforms\n');
}

testSnowballDiscovery().catch(console.error);
