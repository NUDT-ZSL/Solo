export interface FreqBandData {
  low: number;
  mid: number;
  high: number;
}

export type ColorTheme = 'neon' | 'sunny' | 'aurora';

export interface ParticleParams {
  density: number;
  speed: number;
  theme: ColorTheme;
}

export type AudioState = 'idle' | 'loading' | 'ready' | 'playing' | 'paused';

export interface GlobalStateData {
  isPlaying: boolean;
  audioState: AudioState;
  freqData: FreqBandData;
  particleParams: ParticleParams;
  audioFile: {
    name: string;
    duration: number;
    currentTime: number;
  };
}

export const defaultGlobalState: GlobalStateData = {
  isPlaying: false,
  audioState: 'idle',
  freqData: { low: 0, mid: 0, high: 0 },
  particleParams: {
    density: 1500,
    speed: 1.5,
    theme: 'neon'
  },
  audioFile: {
    name: '',
    duration: 0,
    currentTime: 0
  }
};

export type AppEventName =
  | 'audioFileSelected'
  | 'audioLoaded'
  | 'audioStateChange'
  | 'audioTimeUpdate'
  | 'freqDataUpdate'
  | 'paramChange'
  | 'playPauseToggle'
  | 'audioSeek'
  | 'stateUpdate'
  | 'audioLoadError';

type AppEventListener = (data: any) => void;

export class EventBus {
  private listeners: Map<AppEventName, Set<AppEventListener>> = new Map();

  public on(event: AppEventName, listener: AppEventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  public off(event: AppEventName, listener: AppEventListener): void {
    this.listeners.get(event)?.delete(listener);
  }

  public emit(event: AppEventName, data?: any): void {
    this.listeners.get(event)?.forEach((listener) => {
      try {
        listener(data);
      } catch (err) {
        console.error(`[EventBus] Error in listener for event "${event}":`, err);
      }
    });
  }

  public clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
export const globalState: GlobalStateData = { ...defaultGlobalState };

export function updateGlobalState(partial: Partial<GlobalStateData>): void {
  Object.assign(globalState, partial);
  eventBus.emit('stateUpdate', globalState);
}
