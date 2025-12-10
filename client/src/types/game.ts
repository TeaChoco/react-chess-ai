// Path: "client/src/types/game.ts"
import type { Color } from 'chess.js';

export type PlayerType = 'human' | 'ai';
export type GameMode = 'local' | 'online';

export interface AIConfig {
    skillLevel: number; // 0-20
    depth: number; // 1-20
}

export interface GameConfig {
    mode: GameMode;
    white: PlayerType;
    black: PlayerType;
    aiConfig: AIConfig;
    roomId?: string;
    playerColor?: Color;
}

export interface OnlineRoom {
    id: string;
    hostColor: Color;
    players: number;
    status: 'waiting' | 'playing' | 'finished';
}
