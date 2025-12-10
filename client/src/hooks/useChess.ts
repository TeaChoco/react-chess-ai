// Path: "client/src/hooks/useChess.ts"
import { Chess } from 'chess.js';
import type { Square, Color } from 'chess.js';
import { useCallback, useState } from 'react';

export interface GameState {
    fen: string;
    turn: Color;
    isDraw: boolean;
    isCheck: boolean;
    isCheckmate: boolean;
    isStalemate: boolean;
    isGameOver: boolean;
    history: string[];
}

export const toColor = (color: Color): 'white' | 'black' =>
    color === 'w' ? 'white' : 'black';

const getGameState = (chessInstance: Chess): GameState => ({
    fen: chessInstance.fen(),
    turn: chessInstance.turn(),
    isCheck: chessInstance.isCheck(),
    isCheckmate: chessInstance.isCheckmate(),
    isStalemate: chessInstance.isStalemate(),
    isDraw: chessInstance.isDraw(),
    isGameOver: chessInstance.isGameOver(),
    history: chessInstance.history(),
});

export default function useChess() {
    const [game, setGame] = useState(new Chess());
    const [gameState, setGameState] = useState<GameState>(getGameState(game));

    const updateGame = useCallback((newGame: Chess) => {
        setGame(newGame);
        setGameState(getGameState(newGame));
    }, []);

    const makeMove = useCallback(
        (from: Square, to: Square, promotion?: string) => {
            try {
                const move = game.move({
                    from,
                    to,
                    promotion: promotion || 'q',
                });

                if (move) {
                    updateGame(game);
                    return true;
                }
            } catch {
                return false;
            }
            return false;
        },
        [game, updateGame],
    );

    const makeMoveFromUci = useCallback(
        (uci: string) => {
            const from = uci.slice(0, 2) as Square;
            const to = uci.slice(2, 4) as Square;
            const promotion = uci.length > 4 ? uci[4] : undefined;
            return makeMove(from, to, promotion);
        },
        [makeMove],
    );

    const getLegalMoves = useCallback(
        (square: Square) => {
            const moves = game.moves({ square, verbose: true });
            return moves.map((move) => move.to);
        },
        [game],
    );

    const resetGame = useCallback(() => {
        const newGame = new Chess();
        updateGame(newGame);
    }, [updateGame]);

    const undoMove = useCallback(() => {
        game.undo();
        game.undo();
        updateGame(game);
    }, [game, updateGame]);

    return {
        game,
        gameState,
        makeMove,
        makeMoveFromUci,
        getLegalMoves,
        resetGame,
        undoMove,
    };
}
