import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import useApi, { TourStop } from '../hooks/useApi';
import './MapModule.css';

const createCustomIcon = (status: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div class="marker-dot ${status === '已演出' ? 'done' : 'planned'}"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

const MapController: React.FC<{ stops: TourStop[] }> = ({ stops }) => {
  const map = useMap();
  
  useEffect(() => {
    if (stops.length > 0) {
      const bounds = L.latLngBounds(stops.map(s => [s.lat, s.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [stops, map]);
  
  return null;
};

const MapModule: React.FC = () => {
  const { getStops } = useApi();
  const [stops, setStops] = useState<TourStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStop, setSelectedStop] = useState<TourStop | null>(null);

  useEffect(() => {
    const loadStops = async () => {
      try {
        const data = await getStops();
        setStops(data);
      } catch (err) {
        console.error('加载站点失败', err);
      } finally {
        setLoading(false);
      }
    };
    loadStops();
  }, []);

  const routePositions = stops
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(stop => [stop.lat, stop.lng] as [number, number]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="map-module">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="map-module">
      <div className="module-header">
        <h2>巡演地图</h2>
        <div className="legend">
          <span className="legend-item">
            <span className="legend-dot done"></span> 已演出
          </span>
          <span className="legend-item">
            <span className="legend-dot planned"></span> 计划中
          </span>
        </div>
      </div>

      <div className="map-container">
        <MapContainer
          center={[35.8617, 104.1954]}
          zoom={4}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController stops={stops} />
          
          {routePositions.length > 1 && (
            <Polyline
              positions={routePositions}
              pathOptions={{
                color: '#e94560',
                weight: 2,
                opacity: 0.6,
                dashArray: '10, 10'
              }}
            />
          )}

          {stops.map(stop => (
            <Marker
              key={stop.id}
              position={[stop.lat, stop.lng]}
              icon={createCustomIcon(stop.status)}
              eventHandlers={{
                click: () => setSelectedStop(stop)
              }}
            >
              <Popup>
                <div className="popup-content">
                  <h4>{stop.city}</h4>
                  <p><strong>剧目：</strong>{stop.playName}</p>
                  <p><strong>时间：</strong>{formatDate(stop.date)}</p>
                  <p><strong>场馆：</strong>{stop.venue}</p>
                  <p><strong>状态：</strong>
                    <span className={`status-tag ${stop.status === '已演出' ? 'done' : 'planned'}`}>
                      {stop.status}
                    </span>
                  </p>
                  {stop.status === '已演出' && (
                    <p><strong>票房：</strong>¥{stop.boxOffice.toLocaleString()}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {selectedStop && (
        <div className="stop-detail-modal" onClick={() => setSelectedStop(null)}>
          <div className="stop-detail-card" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedStop(null)}>×</button>
            <h3>{selectedStop.city}站</h3>
            <div className="detail-row">
              <span className="label">演出剧目</span>
              <span className="value">{selectedStop.playName}</span>
            </div>
            <div className="detail-row">
              <span className="label">演出时间</span>
              <span className="value">{formatDate(selectedStop.date)}</span>
            </div>
            <div className="detail-row">
              <span className="label">演出场馆</span>
              <span className="value">{selectedStop.venue}</span>
            </div>
            <div className="detail-row">
              <span className="label">演出状态</span>
              <span className={`status-tag ${selectedStop.status === '已演出' ? 'done' : 'planned'}`}>
                {selectedStop.status}
              </span>
            </div>
            {selectedStop.status === '已演出' && (
              <div className="detail-row highlight">
                <span className="label">票房收入</span>
                <span className="value">¥{selectedStop.boxOffice.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapModule;
