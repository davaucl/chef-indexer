import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScraperResult, ContentSampleInput } from '../models/types';
import { delay, extractUrls, cleanHandle, cleanPostUrl, removeEmojis } from '../utils/helpers';
import { config } from '../config';
import { SEED_INSTAGRAM } from '../data/seeds';
import { HeadlessBrowser } from '../utils/headless';
import { isFoodRelated } from '../utils/food-detection';

export class InstagramScraper {
  private headless: HeadlessBrowser | null = null;
  private useHeadless: boolean = false;
  private fetchPostMetrics: boolean = false;
  private maxPostsForMetrics: number = 20;

  constructor(useHeadless: boolean = false, fetchPostMetrics: boolean = false, maxPostsForMetrics: number = 20) {
    this.useHeadless = useHeadless;
    this.fetchPostMetrics = fetchPostMetrics && useHeadless; // Only works with headless mode
    this.maxPostsForMetrics = maxPostsForMetrics;
    if (useHeadless) {
      this.headless = new HeadlessBrowser();
    }
  }
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Upgrade-Insecure-Requests': '1',
    };

    // Add authentication if sessionid is available
    if (config.instagramSessionId) {
      headers['Cookie'] = `sessionid=${config.instagramSessionId}`;
      headers['X-IG-App-ID'] = '936619743392459'; // Instagram web app ID
    }

    return headers;
  }

  private async fetchWithRetry(url: string, retries = 3): Promise<string> {
    for (let i = 0; i < retries; i++) {
      try {
        await delay(config.requestDelayMs);
        const response = await axios.get(url, {
          headers: this.getHeaders(),
          timeout: 15000,
        });
        return response.data;
      } catch (error: any) {
        if (i === retries - 1) throw error;
        await delay(config.requestDelayMs * 2);
      }
    }
    throw new Error('Max retries reached');
  }

  async searchGoogleForInstagram(keyword: string, limit = 50): Promise<string[]> {
    const profileUrls = new Set<string>();

    try {
      console.log(`  🔍 Searching via Google for: "${keyword} site:instagram.com"`);

      const searchQuery = encodeURIComponent(`${keyword} food site:instagram.com`);
      const googleUrl = `https://www.google.com/search?q=${searchQuery}&num=100`;

      const html = await this.fetchWithRetry(googleUrl);
      const $ = cheerio.load(html);

      $('a').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          const urlMatch = href.match(/https?:\/\/(?:www\.)?instagram\.com\/([^\/\?]+)/);
          if (urlMatch && urlMatch[1]) {
            const username = urlMatch[1];
            if (
              !username.match(
                /^(p|reel|reels|tv|explore|accounts|stories|direct|accounts|about|legal|help|press|api|developer|terms|privacy)$/i
              )
            ) {
              profileUrls.add(`https://www.instagram.com/${username}/`);
            }
          }
        }
      });

      const discoveredUrls = Array.from(profileUrls);

      if (discoveredUrls.length === 0) {
        console.log(`    ⚠️  No results found for "${keyword}"`);
      } else {
        console.log(`    ✓ Found ${discoveredUrls.length} profiles for "${keyword}"`);
      }

      return discoveredUrls.slice(0, limit);
    } catch (error: any) {
      console.error(`    ✗ Error searching for "${keyword}":`, error.message);
      return [];
    }
  }

  async scrapeProfile(profileUrl: string): Promise<ScraperResult | null> {
    // Use headless browser if enabled
    if (this.useHeadless && this.headless) {
      return this.scrapeProfileHeadless(profileUrl);
    }

    try {
      const html = await this.fetchWithRetry(profileUrl);
      const $ = cheerio.load(html);

      const handle = profileUrl.match(/instagram\.com\/([^\/\?]+)/)?.[1] || 'unknown';

      const scriptTags = $('script[type="application/ld+json"]');
      let jsonData: any = null;

      scriptTags.each((_, el) => {
        try {
          const content = $(el).html();
          if (content) {
            const parsed = JSON.parse(content);
            if (parsed['@type'] === 'ProfilePage') {
              jsonData = parsed;
            }
          }
        } catch {
          // Ignore JSON parse errors
        }
      });

      let displayName = handle;
      let bio: string | undefined;
      let followerCount: number | undefined;
      let followingCount: number | undefined;
      let totalPosts: number | undefined;

      if (jsonData && jsonData.mainEntity) {
        const entity = jsonData.mainEntity;
        displayName = entity.name || handle;
        bio = entity.description;

        if (entity.interactionStatistic) {
          entity.interactionStatistic.forEach((stat: any) => {
            if (stat['@type'] === 'InteractionCounter') {
              if (stat.interactionType?.includes('FollowAction')) {
                followerCount = parseInt(stat.userInteractionCount);
              }
            }
          });
        }
      }

      const metaDescription = $('meta[name="description"]').attr('content');
      if (metaDescription) {
        const followerMatch = metaDescription.match(/(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:K|M)?\s*Followers?/i);
        if (followerMatch && !followerCount) {
          let count = parseFloat(followerMatch[1].replace(/,/g, ''));
          if (metaDescription.includes('K')) count *= 1000;
          if (metaDescription.includes('M')) count *= 1000000;
          followerCount = Math.round(count);
        }

        const postMatch = metaDescription.match(/(\d+(?:,\d+)*)\s*Posts?/i);
        if (postMatch) {
          totalPosts = parseInt(postMatch[1].replace(/,/g, ''));
        }

        const followingMatch = metaDescription.match(/(\d+(?:,\d+)*)\s*Following/i);
        if (followingMatch) {
          followingCount = parseInt(followingMatch[1].replace(/,/g, ''));
        }

        if (!bio) {
          const bioMatch = metaDescription.match(/- (.+)$/);
          if (bioMatch) {
            bio = bioMatch[1];
          }
        }
      }

      const socialLinks = new Set<string>();
      if (bio) {
        const urls = extractUrls(bio);
        urls.forEach((url) => {
          if (
            url.includes('youtube.com') ||
            url.includes('tiktok.com') ||
            url.includes('patreon.com') ||
            url.includes('substack.com') ||
            url.includes('twitter.com') ||
            url.includes('x.com')
          ) {
            socialLinks.add(url);
          }
        });
      }

      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (
          href &&
          (href.includes('youtube.com') ||
            href.includes('tiktok.com') ||
            href.includes('patreon.com') ||
            href.includes('linkt.ree'))
        ) {
          socialLinks.add(href);
        }
      });

      // Extract similar accounts for snowball discovery
      const similarAccounts = new Set<string>();

      // Look for "Similar accounts" section
      $('[aria-label*="Similar"], [aria-label*="similar"]').each((_, el) => {
        const text = $(el).text();
        // Try to find usernames in the similar accounts section
        const usernamePattern = /@([a-zA-Z0-9_.]+)/g;
        let match;
        while ((match = usernamePattern.exec(text)) !== null) {
          similarAccounts.add(match[1]);
        }
      });

      // Extract from page text any @mentions
      const pageText = $.text();
      const mentionPattern = /@([a-zA-Z0-9_.]+)/g;
      let mentionMatch;
      while ((mentionMatch = mentionPattern.exec(pageText)) !== null && similarAccounts.size < 20) {
        const username = mentionMatch[1];
        if (username !== handle && username.length >= 3) {
          similarAccounts.add(username);
        }
      }

      // Look for links to other profiles in the page
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          // Match various Instagram URL patterns
          const patterns = [
            /^\/([a-zA-Z0-9_.]+)\/?$/,
            /instagram\.com\/([a-zA-Z0-9_.]+)\/?$/,
            /^https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)\/?$/,
          ];

          for (const pattern of patterns) {
            const match = href.match(pattern);
            if (match && match[1]) {
              const username = match[1];
              // Filter out known Instagram system paths
              if (
                !username.match(
                  /^(p|reel|reels|tv|explore|accounts|stories|direct|about|legal|help|press|api|developer|terms|privacy|tagged|locations|hashtag)$/i
                ) &&
                username !== handle &&
                username.length >= 3
              ) {
                similarAccounts.add(username);
              }
              break;
            }
          }
        }
      });

      const contentSamples: ContentSampleInput[] = [];

      const postUrlPattern = /instagram\.com\/p\/([A-Za-z0-9_-]+)/g;
      const postUrls = new Set<string>();

      let match;
      while ((match = postUrlPattern.exec(pageText)) !== null && postUrls.size < 20) {
        postUrls.add(`https://www.instagram.com/p/${match[1]}/`);
      }

      Array.from(postUrls).forEach((url) => {
        contentSamples.push({
          url: url,
        });
      });

      return {
        handle: cleanHandle(handle),
        display_name: displayName,
        profile_url: profileUrl,
        bio_text: bio,
        follower_count: followerCount,
        following_count: followingCount,
        total_content_count: totalPosts,
        social_links: Array.from(socialLinks),
        content_samples: contentSamples,
        similar_accounts: Array.from(similarAccounts).slice(0, 10), // Limit to 10 similar accounts
      };
    } catch (error: any) {
      console.error(`    ✗ Error scraping ${profileUrl}:`, error.message);
      return null;
    }
  }

  async scrapeProfileHeadless(profileUrl: string): Promise<ScraperResult | null> {
    try {
      await delay(config.requestDelayMs);

      if (!this.headless) {
        throw new Error('Headless browser not initialized');
      }

      // Initialize browser if needed
      await this.headless.initialize();

      // Extract profile data using headless browser
      const data = await this.headless.extractInstagramProfile(profileUrl, this.fetchPostMetrics, this.maxPostsForMetrics);

      const handle = data.handle;
      const displayName = data.displayName || handle;
      const bio = data.bio || undefined;
      const followerCount = data.followerCount || undefined;
      const followingCount = data.followingCount || undefined;
      const totalPosts = data.postCount || undefined;

      // Extract social links from bio
      const socialLinks = new Set<string>();
      if (bio) {
        const urls = extractUrls(bio);
        urls.forEach((url) => {
          if (
            url.includes('youtube.com') ||
            url.includes('tiktok.com') ||
            url.includes('patreon.com') ||
            url.includes('substack.com') ||
            url.includes('twitter.com') ||
            url.includes('x.com')
          ) {
            socialLinks.add(url);
          }
        });
      }

      // Process posts for content samples (up to 20)
      const contentSamples: ContentSampleInput[] = [];
      for (const post of data.posts.slice(0, 20)) {
        contentSamples.push({
          url: cleanPostUrl(post.url), // Remove query parameters from carousel URLs
          title_or_caption: post.altText ? removeEmojis(post.altText) : undefined, // Remove emojis
          likes: post.likes || undefined,
          comments: post.comments || undefined,
          published_at: post.timestamp || undefined,
        });
      }

      // Similar accounts from headless extraction
      const similarAccounts = data.similarAccounts || [];

      return {
        handle: cleanHandle(handle),
        display_name: displayName,
        profile_url: profileUrl,
        bio_text: bio,
        follower_count: followerCount,
        following_count: followingCount,
        total_content_count: totalPosts,
        social_links: Array.from(socialLinks),
        content_samples: contentSamples,
        similar_accounts: similarAccounts.slice(0, 10),
      };
    } catch (error: any) {
      console.error(`    ✗ Error scraping ${profileUrl} (headless):`, error.message);
      return null;
    }
  }

  getKnownFoodInstagram(): string[] {
    return SEED_INSTAGRAM.map((handle) => `https://www.instagram.com/${handle}/`);
  }

  async discoverAndScrape(
    keywords: string[],
    useGoogle = true,
    maxResults = Infinity,
    snowballRounds = 4
  ): Promise<ScraperResult[]> {
    const allProfileUrls = new Set<string>();
    const scrapedUrls = new Set<string>();
    const results: ScraperResult[] = [];

    console.log(`\n📸 Starting Instagram discovery...`);
    if (maxResults !== Infinity) {
      console.log(`🎯 Target: ${maxResults} food creators`);
    }
    console.log(`🔄 Snowball rounds: ${snowballRounds}`);
    if (config.instagramSessionId) {
      console.log(`🔐 Authenticated mode: ON (using session cookie)`);
    } else {
      console.log(`🔓 Authenticated mode: OFF (public access only - limited data)`);
    }
    if (this.useHeadless) {
      console.log(`🌐 Headless browser: ENABLED (rich data extraction)`);
      if (this.fetchPostMetrics) {
        console.log(`📊 Post metrics: ENABLED (likes, comments per post - slower)`);
      } else {
        console.log(`📊 Post metrics: DISABLED (faster but no engagement data)`);
      }
    } else {
      console.log(`📄 Headless browser: DISABLED (HTML scraping only)`);
    }
    console.log();

    const knownUrls = this.getKnownFoodInstagram();
    if (knownUrls.length > 0) {
      console.log('🌱 Adding known food Instagram accounts...');
      knownUrls.forEach((url) => allProfileUrls.add(url));
      console.log(`  ✓ Added ${knownUrls.length} known accounts\n`);
    }

    if (useGoogle) {
      console.log(`🔎 Searching via Google for ${keywords.length} keywords...\n`);
      for (const keyword of keywords) {
        if (results.length >= maxResults) break;

        const urls = await this.searchGoogleForInstagram(keyword, 30);
        urls.forEach((url) => allProfileUrls.add(url));

        if (results.length >= maxResults) break;
      }
    }

    if (allProfileUrls.size === 0) {
      console.log('⚠️  No seed URLs available. Add seeds to src/data/seeds.ts or enable Google search\n');
      return [];
    }

    // Snowball discovery: scrape profiles and add similar accounts
    for (let round = 0; round < snowballRounds; round++) {
      const currentUrls = Array.from(allProfileUrls).filter((url) => !scrapedUrls.has(url));

      if (currentUrls.length === 0) {
        console.log(`\n🔄 Round ${round + 1}: No new profiles to scrape\n`);
        break;
      }

      console.log(`\n🔄 Round ${round + 1}: Scraping ${currentUrls.length} profiles...`);
      console.log(`📥 Total discovered so far: ${allProfileUrls.size} profiles\n`);

      let processed = 0;
      for (const url of currentUrls) {
        if (results.length >= maxResults) {
          console.log(`\n🎯 Reached target of ${maxResults} creators! Stopping.\n`);
          break;
        }

        processed++;
        scrapedUrls.add(url);

        console.log(`[${processed}/${currentUrls.length}] Scraping: ${url}`);

        const result = await this.scrapeProfile(url);
        if (result) {
          // Add similar accounts to discovery queue
          if ((result as any).similar_accounts && (result as any).similar_accounts.length > 0) {
            const similarCount = (result as any).similar_accounts.length;
            (result as any).similar_accounts.forEach((username: string) => {
              const similarUrl = `https://www.instagram.com/${username}/`;
              if (!scrapedUrls.has(similarUrl)) {
                allProfileUrls.add(similarUrl);
              }
            });
            console.log(`    → Found ${similarCount} similar accounts`);
          }

          const isFood = isFoodRelated(result);
          if (isFood) {
            results.push(result);

            const details = [];
            if (result.follower_count) {
              const followers = result.follower_count;
              if (followers >= 1000000) {
                details.push(`${(followers / 1000000).toFixed(1)}M followers`);
              } else if (followers >= 1000) {
                details.push(`${(followers / 1000).toFixed(1)}K followers`);
              } else {
                details.push(`${followers} followers`);
              }
            }
            if (result.total_content_count) details.push(`${result.total_content_count} posts`);
            if (result.content_samples?.length) details.push(`${result.content_samples.length} samples`);
            if (result.social_links?.length) details.push(`${result.social_links.length} socials`);

            const detailsStr = details.length > 0 ? ` | ${details.join(', ')}` : '';
            console.log(
              `  ✓ ${result.display_name}${detailsStr} [FOOD] (${results.length}/${maxResults === Infinity ? '∞' : maxResults})`
            );
          } else {
            console.log(`  ⊘ ${result.display_name} (not food-related)`);
          }
        }

        if (processed % 10 === 0) {
          console.log(
            `\n  Progress: ${processed}/${currentUrls.length} (${Math.round((processed / currentUrls.length) * 100)}%)`
          );
          console.log(`  Total food accounts found: ${results.length}/${maxResults === Infinity ? '∞' : maxResults}`);
          console.log(`  Discovered profiles in queue: ${allProfileUrls.size - scrapedUrls.size}\n`);
        }

        if (results.length >= maxResults) break;
      }

      if (results.length >= maxResults) break;
    }

    console.log(`\n✅ Completed! Successfully scraped ${results.length} food-related accounts`);
    console.log(`📊 Total profiles discovered: ${allProfileUrls.size}`);
    console.log(`📊 Total profiles scraped: ${scrapedUrls.size}`);

    // Cleanup headless browser if used
    if (this.useHeadless && this.headless) {
      await this.headless.close();
    }

    return results;
  }

  async cleanup(): Promise<void> {
    if (this.headless) {
      await this.headless.close();
    }
  }
}
