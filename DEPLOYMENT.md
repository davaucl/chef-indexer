# Deployment Guide: Chef Indexer on Render

This guide will help you deploy Chef Indexer to Render (or similar cloud platforms) so you can run the scraper without using your local computer resources.

## Why Deploy to the Cloud?

- **Offload resources**: Let the cloud handle CPU, memory, and bandwidth
- **Run 24/7**: Keep scraping even when your computer is off
- **Persistent storage**: Database persists between deployments
- **Scalable**: Easily upgrade resources as needed

## Prerequisites

Before deploying, you'll need:
1. A [Render account](https://render.com) (free tier available)
2. Your API keys ready:
   - OpenAI API key
   - YouTube API key (optional)
   - Instagram session ID (optional but recommended)
3. Git repository (GitHub, GitLab, or Bitbucket)

## Option 1: Deploy to Render (Recommended)

### Step 1: Push Your Code to Git

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit"

# Add your remote repository
git remote add origin <your-repo-url>
git push -u origin main
```

### Step 2: Create a New Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New +** → **Background Worker**
3. Connect your Git repository
4. Render will auto-detect the `render.yaml` configuration

### Step 3: Configure Environment Variables

In the Render dashboard, add these environment variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `OPENAI_API_KEY` | `sk-your-key-here` | Required for AI classification |
| `YOUTUBE_API_KEY` | Your YouTube API key | Optional, for YouTube scraping |
| `INSTAGRAM_SESSIONID` | Your Instagram session ID | Optional, improves Instagram data |
| `NODE_ENV` | `production` | Auto-configured |
| `DATABASE_PATH` | `/opt/render/project/data/creators.db` | Auto-configured |

**Important**: Keep your API keys secure. Never commit them to Git.

### Step 4: Configure Persistent Disk

Render will automatically create a 1GB persistent disk at `/opt/render/project/data` to store your SQLite database. This ensures your data persists between deployments.

### Step 5: Deploy!

Click **Create Background Worker**. Render will:
1. Install dependencies
2. Build TypeScript
3. Install Chromium for Puppeteer
4. Start the scraper

Monitor logs in real-time from the dashboard.

## Option 2: Deploy with Docker (Any Platform)

You can deploy to any platform that supports Docker (Railway, Fly.io, AWS ECS, etc.).

### Build and Test Locally

```bash
# Build the image
docker build -t chef-indexer .

# Run with environment variables
docker run -d \
  -e OPENAI_API_KEY=sk-your-key \
  -e YOUTUBE_API_KEY=your-key \
  -e INSTAGRAM_SESSIONID=your-session \
  -v $(pwd)/data:/app/data \
  --name chef-indexer \
  chef-indexer
```

### Deploy to Railway

1. Install Railway CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. Initialize: `railway init`
4. Add environment variables: `railway variables`
5. Deploy: `railway up`

### Deploy to Fly.io

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. Launch: `fly launch`
4. Set secrets:
   ```bash
   fly secrets set OPENAI_API_KEY=sk-your-key
   fly secrets set YOUTUBE_API_KEY=your-key
   fly secrets set INSTAGRAM_SESSIONID=your-session
   ```
5. Deploy: `fly deploy`

## Cost Considerations

### Render Pricing
- **Free Tier**: Available but limited (services sleep after 15 min inactivity)
- **Starter Plan**: $7/month - Recommended for continuous scraping
  - 512 MB RAM
  - 0.5 CPU
  - No sleep
  - Persistent disk included

### Expected Resource Usage
- **Memory**: 300-500 MB (Puppeteer/Chromium)
- **CPU**: Light (mostly waiting for network)
- **Disk**: Starts small, grows with data (1GB plenty for thousands of creators)
- **Bandwidth**: Moderate (downloading web pages, images)

**Recommendation**: Start with the free tier to test, then upgrade to Starter ($7/month) for 24/7 scraping.

## Configuration Options

### Running Different Commands

Edit the `startCommand` in [render.yaml](render.yaml) to change what runs:

```yaml
# Full discovery (default)
startCommand: npm run discover

# Discover specific platform
startCommand: npm run discover -- --platform=instagram --limit=100

# Run enrichment only
startCommand: npm run enrich

# Run discovery engine (snowball discovery)
startCommand: npm run discover:all
```

### Adjusting Rate Limits

Cloud providers have different IP addresses, so you might adjust rate limits:

```yaml
envVars:
  - key: REQUEST_DELAY_MS
    value: 1500  # Faster than local (2000ms)
  - key: MAX_CONCURRENT_REQUESTS
    value: 5     # More concurrent than local (3)
```

**Warning**: Too aggressive = risk of rate limiting/blocking

## Monitoring Your Deployment

### View Logs in Real-Time

**Render Dashboard** (Easiest):
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click on your service
3. Go to "Logs" tab
4. Watch real-time updates with:
   - Progress percentage and ETA
   - Processing rate (profiles/min)
   - Creators discovered and saved
   - Platform breakdown
   - Database size

The enhanced logging will show you exactly what's happening:
```
📊 DISCOVERY ENGINE STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏱️  Runtime: 45.2 minutes (0.8 hours)
📈 Processing Rate: 2.3 profiles/min
⏳ Estimated Time Remaining: 2h 15m

🔍 Discovery Progress:
   Total Discovered: 423
   Total Processed: 105 (24.8%)
   Queue Remaining: 318
```

**Using CLI**:
```bash
# On Render
render logs [SERVICE_ID] --tail

# On Railway
railway logs

# On Fly.io
fly logs
```

### Check Database Stats Remotely

Without downloading the entire database:

```bash
# Install Render CLI first
brew tap render-oss/render
brew install render
render login

# Check stats remotely
./scripts/view-remote-stats.sh [SERVICE_ID]
```

This shows you:
- Total creators indexed
- Breakdown by platform (Instagram, YouTube, etc.)
- Content samples collected
- Database size

### Download Your Database

**See [DATABASE-ACCESS.md](DATABASE-ACCESS.md) for complete guide.**

Quick options:

1. **Download JSON export** (easiest, auto-generated after scraping):
   ```bash
   render exec [SERVICE_ID] 'cat /opt/render/project/data/export.json' > export.json
   ```

2. **Download full SQLite database**:
   ```bash
   # List services
   render services list

   # Download database
   render exec [SERVICE_ID] 'cat /opt/render/project/data/creators.db' > creators.db

   # Or use helper script
   ./scripts/download-database.sh
   ```

3. **Access via SSH**:
   ```bash
   render ssh [SERVICE_ID]
   # Then explore: ls -lh /opt/render/project/data/
   ```

## Troubleshooting

### Puppeteer/Chromium Issues

If Puppeteer fails to launch:
1. Check logs for missing dependencies
2. Ensure `Dockerfile` includes all Chrome dependencies
3. Try adding more memory to your plan

### Database Locked Errors

If you see "database is locked":
- Don't run multiple instances writing to the same DB
- Ensure proper disk mount path in render.yaml

### Rate Limiting

If you're getting blocked:
1. Increase `REQUEST_DELAY_MS`
2. Decrease `MAX_CONCURRENT_REQUESTS`
3. Consider using residential proxies (advanced)

### Out of Memory

If the service crashes with OOM:
1. Upgrade to a plan with more RAM
2. Reduce concurrent requests
3. Disable post metrics fetching (memory intensive)

## Stopping/Pausing the Scraper

### On Render
- **Pause**: Click "Suspend" in the dashboard (free)
- **Stop**: Delete the service

### On Docker
```bash
# Stop container
docker stop chef-indexer

# Start again
docker start chef-indexer
```

## Security Best Practices

1. **Never commit API keys**: Use environment variables
2. **Use .gitignore**: Ensure `.env` and `data/` are ignored
3. **Rotate credentials**: Change Instagram session periodically
4. **Monitor costs**: Set up billing alerts
5. **Review logs**: Check for errors or suspicious activity

## Next Steps

After deployment:
1. Monitor logs to ensure scraping is working
2. Let it run for a few hours to collect initial data
3. Download the database periodically for backups
4. Run enrichment to classify creators with AI
5. Export data to JSON for analysis

## Alternative Platforms

### Cloud VPS (DigitalOcean, Linode, AWS EC2)
**Pros**: Full control, cheaper at scale
**Cons**: More setup, manual management

### Serverless (AWS Lambda, Google Cloud Functions)
**Pros**: Pay per execution
**Cons**: Puppeteer is tricky, cold starts, time limits

### Kubernetes (GKE, EKS, AKS)
**Pros**: Enterprise-grade, highly scalable
**Cons**: Overkill for this use case, expensive

**For this project, Render or Railway are the sweet spot**: Easy deployment, Puppeteer support, affordable pricing.

## Support

- **Render docs**: https://render.com/docs
- **Railway docs**: https://docs.railway.app
- **Fly.io docs**: https://fly.io/docs
- **Puppeteer troubleshooting**: https://pptr.dev/troubleshooting

Happy scraping! 🚀
