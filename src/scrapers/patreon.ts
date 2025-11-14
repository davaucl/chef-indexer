import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScraperResult, ContentSampleInput } from '../models/types';
import { delay, extractUrls, cleanHandle } from '../utils/helpers';
import { config } from '../config';
import { SEED_PATREON } from '../data/seeds';

export class PatreonScraper {
  private async fetchWithRetry(url: string, retries = 3): Promise<string> {
    for (let i = 0; i < retries; i++) {
      try {
        await delay(config.requestDelayMs);
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          },
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

  async searchGoogleForPatreon(keyword: string, limit = 100): Promise<string[]> {
    const creatorUrls = new Set<string>();

    try {
      console.log(`  🔍 Searching via Google for: "${keyword} site:patreon.com"`);

      const searchQuery = encodeURIComponent(`${keyword} site:patreon.com/user`);
      const googleUrl = `https://www.google.com/search?q=${searchQuery}&num=100`;

      const html = await this.fetchWithRetry(googleUrl);
      const $ = cheerio.load(html);

      $('a').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          const urlMatch = href.match(/https?:\/\/(?:www\.)?patreon\.com\/([^\/\?]+)/);
          if (urlMatch && urlMatch[1]) {
            const username = urlMatch[1];
            if (!username.match(/^(posts?|login|join|about|policy|terms|help|search|explore)$/i)) {
              creatorUrls.add(`https://www.patreon.com/${username}`);
            }
          }
        }
      });

      const discoveredUrls = Array.from(creatorUrls);

      if (discoveredUrls.length === 0) {
        console.log(`    ⚠️  No results found for "${keyword}"`);
      } else {
        console.log(`    ✓ Found ${discoveredUrls.length} creators for "${keyword}"`);
      }

      return discoveredUrls.slice(0, limit);
    } catch (error: any) {
      console.error(`    ✗ Error searching for "${keyword}":`, error.message);
      return [];
    }
  }

  getKnownFoodPatreon(): string[] {
    return SEED_PATREON;
  }

  async scrapeCreator(creatorUrl: string): Promise<ScraperResult | null> {
    try {
      const html = await this.fetchWithRetry(creatorUrl);
      const $ = cheerio.load(html);

      const handle = creatorUrl.match(/patreon\.com\/([^\/\?]+)/)?.[1] || 'unknown';

      const displayName =
        $('meta[property="og:title"]').attr('content')?.replace(/is creating.*$/i, '').trim() ||
        $('meta[name="twitter:title"]').attr('content') ||
        $('h1').first().text().trim() ||
        handle;

      const bio =
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        $('[data-tag="about-text"]').text().trim() ||
        undefined;

      const bodyText = $.text();

      let patronCount: number | undefined;
      const patronPatterns = [
        /(\d+(?:,\d+)*)\s*patrons?/i,
        /(\d+(?:,\d+)*)\s*members?/i,
        /(\d+(?:,\d+)*)\s*supporters?/i,
      ];

      for (const pattern of patronPatterns) {
        const match = bodyText.match(pattern);
        if (match) {
          patronCount = parseInt(match[1].replace(/,/g, ''));
          break;
        }
      }

      const socialLinks = new Set<string>();
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          if (
            href.includes('twitter.com') ||
            href.includes('x.com') ||
            href.includes('instagram.com') ||
            href.includes('youtube.com') ||
            href.includes('tiktok.com') ||
            href.includes('facebook.com') ||
            href.includes('substack.com')
          ) {
            socialLinks.add(href);
          }
        }
      });

      const tiers: { name: string; price: number }[] = [];
      const tierPricePattern = /\$(\d+(?:\.\d+)?)\s*(?:\/|per)\s*month/gi;
      let match;
      while ((match = tierPricePattern.exec(bodyText)) !== null) {
        const price = parseFloat(match[1]);
        if (price > 0 && price < 1000) {
          tiers.push({ name: `Tier $${price}`, price });
        }
      }

      const uniqueTiers = Array.from(new Map(tiers.map((t) => [t.price, t])).values());
      const lowestPrice = uniqueTiers.length > 0 ? Math.min(...uniqueTiers.map((t) => t.price)) : undefined;

      let totalPosts: number | undefined;
      const postCountMatch = bodyText.match(/(\d+)\s*posts?/i);
      if (postCountMatch) {
        totalPosts = parseInt(postCountMatch[1]);
      }

      const contentSamples: ContentSampleInput[] = [];

      $('[data-tag="post-card"], .post, article').slice(0, 15).each((_, el) => {
        const $post = $(el);
        const postLink = $post.find('a[href*="/posts/"]').first();
        let postUrl = postLink.attr('href');

        if (postUrl) {
          if (!postUrl.startsWith('http')) {
            postUrl = `https://www.patreon.com${postUrl}`;
          }

          const title =
            postLink.text().trim() ||
            $post.find('h1, h2, h3, .title').first().text().trim() ||
            undefined;

          const dateEl = $post.find('time, .date').first();
          const dateStr = dateEl.attr('datetime') || dateEl.text().trim() || undefined;

          contentSamples.push({
            url: postUrl,
            title_or_caption: title,
            published_at: dateStr,
          });
        }
      });

      if (contentSamples.length < 5) {
        try {
          const postsUrl = `${creatorUrl}/posts`;
          const postsHtml = await this.fetchWithRetry(postsUrl);
          const $posts = cheerio.load(postsHtml);

          $posts('a[href*="/posts/"]').slice(0, 15).each((_, el) => {
            const $link = $posts(el);
            let postUrl = $link.attr('href');

            if (postUrl && !contentSamples.find((c) => c.url === postUrl)) {
              if (!postUrl.startsWith('http')) {
                postUrl = `https://www.patreon.com${postUrl}`;
              }

              const title = $link.text().trim() || undefined;

              contentSamples.push({
                url: postUrl,
                title_or_caption: title,
              });
            }
          });
        } catch {
          // Posts page scraping is optional
        }
      }

      return {
        handle: cleanHandle(handle),
        display_name: displayName,
        profile_url: creatorUrl,
        bio_text: bio,
        follower_count: patronCount,
        total_content_count: totalPosts,
        subscription_price_lowest: lowestPrice,
        subscription_currency: 'USD',
        social_links: Array.from(socialLinks),
        content_samples: contentSamples.slice(0, 15),
      };
    } catch (error: any) {
      console.error(`    ✗ Error scraping ${creatorUrl}:`, error.message);
      return null;
    }
  }

  async findRelatedCreators(creatorUrl: string): Promise<string[]> {
    const relatedUrls = new Set<string>();

    try {
      const html = await this.fetchWithRetry(creatorUrl);
      const $ = cheerio.load(html);

      $('a[href*="patreon.com/"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          const match = href.match(/patreon\.com\/([^\/\?]+)/);
          if (match && match[1]) {
            const username = match[1];
            if (!username.match(/^(posts?|login|join|about|policy|terms)$/i)) {
              relatedUrls.add(`https://www.patreon.com/${username}`);
            }
          }
        }
      });
    } catch {
      // Ignore errors finding related creators
    }

    return Array.from(relatedUrls);
  }

  async discoverAndScrape(
    keywords: string[],
    useGoogle = false,
    snowballDepth = 2,
    maxResults = Infinity
  ): Promise<ScraperResult[]> {
    const allCreatorUrls = new Set<string>();
    const scrapedUrls = new Set<string>();
    const results: ScraperResult[] = [];

    console.log(`\n🎨 Starting Patreon discovery...`);
    if (maxResults !== Infinity) {
      console.log(`🎯 Target: ${maxResults} food creators\n`);
    } else {
      console.log();
    }

    const knownUrls = this.getKnownFoodPatreon();
    if (knownUrls.length > 0) {
      console.log('🌱 Adding known food Patreon creators...');
      knownUrls.forEach((url) => allCreatorUrls.add(url));
      console.log(`  ✓ Added ${knownUrls.length} known creators\n`);
    }

    if (useGoogle) {
      console.log(`🔎 Searching via Google for ${keywords.length} keywords...\n`);
      for (const keyword of keywords) {
        const urls = await this.searchGoogleForPatreon(keyword, 50);
        urls.forEach((url) => allCreatorUrls.add(url));
      }
    }

    if (allCreatorUrls.size === 0) {
      console.log('⚠️  No seed URLs available. Enable Google search or add seeds to src/data/seeds.ts\n');
      return [];
    }

    for (let depth = 0; depth < snowballDepth; depth++) {
      if (results.length >= maxResults) {
        console.log(`\n🎯 Reached target of ${maxResults} creators! Stopping discovery.\n`);
        break;
      }

      const urlsToScrape = Array.from(allCreatorUrls).filter((url) => !scrapedUrls.has(url));

      if (urlsToScrape.length === 0) break;

      console.log(`\n🔄 Snowball round ${depth + 1}/${snowballDepth}: ${urlsToScrape.length} creators to scrape\n`);

      let processed = 0;
      for (const url of urlsToScrape) {
        if (results.length >= maxResults) {
          console.log(`\n🎯 Reached target of ${maxResults} creators! Stopping.\n`);
          break;
        }

        processed++;
        scrapedUrls.add(url);

        console.log(`[${processed}/${urlsToScrape.length}] Scraping: ${url}`);

        const result = await this.scrapeCreator(url);
        if (result) {
          const isFoodRelated = this.isFoodRelated(result);
          if (isFoodRelated) {
            results.push(result);

            const details = [];
            if (result.follower_count) details.push(`${result.follower_count.toLocaleString()} patrons`);
            if (result.content_samples?.length) details.push(`${result.content_samples.length} posts`);
            if (result.subscription_price_lowest) details.push(`$${result.subscription_price_lowest}/mo`);
            if (result.social_links?.length) details.push(`${result.social_links.length} socials`);

            const detailsStr = details.length > 0 ? ` | ${details.join(', ')}` : '';
            console.log(`  ✓ ${result.display_name}${detailsStr} [FOOD] (${results.length}/${maxResults === Infinity ? '∞' : maxResults})`);

            if (depth < snowballDepth - 1 && results.length < maxResults) {
              const related = await this.findRelatedCreators(url);
              related.forEach((relatedUrl) => allCreatorUrls.add(relatedUrl));
              if (related.length > 0) {
                console.log(`    → Found ${related.length} related creators`);
              }
            }
          } else {
            console.log(`  ⊘ ${result.display_name} (not food-related)`);
          }
        }

        if (processed % 10 === 0) {
          console.log(`\n  Progress: ${processed}/${urlsToScrape.length} (${Math.round((processed / urlsToScrape.length) * 100)}%)`);
          console.log(`  Total food creators found: ${results.length}/${maxResults === Infinity ? '∞' : maxResults}\n`);
        }
      }
    }

    console.log(`\n✅ Completed! Successfully scraped ${results.length} food-related creators`);
    return results;
  }

  private isFoodRelated(result: ScraperResult): boolean {
    const foodKeywords = [
      'recipe',
      'cook',
      'bake',
      'food',
      'kitchen',
      'chef',
      'meal',
      'dish',
      'cuisine',
      'culinary',
      'ingredient',
      'dining',
      'restaurant',
      'eat',
      'gastro',
      'flavor',
      'taste',
      'dessert',
      'pastry',
      'bread',
      'cake',
    ];

    const textToCheck = `${result.display_name} ${result.bio_text || ''}`.toLowerCase();
    return foodKeywords.some((keyword) => textToCheck.includes(keyword));
  }
}
