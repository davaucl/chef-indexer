import dotenv from 'dotenv';

dotenv.config();

export const config = {
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  youtubeApiKey: process.env.YOUTUBE_API_KEY || '',
  instagramSessionId: process.env.INSTAGRAM_SESSIONID || '',
  databasePath: process.env.DATABASE_PATH || './data/creators.db',
  requestDelayMs: parseInt(process.env.REQUEST_DELAY_MS || '2000'),
  maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '3'),
};

export const FOOD_KEYWORDS = [
  'recipe',
  'recipes',
  'cooking',
  'cook',
  'baking',
  'bake',
  'food',
  'food blog',
  'home cook',
  'meal prep',
  'dessert',
  'pastry',
  'kitchen',
  'chef',
];
