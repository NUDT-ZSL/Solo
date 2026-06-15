import L from 'leaflet';
import type { BikeStation, DispatchTask } from './data-generator';
import { getBikeColor } from './data-generator';

export interface MapManagerCallbacks {
  onStationClick: (stationId: string) => void;
  onStationSelect?: (stationId: string) => void;
}

export class MapManager {
  private map: L.Map;
  private markers: Map<string, L.Marker> = new Map();
  private heatmarkers: L.CircleMarker[] = [];
  private heatLayer: L.LayerGroup;
  private truckMarkers: Map<string, L.Marker> = new Map();
  private dispatchAnimations: Map<string, number> = new Map();
  private callbacks: MapManagerCallbacks;
  private dispatchMode: boolean = false;
  private selectedStartId: string | null = null;
  private selectedEndId: string | null = null;

  constructor(mapContainerId: string, callbacks: MapManagerCallbacks) {
    this.callbacks = callbacks;

    this.map = L.map(mapContainerId, {
      center: [39.9042, 116.4074],
      zoom: 13,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      className: 'osm-tiles'
    }).addTo(this.map);

    this.heatLayer = L.layerGroup().addTo(this.map);
  }

  getMap(): L.Map {
    return this.map;
  }

  addStations(stations: BikeStation[]): void {
    stations.forEach(station => {
      this.addStationMarker(station);
    });
    this.updateHeatmap(stations);
  }

  private addStationMarker(station: BikeStation): void {
    const color = getBikeColor(station.bikeCount, station.capacity);

    const icon = L.divIcon({
      className: 'bike-marker-wrapper',
      html: `<div class="bike-marker" style="background-color: ${color}; color: white;">${station.bikeCount}</div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    const marker = L.marker([station.lat, station.lng], { icon });
    marker.addTo(this.map);

    marker.on('click', () => {
      this.handleMarkerClick(station.id);
    });

    this.markers.set(station.id, marker);
  }

  private handleMarkerClick(stationId: string): void {
    if (this.dispatchMode) {
      this.handleDispatchSelect(stationId);
    } else {
      this.callbacks.onStationClick(stationId);
    }
  }

  private handleDispatchSelect(stationId: string): void {
    if (!this.selectedStartId) {
      this.selectedStartId = stationId;
      this.updateMarkerDispatchClass(stationId, 'dispatch-start');
      this.callbacks.onStationSelect?.(stationId);
    } else if (!this.selectedEndId && stationId !== this.selectedStartId) {
      this.selectedEndId = stationId;
      this.updateMarkerDispatchClass(stationId, 'dispatch-end');
      this.callbacks.onStationSelect?.(stationId);
    }
  }

  private updateMarkerDispatchClass(stationId: string, className: string): void {
    const marker = this.markers.get(stationId);
    if (marker) {
      const el = marker.getElement();
      const inner = el?.querySelector('.bike-marker');
      if (inner) {
        inner.classList.add(className);
      }
    }
  }

  clearDispatchSelection(): void {
    if (this.selectedStartId) {
      const marker = this.markers.get(this.selectedStartId);
      const el = marker?.getElement();
      const inner = el?.querySelector('.bike-marker');
      inner?.classList.remove('dispatch-start');
      this.selectedStartId = null;
    }
    if (this.selectedEndId) {
      const marker = this.markers.get(this.selectedEndId);
      const el = marker?.getElement();
      const inner = el?.querySelector('.bike-marker');
      inner?.classList.remove('dispatch-end');
      this.selectedEndId = null;
    }
  }

  getDispatchSelection(): { startId: string | null; endId: string | null } {
    return { startId: this.selectedStartId, endId: this.selectedEndId };
  }

  setDispatchMode(enabled: boolean): void {
    this.dispatchMode = enabled;
    if (!enabled) {
      this.clearDispatchSelection();
    }
  }

  updateStation(station: BikeStation, animate: boolean = false): void {
    const marker = this.markers.get(station.id);
    if (!marker) return;

    const color = getBikeColor(station.bikeCount, station.capacity);
    const el = marker.getElement();
    const innerEl = el?.querySelector('.bike-marker') as HTMLElement;

    if (innerEl) {
      innerEl.textContent = String(station.bikeCount);
      innerEl.style.backgroundColor = color;

      if (animate) {
        innerEl.style.transform = 'scale(1.3)';
        this.addRippleEffect(innerEl, color);

        setTimeout(() => {
          innerEl.style.transform = '';
        }, 300);
      }
    }
  }

  updateStations(stations: BikeStation[], changedIds: string[]): void {
    stations.forEach(station => {
      const animate = changedIds.includes(station.id);
      this.updateStation(station, animate);
    });
    this.updateHeatmap(stations);
  }

  private addRippleEffect(element: HTMLElement, color: string): void {
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    ripple.style.color = color;
    element.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 800);
  }

  updateHeatmap(stations: BikeStation[]): void {
    this.heatLayer.clearLayers();
    this.heatmarkers = [];

    stations.forEach(station => {
      const ratio = station.bikeCount / station.capacity;
      const radius = 80 + ratio * 120;
      const color = getBikeColor(station.bikeCount, station.capacity);

      const circle = L.circleMarker([station.lat, station.lng], {
        radius,
        fillColor: color,
        color: color,
        weight: 0,
        fillOpacity: 0.25 + ratio * 0.35,
        interactive: false
      });

      circle.addTo(this.heatLayer);
      this.heatmarkers.push(circle);
    });
  }

  toggleHeatmap(show: boolean): void {
    if (show) {
      this.heatLayer.addTo(this.map);
    } else {
      this.map.removeLayer(this.heatLayer);
    }
  }

  startDispatchAnimation(
    task: DispatchTask,
    stations: BikeStation[],
    onComplete: () => void
  ): void {
    const fromStation = stations.find(s => s.id === task.fromStationId);
    const toStation = stations.find(s => s.id === task.toStationId);

    if (!fromStation || !toStation) return;

    const truckIcon = L.divIcon({
      className: 'truck-wrapper',
      html: '<div class="truck-marker">🚚</div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const truckMarker = L.marker([fromStation.lat, fromStation.lng], {
      icon: truckIcon,
      interactive: false,
      zIndexOffset: 1000
    });

    truckMarker.addTo(this.map);
    this.truckMarkers.set(task.id, truckMarker);

    const startLat = fromStation.lat;
    const startLng = fromStation.lng;
    const endLat = toStation.lat;
    const endLng = toStation.lng;
    const duration = task.duration;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = this.easeInOutCubic(progress);

      const currentLat = startLat + (endLat - startLat) * eased;
      const currentLng = startLng + (endLng - startLng) * eased;

      truckMarker.setLatLng([currentLat, currentLng]);

      if (progress < 1) {
        const animId = requestAnimationFrame(animate);
        this.dispatchAnimations.set(task.id, animId);
      } else {
        setTimeout(() => {
          truckMarker.remove();
          this.truckMarkers.delete(task.id);
          this.dispatchAnimations.delete(task.id);
          onComplete();
        }, 100);
      }
    };

    const animId = requestAnimationFrame(animate);
    this.dispatchAnimations.set(task.id, animId);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  drawHistoryChart(canvasId: string, history: number[]): void {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 10, right: 10, bottom: 25, left: 35 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = '#f1f3f4';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#9aa0a6';
    ctx.font = '11px -apple-system, sans-serif';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 4; i++) {
      const value = 100 - i * 25;
      const y = padding.top + (chartHeight / 4) * i + 4;
      ctx.fillText(`${value}%`, padding.left - 6, y);
    }

    ctx.textAlign = 'center';
    for (let i = 0; i < history.length; i += 3) {
      const x = padding.left + (chartWidth / (history.length - 1)) * i;
      const hour = (new Date().getHours() - 11 + i + 24) % 24;
      ctx.fillText(`${hour}时`, x, height - 8);
    }

    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(26, 115, 232, 0.3)');
    gradient.addColorStop(1, 'rgba(26, 115, 232, 0.02)');

    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);

    history.forEach((value, index) => {
      const x = padding.left + (chartWidth / (history.length - 1)) * index;
      const y = padding.top + chartHeight - (value / 100) * chartHeight;

      if (index === 0) {
        ctx.lineTo(x, y);
      } else {
        const prevX = padding.left + (chartWidth / (history.length - 1)) * (index - 1);
        const prevY = padding.top + chartHeight - (history[index - 1] / 100) * chartHeight;
        const cpX = (prevX + x) / 2;
        ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
      }
    });

    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    history.forEach((value, index) => {
      const x = padding.left + (chartWidth / (history.length - 1)) * index;
      const y = padding.top + chartHeight - (value / 100) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        const prevX = padding.left + (chartWidth / (history.length - 1)) * (index - 1);
        const prevY = padding.top + chartHeight - (history[index - 1] / 100) * chartHeight;
        const cpX = (prevX + x) / 2;
        ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
      }
    });
    ctx.strokeStyle = '#1a73e8';
    ctx.lineWidth = 2;
    ctx.stroke();

    history.forEach((value, index) => {
      const x = padding.left + (chartWidth / (history.length - 1)) * index;
      const y = padding.top + chartHeight - (value / 100) * chartHeight;

      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#1a73e8';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }

  destroy(): void {
    this.dispatchAnimations.forEach(animId => {
      cancelAnimationFrame(animId);
    });
    this.dispatchAnimations.clear();
    this.map.remove();
  }
}
