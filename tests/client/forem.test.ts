import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForemClient } from '../../src/client/forem.js';
import { LinusError } from '../../src/utils/errors.js';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('ForemClient', () => {
  let client: ForemClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new ForemClient({ apiKey: 'test-key' });
  });

  describe('getMe', () => {
    it('fetches authenticated user profile', async () => {
      const userData = {
        id: 1,
        username: 'testuser',
        name: 'Test User',
        type_of: 'user',
      };
      mockFetch.mockResolvedValueOnce(jsonResponse(userData));

      const result = await client.getMe();
      expect(result.username).toBe('testuser');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://dev.to/api/users/me',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({ 'api-key': 'test-key' }),
        }),
      );
    });
  });

  describe('getArticleById', () => {
    it('fetches article by ID', async () => {
      const articleData = { id: 42, title: 'Test Article', body_markdown: '# Hello' };
      mockFetch.mockResolvedValueOnce(jsonResponse(articleData));

      const result = await client.getArticleById(42);
      expect(result.title).toBe('Test Article');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://dev.to/api/articles/42',
        expect.any(Object),
      );
    });
  });

  describe('getArticleByPath', () => {
    it('fetches article by username/slug', async () => {
      const articleData = { id: 99, title: 'Path Article' };
      mockFetch.mockResolvedValueOnce(jsonResponse(articleData));

      const result = await client.getArticleByPath('testuser', 'my-article');
      expect(result.title).toBe('Path Article');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://dev.to/api/articles/testuser/my-article',
        expect.any(Object),
      );
    });
  });

  describe('listArticles', () => {
    it('lists articles with query params', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse([{ id: 1 }, { id: 2 }]));

      const result = await client.listArticles({ tag: 'javascript', per_page: 10 });
      expect(result).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('tag=javascript'),
        expect.any(Object),
      );
    });

    it('lists articles without params', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse([]));

      await client.listArticles();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://dev.to/api/articles',
        expect.any(Object),
      );
    });
  });

  describe('createArticle', () => {
    it('creates a draft article', async () => {
      const responseData = { id: 123, title: 'New Draft', published: false };
      mockFetch.mockResolvedValueOnce(jsonResponse(responseData, 201));

      const result = await client.createArticle({
        title: 'New Draft',
        body_markdown: '# Content',
        published: false,
      });
      expect(result.title).toBe('New Draft');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://dev.to/api/articles',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"title":"New Draft"'),
        }),
      );
    });
  });

  describe('updateArticle', () => {
    it('updates an existing article', async () => {
      const responseData = { id: 42, title: 'Updated Title' };
      mockFetch.mockResolvedValueOnce(jsonResponse(responseData));

      const result = await client.updateArticle(42, { title: 'Updated Title' });
      expect(result.title).toBe('Updated Title');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://dev.to/api/articles/42',
        expect.objectContaining({ method: 'PUT' }),
      );
    });
  });

  describe('error handling', () => {
    it('throws LinusError for 401', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ error: 'unauthorized', status: 401 }, 401),
      );

      try {
        await client.getMe();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(LinusError);
        expect((error as LinusError).code).toBe('auth_failed');
      }
    });

    it('throws LinusError for 404', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ error: 'not found', status: 404 }, 404),
      );

      try {
        await client.getArticleById(999999);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(LinusError);
        expect((error as LinusError).code).toBe('not_found');
      }
    });

    it('retries on 429 with backoff', async () => {
      mockFetch
        .mockResolvedValueOnce(
          jsonResponse({ error: 'Rate limit reached', status: 429 }, 429),
        )
        .mockResolvedValueOnce(jsonResponse({ id: 1, title: 'Success' }));

      const result = await client.getArticleById(1);
      expect(result.title).toBe('Success');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    }, 10000);

    it('throws after max retries on 429', async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({ error: 'Rate limit reached', status: 429 }, 429),
      );

      try {
        await client.getArticleById(1);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(LinusError);
        expect((error as LinusError).code).toBe('rate_limited');
      }
    }, 30000);

    it('throws on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      try {
        await client.getMe();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(LinusError);
        expect((error as LinusError).code).toBe('api_error');
        expect((error as LinusError).message).toContain('Network error');
      }
    });
  });

  describe('custom base URL', () => {
    it('uses custom base URL', async () => {
      const customClient = new ForemClient({
        apiKey: 'test-key',
        baseUrl: 'https://myforem.example.com/api',
      });
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1 }));

      await customClient.getMe();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://myforem.example.com/api/users/me',
        expect.any(Object),
      );
    });

    it('strips trailing slash from base URL', async () => {
      const customClient = new ForemClient({
        apiKey: 'test-key',
        baseUrl: 'https://myforem.example.com/api/',
      });
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1 }));

      await customClient.getMe();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://myforem.example.com/api/users/me',
        expect.any(Object),
      );
    });
  });

  describe('comments', () => {
    it('gets comments by article ID', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse([{ id_code: 'abc' }]));
      const result = await client.getCommentsByArticleId(42);
      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://dev.to/api/comments?a_id=42',
        expect.any(Object),
      );
    });

    it('gets single comment by ID', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id_code: 'abc' }));
      const result = await client.getCommentById('abc');
      expect(result.id_code).toBe('abc');
    });
  });

  describe('reactions', () => {
    it('toggles a reaction', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ result: 'created', category: 'like', reactable_id: 42 }),
      );
      const result = await client.toggleReaction('like', 42, 'Article');
      expect(result.result).toBe('created');
    });
  });
});
