# Claude Instructions for chef-indexer

## Core Philosophy

**"Less code that works > lots of code with fallbacks"**

Always prefer:
- Simple, working solutions over complex fallback systems
- Fixing root causes over adding workarounds
- Clean failures over silent degradation
- One clear path forward over multiple approaches

## Development Guidelines

### 0. Think Before Writing
- **Check if what you're about to write makes sense**
- Don't mention things that don't exist (e.g., "don't use X" when X is already deleted)
- Only document what IS, not what ISN'T
- If it doesn't add value, don't write it

### 1. Keep It Clean
- **Don't create multiple ways to do the same thing**
- Delete old code when replacing it with new approach
- Clean up after refactoring - don't leave both old and new systems in place
- One entry point, one clear execution path

### 2. Fix Problems Directly
- **Fix the root cause, don't add more fallbacks**
- When something fails, let it fail cleanly so we can investigate
- Don't add HTML fallbacks, retry logic, or silent degradation
- If we need to retry later, just skip and mark for later - don't implement complex fallback chains

### 3. Code Changes
- When switching approaches **delete the old code**
- Don't leave both implementations coexisting
- Update all entry points (Dockerfile, package.json, etc.) when changing main files
- Verify builds work after making changes

### 4. Examples of This Philosophy

**BAD:**
```typescript
// Try headless, if fails try HTML scraping, if fails try API, if fails...
// Multiple fallback layers that hide real problems
```

**GOOD:**
```typescript
// Try headless, if fails: log error, skip profile, investigate why it failed
// Clean failure = we can fix the real problem
```

## Project-Specific Rules

### Entry Point
- `discovery-engine.ts` - queue-based discovery with cross-platform linking

### Deployment
- **Render:** Background worker with persistent disk, trigger manually via shell: `npm run discover:prod`
- **Chromium:** Installed via Dockerfile, not env vars
- **Checkpoint:** Saves every 50 profiles for crash recovery

### AI Classification
- Enabled for YouTube, Patreon, Substack
- Threshold: 0.4 confidence
- Feeds 10 post/video titles for context
- Fallback to keyword detection if OpenAI fails

### Discovery Strategy
- Snowball depths: Instagram 4, YouTube 3, Patreon 3
- Extract cross-platform social links and add to queue
- Priority-based processing: seeds (0) → first-degree (1) → second-degree (2)
