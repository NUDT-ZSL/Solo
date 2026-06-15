export interface GameEvents {
  gameStart: undefined;
  gameEnd: { score: number; time: number };
  scoreUpdate: { score: number };
  timeUpdate: { time: number };
  noteCollected: { x: number; y: number };
  stateUpdate: GameState;
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Obstacle {
  x: number;
  y: number;
  baseWidth: number;
  height: number;
}

export interface Note {
  x: number;
  y: number;
  radius: number;
  collected: boolean;
}

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityY: number;
  isJumping: boolean;
  isOnPlatform: boolean;
}

export interface GameState {
  player: Player;
  platforms: Platform[];
  obstacles: Obstacle[];
  notes: Note[];
  score: number;
  elapsedTime: number;
  speed: number;
  isRunning: boolean;
  isGameOver: boolean;
}

type EventCallback<T = unknown> = (data: T) => void;

export class EventBus {
  private listeners: Map<keyof GameEvents, Set<EventCallback>> = new Map();

  on<K extends keyof GameEvents>(
    event: K,
    callback: (data: GameEvents[K]) => void
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback);
    return () => {
      this.listeners.get(event)?.delete(callback as EventCallback);
    };
  }

  emit<K extends keyof GameEvents>(event: K, data: GameEvents[K]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(data));
    }
  }

  off<K extends keyof GameEvents>(
    event: K,
    callback: (data: GameEvents[K]) => void
  ): void {
    this.listeners.get(event)?.delete(callback as EventCallback);
  }

  clear(): void {
    this.listeners.clear();
  }
}
