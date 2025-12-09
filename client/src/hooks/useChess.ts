// Path: "client/src/hooks/useChess.ts"
import { Chess, type Square } from 'chess.js';
import { useCallback, useState } from 'react';

export interface GameState {
    fen: string;
    turn: 'w' | 'b';
    isCheck: boolean;
    isCheckmate: boolean;
    isStalemate: boolean;
    isDraw: boolean;
    isGameOver: boolean;
    history: string[];
}

export default function useChess() {
    const [game, setGame] = useState(new Chess());
    const [gameState, setGameState] = useState<GameState>(getGameState(game));

    function getGameState(chessInstance: Chess): GameState {
        return {
            fen: chessInstance.fen(),
            turn: chessInstance.turn(),
            isCheck: chessInstance.isCheck(),
            isCheckmate: chessInstance.isCheckmate(),
            isStalemate: chessInstance.isStalemate(),
            isDraw: chessInstance.isDraw(),
            isGameOver: chessInstance.isGameOver(),
            history: chessInstance.history(),
        };
    }

    const makeMove = useCallback(
        (from: Square, to: Square, promotion?: string) => {
            const gameCopy = new Chess(game.fen());
            try {
                const move = gameCopy.move({
                    from,
                    to,
                    promotion: promotion || 'q',
                });

                if (move) {
                    setGame(gameCopy);
                    setGameState(getGameState(gameCopy));
                    return true;
                }
            } catch {
                return false;
            }
            return false;
        },
        [game],
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
        setGame(newGame);
        setGameState(getGameState(newGame));
    }, []);

    const undoMove = useCallback(() => {
        const gameCopy = new Chess(game.fen());
        gameCopy.undo();
        gameCopy.undo();
        setGame(gameCopy);
        setGameState(getGameState(gameCopy));
    }, [game]);

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
