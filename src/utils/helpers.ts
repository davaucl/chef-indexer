export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

export function cleanHandle(handle: string): string {
  return handle.replace(/^@/, '').trim();
}

export function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  return matches ? matches.filter(isValidUrl) : [];
}

export function calculateEngagementRate(likes: number, comments: number, followers: number): number {
  if (followers === 0) return 0;
  return ((likes + comments) / followers) * 100;
}

export function removeEmojis(text: string): string {
  // Remove all emojis and emoji-like characters
  return text
    .replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{238C}-\u{2454}\u{20D0}-\u{20FF}\u{FE00}-\u{FE0F}]/gu,
      ''
    )
    .replace(/[\u200D\uFE0F]/g, '') // Remove zero-width joiners
    .trim();
}

export function cleanPostUrl(url: string): string {
  // Remove query parameters like ?img_index=1 from Instagram URLs
  try {
    const urlObj = new URL(url);
    // Keep only the pathname (remove query params)
    return `${urlObj.origin}${urlObj.pathname}`;
  } catch {
    // If URL parsing fails, try regex cleanup
    return url.replace(/\?.*$/, '');
  }
}
