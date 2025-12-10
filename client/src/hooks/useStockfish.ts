// Path: "client/src/hooks/useStockfish.ts"
import type { AIConfig } from '../types/game';
import { useCallback, useEffect, useRef, useState } from 'react';

//   easy: { depth: 1, skillLevel: 0 },
//     medium: { depth: 3, skillLevel: 5 },
//     hard: { depth: 8, skillLevel: 12 },

export default function useStockfish() {
    const workerRef = useRef<Worker | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const onBestMoveRef = useRef<((move: string) => void) | null>(null);

    useEffect(() => {
        const worker = new Worker(
            `${import.meta.env.BASE_URL}stockfish/stockfish.js`,
        );

        worker.onmessage = (event) => {
            const message = event.data;

            if (message === 'uciok') {
                worker.postMessage('isready');
            } else if (message === 'readyok') {
                setIsReady(true);
            } else if (message.startsWith('bestmove')) {
                const bestMove = message.split(' ')[1];
                setIsThinking(false);
                if (onBestMoveRef.current) onBestMoveRef.current(bestMove);
            }
        };

        worker.postMessage('uci');
        workerRef.current = worker;

        return () => worker.terminate();
    }, []);

    const getBestMove = useCallback(
        (fen: string, config: AIConfig, onBestMove: (move: string) => void) => {
            if (!workerRef.current || !isReady) return;

            onBestMoveRef.current = onBestMove;
            setIsThinking(true);

            workerRef.current.postMessage(
                `setoption name Skill Level value ${config.skillLevel}`,
            );
            workerRef.current.postMessage(`position fen ${fen}`);
            workerRef.current.postMessage(`go depth ${config.depth}`);
        },
        [isReady],
    );

    const stopThinking = useCallback(() => {
        if (workerRef.current) {
            workerRef.current.postMessage('stop');
            setIsThinking(false);
        }
    }, []);

    return {
        isReady,
        isThinking,
        getBestMove,
        stopThinking,
    };
}
