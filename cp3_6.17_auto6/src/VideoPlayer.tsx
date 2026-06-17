import { useRef, useState, useEffect, useCallback } from 'react';
import { X, Play, Pause, Flag, Tag } from 'lucide-react';
import { api } from './api';
import { useAppStore } from './store';
import { formatDuration, PRESET_TAGS } from './types';
import type { Video, Marker } from './types';

interface VideoPlayerProps {
  video: Video;
  onClose: () => void;
}

export function VideoPlayer({ video, onClose }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showTagPopup, setShowTagPopup] = useState(false);
  const [tagPopupTime, setTagPopupTime] = useState(0);
  const [customTag, setCustomTag] = useState('');
  const [hoverMarker, setHoverMarker] = useState<Marker | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  const markers = useAppStore(s => s.markers.filter(m => m.videoId === video.id));
  const addMarker = useAppStore(s => s.addMarker);
  const seekTimestamp = useAppStore(s => s.seekTimestamp);
  const setSeekTimestamp = useAppStore(s => s.setSeekTimestamp);

  const videoMarkers = markers.sort((a, b) => a.timestamp - b.timestamp);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setCurrentTime(v.currentTime);
    const onMeta = () => setDuration(v.duration);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
    };
  }, []);

  useEffect(() => {
    if (seekTimestamp !== null && videoRef.current) {
      videoRef.current.currentTime = seekTimestamp;
      setSeekTimestamp(null);
    }
  }, [seekTimestamp, setSeekTimestamp]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  };

  const openTagPopup = useCallback((time?: number) => {
    setTagPopupTime(time ?? currentTime);
    setShowTagPopup(true);
    setCustomTag('');
  }, [currentTime]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'm' && !showTagPopup) {
        e.preventDefault();
        openTagPopup();
      }
      if (e.key === 'Escape') {
        if (showTagPopup) setShowTagPopup(false);
        else onClose();
      }
      if (e.key === ' ' && !showTagPopup) {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTagPopup, openTagPopup, onClose]);

  const addMarkerWithTag = async (label: string, color: string) => {
    if (!label.trim()) return;
    const marker = await api.createMarker({
      videoId: video.id,
      timestamp: tagPopupTime,
      label: label.trim(),
      color
    });
    addMarker(marker);
    setShowTagPopup(false);
  };

  const handleProgressClick = (e: React.MouseEvent) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    videoRef.current!.currentTime = Math.max(0, Math.min(duration, ratio * duration));
  };

  const handleMarkerHover = (marker: Marker, e: React.MouseEvent) => {
    setHoverMarker(marker);
    const rect = progressRef.current?.getBoundingClientRect();
    if (rect) {
      setHoverPos({ x: e.clientX - rect.left, y: -8 });
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="rounded-lg overflow-hidden bg-[#1e1e1e] shadow-2xl"
        style={{ width: 640 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#333]">
          <span className="text-sm truncate flex-1 pr-4">{video.originalName}</span>
          <button onClick={onClose} className="p-1 hover:bg-[#333] rounded">
            <X size={18} />
          </button>
        </div>

        <div style={{ width: 640, height: 360 }} className="relative bg-black">
          <video
            ref={videoRef}
            src={video.path}
            className="w-full h-full object-contain"
            onClick={togglePlay}
          />
        </div>

        <div className="px-4 py-3">
          <div className="text-xs text-gray-400 mb-1">
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </div>
          <div className="relative">
            {videoMarkers.map((m) => {
              const pos = duration ? (m.timestamp / duration) * 100 : 0;
              return (
                <div
                  key={m.id}
                  className="absolute top-0 cursor-pointer"
                  style={{
                    left: `${pos}%`,
                    width: 3,
                    height: 24,
                    background: m.color,
                    transform: 'translateX(-50%)',
                    zIndex: 10
                  }}
                  onMouseEnter={(e) => handleMarkerHover(m, e)}
                  onMouseMove={(e) => handleMarkerHover(m, e)}
                  onMouseLeave={() => setHoverMarker(null)}
                />
              );
            })}
            {hoverMarker && (
              <div
                className="absolute bg-[#333] text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap z-20"
                style={{ left: hoverPos.x, top: hoverPos.y - 28, transform: 'translateX(-50%)' }}
              >
                <span className="mr-2" style={{ color: hoverMarker.color }}>●</span>
                {hoverMarker.label} - {formatDuration(hoverMarker.timestamp)}
              </div>
            )}
            <div
              ref={progressRef}
              onClick={handleProgressClick}
              className="h-2 bg-[#333] rounded cursor-pointer relative"
            >
              <div
                className="h-full rounded"
                style={{
                  width: duration ? `${(currentTime / duration) * 100}%` : '0%',
                  background: '#ff5722'
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={togglePlay}
              className="p-2 rounded hover:bg-[#333]"
            >
              {playing ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button
              onClick={() => openTagPopup()}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-sm"
              style={{ background: '#ff5722' }}
            >
              <Flag size={14} />
              添加标记 (M)
            </button>
          </div>
        </div>
      </div>

      {showTagPopup && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]"
          onClick={() => setShowTagPopup(false)}
        >
          <div
            className="bg-[#252525] rounded-lg p-5 w-96 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-4">
              <Tag size={18} color="#ff5722" />
              <h3 className="font-medium">添加标签标记</h3>
              <span className="ml-auto text-sm text-gray-400">
                {formatDuration(tagPopupTime)}
              </span>
            </div>
            <input
              type="text"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              placeholder="输入自定义标签..."
              className="w-full px-3 py-2 rounded bg-[#1e1e1e] border border-[#444] text-sm outline-none focus:border-[#ff5722] mb-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customTag.trim()) {
                  addMarkerWithTag(customTag, '#ff5722');
                }
              }}
              autoFocus
            />
            <p className="text-xs text-gray-400 mb-2">预设标签：</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_TAGS.map((tag) => (
                <button
                  key={tag.label}
                  onClick={() => addMarkerWithTag(tag.label, tag.color)}
                  className="text-xs text-white flex items-center justify-center"
                  style={{
                    width: 60,
                    height: 24,
                    borderRadius: 12,
                    background: tag.color
                  }}
                >
                  {tag.label}
                </button>
              ))}
            </div>
            {customTag.trim() && (
              <button
                onClick={() => addMarkerWithTag(customTag, '#ff5722')}
                className="mt-4 w-full py-2 rounded text-sm"
                style={{ background: '#ff5722' }}
              >
                添加自定义标签
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
