import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity } from '../types';
import { fetchActivities } from '../api';
import StatusBadge from './StatusBadge';
import CreateActivityModal from './CreateActivityModal';
import RippleButton from './RippleButton';
import './components.css';

const ActivityList: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    const loadActivities = async () => {
      setLoading(true);
      const res = await fetchActivities();
      if (res.success && res.data) {
        setActivities(res.data);
      }
      setLoading(false);
    };
    loadActivities();
  }, []);

  useEffect(() => {
    setVisibleItems(new Set());
    const timers: NodeJS.Timeout[] = [];
    activities.forEach((activity, index) => {
      const timer = setTimeout(() => {
        setVisibleItems(prev => new Set([...prev, activity.id]));
      }, index * 50);
      timers.push(timer);
    });
    return () => timers.forEach(t => clearTimeout(t));
  }, [selectedMonth, selectedYear, activities]);

  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      const activityDate = new Date(activity.date);
      return (
        activityDate.getMonth() === selectedMonth &&
        activityDate.getFullYear() === selectedYear
      );
    });
  }, [activities, selectedMonth, selectedYear]);

  const months = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月',
  ];

  const handleActivityClick = (id: string) => {
    navigate(`/activity/${id}`);
  };

  const handleActivityCreated = (activity: Activity) => {
    setActivities(prev => [activity, ...prev]);
    setShowCreateModal(false);
    setSelectedMonth(new Date(activity.date).getMonth());
    setSelectedYear(new Date(activity.date).getFullYear());
  };

  if (loading) {
    return <div style={styles.loading}>加载中...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>活动列表</h2>
        <div style={styles.controls}>
          <div style={styles.monthSelector}>
            <button
              onClick={() => setSelectedMonth(prev => (prev - 1 + 12) % 12)}
              style={styles.monthArrow}
            >
              ‹
            </button>
            <span style={styles.monthLabel}>
              {selectedYear}年 {months[selectedMonth]}
            </span>
            <button
              onClick={() => setSelectedMonth(prev => (prev + 1) % 12)}
              style={styles.monthArrow}
            >
              ›
            </button>
          </div>
          <RippleButton onClick={() => setShowCreateModal(true)}>
            + 创建活动
          </RippleButton>
        </div>
      </div>

      {filteredActivities.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>该月份暂无活动</p>
          <RippleButton onClick={() => setShowCreateModal(true)} variant="outline">
            创建第一个活动
          </RippleButton>
        </div>
      ) : (
        <div style={styles.grid} className="activity-grid">
          {filteredActivities.map((activity, index) => (
            <div
              key={activity.id}
              onClick={() => handleActivityClick(activity.id)}
              className="activity-card"
              style={{
                ...styles.card,
                backgroundColor: index % 2 === 0 ? 'var(--card-bg-light)' : 'var(--card-bg-white)',
                opacity: visibleItems.has(activity.id) ? 1 : 0,
                transform: visibleItems.has(activity.id) ? 'translateY(0)' : 'translateY(10px)',
                animation: visibleItems.has(activity.id)
                  ? 'fadeInStagger 0.3s ease forwards'
                  : 'none',
                animationDelay: `${index * 0.05}s`,
              }}
            >
              <div style={styles.statusBadgeContainer}>
                <StatusBadge status={activity.status} />
              </div>
              <h3 style={styles.cardTitle}>{activity.name}</h3>
              <div style={styles.cardInfo}>
                <div style={styles.infoItem}>
                  <span style={styles.infoIcon}>📅</span>
                  <span style={styles.infoText}>
                    {new Date(activity.date).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoIcon}>📍</span>
                  <span style={styles.infoText}>{activity.location}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoIcon}>🌱</span>
                  <span style={styles.infoText}>
                    {activity.plants.length} 株植物
                  </span>
                </div>
              </div>
              <p style={styles.cardDescription}>{activity.description}</p>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateActivityModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleActivityCreated}
        />
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  monthSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: 'white',
    padding: '8px 16px',
    borderRadius: '8px',
    boxShadow: 'var(--shadow-sm)',
  },
  monthArrow: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    color: 'var(--primary-color)',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'all 0.2s ease',
  },
  monthLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    minWidth: '100px',
    textAlign: 'center',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
  },
  card: {
    position: 'relative',
    padding: '24px',
    borderRadius: 'var(--border-radius)',
    boxShadow: 'var(--shadow-sm)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minHeight: '200px',
    overflow: 'hidden',
  },
  statusBadgeContainer: {
    position: 'absolute',
    top: '16px',
    left: '16px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    margin: '0 0 8px 0',
    paddingRight: '100px',
  },
  cardInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  infoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  infoIcon: {
    fontSize: '14px',
  },
  infoText: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  cardDescription: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    lineHeight: 1.5,
    margin: 0,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  loading: {
    textAlign: 'center',
    padding: '60px',
    fontSize: '16px',
    color: 'var(--text-muted)',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  emptyText: {
    fontSize: '16px',
    color: 'var(--text-muted)',
    margin: 0,
  },
};

export default ActivityList;
