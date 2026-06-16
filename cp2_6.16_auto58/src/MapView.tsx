import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { DayItinerary, ScheduleItem } from './types';

interface MapViewProps {
  itinerary: DayItinerary[];
}

function createCustomIcon(color: string) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="width: 12px; height: 12px; background: ${color}; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -6]
  });
}

function getColor(type: string): string {
  switch (type) {
    case 'attraction': return '#2ecc71';
    case 'restaurant': return '#e67e22';
    case 'hotel': return '#3498db';
    default: return '#999';
  }
}

function getTypeName(type: string): string {
  switch (type) {
    case 'attraction': return '景点';
    case 'restaurant': return '餐厅';
    case 'hotel': return '住宿';
    default: return '';
  }
}

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

function MapView({ itinerary }: MapViewProps) {
  const [mapCenter, setMapCenter] = useState<[number, number]>([39.9042, 116.4074]);
  const [mapZoom, setMapZoom] = useState(12);
  const [allPOIs, setAllPOIs] = useState<ScheduleItem[]>([]);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);

  useEffect(() => {
    if (itinerary.length === 0) {
      setAllPOIs([]);
      setRouteCoords([]);
      return;
    }

    const pois: ScheduleItem[] = [];
    const coords: [number, number][] = [];

    itinerary.forEach(day => {
      day.schedule.forEach(item => {
        pois.push(item);
        coords.push([item.lat, item.lng]);
      });
    });

    setAllPOIs(pois);
    setRouteCoords(coords);

    if (pois.length > 0) {
      const lats = pois.map(p => p.lat);
      const lngs = pois.map(p => p.lng);
      const avgLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const avgLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
      setMapCenter([avgLat, avgLng]);
      setMapZoom(12);
    }
  }, [itinerary]);

  return (
    <MapContainer
      center={mapCenter}
      zoom={mapZoom}
      scrollWheelZoom={true}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapController center={mapCenter} zoom={mapZoom} />
      
      {routeCoords.length > 1 && (
        <Polyline
          positions={routeCoords}
          color="#ff6b6b"
          weight={3}
          opacity={0.6}
          dashArray="10, 10"
        />
      )}

      {allPOIs.map((poi, index) => (
        <Marker
          key={`${poi.id}-${index}`}
          position={[poi.lat, poi.lng]}
          icon={createCustomIcon(getColor(poi.type))}
        >
          <Popup>
            <div className="custom-popup">
              <div className="popup-header">
                <span className={`popup-type-tag ${poi.type}`}>
                  {getTypeName(poi.type)}
                </span>
                <span className="popup-name">{poi.name}</span>
              </div>
              <div className="popup-rating">
                <span>⭐</span>
                <span>{poi.rating.toFixed(1)}</span>
                <span>分</span>
              </div>
              <p className="popup-description">{poi.description}</p>
              <div className="popup-duration">
                <span>⏱️</span>
                <span>预计停留：{poi.duration}</span>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default MapView;
