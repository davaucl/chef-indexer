# Chef Indexer - Quick Context for Claude

## What This Project Does
Food content creator discovery system that scrapes Instagram, YouTube, Patreon, and Substack to build a database of food creators with engagement metrics.

## Current State
- **327 creators** indexed across 4 platforms
- **3,647 content samples** with metrics
- **Active database**: `data/creators.db` (3.2MB)
- **Production-ready** and actively scraping

## Directory Structure Quick Reference

```
src/
├── scrapers/        → Platform-specific scrapers (instagram.ts, youtube.ts, etc.)
├── storage/         → Database operations (database.ts)
├── models/          → TypeScript types (types.ts)
├── utils/           → Helpers, AI classification, headless browser
├── data/            → Seed profiles (seeds.ts)
├── index.ts         → CLI entry point
├── discovery-engine.ts → Snowball discovery algorithm
└── config.ts        → Environment configuration

tests/
├── instagram/       → Instagram-specific tests (8 files)
├── platforms/       → Other platform tests (3 files)
└── utils/           → Utility tests (1 file)

scripts/
├── check-db-status.ts        → Database inspection
├── debug-instagram.ts        → Instagram debugging
└── run-full-instagram-scrape.ts → Full scrape runner
```

## Most Common Tasks

### View Database Stats
```bash
npm run db:status
```

### Run Tests
```bash
npm test                    # All tests
npm run test:instagram      # Instagram only
npm run test:youtube        # YouTube only
```

### Run Discovery
```bash
npm run discover:all        # Full snowball discovery
npm start discover          # CLI discovery with options
```

### Debug Issues
```bash
npm run debug:instagram     # Debug Instagram scraping
```

## Key Files to Know

| File | Purpose | Lines |
|------|---------|-------|
| `src/index.ts` | CLI interface | ~150 |
| `src/discovery-engine.ts` | Snowball discovery | ~300 |
| `src/scrapers/instagram.ts` | Instagram scraper | ~400 |
| `src/storage/database.ts` | Database operations | ~300 |
| `src/config.ts` | Configuration | ~50 |

## Important Patterns

### Import Paths
```typescript
// From src/ files
import { DatabaseManager } from './storage/database';

// From tests/ files (2 levels deep)
import { DatabaseManager } from '../../src/storage/database';

// From scripts/ files
import { DatabaseManager } from '../src/storage/database';
```

### Database Operations
```typescript
const db = new DatabaseManager();
db.upsertCreatorFromPlatformData('instagram', platformAccount);
const stats = db.getStats();
db.close();
```

### Scraper Pattern
```typescript
const scraper = new InstagramScraper(useHeadless, collectMetrics, maxPosts);
const result = await scraper.scrapeProfile(url);
// Returns PlatformAccount with ContentSample[]
```

## Environment Variables
Required in `.env`:
- `OPENAI_API_KEY` - For AI filtering
- `YOUTUBE_API_KEY` - For YouTube scraping
- `INSTAGRAM_SESSIONID` - Optional, improves Instagram access

## Database Schema

**3 Main Tables:**
1. `creators` - Unique creators (cross-platform)
2. `platform_accounts` - Platform-specific profiles
3. `content_samples` - Posts/videos with metrics

**Key Relationships:**
- `platform_accounts.creator_id` → `creators.creator_id`
- `content_samples.platform_account_id` → `platform_accounts.platform_account_id`

## Architecture Highlights

### Snowball Discovery
1. Start with 268 seed Instagram profiles
2. Scrape each profile
3. Extract "similar accounts" from Instagram
4. Extract social links from bio (YouTube, TikTok, etc.)
5. Add discovered profiles to queue
6. Repeat → expect 10,000+ creators

### AI Pre-Filtering
- Before full scrape, check if account is food-related
- Uses GPT-4o-mini with bio + 3 posts
- Filters out ~40% as non-food
- Saves ~60 seconds per rejected profile
- Cost: ~$0.0001 per check

### Checkpoint/Resume
- Long jobs save progress to `data/discovery_checkpoint.json`
- Can resume after crashes
- Tracks processed profiles and queue state

## Performance Numbers
- Instagram (basic): ~10 sec/profile
- Instagram (headless): ~84 sec/profile
- YouTube (API): ~5 sec/channel
- AI classification: ~2 sec per profile

## Tech Stack Summary
- **TypeScript** 5.3+ (strict mode)
- **Node.js** 20+
- **SQLite** (better-sqlite3)
- **Puppeteer** (headless Chrome)
- **OpenAI** GPT-4o-mini
- **axios** + **cheerio** (web scraping)

## Common Issues & Solutions

### Instagram Blocked
- Add `INSTAGRAM_SESSIONID` to `.env`
- Use headless mode: `new InstagramScraper(true)`
- Add delays between requests

### YouTube Quota Exceeded
- Free tier: 10,000 units/day (~300 channels)
- Wait 24 hours or upgrade API key

### Database Locked
- Only one process can write at a time
- Close connections: `db.close()`
- Check for zombie processes

## Documentation Files
- `README.md` - Main setup guide
- `DISCOVERY-ENGINE.md` - Discovery algorithm details
- `AI-FILTERING.md` - AI pre-filtering explanation
- `OVERNIGHT-SCRAPE.md` - Long-running job guide
- `START-DISCOVERY.md` - Quick start guide

## Next Steps / TODOs
- [ ] Implement TikTok scraper
- [ ] Add AI enrichment (content categorization)
- [ ] Build API/web interface
- [ ] Add more export formats (CSV, PostgreSQL)
- [ ] Set up CI/CD pipeline
- [ ] Add Docker containerization

---

**For full details, see `.claude_instructions` in project root.**
