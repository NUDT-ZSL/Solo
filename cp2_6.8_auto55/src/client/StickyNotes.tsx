import React, { useState, useRef, useCallback, useEffect } from 'react';
import { StickyNote } from '../shared/types';

interface StickyNotesProps {
  stickies: StickyNote[];
  currentUserId: string | null;
  offset: { x: number; y: number };
  scale: number;
  onAdd: (sticky: StickyNote) => void;
  onUpdate: (sticky: StickyNote) => void;
}

const StickyNotes: React.FC<StickyNotesProps> = ({
  stickies,
  currentUserId,
  offset,
  scale,
  onAdd,
  onUpdate,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [dragging, setDragging] = useState<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sorted = [...stickies].sort((a, b) => a.createdAt - b.createdAt);
  const myCount = stickies.filter((s) => s.userId === currentUserId).length;

  const handleAddSticky = useCallback(() => {
    if (!currentUserId) return;
    if (myCount >= 20) return;
    const viewCenterX = (window.innerWidth / 2 - offset.x) / scale;
    const viewCenterY = ((window.innerHeight - 48) / 2 - offset.y) / scale;
    const sizes = [
      { w: 100, h: 80 },
      { w: 150, h: 120 },
      { w: 200, h: 160 },
    ];
    const colors = ['#FFF9C4', '#E8F5E9', '#E3F2FD', '#F3E5F5'];
    const size = sizes[Math.floor(Math.random() * sizes.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const sticky: StickyNote = {
      id: `${currentUserId}-${Date.now()}`,
      userId: currentUserId,
      x: viewCenterX - size.w / 2 + (Math.random() - 0.5) * 80,
      y: viewCenterY - size.h / 2 + (Math.random() - 0.5) * 80,
      width: size.w,
      height: size.h,
      backgroundColor: color,
      text: '',
      createdAt: Date.now(),
    };
    onAdd(sticky);
    setEditingId(sticky.id);
    setEditText('');
  }, [currentUserId, myCount, offset, scale, onAdd]);

  useEffect(() => {
    if (editingId && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editingId]);

  const handleMouseDown = (e: React.MouseEvent, sticky: StickyNote) => {
    e.stopPropagation();
    if (editingId === sticky.id) return;
    setDragging({
      id: sticky.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: sticky.x,
      origY: sticky.y,
    });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging) return;
      const sticky = stickies.find((s) => s.id === dragging.id);
      if (!sticky) return;
      const dx = (e.clientX - dragging.startX) / scale;
      const dy = (e.clientY - dragging.startY) / scale;
      onUpdate({
        ...sticky,
        x: dragging.origX + dx,
        y: dragging.origY + dy,
      });
    },
    [dragging, scale, stickies, onUpdate]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  const handleDoubleClick = (e: React.MouseEvent, sticky: StickyNote) => {
    e.stopPropagation();
    if (sticky.userId !== currentUserId) return;
    setEditingId(sticky.id);
    setEditText(sticky.text);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value.slice(0, 100);
    setEditText(val);
  };

  const finishEditing = useCallback(() => {
    if (!editingId) return;
    const sticky = stickies.find((s) => s.id === editingId);
    if (sticky) {
      onUpdate({ ...sticky, text: editText });
    }
    setEditingId(null);
    setEditText('');
  }, [editingId, editText, stickies, onUpdate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
        finishEditing();
      }
    };
    if (editingId) {
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }
  }, [editingId, finishEditing]);

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          right: 20,
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 10,
        }}
      >
        <button
          onClick={handleAddSticky}
          disabled={!currentUserId || myCount >= 20}
          title={myCount >= 20 ? '便利贴已达上限（20张）' : '添加便利贴'}
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            border: 'none',
            background: currentUserId && myCount < 20 ? '#FFCC00' : '#3A3A3C',
            color: '#1C1C1E',
            fontSize: 22,
            fontWeight: 700,
            cursor: currentUserId && myCount < 20 ? 'pointer' : 'not-allowed',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (currentUserId && myCount < 20) e.currentTarget.style.transform = 'scale(1.08)';
          }}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          +
        </button>
        <div
          style={{
            fontSize: 10,
            color: '#8E8E93',
            textAlign: 'center',
          }}
        >
          {myCount}/20
        </div>
      </div>

      {sorted.map((sticky) => {
        const isEditing = editingId === sticky.id;
        const isMine = sticky.userId === currentUserId;
        return (
          <div
            key={sticky.id}
            onMouseDown={(e) => handleMouseDown(e, sticky)}
            onDoubleClick={(e) => handleDoubleClick(e, sticky)}
            style={{
              position: 'absolute',
              left: offset.x + sticky.x * scale,
              top: offset.y + sticky.y * scale,
              width: sticky.width * scale,
              height: sticky.height * scale,
              backgroundColor: sticky.backgroundColor,
              opacity: 0.92,
              borderRadius: 6,
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
              padding: Math.max(6, 8 * scale),
              cursor: isEditing ? 'text' : dragging?.id === sticky.id ? 'grabbing' : 'grab',
              userSelect: isEditing ? 'text' : 'none',
              zIndex: isEditing ? 100 : 5,
              transition: isEditing ? 'none' : 'box-shadow 0.2s ease',
              border: isMine ? 'none' : `1px solid rgba(0,0,0,0.15)`,
              overflow: 'hidden',
            }}
          >
            {isEditing ? (
              <textarea
                ref={textareaRef}
                value={editText}
                onChange={handleTextChange}
                onBlur={finishEditing}
                maxLength={100}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  resize: 'none',
                  fontSize: Math.max(10, 12 * scale),
                  lineHeight: 1.4,
                  color: '#1C1C1E',
                  fontFamily: 'inherit',
                }}
              />
            ) : (
              <div
                style={{
                  fontSize: Math.max(10, 12 * scale),
                  lineHeight: 1.4,
                  color: '#1C1C1E',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  height: '100%',
                  overflow: 'hidden',
                }}
              >
                {sticky.text || (
                  <span style={{ opacity: 0.4, fontStyle: 'italic' }}>
                    {isMine ? '双击编辑' : ''}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};

export default StickyNotes;
