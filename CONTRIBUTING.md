# Contributing to Linus

Thanks for your interest in contributing to Linus. This document covers the basics.

## Getting Started

1. Fork the repo and clone your fork
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Run tests: `npm test`

## Development Workflow

1. Create a branch from `main` for your changes
2. Make your changes
3. Ensure `npm run build` compiles without errors
4. Ensure `npm test` passes (all 114+ tests)
5. Open a pull request against `main`

## Code Style

- TypeScript with strict mode enabled
- ESM modules (`"type": "module"` in package.json)
- Zod for tool parameter validation
- Descriptive variable names
- No unnecessary abstractions — keep it simple

## Adding a New Tool

1. Add any new API client methods to `src/client/forem.ts`
2. Add the handler function and tool registration in the appropriate file under `src/tools/`
3. Include MCP tool annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`)
4. Add unit tests — handlers should be tested with mocked `ForemClient`
5. If adding new types, add them to `src/types.ts` (not `src/types/forem-api.d.ts`, which is generated)

## Testing

Tests use vitest with mocked `fetch`. No live API calls in the test suite.

```bash
npm test             # Run once
npm run test:watch   # Watch mode
```

When adding tests:
- Place test files in `tests/` mirroring the `src/` structure
- Mock the `ForemClient` methods, not `fetch` directly (except in `tests/client/forem.test.ts`)
- Test both success and error paths

## Project Architecture

- **`src/client/`** — HTTP client layer. All API calls go through `ForemClient`.
- **`src/tools/`** — MCP tool handlers and registrations. Each file exports handler functions (for testing) and a `register*Tools` function.
- **`src/content/`** — Content processing (front matter, liquid tags, validation). No API calls.
- **`src/utils/`** — Cross-cutting concerns (errors, headers, logging).
- **`src/auth/`** — API key validation with cached auth state.

## Commit Messages

Write concise commit messages that explain _why_, not just _what_. One-line summary, blank line, optional body with context.

## Questions?

Open an issue on GitHub.
