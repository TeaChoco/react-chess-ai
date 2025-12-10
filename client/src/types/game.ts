// Path: "client/src/types/game.ts"
export type PlayerType = 'human' | 'ai';
export type GameMode = 'local' | 'online';
export type PlayerColor = 'white' | 'black';

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
    playerColor?: PlayerColor;
}

export interface OnlineRoom {
    id: string;
    hostColor: PlayerColor;
    players: number;
    status: 'waiting' | 'playing' | 'finished';
}
