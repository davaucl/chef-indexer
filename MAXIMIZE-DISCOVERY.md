# Maximizing Food Content Creator Discovery

This guide outlines all strategies to ensure you discover **ALL** food content creators across platforms.

---

## 🎯 Discovery Strategy Overview

Current coverage estimate: **~10,000 creators** with existing seeds + snowball
Potential with all strategies: **50,000-100,000+ creators**

---

## 1. Expand Seed Profiles (Highest Impact) ⭐⭐⭐⭐⭐

### Current Seeds:
- Instagram: 268 seeds ✅ (good)
- YouTube: 10 seeds ⚠️ (too few!)
- Patreon: 15 seeds ⚠️ (too few!)
- Substack: 11 seeds ⚠️ (too few!)

### Action: Automated Seed Expansion

**Run the seed expansion tool:**
```bash
npm run seeds:expand
```

This will:
- Search YouTube for 15 food keywords, finding ~300 channels
- Search Google for Patreon food creators, finding ~100-200 creators
- Search Google for Substack food publications, finding ~100-300 publications
- Generate a file: `data/expanded-seeds.ts` with all discovered seeds

**Then manually add quality seeds:**
- Review the generated seeds
- Add high-quality creators to `src/data/seeds.ts`
- Target: 500+ seeds per platform

### Manual Seed Sources:

**YouTube:**
- Browse YouTube's food category: https://www.youtube.com/feed/trending?bp=4gIcGhpGRXhwbG9yZQ%3D%3D
- Food & Drink charts: https://www.youtube.com/channel/UC-bCbN7rMg6Z3lMRASXR3cA
- Search for: "cooking channel", "recipe videos", "food vlog"

**Patreon:**
- Browse Patreon food category: https://www.patreon.com/discover/food
- Search: cooking, baking, recipe, chef, culinary

**Substack:**
- Food category: https://substack.com/discover/food
- Top food newsletters lists
- Food blogger directories

**Instagram:**
- Follow food hashtags (see strategy #3)
- Explore food category
- Manual curation from influencer lists

---

## 2. Multi-Round Snowball Discovery ⭐⭐⭐⭐

### Current: 1-2 snowball rounds
### Optimal: 3-5 rounds minimum

**How it works:**
```
Round 1: 300 seeds → 3,000 discovered
Round 2: 3,000 → 30,000 discovered
Round 3: 30,000 → 300,000 discovered (with AI filtering)
```

**Configuration:**

Update `src/discovery-engine.ts` or run with higher depth:
- Current default: 1-2 rounds
- Recommendation: 3-5 rounds for comprehensive coverage
- Consider: 10+ rounds for near-complete coverage

**Trade-off:**
- More rounds = more creators discovered
- More rounds = longer runtime (weeks vs days)
- AI filtering keeps only food creators (~40% pass rate)

---

## 3. Hashtag Discovery (Instagram & TikTok) ⭐⭐⭐⭐⭐

### Not Yet Implemented - High Potential!

Instagram has **massive** food creator discovery potential through hashtags:

**Top Food Hashtags:**
```
#food           - 400M+ posts
#foodie         - 150M+ posts
#cooking        - 100M+ posts
#recipe         - 80M+ posts
#foodblogger    - 60M+ posts
#homecooking    - 30M+ posts
#baking         - 50M+ posts
#chef           - 40M+ posts
#foodphotography- 30M+ posts
#foodstagram    - 70M+ posts
```

**Implementation needed:**
1. Add Instagram hashtag scraper
2. Scrape top posts from each hashtag
3. Extract creator profiles from posts
4. Add to discovery queue

**Estimated impact:** +50,000 Instagram creators

---

## 4. Enable Google Search by Default ⭐⭐⭐⭐

Currently, Google search is available but **disabled by default** in the scrapers.

**Enable it in discovery engine:**

Update `src/discovery-engine.ts` to call scrapers with `useGoogle: true`:

```typescript
// Patreon: Enable Google search
const patreonResults = await patreonScraper.discoverAndScrape(
  ['recipe', 'cooking', 'food'],
  true,  // ← Enable Google search
  2,
  Infinity
);
```

**Impact:** +500-1000 creators per platform

---

## 5. Implement TikTok Scraper ⭐⭐⭐⭐⭐

TikTok is **massive** for food content and currently **not implemented**.

**Why it matters:**
- TikTok has 1B+ users
- Food content is extremely popular
- Many food creators are TikTok-first
- 10,000-50,000+ potential food creators

**What's needed:**
1. Create `src/scrapers/tiktok.ts`
2. Implement web scraping (TikTok has no public API)
3. Add TikTok to discovery engine
4. Add TikTok seeds

**Status:** Framework ready (discovery engine already handles TikTok in cross-platform extraction)

---

## 6. Lower AI Filtering Threshold ⭐⭐⭐

**Current:** 70% confidence threshold
**Alternative:** 50-60% confidence threshold

**Trade-off:**
- Lower threshold = More creators discovered
- Lower threshold = More false positives (non-food creators)
- Recommendation: Test with 60% and review quality

**Where to change:**
File: `src/utils/food-classifier.ts`

```typescript
// Current
if (result.confidence >= 0.7) { ... }

// More permissive
if (result.confidence >= 0.6) { ... }
```

**Impact:** +20-30% more creators discovered

---

## 7. Cross-Reference External Lists ⭐⭐⭐

**Food creator directories and awards:**
- Top food bloggers lists
- James Beard Award winners
- Food & Wine best food accounts
- Saveur 100 list
- Serious Eats contributors
- Bon Appétit test kitchen members

**How to use:**
1. Manually compile lists
2. Add to seeds
3. Run discovery to find their networks

**Estimated impact:** +1,000 high-quality seeds

---

## 8. Platform-Specific Search APIs ⭐⭐⭐⭐

### YouTube: Already Using API ✅
- Search API for keywords
- Featured channels API (newly added)

### Instagram: No Official API ⚠️
- Use web scraping only
- Consider unofficial APIs (risky)

### Patreon: No API ⚠️
- Google search workaround (implemented)
- Web scraping (implemented)

### Substack: No API ⚠️
- Google search workaround (implemented)
- Web scraping (implemented)

### TikTok: No Public API ❌
- Would need web scraping implementation

---

## 9. Geographic Expansion ⭐⭐⭐

**Currently:** English-language creators only (implied by seeds)

**Expand to:**
- Spanish (LATAM food creators)
- French (French cuisine creators)
- Italian (Italian food creators)
- Japanese (Authentic Japanese cooking)
- Korean (K-food creators)
- Indian (Indian cooking creators)
- Chinese (Chinese food creators)

**How:**
1. Add multi-language seeds
2. Add multi-language food keywords to AI classifier
3. Search with regional keywords
4. Consider separate databases or filters by language/region

**Impact:** +20,000-50,000 international creators

---

## 10. Continuous Discovery Runs ⭐⭐⭐

**Strategy:** Run discovery periodically, not just once

**Why:**
- New creators emerge daily
- Creators change platforms
- Networks evolve over time

**Recommendation:**
- Run discovery monthly
- Add new seeds from trending lists
- Re-run on existing creators to find new links

---

## 11. Multiple Keyword Strategies ⭐⭐⭐⭐

**Current keywords:** Generic ("recipe", "cooking", "food")

**Expand to niche keywords:**
```
Cuisine Types:
- "italian cooking", "french cuisine", "japanese food"
- "mexican recipes", "indian cooking", "thai food"

Diet Types:
- "vegan recipes", "keto cooking", "paleo food"
- "gluten free", "vegetarian", "whole30"

Content Types:
- "meal prep", "quick recipes", "one pot meals"
- "baking tutorials", "dessert recipes", "breakfast ideas"

Skill Levels:
- "beginner cooking", "advanced techniques", "chef skills"
- "easy recipes", "professional cooking"

Format Types:
- "recipe video", "cooking show", "food vlog"
- "cooking tutorial", "recipe blog", "food photography"
```

**Implementation:**
Update keyword lists in scrapers and run multiple discovery rounds with different keyword sets.

**Impact:** +5,000-10,000 niche creators

---

## 12. Engagement-Based Discovery ⭐⭐⭐

**Strategy:** Prioritize high-engagement creators

Currently, discovery is breadth-first (priority queue by distance from seed).

**Alternative approach:**
- Score creators by follower count + engagement rate
- Prioritize scraping high-value creators first
- Discover their networks (likely also high-quality)

**Benefit:** Better quality creators discovered faster

---

## 13. Collaborative Filtering ⭐⭐

**Concept:** "Users who follow X also follow Y"

**Implementation:**
- Track which creators appear together in "similar accounts"
- Build co-occurrence matrix
- Discover creators that frequently appear with known food creators

**Complexity:** Medium-high (requires matrix analysis)
**Impact:** +2,000-5,000 creators

---

## 14. Brand Partnership Discovery ⭐⭐

**Strategy:** Follow brand mentions

Many food creators partner with food brands. Find creators by:
- Scraping brand social accounts (followers/tagged posts)
- Common brands: HelloFresh, Blue Apron, KitchenAid, etc.
- Food company ambassadors

**Impact:** +1,000-3,000 professional creators

---

## 15. Reddit & Forum Mining ⭐⭐⭐

**Sources:**
- r/Cooking (6M+ members)
- r/recipes (2M+ members)
- r/FoodPorn (4M+ members)
- r/Baking (1M+ members)

**Strategy:**
- Scrape popular post authors
- Extract social links from user profiles
- Find creators promoting content on Reddit

**Implementation needed:** Reddit scraper

**Impact:** +1,000-2,000 creators

---

## Prioritized Action Plan

### Phase 1: Quick Wins (1-2 days)
1. ✅ **Run seed expansion tool** → `npm run seeds:expand`
2. ✅ **Add expanded seeds** to seeds.ts
3. ✅ **Enable Google search** in discovery engine
4. ✅ **Lower AI threshold** to 60% (test)
5. ✅ **Increase snowball depth** to 3-5 rounds

**Expected outcome:** 20,000-30,000 creators

---

### Phase 2: Medium Effort (1-2 weeks)
1. ⚠️ **Implement hashtag discovery** (Instagram)
2. ⚠️ **Add multi-language keywords** (Spanish, French, Italian)
3. ⚠️ **Implement TikTok scraper**
4. ⚠️ **Add niche keyword searches** (vegan, keto, baking, etc.)
5. ⚠️ **Cross-reference external lists** (manually)

**Expected outcome:** 50,000-70,000 creators

---

### Phase 3: Complete Coverage (1+ months)
1. ⚠️ **Reddit/forum mining**
2. ⚠️ **Brand partnership discovery**
3. ⚠️ **Collaborative filtering**
4. ⚠️ **Geographic expansion** (Asia, LATAM, Europe)
5. ⚠️ **Monthly continuous runs**

**Expected outcome:** 100,000+ creators (near-complete coverage)

---

## Measuring Success

### Coverage Metrics:

**Platform Distribution Target:**
```
Instagram:  40,000-50,000 creators (40-50%)
YouTube:    20,000-30,000 creators (20-30%)
TikTok:     20,000-30,000 creators (20-30%)
Patreon:    3,000-5,000 creators (3-5%)
Substack:   2,000-3,000 creators (2-3%)
```

**Quality Metrics:**
- Average follower count > 10,000
- Engagement rate > 2%
- Content samples > 15 per creator
- 80%+ verified as food-related (AI confidence > 0.7)

**Coverage Indicators:**
- Discovery rate slowing down (fewer new creators per round)
- High overlap with external top creator lists
- Comprehensive niche coverage (vegan, keto, regional, etc.)

---

## Current vs. Potential

| Strategy | Current | Potential | Effort | Priority |
|----------|---------|-----------|--------|----------|
| Seeds | 304 | 1,000+ | Low | ⭐⭐⭐⭐⭐ |
| Snowball depth | 1-2 | 5+ | Low | ⭐⭐⭐⭐ |
| Google search | Off | On | Low | ⭐⭐⭐⭐ |
| Hashtags | None | 50K+ | Medium | ⭐⭐⭐⭐⭐ |
| TikTok | None | 30K+ | High | ⭐⭐⭐⭐⭐ |
| Multi-language | English | 10 langs | Medium | ⭐⭐⭐ |
| Niche keywords | 5 | 50+ | Low | ⭐⭐⭐⭐ |
| AI threshold | 70% | 60% | Low | ⭐⭐⭐ |

---

## Next Steps

1. **Immediate** (today):
   ```bash
   npm run seeds:expand
   # Review data/expanded-seeds.ts
   # Add seeds to src/data/seeds.ts
   npm run discover:all
   ```

2. **This week**:
   - Enable Google search by default
   - Lower AI threshold to 60%
   - Increase snowball to 3 rounds
   - Add 50+ niche keywords

3. **This month**:
   - Implement hashtag discovery
   - Implement TikTok scraper
   - Add multi-language support
   - Cross-reference external lists

---

**With all strategies implemented, you can realistically index 80-90% of all active food content creators globally.**
