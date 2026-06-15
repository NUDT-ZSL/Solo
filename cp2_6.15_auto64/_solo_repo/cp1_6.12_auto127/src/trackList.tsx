import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Track as TrackType, Sample } from './types';
import { CATEGORY_COLORS, CATEGORY_NAMES } from './types';
import audioEngine from './audioEngine';

interface TrackListProps {
  tracks: TrackType[];
  samples: Sample[];
  selectedTrackId: string | null;
  onTrackSelect: (trackId: string) => void;
  onTrackUpdate: (trackId: string, updates: Partial<TrackType>) => void;
  onTrackDelete: (trackId: string) => void;
  onTrackReorder: (fromIndex: number, toIndex: number) => void;
  onAddTrack: () => void;
  isPlaying: boolean;
  maxTracks: number;
}

interface WaveformCanvasProps {
  trackId: string;
  color: string;
  width: number;
  height: number;
  isPlaying: boolean;
}

const WaveformCanvas: React.FC<WaveformCanvasProps> = ({ trackId, color, width, height, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      if (!isPlaying) {
        ctx.fillStyle = `${color}30`;
        for (let i = 0; i < width; i += 3) {
          const h = 2 + Math.sin(i * 0.5) * 2;
          ctx.fillRect(i, height / 2 - h / 2, 1, h);
        }
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      const data = audioEngine.getTrackAnalyserData(trackId);
      if (!data || data.length === 0) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      const barWidth = Math.max(1, Math.floor(width / data.length));

      for (let i = 0; i < data.length; i++) {
        const amplitude = Math.abs(data[i]);
        const barHeight = Math.max(2, amplitude * height * 0.9);
        const x = i * barWidth;
        const y = (height - barHeight) / 2;

        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        gradient.addColorStop(0, `${color}FF`);
        gradient.addColorStop(0.5, `${color}CC`);
        gradient.addColorStop(1, `${color}30`);

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth - 1, barHeight);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [trackId, color, width, height, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        borderRadius: '4px',
        backgroundColor: 'rgba(0,0,0,0.2)',
        flexShrink: 0
      }}
    />
  );
};

const TrackList: React.FC<TrackListProps> = ({
  tracks,
  samples,
  selectedTrackId,
  onTrackSelect,
  onTrackUpdate,
  onTrackDelete,
  onTrackReorder,
  onAddTrack,
  isPlaying,
  maxTracks
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; trackId: string } | null>(null);
  const [insertAnimation, setInsertAnimation] = useState<number | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const dragGhostRef = useRef<HTMLElement | null>(null);

  const getSampleById = useCallback((sampleId: string | null): Sample | undefined => {
    if (!sampleId) return undefined;
    return samples.find(s => s.id === sampleId);
  }, [samples]);

  const getTrackColor = useCallback((track: TrackType): string => {
    const sample = getSampleById(track.sampleId);
    if (!sample) return '#6a6a8a';
    return CATEGORY_COLORS[sample.category];
  }, [getSampleById]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [contextMenu]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());

    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();

    const clone = el.cloneNode(true) as HTMLElement;
    clone.style.position = 'absolute';
    clone.style.top = '-9999px';
    clone.style.left = '-9999px';
    clone.style.opacity = '0.6';
    clone.style.pointerEvents = 'none';
    clone.style.zIndex = '99999';
    clone.style.width = `${rect.width}px`;
    clone.style.transform = 'rotate(2deg) scale(1.02)';
    clone.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)';
    clone.style.transition = 'none';
    document.body.appendChild(clone);
    dragGhostRef.current = clone;

    e.dataTransfer.setDragImage(clone, e.clientX - rect.left, e.clientY - rect.top);

    requestAnimationFrame(() => {
      if (dragGhostRef.current) {
        dragGhostRef.current.style.position = 'fixed';
        dragGhostRef.current.style.top = `${e.clientY - (e.clientY - rect.top)}px`;
        dragGhostRef.current.style.left = `${e.clientX - (e.clientX - rect.left)}px`;
      }
    });
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      onTrackReorder(draggedIndex, toIndex);
      setInsertAnimation(toIndex);
      setTimeout(() => setInsertAnimation(null), 300);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    cleanupGhost();
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    cleanupGhost();
  };

  const cleanupGhost = () => {
    if (dragGhostRef.current && dragGhostRef.current.parentNode) {
      dragGhostRef.current.parentNode.removeChild(dragGhostRef.current);
      dragGhostRef.current = null;
    }
  };

  const handleContextMenu = (e: React.MouseEvent, trackId: string) => {
    e.preventDefault();
    onTrackSelect(trackId);
    setContextMenu({ x: e.clientX, y: e.clientY, trackId });
  };

  const handleVolumeChange = (trackId: string, volume: number) => {
    onTrackUpdate(trackId, { volume });
    audioEngine.setTrackVolume(trackId, volume);
  };

  const handlePanChange = (trackId: string, pan: number) => {
    const snapped = Math.round(pan / 5) * 5;
    onTrackUpdate(trackId, { pan: snapped });
    audioEngine.setTrackPan(trackId, snapped);
  };

  const handleMuteToggle = (track: TrackType) => {
    const newMuted = !track.muted;
    onTrackUpdate(track.id, { muted: newMuted });
    if (!track.solo) {
      audioEngine.setTrackMuted(track.id, newMuted);
    }
  };

  const handleSoloToggle = (track: TrackType) => {
    const newSolo = !track.solo;
    onTrackUpdate(track.id, { solo: newSolo });
    const updatedTracks = tracks.map(t =>
      t.id === track.id ? { ...t, solo: newSolo } : t
    );
    audioEngine.updateSoloState(updatedTracks);
  };

  const formatPanLabel = (pan: number): string => {
    if (pan > 0) return `R${pan}`;
    if (pan < 0) return `L${Math.abs(pan)}`;
    return 'C';
  };

  return (
    <div className="tracklist-container">
      <div className="tracklist-header">
        <span className="tracklist-title">音轨列表</span>
        <button
          className="add-track-btn"
          onClick={onAddTrack}
          disabled={tracks.length >= maxTracks}
          title={tracks.length >= maxTracks ? `最多${maxTracks}条音轨` : '添加音轨'}
        >
          + 添加
        </button>
      </div>

      <div className="tracks-wrapper">
        {tracks.map((track, index) => {
          const sample = getSampleById(track.sampleId);
          const color = getTrackColor(track);
          const isSelected = selectedTrackId === track.id;
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index && draggedIndex !== index;
          const isInserting = insertAnimation === index;

          const panRotation = track.pan;

          return (
            <div
              key={track.id}
              className={`track-row ${isDragging ? 'dragging' : ''} ${isSelected ? 'selected' : ''} ${isDragOver ? 'drag-over' : ''} ${isInserting ? 'insert-anim' : ''}`}
              style={{
                opacity: isDragging ? 0.4 : 1,
                borderLeft: `3px solid ${color}`,
                transform: isDragOver
                  ? draggedIndex !== null && draggedIndex < index
                    ? 'translateY(4px)'
                    : 'translateY(-4px)'
                  : isInserting
                    ? 'scale(1.01)'
                    : 'none',
                transition: 'transform 0.15s ease-out, opacity 0.15s ease-out, box-shadow 0.15s ease-out'
              }}
              draggable
              onClick={() => onTrackSelect(track.id)}
              onContextMenu={(e) => handleContextMenu(e, track.id)}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              <WaveformCanvas
                trackId={track.id}
                color={color}
                width={40}
                height={56}
                isPlaying={isPlaying && !track.muted && !(tracks.some(t => t.solo) && !track.solo)}
              />

              <div className="track-info">
                <div className="track-name" style={{ color: '#c0c0d0' }}>{track.name}</div>
                <div className="track-sample" style={{ color: color, fontSize: '11px' }}>
                  {sample ? `${CATEGORY_NAMES[sample.category]}: ${sample.name}` : '未加载采样'}
                </div>
              </div>

              <div className="track-controls">
                <div className="control-group">
                  <label className="control-label">音量</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={track.volume}
                    onChange={(e) => handleVolumeChange(track.id, parseInt(e.target.value))}
                    onClick={(e) => e.stopPropagation()}
                    className="volume-slider"
                    style={{ accentColor: color }}
                  />
                  <span className="control-value">{track.volume}</span>
                </div>

                <div className="control-group">
                  <label className="control-label">声相</label>
                  <div className="pan-control">
                    <input
                      type="range"
                      min="-45"
                      max="45"
                      step="5"
                      value={track.pan}
                      onChange={(e) => handlePanChange(track.id, parseInt(e.target.value))}
                      onClick={(e) => e.stopPropagation()}
                      className="pan-slider"
                      style={{ accentColor: color }}
                    />
                    <div
                      className="pan-knob"
                      style={{
                        transform: `rotate(${panRotation}deg)`,
                        borderColor: color
                      }}
                    >
                      <div className="pan-knob-indicator" style={{ backgroundColor: color }} />
                    </div>
                    <span className="control-value pan-label">{formatPanLabel(track.pan)}</span>
                  </div>
                </div>

                <div className="button-group">
                  <button
                    className={`btn-control btn-mute ${track.muted ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMuteToggle(track);
                    }}
                    title="静音 (M)"
                    style={track.muted ? { backgroundColor: color, color: '#1a1a2e' } : {}}
                  >
                    M
                  </button>
                  <button
                    className={`btn-control btn-solo ${track.solo ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSoloToggle(track);
                    }}
                    title="独奏 (S)"
                    style={track.solo ? { backgroundColor: '#FFD700', color: '#1a1a2e' } : {}}
                  >
                    S
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {tracks.length === 0 && (
          <div className="empty-tracks">
            <span>暂无音轨，点击上方"+ 添加"按钮创建音轨</span>
          </div>
        )}
      </div>

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="context-menu"
          style={{
            left: contextMenu.x,
            top: contextMenu.y
          }}
        >
          <button
            className="context-menu-item"
            onClick={() => {
              onTrackDelete(contextMenu.trackId);
              setContextMenu(null);
            }}
          >
            删除音轨
          </button>
        </div>
      )}

      <style>{`
        .tracklist-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }
        .tracklist-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 16px 12px;
          border-bottom: 1px solid #3a3a5a;
        }
        .tracklist-title {
          color: #c0c0d0;
          font-size: 16px;
          font-weight: 600;
        }
        .add-track-btn {
          background: #2a2a4a;
          color: #c0c0d0;
          border: none;
          border-radius: 8px;
          padding: 6px 14px;
          font-size: 13px;
          cursor: pointer;
          transition: background 0.2s ease-in-out, color 0.2s ease-in-out;
        }
        .add-track-btn:hover:not(:disabled) {
          background: #4a4a6a;
          color: #fff;
        }
        .add-track-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .tracks-wrapper {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }
        .tracks-wrapper::-webkit-scrollbar {
          width: 6px;
        }
        .tracks-wrapper::-webkit-scrollbar-track {
          background: transparent;
        }
        .tracks-wrapper::-webkit-scrollbar-thumb {
          background: #3a3a5a;
          border-radius: 3px;
        }
        .track-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          margin-bottom: 6px;
          background: #22223a;
          border-radius: 8px;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        .track-row:hover {
          background: #2a2a48;
        }
        .track-row.selected {
          background: #2a2a4a;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.05);
        }
        .track-row.drag-over {
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          border-top: 2px solid #6a6aaa;
        }
        .track-row.insert-anim {
          animation: insertPulse 0.3s ease-out;
        }
        @keyframes insertPulse {
          0% { transform: scale(0.97); opacity: 0.7; }
          50% { transform: scale(1.01); }
          100% { transform: scale(1); opacity: 1; }
        }
        .track-row.dragging {
          opacity: 0.4;
        }
        .track-info {
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }
        .track-name {
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .track-sample {
          font-size: 11px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 2px;
        }
        .track-controls {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }
        .control-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .control-label {
          color: #8a8aa0;
          font-size: 11px;
          min-width: 24px;
        }
        .control-value {
          color: #a0a0b0;
          font-size: 11px;
          min-width: 24px;
          text-align: right;
        }
        .volume-slider,
        .pan-slider {
          width: 70px;
          height: 4px;
          cursor: pointer;
          border-radius: 2px;
        }
        .pan-control {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .pan-knob {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid #6a6a8a;
          background: #2a2a4a;
          position: relative;
          transition: transform 0.15s ease-out;
          flex-shrink: 0;
        }
        .pan-knob-indicator {
          position: absolute;
          top: 2px;
          left: 50%;
          transform: translateX(-50%);
          width: 2px;
          height: 6px;
          border-radius: 1px;
        }
        .pan-label {
          min-width: 20px;
        }
        .button-group {
          display: flex;
          gap: 4px;
        }
        .btn-control {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: none;
          background: #2a2a4a;
          color: #8a8aa0;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s ease-in-out, color 0.2s ease-in-out;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .btn-control:hover {
          background: #4a4a6a;
          color: #c0c0d0;
        }
        .btn-mute.active {
          background: #e74c3c;
          color: #fff;
        }
        .btn-solo.active {
          background: #FFD700;
          color: #1a1a2e;
        }
        .empty-tracks {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 16px;
          color: #6a6a8a;
          font-size: 13px;
          text-align: center;
        }
        .context-menu {
          position: fixed;
          z-index: 10000;
          background: #2a2a4a;
          border: 1px solid #4a4a6a;
          border-radius: 8px;
          padding: 4px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.5);
          min-width: 120px;
        }
        .context-menu-item {
          display: block;
          width: 100%;
          padding: 8px 12px;
          background: none;
          border: none;
          color: #e74c3c;
          font-size: 13px;
          text-align: left;
          cursor: pointer;
          border-radius: 6px;
          transition: background 0.2s;
        }
        .context-menu-item:hover {
          background: #3a3a5a;
        }
      `}</style>
    </div>
  );
};

export default TrackList;
