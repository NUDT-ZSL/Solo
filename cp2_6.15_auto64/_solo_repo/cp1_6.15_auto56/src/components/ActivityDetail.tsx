import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Activity, Plant } from '../types';
import { fetchActivity } from '../api';
import { useApp } from '../context/AppContext';
import StatusBadge from './StatusBadge';
import AuctionBoard from './AuctionBoard';
import CreatePlantModal from './CreatePlantModal';
import RippleButton from './RippleButton';

const ActivityDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreatePlantModal, setShowCreatePlantModal] = useState(false);
  const { showToast } = useApp();

  useEffect(() => {
    if (!id) return;
    const loadActivity = async () => {
      setLoading(true);
      const res = await fetchActivity(id);
      if (res.success && res.data) {
        setActivity(res.data);
      } else {
        showToast(res.message || '加载失败', 'error');
      }
      setLoading(false);
    };
    loadActivity();
  }, [id, showToast]);

  const handlePlantCreated = (plant: Plant) => {
    if (!activity) return;
    setActivity(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        plants: [...prev.plants, plant],
      };
    });
  };

  const handlePlantUpdated = (updatedPlant: Plant) => {
    if (!activity) return;
    setActivity(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        plants: prev.plants.map(p =>
          p.id === updatedPlant.id ? updatedPlant : p
        ),
      };
    });
  };

  if (loading) {
    return <div style={styles.loading}>加载中...</div>;
  }

  if (!activity) {
    return (
      <div style={styles.notFound}>
        <p>活动不存在</p>
        <button onClick={() => navigate('/')} style={styles.backButton}>
          返回首页
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <button onClick={() => navigate('/')} style={styles.backButton}>
        ← 返回活动列表
      </button>

      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <StatusBadge status={activity.status} />
          <h1 style={styles.title}>{activity.name}</h1>
        </div>
        {activity.status !== 'ended' && (
          <RippleButton onClick={() => setShowCreatePlantModal(true)}>
            + 上架植物
          </RippleButton>
        )}
      </div>

      <div style={styles.infoCard}>
        <div style={styles.infoRow} className="info-row-responsive">
          <div style={styles.infoItem}>
            <span style={styles.infoIcon}>📅</span>
            <div>
              <p style={styles.infoLabel}>活动日期</p>
              <p style={styles.infoValue}>
                {new Date(activity.date).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                })}
              </p>
            </div>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoIcon}>📍</span>
            <div>
              <p style={styles.infoLabel}>活动地点</p>
              <p style={styles.infoValue}>{activity.location}</p>
            </div>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoIcon}>🌱</span>
            <div>
              <p style={styles.infoLabel}>上架植物</p>
              <p style={styles.infoValue}>{activity.plants.length} 株</p>
            </div>
          </div>
        </div>
        <div style={styles.description}>
          <p style={styles.infoLabel}>活动介绍</p>
          <p style={styles.descriptionText}>{activity.description}</p>
        </div>
      </div>

      <AuctionBoard
        activity={activity}
        onPlantUpdated={handlePlantUpdated}
      />

      {showCreatePlantModal && (
        <CreatePlantModal
          activityId={activity.id}
          onClose={() => setShowCreatePlantModal(false)}
          onCreated={handlePlantCreated}
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
  backButton: {
    background: 'none',
    border: 'none',
    color: 'var(--primary-color)',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    marginBottom: '16px',
    padding: '8px 12px',
    borderRadius: '6px',
    transition: 'background-color 0.2s ease',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    gap: '16px',
    flexWrap: 'wrap',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 'var(--border-radius)',
    padding: '24px',
    boxShadow: 'var(--shadow-sm)',
    marginBottom: '24px',
  },
  infoRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '24px',
    marginBottom: '20px',
  },
  infoItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  infoIcon: {
    fontSize: '24px',
    marginTop: '2px',
  },
  infoLabel: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    margin: '0 0 4px 0',
  },
  infoValue: {
    fontSize: '15px',
    fontWeight: 500,
    color: 'var(--text-primary)',
    margin: 0,
  },
  description: {
    paddingTop: '16px',
    borderTop: '1px solid #f0f0f0',
  },
  descriptionText: {
    fontSize: '14px',
    lineHeight: 1.6,
    color: 'var(--text-secondary)',
    margin: 0,
  },
  loading: {
    textAlign: 'center',
    padding: '60px',
    fontSize: '16px',
    color: 'var(--text-muted)',
  },
  notFound: {
    textAlign: 'center',
    padding: '60px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
};

export default ActivityDetail;
