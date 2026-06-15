import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StickyNoteData } from './types';

const MIN_WIDTH = 120;
const MIN_HEIGHT = 100;

interface StickyNoteProps {
  note: StickyNoteData;
  onUpdate: (noteId: string, updates: Partial<StickyNoteData>) => void;
  onDelete: (noteId: string) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const StickyNote: React.FC<StickyNoteProps> = ({ note, onUpdate, onDelete, containerRef }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localText, setLocalText] = useState(note.text);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const noteRef = useRef<HTMLDivElement>(null);
  const lastSyncTime = useRef(0);
  const pendingSync = useRef<Partial<StickyNoteData> | null>(null);

  const SYNC_THROTTLE_MS = 33;

  const throttledSync = useCallback(
    (updates: Partial<StickyNoteData>) => {
      const now = Date.now();
      pendingSync.current = { ...pendingSync.current, ...updates };

      if (now - lastSyncTime.current >= SYNC_THROTTLE_MS) {
        onUpdate(note.id, pendingSync.current);
        lastSyncTime.current = now;
        pendingSync.current = null;
      }
    },
    [note.id, onUpdate]
  );

  useEffect(() => {
    if (!pendingSync.current) return;
    const timer = setInterval(() => {
      if (pendingSync.current) {
        onUpdate(note.id, pendingSync.current);
        lastSyncTime.current = Date.now();
        pendingSync.current = null;
      }
    }, SYNC_THROTTLE_MS);
    return () => clearInterval(timer);
  }, [note.id, onUpdate]);

  useEffect(() => {
    setLocalText(note.text);
  }, [note.text]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  }, []);

  const handleTextBlur = useCallback(() => {
    setIsEditing(false);
    if (localText !== note.text) {
      onUpdate(note.id, { text: localText });
    }
  }, [localText, note.id, note.text, onUpdate]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalText(e.target.value);
  }, []);

  const handleHeaderMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isEditing) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - rect.left - note.x,
        y: e.clientY - rect.top - note.y,
      };
    },
    [isEditing, note.x, note.y, containerRef]
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      resizeStart.current = {
        x: e.clientX,
        y: e.clientY,
        width: note.width,
        height: note.height,
      };
    },
    [note.width, note.height]
  );

  useEffect(() => {
    if (!isDragging) return;

    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const newX = Math.max(0, Math.min(e.clientX - rect.left - dragOffset.current.x, rect.width - note.width));
      const newY = Math.max(0, Math.min(e.clientY - rect.top - dragOffset.current.y, rect.height - note.height));
      throttledSync({ x: newX, y: newY });

      if (noteRef.current) {
        noteRef.current.style.left = `${newX}px`;
        noteRef.current.style.top = `${newY}px`;
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (pendingSync.current) {
        onUpdate(note.id, pendingSync.current);
        lastSyncTime.current = Date.now();
        pendingSync.current = null;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, note.width, note.height, containerRef, throttledSync, onUpdate]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeStart.current.x;
      const dy = e.clientY - resizeStart.current.y;
      const newWidth = Math.max(MIN_WIDTH, resizeStart.current.width + dx);
      const newHeight = Math.max(MIN_HEIGHT, resizeStart.current.height + dy);
      throttledSync({ width: newWidth, height: newHeight });

      if (noteRef.current) {
        noteRef.current.style.width = `${newWidth}px`;
        noteRef.current.style.height = `${newHeight}px`;
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (pendingSync.current) {
        onUpdate(note.id, pendingSync.current);
        lastSyncTime.current = Date.now();
        pendingSync.current = null;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, throttledSync, onUpdate]);

  const headerBgColor = note.color
    ? `rgba(${parseInt(note.color.slice(1, 3), 16)}, ${parseInt(note.color.slice(3, 5), 16)}, ${parseInt(note.color.slice(5, 7), 16)}, 0.3)`
    : 'rgba(255, 215, 0, 0.3)';

  return (
    <div
      ref={noteRef}
      className="sticky-note-wrapper"
      style={{
        left: note.x,
        top: note.y,
        width: note.width,
        height: note.height,
        zIndex: isDragging || isResizing ? 20 : 5,
      }}
    >
      <div
        className="sticky-note"
        style={{ backgroundColor: note.color || '#FFD700' }}
        onDoubleClick={handleDoubleClick}
      >
        <div
          className="sticky-note-header"
          style={{ backgroundColor: headerBgColor }}
          onMouseDown={handleHeaderMouseDown}
        >
          <span>便签</span>
          <button
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              color: 'rgba(0,0,0,0.4)',
              padding: '0 2px',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(note.id);
            }}
          >
            ✕
          </button>
        </div>
        {isEditing ? (
          <textarea
            className="sticky-note-body"
            value={localText}
            onChange={handleTextChange}
            onBlur={handleTextBlur}
            autoFocus
            style={{ backgroundColor: 'transparent' }}
          />
        ) : (
          <div
            className="sticky-note-body"
            style={{
              backgroundColor: 'transparent',
              cursor: 'text',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {note.text || (
              <span style={{ color: 'rgba(0,0,0,0.3)', fontStyle: 'italic' }}>双击输入文字...</span>
            )}
          </div>
        )}
        <div className="sticky-resize-handle" onMouseDown={handleResizeMouseDown} />
      </div>
    </div>
  );
};

export default StickyNote;
