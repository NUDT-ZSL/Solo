import React, { useRef, useEffect, useState } from 'react';
import { Frame, Layer, Stroke } from './types';

interface TimelineProps {
  frames: Frame[];
  currentFrameIndex: number;
  activeLayerId: string | null;
  onFrameSelect: (index: number) => void;
  onFrameAdd: () => void;
  onFrameDuplicate: (index: number) => void;
  onFrameDelete: (index: number) => void;
  onLayerSelect: (layerId: string) => void;
  onLayerAdd: () => void;
  onLayerVisibilityToggle: (layerId: string) => void;
  onLayerRename: (layerId: string, name: string) => void;
  onLayerReorder: (fromIndex: number, toIndex: number) => void;
}

const THUMB_WIDTH = 72;
const THUMB_HEIGHT = 54;
const LAYER_THUMB_WIDTH = 80;
const LAYER_THUMB_HEIGHT = 60;

const drawStrokeOnThumb = (ctx: CanvasRenderingContext2D, stroke: Stroke, scale: number) => {
  if (stroke.points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = Math.max(1, stroke.size * scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = stroke.opacity;
  
  if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
  }

  ctx.beginPath();
  const pts = stroke.points;
  ctx.moveTo(pts[0].x * scale, pts[0].y * scale);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x * scale, pts[i].y * scale);
  }
  ctx.stroke();
  ctx.restore();
};

const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
);

const LayersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

const FilmIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
    <line x1="7" y1="2" x2="7" y2="22" />
    <line x1="17" y1="2" x2="17" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="2" y1="7" x2="7" y2="7" />
    <line x1="2" y1="17" x2="7" y2="17" />
    <line x1="17" y1="17" x2="22" y2="17" />
    <line x1="17" y1="7" x2="22" y2="7" />
  </svg>
);

const FrameThumbnail: React.FC<{ frame: Frame }> = ({ frame }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, THUMB_WIDTH, THUMB_HEIGHT);
    const scale = 0.018;

    const sortedLayers = [...frame.layers].sort((a, b) => a.order - b.order);
    sortedLayers.filter(l => l.visible).forEach(layer => {
      layer.strokes.forEach(stroke => drawStrokeOnThumb(ctx, stroke, scale));
    });
  }, [frame]);

  return (
    <canvas
      ref={canvasRef}
      width={THUMB_WIDTH}
      height={THUMB_HEIGHT}
      style={{ width: '100%', height: '100%' }}
    />
  );
};

const LayerThumbnail: React.FC<{ layer: Layer }> = ({ layer }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, LAYER_THUMB_WIDTH, LAYER_THUMB_HEIGHT);
    const scale = 0.02;
    layer.strokes.forEach(stroke => drawStrokeOnThumb(ctx, stroke, scale));
  }, [layer]);

  return (
    <canvas
      ref={canvasRef}
      width={LAYER_THUMB_WIDTH}
      height={LAYER_THUMB_HEIGHT}
      style={{ width: '100%', height: '100%' }}
    />
  );
};

const Timeline: React.FC<TimelineProps> = ({
  frames,
  currentFrameIndex,
  activeLayerId,
  onFrameSelect,
  onFrameAdd,
  onFrameDuplicate,
  onFrameDelete,
  onLayerSelect,
  onLayerAdd,
  onLayerVisibilityToggle,
  onLayerRename,
  onLayerReorder
}) => {
  const [renamingLayerId, setRenamingLayerId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const currentFrame = frames[currentFrameIndex];
  const sortedLayers = currentFrame ? [...currentFrame.layers].sort((a, b) => a.order - b.order).reverse() : [];

  const handleDoubleClick = (layer: Layer) => {
    setRenamingLayerId(layer.id);
    setRenameValue(layer.name);
  };

  const handleRenameSubmit = (layerId: string) => {
    if (renameValue.trim()) {
      onLayerRename(layerId, renameValue.trim());
    }
    setRenamingLayerId(null);
    setRenameValue('');
  };

  const handleDragStart = (index: number) => {
    setDraggingIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (draggingIndex !== null && draggingIndex !== index) {
      const actualFrom = sortedLayers.length - 1 - draggingIndex;
      const actualTo = sortedLayers.length - 1 - index;
      onLayerReorder(actualFrom, actualTo);
    }
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  return (
    <>
      <div className="panel-header">
        <FilmIcon />
        帧时间轴
      </div>
      <div className="panel-section">
        <div className="frame-list">
          {frames.map((frame, index) => (
            <div
              key={frame.id}
              className={`frame-item ${index === currentFrameIndex ? 'active' : ''}`}
              onClick={() => onFrameSelect(index)}
            >
              <div className="frame-thumbnail">
                <FrameThumbnail frame={frame} />
              </div>
              <span className="frame-number">帧 {index + 1}</span>
            </div>
          ))}
          <button
            className="frame-item"
            onClick={onFrameAdd}
            style={{ justifyContent: 'center' }}
          >
            <div
              className="frame-thumbnail"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px dashed rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.02)'
              }}
            >
              <PlusIcon />
            </div>
            <span className="frame-number">添加</span>
          </button>
        </div>
        {frames.length > 0 && (
          <div className="btn-group" style={{ marginTop: '12px' }}>
            <button
              className="btn-secondary"
              onClick={() => onFrameDuplicate(currentFrameIndex)}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <CopyIcon />
                复制帧
              </span>
            </button>
            <button
              className="btn-secondary"
              onClick={() => onFrameDelete(currentFrameIndex)}
              disabled={frames.length <= 1}
              style={{ opacity: frames.length <= 1 ? 0.5 : 1 }}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <TrashIcon />
                删除
              </span>
            </button>
          </div>
        )}
      </div>

      <div className="panel-header">
        <LayersIcon />
        图层 ({sortedLayers.length}/5)
      </div>
      <div className="panel-section">
        <div className="layer-list">
          {sortedLayers.map((layer, displayIndex) => (
            <div
              key={layer.id}
              className={`layer-item ${layer.id === activeLayerId ? 'active' : ''} ${draggingIndex === displayIndex ? 'dragging' : ''}`}
              onClick={() => onLayerSelect(layer.id)}
              draggable
              onDragStart={() => handleDragStart(displayIndex)}
              onDragOver={(e) => handleDragOver(e, displayIndex)}
              onDrop={() => handleDrop(displayIndex)}
              onDragEnd={handleDragEnd}
              onDoubleClick={(e) => {
                e.stopPropagation();
                handleDoubleClick(layer);
              }}
              style={dragOverIndex === displayIndex && draggingIndex !== displayIndex ? {
                borderColor: 'var(--accent-blue)',
                transform: 'translateY(2px)'
              } : {}}
            >
              <div className="layer-thumbnail">
                <LayerThumbnail layer={layer} />
              </div>
              <div className="layer-info">
                {renamingLayerId === layer.id ? (
                  <input
                    className="layer-input"
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => handleRenameSubmit(layer.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRenameSubmit(layer.id);
                      if (e.key === 'Escape') {
                        setRenamingLayerId(null);
                        setRenameValue('');
                      }
                    }}
                    onClick={e => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <div className="layer-name">{layer.name}</div>
                )}
              </div>
              <div className="layer-controls">
                <button
                  className={`layer-btn ${layer.visible ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onLayerVisibilityToggle(layer.id);
                  }}
                  title={layer.visible ? '隐藏图层' : '显示图层'}
                >
                  {layer.visible ? <EyeIcon /> : <EyeOffIcon />}
                </button>
              </div>
            </div>
          ))}
        </div>
        {sortedLayers.length < 5 && (
          <button
            className="btn-secondary"
            onClick={onLayerAdd}
            style={{ marginTop: '12px' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <PlusIcon />
              添加图层
            </span>
          </button>
        )}
      </div>
    </>
  );
};

export default Timeline;
