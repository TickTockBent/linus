import type { ValidationResult, ValidationIssue } from '../types.js';
import { parseFrontMatter } from './front-matter.js';
import { detectLiquidTags } from './liquid-tags.js';
import { extractImageUrls, isSubstantialContent } from './markdown.js';

export interface ValidateArticleParams {
  title?: string;
  body_markdown?: string;
  tags?: string | string[];
  main_image?: string;
  canonical_url?: string;
  description?: string;
  published?: boolean;
}

/**
 * Full validation pipeline for an article.
 * Checks: tags, images, front matter conflicts, liquid tags, content quality.
 */
export function validateArticle(params: ValidateArticleParams): ValidationResult {
  const issues: ValidationIssue[] = [];

  // ── Title validation ────────────────────────────────────────────
  if (!params.title && !params.body_markdown) {
    issues.push({
      severity: 'error',
      code: 'validation_failed',
      message: 'Article must have a title or body_markdown.',
    });
  }

  // ── Tag validation ──────────────────────────────────────────────
  if (params.tags) {
    const tagList = normalizeTagList(params.tags);

    if (tagList.length > 4) {
      issues.push({
        severity: 'error',
        code: 'validation_failed',
        message: `Too many tags (${tagList.length}). Maximum is 4.`,
      });
    }

    for (const tag of tagList) {
      if (!/^[a-z0-9_]+$/.test(tag)) {
        issues.push({
          severity: 'error',
          code: 'validation_failed',
          message: `Invalid tag "${tag}". Tags must be lowercase alphanumeric with underscores only.`,
        });
      }
    }
  }

  // ── Image validation ────────────────────────────────────────────
  if (params.main_image && !/^https?:\/\//i.test(params.main_image)) {
    issues.push({
      severity: 'error',
      code: 'image_not_absolute',
      message: `Cover image URL must be absolute: "${params.main_image}"`,
    });
  }

  if (params.body_markdown) {
    const images = extractImageUrls(params.body_markdown);
    for (const image of images) {
      if (!image.isAbsolute) {
        issues.push({
          severity: 'error',
          code: 'image_not_absolute',
          message: `Image on line ${image.lineNumber} uses non-absolute URL: "${image.url}"`,
          line: image.lineNumber,
        });
      }
    }
  }

  // ── Front matter conflict detection ─────────────────────────────
  if (params.body_markdown) {
    const { extractedValues, hasFrontMatter } = parseFrontMatter(params.body_markdown);

    if (hasFrontMatter) {
      const jsonFields: Record<string, unknown> = {};
      if (params.title !== undefined) jsonFields['title'] = params.title;
      if (params.tags !== undefined) jsonFields['tags'] = params.tags;
      if (params.description !== undefined) jsonFields['description'] = params.description;
      if (params.main_image !== undefined) jsonFields['main_image'] = params.main_image;

      for (const [field, jsonValue] of Object.entries(jsonFields)) {
        const frontMatterKey = field === 'main_image' ? 'cover_image' : field;
        const frontMatterValue = extractedValues[frontMatterKey] ?? extractedValues[field];

        if (frontMatterValue !== undefined && String(frontMatterValue) !== String(jsonValue)) {
          issues.push({
            severity: 'warning',
            code: 'front_matter_conflict',
            message: `Front matter "${frontMatterKey}" value "${String(frontMatterValue)}" conflicts with parameter "${String(jsonValue)}". Parameter value will be used.`,
          });
        }
      }
    }
  }

  // ── Liquid tag detection ────────────────────────────────────────
  if (params.body_markdown) {
    const liquidReport = detectLiquidTags(params.body_markdown);
    for (const tag of liquidReport.tags) {
      issues.push({
        severity: 'info',
        code: 'liquid_tag_detected',
        message: `Liquid tag {% ${tag.tag} ${tag.argument} %} on line ${tag.lineNumber}${tag.crossPostSafe ? '' : ' (not cross-post safe)'}`,
        line: tag.lineNumber,
      });
    }
  }

  // ── Content quality ─────────────────────────────────────────────
  if (params.body_markdown && !isSubstantialContent(params.body_markdown)) {
    issues.push({
      severity: 'warning',
      code: 'validation_failed',
      message: 'Article body appears to lack substantial content.',
    });
  }

  const hasErrors = issues.some((issue) => issue.severity === 'error');

  return {
    valid: !hasErrors,
    issues,
  };
}

function normalizeTagList(tags: string | string[]): string[] {
  if (Array.isArray(tags)) return tags.map((t) => t.trim().toLowerCase());
  return tags
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}
