import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  Play,
  Pause,
  Square as StopIcon,
  Download,
  Layers
} from 'lucide-react';
import { usePixelState } from './PixelState';
import { renderFrameThumbnail } from './utils/canvasUtils';
import { Frame } from './types';

interface FramePanelProps {
  onExportClick: () => void;
}

const FramePanel: React.FC<FramePanelProps> = ({ onExportClick }) => {
  const { state, dispatch } = usePixelState();
  const { frames, currentFrameIndex, width, height } = state.project;
  const playback = state.playback;
  const onion = state.onionSkin;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragDataRef = useRef<{ startX: number; startIdx: number } | null>(null);

  const thumbsCache = useRef<Map<string, string>>(new Map());

  const thumbnails = useMemo(() => {
    return frames.map(f => {
      if (!thumbsCache.current.has(f.id)) {
        thumbsCache.current.set(f.id, renderFrameThumbnail(f, width, height, 64));
      }
      return thumbsCache.current.get(f.id)!;
    });
  }, [frames, width, height]);

  useEffect(() => {
    thumbsCache.current.clear();
  }, [width, height]);

  const togglePlay = () => {
    dispatch({ type: 'SET_PLAYING', payload: !playback.isPlaying });
  };
  const stopPlay = () => {
    dispatch({ type: 'SET_PLAYING', payload: false });
    dispatch({ type: 'SET_CURRENT_FRAME', payload: 0 });
  };

  const handleAddFrame = () => dispatch({ type: 'ADD_FRAME' });
  const handleDeleteFrame = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'DELETE_FRAME', payload: idx });
  };
  const handleDuplicateFrame = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'DUPLICATE_FRAME', payload: idx });
  };
  const handleSelectFrame = (idx: number) => {
    if (!playback.isPlaying) {
      dispatch({ type: 'SET_CURRENT_FRAME', payload: idx });
    }
  };

  const handleDragStart = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    setDragIdx(index);
    dragDataRef.current = { startX: e.clientX, startIdx: index };
    const onMove = (ev: MouseEvent) => {
      if (!dragDataRef.current) return;
      const cardWidth = 86;
      const delta = ev.clientX - dragDataRef.current.startX;
      const offset = Math.round(delta / cardWidth);
      const newIndex = Math.max(0, Math.min(frames.length - 1, dragDataRef.current.startIdx + offset));
      setDragOverIdx(newIndex);
    };
    const onUp = () => {
      if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
        dispatch({ type: 'MOVE_FRAME', payload: { from: dragIdx, to: dragOverIdx } });
        thumbsCache.current.clear();
      }
      setDragIdx(null);
      setDragOverIdx(null);
      dragDataRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div style={styles.container}>
      <div style={styles.topRow}>
        <div style={styles.leftControls}>
          <span style={styles.sectionTitle}>帧 ({frames.length})</span>
          <button style={styles.iconBtn} onClick={handleAddFrame} title="新建帧">
            <Plus size={15} color="#569cd6" />
          </button>
          <button
            style={{ ...styles.iconBtn, marginLeft: '6px' }}
            onClick={onExportClick}
            title="导出动画"
          >
            <Download size={15} color="#569cd6" />
          </button>
        </div>

        <div style={styles.onionControls}>
          <label style={styles.smallLabel}>洋葱皮</label>
          <button
            style={{
              ...styles.toggleBtn,
              backgroundColor: onion.enabled ? '#1c4f82' : '#3c3c3c',
              borderColor: onion.enabled ? '#569cd6' : '#555'
            }}
            onClick={() => dispatch({ type: 'SET_ONION_SKIN_ENABLED', payload: !onion.enabled })}
            title={onion.enabled ? '关闭洋葱皮' : '开启洋葱皮'}
          >
            <Layers size={14} color={onion.enabled ? '#569cd6' : '#888'} />
          </button>
          <label style={styles.smallLabel}>帧数 {onion.frameCount}</label>
          <input
            type="range" min={1} max={5} value={onion.frameCount}
            style={styles.range}
            onChange={(e) => dispatch({ type: 'SET_ONION_SKIN_FRAME_COUNT', payload: Number(e.target.value) })}
          />
          <label style={styles.smallLabel}>透明度 {onion.opacity}%</label>
          <input
            type="range" min={10} max={50} value={onion.opacity}
            style={styles.range}
            onChange={(e) => dispatch({ type: 'SET_ONION_SKIN_OPACITY', payload: Number(e.target.value) })}
          />
        </div>
      </div>

      <div ref={scrollRef} style={styles.framesRow}>
        {frames.map((frame: Frame, idx: number) => {
          const isCurrent = idx === currentFrameIndex;
          const isPlaying = playback.isPlaying && isCurrent;
          const isDrag = dragIdx === idx;
          return (
            <div
              key={frame.id}
              onClick={() => handleSelectFrame(idx)}
              style={{
                ...styles.frameCard,
                border: `2px solid ${isPlaying ? '#5cb85c' : isCurrent ? '#ffffff' : '#444'}`,
                opacity: isDrag ? 0.4 : 1,
                backgroundColor: isCurrent ? '#2a2a2a' : '#262626'
              }}
              onMouseDown={(e) => handleDragStart(idx, e)}
            >
              <div style={styles.thumbWrap}>
                <img
                  src={thumbnails[idx]}
                  style={styles.thumb}
                  alt={`帧 ${idx + 1}`}
                  draggable={false}
                />
              </div>
              <div style={styles.frameMeta}>
                <span style={styles.frameNum}>#{idx + 1}</span>
                <div style={styles.frameBtns}>
                  <button onClick={(e) => handleDuplicateFrame(idx, e)} style={styles.miniBtn} title="复制帧">
                    <Copy size={12} color="#888" />
                  </button>
                  {frames.length > 1 && (
                    <button onClick={(e) => handleDeleteFrame(idx, e)} style={styles.miniBtn} title="删除帧">
                      <Trash2 size={12} color="#e06c75" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={styles.bottomRow}>
        <div style={styles.playControls}>
          <button
            style={{
              ...styles.playBtn,
              backgroundColor: playback.isPlaying ? '#1c4f82' : '#3c3c3c'
            }}
            onClick={togglePlay}
            title={playback.isPlaying ? '暂停' : '播放'}
          >
            {playback.isPlaying ? (
              <Pause size={16} color="#569cd6" />
            ) : (
              <Play size={16} color="#cccccc" />
            )}
          </button>
          <button style={styles.playBtn} onClick={stopPlay} title="停止">
            <StopIcon size={16} color="#cccccc" />
          </button>
          <label style={styles.smallLabel}>FPS</label>
          <input
            type="range" min={4} max={24} value={playback.fps}
            style={styles.range}
            onChange={(e) => dispatch({ type: 'SET_FPS', payload: Number(e.target.value) })}
          />
          <span style={styles.fpsValue}>{playback.fps}</span>
        </div>
        <div style={{ fontSize: '11px', color: '#666' }}>
          {width}×{height} px
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#1e1e1e',
    borderTop: '1px solid #3e3e42',
    padding: '10px 16px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    userSelect: 'none',
    minHeight: '140px'
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px'
  },
  leftControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#ddd',
    marginRight: '8px'
  },
  iconBtn: {
    width: '28px',
    height: '28px',
    border: '1px solid #444',
    borderRadius: '5px',
    backgroundColor: '#3c3c3c',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    outline: 'none',
    transition: 'all 0.1s'
  },
  onionControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap'
  },
  smallLabel: {
    fontSize: '11px',
    color: '#888'
  },
  toggleBtn: {
    width: '28px',
    height: '28px',
    border: '1px solid #555',
    borderRadius: '5px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    outline: 'none'
  },
  range: {
    width: '70px',
    height: '4px',
    accentColor: '#569cd6',
    cursor: 'pointer'
  },
  framesRow: {
    display: 'flex',
    gap: '10px',
    overflowX: 'auto',
    overflowY: 'hidden',
    padding: '4px 2px 8px',
    alignItems: 'stretch'
  },
  frameCard: {
    flexShrink: 0,
    width: '80px',
    padding: '4px',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.15s ease-out',
    display: 'flex',
    flexDirection: 'column'
  },
  thumbWrap: {
    width: '100%',
    aspectRatio: '1',
    backgroundColor: '#333',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '4px'
  },
  thumb: {
    width: '100%',
    height: '100%',
    imageRendering: 'pixelated',
    objectFit: 'contain',
    display: 'block'
  },
  frameMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 2px'
  },
  frameNum: {
    fontSize: '11px',
    color: '#888',
    fontWeight: 500
  },
  frameBtns: {
    display: 'flex',
    gap: '2px'
  },
  miniBtn: {
    width: '20px',
    height: '20px',
    border: 'none',
    borderRadius: '3px',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    outline: 'none'
  },
  bottomRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px'
  },
  playControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  playBtn: {
    width: '34px',
    height: '34px',
    border: '1px solid #444',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    outline: 'none',
    transition: 'all 0.1s'
  },
  fpsValue: {
    fontSize: '12px',
    color: '#ccc',
    minWidth: '20px',
    textAlign: 'right',
    fontWeight: 600
  }
};

export default FramePanel;
