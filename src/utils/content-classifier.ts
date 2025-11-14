import OpenAI from 'openai';
import { config } from '../config';

export interface ContentClassification {
  primaryCategory: string; // e.g., "desserts", "savory", "baking", "healthy"
  specificTypes: string[]; // e.g., ["cheesecake", "chocolate cake"]
  cuisineType?: string; // e.g., "italian", "asian", "mexican"
  dietaryTags: string[]; // e.g., ["vegan", "gluten-free", "keto"]
  confidence: number; // 0-1
}

export interface CreatorContentProfile {
  topCategories: { category: string; count: number; percentage: number }[];
  topSpecificTypes: { type: string; count: number }[];
  topCuisines: { cuisine: string; count: number }[];
  dietaryFocus: string[]; // e.g., ["vegan", "plant-based"]
  totalAnalyzed: number;
}

export class ContentClassifier {
  private openai: OpenAI | null = null;

  constructor() {
    if (config.openaiApiKey) {
      this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    }
  }

  isEnabled(): boolean {
    return this.openai !== null;
  }

  async classifyContent(caption: string, postUrl?: string): Promise<ContentClassification | null> {
    if (!this.openai) {
      return null;
    }

    try {
      const prompt = `Analyze this food content caption and classify it. Return a JSON object with:
- primaryCategory: main category (desserts, savory, baking, healthy, beverages, snacks, meal-prep)
- specificTypes: array of specific food types mentioned (e.g., ["cheesecake", "chocolate cake"])
- cuisineType: cuisine if identifiable (italian, asian, mexican, french, etc.) or null
- dietaryTags: array of dietary tags (vegan, vegetarian, gluten-free, keto, paleo, plant-based, etc.)
- confidence: 0-1 score for classification confidence

Caption: "${caption}"

Return ONLY valid JSON, no markdown.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-5-nano',
        messages: [
          {
            role: 'system',
            content:
              'You are a food content classifier. Always respond with valid JSON only, no markdown or explanation.',
          },
          { role: 'user', content: prompt },
        ],
        // gpt-5-nano only supports temperature: 1 (default)
        max_tokens: 300,
      });

      const content = response.choices[0].message.content;
      if (!content) return null;

      // Remove markdown code blocks if present
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const classification: ContentClassification = JSON.parse(cleanedContent);
      return classification;
    } catch (error: any) {
      console.error(`    ✗ Error classifying content:`, error.message);
      return null;
    }
  }

  async classifyMultipleContents(
    contents: Array<{ caption: string; url?: string }>
  ): Promise<ContentClassification[]> {
    if (!this.openai) {
      return [];
    }

    const results: ContentClassification[] = [];

    // Process in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < contents.length; i += batchSize) {
      const batch = contents.slice(i, i + batchSize);

      const promises = batch.map((content) => this.classifyContent(content.caption, content.url));

      const batchResults = await Promise.all(promises);
      results.push(...batchResults.filter((r) => r !== null) as ContentClassification[]);

      // Small delay between batches
      if (i + batchSize < contents.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return results;
  }

  analyzeCreatorProfile(classifications: ContentClassification[]): CreatorContentProfile {
    const categoryCount: Record<string, number> = {};
    const typeCount: Record<string, number> = {};
    const cuisineCount: Record<string, number> = {};
    const dietarySet = new Set<string>();

    classifications.forEach((c) => {
      // Count categories
      categoryCount[c.primaryCategory] = (categoryCount[c.primaryCategory] || 0) + 1;

      // Count specific types
      c.specificTypes.forEach((type) => {
        typeCount[type] = (typeCount[type] || 0) + 1;
      });

      // Count cuisines
      if (c.cuisineType) {
        cuisineCount[c.cuisineType] = (cuisineCount[c.cuisineType] || 0) + 1;
      }

      // Collect dietary tags
      c.dietaryTags.forEach((tag) => dietarySet.add(tag));
    });

    const total = classifications.length;

    // Sort and format results
    const topCategories = Object.entries(categoryCount)
      .map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    const topSpecificTypes = Object.entries(typeCount)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topCuisines = Object.entries(cuisineCount)
      .map(([cuisine, count]) => ({ cuisine, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      topCategories,
      topSpecificTypes,
      topCuisines,
      dietaryFocus: Array.from(dietarySet),
      totalAnalyzed: total,
    };
  }
}
