import React, { useState, useEffect } from 'react';
import type { Trip } from '../types';
import { tripApi } from '../services/api';
import { generateCollageLayout } from '../business/tripEngine';

interface TripListProps {
  userId: string;
  onSelectTrip: (tripId: string) => void;
  onCreateTrip: () => void;
}

const TripList: React.FC<TripListProps> = ({ userId, onSelectTrip, onCreateTrip }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const data = await tripApi.getTrips(userId);
        setTrips(data.trips);
      } catch (err) {
        console.error('Failed to fetch trips:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrips();
  }, [userId]);

  const getTripPhotos = (trip: Trip): string[] => {
    const checkInPhotos = trip.checkIns.flatMap((c) => c.photos);
    const attractionThumbnails = trip.days.flatMap((d) =>
      d.attractions.map((a) => a.thumbnail)
    );
    return [...checkInPhotos, ...attractionThumbnails].slice(0, 9);
  };

  if (loading) {
    return (
      <div className="trip-list loading">
        <div className="loading-spinner">⏳</div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="trip-list">
      <div className="list-header">
        <h2 className="page-title">我的旅行</h2>
        <button className="create-trip-btn" onClick={onCreateTrip}>
          + 新建行程
        </button>
      </div>

      {trips.length === 0 ? (
        <div className="empty-trips">
          <div className="empty-icon">✈️</div>
          <h3>还没有旅行记录</h3>
          <p>开始规划你的下一次旅行吧</p>
          <button className="create-trip-btn primary" onClick={onCreateTrip}>
            创建第一个行程
          </button>
        </div>
      ) : (
        <div className="trips-grid">
          {trips.map((trip) => {
            const photos = getTripPhotos(trip);
            const collage = generateCollageLayout(photos, 3, 100);

            return (
              <div
                key={trip.id}
                className="trip-card"
                onClick={() => onSelectTrip(trip.id)}
              >
                <div className="card-collage">
                  {collage.items.map((item) => (
                    <div
                      key={item.id}
                      className="collage-item"
                      style={{
                        width: item.size,
                        height: item.size,
                        top: item.row * (item.size + 2),
                        left: item.col * (item.size + 2),
                      }}
                    >
                      <img
                        src={item.photoUrl}
                        alt=""
                        className="collage-photo"
                      />
                    </div>
                  ))}
                </div>

                <div className="card-content">
                  <h3 className="card-title">{trip.title}</h3>
                  <p className="card-dates">
                    📅 {trip.startDate} ~ {trip.endDate}
                  </p>
                  <div className="card-stats">
                    <span className="stat">
                      📍 {trip.days.reduce((s, d) => s + d.attractions.length, 0)} 景点
                    </span>
                    <span className="stat">
                      📸 {trip.checkIns.length} 打卡
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TripList;
