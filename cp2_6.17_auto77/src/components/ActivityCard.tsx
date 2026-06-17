import React, { useMemo } from 'react';
import { Activity, Registration } from '../types';

interface Props {
  activity: Activity;
  registrations?: Registration[];
  onClick: () => void;
}

function getStatusInfo(capacity: number, registered: number) {
  const ratio = registered / capacity;
  if (registered >= capacity) {
    return { text: '已满', color: '#f44336' };
  } else if (ratio >= 0.85) {
    return { text: '即将满员', color: '#ff9800' };
  }
  return { text: '可报名', color: '#4caf50' };
}

function formatDateTime(dateTimeStr: string) {
  try {
    const dt = new Date(dateTimeStr);
    const date = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    const time = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
    return { date, time };
  } catch {
    return { date: dateTimeStr, time: '' };
  }
}

const defaultCover = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="140" viewBox="0 0 300 140"><rect fill="#c8e6c9" width="300" height="140"/><text x="150" y="75" font-family="sans-serif" font-size="36" fill="#66bb6a" text-anchor="middle" dominant-baseline="central">🎪</text></svg>'
);

const ActivityCard: React.FC<Props> = ({ activity, registrations = [], onClick }) => {
  const registeredCount = registrations.length;
  const status = useMemo(
    () => getStatusInfo(activity.capacity, registeredCount),
    [activity.capacity, registeredCount]
  );
  const { date, time } = useMemo(
    () => formatDateTime(activity.dateTime),
    [activity.dateTime]
  );

  const cardStyle: React.CSSProperties = {
    width: '300px',
    height: '260px',
    borderRadius: '20px',
    background: 'linear-gradient(180deg, #e8f5e9 0%, #fff8e1 100%)',
    cursor: 'pointer',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transform: 'translateY(0)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    transition: 'all 0.2s ease',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };

  const coverStyle: React.CSSProperties = {
    width: '100%',
    height: '140px',
    objectFit: 'cover',
    display: 'block',
  };

  const middleStyle: React.CSSProperties = {
    padding: '12px 16px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  };

  const nameRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '8px',
  };

  const nameStyle: React.CSSProperties = {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#333',
    lineHeight: 1.3,
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  };

  const ageTagsStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  };

  const ageTagStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '8px',
    background: '#81c784',
    color: '#fff',
    fontSize: '0.75rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  };

  const bottomStyle: React.CSSProperties = {
    padding: '0 16px 14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  };

  const dateTimeStyle: React.CSSProperties = {
    fontSize: '0.85rem',
    color: '#666',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  };

  const statusStyle: React.CSSProperties = {
    padding: '4px 12px',
    borderRadius: '12px',
    background: status.color,
    color: '#fff',
    fontSize: '0.8rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  };

  return (
    <div
      style={cardStyle}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
      }}
    >
      <img
        src={activity.coverImage || defaultCover}
        alt={activity.name}
        style={coverStyle}
        loading="lazy"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = defaultCover;
        }}
      />
      <div style={middleStyle}>
        <div style={nameRowStyle}>
          <h3 style={nameStyle}>{activity.name}</h3>
        </div>
        <div style={ageTagsStyle}>
          {activity.ageGroups.slice(0, 2).map((age) => (
            <span key={age} style={ageTagStyle}>
              {age}岁
            </span>
          ))}
          {activity.ageGroups.length > 2 && (
            <span style={{ ...ageTagStyle, background: '#a5d6a7' }}>
              +{activity.ageGroups.length - 2}
            </span>
          )}
        </div>
      </div>
      <div style={bottomStyle}>
        <div style={dateTimeStyle}>
          <span>📅 {date}</span>
          {time && <span>⏰ {time}</span>}
        </div>
        <span style={statusStyle}>{status.text}</span>
      </div>    </div>
  );
};

export default ActivityCard;
