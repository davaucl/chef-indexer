import Database from 'better-sqlite3';
import { config } from '../config';
import { Creator, PlatformAccount, ContentSample, Platform, ScraperResult } from '../models/types';
import * as fs from 'fs';
import * as path from 'path';

export class DatabaseManager {
  private db: Database.Database;

  constructor(dbPath: string = config.databasePath) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.initialize();
  }

  private initialize() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS creators (
        creator_id INTEGER PRIMARY KEY AUTOINCREMENT,
        display_name TEXT NOT NULL,
        primary_language TEXT,
        country TEXT,
        tags TEXT DEFAULT '[]',
        is_food_creator INTEGER DEFAULT 1,
        food_confidence REAL DEFAULT 0.5,
        external_website TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS platform_accounts (
        platform_account_id INTEGER PRIMARY KEY AUTOINCREMENT,
        creator_id INTEGER NOT NULL,
        platform TEXT NOT NULL,
        handle TEXT NOT NULL,
        display_name TEXT NOT NULL,
        profile_url TEXT UNIQUE NOT NULL,
        bio_text TEXT,
        follower_count INTEGER,
        following_count INTEGER,
        total_content_count INTEGER,
        avg_views_last_n REAL,
        avg_likes_last_n REAL,
        avg_comments_last_n REAL,
        engagement_rate_last_n REAL,
        subscription_price_lowest REAL,
        subscription_currency TEXT,
        social_links TEXT DEFAULT '[]',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (creator_id) REFERENCES creators(creator_id),
        UNIQUE(platform, handle)
      );

      CREATE TABLE IF NOT EXISTS content_samples (
        content_id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform_account_id INTEGER NOT NULL,
        platform TEXT NOT NULL,
        url TEXT UNIQUE NOT NULL,
        title_or_caption TEXT,
        published_at TEXT,
        views INTEGER,
        likes INTEGER,
        comments INTEGER,
        shares INTEGER,
        is_recipe INTEGER DEFAULT 0,
        topic_tags TEXT DEFAULT '[]',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (platform_account_id) REFERENCES platform_accounts(platform_account_id)
      );

      CREATE INDEX IF NOT EXISTS idx_platform_accounts_creator ON platform_accounts(creator_id);
      CREATE INDEX IF NOT EXISTS idx_platform_accounts_platform ON platform_accounts(platform);
      CREATE INDEX IF NOT EXISTS idx_content_samples_account ON content_samples(platform_account_id);
      CREATE INDEX IF NOT EXISTS idx_creators_food ON creators(is_food_creator, food_confidence);
    `);
  }

  upsertCreatorFromPlatformData(platform: Platform, data: ScraperResult): number {
    const existingAccount = this.db
      .prepare('SELECT creator_id FROM platform_accounts WHERE profile_url = ?')
      .get(data.profile_url) as { creator_id: number } | undefined;

    let creatorId: number;

    if (existingAccount) {
      creatorId = existingAccount.creator_id;
      this.updatePlatformAccount(platform, data, creatorId);
    } else {
      creatorId = this.createCreator(data.display_name, data.bio_text);
      this.createPlatformAccount(platform, data, creatorId);
    }

    if (data.content_samples && data.content_samples.length > 0) {
      const accountId = this.getPlatformAccountId(data.profile_url);
      if (accountId) {
        for (const content of data.content_samples) {
          this.addContentSample(accountId, platform, content);
        }
        this.updateEngagementMetrics(accountId);
      }
    }

    return creatorId;
  }

  private createCreator(displayName: string, bioText?: string): number {
    const result = this.db
      .prepare(
        `INSERT INTO creators (display_name, is_food_creator, food_confidence)
         VALUES (?, 1, 0.5)`
      )
      .run(displayName);
    return result.lastInsertRowid as number;
  }

  private createPlatformAccount(platform: Platform, data: ScraperResult, creatorId: number) {
    this.db
      .prepare(
        `INSERT INTO platform_accounts (
          creator_id, platform, handle, display_name, profile_url, bio_text,
          follower_count, following_count, total_content_count,
          subscription_price_lowest, subscription_currency, social_links
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        creatorId,
        platform,
        data.handle,
        data.display_name,
        data.profile_url,
        data.bio_text || null,
        data.follower_count || null,
        data.following_count || null,
        data.total_content_count || null,
        data.subscription_price_lowest || null,
        data.subscription_currency || null,
        JSON.stringify(data.social_links || [])
      );
  }

  private updatePlatformAccount(platform: Platform, data: ScraperResult, creatorId: number) {
    this.db
      .prepare(
        `UPDATE platform_accounts SET
          display_name = ?, bio_text = ?, follower_count = ?,
          following_count = ?, total_content_count = ?,
          subscription_price_lowest = ?, subscription_currency = ?,
          social_links = ?, updated_at = CURRENT_TIMESTAMP
         WHERE profile_url = ?`
      )
      .run(
        data.display_name,
        data.bio_text || null,
        data.follower_count || null,
        data.following_count || null,
        data.total_content_count || null,
        data.subscription_price_lowest || null,
        data.subscription_currency || null,
        JSON.stringify(data.social_links || []),
        data.profile_url
      );
  }

  private getPlatformAccountId(profileUrl: string): number | undefined {
    const result = this.db
      .prepare('SELECT platform_account_id FROM platform_accounts WHERE profile_url = ?')
      .get(profileUrl) as { platform_account_id: number } | undefined;
    return result?.platform_account_id;
  }

  private addContentSample(accountId: number, platform: Platform, content: any) {
    try {
      this.db
        .prepare(
          `INSERT OR IGNORE INTO content_samples (
            platform_account_id, platform, url, title_or_caption,
            published_at, views, likes, comments, shares
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          accountId,
          platform,
          content.url,
          content.title_or_caption || null,
          content.published_at || null,
          content.views || null,
          content.likes || null,
          content.comments || null,
          content.shares || null
        );
    } catch (e) {
      // Ignore duplicate content
    }
  }

  private updateEngagementMetrics(accountId: number) {
    const stats = this.db
      .prepare(
        `SELECT
          AVG(views) as avg_views,
          AVG(likes) as avg_likes,
          AVG(comments) as avg_comments
         FROM content_samples
         WHERE platform_account_id = ?
           AND views IS NOT NULL`
      )
      .get(accountId) as any;

    if (stats && stats.avg_views) {
      this.db
        .prepare(
          `UPDATE platform_accounts SET
            avg_views_last_n = ?,
            avg_likes_last_n = ?,
            avg_comments_last_n = ?
           WHERE platform_account_id = ?`
        )
        .run(stats.avg_views, stats.avg_likes, stats.avg_comments, accountId);
    }
  }

  getStats() {
    const creators = this.db.prepare('SELECT COUNT(*) as count FROM creators').get() as any;
    const accounts = this.db
      .prepare('SELECT platform, COUNT(*) as count FROM platform_accounts GROUP BY platform')
      .all();
    const content = this.db.prepare('SELECT COUNT(*) as count FROM content_samples').get() as any;

    return {
      total_creators: creators.count,
      accounts_by_platform: accounts,
      total_content_samples: content.count,
    };
  }

  exportToJson(outputPath: string) {
    const creators = this.db.prepare('SELECT * FROM creators').all();
    const accounts = this.db.prepare('SELECT * FROM platform_accounts').all();
    const content = this.db.prepare('SELECT * FROM content_samples').all();

    const data = { creators, accounts, content };
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    return outputPath;
  }

  close() {
    this.db.close();
  }
}
