// Path: "client/src/pages/GamePage.tsx"
import { useAtom } from 'jotai';
import useSocket from '../hooks/useSocket';
import { useEffect, useMemo } from 'react';
import ChessGame from '../components/ChessGame';
import { gameConfigAtom } from '../store/gameStore';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function GamePage() {
    const socket = useSocket();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [gameConfig, setGameConfig] = useAtom(gameConfigAtom);

    const isOnline = useMemo(() => {
        return (
            searchParams.has('create') ||
            searchParams.has('room') ||
            gameConfig.mode === 'online'
        );
    }, [searchParams, gameConfig.mode]);

    useEffect(() => {
        if (!isOnline) return;

        // Ensure config is online
        if (gameConfig.mode !== 'online')
            setGameConfig((prev) => ({
                ...prev,
                mode: 'online',
                white: 'human',
                black: 'human',
            }));

        socket.connect();

        const createRoom = searchParams.get('create') === 'true';
        const roomId = searchParams.get('room');

        const name = searchParams.get('name') || 'Guest';

        if (createRoom) {
            const isPrivate = searchParams.get('private') === 'true';
            socket.createRoom(!isPrivate, name);
        } else if (roomId) {
            socket.joinRoom(roomId, name);
        }

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
