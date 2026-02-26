const VERSION = '0.1.0';

export function buildHeaders(apiKey: string): Record<string, string> {
  return {
    'api-key': apiKey,
    'Accept': 'application/vnd.forem.api-v1+json',
    'Content-Type': 'application/json',
    'User-Agent': `Linus-MCP/${VERSION}`,
  };
}
