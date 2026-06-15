import type { Card, CardVotes, OnlineUser } from '../types';

type ClientMessage =
  | { type: 'join'; userId: string; userName: string; avatarColor: string }
  | { type: 'card:create'; card: Card }
  | { type: 'card:update'; cardId: string; changes: Partial<Card> }
  | { type: 'card:delete'; cardId: string }
  | { type: 'card:vote'; cardId: string; vote: 'up' | 'down' | null }
  | { type: 'cursor:move'; x: number; y: number }
  | { type: 'card:editing'; cardId: string | null }
  | { type: 'ping' };

type ServerMessage =
  | { type: 'init'; cards: Card[]; users: OnlineUser[]; selfUserId: string; selfUserName: string; selfAvatarColor: string }
  | { type: 'user:join'; user: OnlineUser }
  | { type: 'user:leave'; userId: string }
  | { type: 'card:created'; card: Card }
  | { type: 'card:updated'; cardId: string; changes: Partial<Card> }
  | { type: 'card:deleted'; cardId: string }
  | { type: 'card:voted'; cardId: string; votes: CardVotes }
  | { type: 'cursor:moved'; userId: string; x: number; y: number }
  | { type: 'card:editing'; userId: string; cardId: string | null }
  | { type: 'pong' };

export type WSStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface WSCallbacks {
  onStatus: (status: WSStatus) => void;
  onInit: (data: { cards: Card[]; users: OnlineUser[]; selfUserId: string; selfUserName: string; selfAvatarColor: string }) => void;
  onUserJoin: (user: OnlineUser) => void;
  onUserLeave: (userId: string) => void;
  onCardCreated: (card: Card) => void;
  onCardUpdated: (cardId: string, changes: Partial<Card>) => void;
  onCardDeleted: (cardId: string) => void;
  onCardVoted: (cardId: string, votes: CardVotes) => void;
  onCursorMoved: (userId: string, x: number, y: number) => void;
  onCardEditing: (userId: string, cardId: string | null) => void;
}

export class WSClient {
  private ws: WebSocket | null = null;
  private roomId: string;
  private callbacks: WSCallbacks;
  private status: WSStatus = 'disconnected';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  constructor(roomId: string, callbacks: WSCallbacks) {
    this.roomId = roomId;
    this.callbacks = callbacks;
  }

  connect() {
    this.setStatus('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/${this.roomId}`;

    try {
      this.ws = new WebSocket(wsUrl);
    } catch (e) {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.setStatus('connected');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        this.handleMessage(msg);
      } catch (e) {
        console.error('Failed to parse WS message:', e);
      }
    };

    this.ws.onerror = () => {
      this.setStatus('reconnecting');
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      this.setStatus('reconnecting');
      this.scheduleReconnect();
    };
  }

  private setStatus(status: WSStatus) {
    this.status = status;
    this.callbacks.onStatus(status);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'ping' });
    }, 15000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setStatus('disconnected');
      return;
    }
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private handleMessage(msg: ServerMessage) {
    switch (msg.type) {
      case 'init':
        this.callbacks.onInit(msg);
        break;
      case 'user:join':
        this.callbacks.onUserJoin(msg.user);
        break;
      case 'user:leave':
        this.callbacks.onUserLeave(msg.userId);
        break;
      case 'card:created':
        this.callbacks.onCardCreated(msg.card);
        break;
      case 'card:updated':
        this.callbacks.onCardUpdated(msg.cardId, msg.changes);
        break;
      case 'card:deleted':
        this.callbacks.onCardDeleted(msg.cardId);
        break;
      case 'card:voted':
        this.callbacks.onCardVoted(msg.cardId, msg.votes);
        break;
      case 'cursor:moved':
        this.callbacks.onCursorMoved(msg.userId, msg.x, msg.y);
        break;
      case 'card:editing':
        this.callbacks.onCardEditing(msg.userId, msg.cardId);
        break;
    }
  }

  send(msg: ClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  getStatus(): WSStatus {
    return this.status;
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }
}
