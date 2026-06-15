import { io, Socket } from 'socket.io-client';

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Position {
  x: number;
  y: number;
}

export interface Snake {
  id: string;
  nickname: string;
  body: Position[];
  direction: Direction;
  color: string;
  score: number;
  isBoosted: boolean;
  isAlive: boolean;
  killCount: number;
}

export interface Food {
  id: string;
  position: Position;
  type: 'normal' | 'speed';
}

export interface GameState {
  snakes: Snake[];
  foods: Food[];
  gridSize: { width: number; height: number };
  startTime: number;
}

export interface RoomInfo {
  id: string;
  name: string;
  maxPlayers: number;
  players: PlayerInfo[];
  status: 'waiting' | 'playing' | 'ended';
}

export interface PlayerInfo {
  id: string;
  nickname: string;
  isReady: boolean;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  nickname: string;
  content: string;
  timestamp: number;
}

export interface GameStats {
  playerId: string;
  nickname: string;
  score: number;
  survivalTime: number;
  killCount: number;
  rank: number;
}

type EventCallback<T = any> = (data: T) => void;

export class SocketManager {
  private socket: Socket;
  private playerId: string = '';
  private roomId: string = '';
  private eventListeners: Map<string, Set<EventCallback>> = new Map();

  constructor() {
    this.socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.playerId = this.socket.id ?? '';

    this.socket.on('connect', () => {
      this.playerId = this.socket.id ?? '';
      this.emit('connected', { playerId: this.playerId });
    });

    this.socket.on('disconnect', () => {
      this.emit('disconnected', {});
    });

    this.socket.on('room_list', (data: { rooms: RoomInfo[] }) => {
      this.emit('room_list', data);
    });

    this.socket.on('room_created', (data: { roomId: string }) => {
      this.roomId = data.roomId;
      this.emit('room_created', data);
    });

    this.socket.on('room_joined', (data: { roomId: string; players: PlayerInfo[] }) => {
      this.roomId = data.roomId;
      this.emit('room_joined', data);
    });

    this.socket.on('room_left', () => {
      this.roomId = '';
      this.emit('room_left', {});
    });

    this.socket.on('player_joined', (data: { player: PlayerInfo }) => {
      this.emit('player_joined', data);
    });

    this.socket.on('player_left', (data: { playerId: string }) => {
      this.emit('player_left', data);
    });

    this.socket.on('chat_message', (data: { message: ChatMessage }) => {
      this.emit('chat_message', data);
    });

    this.socket.on('game_start', (data: { gameState: GameState }) => {
      this.emit('game_start', data);
    });

    this.socket.on('game_update', (data: { gameState: GameState }) => {
      this.emit('game_update', data);
    });

    this.socket.on('player_dead', (data: { snakeId: string; killerId?: string }) => {
      this.emit('player_dead', data);
    });

    this.socket.on('game_over', (data: { stats: GameStats[] }) => {
      this.emit('game_over', data);
    });

    this.socket.on('speed_boost', (data: { snakeId: string }) => {
      this.emit('speed_boost', data);
    });

    this.socket.on('lobby_returned', () => {
      this.emit('lobby_returned', {});
    });

    this.socket.on('error', (data: { message: string }) => {
      this.emit('error', data);
    });
  }

  getPlayerId(): string {
    return this.playerId;
  }

  getRoomId(): string {
    return this.roomId;
  }

  isConnected(): boolean {
    return this.socket.connected;
  }

  setNickname(nickname: string): void {
    this.socket.emit('set_nickname', { nickname });
  }

  getRooms(): void {
    this.socket.emit('get_rooms');
  }

  createRoom(name: string, maxPlayers: number = 2): void {
    this.socket.emit('create_room', { name, maxPlayers });
  }

  joinRoom(roomId: string): void {
    this.socket.emit('join_room', { roomId });
  }

  leaveRoom(): void {
    this.socket.emit('leave_room');
  }

  startGame(): void {
    this.socket.emit('start_game');
  }

  changeDirection(direction: Direction): void {
    this.socket.emit('change_direction', { direction });
  }

  sendChat(content: string): void {
    this.socket.emit('send_chat', { content });
  }

  playAgain(): void {
    this.socket.emit('play_again');
  }

  backToLobby(): void {
    this.socket.emit('back_to_lobby');
  }

  on<T = any>(event: string, callback: EventCallback<T>): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off<T = any>(event: string, callback: EventCallback<T>): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  disconnect(): void {
    this.socket.disconnect();
  }
}

export const socketManager = new SocketManager();
