import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useItinerary, Activity } from '../context/ItineraryContext';
import './MapView.css';

const getCostColor = (cost: number, maxCost: number): string => {
  if (maxCost === 0) return '#4caf50';
  const ratio = Math.min(cost / maxCost, 1);
  const r = Math.round(76 + (244 - 76) * ratio);
  const g = Math.round(175 + (67 - 175) * ratio);
  const b = Math.round(80 + (54 - 80) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
};

const createCustomIcon = (color: string, isFirst: boolean) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: ${color};
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        transform: translate(-50%, -50%);
        ${isFirst ? 'animation: pulse 2s ease-in-out infinite;' : ''}
      "></div>
    `,
    iconSize: [12, 12],
    iconAnchor: [0, 0],
    popupAnchor: [6, -6]
  });
};

interface MapControllerProps {
  bounds: L.LatLngBoundsExpression | null;
}

const MapController: React.FC<MapControllerProps> = ({ bounds }) => {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [bounds, map]);

  return null;
};

const MapView: React.FC = () => {
  const { itinerary, selectedDay } = useItinerary();
  const [animatedIndex, setAnimatedIndex] = useState(0);
  const animationRef = useRef<number | null>(null);

  const currentDay = itinerary?.itineraries.find(d => d.day === selectedDay);
  const activities = currentDay?.activities || [];

  const positions = activities.map(a => [a.lat, a.lng] as [number, number]);
  const maxCost = activities.length > 0 ? Math.max(...activities.map(a => a.cost)) : 1;

  const bounds = positions.length > 1
    ? [positions[0], positions[positions.length - 1]] as L.LatLngBoundsExpression
    : null;

  useEffect(() => {
    setAnimatedIndex(0);
    
    if (activities.length <= 1) return;

    let currentIndex = 0;
    const animate = () => {
      currentIndex++;
      if (currentIndex < activities.length) {
        setAnimatedIndex(currentIndex);
        animationRef.current = window.setTimeout(animate, 500);
      }
    };

    animationRef.current = window.setTimeout(animate, 300);

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [selectedDay, activities.length]);

  if (!itinerary || !currentDay) {
    return (
      <div className="map-container">
        <div className="map-placeholder">
          <p>加载地图中...</p>
        </div>
      </div>
    );
  }

  const center: [number, number] = activities.length > 0
    ? [activities[0].lat, activities[0].lng]
    : [39.9042, 116.4074];

  return (
    <div className="map-container">
      <div className="map-header">
        <h3 className="map-title">行程地图</h3>
        <span className="map-subtitle">第 {selectedDay} 天路线</span>
      </div>
      <div className="map-wrapper">
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: '100%', width: '100%', borderRadius: '12px' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapController bounds={bounds} />

          {positions.length > 1 && (
            <Polyline
              positions={positions.slice(0, animatedIndex + 1)}
              pathOptions={{
                color: '#FF5722',
                weight: 3,
                opacity: 0.8
              }}
            />
          )}

          {activities.map((activity: Activity, index: number) => (
            <Marker
              key={activity.id}
              position={[activity.lat, activity.lng]}
              icon={createCustomIcon(getCostColor(activity.cost, maxCost), index === 0)}
              eventHandlers={{
                popupopen: () => {}
              }}
            >
              <Popup>
                <div className="popup-content">
                  <h4 className="popup-title">{activity.name}</h4>
                  <p className="popup-location">📍 {activity.location}</p>
                  <p className="popup-time">🕐 {activity.time}</p>
                  <p className="popup-cost">💰 ¥{activity.cost.toFixed(2)}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      
      <div className="map-legend">
        <span className="legend-title">费用图例：</span>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#4caf50' }}></span>
            <span>低</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#ff9800' }}></span>
            <span>中</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#f44336' }}></span>
            <span>高</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapView;
