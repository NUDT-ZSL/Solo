import React, { useState, useRef, useEffect } from 'react';
import type { StickyNote as StickyNoteType } from '../types';
import { COLOR_PALETTE } from '../types';

interface StickyNoteProps {
  note: StickyNoteType;
  isGraphMode: boolean;
  onUpdate: (id: string, updates: Partial<StickyNoteType>) => void;
  onDelete: (id: string) => void;
  onStartDrag: (id: string, e: React.MouseEvent) => void;
  onStartConnection: (id: string, e: React.MouseEvent) => void;
  onDoubleClick: (id: string) => void;
  isMobile: boolean;
}

const StickyNote: React.FC<StickyNoteProps> = ({
  note,
  isGraphMode,
  onUpdate,
  onDelete,
  onStartDrag,
  onStartConnection,
  onDoubleClick,
  isMobile
}) => {
  const [editText, setEditText] = useState(note.text);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [fontSize, setFontSize] = useState(12);

  const width = isMobile ? 100 : 120;
  const height = isMobile ? 80 : 100;

  useEffect(() => {
    if (note.isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [note.isEditing]);

  useEffect(() => {
    setEditText(note.text);
  }, [note.text]);

  const cycleColor = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIndex = (note.colorIndex + 1) % COLOR_PALETTE.length;
    onUpdate(note.id, {
      color: COLOR_PALETTE[nextIndex],
      colorIndex: nextIndex
    });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(note.id);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditText(e.target.value);
  };

  const handleBlur = () => {
    onUpdate(note.id, { text: editText, isEditing: false });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      inputRef.current?.blur();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;
    if ((e.target as HTMLElement).closest('.note-actions')) return;
    onStartDrag(note.id, e);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDoubleClick(note.id);
  };

  if (isGraphMode) {
    return null;
  }

  if (note.isFullscreen) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }}
        onClick={() => onUpdate(note.id, { isFullscreen: false, isEditing: false })}
      >
        <div
          style={{
            background: note.color,
            padding: 32,
            borderRadius: 16,
            minWidth: 400,
            maxWidth: 600,
            maxHeight: '80vh',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            animation: 'scaleIn 0.25s ease-out'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <textarea
            ref={inputRef}
            value={editText}
            onChange={handleTextChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              minHeight: 300,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 16,
              lineHeight: 1.8,
              fontFamily: 'inherit',
              resize: 'none'
            }}
            placeholder="在这里输入内容..."
          />
        </div>
      </div>
    );
  }

  const titleText = note.text.slice(0, 15);
  const bodyText = note.text.slice(15);

  return (
    <div
      style={{
        position: 'absolute',
        left: note.x,
        top: note.y,
        width,
        height,
        background: note.color,
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        cursor: 'grab',
        userSelect: 'none',
        animation: 'noteEnter 0.3s ease-out',
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      <div
        className="note-actions"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 4
        }}
      >
        <button
          onClick={cycleColor}
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            border: '1px solid rgba(0,0,0,0.1)',
            background: note.color,
            cursor: 'pointer',
            padding: 0,
            transition: 'transform 0.15s'
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.2)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
          title="切换颜色"
        />
        <button
          onClick={handleDelete}
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: '#666',
            fontSize: 14,
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
            padding: 0
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = '#e74c3c';
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(231,76,60,0.1)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = '#666';
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
          title="删除便签"
        >
          ×
        </button>
      </div>

      {note.isEditing ? (
        <textarea
          ref={inputRef}
          value={editText}
          onChange={handleTextChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: fontSize,
            fontFamily: 'inherit',
            resize: 'none',
            lineHeight: 1.5
          }}
        />
      ) : (
        <div style={{ flex: 1, overflow: 'hidden', fontSize }}>
          {note.text ? (
            <>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                {titleText}
              </div>
              {bodyText && (
                <div
                  style={{
                    fontSize,
                    lineHeight: 1.6,
                    color: '#444'
                  }}
                >
                  {bodyText}
                </div>
              )}
            </>
          ) : (
            <div style={{ color: '#999', fontStyle: 'italic', fontSize: 11 }}>
              双击编辑...
            </div>
          )}
        </div>
      )}

      {note.text.length > 30 && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 20,
            background: `linear-gradient(to top, ${note.color}, transparent)`,
            pointerEvents: 'none'
          }}
        />
      )}

      <div
        style={{
          position: 'absolute',
          right: -4,
          bottom: -4,
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#b8a9c9',
          cursor: 'crosshair',
          transition: 'transform 0.15s'
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.5)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onStartConnection(note.id, e);
        }}
        title="拖拽创建连线"
      />
    </div>
  );
};

export default StickyNote;
