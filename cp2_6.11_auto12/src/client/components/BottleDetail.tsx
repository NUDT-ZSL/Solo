import React, { useState, useEffect, useRef } from 'react';
import type { Bottle } from '../../shared/types';

interface BottleDetailProps {
  bottle: Bottle;
  position: { x: number; y: number };
  onClose: () => void;
  onCollect: (id: string) => void;
  onRelease: (id: string) => void;
}

export const BottleDetail: React.FC<BottleDetailProps> = ({
  bottle,
  position,
  onClose,
  onCollect,
  onRelease
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isCollected, setIsCollected] = useState(bottle.collected);
  const audioRef = useRef<HTMLAudioElement>(null);
  const clipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCoord = (n: number) => n.toFixed(4);

  useEffect(() => {
    setIsCollected(bottle.collected);
  }, [bottle.collected]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume;

    if (!bottle.collected && !isCollected) {
      const clipDuration = 1000 + Math.random() * 2000;
      const maxStart = Math.max(0, (bottle.audioDuration || 5) - clipDuration / 1000);
      const startTime = Math.random() * maxStart;

      audio.currentTime = startTime;
      audio.play().catch(() => {});

      clipTimeoutRef.current = setTimeout(() => {
        audio.pause();
      }, clipDuration);
    } else {
      audio.play().catch(() => {});
    }

    return () => {
      if (clipTimeoutRef.current) {
        clearTimeout(clipTimeoutRef.current);
      }
      audio.pause();
    };
  }, [bottle.id, bottle.collected, isCollected, bottle.audioDuration]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 280);
  };

  const handleCollect = () => {
    setIsCollected(true);
    onCollect(bottle.id);
  };

  const handleRelease = () => {
    handleClose();
    setTimeout(() => onRelease(bottle.id), 280);
  };

  const cardStyle: React.CSSProperties = {
    left: Math.min(Math.max(position.x - 160, 10), window.innerWidth - 330),
    top: Math.min(Math.max(position.y - 160, 10), window.innerHeight - 400)
  };

  return (
    <div
      className={`bottle-card ${isClosing ? 'closing' : ''}`}
      style={cardStyle}
      onClick={(e) => e.stopPropagation()}
    >
      <button className="close-btn" onClick={handleClose}>✕</button>

      <div className="bottle-id">#{bottle.id.slice(0, 8)}</div>

      {isCollected && <span className="collected-badge">✦ 已收藏</span>}

      <div className="info-row">
        <span className="info-label">创建时间</span>
        <span className="info-value">{formatDate(bottle.createdAt)}</span>
      </div>
      <div className="info-row">
        <span className="info-label">投放坐标</span>
        <span className="info-value">
          {formatCoord(bottle.lat)}, {formatCoord(bottle.lng)}
        </span>
      </div>
      <div className="info-row">
        <span className="info-label">当前坐标</span>
        <span className="info-value">
          {formatCoord(bottle.x)}, {formatCoord(bottle.y)}
        </span>
      </div>
      <div className="info-row">
        <span className="info-label">被捞出次数</span>
        <span className="info-value">{bottle.collectedCount} 次</span>
      </div>

      <div className="audio-player">
        <audio ref={audioRef} src={bottle.audioData} controls={isCollected} />
      </div>

      {isCollected && (
        <div className="volume-control">
          <label>音量</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
          />
        </div>
      )}

      {!isCollected && (
        <div className="card-actions">
          <button className="action-btn collect" onClick={handleCollect}>
            ✦ 捞出
          </button>
          <button className="action-btn release" onClick={handleRelease}>
            继续放流
          </button>
        </div>
      )}
    </div>
  );
};
