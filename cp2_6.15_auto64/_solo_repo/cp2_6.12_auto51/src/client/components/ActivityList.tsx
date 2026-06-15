import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Activity {
  id: string;
  date: string;
  hours: number;
  description: string;
}

interface ActivityListProps {
  activities: Activity[];
  pageSize?: number;
}

const ITEM_HEIGHT = 88;

const ActivityList: React.FC<ActivityListProps> = ({ activities, pageSize = 10 }) => {
  const [displayCount, setDisplayCount] = useState(pageSize);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const displayedActivities = activities.slice(0, displayCount);
  const hasMore = displayCount < activities.length;

  const loadMore = () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayCount((prev) => Math.min(prev + pageSize, activities.length));
      setIsLoadingMore(false);
    }, 300);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        loadMore();
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoadingMore]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        weekday: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  const getFullDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (activities.length === 0) {
    return (
      <div
        style={{
          padding: '60px 20px',
          textAlign: 'center',
          background: '#FFFFFF',
          borderRadius: 16,
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>📋</div>
        <p style={{ color: '#8B7355', fontSize: 16, margin: 0 }}>暂无活动记录</p>
        <p style={{ color: '#A0896B', fontSize: 13, marginTop: 8 }}>完成第一次打卡后，记录将显示在这里</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        background: '#FFFFFF',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(245, 166, 35, 0.08)',
      }}
    >
      <div style={{ maxHeight: 528, overflowY: 'auto' }}>
        {displayedActivities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.02, 0.3) }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '16px 20px',
              borderBottom: index < displayedActivities.length - 1 ? '1px solid #F7E9D7' : 'none',
              minHeight: ITEM_HEIGHT,
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                width: 56,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '8px 0',
                background: 'linear-gradient(135deg, #FFF5E6 0%, #FFE8CC 100%)',
                borderRadius: 12,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#F5A623',
                  marginBottom: 2,
                }}
              >
                {formatDate(activity.date).split(' ')[0]}
              </span>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: '#D2691E',
                  lineHeight: 1,
                }}
              >
                {formatDate(activity.date).split(' ')[1]?.replace('日', '') || activity.date.split('-')[2]}
              </span>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#3D2914',
                  marginBottom: 4,
                }}
              >
                {activity.description || '志愿服务'}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: '#8B7355',
                }}
              >
                {getFullDate(activity.date)}
              </div>
            </div>

            <div
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '8px 14px',
                background: 'linear-gradient(135deg, #FFF5E6 0%, #FFE8CC 100%)',
                borderRadius: 20,
              }}
            >
              <span style={{ fontSize: 14 }}>⏱</span>
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: '#F5A623',
                }}
              >
                {activity.hours}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#D2691E',
                }}
              >
                h
              </span>
            </div>
          </motion.div>
        ))}

        {(isLoadingMore || hasMore) && (
          <div
            style={{
              padding: '20px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {isLoadingMore ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{
                  width: 24,
                  height: 24,
                  border: '3px solid #F5A623',
                  borderTop: '3px solid transparent',
                  borderRadius: '50%',
                }}
              />
            ) : (
              <button
                onClick={loadMore}
                style={{
                  padding: '10px 24px',
                  background: 'transparent',
                  border: '2px solid #F7E9D7',
                  borderRadius: 20,
                  color: '#8B7355',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#F5A623';
                  e.currentTarget.style.color = '#F5A623';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#F7E9D7';
                  e.currentTarget.style.color = '#8B7355';
                }}
              >
                加载更多 ({activities.length - displayCount} 条)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityList;
