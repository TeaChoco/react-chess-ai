// Path: "client/src/hooks/useSocket.ts"
import type { Color } from 'chess.js';
import { io, Socket } from 'socket.io-client';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface Player {
    id: string;
    color: Color;
    name: string;
}

export interface Spectator {
    id: string;
    name: string;
}

export interface RoomData {
    roomId: string;
    fen: string;
    whitePlayer?: Player | null;
    blackPlayer?: Player | null;
    spectators: Spectator[];
    myColor?: Color | null;
    isSpectator: boolean;
}

export interface RoomInfo {
    id: string;
    players: number;
    spectators: number;
    fen: string;
}

export interface MoveData {
    from: string;
    to: string;
    promotion?: string;
}

export type UseSocket = ReturnType<typeof useSocket>;

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export default function useSocket() {
    const socketRef = useRef<Socket | null>(null);
    const [rooms, setRooms] = useState<RoomInfo[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [roomData, setRoomData] = useState<RoomData | null>(null);
    const onMoveReceivedRef = useRef<((move: MoveData) => void) | null>(null);
    const onResetGameRef = useRef<(() => void) | null>(null);

    const [socketId, setSocketId] = useState<string | undefined>(undefined);

    useEffect(() => {
        console.log('server url: ', SERVER_URL);

        const socket = io(SERVER_URL, {
            transports: ['websocket'],
            autoConnect: false,
        });

        socket.on('connect', () => {
            setIsConnected(true);
            setError(null);
            setSocketId(socket.id);
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        socket.on('connect_error', () => {
            setError('Failed to connect to server');
            setIsConnected(false);
        });

        socket.on('room-joined', (data: RoomData) => {
            setRoomData(data);
        });

        socket.on(
            'room-updated',
            (data: Omit<RoomData, 'myColor' | 'isSpectator'>) => {
                setRoomData((prev) => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        ...data,
                    };
                });
            },
        );

        socket.on('seat-claimed', (data: { color: Color }) => {
            setRoomData((prev) =>
                prev
                    ? { ...prev, myColor: data.color, isSpectator: false }
                    : null,
            );
        });

        socket.on('seat-left', () => {
            setRoomData((prev) =>
                prev ? { ...prev, myColor: null, isSpectator: true } : null,
            );
        });

        socket.on('reset-game', () => {
            onResetGameRef.current?.();
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

    const createRoom = useCallback((isPublic: boolean = true, name: string) => {
        socketRef.current?.emit('create-room', { isPublic, name });
    }, []);

    const joinRoom = useCallback((roomId: string, name: string) => {
        socketRef.current?.emit('join-room', { roomId, name });
    }, []);

    const claimSeat = useCallback((color: 'w' | 'b') => {
        socketRef.current?.emit('claim-seat', { color });
    }, []);

    const leaveSeat = useCallback(() => {
        socketRef.current?.emit('leave-seat');
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

    const onResetGame = useCallback((callback: () => void) => {
        onResetGameRef.current = callback;
    }, []);

    return {
        socketId,
        isConnected,
        roomData,
        rooms,
        error,
        connect,
        disconnect,
        createRoom,
        joinRoom,
        claimSeat,
        leaveSeat,
        getRooms,
        sendMove,
        leaveRoom,
        onMoveReceived,
        onResetGame,
    };
}
