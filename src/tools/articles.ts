import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ForemClient } from '../client/forem.js';
import { LinusError } from '../utils/errors.js';
import { mergeAndNormalize } from '../content/front-matter.js';

// ── Helpers ──────────────────────────────────────────────────────

function jsonResponse(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  };
}

function errorResponse(error: unknown) {
  if (error instanceof LinusError) return error.toMcpResponse();
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ error: 'api_error', message: String(error) }, null, 2),
      },
    ],
    isError: true,
  };
}

/**
 * Parse a dev.to URL to extract username and slug.
 * Handles: https://dev.to/username/slug-123
 */
function parseDevtoUrl(url: string): { username: string; slug: string } | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith('dev.to')) return null;
    // Path: /username/slug
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length >= 2) {
      return { username: segments[0]!, slug: segments[1]! };
    }
    return null;
  } catch {
    return null;
  }
}

// ── Handlers ─────────────────────────────────────────────────────

export async function handleGetArticle(
  client: ForemClient,
  args: { id?: number; path?: string; url?: string },
) {
  try {
    if (args.id !== undefined) {
      const article = await client.getArticleById(args.id);
      return jsonResponse(article);
    }

    if (args.url) {
      const parsed = parseDevtoUrl(args.url);
      if (!parsed) {
        throw new LinusError('invalid_request', `Could not parse dev.to URL: ${args.url}`);
      }
      const article = await client.getArticleByPath(parsed.username, parsed.slug);
      return jsonResponse(article);
    }

    if (args.path) {
      const segments = args.path.split('/').filter(Boolean);
      if (segments.length < 2) {
        throw new LinusError(
          'invalid_request',
          `Path must be in "username/slug" format. Got: ${args.path}`,
        );
      }
      const article = await client.getArticleByPath(segments[0]!, segments[1]!);
      return jsonResponse(article);
    }

    throw new LinusError('invalid_request', 'Provide one of: id (number), path (username/slug), or url (full dev.to URL).');
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleListMyArticles(
  client: ForemClient,
  args: { filter?: string; page?: number; per_page?: number },
) {
  try {
    const paginationParams = { page: args.page, per_page: args.per_page };
    let articles;

    switch (args.filter) {
      case 'published':
        articles = await client.listMyPublishedArticles(paginationParams);
        break;
      case 'unpublished':
        articles = await client.listMyUnpublishedArticles(paginationParams);
        break;
      case 'all':
      default:
        articles = await client.listMyAllArticles(paginationParams);
        break;
    }

    return jsonResponse(articles);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleListArticles(
  client: ForemClient,
  args: {
    tag?: string;
    username?: string;
    state?: string;
    top?: number;
    per_page?: number;
    page?: number;
    collection_id?: number;
  },
) {
  try {
    const articles = await client.listArticles({
      tag: args.tag,
      username: args.username,
      state: args.state as 'fresh' | 'rising' | 'all' | undefined,
      top: args.top,
      per_page: args.per_page,
      page: args.page,
      collection_id: args.collection_id,
    });
    return jsonResponse(articles);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleCreateArticle(
  client: ForemClient,
  args: {
    title: string;
    body_markdown?: string;
    tags?: string;
    series?: string;
    main_image?: string;
    canonical_url?: string;
    description?: string;
    organization_id?: number;
    published?: boolean;
  },
  defaultPublished: boolean,
) {
  try {
    const { body, params, conflicts } = mergeAndNormalize(args.body_markdown, {
      title: args.title,
      tags: args.tags,
      series: args.series,
      main_image: args.main_image,
      canonical_url: args.canonical_url,
      description: args.description,
      organization_id: args.organization_id,
    });

    const published = args.published ?? defaultPublished;

    const articleParams: Record<string, unknown> = {
      ...params,
      published,
    };
    if (args.body_markdown !== undefined) {
      articleParams.body_markdown = body;
    }

    const article = await client.createArticle(
      articleParams as Parameters<typeof client.createArticle>[0],
    );

    const response: Record<string, unknown> = { article };
    if (conflicts.length > 0) {
      response.front_matter_conflicts = conflicts;
      response.note =
        'Front matter values conflicted with parameters. Parameter values were used.';
    }

    return jsonResponse(response);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleUpdateArticle(
  client: ForemClient,
  args: {
    article_id: number;
    title?: string;
    body_markdown?: string;
    tags?: string;
    series?: string | null;
    main_image?: string | null;
    canonical_url?: string | null;
    description?: string;
    organization_id?: number | null;
    published?: boolean;
  },
) {
  try {
    const jsonParams: Record<string, unknown> = {};
    if (args.title !== undefined) jsonParams.title = args.title;
    if (args.tags !== undefined) jsonParams.tags = args.tags;
    if (args.series !== undefined) jsonParams.series = args.series;
    if (args.main_image !== undefined) jsonParams.main_image = args.main_image;
    if (args.canonical_url !== undefined) jsonParams.canonical_url = args.canonical_url;
    if (args.description !== undefined) jsonParams.description = args.description;
    if (args.organization_id !== undefined) jsonParams.organization_id = args.organization_id;

    const { body, params, conflicts } = mergeAndNormalize(args.body_markdown, jsonParams);

    const articleParams: Record<string, unknown> = { ...params };
    if (args.body_markdown !== undefined) {
      articleParams.body_markdown = body;
    }
    if (args.published !== undefined) {
      articleParams.published = args.published;
    }

    const article = await client.updateArticle(
      args.article_id,
      articleParams as Parameters<typeof client.updateArticle>[1],
    );

    const response: Record<string, unknown> = { article };
    if (conflicts.length > 0) {
      response.front_matter_conflicts = conflicts;
      response.note =
        'Front matter values conflicted with parameters. Parameter values were used.';
    }

    return jsonResponse(response);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleSetPublished(
  client: ForemClient,
  args: { article_id: number; published: boolean },
) {
  try {
    const article = await client.updateArticle(args.article_id, {
      published: args.published,
    });
    return jsonResponse({
      article,
      action: args.published ? 'published' : 'unpublished',
    });
  } catch (error) {
    return errorResponse(error);
  }
}

// ── Registration ─────────────────────────────────────────────────

export function registerArticleTools(
  server: McpServer,
  client: ForemClient,
  defaultPublished: boolean,
): void {
  server.tool(
    'linus_get_article',
    'Get a single article by ID (number), path (username/slug), or full dev.to URL.',
    {
      id: z.number().optional().describe('Article ID (number)'),
      path: z.string().optional().describe('Article path: username/slug'),
      url: z.string().optional().describe('Full dev.to article URL'),
    },
    async (args) => handleGetArticle(client, args),
  );

  server.tool(
    'linus_list_my_articles',
    "List the authenticated user's articles.",
    {
      filter: z
        .enum(['published', 'unpublished', 'all'])
        .optional()
        .default('all')
        .describe('Filter: published, unpublished, or all'),
      page: z.number().optional().describe('Pagination page'),
      per_page: z.number().optional().describe('Items per page'),
    },
    async (args) => handleListMyArticles(client, args),
  );

  server.tool(
    'linus_list_articles',
    'List/search public articles with filters.',
    {
      tag: z.string().optional().describe('Filter by tag'),
      username: z.string().optional().describe('Filter by username'),
      state: z
        .enum(['fresh', 'rising', 'all'])
        .optional()
        .describe('Article state filter'),
      top: z.number().optional().describe('Top articles in the last N days'),
      per_page: z.number().optional().describe('Items per page'),
      page: z.number().optional().describe('Pagination page'),
      collection_id: z.number().optional().describe('Filter by series/collection ID'),
    },
    async (args) => handleListArticles(client, args),
  );

  server.tool(
    'linus_create_article',
    'Create an article (defaults to draft). Uses front matter normalization.',
    {
      title: z.string().describe('Article title'),
      body_markdown: z.string().optional().describe('Markdown body'),
      tags: z.string().optional().describe('Comma-separated tags (max 4)'),
      series: z.string().optional().describe('Series name'),
      main_image: z.string().optional().describe('Cover image URL (must be absolute)'),
      canonical_url: z.string().optional().describe('Canonical URL for cross-posting'),
      description: z.string().optional().describe('SEO description'),
      organization_id: z.number().optional().describe('Organization ID to publish under'),
      published: z.boolean().optional().describe('Publish immediately (default: false)'),
    },
    async (args) => handleCreateArticle(client, args, defaultPublished),
  );

  server.tool(
    'linus_update_article',
    'Update an existing article by ID. All fields optional. Uses front matter normalization.',
    {
      article_id: z.number().describe('Article ID to update'),
      title: z.string().optional().describe('New title'),
      body_markdown: z.string().optional().describe('New markdown body'),
      tags: z.string().optional().describe('New comma-separated tags'),
      series: z.string().nullable().optional().describe('Series name (null to remove)'),
      main_image: z.string().nullable().optional().describe('Cover image URL (null to remove)'),
      canonical_url: z
        .string()
        .nullable()
        .optional()
        .describe('Canonical URL (null to remove)'),
      description: z.string().optional().describe('New description'),
      organization_id: z
        .number()
        .nullable()
        .optional()
        .describe('Organization ID (null to remove)'),
      published: z.boolean().optional().describe('Set published state'),
    },
    async (args) => handleUpdateArticle(client, args),
  );

  server.tool(
    'linus_set_published',
    'Set published state on an article (publish or unpublish).',
    {
      article_id: z.number().describe('Article ID'),
      published: z.boolean().describe('true to publish, false to unpublish'),
    },
    async (args) => handleSetPublished(client, args),
  );
}
