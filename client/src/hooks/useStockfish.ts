// Path: "client/src/hooks/useStockfish.ts"
import { useCallback, useEffect, useRef, useState } from 'react';

export type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_CONFIG: Record<
    Difficulty,
    { depth: number; skillLevel: number }
> = {
    easy: { depth: 5, skillLevel: 3 },
    medium: { depth: 10, skillLevel: 10 },
    hard: { depth: 15, skillLevel: 20 },
};

export default function useStockfish() {
    const workerRef = useRef<Worker | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [difficulty, setDifficulty] = useState<Difficulty>('medium');
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
                if (onBestMoveRef.current) {
                    onBestMoveRef.current(bestMove);
                }
            }
        };

        worker.postMessage('uci');
        workerRef.current = worker;

        return () => {
            worker.terminate();
        };
    }, []);

    const getBestMove = useCallback(
        (fen: string, onBestMove: (move: string) => void) => {
            if (!workerRef.current || !isReady) return;

            onBestMoveRef.current = onBestMove;
            setIsThinking(true);

            const config = DIFFICULTY_CONFIG[difficulty];

            workerRef.current.postMessage(
                `setoption name Skill Level value ${config.skillLevel}`,
            );
            workerRef.current.postMessage(`position fen ${fen}`);
            workerRef.current.postMessage(`go depth ${config.depth}`);
        },
        [isReady, difficulty],
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
        difficulty,
        setDifficulty,
        getBestMove,
        stopThinking,
    };
}
