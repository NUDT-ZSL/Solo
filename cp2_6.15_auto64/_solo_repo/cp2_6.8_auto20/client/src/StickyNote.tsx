import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface StickyNoteData {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
}

interface StickyNoteProps {
  note: StickyNoteData;
  isDragging?: boolean;
  onMove: (id: string, x: number, y: number) => void;
  onUpdate: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: (id: string) => void;
  zIndex: number;
  onFocus: (id: string) => void;
}

const COLORS: Record<string, { bg: string; text: string; header: string }> = {
  '#FFF9C4': { bg: '#FFF9C4', text: '#3E2723', header: '#F9A825' },
  '#FFCDD2': { bg: '#FFCDD2', text: '#3E2723', header: '#E57373' },
  '#C8E6C9': { bg: '#C8E6C9', text: '#1B5E20', header: '#81C784' },
  '#B3E5FC': { bg: '#B3E5FC', text: '#01579B', header: '#4FC3F7' },
  '#E1BEE7': { bg: '#E1BEE7', text: '#4A148C', header: '#BA68C8' },
  '#B2DFDB': { bg: '#B2DFDB', text: '#004D40', header: '#4DB6AC' },
};

function getColorStyle(color: string) {
  return COLORS[color] || COLORS['#FFF9C4'];
}

const StickyNote: React.FC<StickyNoteProps> = ({
  note,
  isDragging,
  onMove,
  onUpdate,
  onDelete,
  onDragStart,
  onDragEnd,
  zIndex,
  onFocus,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(note.text);
  const [localPosition, setLocalPosition] = useState({ x: note.x, y: note.y });
  const dragRef = useRef<{
    startX: number;
    startY: number;
    noteStartX: number;
    noteStartY: number;
    dragging: boolean;
  } | null>(null);
  const syncTimer = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);

  const colorStyle = getColorStyle(note.color);

  useEffect(() => {
    if (!dragRef.current?.dragging) {
      setLocalPosition({ x: note.x, y: note.y });
    }
  }, [note.x, note.y]);

  useEffect(() => {
    if (!isEditing) {
      setEditText(note.text);
    }
  }, [note.text, isEditing]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const scheduleSync = useCallback(
    (text: string) => {
      if (syncTimer.current) {
        window.clearTimeout(syncTimer.current);
      }
      syncTimer.current = window.setTimeout(() => {
        onUpdate(note.id, text);
      }, 300);
    },
    [note.id, onUpdate]
  );

  const handleTextDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    onFocus(note.id);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setEditText(newText);
    scheduleSync(newText);
  };

  const finishEditing = useCallback(() => {
    if (isEditing) {
      setIsEditing(false);
      if (syncTimer.current) {
        window.clearTimeout(syncTimer.current);
        syncTimer.current = null;
      }
      onUpdate(note.id, editText);
    }
  }, [isEditing, editText, note.id, onUpdate]);

  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      finishEditing();
    }
  };

  const handleHeaderMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onFocus(note.id);

    const point = 'touches' in e ? e.touches[0] : e;
    dragRef.current = {
      startX: point.clientX,
      startY: point.clientY,
      noteStartX: localPosition.x,
      noteStartY: localPosition.y,
      dragging: true,
    };
    onDragStart(note.id);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!dragRef.current?.dragging) return;
      const point = 'touches' in e ? e.touches[0] : (e as MouseEvent);
      const dx = point.clientX - dragRef.current.startX;
      const dy = point.clientY - dragRef.current.startY;
      const newX = dragRef.current.noteStartX + dx;
      const newY = dragRef.current.noteStartY + dy;
      setLocalPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      if (!dragRef.current?.dragging) return;
      dragRef.current.dragging = false;
      onMove(note.id, localPosition.x, localPosition.y);
      onDragEnd(note.id);
      dragRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [note.id, onMove, onDragEnd, localPosition.x, localPosition.y]);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(note.id);
  };

  return (
    <div
      ref={noteRef}
      style={{
        position: 'absolute',
        left: localPosition.x,
        top: localPosition.y,
        width: 'clamp(160px, 200px, 240px)',
        height: 'clamp(160px, 200px, 240px)',
        backgroundColor: colorStyle.bg,
        color: colorStyle.text,
        borderRadius: '8px',
        boxShadow: isDragging
          ? '0 8px 16px rgba(0,0,0,0.2)'
          : '0 2px 6px rgba(0,0,0,0.12)',
        transform: isDragging ? 'scale(1.05)' : 'scale(1)',
        transition: isDragging ? 'none' : 'box-shadow 0.2s, transform 0.15s',
        zIndex,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        cursor: 'default',
      }}
      onMouseDown={() => onFocus(note.id)}
    >
      <div
        onMouseDown={handleHeaderMouseDown}
        onTouchStart={handleHeaderMouseDown}
        style={{
          height: '24px',
          backgroundColor: colorStyle.header,
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 6px',
          flexShrink: 0,
        }}
      >
        <button
          onClick={handleDelete}
          style={{
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'rgba(255,255,255,0.7)',
            color: colorStyle.text,
            cursor: 'pointer',
            fontSize: '12px',
            lineHeight: '1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              'rgba(255,255,255,1)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              'rgba(255,255,255,0.7)';
          }}
          title="删除便签"
        >
          ×
        </button>
      </div>

      <div
        style={{
          flex: 1,
          padding: '12px',
          overflow: 'hidden',
        }}
        onDoubleClick={handleTextDoubleClick}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={handleTextChange}
            onKeyDown={handleTextKeyDown}
            onBlur={finishEditing}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              outline: 'none',
              resize: 'none',
              backgroundColor: 'transparent',
              color: colorStyle.text,
              fontSize: '14px',
              lineHeight: '1.5',
              fontFamily: 'inherit',
            }}
            placeholder="输入内容..."
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              fontSize: '14px',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              overflow: 'hidden',
              cursor: 'text',
            }}
          >
            {note.text || <span style={{ opacity: 0.5 }}>双击编辑...</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default StickyNote;
