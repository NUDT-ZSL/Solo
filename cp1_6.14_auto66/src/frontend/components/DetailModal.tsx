import React, { useEffect, useRef, useState } from 'react';
import { X, MapPin, Clock, Utensils } from 'lucide-react';
import L from 'leaflet';
import type { DayPlan, Spot } from '../utils/types';

interface DetailModalProps {
  dayPlan: DayPlan;
  destination: string;
  onClose: () => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ dayPlan, destination, onClose }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const popupsRef = useRef<L.Popup[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [mapInitialized, setMapInitialized] = useState(false);

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
    };
  }, [onClose]);

  useEffect(() => {
    if (!mapRef.current || mapInitialized) return;
    if (dayPlan.spots.length === 0) return;

    const centerCoords: [number, number] = dayPlan.spots.length > 0
      ? dayPlan.spots[0].coordinates
      : [35.0116, 135.7681];

    mapInstanceRef.current = L.map(mapRef.current).setView(centerCoords, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapInstanceRef.current);

    dayPlan.spots.forEach((spot, idx) => {
      const customIcon = L.divIcon({
        className: 'leaflet-custom-marker',
        html: `
          <div style="
            width: 24px;
            height: 24px;
            background: #e85d3a;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(232, 93, 58, 0.4);
            border: 2px solid white;
          ">
            <span style="
              transform: rotate(45deg);
              color: white;
              font-size: 10px;
              font-weight: bold;
              line-height: 1;
            ">${idx + 1}</span>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30],
      });

      const marker = L.marker(spot.coordinates, { icon: customIcon })
        .addTo(mapInstanceRef.current!);

      const popup = L.popup({
        closeButton: true,
        autoClose: false,
        closeOnClick: false,
        className: 'custom-popup',
        maxWidth: 240,
      }).setContent(`
        <div style="
          padding: 4px 8px;
          font-family: 'Noto Sans SC', sans-serif;
        ">
          <div style="
            font-weight: 700;
            color: #2d3436;
            font-size: 14px;
            margin-bottom: 4px;
            white-space: nowrap;
          ">${spot.name}</div>
          <div style="
            font-size: 11px;
            color: #666;
            margin-bottom: 4px;
          ">🕒 ${spot.time} · ${spot.duration}</div>
          <div style="
            font-size: 11px;
            color: #888;
            line-height: 1.4;
          ">${spot.description}</div>
        </div>
      `);

      marker.bindPopup(popup);

      marker.on('click', () => {
        setSelectedSpot(spot);
      });

      markersRef.current.push(marker);
      popupsRef.current.push(popup);
    });

    if (dayPlan.spots.length > 1) {
      const bounds = L.latLngBounds(dayPlan.spots.map(s => s.coordinates));
      mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60] });
    }

    setMapInitialized(true);

    return () => {
      popupsRef.current.forEach(p => p.remove());
      popupsRef.current = [];
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      setMapInitialized(false);
    };
  }, [dayPlan.spots, mapInitialized]);

  const handleTimelineClick = (spot: Spot) => {
    setSelectedSpot(spot);

    if (mapInstanceRef.current) {
      const spotIndex = dayPlan.spots.findIndex(s => s.id === spot.id);
      if (spotIndex >= 0 && markersRef.current[spotIndex]) {
        mapInstanceRef.current.setView(spot.coordinates, 15, { animate: true, duration: 0.5 });
        setTimeout(() => {
          markersRef.current[spotIndex].openPopup();
        }, 300);
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
          <h2 className="modal-title">第 {dayPlan.date} 天</h2>
          <p className="modal-destination">{destination}</p>
        </div>

        <div className="modal-content">
          <div className="timeline-section">
            <h3 className="section-title">
              <Clock size={20} />
              今日行程
            </h3>

            <div className="timeline">
              {dayPlan.spots.map((spot, index) => (
                <div
                  key={spot.id}
                  className={`timeline-item ${selectedSpot?.id === spot.id ? 'active' : ''}`}
                  onClick={() => handleTimelineClick(spot)}
                >
                  <div className="timeline-line">
                    <div className="timeline-dot-wrapper">
                      <div className="timeline-dot"></div>
                      <span className="timeline-index">{index + 1}</span>
                    </div>
                    {index < dayPlan.spots.length - 1 && (
                      <div className="timeline-connector"></div>
                    )}
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-time">{spot.time}</div>
                    <div className="timeline-name">{spot.name}</div>
                    <p className="timeline-desc">{spot.description}</p>
                    <div className="timeline-duration">
                      <Clock size={14} />
                      {spot.duration}
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
              {selectedSpot && (
                <span className="selected-spot-tag">
                  已选择: {selectedSpot.name}
                </span>
              )}
            </div>
            <div className="map-container-wrapper">
              <div ref={mapRef} className="map-container"></div>
              {!mapInitialized && dayPlan.spots.length > 0 && (
                <div className="map-loading-overlay">
                  <MapPin size={32} className="map-loading-icon" />
                  <p>正在加载地图...</p>
                </div>
              )}
              {mapInitialized && (
                <div className="map-legend">
                  <div className="legend-item">
                    <span className="legend-dot"></span>
                    <span>点击时间线或图标查看景点详情</span>
                  </div>
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
