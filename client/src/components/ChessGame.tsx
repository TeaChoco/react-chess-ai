// Path: "client/src/components/ChessGame.tsx"
import ThemeToggle from './ThemeToggle';
import useChess from '../hooks/useChess';
import { Chessboard } from 'react-chessboard';
import type { GameConfig } from '../types/game';
import useStockfish from '../hooks/useStockfish';
import type { UseSocket } from '../hooks/useSocket';
import { useCallback, useEffect, useState } from 'react';
import type { PieceDropHandlerArgs, SquareHandlerArgs } from 'react-chessboard';

interface ChessGameProps {
    config: GameConfig;
    socket?: UseSocket;
}

export default function ChessGame({ config, socket }: ChessGameProps) {
    const {
        gameState,
        makeMove,
        makeMoveFromUci,
        getLegalMoves,
        resetGame,
        undoMove,
    } = useChess();
    const { isReady: aiReady, isThinking, getBestMove } = useStockfish();
    const [aiConfig, setAiConfig] = useState(
        config.aiConfig || { skillLevel: 10, depth: 10 },
    );
    const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>(
        config.playerColor || 'white',
    );
    const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
    const [optionSquares, setOptionSquares] = useState<
        Record<string, React.CSSProperties>
    >({});

    const isOnline = config.mode === 'online';
    const playerColor = isOnline
        ? socket?.roomData?.color || 'white'
        : config.playerColor || 'white';

    // Determine if current turn is AI
    const isAiTurn = useCallback(() => {
        const currentTurn = gameState.turn === 'w' ? 'white' : 'black';
        return currentTurn === 'white'
            ? config.white === 'ai'
            : config.black === 'ai';
    }, [gameState.turn, config.white, config.black]);

    // Determine if player can move
    const canPlayerMove = useCallback(() => {
        if (gameState.isGameOver) return false;
        if (isOnline) {
            if (socket?.roomData?.isSpectator) return false;
            return (
                (gameState.turn === 'w' && playerColor === 'white') ||
                (gameState.turn === 'b' && playerColor === 'black')
            );
        }
        return !isAiTurn();
    }, [
        gameState.isGameOver,
        gameState.turn,
        isOnline,
        playerColor,
        isAiTurn,
        socket?.roomData?.isSpectator,
    ]);

    // Update board orientation when player color changes (for online play)
    useEffect(() => {
        if (isOnline && socket?.roomData?.color) {
            setBoardOrientation(socket.roomData.color);
        }
    }, [isOnline, socket?.roomData?.color]);

    // AI makes move
    useEffect(() => {
        if (isAiTurn() && !gameState.isGameOver && aiReady && !isThinking) {
            const timer = setTimeout(() => {
                getBestMove(gameState.fen, aiConfig, (bestMove) =>
                    makeMoveFromUci(bestMove),
                );
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [
        isAiTurn,
        gameState.fen,
        gameState.isGameOver,
        aiReady,
        isThinking,
        getBestMove,
        makeMoveFromUci,
    ]);

    // Listen for online moves
    useEffect(() => {
        if (!socket || !isOnline) return;

        socket.onMoveReceived((move) => {
            makeMove(move.from as any, move.to as any, move.promotion);
        });
    }, [socket, isOnline, makeMove]);

    const handleMove = useCallback(
        (from: string, to: string, promotion?: string) => {
            const success = makeMove(from as any, to as any, promotion);
            if (success && socket && isOnline) {
                socket.sendMove({ from, to, promotion });
            }
            return success;
        },
        [makeMove, socket, isOnline],
    );

    const onSquareClick = useCallback(
        ({ square }: SquareHandlerArgs) => {
            if (!canPlayerMove()) return;

            if (selectedSquare) {
                const success = handleMove(selectedSquare, square);
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
        [selectedSquare, canPlayerMove, handleMove, getLegalMoves],
    );

    const onPieceDrop = useCallback(
        ({ sourceSquare, targetSquare }: PieceDropHandlerArgs) => {
            if (!canPlayerMove()) return false;
            if (!sourceSquare || !targetSquare) return false;
            const success = handleMove(sourceSquare, targetSquare);
            setSelectedSquare(null);
            setOptionSquares({});
            return success;
        },
        [canPlayerMove, handleMove],
    );

    const hasAI = config.white === 'ai' || config.black === 'ai';

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
        if (isThinking) return '🤔 AI is thinking...';

        if (isOnline) {
            if (socket?.roomData?.isSpectator) {
                return gameState.turn === 'w'
                    ? "Spectating: White's turn"
                    : "Spectating: Black's turn";
            }
            const isYourTurn =
                (gameState.turn === 'w' && playerColor === 'white') ||
                (gameState.turn === 'b' && playerColor === 'black');
            return isYourTurn ? '🎯 Your turn' : "⏳ Opponent's turn";
        }

        return gameState.turn === 'w'
            ? `⚪ ${config.white === 'ai' ? 'AI' : 'White'}'s turn`
            : `⚫ ${config.black === 'ai' ? 'AI' : 'Black'}'s turn`;
    };

    const getPlayerName = (color: 'white' | 'black') => {
        if (!isOnline || !socket?.roomData?.players) {
            const type = config[color];
            return type === 'ai'
                ? '🤖 AI'
                : color === 'white'
                ? '⚪ Player'
                : '⚫ Player';
        }
        const player = socket.roomData.players.find((p) => p.color === color);
        return player
            ? (color === 'white' ? '⚪ ' : '⚫ ') + player.name
            : 'Waiting...';
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 items-start justify-center w-full max-w-6xl mx-auto">
            {/* Left Panel - Game Info */}
            <div className="w-full lg:w-64 order-2 lg:order-1">
                <div className="bg-card border border-border rounded-2xl p-4 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-foreground">
                            Game Info
                        </h2>
                        <ThemeToggle />
                    </div>

                    {/* Online Room ID */}
                    {isOnline && socket?.roomData && (
                        <div className="mb-4 p-4 bg-linear-to-r from-primary/20 to-purple-500/20 rounded-xl border border-primary/30">
                            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">
                                Room ID
                            </div>
                            <div className="flex items-center gap-2">
                                <code className="text-xl font-bold font-mono text-primary tracking-widest">
                                    {socket.roomData.roomId}
                                </code>
                                <button
                                    onClick={() =>
                                        navigator.clipboard.writeText(
                                            socket.roomData?.roomId || '',
                                        )
                                    }
                                    className="p-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 transition-all cursor-pointer"
                                    title="Copy Room ID"
                                >
                                    📋
                                </button>
                            </div>
                            <div className="mt-2 text-xs">
                                {socket.roomData.opponentConnected ? (
                                    <span className="text-green-500">
                                        ✅ Opponent connected
                                    </span>
                                ) : (
                                    <span className="text-yellow-500">
                                        ⏳ Waiting for opponent...
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

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

                    {/* AI Config - Only show if has AI */}
                    {hasAI && !isOnline && (
                        <div className="mb-4 space-y-3">
                            <div>
                                <label className="text-sm text-muted-foreground mb-1 flex justify-between">
                                    <span>Skill Level (0-20)</span>
                                    <span className="font-mono text-primary">
                                        {aiConfig.skillLevel}
                                    </span>
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="20"
                                    value={aiConfig.skillLevel}
                                    onChange={(e) =>
                                        setAiConfig((c) => ({
                                            ...c,
                                            skillLevel: Number(e.target.value),
                                        }))
                                    }
                                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-muted-foreground mb-1 flex justify-between">
                                    <span>Search Depth (1-20)</span>
                                    <span className="font-mono text-primary">
                                        {aiConfig.depth}
                                    </span>
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="20"
                                    value={aiConfig.depth}
                                    onChange={(e) =>
                                        setAiConfig((c) => ({
                                            ...c,
                                            depth: Number(e.target.value),
                                        }))
                                    }
                                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                            </div>
                        </div>
                    )}

                    {/* Controls */}
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={resetGame}
                            disabled={isOnline}
                            className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
                        >
                            🔄 New Game
                        </button>
                        <button
                            onClick={undoMove}
                            disabled={
                                gameState.history.length < 1 ||
                                isThinking ||
                                isOnline
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
            <div className="order-1 lg:order-2 flex flex-col gap-4">
                {/* Top Player (Black if we turn board is white, else White) */}
                <div className="bg-card/50 px-4 py-2 rounded-xl flex items-center gap-2 border border-border">
                    <div className="font-medium text-foreground">
                        {getPlayerName(
                            boardOrientation === 'white' ? 'black' : 'white',
                        )}
                    </div>
                </div>

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

                {/* Bottom Player (You/White) */}
                <div className="bg-card/50 px-4 py-2 rounded-xl flex items-center justify-between border border-border">
                    <div className="font-medium text-foreground">
                        {getPlayerName(boardOrientation)}
                    </div>
                    {socket?.roomData?.isSpectator && (
                        <div className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-lg font-bold uppercase tracking-wider">
                            Spectating
                        </div>
                    )}
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
