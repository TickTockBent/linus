import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleToggleReaction } from '../../src/tools/reactions.js';
import type { ForemClient } from '../../src/client/forem.js';

function makeClient(overrides: Partial<ForemClient> = {}): ForemClient {
  return {
    toggleReaction: vi.fn(),
    ...overrides,
  } as unknown as ForemClient;
}

describe('handleToggleReaction', () => {
  let client: ForemClient;

  beforeEach(() => {
    client = makeClient();
  });

  it('toggles a like reaction on an article', async () => {
    const mockResult = {
      result: 'created',
      category: 'like',
      reactable_id: 123,
      reactable_type: 'Article',
    };
    vi.mocked(client.toggleReaction).mockResolvedValue(mockResult);

    const result = await handleToggleReaction(client, {
      category: 'like',
      reactable_id: 123,
      reactable_type: 'Article',
    });

    expect(result.content[0].text).toContain('"result": "created"');
    expect(client.toggleReaction).toHaveBeenCalledWith('like', 123, 'Article');
  });

  it('supports all reaction categories', async () => {
    const categories = ['like', 'unicorn', 'exploding_head', 'raised_hands', 'fire'];

    for (const category of categories) {
      vi.mocked(client.toggleReaction).mockResolvedValue({
        result: 'created',
        category,
        reactable_id: 1,
        reactable_type: 'Article',
      });

      const result = await handleToggleReaction(client, {
        category,
        reactable_id: 1,
        reactable_type: 'Article',
      });

      expect(result.content[0].text).toContain(`"category": "${category}"`);
    }

    expect(client.toggleReaction).toHaveBeenCalledTimes(5);
  });

  it('supports all reactable types', async () => {
    const types = ['Article', 'Comment', 'User'];

    for (const reactableType of types) {
      vi.mocked(client.toggleReaction).mockResolvedValue({
        result: 'created',
        category: 'like',
        reactable_id: 1,
        reactable_type: reactableType,
      });

      const result = await handleToggleReaction(client, {
        category: 'like',
        reactable_id: 1,
        reactable_type: reactableType,
      });

      expect(result.content[0].text).toContain(`"reactable_type": "${reactableType}"`);
    }
  });

  it('returns error response on API failure', async () => {
    const { LinusError } = await import('../../src/utils/errors.js');
    vi.mocked(client.toggleReaction).mockRejectedValue(
      new LinusError('auth_failed', 'Authentication failed.', { httpStatus: 401 }),
    );

    const result = await handleToggleReaction(client, {
      category: 'like',
      reactable_id: 123,
      reactable_type: 'Article',
    });

    expect(result).toHaveProperty('isError', true);
    expect(result.content[0].text).toContain('auth_failed');
  });
});
