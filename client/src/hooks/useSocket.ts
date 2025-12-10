// Path: "client/src/hooks/useSocket.ts"
import { io, Socket } from 'socket.io-client';
import { useCallback, useEffect, useRef, useState } from 'react';

interface RoomData {
    roomId: string;
    playerColor: 'white' | 'black';
    opponentConnected: boolean;
}

export interface RoomInfo {
    id: string;
    players: number;
    fen: string;
}

interface MoveData {
    from: string;
    to: string;
    promotion?: string;
}

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export default function useSocket() {
    const socketRef = useRef<Socket | null>(null);
    const [rooms, setRooms] = useState<RoomInfo[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const onOpponentLeftRef = useRef<(() => void) | null>(null);
    const onOpponentJoinedRef = useRef<(() => void) | null>(null);
    const [roomData, setRoomData] = useState<RoomData | null>(null);
    const onMoveReceivedRef = useRef<((move: MoveData) => void) | null>(null);

    useEffect(() => {
        const socket = io(SERVER_URL, {
            transports: ['websocket'],
            autoConnect: false,
        });

        socket.on('connect', () => {
            setIsConnected(true);
            setError(null);
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        socket.on('connect_error', () => {
            setError('Failed to connect to server');
            setIsConnected(false);
        });

        socket.on(
            'room-created',
            (data: { roomId: string; color: 'white' | 'black' }) => {
                setRoomData({
                    roomId: data.roomId,
                    playerColor: data.color,
                    opponentConnected: false,
                });
            },
        );

        socket.on(
            'room-joined',
            (data: { roomId: string; color: 'white' | 'black' }) => {
                setRoomData({
                    roomId: data.roomId,
                    playerColor: data.color,
                    opponentConnected: true,
                });
            },
        );

        socket.on('opponent-joined', () => {
            setRoomData((prev) =>
                prev ? { ...prev, opponentConnected: true } : null,
            );
            onOpponentJoinedRef.current?.();
        });

        socket.on('opponent-left', () => {
            setRoomData((prev) =>
                prev ? { ...prev, opponentConnected: false } : null,
            );
            onOpponentLeftRef.current?.();
        });

        socket.on('move', (move: MoveData) => {
            onMoveReceivedRef.current?.(move);
        });

        socket.on('error', (message: string) => {
            setError(message);
        });

        socket.on('rooms-list', (rooms: RoomInfo[]) => {
            setRooms(rooms);
        });

        socketRef.current = socket;

        return () => {
            socket.disconnect();
        };
    }, []);

    const connect = useCallback(() => {
        socketRef.current?.connect();
    }, []);

    const disconnect = useCallback(() => {
        socketRef.current?.disconnect();
        setRoomData(null);
    }, []);

    const createRoom = useCallback(
        (color: 'white' | 'black', isPublic: boolean = true) => {
            socketRef.current?.emit('create-room', { color, isPublic });
        },
        [],
    );

    const joinRoom = useCallback((roomId: string) => {
        socketRef.current?.emit('join-room', { roomId });
    }, []);

    const getRooms = useCallback(() => {
        socketRef.current?.emit('get-rooms');
    }, []);

    const sendMove = useCallback((move: MoveData) => {
        socketRef.current?.emit('move', move);
    }, []);

    const leaveRoom = useCallback(() => {
        socketRef.current?.emit('leave-room');
        setRoomData(null);
    }, []);

    const onMoveReceived = useCallback((callback: (move: MoveData) => void) => {
        onMoveReceivedRef.current = callback;
    }, []);

    const onOpponentJoined = useCallback((callback: () => void) => {
        onOpponentJoinedRef.current = callback;
    }, []);

    const onOpponentLeft = useCallback((callback: () => void) => {
        onOpponentLeftRef.current = callback;
    }, []);

    return {
        isConnected,
        roomData,
        rooms,
        error,
        connect,
        disconnect,
        createRoom,
        joinRoom,
        getRooms,
        sendMove,
        leaveRoom,
        onMoveReceived,
        onOpponentJoined,
        onOpponentLeft,
    };
}
