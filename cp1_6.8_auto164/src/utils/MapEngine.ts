import * as L from 'leaflet';
import 'leaflet.heat';
import type { AudioMarkerData, HeatmapPoint } from '@/types';

declare module 'leaflet.heat' {
  import * as L from 'leaflet';
  function heatLayer(latlngs: Array<[number, number, number]>, options?: Record<string, unknown>): L.Layer;
}

export class MapEngine {
  private map: L.Map | null = null;
  private markers: Map<string, L.Marker> = new Map();
  private routeLine: L.Polyline | null = null;
  private heatmapLayer: L.Layer | null = null;
  private mapClickCallback: ((lat: number, lng: number) => void) | null = null;
  private tileLayer: L.TileLayer | null = null;

  init(container: HTMLElement, options?: { center?: [number, number]; zoom?: number }): void {
    const center = options?.center ?? [39.9042, 116.4074];
    const zoom = options?.zoom ?? 12;

    this.map = L.map(container).setView(center, zoom);

    this.tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    });

    this.tileLayer.addTo(this.map);

    const style = document.createElement('style');
    style.textContent = `.leaflet-tile-pane { filter: sepia(0.2) saturate(1.3) brightness(1.05); }`;
    container.appendChild(style);
  }

  addAudioMarker(marker: AudioMarkerData, onClick: (marker: AudioMarkerData) => void): L.Marker {
    if (!this.map) throw new Error('Map not initialized');

    const color = marker.features.warmth >= 0.5 ? '#E8935A' : '#5AB8A8';

    const icon = L.divIcon({
      className: 'audio-marker-icon',
      html: `<div style="
        width: 8px;
        height: 8px;
        background: ${color};
        border-radius: 50%;
        box-shadow: 0 0 6px ${color};
        animation: markerPulse 2s ease-in-out infinite;
      "></div>`,
      iconSize: [8, 8],
      iconAnchor: [4, 4],
    });

    const leafletMarker = L.marker([marker.lat, marker.lng], { icon }).addTo(this.map);
    leafletMarker.on('click', () => onClick(marker));
    this.markers.set(marker.id, leafletMarker);

    return leafletMarker;
  }

  removeAudioMarker(id: string): void {
    const marker = this.markers.get(id);
    if (marker && this.map) {
      marker.remove();
      this.markers.delete(id);
    }
  }

  drawRoute(markers: AudioMarkerData[]): L.Polyline {
    if (!this.map) throw new Error('Map not initialized');
    this.removeRoute();

    const latlngs = markers.map((m) => L.latLng(m.lat, m.lng));
    this.routeLine = L.polyline(latlngs, {
      color: '#A8D5A2',
      weight: 3,
      dashArray: '10, 8',
      lineCap: 'round',
    }).addTo(this.map);

    return this.routeLine;
  }

  removeRoute(): void {
    if (this.routeLine && this.map) {
      this.routeLine.remove();
      this.routeLine = null;
    }
  }

  updateHeatmap(points: HeatmapPoint[]): void {
    if (!this.map) throw new Error('Map not initialized');
    this.removeHeatmap();

    const data: Array<[number, number, number]> = points.map((p) => [p.lat, p.lng, p.intensity]);

    this.heatmapLayer = L.heatLayer(data, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      gradient: {
        0.2: '#5AB8A8',
        0.5: '#E8D06A',
        0.8: '#E8935A',
        1.0: '#E85A5A',
      },
    } as Record<string, unknown>);

    this.heatmapLayer.addTo(this.map);
  }

  removeHeatmap(): void {
    if (this.heatmapLayer && this.map) {
      this.heatmapLayer.remove();
      this.heatmapLayer = null;
    }
  }

  getMap(): L.Map {
    if (!this.map) throw new Error('Map not initialized');
    return this.map;
  }

  fitToMarkers(markers: AudioMarkerData[]): void {
    if (!this.map || markers.length === 0) return;
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
    this.map.fitBounds(bounds, { padding: [50, 50] });
  }

  onMapClick(callback: (lat: number, lng: number) => void): void {
    this.mapClickCallback = callback;
    if (this.map) {
      this.map.on('click', (e: L.LeafletMouseEvent) => {
        callback(e.latlng.lat, e.latlng.lng);
      });
    }
  }

  offMapClick(): void {
    if (this.map && this.mapClickCallback) {
      this.map.off('click');
      this.mapClickCallback = null;
    }
  }

  destroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.markers.clear();
    this.routeLine = null;
    this.heatmapLayer = null;
    this.mapClickCallback = null;
    this.tileLayer = null;
  }
}
