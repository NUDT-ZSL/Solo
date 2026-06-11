import React from 'react';
import type { RaceItem } from '../types';
import { LANGUAGE_COLORS } from '../types';
import { useRaceStore } from '../store/useRaceStore';

const RaceTrack: React.FC = () => {
  const { raceItems, isFadingOut } = useRaceStore();

  if (raceItems.length === 0) {
    return (
      <div className="race-tracks">
        <div className="empty-state">
          <div className="empty-icon">🏁</div>
          <div className="empty-text">选择语言和算法，点击开始赛跑</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`race-tracks ${isFadingOut ? 'fade-out' : ''}`}>
      {raceItems.map((item) => (
        <TrackRow key={item.language} item={item} isFadingOut={isFadingOut} />
      ))}
    </div>
  );
};

interface TrackRowProps {
  item: RaceItem;
  isFadingOut: boolean;
}

const TrackRow: React.FC<TrackRowProps> = ({ item, isFadingOut }) => {
  const color = LANGUAGE_COLORS[item.language];
  const scaleX = item.progress / 100;

  const getStatusText = () => {
    if (item.status === 'idle') return '准备就绪';
    if (item.status === 'running') return `运行中... ${item.elapsedMs}ms`;
    return `已完成 耗时：${item.elapsedMs}ms`;
  };

  return (
    <div className={`track-item ${isFadingOut ? 'fade-out' : ''}`}>
      <div className="track-label">
        <span className="track-dot" style={{ background: color, color }} />
        <span className="track-name">{item.language}</span>
      </div>

      <div className="track-bar-container">
        <div
          className={`track-bar ${item.status === 'finished' ? 'finished' : ''}`}
          style={{ transform: `scaleX(${Math.max(0.001, scaleX)})` }}
        />
        {item.status !== 'idle' && (
          <span className="fps-badge">{item.fps} FPS</span>
        )}
        <span className={`track-status ${item.status}`}>
          {getStatusText()}
        </span>
      </div>
    </div>
  );
};

export default RaceTrack;
