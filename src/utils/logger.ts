import pino from 'pino';

/**
 * Structured logger for Linus.
 * Writes JSON to stderr (stdout is reserved for MCP stdio transport).
 */
export const logger = pino({
  name: 'linus',
  level: process.env.LINUS_LOG_LEVEL ?? 'info',
  transport:
    process.env.LINUS_LOG_PRETTY === 'true'
      ? { target: 'pino-pretty', options: { destination: 2 } }
      : undefined,
}, process.env.LINUS_LOG_PRETTY === 'true' ? undefined : pino.destination(2));
