# 🌐 Discovery Engine - Complete Food Creator Indexing

## What This Does

This is a **snowball discovery engine** that will:

1. **Start** with 268 Instagram seed profiles
2. **Scrape** each profile with full engagement data (20 posts each)
3. **Discover** similar accounts from each profile (snowball effect)
4. **Extract** social links (YouTube, TikTok, Patreon, Substack) from bios
5. **Queue** all discovered profiles across platforms
6. **Continue** until no new creators are found
7. **Index** tens of thousands of food creators

## 🚀 Start the Discovery Engine

```bash
npm run discover:all
```

**That's it!** Let it run overnight (or longer). It will:
- Process all 268 seeds
- Discover thousands more through snowballing
- Save checkpoints every 50 profiles (can resume if interrupted)
- Store complete data for every profile

## 📊 What Gets Discovered

### Instagram (Implemented)
For each Instagram profile:
- ✅ Profile info (bio, followers, following)
- ✅ **20 posts** with captions (no emojis)
- ✅ **Complete engagement** (likes + comments per post)
- ✅ Post timestamps
- ✅ **Similar accounts** → added to discovery queue
- ✅ **Social links** → YouTube/TikTok/etc. added to queue

### Cross-Platform Discovery
From bio links, discovers:
- 🎥 YouTube channels
- 🎵 TikTok accounts
- 💰 Patreon pages
- 📝 Substack newsletters

*(Currently queued but not yet scraped - Instagram only for now)*

## 🔄 Snowball Effect

```
268 seeds → ~5 similar accounts each → ~1,340 profiles
  ↓
1,340 profiles → ~3 similar accounts each → ~4,020 profiles
  ↓
4,020 profiles → ~2 similar accounts each → ~8,040 profiles
  ↓
... continues until no new profiles found
```

**Expected result**: 10,000+ Instagram food creators discovered

## ⏱️ Timing

- **Per profile**: ~84 seconds (1.4 minutes) with full metrics
- **Initial 268 seeds**: ~6.3 hours
- **Full discovery**: Could take **days** depending on network size
- **Automatic checkpoints**: Resume anytime if interrupted

## 📈 Monitoring Progress

The engine shows progress every 10 profiles:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 DISCOVERY ENGINE STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏱️  Runtime: 127.3 minutes
📈 Processing Rate: 1.2 profiles/min

🔍 Discovery Stats:
   Total Discovered: 1,845
   Total Processed: 150
   Queue Remaining: 1,695

📊 By Platform:
   instagram: 150

💾 Database:
   Creators: 150
   Total Accounts: 150
   Content Samples: 2,847
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Check database anytime:
```bash
npm run db:status
```

## 🔁 Resume if Interrupted

The engine saves checkpoints every 50 profiles. If it crashes or you stop it:

```bash
npm run discover:all
```

It will automatically:
- ✅ Load the checkpoint
- ✅ Skip already-processed profiles
- ✅ Continue from where it left off

Checkpoint saved at: `./data/discovery_checkpoint.json`

## 💾 Data Storage

All discovered profiles are stored in: `./data/creators.db`

### Database Schema:

**creators** - Unique creators across platforms
- Display name, language, country
- Food creator classification

**platform_accounts** - Each creator's platform presence
- Platform, handle, bio, followers
- Raw engagement metrics
- Social links to other platforms

**content_samples** - Posts/videos/articles
- URLs (deduplicated)
- Captions (emoji-free)
- Raw metrics: likes, comments, views
- Timestamps

## 🛑 How to Stop

Just `Ctrl+C`. It will save progress and you can resume later.

## 🔧 Technical Details

### Snowball Logic:
1. Fetch Instagram profile
2. Extract "similar accounts" section (up to 20 accounts)
3. Add each to discovery queue with priority = current priority + 1
4. Seeds have priority 0, their discoveries have priority 1, etc.
5. Process queue by priority (breadth-first discovery)

### Cross-Platform Logic:
1. Parse bio text for URLs
2. Extract handles from YouTube, TikTok, Patreon, Substack links
3. Add to queue with priority 1 (cross-platform = high priority)

### Deduplication:
- Tracks `platform:handle` combinations
- Checks database before queuing
- Won't process same profile twice

### Rate Limiting:
- 2-second delay between requests (from config)
- Headless browser properly closes between profiles
- Respects Instagram's rate limits

## 📊 Expected Results

After full discovery completes:
- **Instagram**: 10,000+ food creator profiles
- **YouTube**: 1,000+ channels (when implemented)
- **TikTok**: 500+ accounts (when implemented)
- **Other platforms**: 100s more

Each with complete engagement data and content samples.

## 🚨 If Something Goes Wrong

### Out of memory?
The headless browser uses ~200MB per profile. Should be fine on modern machines.

### Instagram rate limits?
The scraper includes 2s delays. If you hit limits, wait 1 hour and restart.

### Database locked?
Close any other connections to the SQLite database.

### Checkpoint corrupted?
Delete `./data/discovery_checkpoint.json` and restart (will re-process from seeds).

## 🎯 Next Steps After Discovery

Once discovery completes:

### 1. Export data:
```bash
npm run export
```

### 2. Analyze engagement:
Create custom queries against `./data/creators.db`

### 3. Content classification:
```bash
# Requires OpenAI API key in .env
npm run classify
```

### 4. Find top creators:
```sql
SELECT
  handle,
  follower_count,
  avg_likes_last_n,
  (avg_likes_last_n * 100.0 / follower_count) as engagement_rate
FROM platform_accounts
WHERE platform = 'instagram'
ORDER BY engagement_rate DESC
LIMIT 100;
```

## 💡 Pro Tips

### Run overnight with caffeinate (macOS):
```bash
caffeinate -i npm run discover:all
```

### Monitor in real-time:
```bash
# Terminal 1: Run discovery
npm run discover:all

# Terminal 2: Watch database grow
watch -n 30 'npm run db:status'
```

### Backup before starting:
```bash
cp ./data/creators.db ./data/creators_backup.db
```

---

## 🏁 Ready to Start?

Just run:
```bash
npm run discover:all
```

And let the discovery engine find all the food creators! 🍕🍰🥗
