// Path: "client/src/pages/GamePage.tsx"
import { useAtom } from 'jotai';
import useSocket from '../hooks/useSocket';
import ChessGame from '../components/ChessGame';
import { gameConfigAtom } from '../store/gameStore';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function GamePage() {
    const socket = useSocket();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [gameConfig] = useAtom(gameConfigAtom);
    const [waitingForOpponent, setWaitingForOpponent] = useState(false);

    const isOnline = useMemo(() => {
        return (
            searchParams.has('create') ||
            searchParams.has('room') ||
            gameConfig.mode === 'online'
        );
    }, [searchParams, gameConfig.mode]);

    useEffect(() => {
        if (!isOnline) return;

        socket.connect();

        const createRoom = searchParams.get('create') === 'true';
        const roomId = searchParams.get('room');
        const color =
            (searchParams.get('color') as 'white' | 'black') || 'white';
        const name = searchParams.get('name') || 'Guest';

        if (createRoom) {
            const isPrivate = searchParams.get('private') === 'true';
            socket.createRoom(color, !isPrivate, name);
            setWaitingForOpponent(true);
        } else if (roomId) {
            socket.joinRoom(roomId, name);
        }
        socket.onOpponentJoined(() => setWaitingForOpponent(false));

        socket.onOpponentLeft(() => setWaitingForOpponent(true));

        return () => {
            socket.leaveRoom();
            socket.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOnline]);

    const handleBack = () => {
        if (isOnline) {
            socket.leaveRoom();
            socket.disconnect();
        }
        navigate('/');
    };

    if (isOnline && waitingForOpponent && socket.roomData) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="bg-card border border-border rounded-2xl p-8 shadow-lg text-center max-w-md w-full">
                    <div className="text-6xl mb-4">⏳</div>
                    <h2 className="text-xl font-bold text-foreground mb-2">
                        Waiting for opponent...
                    </h2>
                    <p className="text-muted-foreground mb-4">
                        Share this Room ID with your friend:
                    </p>
                    <div className="bg-muted px-4 py-3 rounded-xl mb-6">
                        <code className="text-2xl font-mono text-primary">
                            {socket.roomData.roomId}
                        </code>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                        You are playing as{' '}
                        <span className="font-medium">
                            {socket.roomData.color === 'white'
                                ? '⚪ White'
                                : '⚫ Black'}
                        </span>
                    </p>
                    <div className="text-sm text-muted-foreground mb-4">
                        joined as{' '}
                        <span className="font-medium text-foreground">
                            {searchParams.get('name')}
                        </span>
                    </div>
                    <button
                        onClick={handleBack}
                        className="py-2.5 px-6 bg-secondary text-secondary-foreground rounded-xl font-medium hover:opacity-90 transition-all cursor-pointer"
                    >
                        ← Cancel
                    </button>
                </div>
            </div>
        );
    }

    if (isOnline && socket.error) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="bg-card border border-border rounded-2xl p-8 shadow-lg text-center max-w-md w-full">
                    <div className="text-6xl mb-4">❌</div>
                    <h2 className="text-xl font-bold text-foreground mb-2">
                        Connection Error
                    </h2>
                    <p className="text-muted-foreground mb-6">{socket.error}</p>
                    <button
                        onClick={handleBack}
                        className="py-2.5 px-6 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-all cursor-pointer"
                    >
                        ← Back to Menu
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="mb-4">
                <button
                    onClick={handleBack}
                    className="py-2 px-4 bg-secondary text-secondary-foreground rounded-xl font-medium hover:opacity-90 transition-all cursor-pointer"
                >
                    ← Back to Menu
                </button>
            </div>
            <ChessGame
                config={gameConfig}
                socket={isOnline ? socket : undefined}
            />
        </div>
    );
}
