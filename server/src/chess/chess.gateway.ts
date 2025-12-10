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

interface Room {
    id: string;
    players: Map<string, 'white' | 'black'>;
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
        @MessageBody() data: { color: 'white' | 'black'; isPublic?: boolean },
    ) {
        let roomId = this.generateRoomId();
        while (this.rooms.has(roomId)) {
            roomId = this.generateRoomId();
        }

        const room: Room = {
            id: roomId,
            players: new Map([[client.id, data.color]]),
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            isPublic: data.isPublic ?? true,
        };

        this.rooms.set(roomId, room);
        this.playerRooms.set(client.id, roomId);
        client.join(roomId);

        client.emit('room-created', { roomId, color: data.color });
        this.broadcastRoomsList();
        console.log(`Room created: ${roomId} by ${client.id} as ${data.color}`);
    }

    @SubscribeMessage('join-room')
    handleJoinRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { roomId: string },
    ) {
        const room = this.rooms.get(data.roomId);

        if (!room) {
            client.emit('error', 'Room not found');
            return;
        }

        if (room.players.size >= 2) {
            client.emit('error', 'Room is full');
            return;
        }

        const existingColor = Array.from(room.players.values())[0];
        const playerColor = existingColor === 'white' ? 'black' : 'white';

        room.players.set(client.id, playerColor);
        this.playerRooms.set(client.id, data.roomId);
        client.join(data.roomId);

        client.emit('room-joined', { roomId: data.roomId, color: playerColor });
        client.to(data.roomId).emit('opponent-joined');
        this.broadcastRoomsList();

        console.log(
            `Player ${client.id} joined room ${data.roomId} as ${playerColor}`,
        );
    }

    @SubscribeMessage('move')
    handleMove(
        @ConnectedSocket() client: Socket,
        @MessageBody() move: { from: string; to: string; promotion?: string },
    ) {
        const roomId = this.playerRooms.get(client.id);
        if (!roomId) return;

        client.to(roomId).emit('move', move);
        console.log(`Move in room ${roomId}: ${move.from} -> ${move.to}`);
    }

    @SubscribeMessage('leave-room')
    leaveRoom(@ConnectedSocket() client: Socket) {
        const roomId = this.playerRooms.get(client.id);
        if (!roomId) return;

        const room = this.rooms.get(roomId);
        if (room) {
            room.players.delete(client.id);
            client.to(roomId).emit('opponent-left');

            if (room.players.size === 0) {
                this.rooms.delete(roomId);
                console.log(`Room ${roomId} deleted (empty)`);
            }
            this.broadcastRoomsList();
        }

        client.leave(roomId);
        this.playerRooms.delete(client.id);
        console.log(`Player ${client.id} left room ${roomId}`);
    }
    @SubscribeMessage('get-rooms')
    handleGetRooms(@ConnectedSocket() client: Socket) {
        client.emit('rooms-list', this.getPublicRooms());
    }
}
