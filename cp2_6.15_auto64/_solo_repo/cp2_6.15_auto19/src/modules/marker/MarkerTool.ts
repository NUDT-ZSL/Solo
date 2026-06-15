import { Marker, HighlightedPoint } from '../../utils/types';

export class MarkerTool {
  private markers: Marker[] = [];
  private highlightedPoints: Map<number, HighlightedPoint> = new Map();
  private isActive: boolean = false;
  private highlightDuration: number = 3000;

  constructor() {}

  setActive(active: boolean): void {
    this.isActive = active;
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  addMarker(
    pointIndex: number,
    position: [number, number, number],
    color: [number, number, number]
  ): Marker {
    const marker: Marker = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      pointIndex,
      position,
      color,
      timestamp: Date.now()
    };
    this.markers.push(marker);
    return marker;
  }

  addHighlightedPoint(
    index: number,
    position: [number, number, number],
    screenPosition: { x: number; y: number }
  ): void {
    this.highlightedPoints.set(index, {
      index,
      position,
      screenPosition,
      startTime: Date.now()
    });

    setTimeout(() => {
      this.highlightedPoints.delete(index);
    }, this.highlightDuration);
  }

  getHighlightedPoints(): HighlightedPoint[] {
    const now = Date.now();
    const active: HighlightedPoint[] = [];
    
    this.highlightedPoints.forEach((point) => {
      if (now - point.startTime < this.highlightDuration) {
        active.push(point);
      }
    });
    
    return active;
  }

  getHighlightScale(index: number): number {
    const point = this.highlightedPoints.get(index);
    if (!point) return 1;
    
    const elapsed = Date.now() - point.startTime;
    const progress = Math.min(elapsed / this.highlightDuration, 1);
    const fadeOut = 1 - progress * progress;
    
    return 1 + 0.5 * fadeOut;
  }

  isHighlighted(index: number): boolean {
    return this.highlightedPoints.has(index);
  }

  getMarkers(): Marker[] {
    return [...this.markers];
  }

  removeMarker(id: string): boolean {
    const index = this.markers.findIndex(m => m.id === id);
    if (index >= 0) {
      this.markers.splice(index, 1);
      return true;
    }
    return false;
  }

  clearMarkers(): void {
    this.markers = [];
  }

  clearHighlights(): void {
    this.highlightedPoints.clear();
  }

  exportMarkers(): string {
    return JSON.stringify(this.markers, null, 2);
  }

  getHighlightIntensity(index: number): number {
    const point = this.highlightedPoints.get(index);
    if (!point) return 0;
    
    const elapsed = Date.now() - point.startTime;
    const progress = Math.min(elapsed / this.highlightDuration, 1);
    return Math.max(0, 1 - progress * progress);
  }
}

export const createMarkerTool = (): MarkerTool => {
  return new MarkerTool();
};
