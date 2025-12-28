import { getSDKInstance } from './sdk-client';
import { AuthenticationError } from '@gamerstake/game-platform-sdk';

export interface ValidatedPlayer {
  id: string;  // SDK returns string
  username: string;
  validatedAt: number;
}

// Simple in-memory cache
const playerCache = new Map<string, ValidatedPlayer>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export async function validatePlayer(token: string): Promise<ValidatedPlayer | null> {
  // Check cache first
  const cached = playerCache.get(token);
  if (cached && Date.now() - cached.validatedAt < CACHE_TTL_MS) {
    console.log(`[Auth] Cache hit for player ${cached.id}`);
    return cached;
  }

  try {
    const sdk = getSDKInstance();
    const identity = await sdk.validatePlayerToken(token);

    const player: ValidatedPlayer = {
      id: identity.id,
      username: identity.username,
      validatedAt: Date.now(),
    };

    // Cache the result
    playerCache.set(token, player);
    console.log(`[Auth] Validated: ${identity.username} (${identity.id})`);

    return player;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      console.log(`[Auth] Invalid token: ${error.message}`);
    } else {
      console.error(`[Auth] Validation error:`, error);
    }
    return null;
  }
}

export function invalidatePlayer(token: string): void {
  playerCache.delete(token);
}

export function clearPlayerCache(): void {
  playerCache.clear();
}

