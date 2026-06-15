import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { Photo, Narrative, TimelineNode } from '../types';
import PhotoCard from './PhotoCard';
import { FileText, GripVertical, Trash2 } from 'lucide-react';

interface TimelineProps {
  photos: Photo[];
  narratives: Narrative[];
  onSelectPhoto: (photo: Photo) => void;
  selectedPhotoId?: string | null;
  onDeletePhoto: (id: string) => void;
  onDeleteNarrative: (id: string) => void;
  onUpdateNarrative: (id: string, data: Partial<Narrative>) => void;
  onReorder: (nodes: TimelineNode[]) => void;
  scrollToPhotoId?: string | null;
  onPhotoScrollComplete?: () => void;
}

const NODE_WIDTH = 344;

const Timeline: React.FC<TimelineProps> = ({
  photos,
  narratives,
  onSelectPhoto,
  selectedPhotoId,
  onDeletePhoto,
  onDeleteNarrative,
  onUpdateNarrative,
  onReorder,
  scrollToPhotoId,
  onPhotoScrollComplete,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingNarrative, setEditingNarrative] = useState<string | null>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const touchStartX = useRef<number>(0);
  const touchStartScroll = useRef<number>(0);
  const isTouchDragging = useRef(false);
  const lastTouchX = useRef<number>(0);
  const lastTouchTime = useRef<number>(0);
  const velocity = useRef<number>(0);

  const nodes: TimelineNode[] = useMemo(() => {
    const list: TimelineNode[] = [
      ...photos.map((p) => ({ type: 'photo' as const, data: p, orderIndex: p.orderIndex })),
      ...narratives.map((n) => ({ type: 'narrative' as const, data: n, orderIndex: n.orderIndex })),
    ];
    list.sort((a, b) => a.orderIndex - b.orderIndex);
    return list;
  }, [photos, narratives]);

  useEffect(() => {
    if (scrollToPhotoId && wrapperRef.current) {
      const idx = nodes.findIndex((n) => n.type === 'photo' && (n.data as Photo).id === scrollToPhotoId);
      if (idx >= 0 && nodeRefs.current[idx]) {
        wrapperRef.current.scrollTo({ left: idx * NODE_WIDTH - wrapperRef.current.clientWidth / 2 + NODE_WIDTH / 2, behavior: 'smooth' });
        setTimeout(() => onPhotoScrollComplete?.(), 800);
      }
    }
  }, [scrollToPhotoId, nodes, onPhotoScrollComplete]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartScroll.current = wrapperRef.current?.scrollLeft ?? 0;
    isTouchDragging.current = true;
    lastTouchX.current = e.touches[0].clientX;
    lastTouchTime.current = Date.now();
    velocity.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!wrapperRef.current || !isTouchDragging.current) return;
    const currentX = e.touches[0].clientX;
    const now = Date.now();
    const dt = now - lastTouchTime.current;
    if (dt > 0) {
      velocity.current = (lastTouchX.current - currentX) / dt;
    }
    lastTouchX.current = currentX;
    lastTouchTime.current = now;
    const delta = currentX - touchStartX.current;
    wrapperRef.current.scrollLeft = touchStartScroll.current - delta;
  };

  const handleTouchEnd = () => {
    isTouchDragging.current = false;
    if (wrapperRef.current && Math.abs(velocity.current) > 0.3) {
      const momentum = velocity.current * 200;
      const currentScroll = wrapperRef.current.scrollLeft;
      const targetScroll = currentScroll + momentum;
      wrapperRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  };

  const handleDragStart = (idx: number) => (e: React.DragEvent) => {
    setDragIndex(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };

  const handleDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverIndex(idx);
  };

  const handleDragEnd = () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const newNodes = [...nodes];
      const [removed] = newNodes.splice(dragIndex, 1);
      newNodes.splice(dragOverIndex, 0, removed);
      const reordered = newNodes.map((n, i) => ({ ...n, orderIndex: i }));
      onReorder(reordered);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div
      ref={wrapperRef}
      style={{
        height: '100%',
        overflowX: 'auto',
        overflowY: 'hidden',
        padding: '40px 24px 24px',
        position: 'relative',
        minWidth: '100%',
        WebkitOverflowScrolling: 'touch',
        willChange: 'transform',
        touchAction: 'pan-y',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          minWidth: 'max-content',
          position: 'relative',
          padding: '80px 40px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, #e0e0e0, #90caf9)',
            transform: 'translateY(-50%)',
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />

        {nodes.map((node, idx) => {
          const isDragging = dragIndex === idx;
          const isDragTarget = dragOverIndex === idx && dragIndex !== idx;

          return (
            <div
              key={`${node.type}-${node.data.id}`}
              ref={(el) => { nodeRefs.current[idx] = el; }}
              draggable
              onDragStart={handleDragStart(idx)}
              onDragOver={handleDragOver(idx)}
              onDrop={handleDragEnd}
              onDragEnd={handleDragEnd}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: NODE_WIDTH,
                opacity: isDragging ? 0.4 : 1,
                transform: isDragTarget ? 'scale(1.02)' : 'none',
                transition: 'transform 0.2s, opacity 0.2s',
              }}
            >
              {node.type === 'photo' ? (
                <PhotoCard
                  photo={node.data as Photo}
                  onSelect={onSelectPhoto}
                  onDelete={onDeletePhoto}
                  isSelected={selectedPhotoId === (node.data as Photo).id}
                />
              ) : (
                <NarrativeCard
                  narrative={node.data as Narrative}
                  onDelete={onDeleteNarrative}
                  onUpdate={onUpdateNarrative}
                  editing={editingNarrative === node.data.id}
                  onToggleEdit={() => setEditingNarrative(editingNarrative === node.data.id ? null : node.data.id)}
                />
              )}
            </div>
          );
        })}

        {nodes.length === 0 && (
          <div style={{
            width: '100vw',
            minWidth: '100%',
            height: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#aaa',
            fontSize: 16,
            flexDirection: 'column',
            gap: 12,
          }}>
            <div style={{ fontSize: 48 }}>📸</div>
            <div>暂无照片，请先在下方上传旅行照片</div>
          </div>
        )}
      </div>
    </div>
  );
};

interface NarrativeCardProps {
  narrative: Narrative;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<Narrative>) => void;
  editing: boolean;
  onToggleEdit: () => void;
}

const NarrativeCard: React.FC<NarrativeCardProps> = ({ narrative, onDelete, onUpdate, editing, onToggleEdit }) => {
  const [draftTitle, setDraftTitle] = useState(narrative.title);
  const [draftContent, setDraftContent] = useState(narrative.content);

  useEffect(() => {
    setDraftTitle(narrative.title);
    setDraftContent(narrative.content);
  }, [narrative.title, narrative.content, editing]);

  const saveDraft = () => {
    onUpdate(narrative.id, { title: draftTitle, content: draftContent });
    onToggleEdit();
  };

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 12px', minWidth: NODE_WIDTH, flex: '0 0 auto' }}>
      <div
        style={{
          width: 280,
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(8px)',
          borderRadius: 16,
          padding: 20,
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          border: '1px solid rgba(255,255,255,0.6)',
          position: 'relative',
          zIndex: 2,
        }}
        onClick={(e) => { if (!editing && (e.target as HTMLElement).tagName !== 'BUTTON') onToggleEdit(); }}
      >
        <div style={{
          position: 'absolute',
          top: 8,
          right: 8,
          display: 'flex',
          gap: 4,
          opacity: editing ? 1 : 0.6,
          transition: 'opacity 0.2s',
        }}>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              width: 26, height: 26, borderRadius: '50%',
              background: editing ? '#1e88e5' : 'rgba(0,0,0,0.08)',
              color: editing ? '#fff' : '#666',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: editing ? 'pointer' : 'grab',
            }}
            title="拖拽调整位置"
          >
            <GripVertical size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(narrative.id); }}
            style={{
              width: 26, height: 26, borderRadius: '50%',
              background: 'rgba(0,0,0,0.08)', color: '#e53935',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            title="删除幕布"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {editing ? (
          <div onClick={(e) => e.stopPropagation()}>
            <input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="幕布标题..."
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #ddd',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                color: '#1565c0',
                marginBottom: 10,
                outline: 'none',
              }}
            />
            <textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              placeholder="输入幕布内容，可使用HTML标签..."
              rows={4}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #ddd',
                borderRadius: 8,
                fontSize: 13,
                lineHeight: 1.6,
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={onToggleEdit}
                style={{
                  padding: '6px 14px', borderRadius: 6,
                  background: '#f5f5f5', color: '#666', fontSize: 12,
                }}
              >
                取消
              </button>
              <button
                onClick={saveDraft}
                style={{
                  padding: '6px 14px', borderRadius: 6,
                  background: '#1e88e5', color: '#fff', fontSize: 12, fontWeight: 500,
                }}
              >
                保存
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <FileText size={14} color="#1565c0" />
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1565c0', margin: 0 }}>
                {narrative.title || '点击编辑幕布'}
              </h3>
            </div>
            {narrative.content ? (
              <div
                style={{
                  fontSize: 13, lineHeight: 1.7, color: '#444',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}
                dangerouslySetInnerHTML={{ __html: narrative.content }}
              />
            ) : (
              <p style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic' }}>点击添加幕布文字...</p>
            )}
          </>
        )}
      </div>

      <div style={{
        width: 16, height: 16, borderRadius: '50%',
        background: '#ff5722', border: '3px solid #fff',
        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        margin: '16px 0',
        zIndex: 3,
      }} />
    </div>
  );
};

export default Timeline;
