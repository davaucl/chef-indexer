import OpenAI from 'openai';
import { config } from '../config';

export class FoodClassifier {
  private openai: OpenAI;

  constructor() {
    if (!config.openaiApiKey) {
      throw new Error('OPENAI_API_KEY is required for food classification');
    }
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
  }

  async isFoodCreator(data: {
    platform: string;
    handle: string;
    displayName?: string;
    bio?: string;
    recentPosts?: string[]; // Array of captions/titles
  }): Promise<{ isFoodCreator: boolean; confidence: number; reason: string }> {
    try {
      const bio = data.bio || 'No bio provided';
      const posts = data.recentPosts || [];
      const postsText = posts.length > 0 ? posts.join('\n---\n') : 'No posts provided';

      const prompt = `Analyze this ${data.platform} account and determine if it's a FOOD CREATOR.

HANDLE: @${data.handle}
DISPLAY NAME: ${data.displayName || 'N/A'}
BIO: ${bio}

RECENT POSTS/CONTENT:
${postsText}

A FOOD CREATOR is someone who primarily creates content about:
- Cooking, recipes, baking
- Food reviews, restaurants, dining
- Food photography, styling
- Culinary education, techniques
- Food culture, history
- Nutrition, healthy eating
- Food business, entrepreneurship in food industry

NOT FOOD CREATORS:
- General lifestyle influencers who occasionally post food
- Travel bloggers who sometimes show meals
- Fitness/gym accounts unless heavily food/nutrition focused
- Fashion, beauty, wellness (unless food is primary focus)
- Accounts that are clearly spam, bots, or inactive

Respond with a JSON object:
{
  "isFoodCreator": true/false,
  "confidence": 0.0-1.0 (how confident you are),
  "reason": "Brief explanation of why this is or isn't a food creator"
}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-5-nano',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert at identifying food content creators across social media platforms. You analyze bios and content to determine if an account primarily focuses on food-related content.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        // gpt-5-nano only supports temperature: 1 (default)
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      return {
        isFoodCreator: result.isFoodCreator || false,
        confidence: result.confidence || 0,
        reason: result.reason || 'No reason provided',
      };
    } catch (error: any) {
      console.error(`   ⚠️  AI classification error: ${error.message}`);
      // On error, default to true to avoid missing real food creators
      return {
        isFoodCreator: true,
        confidence: 0.5,
        reason: 'Classification error - defaulting to true',
      };
    }
  }

  // Batch classification for efficiency
  async classifyMultiple(
    accounts: Array<{
      platform: string;
      handle: string;
      displayName?: string;
      bio?: string;
      recentPosts?: string[];
    }>
  ): Promise<
    Array<{
      handle: string;
      isFoodCreator: boolean;
      confidence: number;
      reason: string;
    }>
  > {
    const results = [];

    for (const account of accounts) {
      const result = await this.isFoodCreator(account);
      results.push({
        handle: account.handle,
        ...result,
      });
    }

    return results;
  }
}
