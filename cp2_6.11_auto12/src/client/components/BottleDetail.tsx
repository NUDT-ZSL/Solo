import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const [isPlaying, setIsPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const loadPromiseRef = useRef<Promise<void> | null>(null);

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

  const loadAudioBuffer = useCallback(async (): Promise<AudioBuffer | null> => {
    if (audioBufferRef.current) return audioBufferRef.current;
    if (loadPromiseRef.current) {
      await loadPromiseRef.current;
      return audioBufferRef.current;
    }

    loadPromiseRef.current = (async () => {
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioCtxRef.current;
        const response = await fetch(bottle.audioData);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        audioBufferRef.current = audioBuffer;
      } catch (e) {
        console.error('Failed to decode audio:', e);
      }
      loadPromiseRef.current = null;
    })();

    await loadPromiseRef.current;
    return audioBufferRef.current;
  }, [bottle.audioData]);

  const playClip = useCallback(async (startPercent?: number, duration?: number) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const buffer = await loadAudioBuffer();
      if (!buffer) return;

      if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch (e) {}
        sourceRef.current = null;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const gainNode = ctx.createGain();
      gainNode.gain.value = volume;

      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      sourceRef.current = source;
      gainNodeRef.current = gainNode;

      let startTime = 0;
      let clipDuration = buffer.duration;

      if (!isCollected && startPercent !== undefined && duration !== undefined) {
        startTime = startPercent * Math.max(0, buffer.duration - duration);
        clipDuration = duration;
      }

      source.onended = () => {
        setIsPlaying(false);
        sourceRef.current = null;
      };

      source.start(0, startTime, clipDuration);
      setIsPlaying(true);
    } catch (e) {
      console.error('Playback error:', e);
    }
  }, [volume, isCollected, loadAudioBuffer]);

  const stopPlayback = useCallback(() => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch (e) {}
      sourceRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    if (!isCollected) {
      const clipDuration = 1 + Math.random() * 2;
      const startPercent = Math.random();
      playClip(startPercent, clipDuration);
    } else {
      playClip(0, undefined);
    }

    return () => {
      stopPlayback();
    };
  }, [bottle.id, isCollected, playClip, stopPlayback]);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  }, [volume]);

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

  const handlePlayFull = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      playClip(0, undefined);
    }
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
        {isCollected ? (
          <div>
            <button
              className="action-btn release"
              onClick={handlePlayFull}
              style={{ width: '100%', marginBottom: '8px' }}
            >
              {isPlaying ? '⏸ 暂停' : '▶ 播放完整音频'}
            </button>
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
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', textAlign: 'center', padding: '8px' }}>
            🔊 正在播放随机片段...
          </div>
        )}
      </div>

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
