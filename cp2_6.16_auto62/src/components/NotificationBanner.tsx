import React from 'react';
import { Bell } from 'lucide-react';
import type { NeedCareItem } from '../types';

interface NotificationBannerProps {
  needCareItems: NeedCareItem[];
  onBannerClick: (firstPlantId: string) => void;
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({ needCareItems, onBannerClick }) => {
  if (needCareItems.length === 0) return null;

  const uniquePlantIds = [...new Set(needCareItems.map((item) => item.plantId))];

  const bannerStyle: React.CSSProperties = {
    height: '48px',
    backgroundColor: '#fef9c3',
    color: '#854d0e',
    borderRadius: '8px',
    margin: '12px',
    padding: '0 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: '14px',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    maxWidth: '1400px',
    marginLeft: 'auto',
    marginRight: 'auto',
    width: 'calc(100% - 24px)',
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.boxShadow = '0 4px 12px rgba(133, 77, 14, 0.2)';
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = 'none';
  };

  const handleClick = () => {
    if (uniquePlantIds.length > 0) {
      onBannerClick(uniquePlantIds[0]);
    }
  };

  return (
    <div
      style={bannerStyle}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Bell size={20} />
      <span>
        有 {uniquePlantIds.length} 盆植物需要养护（{needCareItems.length} 项任务）
      </span>
      <span style={{ marginLeft: 'auto', fontSize: '12px', opacity: 0.8 }}>
        点击查看 →
      </span>
    </div>
  );
};

export default NotificationBanner;
