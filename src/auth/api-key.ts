import type { ForemClient } from '../client/forem.js';
import type { AuthState } from '../types.js';
import { LinusError } from '../utils/errors.js';

let cachedAuthState: AuthState | null = null;

export async function validateApiKey(client: ForemClient): Promise<AuthState> {
  try {
    const user = await client.getMe();
    cachedAuthState = {
      authenticated: true,
      user,
      validatedAt: Date.now(),
    };
    return cachedAuthState;
  } catch (error) {
    cachedAuthState = {
      authenticated: false,
      user: null,
      validatedAt: Date.now(),
    };
    if (error instanceof LinusError && error.code === 'auth_failed') {
      throw error;
    }
    throw new LinusError('auth_failed', 'Failed to validate API key', {
      cause: String(error),
    });
  }
}

export function getAuthState(): AuthState {
  if (!cachedAuthState) {
    throw new LinusError('auth_failed', 'Not authenticated. Call validateApiKey first.');
  }
  return cachedAuthState;
}

/** Reset auth state (for testing). */
export function resetAuthState(): void {
  cachedAuthState = null;
}
