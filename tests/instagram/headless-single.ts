import { HeadlessBrowser } from '../../src/utils/headless';

async function test() {
  console.log('🧪 Testing headless browser on a single Instagram profile\n');

  const browser = new HeadlessBrowser();

  try {
    await browser.initialize();

    const testUrl = 'https://www.instagram.com/platedbylily/';
    console.log(`📸 Extracting data from: ${testUrl}\n`);

    const data = await browser.extractInstagramProfile(testUrl);

    console.log('✅ Extracted Data:');
    console.log('==================\n');
    console.log(`Handle: @${data.handle}`);
    console.log(`Display Name: ${data.displayName}`);
    console.log(`Bio: ${data.bio || '(none)'}`);
    console.log(`Followers: ${data.followerCount?.toLocaleString() || 'unknown'}`);
    console.log(`Following: ${data.followingCount?.toLocaleString() || 'unknown'}`);
    console.log(`Posts: ${data.postCount?.toLocaleString() || 'unknown'}`);
    console.log(`\nPost URLs found: ${data.posts.length}`);

    if (data.posts.length > 0) {
      console.log('\nFirst 3 posts:');
      data.posts.slice(0, 3).forEach((post: any, i: number) => {
        console.log(`  ${i + 1}. ${post.url}`);
        if (post.altText) {
          console.log(`     Caption: ${post.altText}`);
        }
      });
    }

    console.log(`\nSimilar accounts found: ${data.similarAccounts.length}`);
    if (data.similarAccounts.length > 0) {
      console.log('First 5 similar accounts:');
      data.similarAccounts.slice(0, 5).forEach((account: string) => {
        console.log(`  - @${account}`);
      });
    }

    await browser.close();

    console.log('\n✅ Test complete!');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await browser.close();
  }
}

test().catch(console.error);
