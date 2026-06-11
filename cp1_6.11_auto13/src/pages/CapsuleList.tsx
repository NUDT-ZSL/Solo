import { useState, useMemo, useEffect } from 'react';
import type { Capsule, MusicStyle, CapsuleStatus } from '../types';
import { MUSIC_STYLE_LABELS } from '../types';
import CapsuleCard from '../components/CapsuleCard';

interface Props {
  capsules: Capsule[];
  onSelect: (id: string) => void;
  onRefresh: () => void;
}

export default function CapsuleList({ capsules, onSelect, onRefresh }: Props) {
  const [styleFilter, setStyleFilter] = useState<'all' | MusicStyle>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | CapsuleStatus>('all');
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredCapsules = useMemo(() => {
    return capsules.filter(c => {
      if (styleFilter !== 'all' && c.musicStyle !== styleFilter) return false;
      const isUnlocked = Date.now() >= c.unlockAt;
      if (statusFilter === 'locked' && isUnlocked) return false;
      if (statusFilter === 'unlocked' && !isUnlocked) return false;
      return true;
    });
  }, [capsules, styleFilter, statusFilter]);

  return (
    <div className="capsule-list-page">
      <div className="page-header">
        <h2 className="page-title">我的时间胶囊</h2>
        <button className="refresh-btn" onClick={onRefresh}>↻ 刷新</button>
      </div>

      <div className="filters">
        <div className="filter-group">
          <span className="filter-label">音乐风格:</span>
          <div className="filter-options">
            <button
              className={`filter-chip ${styleFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStyleFilter('all')}
            >全部</button>
            {(Object.keys(MUSIC_STYLE_LABELS) as MusicStyle[]).map(style => (
              <button
                key={style}
                className={`filter-chip ${styleFilter === style ? 'active' : ''}`}
                onClick={() => setStyleFilter(style)}
              >
                {MUSIC_STYLE_LABELS[style]}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <span className="filter-label">状态:</span>
          <div className="filter-options">
            <button
              className={`filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >全部</button>
            <button
              className={`filter-chip ${statusFilter === 'locked' ? 'active' : ''}`}
              onClick={() => setStatusFilter('locked')}
            >🔒 已锁定</button>
            <button
              className={`filter-chip ${statusFilter === 'unlocked' ? 'active' : ''}`}
              onClick={() => setStatusFilter('unlocked')}
            >✨ 已解锁</button>
          </div>
        </div>
      </div>

      {filteredCapsules.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✉️</div>
          <p>暂无符合条件的时间胶囊</p>
          <p className="empty-hint">点击右上角「+ 新胶囊」创建你的第一封时间信件</p>
        </div>
      ) : (
        <div className="capsule-grid">
          {filteredCapsules.map(capsule => (
            <CapsuleCard
              key={capsule.id}
              capsule={capsule}
              onClick={() => onSelect(capsule.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
