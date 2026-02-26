import { describe, it, expect } from 'vitest';
import { validateArticle } from '../../src/content/validator.js';

describe('validateArticle', () => {
  it('passes validation for a valid article', () => {
    const result = validateArticle({
      title: 'Test Article',
      body_markdown:
        'This is a comprehensive test article about building software that covers many important topics in modern development.',
      tags: 'javascript, typescript',
    });
    expect(result.valid).toBe(true);
    expect(result.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });

  it('fails when no title and no body', () => {
    const result = validateArticle({});
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'validation_failed')).toBe(true);
  });

  it('fails when more than 4 tags', () => {
    const result = validateArticle({
      title: 'Test',
      tags: 'one, two, three, four, five',
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.message.includes('Too many tags'))).toBe(true);
  });

  it('fails for invalid tag characters', () => {
    const result = validateArticle({
      title: 'Test',
      tags: 'JavaScript, Type-Script',
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.message.includes('Invalid tag'))).toBe(true);
  });

  it('accepts valid tags', () => {
    const result = validateArticle({
      title: 'Test',
      body_markdown:
        'This article has enough content to pass the substantial content check with multiple words and sentences.',
      tags: 'javascript, typescript, webdev, node',
    });
    expect(result.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });

  it('flags relative image URLs', () => {
    const result = validateArticle({
      title: 'Test',
      body_markdown: '![](./local.png) This article has enough content to be substantial with many words present.',
    });
    expect(result.issues.some((i) => i.code === 'image_not_absolute')).toBe(true);
  });

  it('flags relative cover image', () => {
    const result = validateArticle({
      title: 'Test',
      main_image: './cover.jpg',
    });
    expect(result.issues.some((i) => i.code === 'image_not_absolute')).toBe(true);
  });

  it('detects front matter conflicts', () => {
    const result = validateArticle({
      title: 'JSON Title',
      body_markdown: `---
title: FM Title
---
This article has enough content to pass the substantial content check with many words and sentences.`,
    });
    expect(result.issues.some((i) => i.code === 'front_matter_conflict')).toBe(true);
  });

  it('reports liquid tags as info', () => {
    const result = validateArticle({
      title: 'Test',
      body_markdown:
        '{% youtube abc123 %}\n\nThis article has enough content to pass validation with multiple words and several sentences to meet the threshold.',
    });
    expect(result.issues.some((i) => i.code === 'liquid_tag_detected')).toBe(true);
    expect(
      result.issues.filter((i) => i.code === 'liquid_tag_detected')[0]!.severity,
    ).toBe('info');
  });

  it('warns about thin content', () => {
    const result = validateArticle({
      title: 'Test',
      body_markdown: 'Short.',
    });
    expect(
      result.issues.some(
        (i) => i.severity === 'warning' && i.message.includes('substantial'),
      ),
    ).toBe(true);
  });

  it('accepts tags as array', () => {
    const result = validateArticle({
      title: 'Test',
      body_markdown:
        'This article has enough content to pass the substantial content check with many words present.',
      tags: ['javascript', 'typescript'],
    });
    expect(result.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });
});
