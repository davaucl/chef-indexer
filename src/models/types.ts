export interface Creator {
  creator_id: number;
  display_name: string;
  primary_language?: string;
  country?: string;
  tags: string[];
  is_food_creator: boolean;
  food_confidence: number;
  external_website?: string;
  created_at: string;
  updated_at: string;
}

export interface PlatformAccount {
  platform_account_id: number;
  creator_id: number;
  platform: Platform;
  handle: string;
  display_name: string;
  profile_url: string;
  bio_text?: string;
  follower_count?: number;
  following_count?: number;
  total_content_count?: number;
  avg_views_last_n?: number;
  avg_likes_last_n?: number;
  avg_comments_last_n?: number;
  engagement_rate_last_n?: number;
  subscription_price_lowest?: number;
  subscription_currency?: string;
  social_links: string[];
  created_at: string;
  updated_at: string;
}

export interface ContentSample {
  content_id: number;
  platform_account_id: number;
  platform: Platform;
  url: string;
  title_or_caption?: string;
  published_at?: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  is_recipe: boolean;
  topic_tags: string[];
  created_at: string;
}

export type Platform = 'youtube' | 'instagram' | 'tiktok' | 'substack' | 'patreon';

export interface ScraperResult {
  handle: string;
  display_name: string;
  profile_url: string;
  bio_text?: string;
  follower_count?: number;
  following_count?: number;
  total_content_count?: number;
  social_links?: string[];
  similar_accounts?: string[];
  subscription_price_lowest?: number;
  subscription_currency?: string;
  content_samples?: ContentSampleInput[];
}

export interface ContentSampleInput {
  url: string;
  title_or_caption?: string;
  published_at?: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
}
