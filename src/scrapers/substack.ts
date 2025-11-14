import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScraperResult, ContentSampleInput } from '../models/types';
import { delay, extractUrls, cleanHandle } from '../utils/helpers';
import { config } from '../config';
import { SEED_SUBSTACKS } from '../data/seeds';

export class SubstackScraper {
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

  async searchGoogleForSubstacks(keyword: string, limit = 100): Promise<string[]> {
    const publicationUrls = new Set<string>();

    try {
      console.log(`  🔍 Searching via Google for: "${keyword} site:substack.com"`);

      const searchQuery = encodeURIComponent(`${keyword} site:substack.com`);
      const googleUrl = `https://www.google.com/search?q=${searchQuery}&num=100`;

      const html = await this.fetchWithRetry(googleUrl);
      const $ = cheerio.load(html);

      $('a').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          const urlMatch = href.match(/https?:\/\/([^.\/]+)\.substack\.com/);
          if (urlMatch && urlMatch[1]) {
            const subdomain = urlMatch[1];
            if (!subdomain.match(/^(www|api|support|about|substack)$/)) {
              publicationUrls.add(`https://${subdomain}.substack.com`);
            }
          }
        }
      });

      const discoveredUrls = Array.from(publicationUrls);

      if (discoveredUrls.length === 0) {
        console.log(`    ⚠️  No results found for "${keyword}"`);
      } else {
        console.log(`    ✓ Found ${discoveredUrls.length} publications for "${keyword}"`);
      }

      return discoveredUrls.slice(0, limit);
    } catch (error: any) {
      console.error(`    ✗ Error searching for "${keyword}":`, error.message);
      return [];
    }
  }

  getKnownFoodSubstacks(): string[] {
    return SEED_SUBSTACKS;
  }

  async scrapePublication(publicationUrl: string): Promise<ScraperResult | null> {
    try {
      const html = await this.fetchWithRetry(publicationUrl);
      const $ = cheerio.load(html);

      const handle = publicationUrl.match(/https?:\/\/([^.]+)\.substack\.com/)?.[1] || 'unknown';

      const displayName =
        $('meta[property="og:site_name"]').attr('content') ||
        $('meta[property="og:title"]').attr('content') ||
        $('title').text().split('|')[0].trim() ||
        $('.pencraft').first().text().trim() ||
        handle;

      const bio =
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        $('.subtitle').text().trim() ||
        undefined;

      let aboutHtml: string | null = null;
      let $about: cheerio.CheerioAPI | null = null;
      try {
        aboutHtml = await this.fetchWithRetry(`${publicationUrl}/about`);
        $about = cheerio.load(aboutHtml);
      } catch {
        // About page optional
      }

      let subscriberCount: number | undefined;
      const bodyText = $.text();
      const subscriberPatterns = [
        /(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:K|k|thousand)?\s*subscribers?/i,
        /(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:K|k)?\s*readers?/i,
        /subscribers?:\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:K|k)?/i,
      ];

      for (const pattern of subscriberPatterns) {
        const match = bodyText.match(pattern);
        if (match) {
          let count = parseFloat(match[1].replace(/,/g, ''));
          if (match[0].toLowerCase().includes('k') || match[0].toLowerCase().includes('thousand')) {
            count *= 1000;
          }
          subscriberCount = Math.round(count);
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
            href.includes('patreon.com') ||
            href.includes('facebook.com')
          ) {
            socialLinks.add(href);
          }
        }
      });

      if ($about) {
        $about('a[href]').each((_, el) => {
          const href = $about!(el).attr('href');
          if (
            href &&
            (href.includes('twitter.com') ||
              href.includes('x.com') ||
              href.includes('instagram.com') ||
              href.includes('youtube.com') ||
              href.includes('tiktok.com') ||
              href.includes('patreon.com'))
          ) {
            socialLinks.add(href);
          }
        });
      }

      let subscriptionPrice: number | undefined;
      let subscriptionCurrency = 'USD';

      const pricePatterns = [
        /\$(\d+(?:\.\d+)?)\s*(?:\/|per)\s*month/i,
        /\$(\d+(?:\.\d+)?)\s*monthly/i,
        /subscribe.*?\$(\d+(?:\.\d+)?)/i,
      ];

      for (const pattern of pricePatterns) {
        const match = bodyText.match(pattern);
        if (match) {
          subscriptionPrice = parseFloat(match[1]);
          break;
        }
      }

      const contentSamples: ContentSampleInput[] = [];

      $('.post-preview, .post, article').slice(0, 15).each((_, el) => {
        const $post = $(el);
        const postLink = $post.find('a[href*="/p/"]').first();
        let postUrl = postLink.attr('href');

        if (postUrl) {
          if (!postUrl.startsWith('http')) {
            postUrl = publicationUrl + postUrl;
          }

          const title =
            postLink.text().trim() ||
            $post.find('h1, h2, h3, .post-title').first().text().trim() ||
            undefined;

          const dateEl = $post.find('time, .date, .post-date').first();
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
          const archiveHtml = await this.fetchWithRetry(`${publicationUrl}/archive`);
          const $archive = cheerio.load(archiveHtml);

          $archive('a[href*="/p/"]').slice(0, 15).each((_, el) => {
            const $link = $archive(el);
            let postUrl = $link.attr('href');

            if (postUrl && !contentSamples.find((c) => c.url === postUrl)) {
              if (!postUrl.startsWith('http')) {
                postUrl = publicationUrl + postUrl;
              }

              const title = $link.text().trim() || undefined;
              const $parent = $link.parent();
              const dateStr = $parent.find('time').attr('datetime') || undefined;

              contentSamples.push({
                url: postUrl,
                title_or_caption: title,
                published_at: dateStr,
              });
            }
          });
        } catch {
          // Archive scraping is optional
        }
      }

      let totalPosts: number | undefined;
      const postCountMatch = bodyText.match(/(\d+)\s*posts?/i);
      if (postCountMatch) {
        totalPosts = parseInt(postCountMatch[1]);
      }

      return {
        handle: cleanHandle(handle),
        display_name: displayName,
        profile_url: publicationUrl,
        bio_text: bio,
        follower_count: subscriberCount,
        total_content_count: totalPosts,
        subscription_price_lowest: subscriptionPrice,
        subscription_currency: subscriptionCurrency,
        social_links: Array.from(socialLinks),
        content_samples: contentSamples.slice(0, 15),
      };
    } catch (error: any) {
      console.error(`    ✗ Error scraping ${publicationUrl}:`, error.message);
      return null;
    }
  }

  async findRelatedPublications(publicationUrl: string): Promise<string[]> {
    const relatedUrls = new Set<string>();

    try {
      const html = await this.fetchWithRetry(publicationUrl);
      const $ = cheerio.load(html);

      $('a[href*=".substack.com"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          const match = href.match(/https?:\/\/([^.\/]+)\.substack\.com/);
          if (match && match[1]) {
            const subdomain = match[1];
            if (!subdomain.match(/^(www|api|support|about|substack)$/)) {
              relatedUrls.add(`https://${subdomain}.substack.com`);
            }
          }
        }
      });
    } catch {
      // Ignore errors finding related pubs
    }

    return Array.from(relatedUrls);
  }

  async discoverAndScrape(
    keywords: string[],
    useGoogle = false,
    snowballDepth = 2,
    maxResults = Infinity
  ): Promise<ScraperResult[]> {
    const allPublicationUrls = new Set<string>();
    const scrapedUrls = new Set<string>();
    const results: ScraperResult[] = [];

    console.log(`\n📚 Starting Substack discovery...`);
    if (maxResults !== Infinity) {
      console.log(`🎯 Target: ${maxResults} food creators\n`);
    } else {
      console.log();
    }

    console.log('🌱 Adding known food Substacks...');
    const knownUrls = this.getKnownFoodSubstacks();
    knownUrls.forEach((url) => allPublicationUrls.add(url));
    console.log(`  ✓ Added ${knownUrls.length} known publications\n`);

    if (useGoogle) {
      console.log(`🔎 Searching via Google for ${keywords.length} keywords...\n`);
      for (const keyword of keywords) {
        const urls = await this.searchGoogleForSubstacks(keyword, 50);
        urls.forEach((url) => allPublicationUrls.add(url));
      }
    }

    for (let depth = 0; depth < snowballDepth; depth++) {
      if (results.length >= maxResults) {
        console.log(`\n🎯 Reached target of ${maxResults} creators! Stopping discovery.\n`);
        break;
      }

      const urlsToScrape = Array.from(allPublicationUrls).filter((url) => !scrapedUrls.has(url));

      if (urlsToScrape.length === 0) break;

      console.log(`\n🔄 Snowball round ${depth + 1}/${snowballDepth}: ${urlsToScrape.length} publications to scrape\n`);

      let processed = 0;
      for (const url of urlsToScrape) {
        if (results.length >= maxResults) {
          console.log(`\n🎯 Reached target of ${maxResults} creators! Stopping.\n`);
          break;
        }

        processed++;
        scrapedUrls.add(url);

        console.log(`[${processed}/${urlsToScrape.length}] Scraping: ${url}`);

        const result = await this.scrapePublication(url);
        if (result) {
          const isFoodRelated = this.isFoodRelated(result);
          if (isFoodRelated) {
            results.push(result);

            const details = [];
            if (result.follower_count) details.push(`${result.follower_count.toLocaleString()} subscribers`);
            if (result.content_samples?.length) details.push(`${result.content_samples.length} posts`);
            if (result.subscription_price_lowest) details.push(`$${result.subscription_price_lowest}/mo`);
            if (result.social_links?.length) details.push(`${result.social_links.length} socials`);

            const detailsStr = details.length > 0 ? ` | ${details.join(', ')}` : '';
            console.log(`  ✓ ${result.display_name}${detailsStr} [FOOD] (${results.length}/${maxResults === Infinity ? '∞' : maxResults})`);

            if (depth < snowballDepth - 1 && results.length < maxResults) {
              const related = await this.findRelatedPublications(url);
              related.forEach((relatedUrl) => allPublicationUrls.add(relatedUrl));
              if (related.length > 0) {
                console.log(`    → Found ${related.length} related publications`);
              }
            }
          } else {
            console.log(`  ⊘ ${result.display_name} (not food-related)`);
          }
        }

        if (processed % 10 === 0) {
          console.log(`\n  Progress: ${processed}/${urlsToScrape.length} (${Math.round((processed / urlsToScrape.length) * 100)}%)`);
          console.log(`  Total food publications found: ${results.length}/${maxResults === Infinity ? '∞' : maxResults}\n`);
        }
      }
    }

    console.log(`\n✅ Completed! Successfully scraped ${results.length} food-related publications`);
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
    ];

    const textToCheck = `${result.display_name} ${result.bio_text || ''}`.toLowerCase();
    return foodKeywords.some((keyword) => textToCheck.includes(keyword));
  }
}
