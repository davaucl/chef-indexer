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
  // Core food terms
  'recipe',
  'recipes',
  'cooking',
  'cook',
  'baking',
  'bake',
  'food',
  'foodie',
  'food blog',
  'foodblog',
  'food blogger',
  'home cook',
  'homemade',
  'homecooking',
  'fromscratch',
  'meal prep',
  'mealprep',
  'kitchen',
  'chef',
  'eats',

  // Diet types
  'vegan',
  'vegetarian',
  'plantbased',
  'plant based',
  'keto',
  'paleo',
  'glutenfree',
  'gluten free',
  'dairyfree',
  'dairy free',

  // Meal types
  'breakfast',
  'lunch',
  'dinner',
  'brunch',
  'snack',
  'snacks',
  'appetizer',
  'appetizers',
  'entree',
  'side dish',

  // Cooking methods
  'grill',
  'grilling',
  'bbq',
  'barbecue',
  'smoke',
  'smoking',
  'ferment',
  'fermentation',
  'pickle',
  'pickling',
  'canning',
  'roasting',
  'sauteing',

  // Specialties
  'sourdough',
  'bread',
  'breadmaking',
  'pastry',
  'pizza',
  'pasta',
  'noodles',
  'sushi',
  'ramen',
  'dessert',
  'desserts',
  'cake',
  'cakes',

  // General cooking terms
  'cuisine',
  'culinary',
  'cooking tips',
  'cookingtips',
  'food tips',
];
