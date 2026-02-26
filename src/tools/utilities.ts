import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ForemClient } from '../client/forem.js';
import { LinusError } from '../utils/errors.js';
import { validateArticle as runValidation } from '../content/validator.js';
import { detectLiquidTags, stripLiquidTags } from '../content/liquid-tags.js';

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

export async function handleValidateArticle(
  _client: ForemClient,
  args: {
    title?: string;
    body_markdown?: string;
    tags?: string;
    main_image?: string;
    canonical_url?: string;
    description?: string;
    published?: boolean;
  },
) {
  try {
    const result = runValidation(args);
    return jsonResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handlePrepareCrosspost(
  _client: ForemClient,
  args: {
    body_markdown: string;
    canonical_url: string;
    strip_liquid_tags?: boolean;
  },
) {
  try {
    const liquidReport = detectLiquidTags(args.body_markdown);

    let processedBody = args.body_markdown;
    if (args.strip_liquid_tags !== false) {
      processedBody = stripLiquidTags(args.body_markdown);
    }

    return jsonResponse({
      body: processedBody,
      canonical_url: args.canonical_url,
      liquid_tag_report: {
        tags_found: liquidReport.tags.length,
        has_cross_post_unsafe: liquidReport.hasCrossPostUnsafe,
        details: liquidReport.tags.map((tag) => ({
          tag: tag.tag,
          argument: tag.argument,
          line: tag.lineNumber,
          cross_post_safe: tag.crossPostSafe,
        })),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export function registerUtilityTools(server: McpServer, client: ForemClient): void {
  server.tool(
    'linus_validate_article',
    'Dry-run validation: check tags, images, front matter conflicts, liquid tags, and content quality.',
    {
      title: z.string().optional().describe('Article title'),
      body_markdown: z.string().optional().describe('Markdown body'),
      tags: z.string().optional().describe('Comma-separated tags'),
      main_image: z.string().optional().describe('Cover image URL'),
      canonical_url: z.string().optional().describe('Canonical URL'),
      description: z.string().optional().describe('Description'),
      published: z.boolean().optional().describe('Published state'),
    },
    async (args) => handleValidateArticle(client, args),
  );

  server.tool(
    'linus_prepare_crosspost',
    'Prepare article body for cross-posting: strip/convert liquid tags, set canonical URL.',
    {
      body_markdown: z.string().describe('Markdown body to process'),
      canonical_url: z.string().describe('Canonical URL to set'),
      strip_liquid_tags: z
        .boolean()
        .optional()
        .default(true)
        .describe('Convert liquid tags to standard equivalents (default: true)'),
    },
    async (args) => handlePrepareCrosspost(client, args),
  );
}
