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
import { Chess, Color } from 'chess.js';
import { Server, Socket } from 'socket.io';

interface Spectator {
    id: string;
    name: string;
}

interface Player {
    id: string;
    color: Color;
    name: string;
}

interface Room {
    id: string;
    whitePlayer?: Player;
    blackPlayer?: Player;
    spectators: Player[];
    fen: string;
    isPublic: boolean;
}

interface RoomInfo {
    id: string;
    players: number;
    spectators: number;
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
            let playerCount = 0;
            if (room.whitePlayer) playerCount++;
            if (room.blackPlayer) playerCount++;

            if (room.isPublic && playerCount < 2) {
                publicRooms.push({
                    id: room.id,
                    players: playerCount,
                    spectators: room.spectators.length,
                    fen: room.fen,
                });
            }
        });
        return publicRooms;
    }

    private broadcastRoomsList() {
        this.server.emit('rooms-list', this.getPublicRooms());
    }

    private getRoomState(room: Room) {
        return {
            roomId: room.id,
            fen: room.fen,
            whitePlayer: room.whitePlayer || null,
            blackPlayer: room.blackPlayer || null,
            spectators: room.spectators,
        };
    }

    @SubscribeMessage('create-room')
    handleCreateRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: { color: Color; isPublic?: boolean; name: string },
    ) {
        console.log(`Received create-room from ${client.id}:`, data);
        let roomId = this.generateRoomId();
        while (this.rooms.has(roomId)) {
            roomId = this.generateRoomId();
        }

        const creator: Player = {
            id: client.id,
            name: data.name,
            color: 'w', // Placeholder
        };

        const room: Room = {
            id: roomId,
            whitePlayer: undefined,
            blackPlayer: undefined,
            spectators: [creator],
            fen: new Chess().fen(),
            isPublic: data.isPublic ?? true,
        };

        this.rooms.set(roomId, room);
        this.playerRooms.set(client.id, roomId);
        client.join(roomId);

        client.emit('room-joined', {
            ...this.getRoomState(room),
            myColor: null,
            isSpectator: true,
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

        if (!room) return client.emit('error', 'Room not found');

        const isNameTaken =
            room.spectators.some((s) => s.name === data.name) ||
            room.whitePlayer?.name === data.name ||
            room.blackPlayer?.name === data.name;

        if (isNameTaken)
            return client.emit('error', 'Name is already taken in this room');

        this.playerRooms.set(client.id, data.roomId);
        client.join(data.roomId);

        // Always join as spectator first
        const spectator: Player = {
            id: client.id,
            name: data.name,
            color: 'w', // Placeholder, not used for spectators
        };
        room.spectators.push(spectator);

        client.emit('room-joined', {
            ...this.getRoomState(room),
            myColor: null,
            isSpectator: true,
        });

        // Broadcast to room
        this.server
            .to(data.roomId)
            .emit('room-updated', this.getRoomState(room));

        console.log(
            `User ${data.name} (${client.id}) joined room ${data.roomId} as spectator`,
        );
    }

    @SubscribeMessage('claim-seat')
    handleClaimSeat(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { color: Color },
    ) {
        console.log(
            `claim-seat request from ${client.id} for color ${data.color}`,
        );
        const roomId = this.playerRooms.get(client.id);
        if (!roomId) {
            console.log(
                `claim-seat: Room ID not found for client ${client.id}`,
            );
            return;
        }
        const room = this.rooms.get(roomId);
        if (!room) {
            console.log(`claim-seat: Room not found ${roomId}`);
            return;
        }

        // Check if seat is taken
        if (data.color === 'w' && room.whitePlayer) {
            client.emit('error', 'White seat is taken');
            return;
        }
        if (data.color === 'b' && room.blackPlayer) {
            client.emit('error', 'Black seat is taken');
            return;
        }

        // Find user in spectators
        const spectatorIndex = room.spectators.findIndex(
            (s) => s.id === client.id,
        );
        if (spectatorIndex === -1) {
            console.log(
                `claim-seat: User ${client.id} not found in spectators. Spectators:`,
                room.spectators.map((s) => s.id),
            );
            // User might be the other player switching seats?
            // For simplicity, enforce Stand -> Sit workflow, but enable switching if necessary.
            // Let's check if they are already seated.
            if (
                room.whitePlayer?.id === client.id ||
                room.blackPlayer?.id === client.id
            ) {
                client.emit('error', 'You are already seated. Stand up first.');
                return;
            }
            client.emit('error', 'You are not in the room');
            return;
        }

        const user = room.spectators[spectatorIndex];
        // Remove from spectators
        room.spectators.splice(spectatorIndex, 1);

        // Assign to seat
        const player: Player = { ...user, color: data.color };
        if (data.color === 'w') room.whitePlayer = player;
        else room.blackPlayer = player;

        // Notify user
        client.emit('seat-claimed', { color: data.color });

        // Broadcast Update
        this.server.to(roomId).emit('room-updated', this.getRoomState(room));
        this.broadcastRoomsList();
        console.log(`claim-seat success for ${client.id} in room ${roomId}`);
    }

    @SubscribeMessage('leave-seat')
    handleLeaveSeat(@ConnectedSocket() client: Socket) {
        const roomId = this.playerRooms.get(client.id);
        if (!roomId) return;
        const room = this.rooms.get(roomId);
        if (!room) return;

        let player: Player | undefined;
        if (room.whitePlayer?.id === client.id) {
            player = room.whitePlayer;
            room.whitePlayer = undefined;
        } else if (room.blackPlayer?.id === client.id) {
            player = room.blackPlayer;
            room.blackPlayer = undefined;
        } else return; // Not seated

        // Reset game
        room.fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        this.server.to(roomId).emit('reset-game');

        // Add back to spectators
        room.spectators.push(player);

        client.emit('seat-left');
        this.server.to(roomId).emit('room-updated', this.getRoomState(room));
        this.broadcastRoomsList();
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

        // Verify player is part of the game
        if (
            room.whitePlayer?.id !== client.id &&
            room.blackPlayer?.id !== client.id
        ) {
            return;
        }

        client.to(roomId).emit('move', move);
        console.log(`Move in room ${roomId}: ${move.from} -> ${move.to}`);
    }

    @SubscribeMessage('update-fen')
    handleUpdateFen(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { fen: string },
    ) {
        const roomId = this.playerRooms.get(client.id);
        if (!roomId) return;
        const room = this.rooms.get(roomId);
        if (
            room &&
            (room.whitePlayer?.id === client.id ||
                room.blackPlayer?.id === client.id)
        ) {
            room.fen = data.fen;
        }
    }

    @SubscribeMessage('leave-room')
    leaveRoom(@ConnectedSocket() client: Socket) {
        const roomId = this.playerRooms.get(client.id);
        if (!roomId) return;

        const room = this.rooms.get(roomId);
        if (room) {
            // Remove from seats
            let wasSeated = false;
            if (room.whitePlayer?.id === client.id) {
                room.whitePlayer = undefined;
                wasSeated = true;
            } else if (room.blackPlayer?.id === client.id) {
                room.blackPlayer = undefined;
                wasSeated = true;
            } else {
                // Remove from spectators
                room.spectators = room.spectators.filter(
                    (s) => s.id !== client.id,
                );
            }

            if (wasSeated) {
                room.fen =
                    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
                this.server.to(roomId).emit('reset-game');
            }

            if (
                !room.whitePlayer &&
                !room.blackPlayer &&
                room.spectators.length === 0
            ) {
                this.rooms.delete(roomId);
                console.log(`Room ${roomId} deleted (empty)`);
            } else {
                this.server
                    .to(roomId)
                    .emit('room-updated', this.getRoomState(room));
            }
            this.broadcastRoomsList();
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
