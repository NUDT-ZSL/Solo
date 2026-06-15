import { v4 as uuidv4 } from 'uuid';

export interface Thought {
  id: string;
  content: string;
  author: string;
  isAnonymous: boolean;
  score: number;
  createdAt: number;
  likes: string[];
  dislikes: string[];
  hasCrown?: boolean;
}

export interface VoteOption {
  thoughtId: string;
  votes: number;
}

export interface VoteSession {
  id: string;
  options: VoteOption[];
  duration: number;
  startTime: number;
  isActive: boolean;
  votedUsers: string[];
}

export interface RoomState {
  id: string;
  thoughts: Thought[];
  voteSession: VoteSession | null;
  users: { id: string; name: string; isHost: boolean }[];
}

interface MessageHandlers {
  onThoughtAdded: (thought: Thought) => void;
  onThoughtUpdated: (thought: Thought) => void;
  onVoteStarted: (session: VoteSession) => void;
  onVoteUpdated: (session: VoteSession) => void;
  onVoteEnded: (session: VoteSession) => void;
  onUserJoined: (users: RoomState['users']) => void;
  onUserLeft: (users: RoomState['users']) => void;
  onConnectionStateChange: (state: ConnectionState) => void;
  onRoomStateSync: (state: RoomState) => void;
}

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

class RoomService {
  private ws: WebSocket | null = null;
  private roomId: string | null = null;
  private userId: string = uuidv4();
  private handlers: Partial<MessageHandlers> = {};
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseReconnectDelay = 1000;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pendingMessages: any[] = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;

  getUserId() {
    return this.userId;
  }

  getConnectionState() {
    return this.connectionState;
  }

  setHandlers(handlers: Partial<MessageHandlers>) {
    this.handlers = handlers;
  }

  private setConnectionState(state: ConnectionState) {
    this.connectionState = state;
    this.handlers.onConnectionStateChange?.(state);
  }

  connect(roomId: string) {
    this.roomId = roomId;
    this.attemptConnect();
  }

  private attemptConnect() {
    this.clearConnectionTimeout();
    this.clearReconnectTimeout();
    this.setConnectionState('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?roomId=${this.roomId}&userId=${this.userId}`;

    try {
      this.ws = new WebSocket(wsUrl);
    } catch (e) {
      this.handleConnectionError();
      return;
    }

    this.connectionTimeout = setTimeout(() => {
      console.warn('连接超时，尝试重连...');
      this.ws?.close();
      this.handleConnectionError();
    }, 5000);

    this.ws.onopen = () => {
      console.log('WebSocket 已连接');
      this.clearConnectionTimeout();
      this.setConnectionState('connected');
      this.reconnectAttempts = 0;
      this.flushPendingMessages();
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (e) {
        console.error('解析消息失败:', e);
      }
    };

    this.ws.onerror = () => {
      console.error('WebSocket 错误');
    };

    this.ws.onclose = () => {
      console.log('WebSocket 已关闭');
      this.stopHeartbeat();
      this.handleConnectionError();
    };
  }

  private handleConnectionError() {
    if (this.connectionState === 'reconnecting') return;

    this.setConnectionState('reconnecting');
    this.reconnectAttempts++;

    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      this.setConnectionState('disconnected');
      console.error('已达到最大重连次数，放弃连接');
      return;
    }

    const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    const jitter = Math.random() * 1000;
    const totalDelay = Math.min(delay + jitter, 30000);

    console.log(`尝试第 ${this.reconnectAttempts} 次重连，等待 ${totalDelay.toFixed(0)}ms`);

    this.reconnectTimeout = setTimeout(() => {
      this.attemptConnect();
    }, totalDelay);
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private clearConnectionTimeout() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  private clearReconnectTimeout() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private flushPendingMessages() {
    while (this.pendingMessages.length > 0) {
      const message = this.pendingMessages.shift();
      this.send(message);
    }
  }

  private send(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.pendingMessages.push(message);
      if (this.pendingMessages.length > 100) {
        this.pendingMessages.shift();
      }
    }
  }

  private handleMessage(message: any) {
    switch (message.type) {
      case 'pong':
        break;
      case 'thoughtAdded':
        this.handlers.onThoughtAdded?.(message.thought);
        break;
      case 'thoughtUpdated':
        this.handlers.onThoughtUpdated?.(message.thought);
        break;
      case 'voteStarted':
        this.handlers.onVoteStarted?.(message.session);
        break;
      case 'voteUpdated':
        this.handlers.onVoteUpdated?.(message.session);
        break;
      case 'voteEnded':
        this.handlers.onVoteEnded?.(message.session);
        break;
      case 'userJoined':
        this.handlers.onUserJoined?.(message.users);
        break;
      case 'userLeft':
        this.handlers.onUserLeft?.(message.users);
        break;
      case 'roomStateSync':
        this.handlers.onRoomStateSync?.(message.state);
        break;
      default:
        console.warn('未知消息类型:', message.type);
    }
  }

  addThought(content: string, author: string, isAnonymous: boolean) {
    const thought: Omit<Thought, 'id' | 'createdAt' | 'score' | 'likes' | 'dislikes'> = {
      content,
      author,
      isAnonymous,
    };
    this.send({ type: 'addThought', thought });
  }

  likeThought(thoughtId: string) {
    this.send({ type: 'likeThought', thoughtId, userId: this.userId });
  }

  dislikeThought(thoughtId: string) {
    this.send({ type: 'dislikeThought', thoughtId, userId: this.userId });
  }

  startVote(options: string[], duration: number) {
    this.send({ type: 'startVote', options, duration, userId: this.userId });
  }

  submitVote(thoughtId: string) {
    this.send({ type: 'submitVote', thoughtId, userId: this.userId });
  }

  setUserName(name: string) {
    this.send({ type: 'setUserName', name, userId: this.userId });
  }

  disconnect() {
    this.clearConnectionTimeout();
    this.clearReconnectTimeout();
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setConnectionState('disconnected');
    this.pendingMessages = [];
  }
}

export const roomService = new RoomService();
