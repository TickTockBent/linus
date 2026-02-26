import { describe, it, expect } from 'vitest';
import {
  handleValidateArticle,
  handlePrepareCrosspost,
} from '../../src/tools/utilities.js';
import type { ForemClient } from '../../src/client/forem.js';

const mockClient = {} as ForemClient;

describe('handleValidateArticle', () => {
  it('validates a good article', async () => {
    const result = await handleValidateArticle(mockClient, {
      title: 'Good Article',
      body_markdown:
        'This is a well-written article about software development with plenty of content and detail to pass validation checks.',
      tags: 'javascript, typescript',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.valid).toBe(true);
  });

  it('reports validation failures', async () => {
    const result = await handleValidateArticle(mockClient, {
      title: 'Bad Article',
      tags: 'one, two, three, four, five',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.valid).toBe(false);
    expect(parsed.issues.some((i: { code: string }) => i.code === 'validation_failed')).toBe(
      true,
    );
  });
});

describe('handlePrepareCrosspost', () => {
  it('strips liquid tags and sets canonical URL', async () => {
    const result = await handlePrepareCrosspost(mockClient, {
      body_markdown: 'Check this: {% youtube abc123 %}\n\nMore content here.',
      canonical_url: 'https://myblog.com/original',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.canonical_url).toBe('https://myblog.com/original');
    expect(parsed.body).toContain('youtube.com');
    expect(parsed.body).not.toContain('{%');
    expect(parsed.liquid_tag_report.tags_found).toBe(1);
  });

  it('preserves liquid tags when strip_liquid_tags is false', async () => {
    const result = await handlePrepareCrosspost(mockClient, {
      body_markdown: '{% youtube abc %}',
      canonical_url: 'https://myblog.com/original',
      strip_liquid_tags: false,
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.body).toContain('{%');
    expect(parsed.liquid_tag_report.tags_found).toBe(1);
  });
});
