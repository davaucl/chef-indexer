import puppeteer, { Browser, Page } from 'puppeteer';
import { config } from '../config';
import { cleanPostUrl, removeEmojis } from './helpers';
import { existsSync } from 'fs';

// Find Chromium executable by checking common paths
function findChromiumExecutable(): string | undefined {
  const paths = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ];

  for (const path of paths) {
    if (path && existsSync(path)) {
      return path;
    }
  }

  return undefined;
}

export class HeadlessBrowser {
  private browser: Browser | null = null;
  private pages: Map<string, Page> = new Map();

  async initialize(): Promise<void> {
    if (this.browser) return;

    const executablePath = findChromiumExecutable();
    console.log('🌐 Starting headless browser...');
    if (executablePath) {
      console.log(`   Using Chromium at: ${executablePath}`);
    }

    this.browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-crash-reporter',
        '--disable-background-networking',
        '--disable-extensions',
        '--disable-software-rasterizer',
      ],
    });
    console.log('✅ Headless browser ready\n');
  }

  async getPage(id: string = 'default'): Promise<Page> {
    if (!this.browser) {
      await this.initialize();
    }

    let page = this.pages.get(id);
    if (!page) {
      page = await this.browser!.newPage();

      // Set user agent and viewport
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
      await page.setViewport({ width: 1920, height: 1080 });

      // Add cookies if Instagram session is available
      if (config.instagramSessionId) {
        await page.setCookie({
          name: 'sessionid',
          value: config.instagramSessionId,
          domain: '.instagram.com',
          path: '/',
          httpOnly: true,
          secure: true,
        });
      }

      this.pages.set(id, page);
    }

    return page;
  }

  async navigateAndWait(url: string, pageId: string = 'default', waitTime: number = 3000): Promise<Page> {
    const page = await this.getPage(pageId);

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for dynamic content to load
    await new Promise((resolve) => setTimeout(resolve, waitTime));

    return page;
  }

  async extractInstagramProfile(profileUrl: string, fetchPostMetrics: boolean = false, maxPostsForMetrics: number = 20): Promise<any> {
    const page = await this.navigateAndWait(profileUrl, 'instagram-profile', 5000);

    // Extract profile data from the rendered page
    let data;
    try {
      data = await page.evaluate(() => {
      const result: any = {
        handle: '',
        displayName: '',
        bio: '',
        followerCount: 0,
        followingCount: 0,
        postCount: 0,
        posts: [],
        similarAccounts: [],
      };

      // Extract handle from URL
      result.handle = window.location.pathname.split('/')[1];

      // Try multiple selectors for display name
      let nameElement =
        document.querySelector('header section h2') ||
        document.querySelector('header h1') ||
        document.querySelector('h2._aacl') ||
        document.querySelector('h1._aacl');

      if (nameElement) result.displayName = nameElement.textContent?.trim() || result.handle;
      else result.displayName = result.handle;

      // Get all text for extraction
      const allText = document.body.innerText;

      // Bio - try multiple extraction strategies
      // First, try various selectors
      const bioSelectors = [
        'header section span._ap3a',
        'header span._ap3a',
        'header section div span',
        'header div._ac2a span',
        'h2 + div span',
        '._aacl._aacp._aacu._aacx._aad6._aade',
      ];

      for (const selector of bioSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent && element.textContent.trim().length > 0) {
          const text = element.textContent.trim();
          // Validate it's actually a bio (not just numbers or very short text)
          if (text.length >= 3 && !text.match(/^\d+$/)) {
            result.bio = text;
            break;
          }
        }
      }

      // If still no bio, try extracting from all text
      if (!result.bio || result.bio.length === 0) {
        // Look for text patterns that look like bios
        const lines = allText.split('\n').map((l: string) => l.trim()).filter((l: string) => l);
        // Bio is usually a few lines after "following"
        const followingIndex = lines.findIndex((l: string) => l.toLowerCase() === 'following');
        if (followingIndex >= 0 && followingIndex < lines.length - 1) {
          const potentialBio = lines[followingIndex + 1];
          // Validate it's not a button or number
          if (
            potentialBio &&
            potentialBio.length >= 3 &&
            potentialBio.length < 300 &&
            !potentialBio.match(/^(Follow|Message|Contact|Posts|Followers|Following|\d+)$/i)
          ) {
            result.bio = potentialBio;
          }
        }
      }

      // Stats - look for all spans/links with numbers

      // Try to extract stats from meta description or visible text
      const postsMatch = allText.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*posts?/i);
      if (postsMatch) {
        let num = parseFloat(postsMatch[1].replace(/,/g, ''));
        if (postsMatch[1].includes('K')) num *= 1000;
        if (postsMatch[1].includes('M')) num *= 1000000;
        if (postsMatch[1].includes('B')) num *= 1000000000;
        result.postCount = Math.round(num);
      }

      const followersMatch = allText.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*followers?/i);
      if (followersMatch) {
        let num = parseFloat(followersMatch[1].replace(/,/g, ''));
        if (followersMatch[1].includes('K')) num *= 1000;
        if (followersMatch[1].includes('M')) num *= 1000000;
        if (followersMatch[1].includes('B')) num *= 1000000000;
        result.followerCount = Math.round(num);
      }

      const followingMatch = allText.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*following/i);
      if (followingMatch) {
        let num = parseFloat(followingMatch[1].replace(/,/g, ''));
        if (followingMatch[1].includes('K')) num *= 1000;
        if (followingMatch[1].includes('M')) num *= 1000000;
        if (followingMatch[1].includes('B')) num *= 1000000000;
        result.followingCount = Math.round(num);
      }

      // Extract ALL links to posts (not just from articles) - limit to 20
      const allLinks = document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]');
      const uniquePosts = new Set();

      allLinks.forEach((link) => {
        if (result.posts.length >= 20) return; // Stop after 20 posts

        const href = link.getAttribute('href');
        if (href && (href.includes('/p/') || href.includes('/reel/'))) {
          // Clean URL to remove carousel parameters before checking uniqueness
          const cleanedHref = href.replace(/\?.*$/, '');

          if (!uniquePosts.has(cleanedHref)) {
            uniquePosts.add(cleanedHref);

            const img = link.querySelector('img');
            const imgSrc = img ? img.getAttribute('src') || '' : '';
            const altText = img ? img.getAttribute('alt') || '' : '';

            result.posts.push({
              url: cleanedHref.startsWith('http') ? cleanedHref : 'https://www.instagram.com' + cleanedHref,
              thumbnail: imgSrc,
              altText: altText,
            });
          }
        }
      });

      // Look for similar accounts - try multiple approaches
      const similarSection = document.querySelector('[aria-label*="Similar"], [aria-label*="similar"]');
      if (similarSection) {
        const links = similarSection.querySelectorAll('a[href^="/"]');
        links.forEach((link: any) => {
          const href = link.getAttribute('href');
          if (href) {
            const username = href.split('/').filter((s: string) => s)[0];
            if (username && !username.match(/^(p|reel|reels|tv|explore|accounts|stories)$/)) {
              result.similarAccounts.push(username);
            }
          }
        });
      }

      // Detect logged-in user from navigation
      const navAccountsToExclude = new Set<string>();
      const navLinks = document.querySelectorAll('nav a[href^="/"]');
      navLinks.forEach((link: any) => {
        const href = link.getAttribute('href');
        if (href) {
          const parts = href.split('/').filter((s: string) => s);
          if (parts.length === 1 && parts[0] !== result.handle) {
            navAccountsToExclude.add(parts[0]);
          }
        }
      });

      // Only extract profile links from the main content area (not nav/header)
      const mainContent = document.querySelector('main') || document.body;
      const profileLinks = mainContent.querySelectorAll('a[href^="/"]');

      profileLinks.forEach((link: any) => {
        if (result.similarAccounts.length >= 20) return;

        const href = link.getAttribute('href');
        if (!href) return;

        // Skip if link is in navigation
        if (link.closest('nav') || link.closest('[role="navigation"]')) return;

        const parts = href.split('/').filter((s: string) => s);
        if (
          parts.length === 1 &&
          !parts[0].match(/^(p|reel|reels|tv|explore|accounts|stories|tagged|direct)$/) &&
          parts[0] !== result.handle &&
          !navAccountsToExclude.has(parts[0]) && // Exclude navigation accounts
          parts[0].length > 2 // Must be at least 3 characters
        ) {
          if (!result.similarAccounts.includes(parts[0])) {
            result.similarAccounts.push(parts[0]);
          }
        }
      });

      return result;
    });
    } catch (error: any) {
      console.error('Error during page evaluation:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }

    // Clean text data by removing emojis
    if (data.bio) {
      data.bio = removeEmojis(data.bio);
    }

    if (data.posts && data.posts.length > 0) {
      data.posts.forEach((post: any) => {
        if (post.altText) {
          post.altText = removeEmojis(post.altText);
        }
      });
    }

    // Optionally fetch engagement metrics for each post
    if (fetchPostMetrics && data.posts && data.posts.length > 0) {
      const postsToFetch = Math.min(data.posts.length, maxPostsForMetrics);
      console.log(`      → Fetching metrics for ${postsToFetch} posts...`);

      for (let i = 0; i < postsToFetch; i++) {
        try {
          const post = data.posts[i];
          const postData = await this.extractInstagramPost(post.url);

          // Add metrics to post
          data.posts[i].likes = postData.likes || 0;
          data.posts[i].comments = postData.comments || 0;
          data.posts[i].timestamp = postData.timestamp || '';

          // Also update caption if we got a better one (and remove emojis)
          if (postData.caption && postData.caption.length > (post.altText?.length || 0)) {
            data.posts[i].altText = removeEmojis(postData.caption);
          }

          // Show progress every 5 posts
          if ((i + 1) % 5 === 0) {
            console.log(`         Fetched ${i + 1}/${postsToFetch} posts`);
          }
        } catch (error: any) {
          console.error(`         ✗ Error fetching post ${i + 1}:`, error.message);
        }
      }
    }

    return data;
  }

  async extractInstagramPost(postUrl: string): Promise<any> {
    const page = await this.navigateAndWait(postUrl, 'instagram-post', 3000);

    const data = await page.evaluate(() => {
      const result: any = {
        caption: '',
        likes: 0,
        comments: 0,
        timestamp: '',
        tags: [],
      };

      const allText = document.body.innerText;

      // Caption - try multiple selectors
      let captionElement =
        document.querySelector('h1') ||
        document.querySelector('._a9zs h1') ||
        document.querySelector('._a9zr span') ||
        document.querySelector('[data-testid="post-caption"]');

      if (captionElement) result.caption = captionElement.textContent?.trim() || '';

      // Likes - extract from visible text
      // Get ALL matches first (includes comment likes and post likes)
      const likesMatches = allText.match(/([\d,]+(?:\.\d+)?[KM]?)\s*likes?/gi);
      if (likesMatches && likesMatches.length > 0) {
        // The LAST match is the post likes (comment likes appear first)
        const lastMatch = likesMatches[likesMatches.length - 1];
        const numMatch = lastMatch.match(/([\d,]+(?:\.\d+)?[KM]?)/);
        if (numMatch) {
          let num = parseFloat(numMatch[1].replace(/,/g, ''));
          if (numMatch[1].includes('K')) num *= 1000;
          if (numMatch[1].includes('M')) num *= 1000000;
          result.likes = Math.round(num);
        }
      }

      // Comments - extract from visible text
      const commentsMatch = allText.match(/View all ([\d,]+(?:\.\d+)?[KM]?)\s*comments?/i);
      if (commentsMatch) {
        let num = parseFloat(commentsMatch[1].replace(/,/g, ''));
        if (commentsMatch[1].includes('K')) num *= 1000;
        if (commentsMatch[1].includes('M')) num *= 1000000;
        result.comments = Math.round(num);
      } else {
        // Alternative: count visible comments
        const commentCount = document.querySelectorAll('[role="button"][tabindex="0"]').length;
        if (commentCount > 0) result.comments = commentCount;
      }

      // Timestamp
      const timeElement = document.querySelector('time');
      if (timeElement) {
        result.timestamp = timeElement.getAttribute('datetime') || '';
      }

      // Hashtags from caption
      const hashtagPattern = /#(\w+)/g;
      const caption = result.caption;
      let match;
      while ((match = hashtagPattern.exec(caption)) !== null) {
        result.tags.push(match[1]);
      }

      return result;
    });

    return data;
  }

  async closePage(id: string): Promise<void> {
    const page = this.pages.get(id);
    if (page) {
      await page.close();
      this.pages.delete(id);
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      console.log('🔚 Closing headless browser...');
      await this.browser.close();
      this.browser = null;
      this.pages.clear();
    }
  }
}
