# Linus

An MCP server for [dev.to](https://dev.to) (Forem) operations. Article CRUD, draft-first publishing, full-text search, content validation, and cross-post preparation — all accessible as MCP tools from any compatible client.

## Features

**17 tools** covering the full dev.to workflow:

| Category | Tools |
|---|---|
| **Auth** | `linus_auth_status` |
| **Articles** | `linus_get_article`, `linus_list_my_articles`, `linus_list_articles`, `linus_search_articles`, `linus_create_article`, `linus_update_article`, `linus_set_published` |
| **Reading** | `linus_get_comments`, `linus_list_tags`, `linus_get_reading_list` |
| **Users** | `linus_get_user`, `linus_get_followers`, `linus_get_org` |
| **Reactions** | `linus_toggle_reaction` |
| **Utilities** | `linus_validate_article`, `linus_prepare_crosspost` |

**Key design choices:**

- **Draft-first** — new articles default to `published: false`
- **Front matter normalization** — strips front matter from markdown before API submission, JSON parameters take precedence over front matter values, conflicts are reported
- **Content validation** — dry-run validation checks tags, images, liquid tags, and content quality before you create
- **Cross-post preparation** — strips/converts dev.to liquid tags and sets canonical URLs for publishing elsewhere
- **MCP tool annotations** — all tools declare `readOnlyHint`, `destructiveHint`, `idempotentHint`, and `openWorldHint` for proper MCP host behavior
- **Structured logging** — JSON logs via pino to stderr (stdout reserved for MCP stdio transport)

## Installation

Requires Node.js >= 20 and a [dev.to API key](https://dev.to/settings/extensions).

### npm (global)

```bash
npm install -g @ticktockbent/linus
```

### From source

```bash
git clone https://github.com/TickTockBent/linus.git
cd linus
npm install
npm run build
npm link
```

## Configuration

### Claude Code

```bash
claude mcp add --transport stdio linus \
  --env DEVTO_API_KEY=your-api-key \
  -- linus
```

### Claude Desktop / Other MCP Clients

Add to your MCP config file:

```json
{
  "mcpServers": {
    "linus": {
      "command": "linus",
      "env": {
        "DEVTO_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DEVTO_API_KEY` | Yes | — | Your dev.to API key |
| `DEVTO_BASE_URL` | No | `https://dev.to/api` | Override the Forem API base URL |
| `LINUS_DEFAULT_PUBLISHED` | No | `false` | Set to `true` to publish articles by default |
| `LINUS_LOG_LEVEL` | No | `info` | Pino log level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`, `silent`) |

## Usage Examples

Once connected to an MCP client, you can ask your agent to:

- "List my draft articles"
- "Search dev.to for articles about async Rust"
- "Create a draft article titled 'My New Post' with tags javascript, webdev"
- "Validate this article before publishing" (pass markdown content)
- "Publish article 12345"
- "Get the comments on my latest article"
- "Prepare this article body for cross-posting to my blog"

## Development

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm test             # Run test suite (114 tests)
npm run test:watch   # Watch mode
npm run dev          # TypeScript watch mode
npm run inspect      # Launch MCP Inspector
```

### Project Structure

```
src/
├── index.ts              # Entry point, server setup
├── types.ts              # Type definitions
├── types/forem-api.d.ts  # Generated OpenAPI types (read-only)
├── auth/api-key.ts       # API key validation + caching
├── client/
│   ├── forem.ts          # Forem API client
│   ├── rate-limiter.ts   # Rate limiting with backoff
│   └── pagination.ts     # Pagination helpers
├── content/
│   ├── front-matter.ts   # Front matter parsing + normalization
│   ├── liquid-tags.ts    # Liquid tag detection + stripping
│   ├── markdown.ts       # Markdown utilities
│   └── validator.ts      # Article validation
├── tools/
│   ├── auth.ts           # Auth tool
│   ├── articles.ts       # Article CRUD + search tools
│   ├── reading.ts        # Comments, tags, reading list tools
│   ├── users.ts          # User, followers, org tools
│   ├── reactions.ts      # Reaction toggle tool
│   └── utilities.ts      # Validate + crosspost tools
└── utils/
    ├── errors.ts         # LinusError class + HTTP error mapping
    ├── headers.ts        # API header construction
    └── logger.ts         # Pino structured logger
```

### Regenerating API Types

The Forem API types are generated from the OpenAPI spec:

```bash
npm run generate-types
```

This overwrites `src/types/forem-api.d.ts`. Do not edit that file manually.

## Known Limitations

These are dev.to API issues, not Linus bugs:

- **`GET /api/articles/{id}`** cannot fetch unpublished/draft articles. Use `linus_list_my_articles` with `filter: "unpublished"` instead.
- **`GET /api/followers/users`** returns 500 Internal Server Error on the live dev.to API.
- **`POST /api/reactions/toggle`** returns 401 with API key authentication. The reactions endpoint may require session-based auth.

## License

[MIT](LICENSE)
