import React, { useState, useEffect, useRef } from 'react';
import type { Track as TrackType, Sample, SampleCategory } from './types';
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
  const animRef = useRef<number>();

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
          const h = 2 + Math.sin(i * 0.5) * 3;
          ctx.fillRect(i, height / 2 - h / 2, 1, h);
        }
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      const data = audioEngine.getTrackAnalyserData(trackId);
      const barWidth = Math.max(1, Math.floor(width / data.length));

      for (let i = 0; i < data.length; i++) {
        const amplitude = Math.abs(data[i]);
        const barHeight = Math.max(2, amplitude * height * 0.8);
        const x = i * barWidth;
        const y = (height - barHeight) / 2;

        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        gradient.addColorStop(0, `${color}FF`);
        gradient.addColorStop(0.5, `${color}AA`);
        gradient.addColorStop(1, `${color}40`);

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
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const getSampleById = (sampleId: string | null): Sample | undefined => {
    if (!sampleId) return undefined;
    return samples.find(s => s.id === sampleId);
  };

  const getTrackColor = (track: TrackType): string => {
    const sample = getSampleById(track.sampleId);
    if (!sample) return '#6a6a8a';
    return CATEGORY_COLORS[sample.category];
  };

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
    if (e.currentTarget instanceof HTMLElement) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clone = e.currentTarget.cloneNode(true) as HTMLElement;
      clone.style.position = 'fixed';
      clone.style.top = '-9999px';
      clone.style.left = '-9999px';
      clone.style.opacity = '0.8';
      clone.style.pointerEvents = 'none';
      clone.style.zIndex = '9999';
      clone.style.width = `${rect.width}px`;
      document.body.appendChild(clone);
      e.dataTransfer.setDragImage(clone, e.clientX - rect.left, e.clientY - rect.top);
      setTimeout(() => document.body.removeChild(clone), 0);
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      onTrackReorder(draggedIndex, toIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
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

  const handleSoloToggle = (track: TrackType, allTracks: TrackType[]) => {
    const newSolo = !track.solo;
    onTrackUpdate(track.id, { solo: newSolo });
    const updatedTracks = allTracks.map(t =>
      t.id === track.id ? { ...t, solo: newSolo } : t
    );
    audioEngine.updateSoloState(updatedTracks);
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

          return (
            <div
              key={track.id}
              className={`track-row ${isDragging ? 'dragging' : ''} ${isSelected ? 'selected' : ''} ${isDragOver ? 'drag-over' : ''}`}
              style={{
                opacity: isDragging ? 0.4 : 1,
                borderLeft: `3px solid ${color}`,
                transform: isDragOver ? 'translateY(2px)' : 'none',
                transition: 'transform 0.15s ease-out, opacity 0.15s ease-out'
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
                isPlaying={isPlaying && !track.muted}
              />

              <div className="track-info">
                <div className="track-name">{track.name}</div>
                <div className="track-sample" style={{ color: color }}>
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
                  <span className="control-value">{track.pan > 0 ? `R${track.pan}` : track.pan < 0 ? `L${Math.abs(track.pan)}` : 'C'}</span>
                </div>

                <div className="button-group">
                  <button
                    className={`btn-mute ${track.muted ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMuteToggle(track);
                    }}
                    title="静音"
                  >
                    M
                  </button>
                  <button
                    className={`btn-solo ${track.solo ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSoloToggle(track, tracks);
                    }}
                    title="独奏"
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
            <span>暂无音轨，点击上方"添加"按钮创建音轨</span>
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
            🗑 删除音轨
          </button>
        </div>
      )}

      <style>{`
        .tracklist-container {
          display: flex;
          flex-direction: column;
          height: