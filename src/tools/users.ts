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

export async function handleGetUser(
  client: ForemClient,
  args: { id?: number; username?: string },
) {
  try {
    if (args.id !== undefined) {
      const user = await client.getUserById(args.id);
      return jsonResponse(user);
    }
    if (args.username) {
      const user = await client.getUserByUsername(args.username);
      return jsonResponse(user);
    }
    throw new LinusError('invalid_request', 'Provide either id (number) or username (string).');
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleGetFollowers(
  client: ForemClient,
  args: { page?: number; per_page?: number },
) {
  try {
    const followers = await client.getFollowers({
      page: args.page,
      per_page: args.per_page,
    });
    return jsonResponse(followers);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleGetOrg(
  client: ForemClient,
  args: { username: string; include?: string; page?: number; per_page?: number },
) {
  try {
    const paginationParams = { page: args.page, per_page: args.per_page };

    switch (args.include) {
      case 'articles': {
        const articles = await client.getOrgArticles(args.username, paginationParams);
        return jsonResponse(articles);
      }
      case 'members': {
        const members = await client.getOrgMembers(args.username, paginationParams);
        return jsonResponse(members);
      }
      case 'info':
      default: {
        const org = await client.getOrganization(args.username);
        return jsonResponse(org);
      }
    }
  } catch (error) {
    return errorResponse(error);
  }
}

// ── Registration ─────────────────────────────────────────────────

export function registerUserTools(server: McpServer, client: ForemClient): void {
  server.tool(
    'linus_get_user',
    'Get a user profile by ID (number) or username (string).',
    {
      id: z.number().optional().describe('User ID'),
      username: z.string().optional().describe('Username'),
    },
    async (args) => handleGetUser(client, args),
  );

  server.tool(
    'linus_get_followers',
    "Get the authenticated user's followers.",
    {
      page: z.number().optional().describe('Pagination page'),
      per_page: z.number().optional().describe('Items per page'),
    },
    async (args) => handleGetFollowers(client, args),
  );

  server.tool(
    'linus_get_org',
    'Get organization info, articles, or members.',
    {
      username: z.string().describe('Organization username'),
      include: z
        .enum(['info', 'articles', 'members'])
        .optional()
        .default('info')
        .describe('What to return: info, articles, or members'),
      page: z.number().optional().describe('Pagination page (for articles/members)'),
      per_page: z.number().optional().describe('Items per page (for articles/members)'),
    },
    async (args) => handleGetOrg(client, args),
  );
}
