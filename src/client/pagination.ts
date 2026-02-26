/**
 * Generic page-based pagination helper.
 * Iterates until a batch returns fewer items than perPage.
 */
export async function paginateAll<T>(
  fetchPage: (page: number, perPage: number) => Promise<T[]>,
  perPage: number = 30,
): Promise<T[]> {
  const results: T[] = [];
  let page = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const batch = await fetchPage(page, perPage);
    results.push(...batch);
    if (batch.length < perPage) break;
    page++;
  }

  return results;
}
