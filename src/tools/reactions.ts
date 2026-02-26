import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ForemClient } from '../client/forem.js';
import { LinusError } from '../utils/errors.js';
import type { ReactionCategory, ReactableType } from '../types.js';

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

export async function handleToggleReaction(
  client: ForemClient,
  args: { category: string; reactable_id: number; reactable_type: string },
) {
  try {
    const result = await client.toggleReaction(
      args.category as ReactionCategory,
      args.reactable_id,
      args.reactable_type as ReactableType,
    );
    return jsonResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export function registerReactionTools(server: McpServer, client: ForemClient): void {
  server.tool(
    'linus_toggle_reaction',
    'Toggle a reaction on an article or comment.',
    {
      category: z
        .enum(['like', 'unicorn', 'readinglist'])
        .describe('Reaction type'),
      reactable_id: z.number().describe('ID of the article or comment'),
      reactable_type: z
        .enum(['Article', 'Comment'])
        .describe('Type of the reactable'),
    },
    async (args) => handleToggleReaction(client, args),
  );
}
