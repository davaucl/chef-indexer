# 🤖 AI-Powered Food Creator Filtering

## The Problem

When using Instagram's "similar accounts" feature for snowball discovery, many non-food accounts get discovered:
- General lifestyle influencers
- Travel bloggers
- Fashion/beauty accounts
- Fitness accounts
- Non-related content

This wastes time and storage on accounts that aren't relevant to your food creator database.

## The Solution

**Two-stage scraping with AI pre-filtering:**

### Stage 1: Lightweight Check (~8 seconds)
- Scrape bio + 3 recent posts (no engagement metrics)
- Send to OpenAI GPT-4o-mini for classification
- Determine: Is this a food creator? (Yes/No + confidence)

### Stage 2: Full Scrape (~84 seconds) - Only if Food Creator
- Scrape all 20 posts with full engagement metrics
- Index complete data to database

## How It Works

```typescript
// 1. Light scrape (bio + 3 posts)
const lightData = await extractInstagramProfile(url, false, 3);

// 2. AI classification
const classification = await foodClassifier.isFoodCreator({
  platform: 'instagram',
  handle: 'example',
  bio: 'Chef & recipe developer...',
  recentPosts: ['Post 1 about pasta', 'Post 2 about baking', ...]
});

// 3. Decision
if (classification.isFoodCreator && confidence > 0.7) {
  // ✅ Full scrape with metrics
} else {
  // ❌ Mark as non-food and skip
}
```

## What AI Checks

The classifier analyzes:
- **Bio text**: Keywords like "chef", "recipe", "cooking", "food"
- **Recent posts**: Content about food, recipes, restaurants
- **Context**: Is food the PRIMARY focus or just occasional?

## Classification Criteria

### ✅ FOOD CREATORS (Indexed)
- Chefs, home cooks, recipe developers
- Food photographers, stylists
- Restaurant reviewers, food critics
- Culinary educators, cooking teachers
- Food bloggers, YouTubers focused on food
- Nutrition experts (if food-focused)
- Food business owners sharing recipes/content

### ❌ NOT FOOD CREATORS (Filtered Out)
- General lifestyle influencers (occasional food posts)
- Travel bloggers (showing meals but not food-focused)
- Fitness accounts (unless heavily nutrition/food focused)
- Fashion, beauty, wellness (food not primary)
- Spam, bots, inactive accounts

## Benefits

### Time Savings
- **Without filtering**: 84 seconds per non-food account wasted
- **With filtering**: 8 seconds to identify + skip non-food accounts
- **Savings**: ~90% time saved on non-food accounts

### Quality Improvement
- Only food-focused creators in your database
- Higher relevance for analysis
- Better recommendations and insights

### Example Filtering Rate
```
Total processed: 1,000 accounts
Food creators: 600 (60%)
Non-food filtered: 400 (40%)
Time saved: 400 × 76 seconds = 8.4 hours
```

## How to Enable

The AI filter is **automatically enabled** if you have an OpenAI API key set:

```bash
# In your .env file
OPENAI_API_KEY=sk-...
```

If no API key is set, the discovery engine will index ALL discovered accounts without filtering.

## Filter Behavior

### Seeds (Priority 0)
- **Never filtered** - All 268 Instagram seeds are scraped fully
- Assumes you've manually curated these as food creators

### Discovered Accounts (Priority > 0)
- **AI filtered** before full scrape
- Only food creators get full 20-post scrape
- Non-food creators marked in DB and skipped

## Monitoring Filtering

The progress display shows filtering stats:

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

🍕 Food Creator Filter:
   ✅ Food Creators: 95
   ❌ Non-Food Filtered: 55
   📊 Filter Rate: 36.7% rejected

📊 By Platform:
   instagram: 95

💾 Database:
   Creators: 422
   Total Accounts: 95 (food only)
   Content Samples: 1,847
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Database Storage

### Food Creators
- `is_food_creator = 1`
- Full data: 20 posts with engagement metrics
- Available for analysis

### Non-Food Creators
- `is_food_creator = 0`
- Minimal data: Just handle, bio, display name
- Marked so they won't be re-checked

## Confidence Threshold

The filter uses **70% confidence** threshold:
- If AI is 70%+ confident it's NOT food → filter out
- If uncertain (<70%) → scrape fully to be safe
- Avoids missing borderline food creators

## Cost Estimation

OpenAI GPT-4o-mini pricing (as of 2024):
- Input: $0.15 per 1M tokens
- Output: $0.60 per 1M tokens

Per classification:
- ~500 input tokens (bio + 3 posts)
- ~50 output tokens (JSON response)
- Cost: ~$0.0001 per classification

For 10,000 accounts:
- Estimated cost: **~$1.00**
- Time saved: **>200 hours**

Extremely cost-effective!

## Example Output

```
[42/1000] Processing instagram:foodie_lifestyle (from @platedbylily)
   🔍 Pre-checking @foodie_lifestyle (AI filter)...
      ❌ Food creator: false (confidence: 85%)
      Reason: General lifestyle influencer who occasionally posts meals. Primary content is fashion and travel, not food-focused.
      ⏭️  Skipping non-food account

[43/1000] Processing instagram:chefmaria (from @platedbylily)
   🔍 Pre-checking @chefmaria (AI filter)...
      ✅ Food creator: true (confidence: 95%)
      Reason: Professional chef sharing daily recipes and cooking techniques. All content focused on food preparation and culinary education.
   📸 Full scrape @chefmaria...
   ✅ @chefmaria
      Followers: 45,230
      Posts with metrics: 20/20
      Similar accounts: 12
```

## Alternative: Hashtag Discovery (Not Implemented Yet)

Instead of relying on "similar accounts", could search for food hashtags:
- #foodie #recipe #cooking #chef #homemade
- Extract accounts from posts with these hashtags
- More targeted but slower (Instagram API limitations)

The AI filtering approach is more flexible and works with existing snowball discovery.

## Running the Discovery Engine

```bash
# Make sure OpenAI API key is set
echo "OPENAI_API_KEY=sk-..." >> .env

# Start discovery with AI filtering
npm run discover:all
```

The engine will automatically use AI filtering for all discovered accounts (not seeds).

## Summary

🎯 **Goal**: Only index food creators
🤖 **Method**: AI pre-filtering before full scrape
⚡ **Speed**: 90% time saved on non-food accounts
💰 **Cost**: ~$0.0001 per classification
✅ **Result**: High-quality, food-only database
