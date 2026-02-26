import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ForemClient } from '../client/forem.js';
import { LinusError } from '../utils/errors.js';

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

// ── Handlers ─────────────────────────────────────────────────────

export async function handleGetComments(
  client: ForemClient,
  args: { article_id?: number; comment_id?: string },
) {
  try {
    if (args.comment_id) {
      const comment = await client.getCommentById(args.comment_id);
      return jsonResponse(comment);
    }
    if (args.article_id !== undefined) {
      const comments = await client.getCommentsByArticleId(args.article_id);
      return jsonResponse(comments);
    }
    throw new LinusError(
      'invalid_request',
      'Provide either article_id (for comment thread) or comment_id (for single comment).',
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleListTags(
  client: ForemClient,
  args: { followed?: boolean; page?: number; per_page?: number },
) {
  try {
    if (args.followed) {
      const tags = await client.getFollowedTags();
      return jsonResponse(tags);
    }
    const tags = await client.listTags({ page: args.page, per_page: args.per_page });
    return jsonResponse(tags);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleGetReadingList(
  client: ForemClient,
  args: { page?: number; per_page?: number },
) {
  try {
    const readingList = await client.getReadingList({
      page: args.page,
      per_page: args.per_page,
    });
    return jsonResponse(readingList);
  } catch (error) {
    return errorResponse(error);
  }
}

// ── Registration ─────────────────────────────────────────────────

export function registerReadingTools(server: McpServer, client: ForemClient): void {
  server.tool(
    'linus_get_comments',
    'Get comments by article_id (full thread) or comment_id (single comment with descendants).',
    {
      article_id: z.number().optional().describe('Article ID to get comments for'),
      comment_id: z.string().optional().describe('Single comment ID'),
    },
    async (args) => handleGetComments(client, args),
  );

  server.tool(
    'linus_list_tags',
    'List tags by popularity, or get followed tags with followed=true.',
    {
      followed: z
        .boolean()
        .optional()
        .default(false)
        .describe("If true, returns the user's followed tags instead"),
      page: z.number().optional().describe('Pagination page'),
      per_page: z.number().optional().describe('Items per page'),
    },
    async (args) => handleListTags(client, args),
  );

  server.tool(
    'linus_get_reading_list',
    "Get the authenticated user's reading list (bookmarks).",
    {
      page: z.number().optional().describe('Pagination page'),
      per_page: z.number().optional().describe('Items per page'),
    },
    async (args) => handleGetReadingList(client, args),
  );
}
