import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { TourCity } from '../types';
import { optimizeRoute } from '../utils/routeOptimizer';
import { useEffect } from 'react';
import dayjs from 'dayjs';

function getAbbr(name: string): string {
  const chinese = name.match(/[\u4e00-\u9fa5]/g);
  if (chinese && chinese.length >= 2) return chinese.slice(0, 2).join('');
  return name.slice(0, 2);
}

function CityMarkerDiv({ city, onRemove }: { city: TourCity; onRemove?: (id: string) => void }) {
  const abbr = getAbbr(city.name);
  const icon = L.divIcon({
    className: '',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #ff6b6b;
        border: 2px solid #ffffff;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 11px;
        font-weight: 600;
        position: relative;
        cursor: pointer;
      ">
        ${abbr}
        <div style="
          position: absolute;
          bottom: calc(100% + 6px);
          left: 50%;
          transform: translateX(-50%);
          background: #1e293b;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease-out;
          color: #f1f5f9;
          font-weight: 500;
        " class="marker-tooltip">
          ${city.name} · ${dayjs(city.date).format('MM/DD')}
        </div>
      </div>
      <style>
        .leaflet-marker-icon:hover .marker-tooltip { opacity: 1 !important; }
      </style>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });

  const handleContextMenu = () => {
    if (onRemove && window.confirm(`确定要移除${city.name}吗？`)) onRemove(city.id);
  };

  return (
    <Marker
      position={[city.lat, city.lng]}
      icon={icon}
      eventHandlers={{ contextmenu: handleContextMenu }}
    />
  );
}

function MapClickHandler({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      if (onClick) onClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

function FlyToHandler({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, map.getZoom());
  }, [center, map]);
  return null;
}

interface Props {
  cities: TourCity[];
  onMapClick?: (lat: number, lng: number) => void;
  onRemoveCity?: (id: string) => void;
  height?: string;
}

export default function TourMap({ cities, onMapClick, onRemoveCity, height = '450px' }: Props) {
  const optimized = optimizeRoute(cities);
  const positions: [number, number][] = optimized.map(c => [c.lat, c.lng]);

  const center: [number, number] = cities.length > 0
    ? [
        cities.reduce((s, c) => s + c.lat, 0) / cities.length,
        cities.reduce((s, c) => s + c.lng, 0) / cities.length
      ]
    : [35.8617, 104.1954];

  return (
    <div className="tour-map-container" style={{ height }}>
      <MapContainer
        center={center}
        zoom={cities.length > 0 ? 5 : 4}
        style={{ height: '100%', width: '100%', borderRadius: '12px' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyToHandler center={center} />
        {onMapClick && <MapClickHandler onClick={onMapClick} />}
        {optimized.map(c => (
          <CityMarkerDiv key={c.id} city={c} onRemove={onRemoveCity} />
        ))}
        {positions.length > 1 && (
          <Polyline
            positions={positions}
            pathOptions={{
              color: '#6366f1',
              weight: 3,
              opacity: 0.85,
              lineJoin: 'round',
              lineCap: 'round'
            }}
          />
        )}
      </MapContainer>
      <div className="map-controls">
        <div className="map-control-btn" title="点击地图添加城市 · 右键标记移除" style={{ background: 'rgba(255,107,107,0.9)' }}>
          �
        </div>
      </div>
    </div>
  );
}
