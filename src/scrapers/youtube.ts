import axios from 'axios';
import { ScraperResult, ContentSampleInput } from '../models/types';
import { delay, extractUrls, cleanHandle } from '../utils/helpers';
import { config } from '../config';
import { SEED_YOUTUBE } from '../data/seeds';

interface YouTubeChannel {
  id: string;
  snippet: {
    title: string;
    description: string;
    customUrl?: string;
  };
  statistics: {
    subscriberCount: string;
    videoCount: string;
    viewCount: string;
  };
}

interface YouTubeVideo {
  id: { videoId?: string };
  snippet: {
    title: string;
    publishedAt: string;
    channelId: string;
  };
}

interface YouTubeVideoDetails {
  id: string;
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
}

export class YouTubeScraper {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️  YOUTUBE_API_KEY not set. YouTube scraper will not work.');
    }
  }

  private async makeApiRequest(endpoint: string, params: Record<string, string>): Promise<any> {
    await delay(config.requestDelayMs);

    const url = `https://www.googleapis.com/youtube/v3/${endpoint}`;
    const response = await axios.get(url, {
      params: {
        ...params,
        key: this.apiKey,
      },
      timeout: 15000,
    });

    return response.data;
  }

  async searchChannels(keyword: string, maxResults = 50): Promise<string[]> {
    if (!this.apiKey) return [];

    try {
      console.log(`  🔍 Searching YouTube for: "${keyword}"`);

      const data = await this.makeApiRequest('search', {
        part: 'snippet',
        type: 'channel',
        q: keyword,
        maxResults: maxResults.toString(),
        order: 'relevance',
      });

      const channelIds = data.items.map((item: any) => item.snippet.channelId);

      if (channelIds.length === 0) {
        console.log(`    ⚠️  No results found for "${keyword}"`);
      } else {
        console.log(`    ✓ Found ${channelIds.length} channels for "${keyword}"`);
      }

      return channelIds;
    } catch (error: any) {
      console.error(`    ✗ Error searching for "${keyword}":`, error.message);
      return [];
    }
  }

  async getChannelDetails(channelId: string): Promise<YouTubeChannel | null> {
    if (!this.apiKey) return null;

    try {
      const data = await this.makeApiRequest('channels', {
        part: 'snippet,statistics',
        id: channelId,
      });

      if (data.items && data.items.length > 0) {
        return data.items[0];
      }
      return null;
    } catch (error: any) {
      console.error(`    ✗ Error fetching channel ${channelId}:`, error.message);
      return null;
    }
  }

  async getChannelVideos(channelId: string, maxResults = 10): Promise<YouTubeVideo[]> {
    if (!this.apiKey) return [];

    try {
      const data = await this.makeApiRequest('search', {
        part: 'snippet',
        channelId: channelId,
        type: 'video',
        order: 'date',
        maxResults: maxResults.toString(),
      });

      return data.items || [];
    } catch (error: any) {
      console.error(`    ✗ Error fetching videos for channel ${channelId}:`, error.message);
      return [];
    }
  }

  async getVideoStatistics(videoIds: string[]): Promise<Map<string, YouTubeVideoDetails>> {
    if (!this.apiKey || videoIds.length === 0) return new Map();

    try {
      const data = await this.makeApiRequest('videos', {
        part: 'statistics',
        id: videoIds.join(','),
      });

      const statsMap = new Map<string, YouTubeVideoDetails>();
      if (data.items) {
        data.items.forEach((item: YouTubeVideoDetails) => {
          statsMap.set(item.id, item);
        });
      }

      return statsMap;
    } catch (error: any) {
      console.error(`    ✗ Error fetching video statistics:`, error.message);
      return new Map();
    }
  }

  async scrapeChannel(channelId: string): Promise<ScraperResult | null> {
    try {
      const channel = await this.getChannelDetails(channelId);
      if (!channel) return null;

      const displayName = channel.snippet.title;
      const bio = channel.snippet.description;
      const handle = channel.snippet.customUrl?.replace('@', '') || channelId;
      const profileUrl = `https://www.youtube.com/channel/${channelId}`;

      const subscriberCount = parseInt(channel.statistics.subscriberCount);
      const totalVideos = parseInt(channel.statistics.videoCount);
      const totalViews = parseInt(channel.statistics.viewCount);

      const socialLinks = new Set<string>();
      if (bio) {
        const urls = extractUrls(bio);
        urls.forEach((url) => {
          if (
            url.includes('twitter.com') ||
            url.includes('x.com') ||
            url.includes('instagram.com') ||
            url.includes('tiktok.com') ||
            url.includes('patreon.com') ||
            url.includes('substack.com') ||
            url.includes('facebook.com')
          ) {
            socialLinks.add(url);
          }
        });
      }

      const videos = await this.getChannelVideos(channelId, 15);
      const videoIds = videos
        .map((v) => v.id.videoId)
        .filter((id): id is string => id !== undefined);

      const videoStats = await this.getVideoStatistics(videoIds);

      const contentSamples: ContentSampleInput[] = videos.map((video) => {
        const videoId = video.id.videoId!;
        const stats = videoStats.get(videoId);

        return {
          url: `https://www.youtube.com/watch?v=${videoId}`,
          title_or_caption: video.snippet.title,
          published_at: video.snippet.publishedAt,
          views: stats ? parseInt(stats.statistics.viewCount) : undefined,
          likes: stats ? parseInt(stats.statistics.likeCount) : undefined,
          comments: stats ? parseInt(stats.statistics.commentCount) : undefined,
        };
      });

      const avgViews = contentSamples.length > 0
        ? contentSamples.reduce((sum, v) => sum + (v.views || 0), 0) / contentSamples.length
        : undefined;

      return {
        handle: cleanHandle(handle),
        display_name: displayName,
        profile_url: profileUrl,
        bio_text: bio || undefined,
        follower_count: subscriberCount,
        total_content_count: totalVideos,
        social_links: Array.from(socialLinks),
        content_samples: contentSamples,
      };
    } catch (error: any) {
      console.error(`    ✗ Error scraping channel ${channelId}:`, error.message);
      return null;
    }
  }

  async findRelatedChannels(channelId: string): Promise<string[]> {
    if (!this.apiKey) return [];

    const relatedChannelIds = new Set<string>();

    try {
      // Get channel sections to find featured channels
      const sectionsData = await this.makeApiRequest('channelSections', {
        part: 'snippet,contentDetails',
        channelId: channelId,
      });

      if (sectionsData.items) {
        for (const section of sectionsData.items) {
          // Look for featured channels sections
          if (section.snippet.type === 'multipleChannels' && section.contentDetails?.channels) {
            section.contentDetails.channels.forEach((relatedId: string) => {
              if (relatedId !== channelId) {
                relatedChannelIds.add(relatedId);
              }
            });
          }
        }
      }
    } catch (error: any) {
      // Ignore errors - some channels don't have sections
    }

    return Array.from(relatedChannelIds);
  }

  getKnownFoodYouTubeChannels(): string[] {
    return SEED_YOUTUBE;
  }

  async discoverAndScrape(
    keywords: string[],
    snowballDepth = 1,
    maxResults = Infinity
  ): Promise<ScraperResult[]> {
    if (!this.apiKey) {
      console.log('\n⚠️  YouTube API key not configured. Set YOUTUBE_API_KEY in .env');
      console.log('Get your API key from: https://console.cloud.google.com/apis/credentials\n');
      return [];
    }

    const allChannelIds = new Set<string>();
    const scrapedIds = new Set<string>();
    const results: ScraperResult[] = [];

    console.log(`\n📺 Starting YouTube discovery...`);
    if (maxResults !== Infinity) {
      console.log(`🎯 Target: ${maxResults} food creators\n`);
    } else {
      console.log();
    }

    const knownChannels = this.getKnownFoodYouTubeChannels();
    if (knownChannels.length > 0) {
      console.log('🌱 Adding known food YouTube channels...');
      knownChannels.forEach((id) => allChannelIds.add(id));
      console.log(`  ✓ Added ${knownChannels.length} known channels\n`);
    }

    console.log(`🔎 Searching YouTube API for ${keywords.length} keywords...\n`);
    for (const keyword of keywords) {
      if (results.length >= maxResults) break;

      const channelIds = await this.searchChannels(keyword, 50);
      channelIds.forEach((id) => allChannelIds.add(id));

      if (results.length >= maxResults) break;
    }

    const uniqueIds = Array.from(allChannelIds);
    console.log(`\n🎯 Total unique channels to scrape: ${uniqueIds.length}`);
    console.log(`📥 Starting to scrape channels...\n`);

    let processed = 0;
    for (const channelId of uniqueIds) {
      if (results.length >= maxResults) {
        console.log(`\n🎯 Reached target of ${maxResults} creators! Stopping.\n`);
        break;
      }

      processed++;
      scrapedIds.add(channelId);

      console.log(`[${processed}/${uniqueIds.length}] Scraping: ${channelId}`);

      const result = await this.scrapeChannel(channelId);
      if (result) {
        const isFoodRelated = this.isFoodRelated(result);
        if (isFoodRelated) {
          results.push(result);

          const details = [];
          if (result.follower_count) {
            details.push(`${(result.follower_count / 1000).toFixed(1)}K subs`);
          }
          if (result.total_content_count) details.push(`${result.total_content_count} videos`);
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
        console.log(`\n  Progress: ${processed}/${uniqueIds.length} (${Math.round((processed / uniqueIds.length) * 100)}%)`);
        console.log(`  Total food channels found: ${results.length}/${maxResults === Infinity ? '∞' : maxResults}\n`);
      }
    }

    console.log(`\n✅ Completed! Successfully scraped ${results.length} food-related channels`);
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
