import ThemeToggle from './ThemeToggle';
import { Chessboard } from 'react-chessboard';
import type { Color, Square } from 'chess.js';
import type { GameConfig } from '../types/game';
import useStockfish from '../hooks/useStockfish';
import useChess, { toColor } from '../hooks/useChess';
import useSocket, { type RoomData } from '../hooks/useSocket';
import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import type { PieceDropHandlerArgs, SquareHandlerArgs } from 'react-chessboard';

type UseSocket = ReturnType<typeof useSocket>;

interface ChessGameProps {
    config: GameConfig;
    socket?: UseSocket;
    handleBack?: () => void;
}

export default function ChessGame({
    config,
    socket,
    handleBack,
}: ChessGameProps) {
    const {
        game,
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
    const [boardOrientation, setBoardOrientation] = useState<Color>(
        config.playerColor || 'w',
    );
    const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

    const [optionSquares, setOptionSquares] = useState<
        Record<string, React.CSSProperties>
    >({});
    const [premove, setPremove] = useState<{
        from: string;
        to: string;
    } | null>(null);

    const isOnline = config.mode === 'online';
    const roomData = socket?.roomData;

    const amIWhite = isOnline
        ? roomData?.myColor === 'w'
        : config.playerColor === 'w';
    const amIBlack = isOnline
        ? roomData?.myColor === 'b'
        : config.playerColor === 'b';
    const isSpectator = isOnline ? roomData?.isSpectator : false;

    // Allow dragging if it's my piece, even if not my turn (for premoves)
    // But don't allow if spectator
    const arePiecesDraggable = !isSpectator;

    {
        roomData?.spectators.length === 0 ? (
            <div className="text-sm text-muted-foreground italic">
                No spectators
            </div>
        ) : (
            roomData?.spectators.map((s: { id: string; name: string }) => (
                <div
                    key={s.id}
                    className="text-sm flex items-center gap-2"
                >
                    <span>👀</span>
                    <span>
                        {s.name} {s.id === socket?.socketId && '(You)'}
                    </span>
                </div>
            ))
        );
    }

    console.log(roomData, isSpectator);

    // Determine if current turn is AI
    const isAiTurn = useCallback(() => {
        const currentTurn = gameState.turn === 'w' ? 'white' : 'black';
        return currentTurn === 'white'
            ? config.white === 'ai'
            : config.black === 'ai';
    }, [gameState.turn, config.white, config.black]);

    // Determine if player can move
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const prevRoomDataRef = useRef<RoomData | null>(null);

    // Detect player disconnects
    useEffect(() => {
        if (!roomData) return;
        const prev = prevRoomDataRef.current;
        if (prev) {
            if (prev.whitePlayer && !roomData.whitePlayer) {
                if (prev.whitePlayer.id !== socket?.socketId) {
                    setAlertMessage('White player disconnected. Game reset.');
                }
            }
            if (prev.blackPlayer && !roomData.blackPlayer) {
                if (prev.blackPlayer.id !== socket?.socketId) {
                    setAlertMessage('Black player disconnected. Game reset.');
                }
            }
        }
        prevRoomDataRef.current = roomData;
    }, [roomData, socket?.socketId]);

    // Determine if player can move
    const canPlayerMove = useCallback(() => {
        if (gameState.isGameOver) return false;
        if (isOnline) {
            // Must wait for 2 players
            if (!roomData?.whitePlayer || !roomData?.blackPlayer) return false;

            if (isSpectator) return false;
            return (
                (gameState.turn === 'w' && amIWhite) ||
                (gameState.turn === 'b' && amIBlack)
            );
        }
        return !isAiTurn();
    }, [
        gameState.isGameOver,
        gameState.turn,
        isOnline,
        amIWhite,
        amIBlack,
        isAiTurn,
        isSpectator,
        roomData?.whitePlayer,
        roomData?.blackPlayer,
    ]);

    // Update board orientation:
    // If I sit, orient to my color.
    // If spectator, maybe keep manual or default white?
    useEffect(() => {
        if (isOnline && roomData?.myColor) {
            setBoardOrientation(roomData.myColor);
        }
    }, [isOnline, roomData?.myColor]);

    const handleMove = useCallback(
        (from: string, to: string, promotion?: string) => {
            const success = makeMove(from as Square, to as Square, promotion);
            if (success && socket && isOnline) {
                socket.sendMove({ from, to, promotion });
            }
            return success;
        },
        [makeMove, socket, isOnline],
    );

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

        socket.onResetGame(() => {
            resetGame();
        });
    }, [socket, isOnline, makeMove, resetGame]);

    // Handle Premoves
    useEffect(() => {
        if (!premove) return;

        // Try to execute premove if it's our turn
        if (canPlayerMove()) {
            const success = handleMove(premove.from, premove.to);
            if (success) {
                setPremove(null);
                setOptionSquares({});
            } else {
                // Invalid premove (e.g. piece captured or blocked), clear it
                setPremove(null);
            }
        }
    }, [gameState.turn, canPlayerMove, handleMove, premove]);

    const onMouseOverSquare = ({ square }: SquareHandlerArgs) => {
        if (!premove && canPlayerMove()) {
            const moves = getLegalMoves(square as Square);
            if (moves.length === 0) return;

            const newSquares: Record<string, React.CSSProperties> = {};
            moves.forEach((move) => {
                newSquares[move] = {
                    background:
                        game.get(move as Square) &&
                        game.get(move as Square)?.color !==
                            game.get(square as Square)?.color
                            ? 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)'
                            : 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
                    borderRadius: '50%',
                };
            });
            newSquares[square] = {
                background: 'rgba(255, 255, 0, 0.4)',
            };
            setOptionSquares(newSquares);
        }
    };

    const onMouseOutSquare = () => {
        if (!selectedSquare) {
            setOptionSquares({});
        }
    };

    const onSquareClick = useCallback(
        ({ square }: SquareHandlerArgs) => {
            // If we have a premove, clicking anywhere cancels it
            if (premove) {
                setPremove(null);
                setOptionSquares({});
                return;
            }

            if (!canPlayerMove()) {
                // Try to set premove? Only via drag usually, but maybe click too?
                // For simplicity, let's keep click for immediate moves or confirming premoves if we wanted to support click-click premove.
                // But generally click-click is harder to distinguish from just selecting pieces.
                // Let's support clicking a piece then clicking target for premove if we want.
                // For now, let's stick to Drag for premoves or simple implemented Click logic.

                // Refactoring click to support premove clicking:
                // 1. Select piece (if mine)
                // 2. Select target
                if (selectedSquare) {
                    // Start premove
                    // Basic check: is valid 'shape' of move? We can't validate 100% without board state future,
                    // but we can at least check if it makes sense (e.g. not same color).
                    // Actually, letting users premove ANYTHING is risky visually.
                    // Let's restrict to: simple logic.
                    setPremove({ from: selectedSquare, to: square });
                    setSelectedSquare(null);
                    return;
                }

                // Select a piece for premove
                // Must be my piece
                const piece = game.get(square as Square);
                if (
                    piece &&
                    ((isOnline &&
                        ((amIWhite && piece.color === 'w') ||
                            (amIBlack && piece.color === 'b'))) ||
                        (!isOnline &&
                            ((config.white === 'human' &&
                                piece.color === 'w') ||
                                (config.black === 'human' &&
                                    piece.color === 'b'))))
                ) {
                    setSelectedSquare(square);
                    // We can't show legal moves for premoves easily because we don't know the board state then.
                    // So minimal feedback.
                    setOptionSquares({
                        [square]: { backgroundColor: 'rgba(255, 0, 0, 0.4)' },
                    });
                } else if (!isOnline) {
                    // Local game spectator/AI vs AI case?
                    // Allow selecting if it's the color's turn? No it's NOT turn.
                    // So just ignore.
                }

                return;
            }

            // Normal Move Logic
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
                            game.get(move as Square) &&
                            game.get(move as Square)?.color !==
                                game.get(square as Square)?.color
                                ? 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)'
                                : 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
                        borderRadius: '50%',
                    };
                });
                setOptionSquares(newSquares);
            } else {
                setSelectedSquare(null);
                setOptionSquares({});
            }
        },
        [
            selectedSquare,
            canPlayerMove,
            handleMove,
            getLegalMoves,
            premove,
            game,
            isOnline,
            amIWhite,
            amIBlack,
            config.white,
            config.black,
        ],
    );

    const onPieceDrop = useCallback(
        ({ sourceSquare, targetSquare }: PieceDropHandlerArgs) => {
            if (!sourceSquare || !targetSquare) return false;

            if (canPlayerMove()) {
                const success = handleMove(sourceSquare, targetSquare);
                setSelectedSquare(null);
                setOptionSquares({});
                return success;
            }

            // Premove Logic
            // Check if piece is mine
            const piece = game.get(sourceSquare as Square);
            const isMyPiece = isOnline
                ? (amIWhite && piece?.color === 'w') ||
                  (amIBlack && piece?.color === 'b')
                : true; // Local game, can premove for current "waiting" side? Or simplify: only if not Spectator.

            // If it's my piece and NOT my turn, treat as premove
            if (isMyPiece && !isSpectator && !canPlayerMove()) {
                setPremove({ from: sourceSquare, to: targetSquare });
                setSelectedSquare(null);
                // Clear previous option squares to show premove clearly
                setOptionSquares({});
                return false; // Snap back, visual will be handled by customSquareStyles
            }

            return false;
        },
        [
            canPlayerMove,
            handleMove,
            game,
            isOnline,
            amIWhite,
            amIBlack,
            isSpectator,
        ],
    );

    // Merge styles for Option Squares and Premoves
    const customSquareStyles = useMemo(() => {
        const styles = { ...optionSquares };
        if (premove) {
            styles[premove.from] = {
                backgroundColor: 'rgba(200, 0, 0, 0.4)',
            };
            styles[premove.to] = {
                backgroundColor: 'rgba(200, 0, 0, 0.4)',
            };
        }
        // Also highlight last move from history if available? (game.history({verbose: true}).pop())
        // But chessboard might handle last move highlight automatically or we need to add it?
        // react-chessboard doesn't auto-highlight last move squares usually.
        // Let's stick to requested features first.
        return styles;
    }, [optionSquares, premove]);

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
            if (!roomData?.whitePlayer || !roomData?.blackPlayer)
                return '👥 Waiting for players...';

            if (isSpectator)
                return gameState.turn === 'w'
                    ? "Spectating: White's turn"
                    : "Spectating: Black's turn";

            const isYourTurn =
                (gameState.turn === 'w' && amIWhite) ||
                (gameState.turn === 'b' && amIBlack);
            return isYourTurn ? '🎯 Your turn' : "⏳ Opponent's turn";
        }

        return gameState.turn === 'w'
            ? `⚪ ${config.white === 'ai' ? 'AI' : 'White'}'s turn`
            : `⚫ ${config.black === 'ai' ? 'AI' : 'Black'}'s turn`;
    };

    return (
        <div className="flex flex-col items-center gap-4 lg:gap-6 w-full max-w-6xl mx-auto p-2 md:p-4">
            {/* Alert Toast */}
            {alertMessage && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 w-[90%] max-w-md">
                    <div
                        className="bg-red-800/60 text-red-50 px-4 py-3 rounded-lg shadow-lg flex items-center justify-between gap-4 border border-red-500/20 cursor-pointer"
                        onClick={() => setAlertMessage(null)}
                    >
                        <span className="text-sm">⚠️ {alertMessage}</span>
                        <button className="text-sm opacity-100 hover:opacity-100 px-2">
                            ✕
                        </button>
                    </div>
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 w-full">
                {/* Left Panel - Game Info */}
                <div className="w-full lg:w-64 order-2 lg:order-1">
                    <div className="bg-card border border-border rounded-2xl p-4 shadow-lg mb-4">
                        <div className="mb-2 hidden lg:flex">
                            <button
                                onClick={handleBack}
                                className="py-2 w-full px-4 bg-secondary text-secondary-foreground rounded-xl font-medium hover:opacity-90 transition-all cursor-pointer"
                            >
                                ← Back to Menu
                            </button>
                        </div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-foreground">
                                Game Info
                            </h2>
                            <ThemeToggle />
                        </div>

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

                        {/* Online Room ID */}
                        {isOnline && roomData && (
                            <div className="mb-4">
                                <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 mb-3">
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                                        Room ID
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <code className="font-mono font-bold text-lg select-all">
                                            {roomData.roomId}
                                        </code>
                                        <button
                                            onClick={() =>
                                                navigator.clipboard.writeText(
                                                    roomData.roomId,
                                                )
                                            }
                                            className="text-primary hover:text-primary/80"
                                        >
                                            📋
                                        </button>
                                    </div>
                                </div>

                                {/* Seat Status */}
                                <div className="space-y-2">
                                    {/* White Seat */}
                                    <div
                                        className={`flex items-center justify-between p-2 rounded-lg border ${
                                            roomData.whitePlayer
                                                ? 'border-primary/20 bg-card'
                                                : 'border-dashed border-muted-foreground/30 bg-muted/30'
                                        }`}
                                    >
                                        <div className="flex justify-between flex-col">
                                            <div className="text-xs font-bold text-muted-foreground uppercase">
                                                ⚪ White Seat
                                            </div>
                                            <div className="font-medium text-sm truncate">
                                                {roomData.whitePlayer
                                                    ? roomData.whitePlayer.name
                                                    : 'Empty'}
                                            </div>
                                        </div>
                                        {!roomData.whitePlayer &&
                                            isSpectator && (
                                                <button
                                                    onClick={() =>
                                                        socket?.claimSeat('w')
                                                    }
                                                    className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded cursor-pointer hover:opacity-90"
                                                >
                                                    Sit
                                                </button>
                                            )}
                                        {amIWhite && (
                                            <button
                                                onClick={() =>
                                                    socket?.leaveSeat()
                                                }
                                                className="text-xs bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded cursor-pointer hover:bg-red-500/20"
                                            >
                                                Stand
                                            </button>
                                        )}
                                    </div>

                                    {/* Black Seat */}
                                    <div
                                        className={`flex items-center justify-between p-2 rounded-lg border ${
                                            roomData.blackPlayer
                                                ? 'border-primary/20 bg-card'
                                                : 'border-dashed border-muted-foreground/30 bg-muted/30'
                                        }`}
                                    >
                                        <div className="flex justify-between flex-col">
                                            <div className="text-xs font-bold text-muted-foreground uppercase">
                                                ⚫ Black Seat
                                            </div>
                                            <div className="font-medium text-sm truncate">
                                                {roomData.blackPlayer
                                                    ? roomData.blackPlayer.name
                                                    : 'Empty'}
                                            </div>
                                        </div>
                                        {!roomData.blackPlayer &&
                                            isSpectator && (
                                                <button
                                                    onClick={() =>
                                                        socket?.claimSeat('b')
                                                    }
                                                    className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded cursor-pointer hover:opacity-90"
                                                >
                                                    Sit
                                                </button>
                                            )}
                                        {amIBlack && (
                                            <button
                                                onClick={() =>
                                                    socket?.leaveSeat()
                                                }
                                                className="text-xs bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded cursor-pointer hover:bg-red-500/20"
                                            >
                                                Stand
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* AI Config */}
                        {hasAI && !isOnline && (
                            <div className="mb-4 space-y-3">
                                {/* ... AI controls ... */}
                                {/* Simplified for brevity as they were unchanged */}
                                <div>Skill: {aiConfig.skillLevel}</div>
                                <input
                                    type="range"
                                    min="0"
                                    max="20"
                                    value={aiConfig.skillLevel}
                                    onChange={(e) =>
                                        setAiConfig((c) => ({
                                            ...c,
                                            skillLevel: +e.target.value,
                                        }))
                                    }
                                    className="w-full"
                                />
                            </div>
                        )}

                        {/* Local Controls */}
                        {!isOnline && (
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={resetGame}
                                    className="w-full py-2 bg-primary text-primary-foreground rounded-lg"
                                >
                                    New Game
                                </button>
                                <button
                                    onClick={undoMove}
                                    className="w-full py-2 bg-secondary rounded-lg"
                                >
                                    Undo
                                </button>
                            </div>
                        )}
                        <button
                            onClick={() =>
                                setBoardOrientation((value) =>
                                    value === 'w' ? 'b' : 'w',
                                )
                            }
                            className="w-full mt-2 py-2 px-4 bg-secondary text-secondary-foreground rounded-xl font-medium hover:opacity-90 transition-all cursor-pointer"
                        >
                            🔃 Flip Board
                        </button>
                    </div>

                    {/* Error Display */}
                    {socket?.error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl mb-4 text-sm font-medium">
                            ⚠️ {socket.error}
                        </div>
                    )}

                    {/* Spectators List */}
                    {isOnline && roomData?.spectators && (
                        <div className="bg-card border border-border rounded-2xl p-4 shadow-lg">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase mb-2">
                                Spectators ({roomData.spectators.length})
                            </h3>
                            <div className="space-y-1">
                                {roomData.spectators.length === 0 ? (
                                    <div className="text-sm text-muted-foreground italic">
                                        No spectators
                                    </div>
                                ) : (
                                    roomData.spectators.map((s) => (
                                        <div
                                            key={s.id}
                                            className="text-sm flex items-center gap-2"
                                        >
                                            <span>👀</span>
                                            <span>
                                                {s.name}{' '}
                                                {s.id === socket?.socketId &&
                                                    '(You)'}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Center - Chessboard */}
                <div className="order-1 lg:order-2 flex flex-col gap-4 w-full lg:flex-1 min-w-0">
                    {/* Top Label */}
                    <div className="bg-card/50 px-4 py-2 rounded-xl flex items-center justify-between border border-border">
                        <span className="font-medium">
                            {boardOrientation === 'w'
                                ? roomData?.blackPlayer?.name || 'Black'
                                : roomData?.whitePlayer?.name || 'White'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {boardOrientation === 'w'
                                ? roomData?.blackPlayer
                                    ? 'Connected'
                                    : 'Empty'
                                : roomData?.whitePlayer
                                ? 'Connected'
                                : 'Empty'}
                        </span>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-2 md:p-4 shadow-lg flex justify-center items-center">
                        <div className="w-full max-w-[85vw] md:max-w-[600px] lg:max-w-[70vh] aspect-square">
                            {/* <Chessboard
                                position={gameState.fen}
                                onPieceDrop={onPieceDrop}
                                onSquareClick={onSquareClick}
                                onMouseOverSquare={onMouseOverSquare}
                                onMouseOutSquare={onMouseOutSquare}
                                customSquareStyles={customSquareStyles}
                                boardOrientation={toColor(boardOrientation)}
                                arePiecesDraggable={arePiecesDraggable}
                                customBoardStyle={{
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                                }}
                                customDarkSquareStyle={{
                                    backgroundColor: 'gray',
                                }}
                                customLightSquareStyle={{
                                    backgroundColor: 'white',
                                }}
                            /> */}
                            <Chessboard
                                options={{
                                    position: gameState.fen,
                                    onPieceDrop: onPieceDrop,
                                    onSquareClick: onSquareClick,
                                    onMouseOutSquare: onMouseOutSquare,
                                    onMouseOverSquare: onMouseOverSquare,
                                    squareStyles: customSquareStyles,
                                    boardOrientation: toColor(boardOrientation),
                                    boardStyle: {
                                        borderRadius: '8px',
                                        boxShadow:
                                            '0 4px 20px rgba(0, 0, 0, 0.15)',
                                    },
                                    darkSquareStyle: {
                                        backgroundColor: 'gray',
                                    },
                                    lightSquareStyle: {
                                        backgroundColor: 'white',
                                    },
                                }}
                            />
                        </div>
                    </div>

                    {/* Bottom Label */}
                    <div className="bg-card/50 px-4 py-2 rounded-xl flex items-center justify-between border border-border">
                        <span className="font-medium">
                            {boardOrientation === 'w'
                                ? roomData?.whitePlayer?.name || 'White'
                                : roomData?.blackPlayer?.name || 'Black'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {boardOrientation === 'w'
                                ? roomData?.whitePlayer
                                    ? 'Connected'
                                    : 'Empty'
                                : roomData?.blackPlayer
                                ? 'Connected'
                                : 'Empty'}
                        </span>
                    </div>
                </div>

                {/* Right Panel - Move History */}
                <div className="w-full lg:w-64 order-3 flex flex-col">
                    <div className="bg-card border border-border rounded-2xl p-4 shadow-lg flex-1 flex flex-col h-full max-h-64 lg:max-h-128">
                        <h2 className="text-lg font-bold mb-4 text-foreground shrink-0">
                            Move History
                        </h2>
                        <div className="overflow-y-auto flex-1 pr-1">
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
                                            } text-foreground text-center`}
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
        </div>
    );
}
