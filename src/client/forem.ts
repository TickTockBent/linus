import { buildHeaders } from '../utils/headers.js';
import { LinusError, mapHttpStatusToError } from '../utils/errors.js';
import { RateLimiter } from './rate-limiter.js';
import type {
  ArticleFull,
  ArticleIndex,
  CommentFull,
  FollowedTag,
  Follower,
  Organization,
  OrgMember,
  ReactionCategory,
  ReactionResult,
  ReactableType,
  ReadingListItem,
  Tag,
  User,
  UserMe,
} from '../types.js';

const MAX_RETRIES = 3;

export interface ForemClientConfig {
  apiKey: string;
  baseUrl?: string;
}

export class ForemClient {
  private readonly headers: Record<string, string>;
  private readonly baseUrl: string;
  private readonly rateLimiter: RateLimiter;

  constructor(config: ForemClientConfig) {
    this.headers = buildHeaders(config.apiKey);
    this.baseUrl = (config.baseUrl ?? 'https://dev.to/api').replace(/\/$/, '');
    this.rateLimiter = new RateLimiter();
  }

  // ── Private request helper ──────────────────────────────────────

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    rateLimitBucket?: 'create' | 'update',
  ): Promise<T> {
    if (rateLimitBucket === 'create') {
      await this.rateLimiter.acquireCreate();
    } else if (rateLimitBucket === 'update') {
      await this.rateLimiter.acquireUpdate();
    }

    let lastError: LinusError | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const url = `${this.baseUrl}${path}`;
      const fetchOptions: RequestInit = {
        method,
        headers: this.headers,
      };
      if (body !== undefined) {
        fetchOptions.body = JSON.stringify(body);
      }

      let response: Response;
      try {
        response = await fetch(url, fetchOptions);
      } catch (fetchError) {
        throw new LinusError('api_error', `Network error: ${String(fetchError)}`, {
          path,
          method,
        });
      }

      if (response.status === 429) {
        const delay = this.rateLimiter.recordRateLimitHit();
        lastError = new LinusError('rate_limited', 'Rate limit exceeded', {
          httpStatus: 429,
          retryAfter: delay / 1000,
        });
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw lastError;
      }

      this.rateLimiter.resetBackoff();

      if (response.status === 204) {
        return undefined as T;
      }

      let responseBody: unknown;
      try {
        responseBody = await response.json();
      } catch {
        responseBody = { error: `Non-JSON response (${response.status})` };
      }

      if (!response.ok) {
        throw mapHttpStatusToError(response.status, responseBody);
      }

      return responseBody as T;
    }

    throw lastError ?? new LinusError('api_error', 'Request failed after retries');
  }

  // ── Articles ────────────────────────────────────────────────────

  async getArticleById(articleId: number): Promise<ArticleFull> {
    return this.request<ArticleFull>('GET', `/articles/${articleId}`);
  }

  async getArticleByPath(username: string, slug: string): Promise<ArticleFull> {
    return this.request<ArticleFull>('GET', `/articles/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`);
  }

  async listArticles(params?: {
    page?: number;
    per_page?: number;
    tag?: string;
    tags?: string;
    tags_exclude?: string;
    username?: string;
    state?: 'fresh' | 'rising' | 'all';
    top?: number;
    collection_id?: number;
  }): Promise<ArticleIndex[]> {
    const searchParams = new URLSearchParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          searchParams.set(key, String(value));
        }
      }
    }
    const queryString = searchParams.toString();
    const path = queryString ? `/articles?${queryString}` : '/articles';
    return this.request<ArticleIndex[]>('GET', path);
  }

  async listMyArticles(params?: {
    page?: number;
    per_page?: number;
  }): Promise<ArticleIndex[]> {
    const searchParams = new URLSearchParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) searchParams.set(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    const path = queryString ? `/articles/me?${queryString}` : '/articles/me';
    return this.request<ArticleIndex[]>('GET', path);
  }

  async listMyPublishedArticles(params?: {
    page?: number;
    per_page?: number;
  }): Promise<ArticleIndex[]> {
    const searchParams = new URLSearchParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) searchParams.set(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    const path = queryString ? `/articles/me/published?${queryString}` : '/articles/me/published';
    return this.request<ArticleIndex[]>('GET', path);
  }

  async listMyUnpublishedArticles(params?: {
    page?: number;
    per_page?: number;
  }): Promise<ArticleIndex[]> {
    const searchParams = new URLSearchParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) searchParams.set(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    const path = queryString
      ? `/articles/me/unpublished?${queryString}`
      : '/articles/me/unpublished';
    return this.request<ArticleIndex[]>('GET', path);
  }

  async listMyAllArticles(params?: {
    page?: number;
    per_page?: number;
  }): Promise<ArticleIndex[]> {
    const searchParams = new URLSearchParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) searchParams.set(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    const path = queryString ? `/articles/me/all?${queryString}` : '/articles/me/all';
    return this.request<ArticleIndex[]>('GET', path);
  }

  async createArticle(article: {
    title: string;
    body_markdown?: string;
    published?: boolean;
    series?: string | null;
    main_image?: string | null;
    canonical_url?: string | null;
    description?: string;
    tags?: string;
    organization_id?: number | null;
  }): Promise<ArticleFull> {
    return this.request<ArticleFull>('POST', '/articles', { article }, 'create');
  }

  async updateArticle(
    articleId: number,
    article: {
      title?: string;
      body_markdown?: string;
      published?: boolean;
      series?: string | null;
      main_image?: string | null;
      canonical_url?: string | null;
      description?: string;
      tags?: string;
      organization_id?: number | null;
    },
  ): Promise<ArticleFull> {
    return this.request<ArticleFull>('PUT', `/articles/${articleId}`, { article }, 'update');
  }

  // ── Comments ────────────────────────────────────────────────────

  async getCommentsByArticleId(articleId: number): Promise<CommentFull[]> {
    return this.request<CommentFull[]>('GET', `/comments?a_id=${articleId}`);
  }

  async getCommentById(commentId: string): Promise<CommentFull> {
    return this.request<CommentFull>('GET', `/comments/${encodeURIComponent(commentId)}`);
  }

  // ── Tags ────────────────────────────────────────────────────────

  async listTags(params?: { page?: number; per_page?: number }): Promise<Tag[]> {
    const searchParams = new URLSearchParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) searchParams.set(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    const path = queryString ? `/tags?${queryString}` : '/tags';
    return this.request<Tag[]>('GET', path);
  }

  async getFollowedTags(): Promise<FollowedTag[]> {
    return this.request<FollowedTag[]>('GET', '/follows/tags');
  }

  // ── Users ───────────────────────────────────────────────────────

  async getMe(): Promise<UserMe> {
    return this.request<UserMe>('GET', '/users/me');
  }

  async getUserById(userId: number): Promise<User> {
    return this.request<User>('GET', `/users/${userId}`);
  }

  async getUserByUsername(username: string): Promise<User> {
    return this.request<User>('GET', `/users/by_username?url=${encodeURIComponent(username)}`);
  }

  async getFollowers(params?: { page?: number; per_page?: number }): Promise<Follower[]> {
    const searchParams = new URLSearchParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) searchParams.set(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    const path = queryString ? `/followers/users?${queryString}` : '/followers/users';
    return this.request<Follower[]>('GET', path);
  }

  // ── Organizations ───────────────────────────────────────────────

  async getOrganization(orgUsername: string): Promise<Organization> {
    return this.request<Organization>(
      'GET',
      `/organizations/${encodeURIComponent(orgUsername)}`,
    );
  }

  async getOrgArticles(
    orgUsername: string,
    params?: { page?: number; per_page?: number },
  ): Promise<ArticleIndex[]> {
    const searchParams = new URLSearchParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) searchParams.set(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    const path = queryString
      ? `/organizations/${encodeURIComponent(orgUsername)}/articles?${queryString}`
      : `/organizations/${encodeURIComponent(orgUsername)}/articles`;
    return this.request<ArticleIndex[]>('GET', path);
  }

  async getOrgMembers(
    orgUsername: string,
    params?: { page?: number; per_page?: number },
  ): Promise<OrgMember[]> {
    const searchParams = new URLSearchParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) searchParams.set(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    const path = queryString
      ? `/organizations/${encodeURIComponent(orgUsername)}/users?${queryString}`
      : `/organizations/${encodeURIComponent(orgUsername)}/users`;
    return this.request<OrgMember[]>('GET', path);
  }

  // ── Reading List ────────────────────────────────────────────────

  async getReadingList(params?: {
    page?: number;
    per_page?: number;
  }): Promise<ReadingListItem[]> {
    const searchParams = new URLSearchParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) searchParams.set(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    const path = queryString ? `/readinglist?${queryString}` : '/readinglist';
    return this.request<ReadingListItem[]>('GET', path);
  }

  // ── Reactions ───────────────────────────────────────────────────

  async toggleReaction(
    category: ReactionCategory,
    reactableId: number,
    reactableType: ReactableType,
  ): Promise<ReactionResult> {
    const searchParams = new URLSearchParams({
      category,
      reactable_id: String(reactableId),
      reactable_type: reactableType,
    });
    return this.request<ReactionResult>('POST', `/reactions/toggle?${searchParams.toString()}`);
  }
}
