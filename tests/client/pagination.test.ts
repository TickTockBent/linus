import { describe, it, expect } from 'vitest';
import { paginateAll } from '../../src/client/pagination.js';

describe('paginateAll', () => {
  it('collects all pages until a short batch is returned', async () => {
    const pages = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8], // Short batch — end
    ];
    let callCount = 0;

    const results = await paginateAll(async (page, perPage) => {
      expect(perPage).toBe(3);
      expect(page).toBe(callCount + 1);
      return pages[callCount++]!;
    }, 3);

    expect(results).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(callCount).toBe(3);
  });

  it('handles single page with fewer items than perPage', async () => {
    const results = await paginateAll(async () => ['a', 'b'], 10);
    expect(results).toEqual(['a', 'b']);
  });

  it('handles empty first page', async () => {
    const results = await paginateAll(async () => [], 10);
    expect(results).toEqual([]);
  });

  it('handles exact page size match (fetches one extra page)', async () => {
    let callCount = 0;
    const pages = [
      [1, 2, 3],
      [], // Exact match on first page — second returns empty
    ];

    const results = await paginateAll(async () => {
      return pages[callCount++]!;
    }, 3);

    expect(results).toEqual([1, 2, 3]);
    expect(callCount).toBe(2);
  });
});
