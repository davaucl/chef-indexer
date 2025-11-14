import { HeadlessBrowser } from '../../src/utils/headless';

async function test() {
  console.log('🧪 Testing platedbylily with POST METRICS\n');

  const browser = new HeadlessBrowser();

  try {
    await browser.initialize();

    const testUrl = 'https://www.instagram.com/platedbylily/';
    console.log(`📸 Extracting data from: ${testUrl}`);
    console.log(`⏱️  This will take longer (~60-80 seconds) to fetch engagement metrics\n`);

    // Enable post metrics fetching
    const data = await browser.extractInstagramProfile(testUrl, true);

    console.log('\n✅ Extracted Data with Engagement Metrics:');
    console.log('==========================================\n');
    console.log(`Handle: @${data.handle}`);
    console.log(`Display Name: ${data.displayName}`);
    console.log(`Bio: ${data.bio || '(none)'}`);
    console.log(`Followers: ${data.followerCount?.toLocaleString() || 'unknown'}`);
    console.log(`\nPost URLs found: ${data.posts.length}`);

    // Show posts with engagement data
    if (data.posts.length > 0) {
      console.log('\n📊 Posts with Engagement Data:');
      console.log('================================\n');

      data.posts.slice(0, 5).forEach((post: any, i: number) => {
        console.log(`${i + 1}. ${post.url}`);
        console.log(`   Likes: ${(post.likes || 0).toLocaleString()}`);
        console.log(`   Comments: ${(post.comments || 0).toLocaleString()}`);
        if (post.altText) {
          console.log(`   Caption: ${post.altText.substring(0, 80)}...`);
        }
        console.log('');
      });

      // Find the cappelletti post
      const cappellettiPost = data.posts.find((p: any) =>
        p.url.includes('CsOPw_HSAmV')
      );

      if (cappellettiPost) {
        console.log('\n🍝 Cappelletti Post (the one you mentioned):');
        console.log('===========================================');
        console.log(`URL: ${cappellettiPost.url}`);
        console.log(`Likes: ${(cappellettiPost.likes || 0).toLocaleString()}`);
        console.log(`Comments: ${(cappellettiPost.comments || 0).toLocaleString()}`);
        console.log(`Caption: ${cappellettiPost.altText || '(none)'}`);
        console.log(`\n✅ This post is now captured with engagement metrics!`);
      }
    }

    await browser.close();

    console.log('\n✅ Test complete!');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await browser.close();
  }
}

test().catch(console.error);
