import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.heat';
import { eventBus } from '../event-bus';
import type { StationStatus } from '../services/StationMonitor';

const CROWD_COLORS: Record<string, string> = {
  green: '#22c55e',
  yellow: '#eab308',
  orange: '#f97316',
  red: '#ef4444'
};

const CROWD_LABELS: Record<string, string> = {
  green: '宽松',
  yellow: '适中',
  orange: '拥挤',
  red: '爆满'
};

const SHANGHAI_CENTER: [number, number] = [31.2304, 121.4737];
const INITIAL_ZOOM = 12;

function drawMiniChart(canvas: HTMLCanvasElement, history: number[], color: string) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const padding = 2;

  ctx.clearRect(0, 0, width, height);

  if (history.length < 2) return;

  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;

  const stepX = (width - padding * 2) / (history.length - 1);

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;

  history.forEach((value, index) => {
    const x = padding + index * stepX;
    const y = height - padding - ((value - min) / range) * (height - padding * 2);

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();
}

function createPopupContent(station: StationStatus): HTMLElement {
  const container = document.createElement('div');
  container.style.width = '280px';
  container.style.background = '#1e293b';
  container.style.borderRadius = '8px';
  container.style.padding = '16px';
  container.style.color = 'white';
  container.style.fontFamily = 'system-ui, -apple-system, sans-serif';

  const color = CROWD_COLORS[station.crowdLevel];
  const label = CROWD_LABELS[station.crowdLevel];

  container.innerHTML = `
    <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">${station.name}</div>
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
      <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${color};"></span>
      <span style="font-size: 14px; color: #cbd5e1;">拥挤等级：${label}</span>
    </div>
    <div style="font-size: 14px; color: #94a3b8; margin-bottom: 12px;">
      当前客流量：<span style="color: white; font-weight: 600;">${Math.round(station.flowRate)}</span> 人/小时
    </div>
    <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">流量趋势（近10次更新）</div>
    <canvas width="240" height="40" style="background: #0f172a; border-radius: 4px;"></canvas>
  `;

  const canvas = container.querySelector('canvas');
  if (canvas) {
    drawMiniChart(canvas, station.history, color);
  }

  return container;
}

function createFaultIcon(): L.DivIcon {
  return L.divIcon({
    className: 'fault-icon',
    html: '<div class="fault-blink">⚠</div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
}

export default function MapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const heatLayerRef = useRef<L.HeatLayer | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const popupsRef = useRef<Map<string, L.Popup>>(new Map());

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: SHANGHAI_CENTER,
      zoom: INITIAL_ZOOM,
      zoomControl: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    const heatLayer = L.heatLayer([], {
      radius: 25,
      blur: 15,
      maxZoom: 15,
      gradient: {
        0.0: '#0000ff',
        0.25: '#0066ff',
        0.5: '#00ccff',
        0.75: '#ff6600',
        1.0: '#ff0000'
      }
    } as L.HeatMapOptions).addTo(map);

    mapInstanceRef.current = map;
    heatLayerRef.current = heatLayer;

    const style = document.createElement('style');
    style.textContent = `
      .leaflet-popup-content-wrapper {
        background: #1e293b !important;
        border-radius: 8px !important;
        padding: 0 !important;
      }
      .leaflet-popup-content {
        margin: 0 !important;
        width: 280px !important;
      }
      .leaflet-popup-tip {
        background: #1e293b !important;
      }
      .leaflet-popup-close-button {
        color: white !important;
      }
      .fault-blink {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        animation: faultBlink 1s ease-in-out infinite;
      }
      @keyframes faultBlink {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(1.2); }
      }
    `;
    document.head.appendChild(style);

    const handleStationClick = eventBus.on('station:click', (data) => {
      const stationId = data as string;
      const marker = markersRef.current.get(stationId);
      if (marker && mapInstanceRef.current) {
        marker.openPopup();
        mapInstanceRef.current.panTo(marker.getLatLng());
      }
    });

    return () => {
      style.remove();
      handleStationClick();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = eventBus.on('status:update', (data) => {
      const stations = data as StationStatus[];
      updateHeatmap(stations);
      updateMarkers(stations);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const updateHeatmap = (stations: StationStatus[]) => {
    if (!heatLayerRef.current) return;

    const heatPoints: L.LatLngTuple[] = stations.map((s) => {
      const intensity = (s.flowRate - 50) / 950; // normalize 50-1000 -> 0-1
      return [s.lat, s.lng, intensity];
    });

    heatLayerRef.current.setLatLngs(heatPoints);
  };

  const updateMarkers = (stations: StationStatus[]) => {
    if (!mapInstanceRef.current) return;

    const currentIds = new Set(stations.map((s) => s.id));

    stations.forEach((station) => {
      let marker = markersRef.current.get(station.id);

      if (!marker) {
        marker = L.marker([station.lat, station.lng], {
          icon: station.status === 'fault' ? createFaultIcon() : L.divIcon({
            className: 'station-dot',
            html: `<div style="width: 10px; height: 10px; border-radius: 50%; background: ${CROWD_COLORS[station.crowdLevel]}; border: 2px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.5);"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7]
          }))
        }).addTo(mapInstanceRef.current!);

        const popup = L.popup({
          closeButton: true,
          className: 'custom-popup'
        }).setContent(createPopupContent(station));

        marker.bindPopup(popup);
        markersRef.current.set(station.id, marker);
        popupsRef.current.set(station.id, popup);
      } else {
        const popup = popupsRef.current.get(station.id);
        if (popup) {
          popup.setContent(createPopupContent(station));
        }

        if (station.status === 'fault') {
          marker.setIcon(createFaultIcon());
        } else {
          marker.setIcon(L.divIcon({
            className: 'station-dot',
            html: `<div style="width: 10px; height: 10px; border-radius: 50%; background: ${CROWD_COLORS[station.crowdLevel]}; border: 2px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.5);"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7]
          }));
        }
      }
    });

    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
        popupsRef.current.delete(id);
      }
    });
  };

  return (
    <div
      ref={mapRef}
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '12px',
        overflow: 'hidden'
      }}
    />
  );
}
