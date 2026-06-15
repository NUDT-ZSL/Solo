import React, { useState } from 'react';
import { useItinerary, Activity } from '../context/ItineraryContext';
import './ItineraryDetail.css';

const ItineraryDetail: React.FC = () => {
  const { itinerary, selectedDay, deleteActivity } = useItinerary();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const currentDay = itinerary?.itineraries.find(d => d.day === selectedDay);

  if (!itinerary || !currentDay) {
    return (
      <div className="itinerary-detail">
        <div className="detail-placeholder">
          <p>请先生成行程</p>
        </div>
      </div>
    );
  }

  const handleDelete = (activityId: string) => {
    setDeletingId(activityId);
    setTimeout(() => {
      const dayIndex = itinerary.itineraries.findIndex(d => d.day === selectedDay);
      deleteActivity(dayIndex, activityId);
      setDeletingId(null);
    }, 300);
  };

  return (
    <div className="itinerary-detail">
      <div className="detail-header">
        <div className="day-title-section">
          <h2 className="day-title">{currentDay.date}</h2>
          <p className="day-subtitle">当日行程安排</p>
        </div>
        <div className="day-stats">
          <div className="stat-item">
            <span className="stat-label">活动数量</span>
            <span className="stat-value">{currentDay.activities.length} 项</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">住宿</span>
            <span className="stat-value">¥{currentDay.accommodationCost.toFixed(0)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">交通</span>
            <span className="stat-value">¥{currentDay.transportCost.toFixed(0)}</span>
          </div>
          <div className="stat-item total">
            <span className="stat-label">当日总计</span>
            <span className="stat-value">¥{currentDay.actualCost.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="activities-list">
        {currentDay.activities.map((activity: Activity, index: number) => (
          <div
            key={activity.id}
            className={`activity-item ${deletingId === activity.id ? 'deleting' : ''}`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="activity-time-badge">
              <span className="time-text">{activity.time}</span>
            </div>
            
            <div className="activity-info">
              <h3 className="activity-name">{activity.name}</h3>
              <p className="activity-location">📍 {activity.location}</p>
            </div>

            <div className="activity-cost">
              <span className="cost-amount">¥{activity.cost.toFixed(2)}</span>
            </div>

            <button
              className="delete-btn"
              onClick={() => handleDelete(activity.id)}
              title="删除活动"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {currentDay.activities.length === 0 && (
        <div className="empty-state">
          <p>当天暂无活动安排</p>
        </div>
      )}
    </div>
  );
};

export default ItineraryDetail;
