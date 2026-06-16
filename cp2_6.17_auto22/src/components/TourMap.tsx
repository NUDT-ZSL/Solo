import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { TourCity } from '../types';
import { popularityToColor, optimizeRoute } from '../utils/routeOptimizer';
import { useEffect } from 'react';
import dayjs from 'dayjs';

function CityMarkerDiv({ city, onRemove }: { city: TourCity; onRemove?: (id: string) => void }) {
  const color = popularityToColor(city.popularity);
  const icon = L.divIcon({
    className: 'custom-marker',
    html: `<div class="city-marker" style="background:${color}"><div class="city-marker-label">${city.name} · ${dayjs(city.date).format('MM/DD')}</div></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
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
        <div className="map-control-btn" title="城市热度：绿色→红色" style={{ background: 'linear-gradient(135deg,#22c55e,#ef4444)' }}>
          🔥
        </div>
      </div>
    </div>
  );
}
