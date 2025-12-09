// Path: "client/src/components/ChessGame.tsx"
import type { PieceDropHandlerArgs, SquareHandlerArgs } from 'react-chessboard';
import { Chessboard } from 'react-chessboard';
import useChess from '../hooks/useChess';
import { useCallback, useEffect, useState } from 'react';
import useStockfish, { type Difficulty } from '../hooks/useStockfish';

type GameMode = 'ai' | 'two-player';

export default function ChessGame() {
    const {
        gameState,
        makeMove,
        makeMoveFromUci,
        getLegalMoves,
        resetGame,
        undoMove,
    } = useChess();
    const { isReady, isThinking, difficulty, setDifficulty, getBestMove } =
        useStockfish();
    const [gameMode, setGameMode] = useState<GameMode>('ai');
    const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>(
        'white',
    );
    const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
    const [optionSquares, setOptionSquares] = useState<
        Record<string, React.CSSProperties>
    >({});

    const isAiMode = gameMode === 'ai';

    // AI makes move when it's black's turn (only in AI mode)
    useEffect(() => {
        if (
            isAiMode &&
            gameState.turn === 'b' &&
            !gameState.isGameOver &&
            isReady &&
            !isThinking
        ) {
            const timer = setTimeout(() => {
                getBestMove(gameState.fen, (bestMove) =>
                    makeMoveFromUci(bestMove),
                );
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [
        isAiMode,
        gameState.turn,
        gameState.fen,
        gameState.isGameOver,
        isReady,
        isThinking,
        getBestMove,
        makeMoveFromUci,
    ]);

    const canPlayerMove = useCallback(() => {
        if (gameState.isGameOver) return false;
        if (!isAiMode) return true; // Two-player mode: both can move
        return gameState.turn === 'w'; // AI mode: only white can move
    }, [gameState.isGameOver, gameState.turn, isAiMode]);

    const onSquareClick = useCallback(
        ({ square }: SquareHandlerArgs) => {
            if (!canPlayerMove()) return;

            if (selectedSquare) {
                const success = makeMove(selectedSquare as any, square as any);
                setSelectedSquare(null);
                setOptionSquares({});
                if (success) return;
            }

            const legalMoves = getLegalMoves(square as any);
            if (legalMoves.length > 0) {
                setSelectedSquare(square);
                const newSquares: Record<string, React.CSSProperties> = {};
                newSquares[square] = {
                    backgroundColor: 'rgba(255, 255, 0, 0.4)',
                };
                legalMoves.forEach((move) => {
                    newSquares[move] = {
                        background:
                            'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
                        borderRadius: '50%',
                    };
                });
                setOptionSquares(newSquares);
            } else {
                setSelectedSquare(null);
                setOptionSquares({});
            }
        },
        [selectedSquare, canPlayerMove, makeMove, getLegalMoves],
    );

    const onPieceDrop = useCallback(
        ({ sourceSquare, targetSquare }: PieceDropHandlerArgs) => {
            if (!canPlayerMove()) return false;
            const success = makeMove(sourceSquare as any, targetSquare as any);
            setSelectedSquare(null);
            setOptionSquares({});
            return success;
        },
        [canPlayerMove, makeMove],
    );

    const handleModeChange = (mode: GameMode) => {
        setGameMode(mode);
        resetGame();
    };

    const getStatusText = () => {
        if (gameState.isCheckmate)
            return gameState.turn === 'w'
                ? '🏆 Black wins by checkmate!'
                : '🏆 White wins by checkmate!';
        if (gameState.isStalemate) return '🤝 Draw by stalemate';
        if (gameState.isDraw) return '🤝 Draw';
        if (gameState.isCheck)
            return gameState.turn === 'w'
                ? '⚠️ White is in check!'
                : '⚠️ Black is in check!';
        if (isAiMode && isThinking) return '🤔 AI is thinking...';

        if (isAiMode) {
            return gameState.turn === 'w'
                ? '⚪ Your turn (White)'
                : '⚫ AI is playing (Black)';
        }
        return gameState.turn === 'w' ? "⚪ White's turn" : "⚫ Black's turn";
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 items-start justify-center w-full max-w-6xl mx-auto">
            {/* Left Panel - Game Info */}
            <div className="w-full lg:w-64 order-2 lg:order-1">
                <div className="bg-card border border-border rounded-2xl p-4 shadow-lg">
                    <h2 className="text-lg font-bold mb-4 text-foreground">
                        Game Info
                    </h2>

                    {/* Status */}
                    <div
                        className={`p-3 rounded-xl mb-4 text-center font-medium transition-all ${
                            gameState.isGameOver
                                ? 'bg-primary/20 text-primary'
                                : gameState.isCheck
                                ? 'bg-red-500/20 text-red-500'
                                : 'bg-muted text-muted-foreground'
                        }`}
                    >
                        {getStatusText()}
                    </div>

                    {/* Game Mode */}
                    <div className="mb-4">
                        <label className="text-sm text-muted-foreground mb-2 block">
                            Game Mode
                        </label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleModeChange('ai')}
                                disabled={isThinking}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                                    gameMode === 'ai'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-muted-foreground hover:bg-secondary'
                                } disabled:opacity-50`}
                            >
                                🤖 vs AI
                            </button>
                            <button
                                onClick={() => handleModeChange('two-player')}
                                disabled={isThinking}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                                    gameMode === 'two-player'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-muted-foreground hover:bg-secondary'
                                } disabled:opacity-50`}
                            >
                                👥 2 Players
                            </button>
                        </div>
                    </div>

                    {/* Difficulty - Only show in AI mode */}
                    {isAiMode && (
                        <div className="mb-4">
                            <label className="text-sm text-muted-foreground mb-2 block">
                                AI Difficulty
                            </label>
                            <div className="flex gap-2">
                                {(
                                    ['easy', 'medium', 'hard'] as Difficulty[]
                                ).map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => setDifficulty(d)}
                                        disabled={isThinking}
                                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                                            difficulty === d
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground hover:bg-secondary'
                                        } disabled:opacity-50`}
                                    >
                                        {d.charAt(0).toUpperCase() + d.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Controls */}
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={resetGame}
                            className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-all cursor-pointer"
                        >
                            🔄 New Game
                        </button>
                        <button
                            onClick={undoMove}
                            disabled={
                                gameState.history.length < (isAiMode ? 2 : 1) ||
                                isThinking
                            }
                            className="w-full py-2.5 px-4 bg-secondary text-secondary-foreground rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
                        >
                            ↩️ Undo Move
                        </button>
                        <button
                            onClick={() =>
                                setBoardOrientation((o) =>
                                    o === 'white' ? 'black' : 'white',
                                )
                            }
                            className="w-full py-2.5 px-4 bg-secondary text-secondary-foreground rounded-xl font-medium hover:opacity-90 transition-all cursor-pointer"
                        >
                            🔃 Flip Board
                        </button>
                    </div>
                </div>
            </div>

            {/* Center - Chessboard */}
            <div className="order-1 lg:order-2">
                <div className="bg-card border border-border rounded-2xl p-4 shadow-lg">
                    <div className="w-[min(80vw,480px)] aspect-square">
                        <Chessboard
                            options={{
                                position: gameState.fen,
                                onSquareClick: onSquareClick,
                                onPieceDrop: onPieceDrop,
                                boardOrientation: boardOrientation,
                                squareStyles: optionSquares,
                                boardStyle: {
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                                },
                                darkSquareStyle: {
                                    backgroundColor: '#779952',
                                },
                                lightSquareStyle: {
                                    backgroundColor: '#edeed1',
                                },
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Right Panel - Move History */}
            <div className="w-full lg:w-64 order-3">
                <div className="bg-card border border-border rounded-2xl p-4 shadow-lg">
                    <h2 className="text-lg font-bold mb-4 text-foreground">
                        Move History
                    </h2>
                    <div className="max-h-80 overflow-y-auto">
                        {gameState.history.length === 0 ? (
                            <p className="text-muted-foreground text-sm text-center py-4">
                                No moves yet
                            </p>
                        ) : (
                            <div className="grid grid-cols-2 gap-1 text-sm">
                                {gameState.history.map((move, index) => (
                                    <div
                                        key={index}
                                        className={`px-2 py-1 rounded ${
                                            index % 2 === 0
                                                ? 'bg-muted'
                                                : 'bg-secondary'
                                        } text-foreground`}
                                    >
                                        {index % 2 === 0 && (
                                            <span className="text-muted-foreground mr-1">
                                                {Math.floor(index / 2) + 1}.
                                            </span>
                                        )}
                                        {move}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
