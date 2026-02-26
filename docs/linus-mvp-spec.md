# Linus

**dev.to MCP Connector**

*"Talk is cheap. Show me the code."*
*— But first, show me the draft.*

---

Linus is an [MCP](https://modelcontextprotocol.io) server that exposes dev.to (Forem) operations as tools. It handles article CRUD, draft-first publishing, series management, tag discovery, canonical URL cross-posting, and liquid tag awareness so consuming applications don't have to.

Linus is a power tool for a human author — not an autonomous agent. Content is drafted, reviewed, and approved by the user before publication. Nothing publishes without explicit human action.

## Design Philosophy

dev.to is where developers write for developers — long-form technical content with markdown, code blocks, and community engagement. The platform's API is the simplest in the blogging ecosystem: one API key, REST endpoints, JSON in and out. But simplicity hides sharp edges: front matter overrides JSON parameters, images can't be uploaded, liquid tags won't render anywhere else, and there's no way to create comments or delete articles via API.

Linus's job is to know where the edges are and handle them before they cut.

The name comes from Linus Torvalds — the person who built the infrastructure everyone else builds on, open-source to the core, opinionated about quality. dev.to runs on Forem, which is itself open-source. The ethos matches: build in the open, share what you know, don't tolerate slop.

### Principles

- **Human in the loop.** Linus creates drafts. The human publishes.
- **Draft-first.** Every write operation defaults to `published: false`. Publishing is a separate, deliberate action.
- **Front-matter-aware.** Linus knows that YAML front matter in the body overrides JSON parameters and keeps them synchronized to prevent silent data loss.
- **Cross-post native.** Canonical URLs are a first-class feature, not an afterthought. Linus is built to be one node in a multi-platform publishing pipeline.
- **Liquid-tag-aware.** Linus detects dev.to-specific liquid tags and warns when content is being prepared for cross-posting to platforms that won't render them.

## Quick Start

### 1. dev.to API Key Setup

1. Go to [https://dev.to/settings/extensions](https://dev.to/settings/extensions)
2. Scroll to **"DEV Community API Keys"**
3. Enter a description (e.g., "Linus MCP") and click **"Generate API Key"**
4. Copy the key immediately — it won't be shown again

API keys have full read/write access as the authenticated user. They never expire but can be revoked at any time from the same settings page.

### 2. MCP Configuration

Add Linus to your MCP client configuration:

```json
{
  "mcpServers": {
    "linus": {
      "command": "npx",
      "args": ["@ticktockbent/linus"],
      "env": {
        "DEVTO_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### 3. First Run

On first connection, Linus validates the API key by calling `GET /api/users/me` and caches the authenticated user's profile (username, user ID, organization memberships). No OAuth flow, no token refresh, no session management — the key works until revoked.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DEVTO_API_KEY` | Yes | dev.to API key from Settings → Extensions |
| `DEVTO_BASE_URL` | No | API base URL (default: `https://dev.to/api`). Set for self-hosted Forem instances. |
| `LINUS_DEFAULT_PUBLISHED` | No | Default publish state for new articles (default: `false`) |
| `LINUS_IMAGE_HOST` | No | Image hosting strategy: `warn` (default), `cloudinary`, `s3`, `imgur` |

## Tools

### Authentication

| Tool | Description |
|------|-------------|
| `linus_auth_status` | Check authentication state, username, profile info, organization memberships |

### Article Management

| Tool | Description |
|------|-------------|
| `linus_create_article` | Create an article (defaults to draft). Accepts title, markdown body, tags, series, cover image URL, canonical URL, description, org ID |
| `linus_update_article` | Update an existing article by ID. All fields optional |
| `linus_publish_article` | Publish a draft article (sets `published: true`) — the explicit human approval step |
| `linus_unpublish_article` | Revert a published article to draft (sets `published: false`) |
| `linus_get_article` | Get a single article by ID, including full markdown body |
| `linus_get_article_by_path` | Get a single article by `username/slug` path |
| `linus_list_my_articles` | List the authenticated user's articles with filter: `published`, `unpublished`, or `all` |
| `linus_list_articles` | List public articles with filters: tag, username, state (fresh/rising), top (by days), per_page |

### Reading & Discovery

| Tool | Description |
|------|-------------|
| `linus_get_comments` | Get threaded comments on an article by article ID |
| `linus_get_comment` | Get a single comment with its descendants |
| `linus_list_tags` | List tags ordered by popularity (for tag discovery/validation) |
| `linus_get_followed_tags` | Get the authenticated user's followed tags |
| `linus_get_reading_list` | Get the authenticated user's reading list (bookmarks) |
| `linus_search_articles` | Search public articles by query (via list endpoint filters) |

### Users & Organizations

| Tool | Description |
|------|-------------|
| `linus_get_user` | Get a user's profile by ID or username |
| `linus_get_my_profile` | Get the authenticated user's full profile |
| `linus_get_followers` | Get the authenticated user's followers |
| `linus_get_org` | Get organization details by username |
| `linus_get_org_articles` | Get articles published under an organization |
| `linus_get_org_members` | Get members of an organization |

### Reactions

| Tool | Description |
|------|-------------|
| `linus_toggle_reaction` | Toggle a reaction on an article or comment (V1 only) |

### Content Utilities

| Tool | Description |
|------|-------------|
| `linus_validate_article` | Dry-run validation: check tags (≤4, alphanumeric), detect liquid tags, verify image URLs are absolute, flag front matter conflicts |
| `linus_detect_liquid_tags` | Scan markdown for dev.to-specific liquid tags and report which won't render on other platforms |
| `linus_prepare_crosspost` | Prepare an article body for cross-posting: strip/convert liquid tags, set canonical URL, warn about dev.to-specific formatting |

## Architecture

```
src/
├── index.ts                 # MCP server entry point (stdio transport)
├── types.ts                 # TypeScript interfaces (generated from OpenAPI spec)
├── auth/
│   └── api-key.ts           # API key validation, user profile caching
├── client/
│   ├── forem.ts             # Forem API wrapper (all endpoint calls)
│   ├── rate-limiter.ts      # Rate limiter (10/30s create, 30/30s update)
│   └── pagination.ts        # Page-based pagination helpers
├── content/
│   ├── front-matter.ts      # YAML front matter parser, sync, and stripping
│   ├── liquid-tags.ts       # Liquid tag detection and conversion
│   ├── markdown.ts          # Markdown normalization utilities
│   └── validator.ts         # Pre-submission validation pipeline
├── tools/
│   ├── auth.ts              # Auth status tool
│   ├── articles.ts          # Article CRUD, publish/unpublish tools
│   ├── reading.ts           # Comments, tags, reading list, search tools
│   ├── users.ts             # User, follower, organization tools
│   ├── reactions.ts         # Reaction toggle tools
│   └── utilities.ts         # Validation, liquid tag detection, crosspost prep tools
└── utils/
    ├── errors.ts            # Consistent error handling
    └── headers.ts           # V1 Accept header, User-Agent builder
```

### Key Design Decisions

- **V1 exclusively.** All requests include the `Accept: application/vnd.forem.api-v1+json` header. V0 is deprecated and offers no additional functionality that V1 lacks.
- **Types from OpenAPI spec.** dev.to publishes an OpenAPI spec. Types are generated from it rather than using the unmaintained `dev-to-js` library. This keeps types current with the live API.
- **Draft-first by default.** `linus_create_article` always sets `published: false` unless explicitly overridden. Publishing is a separate tool (`linus_publish_article`) that maps the MCP tool boundary to the human approval step.
- **Front matter normalization.** Linus uses JSON parameters exclusively for create/update operations and strips YAML front matter from `body_markdown` before submission to prevent the front-matter-overrides-JSON precedence bug.
- **No caching.** Each tool call hits the API directly. Article state can change via the web UI between calls.
- **Single account.** One dev.to account per server instance. Run multiple instances for multiple accounts.
- **Self-hosted Forem support.** `DEVTO_BASE_URL` can be pointed at any Forem instance, not just dev.to.
- **No comment creation.** The API does not support creating comments. Linus surfaces existing comments for reading but does not pretend write capability exists.
- **No article deletion.** The API does not support deleting articles. `linus_unpublish_article` reverts to draft, which is the closest available operation.

## Front Matter Handling

This is the most dangerous gotcha in the Forem API. When `body_markdown` contains YAML front matter, **those values silently override the JSON request parameters**. This creates a class of bugs where updates appear to succeed but don't take effect.

### The problem

```
User updates title via JSON: { "article": { "title": "New Title" } }
But body_markdown still contains: ---\ntitle: Old Title\n---

Result: Title stays "Old Title" because front matter wins.
```

### How Linus handles it

Every write operation runs through the front matter normalizer:

```
User provides content
        │
        ▼
┌─────────────────┐
│ Parse body_markdown │ ── Extract YAML front matter if present
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Extract values   │ ── Pull title, tags, description, etc. from front matter
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Merge with JSON  │ ── JSON params take precedence over front matter values
└────────┬────────┘    (inverse of the API's own precedence — intentional)
         │
         ▼
┌─────────────────┐
│ Strip front matter│ ── Remove YAML block from body_markdown
└────────┬────────┘
         │
         ▼
    Submit with clean body + JSON params
```

This ensures the user's explicit parameters always win, regardless of what's in the markdown body.

## Liquid Tag System

dev.to extends standard markdown with Liquid tags — custom `{% %}` blocks that render platform-specific embeds. These are powerful on dev.to but **will not render on any other platform** (Medium, Hashnode, personal blogs, etc.).

### Supported liquid tags (most common)

| Tag | Renders as | Cross-post safe? |
|-----|-----------|-----------------|
| `{% embed https://... %}` | Auto-detected embed | ❌ Convert to plain URL |
| `{% link https://dev.to/... %}` | DEV article card | ❌ Convert to markdown link |
| `{% user username %}` | Profile card | ❌ Convert to `@username` or link |
| `{% tag tagname %}` | Tag badge | ❌ Convert to `#tagname` |
| `{% github user/repo %}` | GitHub repo card | ❌ Convert to GitHub URL |
| `{% youtube VIDEO_ID %}` | YouTube player | ⚠️ Convert to YouTube URL |
| `{% twitter TWEET_ID %}` | Tweet embed | ⚠️ Convert to Twitter URL |
| `{% codepen URL %}` | CodePen embed | ⚠️ Convert to CodePen URL |
| `{% codesandbox ID %}` | CodeSandbox embed | ⚠️ Convert to CodeSandbox URL |
| `{% details Summary %}...{% enddetails %}` | Collapsible section | ❌ Convert to `<details>` HTML |
| `{% katex %}...{% endkatex %}` | Math rendering | ⚠️ Convert to `$$...$$` |

### Detection and conversion

`linus_detect_liquid_tags` scans markdown and returns a report of all liquid tags found with their line numbers and cross-posting compatibility status.

`linus_prepare_crosspost` optionally converts liquid tags to their closest standard markdown or HTML equivalents, sets the canonical URL, and returns the transformed body ready for another platform.

## Pre-Validation Pipeline

Before any write operation, `linus_validate_article` checks:

```
User provides article draft
        │
        ▼
┌─────────────────┐
│  Tag Validation  │ ── Maximum 4 tags? All lowercase alphanumeric?
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Image Check     │ ── Are all image URLs absolute? Any local paths detected?
└────────┬────────┘    Is cover image URL reachable?
         │
         ▼
┌─────────────────┐
│ Front Matter Sync│ ── Does body contain front matter that conflicts with JSON params?
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Liquid Tag Scan  │ ── Any liquid tags present? (informational, not blocking)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Content Quality  │ ── Is there a title? Is body non-empty?
└────────┬────────┘    Does the article contain substantial content (not just a link)?
         │
         ▼
    Validation result: PASS / WARN (with reasons) / FAIL (with reasons)
```

## The Image Problem

**The Forem API has no image upload endpoint.** This is the most significant gap in the platform's API surface. The web UI supports drag-and-drop uploads (stored on S3) but this functionality is not exposed via API.

### Linus's strategy

The `LINUS_IMAGE_HOST` environment variable controls behavior:

| Value | Behavior |
|-------|----------|
| `warn` (default) | Detect local image paths and warn. Require all images be absolute URLs. |
| `cloudinary` | Future: upload images to Cloudinary, return URLs. Requires additional env vars. |
| `s3` | Future: upload images to S3, return URLs. Requires additional env vars. |
| `imgur` | Future: upload images to Imgur, return URLs. Requires additional env vars. |

For MVP, Linus uses `warn` mode only — it validates that all image references in markdown are absolute URLs and flags any that aren't. Image hosting integration is a phase 2 feature.

Cover images (`main_image`) must also be absolute external URLs. Linus validates this during the pre-validation pipeline.

## Authentication

### API key authentication

dev.to uses the simplest auth model in the blogging ecosystem: a static API key passed via the `api-key` header.

```
1. Linus reads DEVTO_API_KEY from environment
2. On startup, validates with GET /api/users/me
3. Caches user profile (username, user_id, org memberships)
4. All subsequent requests include api-key header
5. No refresh, no expiry, no session management
```

Keys have **no expiration**, **no scoping**, and **no permissions model**. A key grants full access as the authenticated user. Users can create multiple keys and revoke them independently.

### Security considerations

Since keys never expire, Linus should:

- Never log the API key
- Never include the key in error messages
- Validate the key on startup and fail fast with a clear message if invalid
- Recommend users create a dedicated "Linus" key separate from other integrations

## Forem API Specifics

### Base URL

All requests go to `https://dev.to/api`. For self-hosted Forem instances, set `DEVTO_BASE_URL`.

### Required Headers

```
api-key: <DEVTO_API_KEY>
Accept: application/vnd.forem.api-v1+json
Content-Type: application/json
User-Agent: Linus-MCP/0.1.0
```

The `Accept` header routes to V1. Without it, requests fall back to V0. `User-Agent` is required on V0 (403 without it) and recommended on V1.

### Request Body Format

All write operations wrap content in an `article` envelope:

```json
{
  "article": {
    "title": "Article Title",
    "body_markdown": "# Content\n\nMarkdown body here.",
    "published": false,
    "tags": "javascript, typescript, webdev",
    "series": "My Series Name",
    "main_image": "https://example.com/cover.jpg",
    "canonical_url": "https://myblog.com/original-post",
    "description": "SEO description",
    "organization_id": null
  }
}
```

Note: `tags` is a **comma-separated string**, not an array.

### Rate Limits

| Operation | Limit |
|-----------|-------|
| Create article | **10 per 30 seconds** |
| Update article | **30 per 30 seconds** |
| Global | Not documented |

Rate limit exceeded returns **HTTP 429** with body:
```json
{
  "error": "Rate limit reached...",
  "status": 429
}
```

No `Retry-After` header is documented. Linus uses exponential backoff starting at 3 seconds.

### Content Limits

| Constraint | Limit |
|------------|-------|
| Tags per article | **4 maximum** |
| Tag format | Lowercase, alphanumeric, underscores |
| Cover image | Must be absolute URL (no upload API) |
| Body images | Must be absolute URLs (no upload API) |
| Title | Required, no documented max length |
| Body | No documented max length |
| Description | No documented max length |

### Pagination

Page-based with `page` (integer, ≥1) and `per_page` (integer, 1–1000, varies by endpoint). **No cursor-based pagination, no total count header, no next/prev links.**

```typescript
let page = 1;
const perPage = 30;
let results: Article[] = [];
do {
  const batch = await client.listArticles({ page, per_page: perPage });
  results.push(...batch);
  page++;
} while (batch.length === perPage);
```

### Series Management

Series use string matching — no separate CRUD. All articles with the same `series` string value are automatically grouped. Responses include `collection_id` for querying series membership.

```
Set series:    { "article": { "series": "My TypeScript Journey" } }
Remove series: { "article": { "series": null } }
Query series:  GET /api/articles?collection_id=12345
```

## Error Handling

All tools return consistent error shapes:

```json
{
  "error": "rate_limited",
  "message": "Article creation rate limit exceeded. Try again in a few seconds.",
  "details": {
    "httpStatus": 429,
    "retryAfter": 3
  }
}
```

| Error Code | Meaning |
|------------|---------|
| `auth_failed` | API key invalid, missing, or revoked |
| `rate_limited` | API rate limit exceeded (includes estimated `retryAfter`) |
| `not_found` | Article, user, or resource doesn't exist |
| `validation_failed` | Pre-validation caught an issue (e.g., >4 tags, local image paths) |
| `invalid_request` | Bad parameters or missing required fields (HTTP 400/422) |
| `forbidden` | Insufficient permissions (e.g., editing another user's article) |
| `front_matter_conflict` | Body front matter conflicts with JSON parameters (warning, not blocking) |
| `liquid_tag_detected` | Liquid tags found in content being prepared for cross-posting (warning) |
| `image_not_absolute` | Image reference uses relative/local path instead of absolute URL |
| `unpublish_only` | User attempted deletion — only unpublish is available via API |
| `api_error` | Forem API error (raw details included) |

## Policy Compliance

### Why Linus is clearly permitted

dev.to's Terms of Service contain **no restrictions** on:

- API-based article management
- Tools that create, update, or publish on behalf of users
- Cross-posting with canonical URLs (actively encouraged)
- Draft creation and management
- AI-assisted content drafting

The API key model inherently expects programmatic access — the key exists specifically for tools to act on behalf of users. Numerous existing tools (dev-to-git, devto-cli, sinedied/publish-devto GitHub Action) use the API for automated publishing and are endorsed by the dev.to team.

### AI content and community expectations

dev.to has **no formal AI content policy** in its Terms of Service. However, community moderators actively enforce quality standards through the Trusted Member system (~1,000+ moderators). In practice:

- AI-assisted content where the human adds substantial value: **accepted**
- Fully AI-generated posts without meaningful human editing: **aggressively downvoted and flagged**
- Mass-published thin content: **removed by moderators**

Linus's draft-first design directly supports the quality expectation: the human reviews and edits every article before it goes live. The tool creates drafts; the human decides quality.

### Content ownership

**Users retain full ownership of content posted on dev.to.** dev.to's ToS grants the platform a license to display content but does not claim ownership. Users can delete content (via web UI) or unpublish (via API) at any time.

### What Linus will NOT do

- Publish without human approval (draft-first by default)
- Automatically generate and publish articles on a schedule
- Mass-create articles to game the platform
- Create comment spam (API doesn't support comment creation anyway)
- Scrape other users' content
- Circumvent rate limits or moderation

## Cross-Posting Support

Cross-posting is a first-class feature of both dev.to and Linus. The `canonical_url` field tells search engines where the original content lives, preventing SEO penalties for duplicate content.

### Workflow: blog → dev.to

```
User has article on personal blog
        │
        ▼
┌─────────────────┐
│ linus_create_article │ ── body_markdown + canonical_url pointing to original
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ linus_validate   │ ── Check images are absolute URLs, content is substantial
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Human reviews    │ ── Draft URL available for preview
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ linus_publish    │ ── Explicit publish action
└────────┬────────┘
         │
         ▼
    Article live on dev.to with "Originally published at" attribution
```

### Workflow: dev.to → other platforms

```
User has article on dev.to
        │
        ▼
┌─────────────────┐
│ linus_get_article │ ── Retrieve full markdown body
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ linus_prepare_crosspost │ ── Strip/convert liquid tags, flag dev.to-specific formatting
└────────┬────────┘
         │
         ▼
    Clean markdown ready for Ariel (Bluesky), Virgil (Reddit), etc.
    with canonical_url pointing back to dev.to
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Run tests
npm test

# Generate types from OpenAPI spec
npm run generate-types
```

### Dependencies

| Package | Purpose |
|---------|---------|
| `@modelcontextprotocol/sdk` | MCP server framework |
| `zod` | Schema validation for tool parameters |
| `gray-matter` | YAML front matter parsing and stripping |
| `openapi-typescript` | Type generation from Forem OpenAPI spec (dev dependency) |

### Dev Dependencies

| Package | Purpose |
|---------|---------|
| `typescript` | Build |
| `@types/node` | Node.js type definitions |
| `vitest` | Testing |

## License

MIT

## References

- [Forem API V1 Documentation](https://developers.forem.com/api/v1)
- [Forem API V0 Documentation (legacy)](https://developers.forem.com/api/v0)
- [dev.to Editor Guide](https://dev.to/p/editor_guide)
- [dev.to Terms of Service](https://dev.to/terms)
- [Forem OpenAPI Spec](https://developers.forem.com/redocusaurus/plugin-redoc-0.yaml)
- [Forem GitHub Repository](https://github.com/forem/forem)
- [MCP Specification](https://modelcontextprotocol.io)
- [Linus Torvalds](https://en.wikipedia.org/wiki/Linus_Torvalds) — The source of the name
