// Path: "client/src/store/gameStore.ts"
import { atom } from 'jotai';
import type { GameConfig } from '../types/game';

export const defaultGameConfig: GameConfig = {
    mode: 'local',
    white: 'human',
    black: 'ai',
    aiConfig: {
        skillLevel: 10,
        depth: 10,
    },
};

export const gameConfigAtom = atom<GameConfig>(defaultGameConfig);
export const isConnectedAtom = atom<boolean>(false);
