interface NewPostData {
  groupId: number;
  post: Post;
}

interface NewReplyData {
  postId: number;
  reply: Reply;
}

interface Post {
  id: number;
  groupId: number;
  userId: number;
  chapter: string;
  title: string;
  content: string;
  replyCount: number;
  createdAt: string;
  relativeTime: string;
  author: { id: number; name: string; avatar?: string };
}

interface Reply {
  id: number;
  postId: number;
  userId: number;
  content: string;
  createdAt: string;
  relativeTime: string;
  floor: number;
  author: { id: number; name: string; avatar?: string };
}

type MessageHandler = {
  onNewPost?: (data: NewPostData) => void;
  onNewReply?: (data: NewReplyData) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
};

class WebSocketClient {
  private ws: WebSocket | null = null;
  private handlers: MessageHandler = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private url: string;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = 5173;
    this.url = `${protocol}//${host}:${port}/ws`;
  }

  connect(handlers?: MessageHandler) {
    if (handlers) {
      this.handlers = { ...this.handlers, ...handlers };
    }

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.handlers.onConnect?.();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      this.ws.onerror = (error: Event) => {
        console.error('WebSocket error:', error);
        this.handlers.onError?.(error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.handlers.onDisconnect?.();
        this.scheduleReconnect();
      };
    } catch (e) {
      console.error('Failed to create WebSocket:', e);
      this.scheduleReconnect();
    }
  }

  private handleMessage(message: { type: string; data: unknown }) {
    switch (message.type) {
      case 'new_post':
        this.handlers.onNewPost?.(message.data as NewPostData);
        break;
      case 'new_reply':
        this.handlers.onNewReply?.(message.data as NewReplyData);
        break;
      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  send(type: string, data: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    } else {
      console.warn('WebSocket not connected, message not sent');
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsClient = new WebSocketClient();
export type { NewPostData, NewReplyData, Post, Reply };
