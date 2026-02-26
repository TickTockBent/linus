import matter from 'gray-matter';
import type { FrontMatterResult, MergeResult } from '../types.js';

/** Known front matter fields that map to article JSON parameters. */
const KNOWN_FIELDS = [
  'title',
  'published',
  'description',
  'tags',
  'series',
  'canonical_url',
  'cover_image',
  'main_image',
] as const;

/**
 * Parse YAML front matter from markdown body.
 * Returns the clean body (without front matter) and extracted values.
 */
export function parseFrontMatter(body: string): FrontMatterResult {
  if (!body || !body.trim()) {
    return { cleanBody: body ?? '', extractedValues: {}, hasFrontMatter: false };
  }

  try {
    const parsed = matter(body);
    const hasFrontMatter = Object.keys(parsed.data).length > 0;

    return {
      cleanBody: parsed.content,
      extractedValues: parsed.data as Record<string, unknown>,
      hasFrontMatter,
    };
  } catch {
    // If front matter parsing fails, return the body as-is
    return { cleanBody: body, extractedValues: {}, hasFrontMatter: false };
  }
}

/**
 * Merge front matter values with JSON parameters.
 * JSON parameters take precedence (inverse of the API's own behavior).
 * Strips front matter from the body to prevent the silent-override bug.
 *
 * Returns the clean body, merged params, and any conflicts detected.
 */
export function mergeAndNormalize(
  body: string | undefined,
  jsonParams: Record<string, unknown>,
): MergeResult {
  if (!body) {
    return { body: '', params: { ...jsonParams }, conflicts: [] };
  }

  const { cleanBody, extractedValues, hasFrontMatter } = parseFrontMatter(body);

  if (!hasFrontMatter) {
    return { body: cleanBody, params: { ...jsonParams }, conflicts: [] };
  }

  const mergedParams: Record<string, unknown> = {};
  const conflicts: MergeResult['conflicts'] = [];

  // Start with front matter values for known fields
  for (const field of KNOWN_FIELDS) {
    if (field in extractedValues) {
      // Normalize tags: front matter may have array, API expects comma-separated string
      if (field === 'tags') {
        mergedParams[field] = normalizeTags(extractedValues[field]);
      } else if (field === 'cover_image') {
        // Map cover_image from front matter to main_image param
        mergedParams['main_image'] = extractedValues[field];
      } else {
        mergedParams[field] = extractedValues[field];
      }
    }
  }

  // JSON params override front matter values
  for (const [key, value] of Object.entries(jsonParams)) {
    if (value === undefined) continue;

    const frontMatterKey = key === 'main_image' ? 'cover_image' : key;
    const frontMatterValue =
      frontMatterKey in extractedValues
        ? extractedValues[frontMatterKey]
        : key in extractedValues
          ? extractedValues[key]
          : undefined;

    if (frontMatterValue !== undefined) {
      const normalizedFmValue =
        key === 'tags' ? normalizeTags(frontMatterValue) : frontMatterValue;
      const normalizedJsonValue = key === 'tags' ? normalizeTags(value) : value;

      if (String(normalizedFmValue) !== String(normalizedJsonValue)) {
        conflicts.push({
          field: key,
          frontMatterValue: normalizedFmValue,
          jsonValue: normalizedJsonValue,
        });
      }
    }

    mergedParams[key] = value;
  }

  return { body: cleanBody, params: mergedParams, conflicts };
}

function normalizeTags(tags: unknown): string {
  if (Array.isArray(tags)) {
    return tags.map(String).join(', ');
  }
  if (typeof tags === 'string') {
    return tags;
  }
  return String(tags ?? '');
}
