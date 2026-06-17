import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users } from 'lucide-react';
import type { Activity } from '../../shared/types';

interface Props {
  activity: Activity;
  registrationCount?: number;
}

const ActivityCard = ({ activity, registrationCount = 0 }: Props) => {
  const date = new Date(activity.date);
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  return (
    <Link
      to={`/activity/${activity.id}`}
      style={{
        display: 'block',
        backgroundColor: '#fff',
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        padding: 20,
        transition: 'all 0.2s ease',
        textDecoration: 'none',
        color: 'inherit',
        height: '100%',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
        el.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        el.style.transform = 'translateY(0)';
      }}
    >
      <h3 style={{
        fontSize: 17,
        fontWeight: 600,
        color: '#212121',
        marginBottom: 12,
        lineHeight: 1.4,
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
      }}>
        {activity.name}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, color: '#757575', fontSize: 13 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Calendar size={14} color="#1976D2" />
          <span>{dateStr} {timeStr}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          <MapPin size={14} color="#66BB6A" style={{ marginTop: 2, flexShrink: 0 }} />
          <span style={{
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
          }}>{activity.location}</span>
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 16,
        paddingTop: 14,
        borderTop: '1px solid #F5F5F5',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Users size={14} color="#1976D2" />
          <span style={{ fontSize: 12, color: '#616161' }}>
            已报名 <strong style={{ color: '#1976D2' }}>{registrationCount}</strong> 人
          </span>
        </div>
        <span style={{
          fontSize: 12,
          color: '#1976D2',
          fontWeight: 500,
        }}>查看详情 →</span>
      </div>
    </Link>
  );
};

export default ActivityCard;
