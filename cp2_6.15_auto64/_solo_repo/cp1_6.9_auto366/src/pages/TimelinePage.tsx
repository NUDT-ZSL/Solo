import React from 'react';
import { useNavigate } from 'react-router-dom';
import TimeLine from '../components/TimeLine';
import { useAppContext } from '../App';

interface TimelinePageProps {
  loading: boolean;
}

const TimelinePage: React.FC<TimelinePageProps> = ({ loading }) => {
  const { capsules } = useAppContext();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
      </div>
    );
  }

  const unlockedCount = capsules.filter(
    (c) => new Date(c.unlock_at).getTime() <= Date.now()
  ).length;
  const lockedCount = capsules.length - unlockedCount;

  return (
    <div className="timeline-page">
      <div className="timeline-header">
        <div>
          <h1 className="page-title">我的时光轴</h1>
          <p className="page-subtitle">每一个胶囊都是一段封存的记忆，静静等待着被打开的那一天</p>
        </div>
        {capsules.length > 0 && (
          <div className="capsule-stats">
            <div className="stat-item">
              <span className="stat-value">{capsules.length}</span>
              <span className="stat-label">总胶囊</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item unlocked">
              <span className="stat-value">{unlockedCount}</span>
              <span className="stat-label">已解锁</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item locked">
              <span className="stat-value">{lockedCount}</span>
              <span className="stat-label">封存中</span>
            </div>
          </div>
        )}
      </div>

      {capsules.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏺</div>
          <h3 className="empty-state-title">还没有时光胶囊</h3>
          <p className="empty-state-desc">
            写下此刻的心情、愿望或秘密，设定一个未来的时间，让它在那时静静等你。
            <br />
            有些话，适合留给未来的自己。
          </p>
          <button className="btn-primary" onClick={() => navigate('/create')}>
            ✨ 创建我的第一个胶囊
          </button>
        </div>
      ) : (
        <TimeLine capsules={capsules} />
      )}
    </div>
  );
};

export default TimelinePage;
