import type { Comment } from './types';

type NewCommentCallback = (data: {
  frameId: string;
  comment: Comment;
  count: number;
}) => void;

export class CommentWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 30000;
  private baseReconnectDelay = 1000;
  private reconnectTimer: number | null = null;
  private manuallyDisconnected = false;
  private listeners = new Set<NewCommentCallback>();

  private getUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    return `${protocol}//${host}:3001/ws`;
  }

  connect(): void {
    this.manuallyDisconnected = false;
    this.establishConnection();
  }

  private establishConnection(): void {
    try {
      this.ws = new WebSocket(this.getUrl());

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'newComment') {
            this.listeners.forEach((callback) => callback(data.payload));
          }
        } catch (e) {
          console.error('解析 WebSocket 消息失败:', e);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket 错误:', error);
      };

      this.ws.onclose = () => {
        if (!this.manuallyDisconnected) {
          this.reconnect();
        }
      };
    } catch (error) {
      console.error('创建 WebSocket 连接失败:', error);
      if (!this.manuallyDisconnected) {
        this.reconnect();
      }
    }
  }

  disconnect(): void {
    this.manuallyDisconnected = true;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = 0;
  }

  private reconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = window.setTimeout(() => {
      this.establishConnection();
    }, delay);
  }

  onNewComment(callback: NewCommentCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }
}
