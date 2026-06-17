import React, { useState } from 'react';
import { useDataStore, MusicItem, ExplorationRecord, Musician } from '../data/DataStore';

interface TrackCardProps {
  item: MusicItem;
  record: ExplorationRecord;
  musician: Musician | undefined;
}

const TrackCard: React.FC<TrackCardProps> = ({ item, record, musician }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const unlockDate = record.unlockedAt ? new Date(record.unlockedAt) : null;

  return (
    <div 
      className={`track-card ${isFlipped ? 'flipped' : ''}`}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div className="card-inner">
        <div className="card-front">
          <div className="card-icon">{item.icon}</div>
          <h3 className="track-title">{item.unlockedTrack.title}</h3>
          <p className="track-artist" style={{ color: musician?.accentColor }}>
            {item.unlockedTrack.artist}
          </p>
          <p className="unlock-date">
            解锁于: {unlockDate?.toLocaleDateString('zh-CN')}
          </p>
          <p className="flip-hint">点击查看幕后故事 →</p>
        </div>
        <div className="card-back">
          <p className="story-text">{item.unlockedTrack.story}</p>
          <p className="flip-hint">← 点击返回</p>
        </div>
      </div>

      <style>{`
        .track-card {
          perspective: 1000px;
          cursor: pointer;
          height: 200px;
        }

        .card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.6s;
          transform-style: preserve-3d;
        }

        .track-card.flipped .card-inner {
          transform: rotateY(180deg);
        }

        .card-front, .card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          background: #263238;
          border-radius: 8px;
          padding: 20px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          border: 1px solid #37474F;
          transition: all 0.3s ease;
        }

        .card-front:hover, .card-back:hover {
          border-color: #FFD54F;
          box-shadow: 0 8px 25px rgba(255, 213, 79, 0.2);
        }

        .card-back {
          transform: rotateY(180deg);
          background: #1E1E2E;
          border-color: #FFD54F;
        }

        .card-icon {
          font-size: 40px;
          margin-bottom: 12px;
        }

        .track-title {
          color: #E0E0E0;
          margin: 0 0 8px 0;
          font-size: 18px;
        }

        .track-artist {
          margin: 0 0 8px 0;
          font-size: 14px;
        }

        .unlock-date {
          color: #9E9E9E;
          font-size: 12px;
          margin: 0 0 8px 0;
        }

        .flip-hint {
          color: #607D8B;
          font-size: 11px;
          margin: 0;
        }

        .story-text {
          color: #FFAB40;
          font-size: 14px;
          line-height: 1.6;
          margin: 0 0 16px 0;
        }
      `}</style>
    </div>
  );
};

export const Portfolio: React.FC = () => {
  const { getUnlockedTracks, getStats, musicians } = useDataStore();
  const unlockedTracks = getUnlockedTracks();
  const stats = getStats();

  return (
    <div className="portfolio-page">
      <div className="portfolio-header">
        <h2 className="page-title">📚 已解锁作品集</h2>
        <p className="page-subtitle">探索工作室，收集更多隐藏曲目</p>
      </div>

      {unlockedTracks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎵</div>
          <h3>还没有解锁任何曲目</h3>
          <p>去工作室点击发光的物件，猜谜语解锁隐藏曲目吧！</p>
        </div>
      ) : (
        <>
          <div className="tracks-grid">
            {unlockedTracks.map(({ item, record }) => {
              const musician = musicians.find(m => m.id === item.musicianId);
              return (
                <TrackCard 
                  key={item.id} 
                  item={item} 
                  record={record} 
                  musician={musician}
                />
              );
            })}
          </div>

          <div className="stats-footer">
            <div className="stat-item">
              <span className="stat-value">{stats.totalUnlocked}</span>
              <span className="stat-label">已解锁曲目</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.totalExplored}</span>
              <span className="stat-label">总探索物件</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.avgAttempts.toFixed(1)}</span>
              <span className="stat-label">平均尝试次数</span>
            </div>
          </div>
        </>
      )}

      <style>{`
        .portfolio-page {
          padding: 24px;
          max-width: 1200px;
          margin: 0 auto;
          transition: background 0.3s ease;
        }

        [data-theme='light'] .page-title {
          color: #FF8F00;
        }

        [data-theme='light'] .page-subtitle {
          color: #757575;
        }

        [data-theme='light'] .empty-state {
          color: #757575;
        }

        [data-theme='light'] .empty-state h3 {
          color: #424242;
        }

        [data-theme='light'] .card-front {
          background: #FFFFFF;
          border-color: #E0E0E0;
        }

        [data-theme='light'] .card-back {
          background: #FFF8E1;
          border-color: #FFB300;
        }

        [data-theme='light'] .track-title {
          color: #212121;
        }

        [data-theme='light'] .unlock-date {
          color: #9E9E9E;
        }

        [data-theme='light'] .stats-footer {
          background: #FFFFFF;
          border-top: 2px solid #FFB300;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        [data-theme='light'] .stat-label {
          color: #757575;
        }

        .portfolio-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .page-title {
          color: #FFD54F;
          font-size: 28px;
          margin: 0 0 8px 0;
        }

        .page-subtitle {
          color: #9E9E9E;
          margin: 0;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #9E9E9E;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .empty-state h3 {
          color: #E0E0E0;
          margin: 0 0 8px 0;
        }

        .tracks-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 40px;
        }

        .stats-footer {
          display: flex;
          justify-content: center;
          gap: 48px;
          padding: 24px;
          background: #1E1E2E;
          border-radius: 12px;
          border-top: 2px solid #FFD54F;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .stat-value {
          font-size: 32px;
          font-weight: bold;
          color: #FFD54F;
        }

        .stat-label {
          font-size: 14px;
          color: #9E9E9E;
        }

        @media (max-width: 768px) {
          .portfolio-page {
            padding: 16px;
          }

          .tracks-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .stats-footer {
            flex-direction: column;
            gap: 16px;
          }

          .stat-value {
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  );
};
