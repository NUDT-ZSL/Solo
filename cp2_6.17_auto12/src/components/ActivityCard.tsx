import dayjs from 'dayjs';
import type { Activity } from '../types';
import { useUser } from '../context/UserContext';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface ActivityCardProps {
  activity: Activity;
  onRegister?: (activityId: string) => void;
  size?: 'normal' | 'small';
  delay?: number;
}

export function ActivityCard({
  activity,
  onRegister,
  size = 'normal',
  delay = 0
}: ActivityCardProps) {
  const { user } = useUser();
  const navigate = useNavigate();
  const [toast, setToast] = useState<string | null>(null);
  const [posterLoaded, setPosterLoaded] = useState(false);

  const isSmall = size === 'small';
  const width = isSmall ? 220 : 320;
  const height = isSmall ? 320 : 400;

  const registeredCount = activity.registeredUsers.length;
  const isFull = registeredCount >= activity.totalSlots;
  const isRegistered = user
    ? activity.registeredUsers.includes(user.id)
    : false;
  const progress = Math.min((registeredCount / activity.totalSlots) * 100, 100);

  const handleRegister = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      setToast('请先登录');
      setTimeout(() => setToast(null), 2000);
      navigate('/login');
      return;
    }
    if (onRegister) {
      onRegister(activity.id);
    }
  };

  const getButtonStyle = () => {
    if (isRegistered) {
      return {
        background: '#22c55e',
        cursor: 'not-allowed',
        color: 'white'
      };
    }
    if (isFull) {
      return {
        background: '#94a3b8',
        cursor: 'not-allowed',
        color: 'white'
      };
    }
    return {
      background: '#6366f1',
      cursor: 'pointer',
      color: 'white',
      transition: 'background 0.2s ease'
    };
  };

  const styles = `
    .activity-card {
      width: ${width}px;
      height: ${height}px;
      border-radius: 12px;
      background: #ffffff;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      position: relative;
      flex-shrink: 0;
    }
    .activity-card-poster-wrap {
      height: 60%;
      background: #e2e8f0;
      overflow: hidden;
      position: relative;
    }
    .activity-card-poster {
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: ${posterLoaded ? 1 : 0};
      transition: opacity 0.3s ease;
    }
    .activity-card-body {
      padding: ${isSmall ? '12px' : '16px'};
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .activity-card-name {
      font-size: ${isSmall ? '15px' : '17px'};
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 6px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .activity-card-info {
      font-size: ${isSmall ? '12px' : '13px'};
      color: #6b7280;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .activity-card-progress-wrap {
      margin-top: auto;
      margin-bottom: ${isSmall ? '8px' : '12px'};
    }
    .activity-card-progress-bar {
      height: 6px;
      background: #e5e7eb;
      border-radius: 3px;
      overflow: hidden;
    }
    .activity-card-progress-fill {
      height: 100%;
      background: #6366f1;
      border-radius: 3px;
      transition: width 0.3s ease;
    }
    .activity-card-progress-text {
      font-size: ${isSmall ? '11px' : '12px'};
      color: #6b7280;
      margin-top: 4px;
      text-align: right;
    }
    .activity-card-btn {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: ${isSmall ? '13px' : '14px'};
      font-weight: 500;
      text-align: center;
      transition: background 0.2s ease;
    }
    .activity-card-btn:hover:not([disabled]) {
      background: #4f46e5 !important;
    }
    .activity-card-toast {
      position: absolute;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.75);
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      z-index: 10;
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <div
        className="activity-card slide-up-animate"
        style={{ animationDelay: `${delay}ms` }}
      >
        {toast && <div className="activity-card-toast">{toast}</div>}
        <div className="activity-card-poster-wrap">
          <img
            src={activity.poster}
            alt={activity.name}
            className="activity-card-poster"
            onLoad={() => setPosterLoaded(true)}
          />
        </div>
        <div className="activity-card-body">
          <div className="activity-card-name">{activity.name}</div>
          <div className="activity-card-info">
            📅 {dayjs(activity.date).format('YYYY-MM-DD HH:mm')}
          </div>
          <div className="activity-card-info">📍 {activity.location}</div>
          <div className="activity-card-progress-wrap">
            <div className="activity-card-progress-bar">
              <div
                className="activity-card-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="activity-card-progress-text">
              {registeredCount}/{activity.totalSlots} 人已报名
            </div>
          </div>
          <button
            className="activity-card-btn"
            onClick={handleRegister}
            disabled={isFull || isRegistered}
            style={getButtonStyle()}
          >
            {isRegistered ? '已报名' : isFull ? '已报满' : '立即报名'}
          </button>
        </div>
      </div>
    </>
  );
}
