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
        <div className="min-h-screen bg-linear-to-br from-background via-muted/80 to-background flex items-center justify-center p-4">
            <div className="absolute top-4 right-4">
                <ThemeToggle />
            </div>

            <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
                {/* Left Side - Hero (Desktop) */}
                <div className="text-center lg:text-left space-y-6">
                    <div className="inline-block p-4 bg-primary/10 rounded-3xl mb-2 animate-in fade-in zoom-in duration-500">
                        <span className="text-6xl lg:text-8xl filter drop-shadow-lg">
                            ♟️
                        </span>
                    </div>
                    <div>
                        <h1 className="text-4xl lg:text-6xl font-black text-foreground tracking-tight mb-4">
                            Master the <br className="hidden lg:block" />
                            <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-purple-600">
                                Game of Kings
                            </span>
                        </h1>
                        <p className="text-lg text-muted-foreground max-w-md mx-auto lg:mx-0 leading-relaxed">
                            Play locally against AI or challenge friends online
                            in real-time. Experience chess like never before.
                        </p>
                    </div>

                    {/* Stats or Features Chips (Optional decoration) */}
                    <div className="flex flex-wrap gap-3 justify-center lg:justify-start pt-2">
                        <div className="px-3 py-1 bg-card border border-border rounded-full text-xs font-medium text-muted-foreground shadow-sm">
                            ✨ Smart AI
                        </div>
                        <div className="px-3 py-1 bg-card border border-border rounded-full text-xs font-medium text-muted-foreground shadow-sm">
                            🚀 Real-time
                        </div>
                        <div className="px-3 py-1 bg-card border border-border rounded-full text-xs font-medium text-muted-foreground shadow-sm">
                            📱 Responsive
                        </div>
                    </div>
                </div>

                {/* Right Side - Action Card */}
                <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-3xl p-6 lg:p-8 shadow-2xl w-full max-w-md mx-auto animate-in slide-in-from-bottom-8 duration-700">
                    {/* Mode Tabs */}
                    <div className="flex p-1 bg-muted/50 rounded-xl mb-8">
                        <button
                            onClick={() => setMode('local')}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                mode === 'local'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            🎮 Local Play
                        </button>
                        <button
                            onClick={() => setMode('online')}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                mode === 'online'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            🌐 Online Multiplayer
                        </button>
                    </div>

                    {mode === 'local' ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Player Selection Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        White
                                    </label>
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => setWhite('human')}
                                            className={`py-2 px-3 rounded-xl border-2 transition-all ${
                                                white === 'human'
                                                    ? 'border-primary bg-primary/5 text-primary'
                                                    : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted'
                                            }`}
                                        >
                                            👤 Human
                                        </button>
                                        <button
                                            onClick={() => setWhite('ai')}
                                            className={`py-2 px-3 rounded-xl border-2 transition-all ${
                                                white === 'ai'
                                                    ? 'border-primary bg-primary/5 text-primary'
                                                    : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted'
                                            }`}
                                        >
                                            🤖 AI
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        Black
                                    </label>
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => setBlack('human')}
                                            className={`py-2 px-3 rounded-xl border-2 transition-all ${
                                                black === 'human'
                                                    ? 'border-primary bg-primary/5 text-primary'
                                                    : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted'
                                            }`}
                                        >
                                            👤 Human
                                        </button>
                                        <button
                                            onClick={() => setBlack('ai')}
                                            className={`py-2 px-3 rounded-xl border-2 transition-all ${
                                                black === 'ai'
                                                    ? 'border-primary bg-primary/5 text-primary'
                                                    : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted'
                                            }`}
                                        >
                                            🤖 AI
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* AI Config */}
                            {hasAI && (
                                <div className="p-4 bg-muted/30 rounded-xl space-y-4 border border-border/50">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-sm">
                                            Target Strength
                                        </h3>
                                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono">
                                            Lvl {aiConfig.skillLevel}
                                        </span>
                                    </div>
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
                                    <p className="text-xs text-muted-foreground">
                                        Higher skill levels increase Stockfish
                                        depth and calculation time.
                                    </p>
                                    <input
                                        type="range"
                                        min="0"
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
                                    <p className="text-xs text-muted-foreground">
                                        Higher skill levels increase Stockfish
                                        depth and calculation time.
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={startGame}
                                className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Start Game
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                    Your Identity
                                </label>
                                <input
                                    type="text"
                                    value={playerName}
                                    onChange={(e) =>
                                        setPlayerName(e.target.value)
                                    }
                                    placeholder="Enter your name"
                                    className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-colors"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={createRoom}
                                    className="p-4 bg-primary/5 border-2 border-primary/20 hover:border-primary/50 text-primary rounded-xl flex flex-col items-center gap-2 transition-all hover:bg-primary/10 group"
                                >
                                    <span className="text-2xl group-hover:scale-110 transition-transform">
                                        ➕
                                    </span>
                                    <span className="font-bold text-sm">
                                        Create Room
                                    </span>
                                </button>
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-linear-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none" />
                                    <button
                                        onClick={() => setIsPrivate(!isPrivate)}
                                        className={`w-full h-full p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${
                                            isPrivate
                                                ? 'bg-amber-500/5 border-amber-500/20 text-amber-600'
                                                : 'bg-green-500/5 border-green-500/20 text-green-600'
                                        }`}
                                    >
                                        <span className="text-2xl">
                                            {isPrivate ? '🔒' : '🔓'}
                                        </span>
                                        <span className="font-bold text-sm">
                                            {isPrivate ? 'Private' : 'Public'}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-bold text-muted-foreground">
                                        Available Rooms
                                    </span>
                                    <button
                                        onClick={() => socket.getRooms()}
                                        className="text-primary hover:text-primary/80 text-xs font-medium"
                                    >
                                        Refresh
                                    </button>
                                </div>
                                <div className="h-48 overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                                    {socket.rooms.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 border-2 border-dashed border-border/50 rounded-xl">
                                            <span className="text-2xl mb-2">
                                                😴
                                            </span>
                                            <span className="text-sm">
                                                No active rooms
                                            </span>
                                        </div>
                                    ) : (
                                        socket.rooms.map((room) => (
                                            <div
                                                key={room.id}
                                                className="group p-3 bg-secondary/30 hover:bg-secondary/50 border border-border/50 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
                                                onClick={() =>
                                                    joinRoom(room.id)
                                                }
                                            >
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-xs font-bold opacity-70">
                                                        #{room.id.slice(0, 4)}
                                                    </span>
                                                    <div className="flex items-center gap-2 text-sm font-medium">
                                                        <span>
                                                            {room.players}/2
                                                        </span>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {room.spectators > 0 && (
                                                        <span className="text-xs text-muted-foreground">
                                                            👁️ {room.spectators}
                                                        </span>
                                                    )}
                                                    <span className="p-2 bg-background rounded-lg text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                                        Join →
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={roomId}
                                        onChange={(e) =>
                                            setRoomId(e.target.value)
                                        }
                                        placeholder="Or enter Room ID..."
                                        className="flex-1 px-4 py-3 bg-secondary/20 border border-border focus:border-primary rounded-xl text-sm outline-none transition-colors"
                                    />
                                    <button
                                        onClick={() => joinRoom()}
                                        disabled={!roomId.trim()}
                                        className="px-4 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-xl font-bold disabled:opacity-50 transition-colors"
                                    >
                                        Go
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
