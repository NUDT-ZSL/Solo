import React, { useEffect, useRef, useState } from 'react';
import { X, MapPin, Clock, Utensils } from 'lucide-react';
import L from 'leaflet';
import type { DayPlan, Attraction } from '../utils/types';

interface DetailModalProps {
  dayPlan: DayPlan;
  destination: string;
  onClose: () => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ dayPlan, destination, onClose }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [selectedAttraction, setSelectedAttraction] = useState<Attraction | null>(null);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [onClose]);

  useEffect(() => {
    if (!showMap || !mapRef.current) return;

    if (!mapInstanceRef.current) {
      const centerCoords: [number, number] = dayPlan.attractions.length > 0
        ? dayPlan.attractions[0].coordinates
        : [35.0116, 135.7681];

      mapInstanceRef.current = L.map(mapRef.current).setView(centerCoords, 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);

      dayPlan.attractions.forEach((attraction) => {
        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div class="marker-container">
                   <div class="marker-pin"></div>
                   <div class="marker-label">${attraction.name}</div>
                 </div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker(attraction.coordinates, { icon: customIcon })
          .addTo(mapInstanceRef.current!)
          .on('click', () => {
            setSelectedAttraction(attraction);
          });

        markersRef.current.push(marker);
      });

      if (dayPlan.attractions.length > 1) {
        const bounds = L.latLngBounds(dayPlan.attractions.map(a => a.coordinates));
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [showMap, dayPlan.attractions]);

  const handleTimelineClick = (attraction: Attraction) => {
    setSelectedAttraction(attraction);
    setShowMap(true);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(attraction.coordinates, 15);
      const markerIndex = dayPlan.attractions.findIndex(a => a.id === attraction.id);
      if (markerIndex >= 0 && markersRef.current[markerIndex]) {
        markersRef.current[markerIndex].openPopup();
      }
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="detail-modal">
        <button className="close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="modal-header">
          <h2 className="modal-title">第 {dayPlan.day} 天</h2>
          <p className="modal-destination">{destination}</p>
        </div>

        <div className="modal-content">
          <div className="timeline-section">
            <h3 className="section-title">
              <Clock size={20} />
              今日行程
            </h3>

            <div className="timeline">
              {dayPlan.attractions.map((attraction, index) => (
                <div
                  key={attraction.id}
                  className={`timeline-item ${selectedAttraction?.id === attraction.id ? 'active' : ''}`}
                  onClick={() => handleTimelineClick(attraction)}
                >
                  <div className="timeline-line">
                    <div className="timeline-dot"></div>
                    {index < dayPlan.attractions.length - 1 && (
                      <div className="timeline-connector"></div>
                    )}
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-time">{attraction.time}</div>
                    <div className="timeline-name">{attraction.name}</div>
                    <p className="timeline-desc">{attraction.description}</p>
                    <div className="timeline-duration">
                      <Clock size={14} />
                      {attraction.duration}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {dayPlan.restaurants.length > 0 && (
              <>
                <h3 className="section-title">
                  <Utensils size={20} />
                  推荐餐厅
                </h3>
                <div className="restaurant-list">
                  {dayPlan.restaurants.map(restaurant => (
                    <div key={restaurant.id} className="restaurant-item">
                      <Utensils size={16} />
                      <div className="restaurant-info">
                        <span className="restaurant-name">{restaurant.name}</span>
                        <span className="restaurant-meta">{restaurant.cuisine} · {restaurant.price}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="map-section">
            <div className="map-header">
              <MapPin size={20} />
              <h3 className="section-title">地图标注</h3>
              {!showMap && (
                <button className="show-map-btn" onClick={() => setShowMap(true)}>
                  显示地图
                </button>
              )}
            </div>
            <div ref={mapRef} className={`map-container ${showMap ? 'visible' : ''}`}>
              {!showMap && (
                <div className="map-placeholder" onClick={() => setShowMap(true)}>
                  <MapPin size={48} />
                  <p>点击查看景点位置</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailModal;
