import { getSDKInstance } from './sdk-client';
import type { SDKRoom, AuthenticatedPlayer } from '../types/room-types';
import type { Winner } from '../../lib/game';
import { MatchSDKError, NetworkError } from '@gamerstake/game-platform-sdk';

export class MatchReporter {
  /**
   * Report match start to GamerStake platform
   */
  async startMatch(room: SDKRoom): Promise<boolean> {
    if (room.sdkState.matchStarted) {
      console.log(`[SDK] Match ${room.matchId} already started`);
      return false;
    }

    if (!room.players.X || !room.players.O) {
      console.log(`[SDK] Cannot start match - not all players present`);
      return false;
    }

    try {
      const sdk = getSDKInstance();
      await sdk.reportMatchStart(room.matchId);
      room.sdkState.matchStarted = true;
      console.log(`[SDK] Match started: ${room.matchId}`);
      return true;
    } catch (error) {
      this.handleError('startMatch', room.matchId, error);
      return false;
    }
  }

  /**
   * Report player joined to GamerStake platform
   */
  async playerJoined(room: SDKRoom, player: AuthenticatedPlayer): Promise<boolean> {
    if (room.sdkState.playersReported.has(player.id)) {
      console.log(`[SDK] Player ${player.id} already reported`);
      return false;
    }

    if (!room.sdkState.matchStarted) {
      console.log(`[SDK] Cannot report player join - match not started`);
      return false;
    }

    try {
      const sdk = getSDKInstance();
      await sdk.reportPlayerJoin(room.matchId, player.id);
      room.sdkState.playersReported.add(player.id);
      console.log(`[SDK] Player joined: ${player.username} (${player.id})`);
      return true;
    } catch (error) {
      this.handleError('playerJoined', room.matchId, error);
      return false;
    }
  }

  /**
   * Report match result to GamerStake platform
   */
  async reportResult(room: SDKRoom, winner: Winner): Promise<boolean> {
    if (room.sdkState.matchEnded) {
      console.log(`[SDK] Match ${room.matchId} already ended`);
      return false;
    }

    if (!room.sdkState.matchStarted) {
      console.log(`[SDK] Cannot report result - match not started`);
      return false;
    }

    if (!room.players.X || !room.players.O) {
      console.log(`[SDK] Cannot report result - missing player data`);
      return false;
    }

    const result = this.buildMatchResult(room, winner);

    try {
      const sdk = getSDKInstance();
      await sdk.reportMatchResult(room.matchId, result);
      room.sdkState.matchEnded = true;
      console.log(`[SDK] Result reported: ${room.matchId}, winner: ${winner}`);
      return true;
    } catch (error) {
      this.handleError('reportResult', room.matchId, error);
      return false;
    }
  }

  /**
   * Report match error to GamerStake platform
   */
  async reportError(room: SDKRoom, reason: string): Promise<boolean> {
    if (room.sdkState.matchEnded) {
      console.log(`[SDK] Match ${room.matchId} already ended`);
      return false;
    }

    if (!room.sdkState.matchStarted) {
      console.log(`[SDK] Not reporting error - match not started`);
      return false;
    }

    try {
      const sdk = getSDKInstance();
      await sdk.reportMatchError(room.matchId, reason);
      room.sdkState.matchEnded = true;
      console.log(`[SDK] Error reported: ${room.matchId}, reason: ${reason}`);
      return true;
    } catch (error) {
      this.handleError('reportError', room.matchId, error);
      return false;
    }
  }

  /**
   * Build MatchResult object from room state
   * Note: SDK has type inconsistency - PlayerIdentity.id is string but MatchResult expects number
   */
  private buildMatchResult(room: SDKRoom, winner: Winner) {
    const playerX = room.players.X!;
    const playerO = room.players.O!;

    // Convert string IDs to numbers for MatchResult (SDK type inconsistency)
    const playerXId = parseInt(playerX.id, 10);
    const playerOId = parseInt(playerO.id, 10);

    if (winner === 'draw') {
      return {
        players: [
          { id: playerXId, score: 0, isWinner: false },
          { id: playerOId, score: 0, isWinner: false },
        ],
      };
    }

    const winnerId = winner === 'X' ? playerXId : playerOId;
    const loserId = winner === 'X' ? playerOId : playerXId;

    return {
      players: [
        { id: winnerId, score: 1, isWinner: true },
        { id: loserId, score: 0, isWinner: false },
      ],
    };
  }

  /**
   * Handle SDK errors
   */
  private handleError(operation: string, matchId: string, error: unknown): void {
    if (error instanceof MatchSDKError) {
      console.error(`[SDK] Match error in ${operation} for ${matchId}: ${error.message}`);
    } else if (error instanceof NetworkError) {
      console.error(`[SDK] Network error in ${operation} for ${matchId}: ${error.message}`);
    } else if (error instanceof Error) {
      console.error(`[SDK] Error in ${operation} for ${matchId}: ${error.message}`);
    } else {
      console.error(`[SDK] Unknown error in ${operation} for ${matchId}:`, error);
    }
  }
}

// Singleton instance
export const matchReporter = new MatchReporter();

