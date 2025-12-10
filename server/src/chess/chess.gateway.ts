// Path: "server/src/chess/chess.gateway.ts"
import {
    MessageBody,
    ConnectedSocket,
    WebSocketServer,
    WebSocketGateway,
    SubscribeMessage,
    OnGatewayDisconnect,
    OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface Player {
    id: string;
    color: 'white' | 'black';
    name: string;
}

interface Spectator {
    id: string;
    name: string;
}

interface Room {
    id: string;
    players: Map<string, Player>;
    spectators: Spectator[];
    fen: string;
    isPublic: boolean;
}

interface RoomInfo {
    id: string;
    players: number;
    fen: string;
}

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class ChessGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private rooms: Map<string, Room> = new Map();
    private playerRooms: Map<string, string> = new Map();

    handleConnection(client: Socket) {
        console.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
        const roomId = this.playerRooms.get(client.id);
        if (roomId) {
            this.leaveRoom(client);
        }
    }

    private generateRoomId(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    private getPublicRooms(): RoomInfo[] {
        const publicRooms: RoomInfo[] = [];
        this.rooms.forEach((room) => {
            if (room.isPublic && room.players.size < 2) {
                publicRooms.push({
                    id: room.id,
                    players: room.players.size,
                    fen: room.fen,
                });
            }
        });
        return publicRooms;
    }

    private broadcastRoomsList() {
        this.server.emit('rooms-list', this.getPublicRooms());
    }

    @SubscribeMessage('create-room')
    handleCreateRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: { color: 'white' | 'black'; isPublic?: boolean; name: string },
    ) {
        console.log(`Received create-room from ${client.id}:`, data);
        let roomId = this.generateRoomId();
        while (this.rooms.has(roomId)) {
            roomId = this.generateRoomId();
        }

        const room: Room = {
            id: roomId,
            players: new Map([
                [
                    client.id,
                    { id: client.id, color: data.color, name: data.name },
                ],
            ]),
            spectators: [],
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            isPublic: data.isPublic ?? true,
        };

        this.rooms.set(roomId, room);
        this.playerRooms.set(client.id, roomId);
        client.join(roomId);

        client.emit('room-created', {
            roomId,
            color: data.color,
            fen: room.fen,
        });
        this.broadcastRoomsList();
        console.log(
            `Room created: ${roomId} by ${data.name} (${client.id}) as ${data.color}`,
        );
    }

    @SubscribeMessage('join-room')
    handleJoinRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { roomId: string; name: string },
    ) {
        const room = this.rooms.get(data.roomId);

        if (!room) {
            client.emit('error', 'Room not found');
            return;
        }

        this.playerRooms.set(client.id, data.roomId);
        client.join(data.roomId);

        // Join as Spectator if full
        if (room.players.size >= 2) {
            room.spectators.push({ id: client.id, name: data.name });
            client.emit('room-joined', {
                roomId: data.roomId,
                color: null, // Spectator
                fen: room.fen,
                isSpectator: true,
                players: Array.from(room.players.values()),
            });
            console.log(
                `Spectator ${data.name} (${client.id}) joined room ${data.roomId}`,
            );
            return;
        }

        // Join as Player
        const existingPlayer = Array.from(room.players.values())[0];
        const playerColor =
            existingPlayer.color === 'white' ? 'black' : 'white';

        room.players.set(client.id, {
            id: client.id,
            color: playerColor,
            name: data.name,
        });

        client.emit('room-joined', {
            roomId: data.roomId,
            color: playerColor,
            fen: room.fen,
            players: Array.from(room.players.values()),
        });
        client.to(data.roomId).emit('opponent-joined', {
            name: data.name,
        });
        this.broadcastRoomsList();

        console.log(
            `Player ${data.name} (${client.id}) joined room ${data.roomId} as ${playerColor}`,
        );
    }

    @SubscribeMessage('move')
    handleMove(
        @ConnectedSocket() client: Socket,
        @MessageBody() move: { from: string; to: string; promotion?: string },
    ) {
        const roomId = this.playerRooms.get(client.id);
        if (!roomId) return;

        const room = this.rooms.get(roomId);
        if (!room) return;

        // Verify player is part of the game (not spectator)
        if (!room.players.has(client.id)) {
            return;
        }

        client.to(roomId).emit('move', move);
        // Update room FEN (simplified, ideally validate move with chess logic)
        // For now relying on client to send valid moves, but we should track state
        // We really should be validating here, but keeping it simple as per current architecture
        console.log(`Move in room ${roomId}: ${move.from} -> ${move.to}`);

        // Also update FEN in our simple store if we were tracking it properly
        // For spectators to get sync, we need to update the FEN.
        // Since we don't have chess logic here, we'll blindly trust the move updates the state on clients.
        // A better way is if the client sends the new FEN. Let's assume for now we just relay.
        // Actually, to support late spectator join, we need the FEN.
        // Let's ask client to send FEN or handle it.
        // UPDATE: Client sends 'fen' update event? Or we just broadcast 'move'.
        // Spectators joining late need the CURRENT FEN.
        // Let's add a `update-fen` message or include FEN in move?
    }

    @SubscribeMessage('update-fen')
    handleUpdateFen(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { fen: string },
    ) {
        const roomId = this.playerRooms.get(client.id);
        if (!roomId) return;
        const room = this.rooms.get(roomId);
        if (room && room.players.has(client.id)) {
            room.fen = data.fen;
        }
    }

    @SubscribeMessage('leave-room')
    leaveRoom(@ConnectedSocket() client: Socket) {
        const roomId = this.playerRooms.get(client.id);
        if (!roomId) return;

        const room = this.rooms.get(roomId);
        if (room) {
            if (room.players.has(client.id)) {
                room.players.delete(client.id);
                client.to(roomId).emit('opponent-left');
                this.broadcastRoomsList();
            } else {
                // Remove spectator
                room.spectators = room.spectators.filter(
                    (s) => s.id !== client.id,
                );
            }

            if (room.players.size === 0 && room.spectators.length === 0) {
                this.rooms.delete(roomId);
                console.log(`Room ${roomId} deleted (empty)`);
            }
        }

        client.leave(roomId);
        this.playerRooms.delete(client.id);
        console.log(`User ${client.id} left room ${roomId}`);
    }
    @SubscribeMessage('get-rooms')
    handleGetRooms(@ConnectedSocket() client: Socket) {
        client.emit('rooms-list', this.getPublicRooms());
    }
}
