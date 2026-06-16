import React, { useState, useRef, useEffect } from 'react';
import type { StickyNoteData } from '../logic/DataModel';
import {
  STICKY_NOTE_BG_COLOR,
  STICKY_NOTE_BORDER_COLOR,
  STICKY_NOTE_MIN_WIDTH,
  STICKY_NOTE_MIN_HEIGHT,
  STICKY_NOTE_MIN_FONT_SIZE,
  STICKY_NOTE_MAX_FONT_SIZE
} from '../logic/DataModel';
import { validateStickyNoteText, clamp } from '../logic/CoordinateUtils';

interface StickyNoteProps {
  note: StickyNoteData;
  scale: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (note: StickyNoteData) => void;
  onDelete: () => void;
}

const StickyNoteComponent: React.FC<StickyNoteProps> = ({
  note,
  scale,
  isSelected,
  onSelect,
  onUpdate,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(note.text);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing || isResizing) return;
    e.stopPropagation();
    onSelect();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - note.x * scale,
      y: e.clientY - note.y * scale
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const newX = (e.clientX - dragOffset.x) / scale;
    const newY = (e.clientY - dragOffset.y) / scale;
    onUpdate({
      ...note,
      x: newX,
      y: newY,
      updatedAt: Date.now()
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset, note, scale]);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
  };

  const handleResizeMouseMove = (e: MouseEvent) => {
    if (!isResizing || !noteRef.current) return;
    const rect = noteRef.current.getBoundingClientRect();
    const newWidth = clamp((e.clientX - rect.left) / scale, STICKY_NOTE_MIN_WIDTH, 500);
    const newHeight = clamp((e.clientY - rect.top) / scale, STICKY_NOTE_MIN_HEIGHT, 400);
    onUpdate({
      ...note,
      width: newWidth,
      height: newHeight,
      updatedAt: Date.now()
    });
  };

  const handleResizeMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMouseMove);
      document.addEventListener('mouseup', handleResizeMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleResizeMouseMove);
        document.removeEventListener('mouseup', handleResizeMouseUp);
      };
    }
  }, [isResizing, note, scale]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditText(note.text);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const validation = validateStickyNoteText(e.target.value);
    setEditText(validation.sanitizedText);
  };

  const handleBlur = () => {
    setIsEditing(false);
    const validation = validateStickyNoteText(editText);
    onUpdate({
      ...note,
      text: validation.sanitizedText,
      updatedAt: Date.now()
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditText(note.text);
    }
  };

  const handleFontSizeChange = (delta: number) => {
    const newSize = clamp(note.fontSize + delta, STICKY_NOTE_MIN_FONT_SIZE, STICKY_NOTE_MAX_FONT_SIZE);
    onUpdate({
      ...note,
      fontSize: newSize,
      updatedAt: Date.now()
    });
  };

  return (
    <div
      ref={noteRef}
      className={`sticky-note ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''}`}
      style={{
        left: note.x,
        top: note.y,
        width: note.width,
        height: note.height
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {isSelected && (
        <div className="sticky-note-toolbar">
          <button
            className="font-size-btn"
            onClick={(e) => { e.stopPropagation(); handleFontSizeChange(-2); }}
            title="减小字体"
          >
            A-
          </button>
          <span className="font-size-label">{note.fontSize}px</span>
          <button
            className="font-size-btn"
            onClick={(e) => { e.stopPropagation(); handleFontSizeChange(2); }}
            title="增大字体"
          >
            A+
          </button>
          <button
            className="delete-btn"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="删除"
          >
            ×
          </button>
        </div>
      )}

      {isEditing ? (
        <textarea
          ref={textareaRef}
          className="sticky-note-textarea"
          value={editText}
          onChange={handleTextChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{ fontSize: note.fontSize }}
        />
      ) : (
        <div
          className="sticky-note-content"
          style={{ fontSize: note.fontSize }}
        >
          {note.text || '双击编辑'}
        </div>
      )}

      <div
        className="resize-handle"
        onMouseDown={handleResizeMouseDown}
      >
        ⤡
      </div>

      <style>{`
        .sticky-note {
          position: absolute;
          background-color: ${STICKY_NOTE_BG_COLOR};
          border: 2px solid ${STICKY_NOTE_BORDER_COLOR};
          border-radius: 4px;
          cursor: move;
          user-select: none;
          box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.15);
          transition: box-shadow 0.1s ease-out, transform 0.1s ease-out;
          overflow: hidden;
        }

        .sticky-note.dragging,
        .sticky-note.resizing {
          box-shadow: 8px 8px 24px rgba(0, 0, 0, 0.3), 0 0 0 4px rgba(79, 195, 247, 0.1);
          z-index: 100;
          transform: scale(1.01);
        }

        .sticky-note.selected {
          box-shadow: 0 0 0 2px #4FC3F7, 2px 2px 8px rgba(0, 0, 0, 0.15);
          z-index: 50;
        }

        .sticky-note-toolbar {
          position: absolute;
          top: -32px;
          left: 50%;
          transform: translateX(-50%);
          background: #ffffff;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 4px 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          z-index: 10;
        }

        .font-size-btn {
          width: 24px;
          height: 24px;
          border: none;
          background: #f5f5f5;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .font-size-btn:hover {
          background: #e0e0e0;
        }

        .font-size-label {
          font-size: 11px;
          color: #666;
          min-width: 32px;
          text-align: center;
        }

        .delete-btn {
          width: 24px;
          height: 24px;
          border: none;
          background: #ffebee;
          color: #e74c3c;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .delete-btn:hover {
          background: #ffcdd2;
        }

        .sticky-note-content {
          padding: 12px;
          width: 100%;
          height: 100%;
          color: #212121;
          line-height: 1.5;
          word-wrap: break-word;
          overflow-y: auto;
          box-sizing: border-box;
        }

        .sticky-note-textarea {
          width: 100%;
          height: 100%;
          padding: 12px;
          border: none;
          outline: none;
          resize: none;
          background: transparent;
          color: #212121;
          line-height: 1.5;
          font-family: inherit;
          box-sizing: border-box;
        }

        .resize-handle {
          position: absolute;
          bottom: 2px;
          right: 4px;
          width: 16px;
          height: 16px;
          cursor: nwse-resize;
          color: #FDD835;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .resize-handle:hover {
          opacity: 1;
        }
      `}</style>
    </div>
  );
};

export default StickyNoteComponent;
