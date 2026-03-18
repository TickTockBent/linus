#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ForemClient } from './client/forem.js';
import { validateApiKey } from './auth/api-key.js';
import { registerAuthTools } from './tools/auth.js';
import { registerArticleTools } from './tools/articles.js';
import { registerReadingTools } from './tools/reading.js';
import { registerUserTools } from './tools/users.js';
import { registerReactionTools } from './tools/reactions.js';
import { registerUtilityTools } from './tools/utilities.js';
import { logger } from './utils/logger.js';

async function main() {
  const apiKey = process.env.DEVTO_API_KEY;
  if (!apiKey) {
    logger.fatal('DEVTO_API_KEY environment variable is required. Get your API key at: https://dev.to/settings/extensions');
    process.exit(1);
  }

  const baseUrl = process.env.DEVTO_BASE_URL;
  const defaultPublished = process.env.LINUS_DEFAULT_PUBLISHED === 'true';

  const client = new ForemClient({ apiKey, baseUrl });

  // Validate API key on startup
  try {
    const authState = await validateApiKey(client);
    logger.info({ username: authState.user?.username }, 'Authenticated');
  } catch (error) {
    logger.fatal({ error: String(error) }, 'Failed to validate API key');
    process.exit(1);
  }

  const server = new McpServer({
    name: 'linus',
    version: '0.1.0',
  });

  // Register all tool groups
  registerAuthTools(server, client);
  registerArticleTools(server, client, defaultPublished);
  registerReadingTools(server, client);
  registerUserTools(server, client);
  registerReactionTools(server, client);
  registerUtilityTools(server, client);

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  logger.fatal({ error }, 'Fatal error');
  process.exit(1);
});
