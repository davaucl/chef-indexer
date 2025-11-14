import { ScraperResult } from '../models/types';
import { FOOD_KEYWORDS } from '../config';

/**
 * Shared utility for detecting food-related content creators
 * Consolidates food keyword matching logic used across all scrapers
 */

/**
 * Check if a scraper result represents a food-related creator
 * based on keyword matching in bio, display name, and content samples
 */
export function isFoodRelated(result: ScraperResult): boolean {
  // Convert all food keywords to lowercase for case-insensitive matching
  const keywords = FOOD_KEYWORDS.map(k => k.toLowerCase());

  // Check display name and bio
  const textToCheck = `${result.display_name} ${result.bio_text || ''}`.toLowerCase();
  if (keywords.some((keyword) => textToCheck.includes(keyword))) {
    return true;
  }

  // Check post titles/captions (content_samples)
  if (result.content_samples && result.content_samples.length > 0) {
    const postText = result.content_samples
      .map((post) => post.title_or_caption || '')
      .join(' ')
      .toLowerCase();

    if (keywords.some((keyword) => postText.includes(keyword))) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate a food relevance score (0-1) based on keyword density
 * Higher score means more food-related keywords found
 */
export function getFoodRelevanceScore(result: ScraperResult): number {
  const keywords = FOOD_KEYWORDS.map(k => k.toLowerCase());
  const textToCheck = `${result.display_name} ${result.bio_text || ''}`.toLowerCase();

  let matchCount = 0;
  keywords.forEach((keyword) => {
    if (textToCheck.includes(keyword)) {
      matchCount++;
    }
  });

  // Include content samples in score
  if (result.content_samples && result.content_samples.length > 0) {
    const postText = result.content_samples
      .map((post) => post.title_or_caption || '')
      .join(' ')
      .toLowerCase();

    keywords.forEach((keyword) => {
      if (postText.includes(keyword)) {
        matchCount += 0.5; // Weight content samples less than bio/name
      }
    });
  }

  // Normalize score to 0-1 range (assume max 10 matches is very food-related)
  return Math.min(matchCount / 10, 1);
}

/**
 * Get matching food keywords from a scraper result
 * Useful for debugging and understanding why a creator was classified as food-related
 */
export function getMatchingFoodKeywords(result: ScraperResult): string[] {
  const keywords = FOOD_KEYWORDS.map(k => k.toLowerCase());
  const textToCheck = `${result.display_name} ${result.bio_text || ''}`.toLowerCase();

  const matches = new Set<string>();

  keywords.forEach((keyword) => {
    if (textToCheck.includes(keyword)) {
      matches.add(keyword);
    }
  });

  // Check content samples
  if (result.content_samples && result.content_samples.length > 0) {
    const postText = result.content_samples
      .map((post) => post.title_or_caption || '')
      .join(' ')
      .toLowerCase();

    keywords.forEach((keyword) => {
      if (postText.includes(keyword)) {
        matches.add(keyword);
      }
    });
  }

  return Array.from(matches);
}
