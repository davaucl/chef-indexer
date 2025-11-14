# Chef Indexer

A food content creator discovery system that scrapes and indexes creators across multiple platforms.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Add your API keys to `.env`:
```
OPENAI_API_KEY=sk-your-key-here
YOUTUBE_API_KEY=your-youtube-api-key-here
INSTAGRAM_SESSIONID=your-instagram-sessionid-here
```

**Getting API Keys:**
- **YouTube**: Get from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
  - Enable YouTube Data API v3
  - Create credentials → API key
- **OpenAI**: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
- **Instagram** (optional but recommended for better data):
  1. Open Instagram in your browser while logged in
  2. Open Developer Tools (F12 or right-click → Inspect)
  3. Go to Application/Storage tab → Cookies → https://instagram.com
  4. Find the `sessionid` cookie and copy its value
  5. Paste into `.env` as `INSTAGRAM_SESSIONID=...`

  **Note**: With authentication, you'll get:
  - Better access to "Similar accounts" for snowball discovery
  - More complete profile data (bios, links, posts)
  - Reduced chance of being blocked

## Usage

### Testing

**Quick tests** (stop at 5 creators):
```bash
npm test               # Test Substack
npm run test:substack  # Test Substack
npm run test:patreon   # Test Patreon
npm run test:youtube   # Test YouTube (requires API key)
npm run test:instagram # Test Instagram
```

**Test with custom limit**:
```bash
npm run discover -- --limit=10 --platform=substack
npm run discover -- --limit=10 --platform=patreon
```

### Full Discovery

**Discover creators** (starts full scraping, will run for hours):
```bash
npm run discover
```

**View stats**:
```bash
npm start stats
```

**Enrich with AI** (classify and tag creators):
```bash
npm run enrich
```

**Export data to JSON**:
```bash
npm run export
```

## Data Storage

All data is stored in `./data/creators.db` (SQLite database).

You can query it directly with any SQLite client:
```bash
sqlite3 ./data/creators.db "SELECT * FROM creators LIMIT 10"
```

## Platforms Supported

- ✅ **Substack** - Full scraping with content samples
- ✅ **Patreon** - Full scraping with patron counts & pricing
- ✅ **YouTube** - Official API with video stats & subscriber counts
- ✅ **Instagram** - Web scraping with follower counts, posts & social links
- 🔜 **TikTok** - Planned

### Platform-Specific Discovery

```bash
npm run discover -- --platform=substack --limit=20    # Substack only
npm run discover -- --platform=patreon --limit=20     # Patreon only
npm run discover -- --platform=youtube --limit=20     # YouTube only
npm run discover -- --platform=all --limit=20         # All platforms (default)
```

### Adding Seed URLs

Edit `src/data/seeds.ts` to add known creator URLs for faster discovery.

## Cloud Deployment

Want to run scraping 24/7 without using your computer? Deploy to the cloud!

**Quick Start**:
1. Read [CLOUD-DEPLOYMENT-SUMMARY.md](CLOUD-DEPLOYMENT-SUMMARY.md) for overview
2. Follow [DEPLOYMENT.md](DEPLOYMENT.md) for step-by-step guide
3. Check [DATABASE-ACCESS.md](DATABASE-ACCESS.md) to access your data

**Features**:
- ✅ One-click deployment to Render
- ✅ Enhanced logging with progress & ETA
- ✅ Auto-export to JSON after scraping
- ✅ Easy database download
- ✅ Costs $7/month for 24/7 scraping

```bash
# Quick deploy to Render
git push
# Then connect repo on Render dashboard

# Check progress remotely
./scripts/view-remote-stats.sh [SERVICE_ID]

# Download your data
render exec [SERVICE_ID] 'cat /opt/render/project/data/export.json' > export.json
```
