import React, { useState, useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from 'react-leaflet';
import L from 'leaflet';
import type { Trip, DayPlan, CheckInRecord } from '../types';
import { tripApi, checkInApi } from '../services/api';
import { calculateDayDistance } from '../business/tripEngine';
import RoutePlanner from './RoutePlanner';
import CheckInTimeline from './CheckInTimeline';
import PhotoAlbum from './PhotoAlbum';

import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface TripDetailProps {
  tripId: string;
  onBack: () => void;
}

type TabType = 'map' | 'timeline' | 'album';

const TripDetail: React.FC<TripDetailProps> = ({ tripId, onBack }) => {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [selectedDay, setSelectedDay] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editDays, setEditDays] = useState<DayPlan[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const data = await tripApi.getTrip(tripId);
        setTrip(data.trip);
        setEditDays(data.trip.days);
      } catch (err) {
        console.error('Failed to fetch trip:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrip();
  }, [tripId]);

  const handleAddCheckIn = async (checkIn: Omit<CheckInRecord, 'id'>) => {
    try {
      await checkInApi.create(tripId, checkIn);
      const data = await tripApi.getTrip(tripId);
      setTrip(data.trip);
    } catch (err) {
      console.error('Failed to add check-in:', err);
    }
  };

  const handleSaveDays = async () => {
    try {
      const updatedTrip = await tripApi.updateTrip(tripId, { days: editDays });
      setTrip(updatedTrip.trip);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update trip:', err);
    }
  };

  const handleDaysChange = (days: DayPlan[]) => {
    setEditDays(days);
  };

  if (loading) {
    return (
      <div className="trip-detail loading">
        <div className="loading-spinner">⏳</div>
        <p>加载行程详情...</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="trip-detail error">
        <p>行程不存在</p>
        <button onClick={onBack}>返回</button>
      </div>
    );
  }

  const currentDays = isEditing ? editDays : trip.days;
  const currentDay = currentDays[selectedDay] || currentDays[0];
  const attractions = currentDay?.attractions || [];

  const mapCenter: [number, number] =
    attractions.length > 0
      ? [attractions[0].coordinates.lat, attractions[0].coordinates.lng]
      : [39.9042, 116.4074];

  const polylinePositions = attractions.map((a) => [
    a.coordinates.lat,
    a.coordinates.lng,
  ]) as [number, number][];

  return (
    <div className="trip-detail">
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}>
          ← 返回
        </button>
        <h1 className="detail-title">{trip.title}</h1>
        <div className="detail-actions">
          {isEditing ? (
            <>
              <button className="btn-secondary" onClick={() => setIsEditing(false)}>
                取消
              </button>
              <button className="btn-primary" onClick={handleSaveDays}>
                保存
              </button>
            </>
          ) : (
            <button className="btn-outline" onClick={() => setIsEditing(true)}>
              ✏️ 编辑行程
            </button>
          )}
        </div>
      </div>

      <div className="detail-tabs">
        <button
          className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          🗺️ 路线
        </button>
        <button
          className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          📸 打卡
        </button>
        <button
          className={`tab-btn ${activeTab === 'album' ? 'active' : ''}`}
          onClick={() => setActiveTab('album')}
        >
          🖼️ 相册
        </button>
      </div>

      {activeTab === 'map' && (
        <div className="map-view">
          {isEditing ? (
            <RoutePlanner
              days={editDays}
              onDaysChange={handleDaysChange}
              selectedDay={selectedDay}
              onDaySelect={setSelectedDay}
            />
          ) : (
            <div className="trip-map-section">
              <div className="map-area" ref={mapRef}>
                <MapContainer
                  center={mapCenter}
                  zoom={11}
                  style={{ height: '100%', width: '100%', borderRadius: '10px' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {attractions.map((attraction, idx) => (
                    <Marker
                      key={attraction.id}
                      position={[
                        attraction.coordinates.lat,
                        attraction.coordinates.lng,
                      ]}
                    >
                      <Popup>
                        <div className="marker-popup">
                          <strong>{attraction.name}</strong>
                          <p>{attraction.city}</p>
                          <span className="marker-order">{idx + 1}</span>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                  {polylinePositions.length > 1 && (
                    <Polyline
                      positions={polylinePositions}
                      color="#388E3C"
                      weight={3}
                      opacity={0.7}
                      dashArray="10, 10"
                    />
                  )}
                </MapContainer>
              </div>

              <div className="day-plan-list">
                <h3>📅 行程安排</h3>
                {currentDays.map((day, idx) => (
                  <div
                    key={idx}
                    className={`day-plan-card ${
                      selectedDay === idx ? 'active' : ''
                    }`}
                    onClick={() => setSelectedDay(idx)}
                  >
                    <div className="day-plan-header">
                      <span className="day-label">Day {day.day}</span>
                      <span className="day-distance">
                        {day.totalDistance.toFixed(1)} km
                      </span>
                    </div>
                    <div className="day-attractions">
                      {day.attractions.length === 0 ? (
                        <span className="no-attractions">暂无景点</span>
                      ) : (
                        day.attractions.map((attr, i) => (
                          <span key={i} className="mini-attraction">
                            {i + 1}. {attr.name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="timeline-view">
          <CheckInTimeline
            checkIns={trip.checkIns}
            onAddCheckIn={handleAddCheckIn}
            tripId={tripId}
          />
        </div>
      )}

      {activeTab === 'album' && (
        <div className="album-view">
          <PhotoAlbum checkIns={trip.checkIns} tripTitle={trip.title} />
        </div>
      )}
    </div>
  );
};

export default TripDetail;
