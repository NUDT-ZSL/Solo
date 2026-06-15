import React from 'react';
import { loadMyMoods, getTotalHuigan, TEA_CATALOG, formatTime } from './TeaHouseEngine';
import { staggerDelay } from './BubbleService';

const PersonalPage: React.FC = () => {
  const moods = React.useMemo(() => loadMyMoods(), []);
  const totalHuigan = React.useMemo(() => getTotalHuigan(moods), [moods]);

  if (moods.length === 0) {
    return (
      <div className="page-container">
        <div className="personal-header">
          <h2>我的茶盏</h2>
        </div>
        <div className="empty-state">
          <div className="empty-icon">🍵</div>
          <p>你还没有泡过茶，去茶舍写一段心情吧</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="personal-header">
        <h2>我的茶盏</h2>
        <div className="stat-row">
          <div className="stat-item">
            <div className="stat-num">{moods.length}</div>
            <div className="stat-label">杯茶</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">{totalHuigan}</div>
            <div className="stat-label">口回甘</div>
          </div>
        </div>
      </div>

      <div className="personal-grid">
        {moods.map((tea, i) => {
          const meta = TEA_CATALOG[tea.teaType];
          return (
            <div
              key={tea.id}
              className="personal-card glass-card"
              style={{ animationDelay: `${staggerDelay(i, 80)}ms` }}
            >
              <span
                className="personal-card-tea"
                style={{ background: meta.bgColor, color: meta.color }}
              >
                {meta.emoji} {meta.label} · {meta.desc}
              </span>
              <div className="personal-card-mood">{tea.mood}</div>
              <div className="personal-card-footer">
                <span className="personal-card-time">{formatTime(tea.createdAt)}</span>
                <span className="personal-card-huigan">
                  🍵 {tea.huigan}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PersonalPage;
