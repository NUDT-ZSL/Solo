import { io, Socket } from 'socket.io-client';
import {
  PlayerState,
  GemState,
  ServerState,
  PlayerInput,
  SERVER_TICK_INTERVAL,
  PLAYER_SIZE,
  GROUND_Y,
  GRAVITY,
  JUMP_VELOCITY,
  MOVE_SPEED,
  SPRINT_MULTIPLIER,
  CANVAS_WIDTH,
} from './types';

export interface RemotePlayerRender {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  targetX: number;
  targetY: number;
  score: number;
  connected: boolean;
  isJumping: boolean;
  isSprinting: boolean;
  facingRight: boolean;
  spawnTime: number;
  lastUpdateTime: number;
}

export interface GemCollectEffect {
  gemId: string;
  x: number;
  y: number;
  startTime: number;
}

type ConnectionState = 'connected' | 'disconnected' | 'reconnecting';

export class GameClient {
  private socket: Socket;
  private _localPlayerId: string | null = null;
  private _localPlayer: PlayerState | null = null;
  private _remotePlayers: Map<string, RemotePlayerRender> = new Map();
  private _gems: GemState[] = [];
  private _serverState: ServerState | null = null;
  private _connected: boolean = false;
  private _connectionState: ConnectionState = 'disconnected';
  private _latency: number = 0;
  private _lastPingTime: number = 0;
  private _disconnectTime: number = 0;
  private _onlineCount: number = 0;
  private _gemCollectEffects: GemCollectEffect[] = [];
  private _inputState: PlayerInput = {
    w: false, a: false, s: false, d: false,
    shift: false, space: false, timestamp: 0,
  };
  private onStateChange?: () => void;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(onStateChange?: () => void) {
    this.onStateChange = onStateChange;
    this.socket = io('http://localhost:3001', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
      timeout: 5000,
    });

    this.setupListeners();
  }

  private setupListeners() {
    this.socket.on('connect', () => {
      this._connected = true;
      this._connectionState = 'connected';
      this._localPlayerId = this.socket.id!;
      this._disconnectTime = 0;
      this.startPing();
      this.onStateChange?.();
    });

    this.socket.on('disconnect', () => {
      this._connected = false;
      this._connectionState = 'disconnected';
      this._disconnectTime = Date.now();
      if (this._localPlayer) {
        this._localPlayer.connected = false;
      }
      this.onStateChange?.();
    });

    this.socket.on('reconnecting', () => {
      this._connectionState = 'reconnecting';
      this.onStateChange?.();
    });

    this.socket.on('init', (data: { id: string; state: ServerState }) => {
      this._localPlayerId = data.id;
      this._serverState = data.state;
      this._onlineCount = Object.keys(data.state.players).length;
      this.processFullState(data.state);
      this.onStateChange?.();
    });

    this.socket.on('stateUpdate', (state: ServerState) => {
      this._serverState = state;
      this._onlineCount = Object.keys(state.players).length;
      this.processFullState(state);
      this.onStateChange?.();
    });

    this.socket.on('playerJoined', (data: { id: string; player: PlayerState }) => {
      this._onlineCount = Object.keys(this._remotePlayers).length + 1;
      this.onStateChange?.();
    });

    this.socket.on('playerLeft', (data: { id: string }) => {
      this._remotePlayers.delete(data.id);
      this._onlineCount = this._remotePlayers.size + (this._localPlayer ? 1 : 0);
      this.onStateChange?.();
    });

    this.socket.on('gemCollected', (data: { gemId: string; playerId: string; x?: number; y?: number }) => {
      const gem = this._gems.find(g => g.id === data.gemId);
      if (gem) {
        this._gemCollectEffects.push({
          gemId: data.gemId,
          x: gem.x,
          y: gem.y,
          startTime: Date.now(),
        });
      }
      this._gems = this._gems.filter(g => g.id !== data.gemId);
    });

    this.socket.on('roomFull', () => {
      console.warn('Room is full');
    });
  }

  private processFullState(state: ServerState) {
    for (const id in state.players) {
      if (id === this._localPlayerId) {
        if (!this._localPlayer) {
          this._localPlayer = { ...state.players[id] };
        } else {
          this._localPlayer.score = state.players[id].score;
          this._localPlayer.connected = state.players[id].connected;
          this._localPlayer.isJumping = state.players[id].isJumping;
          this._localPlayer.isSprinting = state.players[id].isSprinting;
          this._localPlayer.facingRight = state.players[id].facingRight;
          this._localPlayer.spawnTime = state.players[id].spawnTime;
          this._localPlayer.name = state.players[id].name;
          this._localPlayer.color = state.players[id].color;
        }
      } else {
        const existing = this._remotePlayers.get(id);
        const serverPlayer = state.players[id];
        if (existing) {
          existing.prevX = existing.targetX;
          existing.prevY = existing.targetY;
          existing.targetX = serverPlayer.x;
          existing.targetY = serverPlayer.y;
          existing.score = serverPlayer.score;
          existing.connected = serverPlayer.connected;
          existing.isJumping = serverPlayer.isJumping;
          existing.isSprinting = serverPlayer.isSprinting;
          existing.facingRight = serverPlayer.facingRight;
          existing.name = serverPlayer.name;
          existing.color = serverPlayer.color;
          existing.spawnTime = serverPlayer.spawnTime;
        } else {
          this._remotePlayers.set(id, {
            id,
            name: serverPlayer.name,
            color: serverPlayer.color,
            x: serverPlayer.x,
            y: serverPlayer.y,
            prevX: serverPlayer.x,
            prevY: serverPlayer.y,
            targetX: serverPlayer.x,
            targetY: serverPlayer.y,
            score: serverPlayer.score,
            connected: serverPlayer.connected,
            isJumping: serverPlayer.isJumping,
            isSprinting: serverPlayer.isSprinting,
            facingRight: serverPlayer.facingRight,
            spawnTime: serverPlayer.spawnTime,
          });
        }
      }
    }

    const currentPlayerIds = new Set(Object.keys(state.players));
    for (const [id] of this._remotePlayers) {
      if (!currentPlayerIds.has(id)) {
        this._remotePlayers.delete(id);
      }
    }

    this._gems = state.gems;
  }

  private startPing() {
    setInterval(() => {
      if (this._connected) {
        this._lastPingTime = Date.now();
        this.socket.emit('ping');
      }
    }, 2000);

    this.socket.on('pong', () => {
      this._latency = Date.now() - this._lastPingTime;
    });
  }

  updateLocalPlayer(dt: number) {
    if (!this._localPlayer || !this._connected) return;

    const input = this._inputState;
    let speed = MOVE_SPEED;
    this._localPlayer.isSprinting = input.shift;
    if (input.shift) speed *= SPRINT_MULTIPLIER;

    let vx = 0;
    if (input.a) vx -= speed;
    if (input.d) vx += speed;
    this._localPlayer.vx = vx;

    if (vx > 0) this._localPlayer.facingRight = true;
    else if (vx < 0) this._localPlayer.facingRight = false;

    if (input.space && !this._localPlayer.isJumping) {
      this._localPlayer.vy = JUMP_VELOCITY;
      this._localPlayer.isJumping = true;
    }

    this._localPlayer.x += this._localPlayer.vx * dt;
    this._localPlayer.vy += GRAVITY * dt;
    this._localPlayer.y += this._localPlayer.vy * dt;

    if (this._localPlayer.y >= GROUND_Y - PLAYER_SIZE / 2) {
      this._localPlayer.y = GROUND_Y - PLAYER_SIZE / 2;
      this._localPlayer.vy = 0;
      this._localPlayer.isJumping = false;
    }

    this._localPlayer.x = Math.max(PLAYER_SIZE / 2, Math.min(CANVAS_WIDTH - PLAYER_SIZE / 2, this._localPlayer.x));

    this._inputState.timestamp = Date.now();
    this.socket.emit('input', this._inputState);
    if (input.space) {
      this._inputState.space = false;
    }
  }

  interpolateRemotePlayers() {
    for (const [, player] of this._remotePlayers) {
      player.x += (player.targetX - player.x) * INTERP_FACTOR;
      player.y += (player.targetY - player.y) * INTERP_FACTOR;
    }
  }

  setInput(key: string, pressed: boolean) {
    switch (key) {
      case 'w': case 'arrowup': this._inputState.w = pressed; break;
      case 'a': case 'arrowleft': this._inputState.a = pressed; break;
      case 's': case 'arrowdown': this._inputState.s = pressed; break;
      case 'd': case 'arrowright': this._inputState.d = pressed; break;
      case 'shift': this._inputState.shift = pressed; break;
      case ' ': this._inputState.space = pressed; break;
    }
  }

  get localPlayerId() { return this._localPlayerId; }
  get localPlayer() { return this._localPlayer; }
  get remotePlayers() { return this._remotePlayers; }
  get gems() { return this._gems; }
  get connected() { return this._connected; }
  get connectionState() { return this._connectionState; }
  get latency() { return this._latency; }
  get disconnectTime() { return this._disconnectTime; }
  get onlineCount() { return this._onlineCount; }
  get gemCollectEffects() { return this._gemCollectEffects; }

  clearOldEffects() {
    const now = Date.now();
    this._gemCollectEffects = this._gemCollectEffects.filter(e => now - e.startTime < 500);
  }

  destroy() {
    this.socket.disconnect();
  }
}
