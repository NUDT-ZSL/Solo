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
  private heatLayer: L.LayerGroup;
  private heatmapPane: HTMLElement;
  private truckMarkers: Map<string, L.Marker> = new Map();
  private dispatchAnimations: Map<string, number> = new Map();
  private callbacks: MapManagerCallbacks;
  private dispatchMode: boolean = false;
  private selectedStartId: string | null = null;
  private selectedEndId: string | null = null;
  private heatmapVisible: boolean = false;

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
      subdomains: 'abcd'
    }).addTo(this.map);

    this.map.createPane('heatmapPane');
    this.heatmapPane = this.map.getPane('heatmapPane')!;
    this.heatmapPane.style.zIndex = '450';
    this.heatmapPane.style.opacity = '0';
    this.heatmapPane.style.pointerEvents = 'none';
    this.heatmapPane.classList.add('heatmap-pane');

    this.heatLayer = L.layerGroup([], { pane: 'heatmapPane' }).addTo(this.map);

    this.map.getContainer().addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      const bikeMarker = target.closest('.bike-marker') as HTMLElement | null;
      if (bikeMarker) {
        const stationId = bikeMarker.getAttribute('data-station-id');
        if (stationId) {
          this.handleMarkerClick(stationId);
        }
      }
    });
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
      html: `<div class="bike-marker" data-station-id="${station.id}" style="background-color: ${color};">${station.bikeCount}</div>`,
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

    if (!innerEl) return;

    if (animate) {
      innerEl.style.transform = 'scale(1.35)';
      this.addRippleEffect(innerEl, color);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          innerEl.textContent = String(station.bikeCount);
          innerEl.style.backgroundColor = color;
          innerEl.style.transform = '';
        });
      });
    } else {
      innerEl.textContent = String(station.bikeCount);
      innerEl.style.backgroundColor = color;
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
    const existingRipples = element.querySelectorAll('.ripple');
    existingRipples.forEach(r => r.remove());

    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    ripple.style.color = color;
    element.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 900);
  }

  updateHeatmap(stations: BikeStation[]): void {
    this.heatLayer.clearLayers();

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
        interactive: false,
        pane: 'heatmapPane'
      });

      circle.addTo(this.heatLayer);
    });
  }

  toggleHeatmap(show: boolean): void {
    this.heatmapVisible = show;
    if (show) {
      this.heatLayer.addTo(this.map);
      this.updateHeatmap(this.getCurrentStationData());
    }

    requestAnimationFrame(() => {
      this.heatmapPane.style.opacity = show ? '1' : '0';
    });

    if (!show) {
      setTimeout(() => {
        if (!this.heatmapVisible) {
          this.map.removeLayer(this.heatLayer);
        }
      }, 550);
    }
  }

  private getCurrentStationData(): BikeStation[] {
    const stations: BikeStation[] = [];
    this.markers.forEach((marker, id) => {
      const ll = marker.getLatLng();
      const el = marker.getElement();
      const inner = el?.querySelector('.bike-marker') as HTMLElement;
      const bikeCount = inner ? parseInt(inner.textContent || '0', 10) : 0;
      stations.push({
        id,
        name: '',
        lat: ll.lat,
        lng: ll.lng,
        bikeCount,
        capacity: 15,
        hourlyHistory: []
      });
    });
    return stations;
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
      iconSize: [36, 36],
      iconAnchor: [18, 18]
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

    const animateFrame = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = this.easeInOutCubic(progress);

      const currentLat = startLat + (endLat - startLat) * eased;
      const currentLng = startLng + (endLng - startLng) * eased;

      truckMarker.setLatLng([currentLat, currentLng]);

      if (progress < 1) {
        const animId = requestAnimationFrame(animateFrame);
        this.dispatchAnimations.set(task.id, animId);
      } else {
        truckMarker.remove();
        this.truckMarkers.delete(task.id);
        this.dispatchAnimations.delete(task.id);
        onComplete();
      }
    };

    const animId = requestAnimationFrame(animateFrame);
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
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;

    const width = rect.width;
    const height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    const padding = { top: 12, right: 12, bottom: 28, left: 38 };
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
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const value = 100 - i * 25;
      const y = padding.top + (chartHeight / 4) * i + 4;
      ctx.fillText(`${value}%`, padding.left - 6, y);
    }

    ctx.textAlign = 'center';
    for (let i = 0; i < history.length; i += 2) {
      const x = padding.left + (chartWidth / Math.max(history.length - 1, 1)) * i;
      const hour = (new Date().getHours() - 11 + i + 24) % 24;
      ctx.fillText(`${hour}时`, x, height - 6);
    }

    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(26, 115, 232, 0.25)');
    gradient.addColorStop(1, 'rgba(26, 115, 232, 0.02)');

    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);

    const points: { x: number; y: number }[] = [];
    history.forEach((value, index) => {
      const x = padding.left + (chartWidth / Math.max(history.length - 1, 1)) * index;
      const y = padding.top + chartHeight - (value / 100) * chartHeight;
      points.push({ x, y });
    });

    ctx.lineTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpX = (prev.x + curr.x) / 2;
      ctx.bezierCurveTo(cpX, prev.y, cpX, curr.y, curr.x, curr.y);
    }

    ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpX = (prev.x + curr.x) / 2;
      ctx.bezierCurveTo(cpX, prev.y, cpX, curr.y, curr.x, curr.y);
    }
    ctx.strokeStyle = '#1a73e8';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
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
