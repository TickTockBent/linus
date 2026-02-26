import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleGetArticle,
  handleListMyArticles,
  handleCreateArticle,
  handleUpdateArticle,
  handleSetPublished,
} from '../../src/tools/articles.js';
import type { ForemClient } from '../../src/client/forem.js';

function createMockClient(): ForemClient {
  return {
    getArticleById: vi.fn(),
    getArticleByPath: vi.fn(),
    listArticles: vi.fn(),
    listMyPublishedArticles: vi.fn(),
    listMyUnpublishedArticles: vi.fn(),
    listMyAllArticles: vi.fn(),
    createArticle: vi.fn(),
    updateArticle: vi.fn(),
  } as unknown as ForemClient;
}

describe('handleGetArticle', () => {
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  it('gets article by ID', async () => {
    (client.getArticleById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 42,
      title: 'Test',
    });

    const result = await handleGetArticle(client, { id: 42 });
    expect(result.content[0].text).toContain('"id": 42');
    expect(client.getArticleById).toHaveBeenCalledWith(42);
  });

  it('gets article by path', async () => {
    (client.getArticleByPath as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 99,
      title: 'Path Article',
    });

    const result = await handleGetArticle(client, { path: 'user/slug' });
    expect(result.content[0].text).toContain('Path Article');
    expect(client.getArticleByPath).toHaveBeenCalledWith('user', 'slug');
  });

  it('gets article by dev.to URL', async () => {
    (client.getArticleByPath as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 55,
      title: 'URL Article',
    });

    const result = await handleGetArticle(client, {
      url: 'https://dev.to/myuser/my-article-123',
    });
    expect(result.content[0].text).toContain('URL Article');
    expect(client.getArticleByPath).toHaveBeenCalledWith('myuser', 'my-article-123');
  });

  it('returns error when no identifier provided', async () => {
    const result = await handleGetArticle(client, {});
    expect((result as { isError: boolean }).isError).toBe(true);
    expect(result.content[0].text).toContain('invalid_request');
  });

  it('returns error for invalid URL', async () => {
    const result = await handleGetArticle(client, { url: 'https://example.com/not-devto' });
    expect((result as { isError: boolean }).isError).toBe(true);
  });
});

describe('handleListMyArticles', () => {
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  it('lists published articles', async () => {
    (client.listMyPublishedArticles as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 1 },
    ]);

    const result = await handleListMyArticles(client, { filter: 'published' });
    expect(result.content[0].text).toContain('"id": 1');
    expect(client.listMyPublishedArticles).toHaveBeenCalled();
  });

  it('lists unpublished articles', async () => {
    (client.listMyUnpublishedArticles as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await handleListMyArticles(client, { filter: 'unpublished' });
    expect(client.listMyUnpublishedArticles).toHaveBeenCalled();
  });

  it('lists all articles by default', async () => {
    (client.listMyAllArticles as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await handleListMyArticles(client, {});
    expect(client.listMyAllArticles).toHaveBeenCalled();
  });
});

describe('handleCreateArticle', () => {
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  it('creates a draft article by default', async () => {
    (client.createArticle as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 100,
      title: 'New Article',
      published: false,
    });

    const result = await handleCreateArticle(
      client,
      { title: 'New Article', body_markdown: '# Content' },
      false,
    );

    expect(result.content[0].text).toContain('"published": false');
    expect(client.createArticle).toHaveBeenCalledWith(
      expect.objectContaining({ published: false }),
    );
  });

  it('strips front matter and reports conflicts', async () => {
    (client.createArticle as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 101,
      title: 'JSON Title',
    });

    const result = await handleCreateArticle(
      client,
      {
        title: 'JSON Title',
        body_markdown: `---
title: FM Title
---
Content here`,
      },
      false,
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.front_matter_conflicts).toBeDefined();
    expect(parsed.front_matter_conflicts).toHaveLength(1);

    // Verify the client received clean body (no front matter)
    const callArgs = (client.createArticle as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArgs.body_markdown).not.toContain('---');
    expect(callArgs.title).toBe('JSON Title');
  });
});

describe('handleUpdateArticle', () => {
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  it('updates article fields', async () => {
    (client.updateArticle as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 42,
      title: 'Updated',
    });

    const result = await handleUpdateArticle(client, {
      article_id: 42,
      title: 'Updated',
    });

    expect(result.content[0].text).toContain('Updated');
    expect(client.updateArticle).toHaveBeenCalledWith(42, expect.objectContaining({ title: 'Updated' }));
  });
});

describe('handleSetPublished', () => {
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  it('publishes an article', async () => {
    (client.updateArticle as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 42,
      published: true,
    });

    const result = await handleSetPublished(client, { article_id: 42, published: true });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.action).toBe('published');
    expect(client.updateArticle).toHaveBeenCalledWith(42, { published: true });
  });

  it('unpublishes an article', async () => {
    (client.updateArticle as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 42,
      published: false,
    });

    const result = await handleSetPublished(client, { article_id: 42, published: false });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.action).toBe('unpublished');
  });
});
