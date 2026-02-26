/**
 * Linus type definitions.
 * Re-exports from generated OpenAPI types + custom interfaces.
 */

import type { components, operations } from './types/forem-api.js';

// ── Generated type aliases ──────────────────────────────────────────

export type ArticleIndex = components['schemas']['ArticleIndex'];
export type ArticleInput = components['schemas']['Article'];
export type Organization = components['schemas']['Organization'];
export type FollowedTag = components['schemas']['FollowedTag'];
export type Tag = components['schemas']['Tag'];
export type User = components['schemas']['User'];
export type SharedUser = components['schemas']['SharedUser'];
export type SharedOrganization = components['schemas']['SharedOrganization'];
export type Comment = components['schemas']['Comment'];

export type GetArticlesQuery = operations['getArticles']['parameters']['query'];

// ── Extended article type (full article response, not in OpenAPI spec) ──

/** Full article response including body_markdown (returned by get-by-id, create, update) */
export interface ArticleFull extends ArticleIndex {
  body_html: string;
  body_markdown: string;
  comments_count: number;
  collection_id: number | null;
  published: boolean;
}

// ── User me response (extended beyond OpenAPI User schema) ──

export interface UserMe {
  type_of: string;
  id: number;
  username: string;
  name: string;
  summary: string | null;
  twitter_username: string | null;
  github_username: string | null;
  website_url: string | null;
  location: string | null;
  joined_at: string;
  profile_image: string;
}

// ── Comment with children (threaded) ──

export interface CommentFull {
  type_of: string;
  id_code: string;
  created_at: string;
  body_html: string;
  user: SharedUser;
  children: CommentFull[];
}

// ── Reading list item ──

export interface ReadingListItem {
  type_of: string;
  id: number;
  status: string;
  created_at: string;
  article: ArticleIndex;
}

// ── Follower ──

export interface Follower {
  type_of: string;
  id: number;
  created_at: string;
  user_id: number;
  name: string;
  path: string;
  username: string;
  profile_image: string;
}

// ── Org member ──

export interface OrgMember {
  type_of: string;
  id: number;
  username: string;
  name: string;
  summary: string | null;
  twitter_username: string | null;
  github_username: string | null;
  profile_image: string;
}

// ── Auth state ──

export interface AuthState {
  authenticated: boolean;
  user: UserMe | null;
  validatedAt: number;
}

// ── Linus error codes ──

export type LinusErrorCode =
  | 'auth_failed'
  | 'rate_limited'
  | 'not_found'
  | 'validation_failed'
  | 'invalid_request'
  | 'forbidden'
  | 'front_matter_conflict'
  | 'liquid_tag_detected'
  | 'image_not_absolute'
  | 'unpublish_only'
  | 'api_error';

// ── Validation types ──

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  severity: ValidationSeverity;
  code: LinusErrorCode;
  message: string;
  line?: number;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

// ── Front matter types ──

export interface FrontMatterResult {
  cleanBody: string;
  extractedValues: Record<string, unknown>;
  hasFrontMatter: boolean;
}

export interface MergeResult {
  body: string;
  params: Record<string, unknown>;
  conflicts: Array<{ field: string; frontMatterValue: unknown; jsonValue: unknown }>;
}

// ── Liquid tag types ──

export interface LiquidTagMatch {
  tag: string;
  argument: string;
  fullMatch: string;
  lineNumber: number;
  crossPostSafe: boolean;
  hasEndTag: boolean;
}

export interface LiquidTagReport {
  tags: LiquidTagMatch[];
  hasCrossPostUnsafe: boolean;
}

// ── Crosspost result ──

export interface CrosspostResult {
  body: string;
  canonicalUrl: string;
  liquidTagReport: LiquidTagReport;
}

// ── Reaction types ──

export type ReactionCategory = 'like' | 'unicorn' | 'readinglist';
export type ReactableType = 'Article' | 'Comment';

export interface ReactionResult {
  result: string;
  category: ReactionCategory;
  reactable_id: number;
  reactable_type: ReactableType;
}
