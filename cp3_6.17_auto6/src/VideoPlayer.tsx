import { useCallback, useEffect, useRef, useState } from 'react';
import type { VideoMeta, Marker } from './types';
import { PRESET_LABELS, FPS, formatTime, timeToFrame } from './constants';
import { createMarker } from './api';

interface Props {
  video: VideoMeta;
  markers: Marker[];
  seekTarget: { videoId: string; time: number } | null;
  seekToken: number;
  onClose: () => void;
  onMarkerAdded: (marker: Marker) => void;
  showToast: (msg: string) => void;
}

function captureThumbnail(video: HTMLVideoElement): string | undefined {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    const vw = video.videoWidth || 320;
    const vh = video.videoHeight || 180;
    const side = Math.min(vw, vh);
    const sx = (vw - side) / 2;
    const sy = (vh - side) / 2;
    ctx.drawImage(video, sx, sy, side, side, 0, 0, 32, 32);
    return canvas.toDataURL('image/jpeg', 0.7);
  } catch {
    return undefined;
  }
}

export default function VideoPlayer({
  video,
  markers,
  seekTarget,
  seekToken,
  onClose,
  onMarkerAdded,
  showToast,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>(0);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(video.duration || 0);
  const [showPopup, setShowPopup] = useState(false);
  const [popupPos, setPopupPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredMarker, setHoveredMarker] = useState<Marker | null>(null);
  const lastTickRef = useRef(0);

  const sortedMarkers = [...markers].sort((a, b) => a.time - b.time);

  const tick = useCallback(() => {
    const v = videoRef.current;
    if (v) {
      const now = performance.now();
      if (now - lastTickRef.current >= 1000 / 30) {
        lastTickRef.current = now;
        setCurrent(v.currentTime);
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => {
      setDuration(isFinite(v.duration) ? v.duration : video.duration || 0);
    };
    v.addEventListener('loadedmetadata', onMeta);
    return () => v.removeEventListener('loadedmetadata', onMeta);
  }, [video.duration]);

  useEffect(() => {
    const v = videoRef.current;
    if (v && seekTarget && isFinite(seekTarget.time)) {
      const trySeek = () => {
        try {
          v.currentTime = seekTarget.time;
        } catch {
          /* ignore */
        }
      };
      if (v.readyState >= 1) trySeek();
      else v.addEventListener('loadedmetadata', trySeek, { once: true });
      setCurrent(seekTarget.time);
    }
  }, [seekTarget, seekToken]);

  const handleAddMarkerClick = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const rect = v.getBoundingClientRect();
    setPopupPos({ x: rect.left + rect.width / 2 - 110, y: rect.bottom - 200 });
    setShowPopup(true);
  }, []);

  const submitMarker = useCallback(
    async (label: string, color: string) => {
      const v = videoRef.current;
      if (!v) return;
      const time = v.currentTime;
      const thumbnail = captureThumbnail(v);
      setShowPopup(false);
      try {
        const created = await createMarker({
          videoId: video.id,
          time,
          timeFrame: timeToFrame(time),
          label,
          color,
          thumbnail,
        });
        onMarkerAdded(created);
        showToast(`已添加标记「${label}」@ ${formatTime(time)}`);
      } catch {
        showToast('添加标记失败');
      }
    },
    [video.id, onMarkerAdded, showToast]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        handleAddMarkerClick();
      } else if (e.key === 'Escape') {
        if (showPopup) setShowPopup(false);
        else onClose();
      } else if (e.key === ' ') {
        e.preventDefault();
        const v = videoRef.current;
        if (v) {
          if (v.paused) v.play();
          else v.pause();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleAddMarkerClick, onClose, showPopup]);

  const onProgressClick = (e: React.MouseEvent) => {
    const v = videoRef.current;
    const bar = e.currentTarget as HTMLElement;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    if (v && duration > 0) {
      v.currentTime = ratio * duration;
      setCurrent(v.currentTime);
    }
  };

  const onMarkerLineClick = (m: Marker) => {
    const v = videoRef.current;
    if (v) {
      v.currentTime = m.time;
      setCurrent(m.time);
    }
  };

  const filled = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="player-modal" onClick={(e) => e.stopPropagation()}>
        <div className="player-header">
          <div className="player-name" title={video.fileName}>
            {video.fileName}
          </div>
          <button className="player-close pressable" onClick={onClose} title="关闭 (Esc)">
            ×
          </button>
        </div>

        <video
          ref={videoRef}
          className="player-video"
          src={video.filePath}
          controls
          autoPlay
        />

        <div className="player-controls">
          <div className="progress-wrap">
            <div className="marker-lines">
              {sortedMarkers.map((m) => {
                const left = duration > 0 ? (m.time / duration) * 100 : 0;
                return (
                  <div
                    key={m.id}
                    className="marker-line"
                    style={{ left: `${left}%`, background: m.color }}
                    title={`${m.label} @ ${formatTime(m.time)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkerLineClick(m);
                    }}
                    onMouseEnter={() => setHoveredMarker(m)}
                    onMouseLeave={() => setHoveredMarker(null)}
                  >
                    {hoveredMarker?.id === m.id && (
                      <div className="marker-tooltip" style={{ left: 0 }}>
                        <strong style={{ color: m.color }}>{m.label}</strong>
                        <span style={{ marginLeft: 6 }} className="mono">
                          {formatTime(m.time)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="progress-bar" onClick={onProgressClick}>
              <div className="progress-filled" style={{ width: `${filled}%` }} />
            </div>
          </div>

          <div className="player-toolbar">
            <div className="player-time mono">
              {formatTime(current)} / {formatTime(duration)}
            </div>
            <button
              className="add-marker-btn pressable"
              onClick={handleAddMarkerClick}
              disabled={showPopup}
            >
              + 添加标记 (M)
            </button>
          </div>
        </div>
      </div>

      {showPopup && (
        <div
          className="label-popup"
          style={{ left: `${popupPos.x}px`, top: `${popupPos.y}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="label-popup-title">选择或输入标签</div>
          <input
            className="label-input"
            placeholder="自定义标签名…"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = (e.target as HTMLInputElement).value.trim();
                if (val) submitMarker(val, PRESET_LABELS[0].color);
              }
            }}
          />
          <div className="preset-grid">
            {PRESET_LABELS.map((p) => (
              <button
                key={p.name}
                className="preset-label pressable"
                style={{ background: p.color }}
                onClick={() => submitMarker(p.name, p.color)}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
