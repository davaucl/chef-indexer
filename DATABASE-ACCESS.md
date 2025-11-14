# Database Access Guide

This guide explains how to access your SQLite database when running Chef Indexer in the cloud (Render, Railway, etc.).

## Database Location

### On Render
- **Path**: `/opt/render/project/data/creators.db`
- **Storage**: Persistent disk (survives deployments)
- **Size**: 1GB disk allocation

### On Railway/Fly.io
- **Path**: `/app/data/creators.db`
- **Storage**: Depends on volume configuration

## Viewing Progress While Scraping

### Option 1: Render Dashboard Logs

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click on your service
3. Go to "Logs" tab
4. Watch real-time progress updates:
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

   💾 Database:
      Creators: 98
      Total Accounts: 105
      Content Samples: 1,847
   ```

### Option 2: Check Remote Stats (Without Downloading DB)

**Requirements**: Install Render CLI first
```bash
brew tap render-oss/render
brew install render
render login
```

**Check Stats**:
```bash
# Get your service ID
render services list

# View database stats remotely
./scripts/view-remote-stats.sh [SERVICE_ID]
```

This runs `npm run db:status` on the remote server and shows:
- Total creators indexed
- Breakdown by platform
- Total content samples
- Recent additions

## Downloading Your Database

### Method 1: Using Render CLI (Recommended)

**Install Render CLI**:
```bash
brew tap render-oss/render
brew install render
render login
```

**Download Database**:
```bash
# List your services to get SERVICE_ID
render services list

# Download the database
render exec [SERVICE_ID] 'cat /opt/render/project/data/creators.db' > ./data/creators-download.db

# Or use our helper script
./scripts/download-database.sh
```

### Method 2: Using Render SSH

```bash
# SSH into your service
render ssh [SERVICE_ID]

# On the server, encode database to base64
cat /opt/render/project/data/creators.db | base64

# Copy the output, then on your local machine:
echo '[PASTE_BASE64_HERE]' | base64 -d > ./data/creators-download.db
```

### Method 3: Download JSON Export (Easiest)

The scraper automatically exports to JSON after completion. Download the export:

```bash
# Download the JSON export
render exec [SERVICE_ID] 'cat /opt/render/project/data/export.json' > ./data/export-download.json

# View the data locally
cat ./data/export-download.json | jq '.creators[] | {name, platforms}'
```

**Advantages**:
- Much smaller than full database
- Human-readable format
- Easy to parse and analyze
- Can be imported to spreadsheets

## Working With Downloaded Database

### Using SQLite CLI

```bash
# Open the database
sqlite3 ./data/creators-download.db

# View all creators
SELECT display_name, platform, follower_count FROM creators
JOIN platform_accounts ON creators.id = platform_accounts.creator_id
ORDER BY follower_count DESC LIMIT 20;

# Platform breakdown
SELECT platform, COUNT(*) as count
FROM platform_accounts
GROUP BY platform;

# Search for specific creators
SELECT * FROM creators WHERE display_name LIKE '%Gordon%';
```

### Using DB Browser for SQLite (GUI)

1. Download [DB Browser for SQLite](https://sqlitebrowser.org/)
2. Open your downloaded database file
3. Browse tables, run queries, export to CSV/JSON

### Using Node.js

```javascript
const Database = require('better-sqlite3');
const db = new Database('./data/creators-download.db', { readonly: true });

// Get all Instagram creators
const creators = db.prepare(`
  SELECT c.display_name, pa.handle, pa.follower_count
  FROM creators c
  JOIN platform_accounts pa ON c.id = pa.creator_id
  WHERE pa.platform = 'instagram'
  ORDER BY pa.follower_count DESC
`).all();

console.log(creators);
```

## Exporting Data

### To JSON
```bash
# Export entire database
npm run export

# The export includes:
# - All creators
# - All platform accounts
# - All content samples
# - Social links
```

### To CSV

Using SQLite:
```bash
sqlite3 ./data/creators-download.db <<EOF
.headers on
.mode csv
.output creators.csv
SELECT
  c.display_name,
  pa.platform,
  pa.handle,
  pa.follower_count,
  pa.bio_text
FROM creators c
JOIN platform_accounts pa ON c.id = pa.creator_id
ORDER BY pa.follower_count DESC;
.quit
EOF
```

### To Google Sheets

1. Export to CSV (see above)
2. Open Google Sheets
3. File → Import → Upload CSV

Or use the JSON export:
1. Download `export.json`
2. Use [JSON to Sheets](https://workspace.google.com/marketplace/app/import_json/1049386699411)

## Syncing Local and Cloud Database

### Push Local DB to Cloud (Restore)

**Warning**: This will overwrite the cloud database!

```bash
# Create base64 encoded version
cat ./data/creators.db | base64 > db.b64

# Upload and restore on server
render exec [SERVICE_ID] 'cat > /tmp/db.b64 && base64 -d /tmp/db.b64 > /opt/render/project/data/creators.db' < db.b64

# Clean up
rm db.b64
```

### Merge Multiple Databases

If you've been running scrapes both locally and in the cloud:

```bash
# Export both to JSON
sqlite3 cloud.db ".mode json" ".output cloud.json" "SELECT * FROM creators;"
sqlite3 local.db ".mode json" ".output local.json" "SELECT * FROM creators;"

# Merge using a script (manual step - write a Node.js script)
# Then import merged data back to a new database
```

## Database Backup Strategy

### Automated Backups on Render

Add a backup command to your [render.yaml](render.yaml):

```yaml
services:
  - type: cron
    name: chef-indexer-backup
    env: node
    schedule: "0 0 * * *"  # Daily at midnight
    buildCommand: npm install
    startCommand: |
      render exec chef-indexer-scraper 'cat /opt/render/project/data/creators.db' > backup-$(date +%Y%m%d).db &&
      echo "Backup complete: backup-$(date +%Y%m%d).db"
```

### Manual Backups

**Daily backups** while scraping is active:
```bash
# Create a backup script
echo '#!/bin/bash
SERVICE_ID="your-service-id-here"
DATE=$(date +%Y%m%d)
render exec $SERVICE_ID "cat /opt/render/project/data/creators.db" > backups/backup-$DATE.db
echo "Backup saved: backups/backup-$DATE.db"
' > backup-db.sh

chmod +x backup-db.sh

# Run it daily
./backup-db.sh
```

## Monitoring Database Size

```bash
# Check size on Render
render exec [SERVICE_ID] 'ls -lh /opt/render/project/data/creators.db'

# Check locally
ls -lh ./data/creators.db

# Check disk usage on Render (max 1GB by default)
render exec [SERVICE_ID] 'df -h /opt/render/project/data'
```

## Troubleshooting

### "Database is locked" Error

**Cause**: Multiple processes trying to write simultaneously

**Solution**:
- Only run one scraper instance at a time
- Use the checkpoint system if you need to restart

### "Disk space full" Error

**Cause**: Database exceeded 1GB allocation

**Solution**:
1. Download and backup current database
2. Increase disk size in [render.yaml](render.yaml):
   ```yaml
   disk:
     sizeGB: 2  # Increase to 2GB
   ```
3. Redeploy

### Can't Download Database (Too Large)

**Solution**: Use the JSON export instead
```bash
render exec [SERVICE_ID] 'npm run export && cat /opt/render/project/data/export.json' > export.json
```

### Database Corrupted

**Recovery**:
```bash
# Try to recover
sqlite3 corrupted.db ".recover" | sqlite3 recovered.db

# Or restore from backup
cp backups/backup-latest.db ./data/creators.db
```

## Best Practices

1. **Download regularly**: Don't wait until scraping is 100% done
2. **Keep backups**: Download database every 1-2 days during long scrapes
3. **Use JSON exports**: Easier to work with for analysis
4. **Monitor logs**: Watch Render logs to catch issues early
5. **Check disk space**: Keep an eye on database size vs disk allocation
6. **Test downloads**: Verify downloaded database isn't corrupted

## Quick Reference

```bash
# View logs
render logs [SERVICE_ID] --tail

# Check stats remotely
render exec [SERVICE_ID] 'npm run db:status'

# Download database
render exec [SERVICE_ID] 'cat /opt/render/project/data/creators.db' > download.db

# Download JSON export
render exec [SERVICE_ID] 'cat /opt/render/project/data/export.json' > export.json

# Check database size
render exec [SERVICE_ID] 'ls -lh /opt/render/project/data/creators.db'

# SSH into server
render ssh [SERVICE_ID]
```

## Need Help?

- **Render Docs**: https://render.com/docs/disks
- **SQLite Docs**: https://www.sqlite.org/cli.html
- **DB Browser**: https://sqlitebrowser.org/
