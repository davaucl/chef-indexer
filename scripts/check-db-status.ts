import { DatabaseManager } from '../src/storage/database';

async function checkStatus() {
  const db = new DatabaseManager();

  console.log('📊 Current Database Status\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const stats = db.getStats();

  console.log(`Total Creators: ${stats.total_creators}`);
  console.log(`\nAccounts by Platform:`);
  (stats.accounts_by_platform as any[]).forEach((p: any) => {
    console.log(`  ${p.platform}: ${p.count}`);
  });
  console.log(`\nTotal Content Samples: ${stats.total_content_samples}`);

  // Get Instagram accounts
  const accounts = (db as any).db
    .prepare('SELECT handle, profile_url FROM platform_accounts WHERE platform = ? LIMIT 10')
    .all('instagram');

  if (accounts.length > 0) {
    console.log('\n📸 Sample Instagram Accounts:');
    accounts.forEach((acc: any) => {
      console.log(`  @${acc.handle}`);
    });
  }

  db.close();
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

checkStatus().catch(console.error);
