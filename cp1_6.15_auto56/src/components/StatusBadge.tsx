import React, { useEffect, useState } from 'react';
import { ActivityStatus } from '../types';

interface StatusBadgeProps {
  status: ActivityStatus;
}

const statusConfig: Record<ActivityStatus, { label: string; color: string; bgColor: string }> = {
  upcoming: { label: '即将开始', color: 'white', bgColor: 'var(--status-upcoming)' },
  ongoing: { label: '进行中', color: 'white', bgColor: 'var(--status-ongoing)' },
  ended: { label: '已结束', color: 'white', bgColor: 'var(--status-ended)' },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const [animate, setAnimate] = useState(false);
  const config = statusConfig[status];

  useEffect(() => {
    setAnimate(true);
    const timer = setTimeout(() => setAnimate(false), 300);
    return () => clearTimeout(timer);
  }, [status]);

  return (
    <span
      style={{
        ...styles.badge,
        backgroundColor: config.bgColor,
        color: config.color,
        animation: animate ? 'flipIn 0.3s ease' : 'none',
      }}
    >
      {config.label}
    </span>
  );
};

const styles: Record<string, React.CSSProperties> = {
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'none',
    transformOrigin: 'top center',
  },
};

export default StatusBadge;
