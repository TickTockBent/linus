import { describe, it, expect } from 'vitest';
import { parseFrontMatter, mergeAndNormalize } from '../../src/content/front-matter.js';

describe('parseFrontMatter', () => {
  it('parses YAML front matter from markdown', () => {
    const body = `---
title: Test Article
tags: javascript, typescript
---
# Hello World`;

    const result = parseFrontMatter(body);
    expect(result.hasFrontMatter).toBe(true);
    expect(result.extractedValues.title).toBe('Test Article');
    expect(result.extractedValues.tags).toBe('javascript, typescript');
    expect(result.cleanBody.trim()).toBe('# Hello World');
  });

  it('returns cleanly for markdown without front matter', () => {
    const body = '# Hello World\n\nSome content here.';
    const result = parseFrontMatter(body);
    expect(result.hasFrontMatter).toBe(false);
    expect(result.extractedValues).toEqual({});
    expect(result.cleanBody).toBe(body);
  });

  it('handles empty body', () => {
    const result = parseFrontMatter('');
    expect(result.hasFrontMatter).toBe(false);
    expect(result.cleanBody).toBe('');
  });

  it('handles body with only front matter', () => {
    const body = `---
title: Only Front Matter
---`;
    const result = parseFrontMatter(body);
    expect(result.hasFrontMatter).toBe(true);
    expect(result.extractedValues.title).toBe('Only Front Matter');
    expect(result.cleanBody.trim()).toBe('');
  });

  it('handles tags as array in front matter', () => {
    const body = `---
title: Test
tags:
  - javascript
  - typescript
---
Content`;
    const result = parseFrontMatter(body);
    expect(result.hasFrontMatter).toBe(true);
    expect(result.extractedValues.tags).toEqual(['javascript', 'typescript']);
  });
});

describe('mergeAndNormalize', () => {
  it('strips front matter and merges with JSON params', () => {
    const body = `---
title: FM Title
tags: javascript
---
# Content`;

    const result = mergeAndNormalize(body, { title: 'JSON Title' });
    expect(result.body.trim()).toBe('# Content');
    expect(result.params.title).toBe('JSON Title'); // JSON wins
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]!.field).toBe('title');
  });

  it('uses front matter values when no JSON params conflict', () => {
    const body = `---
title: FM Title
description: FM Description
---
Content`;

    const result = mergeAndNormalize(body, {});
    expect(result.params.title).toBe('FM Title');
    expect(result.params.description).toBe('FM Description');
    expect(result.conflicts).toHaveLength(0);
  });

  it('returns body as-is when no front matter present', () => {
    const body = '# Plain Content';
    const result = mergeAndNormalize(body, { title: 'My Title' });
    expect(result.body).toBe(body);
    expect(result.params.title).toBe('My Title');
    expect(result.conflicts).toHaveLength(0);
  });

  it('handles undefined body', () => {
    const result = mergeAndNormalize(undefined, { title: 'Test' });
    expect(result.body).toBe('');
    expect(result.params.title).toBe('Test');
  });

  it('normalizes array tags from front matter to comma-separated string', () => {
    const body = `---
tags:
  - javascript
  - typescript
---
Content`;

    const result = mergeAndNormalize(body, {});
    expect(result.params.tags).toBe('javascript, typescript');
  });

  it('maps cover_image from front matter to main_image param', () => {
    const body = `---
cover_image: https://example.com/img.jpg
---
Content`;

    const result = mergeAndNormalize(body, {});
    expect(result.params.main_image).toBe('https://example.com/img.jpg');
  });

  it('detects conflict between cover_image FM and main_image JSON', () => {
    const body = `---
cover_image: https://example.com/old.jpg
---
Content`;

    const result = mergeAndNormalize(body, { main_image: 'https://example.com/new.jpg' });
    expect(result.params.main_image).toBe('https://example.com/new.jpg');
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]!.field).toBe('main_image');
  });

  it('handles no conflicts when values match', () => {
    const body = `---
title: Same Title
---
Content`;

    const result = mergeAndNormalize(body, { title: 'Same Title' });
    expect(result.conflicts).toHaveLength(0);
  });
});
