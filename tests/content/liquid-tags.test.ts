import { describe, it, expect } from 'vitest';
import {
  detectLiquidTags,
  convertLiquidTag,
  stripLiquidTags,
} from '../../src/content/liquid-tags.js';

describe('detectLiquidTags', () => {
  it('detects inline liquid tags', () => {
    const markdown = `Some text
{% youtube dQw4w9WgXcQ %}
More text`;

    const report = detectLiquidTags(markdown);
    expect(report.tags).toHaveLength(1);
    expect(report.tags[0]!.tag).toBe('youtube');
    expect(report.tags[0]!.argument).toBe('dQw4w9WgXcQ');
    expect(report.tags[0]!.lineNumber).toBe(2);
    expect(report.hasCrossPostUnsafe).toBe(true);
  });

  it('detects block liquid tags', () => {
    const markdown = `Text
{% details Click to expand %}
Hidden content here
{% enddetails %}
More text`;

    const report = detectLiquidTags(markdown);
    expect(report.tags).toHaveLength(1);
    expect(report.tags[0]!.tag).toBe('details');
    expect(report.tags[0]!.hasEndTag).toBe(true);
    expect(report.tags[0]!.argument).toBe('Click to expand');
  });

  it('detects multiple tags', () => {
    const markdown = `{% youtube abc123 %}
{% twitter 12345 %}
{% github user/repo %}`;

    const report = detectLiquidTags(markdown);
    expect(report.tags).toHaveLength(3);
  });

  it('skips liquid tags inside code fences', () => {
    const markdown = `Real tag: {% youtube abc %}

\`\`\`markdown
This should be ignored: {% youtube xyz %}
\`\`\`

Another real tag: {% twitter 123 %}`;

    const report = detectLiquidTags(markdown);
    expect(report.tags).toHaveLength(2);
    expect(report.tags[0]!.argument).toBe('abc');
    expect(report.tags[1]!.argument).toBe('123');
  });

  it('handles empty markdown', () => {
    const report = detectLiquidTags('');
    expect(report.tags).toHaveLength(0);
    expect(report.hasCrossPostUnsafe).toBe(false);
  });

  it('handles markdown with no liquid tags', () => {
    const report = detectLiquidTags('# Hello\n\nJust regular markdown.');
    expect(report.tags).toHaveLength(0);
  });
});

describe('convertLiquidTag', () => {
  it('converts youtube tag to URL', () => {
    const result = convertLiquidTag({
      tag: 'youtube',
      argument: 'dQw4w9WgXcQ',
      fullMatch: '{% youtube dQw4w9WgXcQ %}',
      lineNumber: 1,
      crossPostSafe: false,
      hasEndTag: false,
    });
    expect(result).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it('converts github tag to URL', () => {
    const result = convertLiquidTag({
      tag: 'github',
      argument: 'forem/forem',
      fullMatch: '{% github forem/forem %}',
      lineNumber: 1,
      crossPostSafe: false,
      hasEndTag: false,
    });
    expect(result).toBe('[forem/forem](https://github.com/forem/forem)');
  });

  it('converts user tag to @mention', () => {
    const result = convertLiquidTag({
      tag: 'user',
      argument: 'ben',
      fullMatch: '{% user ben %}',
      lineNumber: 1,
      crossPostSafe: false,
      hasEndTag: false,
    });
    expect(result).toBe('@ben');
  });

  it('converts tag tag to hashtag', () => {
    const result = convertLiquidTag({
      tag: 'tag',
      argument: 'javascript',
      fullMatch: '{% tag javascript %}',
      lineNumber: 1,
      crossPostSafe: false,
      hasEndTag: false,
    });
    expect(result).toBe('#javascript');
  });
});

describe('stripLiquidTags', () => {
  it('strips inline liquid tags and replaces with equivalents', () => {
    const markdown = 'Check this video: {% youtube abc123 %}';
    const result = stripLiquidTags(markdown);
    expect(result).toBe('Check this video: https://www.youtube.com/watch?v=abc123');
  });

  it('strips block liquid tags', () => {
    const markdown = `{% details Summary %}
Content inside
{% enddetails %}`;
    const result = stripLiquidTags(markdown);
    expect(result).toContain('<details>');
    expect(result).toContain('<summary>Summary</summary>');
    expect(result).toContain('Content inside');
    expect(result).toContain('</details>');
  });

  it('preserves liquid tags inside code fences', () => {
    const markdown = `\`\`\`
{% youtube abc %}
\`\`\``;
    const result = stripLiquidTags(markdown);
    expect(result).toContain('{% youtube abc %}');
  });

  it('handles empty string', () => {
    expect(stripLiquidTags('')).toBe('');
  });
});
