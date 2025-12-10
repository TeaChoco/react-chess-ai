// Path: "client/src/pages/HomePage.tsx"
import { useSetAtom } from 'jotai';

import { useEffect, useMemo } from 'react';
import useSocket from '../hooks/useSocket';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import { gameConfigAtom } from '../store/gameStore';
import useLocalStorage from '../hooks/useLocalStorage';
import type { AIConfig, GameMode, PlayerType } from '../types/game';

export default function HomePage() {
    const socket = useSocket();
    const navigate = useNavigate();
    const setGameConfig = useSetAtom(gameConfigAtom);
    const [roomId, setRoomId] = useLocalStorage<string>('chess_roomId', '');
    const [isPrivate, setIsPrivate] = useLocalStorage<boolean>(
        'chess_isPrivate',
        false,
    );
    const [mode, setMode] = useLocalStorage<GameMode>('chess_mode', 'local');
    const [white, setWhite] = useLocalStorage<PlayerType>(
        'chess_white',
        'human',
    );
    const [black, setBlack] = useLocalStorage<PlayerType>('chess_black', 'ai');
    const [aiConfig, setAiConfig] = useLocalStorage<AIConfig>(
        'chess_aiConfig',
        {
            skillLevel: 10,
            depth: 10,
        },
    );

    const [playerName, setPlayerName] = useLocalStorage<string>(
        'chess_playerName',
        'Guest',
    );

    const hasAI = useMemo(
        () => white === 'ai' || black === 'ai',
        [white, black],
    );

    useEffect(() => {
        if (mode === 'online') {
            socket.connect();
            socket.getRooms();
        } else {
            // Don't disconnect here to allow navigation
        }
    }, [mode]);

    const startGame = () => {
        setGameConfig({
            mode,
            white,
            black,
            aiConfig,
        });
        navigate('/play');
    };

    const createRoom = () => {
        setGameConfig({
            mode: 'online',
            white: 'human',
            black: 'human',
            aiConfig: { skillLevel: 10, depth: 10 },
        });
        const queryParams = new URLSearchParams({
            create: 'true',
            name: playerName,
        });
        if (isPrivate) queryParams.append('private', 'true');
        navigate('/play?' + queryParams.toString());
    };

    const joinRoom = (id?: string) => {
        const targetId = id || roomId;
        if (!targetId?.trim()) return;

        setGameConfig({
            mode: 'online',
            white: 'human',
            black: 'human',
            roomId: targetId.trim(),
            aiConfig: { skillLevel: 10, depth: 10 },
        });
        const queryParams = new URLSearchParams({
            room: targetId.trim(),
            name: playerName,
        });
        navigate('/play?' + queryParams.toString());
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="absolute top-4 right-4">
                <ThemeToggle />
            </div>

            <div className="w-full max-w-md">
                {/* Title */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-foreground mb-2">
                        ♟️ Chess Game
                    </h1>
                    <p className="text-muted-foreground">
                        Play against AI or friends
                    </p>
                </div>

                {/* Mode Selection */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-lg mb-4">
                    <label className="text-sm text-muted-foreground mb-3 block">
                        Game Mode
                    </label>
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setMode('local')}
                            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all cursor-pointer ${
                                mode === 'local'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-secondary'
                            }`}
                        >
                            🎮 Local
                        </button>
                        <button
                            onClick={() => setMode('online')}
                            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all cursor-pointer ${
                                mode === 'online'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-secondary'
                            }`}
                        >
                            🌐 Online
                        </button>
                    </div>

                    {mode === 'online' && (
                        <div className="mb-4">
                            <label className="text-sm text-muted-foreground mb-2 block">
                                Your Name
                            </label>
                            <input
                                type="text"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                placeholder="Enter your name"
                                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    )}

                    {mode === 'local' ? (
                        <>
                            {/* White Player */}
                            <div className="mb-4">
                                <label className="text-sm text-muted-foreground mb-2 block">
                                    ⚪ White Player
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setWhite('human')}
                                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                                            white === 'human'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground hover:bg-secondary'
                                        }`}
                                    >
                                        👤 Human
                                    </button>
                                    <button
                                        onClick={() => setWhite('ai')}
                                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                                            white === 'ai'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground hover:bg-secondary'
                                        }`}
                                    >
                                        🤖 AI
                                    </button>
                                </div>
                            </div>

                            {/* Black Player */}
                            <div className="mb-4">
                                <label className="text-sm text-muted-foreground mb-2 block">
                                    ⚫ Black Player
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setBlack('human')}
                                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                                            black === 'human'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground hover:bg-secondary'
                                        }`}
                                    >
                                        👤 Human
                                    </button>
                                    <button
                                        onClick={() => setBlack('ai')}
                                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                                            black === 'ai'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground hover:bg-secondary'
                                        }`}
                                    >
                                        🤖 AI
                                    </button>
                                </div>
                            </div>

                            {/* AI Configuration */}
                            {hasAI && (
                                <div className="mb-6 space-y-3">
                                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                                        🎯 AI Configuration
                                    </h3>
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
                                                    skillLevel: Number(
                                                        e.target.value,
                                                    ),
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
                                                    depth: Number(
                                                        e.target.value,
                                                    ),
                                                }))
                                            }
                                            className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                                        />
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={startGame}
                                className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-all cursor-pointer text-lg"
                            >
                                ▶️ Start Game
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Create Room */}
                            <div className="mb-6 p-4 bg-muted/50 rounded-xl">
                                <h3 className="font-medium text-foreground mb-3">
                                    Create Room
                                </h3>
                                <button
                                    onClick={createRoom}
                                    className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-all cursor-pointer mb-3"
                                >
                                    ➕ Create Room
                                </button>
                                <div
                                    onClick={() => setIsPrivate((p) => !p)}
                                    className="flex items-center gap-3 cursor-pointer group"
                                >
                                    <div
                                        className={`w-12 h-7 rounded-full p-1 transition-all duration-300 ease-in-out ${
                                            isPrivate
                                                ? 'bg-primary'
                                                : 'bg-muted-foreground/30 group-hover:bg-muted-foreground/40'
                                        }`}
                                    >
                                        <div
                                            className={`w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ease-in-out ${
                                                isPrivate ? 'translate-x-5' : ''
                                            }`}
                                        />
                                    </div>
                                    <span
                                        className={`text-sm font-medium transition-colors ${
                                            isPrivate
                                                ? 'text-primary'
                                                : 'text-muted-foreground group-hover:text-foreground'
                                        }`}
                                    >
                                        {isPrivate
                                            ? '🔒 Private Room'
                                            : '🔓 Public Room'}
                                    </span>
                                </div>
                            </div>

                            {/* Join Room */}
                            <div className="p-4 bg-muted/50 rounded-xl mb-6">
                                <h3 className="font-medium text-foreground mb-3">
                                    Join Room
                                </h3>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={roomId}
                                        onChange={(e) =>
                                            setRoomId(e.target.value)
                                        }
                                        placeholder="Enter Room ID"
                                        className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <button
                                        onClick={() => joinRoom()}
                                        disabled={!roomId.trim()}
                                        className="py-2.5 px-4 bg-secondary text-secondary-foreground rounded-lg font-medium hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
                                    >
                                        Join
                                    </button>
                                </div>
                            </div>

                            {/* Public Rooms List */}
                            <div className="bg-card border border-border rounded-xl overflow-hidden">
                                <div className="p-4 bg-muted/50 border-b border-border flex justify-between items-center">
                                    <h3 className="font-medium text-foreground">
                                        Browse Rooms
                                    </h3>
                                    <button
                                        onClick={() => socket.getRooms()}
                                        className="text-xs text-primary hover:underline cursor-pointer"
                                    >
                                        Refresh
                                    </button>
                                </div>
                                <div className="max-h-60 overflow-y-auto">
                                    {socket.rooms.length === 0 ? (
                                        <p className="text-center py-6 text-muted-foreground text-sm">
                                            No public rooms available
                                        </p>
                                    ) : (
                                        <div className="divide-y divide-border">
                                            {socket.rooms.map((room) => (
                                                <div
                                                    key={room.id}
                                                    className="p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                                                >
                                                    <div>
                                                        <div className="font-mono text-sm font-medium text-foreground">
                                                            {room.id}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {room.players}/2
                                                            Players
                                                            {room.spectators >
                                                                0 &&
                                                                ` • ${room.spectators} Spectators`}
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() =>
                                                            joinRoom(room.id)
                                                        }
                                                        className={`px-3 py-1.5 ${
                                                            room.players === 2
                                                                ? 'bg-secondary text-secondary-foreground'
                                                                : 'bg-primary/10 text-primary'
                                                        } text-sm font-medium rounded-lg hover:opacity-80 transition-all cursor-pointer`}
                                                    >
                                                        {room.players === 2
                                                            ? 'Watch'
                                                            : 'Join'}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Quick Play Options */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => {
                            setGameConfig({
                                mode: 'local',
                                white: 'human',
                                black: 'ai',
                                aiConfig: { skillLevel: 1, depth: 1 },
                            });
                            navigate('/play');
                        }}
                        className="py-3 px-4 bg-card border border-border rounded-xl text-foreground hover:bg-secondary transition-all cursor-pointer"
                    >
                        🎯 Quick vs AI
                    </button>
                    <button
                        onClick={() => {
                            setGameConfig({
                                mode: 'local',
                                white: 'human',
                                black: 'human',
                                aiConfig: { skillLevel: 10, depth: 10 },
                            });
                            navigate('/play');
                        }}
                        className="py-3 px-4 bg-card border border-border rounded-xl text-foreground hover:bg-secondary transition-all cursor-pointer"
                    >
                        👥 2 Players
                    </button>
                </div>
            </div>
        </div>
    );
}
