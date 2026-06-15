import type { PlayerState, AsteroidState, MeteorState, ChatMessage } from '../types';

export type MessageHandler = (message: any) => void;

export class GameSocket {
  private ws: WebSocket | null = null;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  
  constructor() {}
  
  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);
        
        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (e) {
            console.error('Error parsing message:', e);
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
        
        this.ws.onclose = () => {
          console.log('WebSocket closed');
          this.tryReconnect(url);
        };
      } catch (e) {
        reject(e);
      }
    });
  }
  
  private tryReconnect(url: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    console.log(`Reconnecting... attempt ${this.reconnectAttempts}`);
    
    setTimeout(() => {
      this.connect(url).catch(() => {
        this.tryReconnect(url);
      });
    }, 1000 * this.reconnectAttempts);
  }
  
  private handleMessage(message: any): void {
    const type = message.type;
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.forEach(handler => handler(message));
    }
  }
  
  on(type: string, handler: MessageHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }
  
  off(type: string, handler: MessageHandler): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index >= 0) {
        handlers.splice(index, 1);
      }
    }
  }
  
  send(type: string, data: any = {}): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...data }));
    }
  }
  
  sendInput(keys: Record<string, boolean>, mouseX?: number, mouseY?: number): void {
    this.send('input', {
      input: {
        keys,
        mouseX,
        mouseY
      }
    });
  }
  
  sendTargetAsteroid(asteroidId: number | null): void {
    this.send('targetAsteroid', { asteroidId });
  }
  
  sendChat(message: string): void {
    this.send('chat', { message });
  }
  
  sendUpgrade(upgradeType: string): void {
    this.send('upgrade', { upgradeType });
  }
  
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
