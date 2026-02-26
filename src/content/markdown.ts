export interface ImageUrlInfo {
  url: string;
  lineNumber: number;
  isAbsolute: boolean;
}

/**
 * Extract all image URLs from markdown (![](url) and <img src="url"> patterns).
 */
export function extractImageUrls(markdown: string): ImageUrlInfo[] {
  if (!markdown) return [];

  const images: ImageUrlInfo[] = [];
  const lines = markdown.split('\n');

  // Markdown image pattern: ![alt](url)
  const markdownImagePattern = /!\[.*?\]\((.*?)\)/g;
  // HTML img pattern: <img...src="url"...>
  const htmlImagePattern = /<img[^>]+src=["'](.*?)["'][^>]*>/gi;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex]!;
    const lineNumber = lineIndex + 1;

    let match: RegExpExecArray | null;

    markdownImagePattern.lastIndex = 0;
    while ((match = markdownImagePattern.exec(line)) !== null) {
      const url = match[1]!.trim();
      images.push({
        url,
        lineNumber,
        isAbsolute: isAbsoluteUrl(url),
      });
    }

    htmlImagePattern.lastIndex = 0;
    while ((match = htmlImagePattern.exec(line)) !== null) {
      const url = match[1]!.trim();
      images.push({
        url,
        lineNumber,
        isAbsolute: isAbsoluteUrl(url),
      });
    }
  }

  return images;
}

/**
 * Check if a URL is absolute (starts with http:// or https://).
 */
function isAbsoluteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/**
 * Check if markdown content is substantial (not just a link or trivially short).
 * Strips code blocks before counting words.
 */
export function isSubstantialContent(markdown: string): boolean {
  if (!markdown || !markdown.trim()) return false;

  // Strip code blocks
  let stripped = markdown.replace(/```[\s\S]*?```/g, '');
  // Strip inline code
  stripped = stripped.replace(/`[^`]+`/g, '');
  // Strip images
  stripped = stripped.replace(/!\[.*?\]\(.*?\)/g, '');
  // Strip links but keep text
  stripped = stripped.replace(/\[([^\]]*)\]\(.*?\)/g, '$1');
  // Strip HTML tags
  stripped = stripped.replace(/<[^>]+>/g, '');
  // Strip markdown formatting
  stripped = stripped.replace(/[#*_~>-]/g, '');

  const words = stripped
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  // Minimum 10 words for "substantial" content
  return words.length >= 10;
}
