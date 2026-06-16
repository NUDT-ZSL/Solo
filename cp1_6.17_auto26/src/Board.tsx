import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Card from './Card';
import type { CardData, ThemeColor } from './types';
import { clamp, aabbIntersects } from './utils';
import { THEMES } from './themes';

interface BoardProps {
  cards: CardData[];
  selectedIds: Set<string>;
  onSelection: (ids: Set<string>) => void;
  onAddCard: (url: string, x: number, y: number) => void;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onUpdateTags: (id: string, tags: string[]) => void;
  onAddRating: (cardId: string, score: 1 | 2 | 3 | 4 | 5) => void;
  onAddComment: (cardId: string, content: string) => void;
  onCreateMoodBoard: () => void;
  ratingFilter: number;
  onRatingFilterChange: (v: number) => void;
  hasSelection: boolean;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 4;
const ZOOM_DAMPING = 0.85;

const ToolButton: React.FC<{
  icon: string;
  label: string;
  expanded: boolean;
  active?: boolean;
  activeColor?: string;
  onClick?: () => void;
}> = ({ icon, label, expanded, active, activeColor, onClick }) => (
  <button
    onClick={onClick}
    style={{
      width: '100%',
      padding: expanded ? '10px 16px' : '10px 0',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      borderRadius: 8,
      background: active ? (activeColor || '#E3F2FD') : 'transparent',
      color: active ? '#1565C0' : '#455A64',
      fontSize: 14,
      whiteSpace: 'nowrap',
      transition: 'background 0.2s ease, color 0.2s ease'
    }}
    onMouseEnter={(e) => {
      if (!active) {
        (e.currentTarget as HTMLButtonElement).style.background = '#F5F5F5';
      }
    }}
    onMouseLeave={(e) => {
      if (!active) {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }
    }}
  >
    <span style={{
      fontSize: 20,
      width: 20,
      textAlign: 'center',
      flexShrink: 0,
      marginLeft: expanded ? 0 : 'auto',
      marginRight: expanded ? 0 : 'auto'
    }}>{icon}</span>
    {expanded && <span style={{ fontWeight: 500 }}>{label}</span>}
  </button>
);

const Board: React.FC<BoardProps> = ({
  cards,
  selectedIds,
  onSelection,
  onAddCard,
  onUpdatePosition,
  onUpdateTags,
  onAddRating,
  onAddComment,
  onCreateMoodBoard,
  ratingFilter,
  onRatingFilterChange,
  hasSelection
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [toolbarExpanded, setToolbarExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const panRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const [, forceRender] = useState(0);
  const tickRef = useRef<number | null>(null);

  const viewportRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const isSelectingRef = useRef(false);
  const selectionStartRef = useRef({ x: 0, y: 0 });
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const draggingIdRef = useRef<string | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, cardX: 0, cardY: 0 });
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeTheme: ThemeColor = 'cool';

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const scheduleRender = useCallback(() => {
    if (tickRef.current !== null) return;
    tickRef.current = requestAnimationFrame(() => {
      tickRef.current = null;
      forceRender(n => n + 1);
    });
  }, []);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const offsetX = isMobile ? 0 : (toolbarExpanded ? 200 : 48);
    const offsetY = isMobile ? 0 : 0;
    const x = (sx - rect.left - offsetX - viewportRef.current.x) / scaleRef.current + panRef.current.x;
    const y = (sy - rect.top - offsetY - viewportRef.current.y) / scaleRef.current + panRef.current.y;
    return { x, y };
  }, [toolbarExpanded, isMobile]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.01;
    const factor = 1 + delta * (1 - ZOOM_DAMPING);
    const newScale = clamp(scaleRef.current * factor, MIN_SCALE, MAX_SCALE);
    const worldPoint = screenToWorld(e.clientX, e.clientY);
    const actualFactor = newScale / scaleRef.current;
    panRef.current.x = worldPoint.x - (worldPoint.x - panRef.current.x) / actualFactor;
    panRef.current.y = worldPoint.y - (worldPoint.y - panRef.current.y) / actualFactor;
    scaleRef.current = newScale;
    scheduleRender();
  }, [screenToWorld, scheduleRender]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    const btn = e.button as number;
    if (btn !== 0 && btn !== 1 && btn !== 2) return;
    const target = e.target as HTMLElement;
    if (target.closest('.card-element')) return;
    const world = screenToWorld(e.clientX, e.clientY);

    if (e.altKey || btn === 1 || btn === 2) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: panRef.current.x, panY: panRef.current.y };
      return;
    }

    isSelectingRef.current = true;
    selectionStartRef.current = { x: world.x, y: world.y };
    setSelectionBox({ x: world.x, y: world.y, w: 0, h: 0 });
    if (!e.shiftKey) {
      onSelection(new Set());
    }
  }, [screenToWorld, onSelection]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isPanningRef.current) {
        const dx = (e.clientX - panStartRef.current.x) / scaleRef.current;
        const dy = (e.clientY - panStartRef.current.y) / scaleRef.current;
        panRef.current.x = panStartRef.current.panX + dx;
        panRef.current.y = panStartRef.current.panY + dy;
        scheduleRender();
        return;
      }

      if (draggingIdRef.current) {
        const id = draggingIdRef.current;
        const dx = (e.clientX - dragStartRef.current.x) / scaleRef.current;
        const dy = (e.clientY - dragStartRef.current.y) / scaleRef.current;
        onUpdatePosition(id, dragStartRef.current.cardX + dx, dragStartRef.current.cardY + dy);
        return;
      }

      if (isSelectingRef.current) {
        const world = screenToWorld(e.clientX, e.clientY);
        const sx = selectionStartRef.current.x;
        const sy = selectionStartRef.current.y;
        const x = Math.min(sx, world.x);
        const y = Math.min(sy, world.y);
        const w = Math.abs(world.x - sx);
        const h = Math.abs(world.y - sy);
        setSelectionBox({ x, y, w, h });

        const newSelected = new Set<string>();
        cards.forEach(card => {
          if (aabbIntersects(x, y, w, h, card.x, card.y, card.width, card.height)) {
            newSelected.add(card.id);
          }
        });
        onSelection(newSelected);
      }
    };

    const onMouseUp = () => {
      isPanningRef.current = false;
      isSelectingRef.current = false;
      if (draggingIdRef.current) {
        draggingIdRef.current = null;
        setDraggingId(null);
      }
      setSelectionBox(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [screenToWorld, cards, onUpdatePosition, onSelection, scheduleRender]);

  const handleCardMouseDown = useCallback((e: React.MouseEvent, card: CardData) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    draggingIdRef.current = card.id;
    setDraggingId(card.id);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      cardX: card.x,
      cardY: card.y
    };
    if (!e.shiftKey) {
      onSelection(new Set([card.id]));
    } else {
      const next = new Set(selectedIds);
      if (next.has(card.id)) next.delete(card.id);
      else next.add(card.id);
      onSelection(next);
    }
  }, [selectedIds, onSelection]);

  const handleAddFromUrl = useCallback(() => {
    if (!urlInput.trim()) return;
    const center = screenToWorld(
      window.innerWidth / 2,
      window.innerHeight / 2
    );
    onAddCard(urlInput.trim(), center.x - 120, center.y - 140);
    setUrlInput('');
    setShowUrlInput(false);
  }, [urlInput, onAddCard, screenToWorld]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const center = screenToWorld(
      window.innerWidth / 2,
      window.innerHeight / 2
    );
    Array.from(files).forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        onAddCard(result, center.x - 120 + (idx % 2) * 280, center.y - 140 + Math.floor(idx / 2) * 320);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [onAddCard, screenToWorld]);

  const toolbarContent = useMemo(() => (
    <>
      <ToolButton
        icon="🖼"
        label="URL添加图片"
        expanded={!isMobile ? toolbarExpanded : true}
        active={showUrlInput}
        activeColor={THEMES[activeTheme].lightest}
        onClick={() => setShowUrlInput(v => !v)}
      />
      <ToolButton
        icon="📁"
        label="上传本地图片"
        expanded={!isMobile ? toolbarExpanded : true}
        onClick={() => fileInputRef.current?.click()}
      />
      <div style={{
        height: 1,
        background: '#ECEFF1',
        margin: '8px 12px'
      }} />
      <ToolButton
        icon="🎨"
        label="创建情绪板"
        expanded={!isMobile ? toolbarExpanded : true}
        active={hasSelection}
        activeColor={THEMES[activeTheme].lightest}
        onClick={onCreateMoodBoard}
      />
      <div style={{
        height: 1,
        background: '#ECEFF1',
        margin: '8px 12px'
      }} />
      <div style={{
        padding: toolbarExpanded || isMobile ? '8px 16px' : '8px 8px'
      }}>
        {(toolbarExpanded || isMobile) && (
          <div style={{ fontSize: 12, color: '#78909C', marginBottom: 6 }}>评分筛选</div>
        )}
        <div style={{
          display: 'flex',
          gap: 4,
          justifyContent: !isMobile && !toolbarExpanded ? 'center' : 'flex-start',
          flexWrap: isMobile ? 'nowrap' : 'wrap'
        }}>
          {[0, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => onRatingFilterChange(n)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                background: ratingFilter === n ? THEMES[activeTheme].lighter : '#F5F5F5',
                color: ratingFilter === n ? '#fff' : '#607D8B',
                fontSize: 12,
                fontWeight: ratingFilter === n ? 600 : 400,
                transition: 'all 0.2s'
              }}
            >
              {n === 0 ? '全部' : `${n}★+`}
            </button>
          ))}
        </div>
      </div>
    </>
  ), [toolbarExpanded, isMobile, showUrlInput, hasSelection, ratingFilter, activeTheme, onCreateMoodBoard, onRatingFilterChange]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      background: '#F5F5F5',
      position: 'relative'
    }}>
      {/* Toolbar */}
      <div
        onMouseEnter={() => !isMobile && setToolbarExpanded(true)}
        onMouseLeave={() => !isMobile && setToolbarExpanded(false)}
        style={{
          position: isMobile ? 'fixed' : 'relative',
          bottom: isMobile ? 0 : 'auto',
          left: 0,
          right: isMobile ? 0 : 'auto',
          zIndex: 100,
          width: isMobile ? '100%' : (toolbarExpanded ? 200 : 48),
          height: isMobile ? 'auto' : '100%',
          background: '#FFFFFF',
          borderRight: isMobile ? 'none' : '1px solid #ECEFF1',
          borderTop: isMobile ? '1px solid #ECEFF1' : 'none',
          boxShadow: isMobile ? '0 -4px 16px rgba(0,0,0,0.06)' : 'none',
          padding: isMobile ? '8px 12px' : '12px 4px',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: isMobile ? 'row' : 'column',
          gap: isMobile ? 4 : 2,
          alignItems: isMobile ? 'center' : 'stretch',
          overflowX: isMobile ? 'auto' : 'visible'
        }}
      >
        {toolbarContent}
      </div>

      {/* URL Input Modal */}
      {showUrlInput && (
        <div style={{
          position: 'fixed',
          top: isMobile ? 60 : 16,
          left: isMobile ? 16 : (toolbarExpanded ? 216 : 64),
          zIndex: 200,
          background: '#fff',
          padding: 12,
          borderRadius: 8,
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          display: 'flex',
          gap: 8,
          width: isMobile ? 'calc(100% - 32px)' : 360
        }}>
          <input
            type="text"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddFromUrl()}
            placeholder="输入图片URL..."
            autoFocus
            style={{
              flex: 1,
              border: '1px solid #E0E0E0',
              borderRadius: 6,
              padding: '8px 12px',
              fontSize: 13,
              minWidth: 0
            }}
          />
          <button
            onClick={handleAddFromUrl}
            style={{
              background: '#1565C0',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              whiteSpace: 'nowrap'
            }}
          >
            添加
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      {/* Canvas */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleCanvasMouseDown}
        onContextMenu={e => e.preventDefault()}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          cursor: isPanningRef.current ? 'grabbing' : (isSelectingRef.current ? 'crosshair' : 'grab'),
          marginBottom: isMobile ? 72 : 0,
          background: `
            radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px)
          `,
          backgroundSize: `${20 * scaleRef.current}px ${20 * scaleRef.current}px`,
          backgroundPosition: `${panRef.current.x * scaleRef.current + viewportRef.current.x}px ${panRef.current.y * scaleRef.current + viewportRef.current.y}px`
        }}
      >
        <div style={{
          position: 'absolute',
          inset: 0,
          transform: `translate3d(${viewportRef.current.x - panRef.current.x * scaleRef.current}px, ${viewportRef.current.y - panRef.current.y * scaleRef.current}px, 0) scale(${scaleRef.current})`,
          transformOrigin: '0 0',
          willChange: 'transform'
        }}>
          {cards.map(card => (
            <div key={card.id} className="card-element">
              <Card
                card={card}
                selected={selectedIds.has(card.id)}
                isDragging={draggingId === card.id}
                scale={scaleRef.current}
                onTagsChange={tags => onUpdateTags(card.id, tags)}
                onAddRating={score => onAddRating(card.id, score)}
                onAddComment={content => onAddComment(card.id, content)}
                onMouseDown={e => handleCardMouseDown(e, card)}
              />
            </div>
          ))}

          {selectionBox && (
            <div style={{
              position: 'absolute',
              left: selectionBox.x,
              top: selectionBox.y,
              width: selectionBox.w,
              height: selectionBox.h,
              background: 'rgba(21, 101, 192, 0.08)',
              border: '2px dashed #1565C0',
              borderRadius: 4,
              pointerEvents: 'none'
            }} />
          )}
        </div>

        {/* Scale indicator */}
        <div style={{
          position: 'absolute',
          bottom: isMobile ? 80 : 16,
          right: 16,
          background: 'rgba(255,255,255,0.9)',
          padding: '6px 12px',
          borderRadius: 6,
          fontSize: 12,
          color: '#546E7A',
          fontWeight: 500,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          backdropFilter: 'blur(4px)'
        }}>
          {Math.round(scaleRef.current * 100)}%
        </div>

        {/* Selection indicator */}
        {hasSelection && (
          <div style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'rgba(21, 101, 192, 0.95)',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 13,
            boxShadow: '0 4px 12px rgba(21,101,192,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <span>已选 {selectedIds.size} 张卡片</span>
            <button
              onClick={onCreateMoodBoard}
              style={{
                background: '#fff',
                color: '#1565C0',
                padding: '4px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600
              }}
            >
              创建情绪板
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Board;
