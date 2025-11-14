# 🌙 Overnight Instagram Scrape Guide

## Quick Start

### Option 1: Continue from where you left off (Recommended)
Skips the 5 profiles already in the database:
```bash
npm run scrape:instagram
```

### Option 2: Fresh start (backup + clear database)
Creates backup and starts from scratch:
```bash
npm run scrape:instagram:fresh
```

### Option 3: Force re-scrape everything
Re-scrape all 268 profiles including existing ones:
```bash
npm run scrape:instagram -- --force-rescrape
```

## What You'll Get

For each of the 268 Instagram profiles:
- ✅ Profile info (bio, followers, following, post count)
- ✅ **20 post URLs** with captions (emojis removed)
- ✅ **Complete engagement metrics** (likes + comments) for all 20 posts
- ✅ Post timestamps
- ✅ **Similar accounts** for snowball discovery
- ✅ Social links from bio (YouTube, TikTok, etc.)

## Timing

- **Time per profile**: ~84 seconds (1.4 minutes)
- **Total time for 268 profiles**: ~6,268 seconds = **104 minutes (1.7 hours)**
- **Already scraped**: 5 profiles
- **Remaining**: 263 profiles = **~97 minutes (1.6 hours)**

## Monitoring Progress

### Check database status anytime:
```bash
npm run db:status
```

### The script shows progress every 10 profiles:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Progress: 50/268 (18.7%)
   ✅ Success: 48 | ❌ Errors: 2
   ⏱️  Estimated time remaining: 70 minutes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Features

### Automatic Skipping
- Won't re-scrape profiles already in database (unless you use `--force-rescrape`)
- Continues where it left off if interrupted

### Backup Option
Use `--backup` to create a timestamped backup before scraping:
```bash
npm run scrape:instagram -- --backup
```

### Clear Database
Use `--clear` to wipe the database before starting:
```bash
npm run scrape:instagram -- --clear
```

## What Data Gets Stored

### Creators Table
- Display name, language, country
- Food creator classification

### Platform Accounts Table
- Handle, bio, follower/following counts
- **Raw engagement metrics** (avg likes, comments per post)
- Social links

### Content Samples Table
- Post URLs (deduplicated, no `?img_index` params)
- Captions (emoji-free)
- **Raw metrics**: likes, comments, views, shares
- Published timestamps

**Note**: Only RAW metrics are stored. No calculated fields like "engagement rate".

## After Scraping

### Export data to JSON:
```bash
npm run export
```

### Run content classification (requires OpenAI API key):
```bash
# Set OPENAI_API_KEY in .env first
npm run classify
```

## Troubleshooting

### If it crashes or stops:
Just run it again - it will skip already-scraped profiles:
```bash
npm run scrape:instagram
```

### To see what's in the database:
```bash
npm run db:status
```

### Database location:
```
./data/creators.db
```

### Backups are saved as:
```
./data/creators_backup_YYYY-MM-DD.db
```

## Example Output

```
[125/268] Scraping @platedbylily...
      → Fetching metrics for 12 posts...
         Fetched 5/12 posts
         Fetched 10/12 posts
   ✅ @platedbylily
      Followers: 21,100
      Posts with metrics: 12/12
      Similar accounts: 8
```

## Running Overnight

### macOS - Keep laptop awake:
```bash
caffeinate -i npm run scrape:instagram
```

### Or just run normally and let it complete:
```bash
npm run scrape:instagram
```

The script will run for ~1.6 hours and complete all 268 profiles with full engagement data.
