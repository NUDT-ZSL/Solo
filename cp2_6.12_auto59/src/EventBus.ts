export interface AudioEventDetail {
  currentTime: number;
  duration: number;
}

export interface WaveformEventDetail {
  data: Float32Array;
}

export interface AudioLoadedEventDetail {
  duration: number;
  sampleRate: number;
}

export type AudioEventType = 'playbackUpdate' | 'waveformData' | 'audioLoaded' | 'playbackEnd';

export class AudioEventBus {
  private target: EventTarget;

  constructor() {
    this.target = new EventTarget();
  }

  on(event: AudioEventType, handler: (e: Event) => void): () => void {
    this.target.addEventListener(event, handler);
    return () => this.target.removeEventListener(event, handler);
  }

  emit(event: AudioEventType, detail?: any): void {
    this.target.dispatchEvent(new CustomEvent(event, { detail }));
  }
}

export interface MarkerEventDetail {
  type: 'add' | 'remove' | 'update' | 'clear' | 'load';
  markers: import('./MarkerManager').Marker[];
  marker?: import('./MarkerManager').Marker;
}

export type MarkerEventType = 'markersChanged';

export class MarkerEventBus {
  private target: EventTarget;

  constructor() {
    this.target = new EventTarget();
  }

  on(handler: (e: Event) => void): () => void {
    this.target.addEventListener('markersChanged', handler);
    return () => this.target.removeEventListener('markersChanged', handler);
  }

  emit(detail: MarkerEventDetail): void {
    this.target.dispatchEvent(new CustomEvent('markersChanged', { detail }));
  }
}
