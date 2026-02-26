import { describe, it, expect } from 'vitest';
import { extractImageUrls, isSubstantialContent } from '../../src/content/markdown.js';

describe('extractImageUrls', () => {
  it('finds markdown image syntax', () => {
    const markdown = '![Alt text](https://example.com/img.png)';
    const images = extractImageUrls(markdown);
    expect(images).toHaveLength(1);
    expect(images[0]!.url).toBe('https://example.com/img.png');
    expect(images[0]!.isAbsolute).toBe(true);
    expect(images[0]!.lineNumber).toBe(1);
  });

  it('finds HTML img tags', () => {
    const markdown = '<img src="https://example.com/img.jpg" alt="test">';
    const images = extractImageUrls(markdown);
    expect(images).toHaveLength(1);
    expect(images[0]!.url).toBe('https://example.com/img.jpg');
    expect(images[0]!.isAbsolute).toBe(true);
  });

  it('detects relative URLs', () => {
    const markdown = '![](./local/image.png)';
    const images = extractImageUrls(markdown);
    expect(images).toHaveLength(1);
    expect(images[0]!.isAbsolute).toBe(false);
  });

  it('detects local paths', () => {
    const markdown = '![](/images/test.jpg)';
    const images = extractImageUrls(markdown);
    expect(images).toHaveLength(1);
    expect(images[0]!.isAbsolute).toBe(false);
  });

  it('finds multiple images with correct line numbers', () => {
    const markdown = `# Article
![First](https://example.com/1.png)
Some text
![Second](./local.png)
<img src="https://example.com/3.jpg">`;

    const images = extractImageUrls(markdown);
    expect(images).toHaveLength(3);
    expect(images[0]!.lineNumber).toBe(2);
    expect(images[1]!.lineNumber).toBe(4);
    expect(images[1]!.isAbsolute).toBe(false);
    expect(images[2]!.lineNumber).toBe(5);
  });

  it('handles empty markdown', () => {
    expect(extractImageUrls('')).toEqual([]);
  });

  it('handles markdown with no images', () => {
    expect(extractImageUrls('# Hello\n\nNo images here.')).toEqual([]);
  });
});

describe('isSubstantialContent', () => {
  it('returns true for substantial content', () => {
    const markdown =
      'This is a substantial article about building MCP servers with TypeScript. It covers many important topics including architecture design and testing strategies.';
    expect(isSubstantialContent(markdown)).toBe(true);
  });

  it('returns false for empty content', () => {
    expect(isSubstantialContent('')).toBe(false);
  });

  it('returns false for very short content', () => {
    expect(isSubstantialContent('Hello world')).toBe(false);
  });

  it('returns false for content that is mostly code blocks', () => {
    const markdown = `\`\`\`javascript
const a = 1;
const b = 2;
const c = 3;
const d = 4;
const e = 5;
\`\`\``;
    expect(isSubstantialContent(markdown)).toBe(false);
  });

  it('returns true for content with code blocks and sufficient prose', () => {
    const markdown = `This is an article about TypeScript development that covers many important topics including type safety and code organization.

\`\`\`javascript
const x = 1;
\`\`\``;
    expect(isSubstantialContent(markdown)).toBe(true);
  });
});
