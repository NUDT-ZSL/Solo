export interface Marker {
  id: string;
  time: number;
}

export interface MarkerSequence {
  audioFileName: string;
  markers: Marker[];
  version: string;
}

export type MarkerEventType = 'add' | 'remove' | 'update' | 'clear' | 'load';

export interface MarkerEvent {
  type: MarkerEventType;
  markers: Marker[];
  marker?: Marker;
}

export type MarkerEventListener = (event: MarkerEvent) => void;

export class MarkerManager {
  private markers: Marker[] = [];
  private listeners: Set<MarkerEventListener> = new Set();
  private snapInterval: number = 0.5;
  private snapThreshold: number = 0.1;
  private audioFileName: string = '';

  constructor(markers: Marker[] = []) {
    this.markers = [...markers].sort((a, b) => a.time - b.time);
  }

  setAudioFileName(name: string): void {
    this.audioFileName = name;
  }

  getAudioFileName(): string {
    return this.audioFileName;
  }

  getMarkers(): Marker[] {
    return [...this.markers];
  }

  getMarkerCount(): number {
    return this.markers.length;
  }

  getTotalDuration(): number {
    if (this.markers.length < 2) return 0;
    return this.markers[this.markers.length - 1].time - this.markers[0].time;
  }

  addMarker(time: number): Marker {
    const snappedTime = this.snapTime(time);
    const marker: Marker = {
      id: this.generateId(),
      time: snappedTime,
    };

    const insertIndex = this.markers.findIndex((m) => m.time > snappedTime);
    if (insertIndex === -1) {
      this.markers.push(marker);
    } else {
      this.markers.splice(insertIndex, 0, marker);
    }

    this.emit({ type: 'add', markers: this.getMarkers(), marker });
    return marker;
  }

  removeMarker(id: string): Marker | null {
    const index = this.markers.findIndex((m) => m.id === id);
    if (index === -1) return null;

    const [removed] = this.markers.splice(index, 1);
    this.emit({ type: 'remove', markers: this.getMarkers(), marker: removed });
    return removed;
  }

  updateMarkerTime(id: string, time: number, snap: boolean = true): Marker | null {
    const marker = this.markers.find((m) => m.id === id);
    if (!marker) return null;

    const newTime = snap ? this.snapTime(time) : time;
    marker.time = newTime;
    this.markers.sort((a, b) => a.time - b.time);

    this.emit({ type: 'update', markers: this.getMarkers(), marker });
    return marker;
  }

  clearMarkers(): void {
    this.markers = [];
    this.emit({ type: 'clear', markers: [] });
  }

  snapTime(time: number): number {
    if (this.snapInterval <= 0) return time;
    const snapped = Math.round(time / this.snapInterval) * this.snapInterval;
    if (Math.abs(snapped - time) <= this.snapThreshold) {
      return snapped;
    }
    return time;
  }

  setSnapInterval(interval: number): void {
    this.snapInterval = interval;
  }

  getSnapInterval(): number {
    return this.snapInterval;
  }

  setSnapThreshold(threshold: number): void {
    this.snapThreshold = threshold;
  }

  getSnapThreshold(): number {
    return this.snapThreshold;
  }

  findNearestMarker(time: string): Marker | null;
  findNearestMarker(time: number, tolerance: number): Marker | null;
  findNearestMarker(time: number | string, tolerance?: number): Marker | null {
    if (typeof time === 'string') {
      return this.markers.find((m) => m.id === time) || null;
    }
    if (this.markers.length === 0) return null;

    let nearest: Marker | null = null;
    let minDiff = Infinity;

    for (const marker of this.markers) {
      const diff = Math.abs(marker.time - time);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = marker;
      }
    }

    if (tolerance !== undefined && minDiff > tolerance) {
      return null;
    }

    return nearest;
  }

  getMarkerAtTime(time: number, tolerance: number): Marker | null {
    for (const marker of this.markers) {
      if (Math.abs(marker.time - time) <= tolerance) {
        return marker;
      }
    }
    return null;
  }

  serialize(): string {
    const sequence: MarkerSequence = {
      audioFileName: this.audioFileName,
      markers: this.getMarkers(),
      version: '1.0',
    };
    return JSON.stringify(sequence, null, 2);
  }

  deserialize(json: string): MarkerSequence {
    const data = JSON.parse(json) as MarkerSequence;
    if (!data.markers || !Array.isArray(data.markers)) {
      throw new Error('Invalid marker sequence format');
    }

    this.audioFileName = data.audioFileName || '';
    this.markers = [...data.markers].sort((a, b) => a.time - b.time);

    this.emit({ type: 'load', markers: this.getMarkers() });
    return data;
  }

  toJSON(): MarkerSequence {
    return {
      audioFileName: this.audioFileName,
      markers: this.getMarkers(),
      version: '1.0',
    };
  }

  addListener(listener: MarkerEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  removeListener(listener: MarkerEventListener): void {
    this.listeners.delete(listener);
  }

  private emit(event: MarkerEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (e) {
        console.error('Marker event listener error:', e);
      }
    });
  }

  private generateId(): string {
    return `marker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
