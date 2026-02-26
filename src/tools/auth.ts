import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ForemClient } from '../client/forem.js';
import { getAuthState } from '../auth/api-key.js';
import { LinusError } from '../utils/errors.js';

export async function handleAuthStatus(client: ForemClient) {
  try {
    const authState = getAuthState();

    if (!authState.authenticated || !authState.user) {
      throw new LinusError('auth_failed', 'Not authenticated.');
    }

    const user = authState.user;
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              authenticated: true,
              username: user.username,
              name: user.name,
              user_id: user.id,
              profile_image: user.profile_image,
              joined_at: user.joined_at,
              summary: user.summary,
              twitter_username: user.twitter_username,
              github_username: user.github_username,
              website_url: user.website_url,
              location: user.location,
              validated_at: new Date(authState.validatedAt).toISOString(),
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch (error) {
    if (error instanceof LinusError) return error.toMcpResponse();
    throw error;
  }
}

export function registerAuthTools(server: McpServer, client: ForemClient): void {
  server.tool(
    'linus_auth_status',
    'Check authentication state, username, profile info, and organization memberships.',
    {},
    async () => handleAuthStatus(client),
  );
}
