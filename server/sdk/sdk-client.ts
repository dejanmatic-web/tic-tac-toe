import { GameSDK, type Environment } from '@gamerstake/game-platform-sdk';

let sdkInstance: GameSDK | null = null;

export function getSDKInstance(): GameSDK {
  if (!sdkInstance) {
    const apiKey = process.env.GAMERSTAKE_API_KEY;
    const environment = (process.env.GAMERSTAKE_ENVIRONMENT || 'development') as Environment;

    if (!apiKey) {
      throw new Error('GAMERSTAKE_API_KEY environment variable is not set');
    }

    sdkInstance = new GameSDK({
      apiKey,
      environment,
      debug: process.env.NODE_ENV !== 'production',
    });

    console.log(`[SDK] Initialized in ${environment} mode`);
  }

  return sdkInstance;
}

// For testing - reset singleton
export function resetSDKInstance(): void {
  sdkInstance = null;
}

