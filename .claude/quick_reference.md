# Chef Indexer - Quick Reference Cheat Sheet

## Project Type
**Food Content Creator Discovery & Indexing System**
- Multi-platform scraping (Instagram, YouTube, Patreon, Substack)
- AI-powered filtering (GPT-4o-mini)
- Snowball discovery algorithm
- SQLite database with engagement metrics

---

## File Locations Cheat Sheet

### Need to modify scraping logic?
→ `src/scrapers/[platform].ts`

### Need to change database schema?
→ `src/storage/database.ts` (lines 15-80 for schema)

### Need to add/modify types?
→ `src/models/types.ts`

### Need to change configuration?
→ `src/config.ts`

### Need to modify CLI commands?
→ `src/index.ts`

### Need to change discovery algorithm?
→ `src/discovery-engine.ts`

### Need to modify AI filtering?
→ `src/utils/food-classifier.ts`

### Need to add seed profiles?
→ `src/data/seeds.ts`

### Need to add a test?
→ `tests/[category]/[name].ts`

### Need to add a utility script?
→ `scripts/[name].ts`

---

## Command Cheat Sheet

```bash
# Quick Info
npm run db:status              # Database stats

# Testing (Fast)
npm run test:instagram         # Test Instagram (~10 sec)
npm run test:youtube           # Test YouTube (~5 sec)
npm test                       # Test all platforms (~30 sec)

# Full Operations (Slow)
npm run scrape:instagram       # Full IG scrape (hours)
npm run discover:all           # Full discovery (days)

# Development
npm start                      # CLI interface
npm run build                  # Compile TypeScript
npm run dev                    # Watch mode

# Debugging
npm run debug:instagram        # Debug IG HTML structure
```

---

## Code Snippets

### Database Query
```typescript
import { DatabaseManager } from './storage/database';
const db = new DatabaseManager();
const stats = db.getStats();
console.log(`Total creators: ${stats.total_creators}`);
db.close();
```

### Scrape a Profile
```typescript
import { InstagramScraper } from './scrapers/instagram';
const scraper = new InstagramScraper(true, true, 20); // headless, metrics, 20 posts
const result = await scraper.scrapeProfileHeadless('https://instagram.com/handle');
db.upsertCreatorFromPlatformData('instagram', result);
```

### AI Classification
```typescript
import { classifyAsFoodCreator } from './utils/food-classifier';
const result = await classifyAsFoodCreator(bio, contentSamples);
if (result.isFoodCreator && result.confidence > 0.7) {
  // Proceed with scraping
}
```

---

## Database Tables Quick Reference

### creators (327 rows)
```sql
SELECT creator_id, display_name, is_food_creator, food_confidence
FROM creators
WHERE is_food_creator = 1;
```

### platform_accounts (327 rows)
```sql
SELECT platform, handle, follower_count, engagement_rate_last_n
FROM platform_accounts
WHERE platform = 'instagram'
ORDER BY follower_count DESC;
```

### content_samples (3,647 rows)
```sql
SELECT title_or_caption, views, likes, comments
FROM content_samples
WHERE platform = 'youtube'
ORDER BY views DESC
LIMIT 10;
```

---

## Import Path Patterns

```typescript
// From src/ → src/
import { X } from './storage/database';

// From tests/instagram/ → src/
import { X } from '../../src/storage/database';

// From tests/platforms/ → src/
import { X } from '../../src/storage/database';

// From scripts/ → src/
import { X } from '../src/storage/database';
```

---

## Common Gotchas

1. **Database Locked**: Only one write process at a time. Close connections with `db.close()`

2. **Instagram Blocking**: Add `INSTAGRAM_SESSIONID` to `.env` or use longer delays

3. **YouTube Quota**: 10,000 units/day = ~300 channels. Reset at midnight PT.

4. **Emoji in DB**: Automatically removed by `removeEmojis()` in helpers

5. **Import Paths**: Tests are 2 levels deep (`../../src/`), scripts are 1 level (`../src/`)

6. **Puppeteer Memory**: Call `await scraper.cleanup()` after batch operations

---

## Environment Variables

```bash
# .env file (required)
OPENAI_API_KEY=sk-...           # AI filtering
YOUTUBE_API_KEY=...             # YouTube scraping
INSTAGRAM_SESSIONID=...         # Optional, better IG access
DATABASE_PATH=./data/creators.db
REQUEST_DELAY_MS=2000
MAX_CONCURRENT_REQUESTS=3
```

---

## Project Stats (Current)

- **327** creators indexed
- **3,647** content samples
- **4** platforms (Instagram, YouTube, Patreon, Substack)
- **268** Instagram seed profiles
- **3.2 MB** database size
- **~84 sec** per Instagram profile (with metrics)
- **~$0.0001** per AI classification

---

## When to Use Which Scraper

| Platform | Scraper | Speed | API | Notes |
|----------|---------|-------|-----|-------|
| Instagram | `InstagramScraper` | 10-84s | ❌ | Headless mode for metrics |
| YouTube | `YouTubeScraper` | 5s | ✅ | Official API, fast |
| Patreon | `PatreonScraper` | 10s | ❌ | Web scraping only |
| Substack | `SubstackScraper` | 8s | ❌ | Web scraping only |

---

## Need More Info?

- **Full context**: `.claude_instructions` (root)
- **Quick context**: `.claude/project_context.md`
- **Setup guide**: `README.md`
- **Discovery details**: `DISCOVERY-ENGINE.md`
- **AI filtering**: `AI-FILTERING.md`
