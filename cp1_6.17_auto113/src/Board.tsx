import React, { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import StickyNote, { NOTE_COLORS } from './StickyNote';
import { StickyNoteData, WSMessage } from './types';

interface BoardProps {
  boardId: string;
  boardName: string;
  notes: StickyNoteData[];
  sendWS: (message: WSMessage) => void;
  onlineCount: number;
  userId: string;
  setNotes: React.Dispatch<React.SetStateAction<StickyNoteData[]>>;
}

function getRandomColor() {
  const colors = NOTE_COLORS.slice(0, 4);
  return colors[Math.floor(Math.random() * colors.length)];
}

const MENU_WIDTH = 204;
const MENU_HEIGHT = 120;

const Board: React.FC<BoardProps> = ({
  boardId,
  boardName,
  notes,
  sendWS,
  onlineCount,
  userId,
  setNotes,
}) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragStartMouse, setDragStartMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragStartNotePos, setDragStartNotePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragMoved, setDragMoved] = useState(false);
  const [autoFocusNoteId, setAutoFocusNoteId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    viewportX: number;
    viewportY: number;
    boardX: number;
    boardY: number;
    noteId: string | null;
  }>({ visible: false, viewportX: 0, viewportY: 0, boardX: 0, boardY: 0, noteId: null });
  const [deletingNotes, setDeletingNotes] = useState<Set<string>>(new Set());
  const [, setZoom] = useState(1);

  const handleDragStart = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, noteId: string) => {
      const note = notes.find((n) => n.id === noteId);
      if (!note) return;
      setDraggingId(noteId);
      setDragStartMouse({ x: e.clientX, y: e.clientY });
      setDragStartNotePos({ x: note.x, y: note.y });
      setDragOffset({ x: 0, y: 0 });
      setDragMoved(false);
    },
    [notes]
  );

  useEffect(() => {
    if (!draggingId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartMouse.x;
      const dy = e.clientY - dragStartMouse.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        setDragMoved(true);
      }
      setDragOffset({ x: dx, y: dy });
    };

    const handleMouseUp = () => {
      if (draggingId && dragMoved) {
        const newX = dragStartNotePos.x + dragOffset.x;
        const newY = dragStartNotePos.y + dragOffset.y;
        setNotes((prev) =>
          prev.map((n) => (n.id === draggingId ? { ...n, x: newX, y: newY } : n))
        );
        sendWS({
          type: 'moveNote',
          payload: { noteId: draggingId, x: newX, y: newY, boardId },
        });
      }
      setDraggingId(null);
      setDragOffset({ x: 0, y: 0 });
      setDragMoved(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingId, dragStartMouse, dragStartNotePos, dragOffset, dragMoved, setNotes, sendWS, boardId]);

  const handleBoardClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (draggingId) return;
      if (contextMenu.visible) return;
      const target = e.target as HTMLElement;
      if (!boardRef.current?.contains(target) || target !== boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - 100;
      const y = e.clientY - rect.top - 100;
      const note: StickyNoteData = {
        id: uuidv4(),
        x: Math.max(0, x),
        y: Math.max(0, y),
        content: '',
        color: getRandomColor(),
        boardId,
      };
      setNotes((prev) => [...prev, note]);
      setAutoFocusNoteId(note.id);
      sendWS({ type: 'createNote', payload: { note } });
    },
    [boardId, draggingId, contextMenu.visible, sendWS, setNotes]
  );

  const handleEditNote = useCallback(
    (noteId: string, content: string) => {
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, content } : n))
      );
      sendWS({ type: 'updateNote', payload: { noteId, content, boardId } });
    },
    [boardId, sendWS, setNotes]
  );

  const handleDeleteNote = useCallback(
    (noteId: string) => {
      setDeletingNotes((prev) => new Set(prev).add(noteId));
      sendWS({ type: 'deleteNote', payload: { noteId, boardId } });
    },
    [boardId, sendWS]
  );

  const handleDeleteAnimationEnd = useCallback(
    (noteId: string) => {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      setDeletingNotes((prev) => {
        const s = new Set(prev);
        s.delete(noteId);
        return s;
      });
    },
    [setNotes]
  );

  const handleChangeColor = useCallback(
    (noteId: string, color: string) => {
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, color } : n))
      );
      sendWS({ type: 'updateNote', payload: { noteId, color, boardId } });
    },
    [boardId, sendWS, setNotes]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, noteId: string) => {
      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect) return;

      let viewportX = e.clientX;
      let viewportY = e.clientY;

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (viewportX + MENU_WIDTH > vw) {
        viewportX = vw - MENU_WIDTH - 8;
      }
      if (viewportY + MENU_HEIGHT > vh) {
        viewportY = vh - MENU_HEIGHT - 8;
      }

      setContextMenu({
        visible: true,
        viewportX,
        viewportY,
        boardX: e.clientX - rect.left,
        boardY: e.clientY - rect.top,
        noteId,
      });
    },
    []
  );

  const handleColorSelect = (color: string) => {
    if (contextMenu.noteId) {
      handleChangeColor(contextMenu.noteId, color);
    }
    setContextMenu({ visible: false, viewportX: 0, viewportY: 0, boardX: 0, boardY: 0, noteId: null });
  };

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) =>
      prev.visible
        ? { visible: false, viewportX: 0, viewportY: 0, boardX: 0, boardY: 0, noteId: null }
        : prev
    );
  }, []);

  useEffect(() => {
    const handler = () => closeContextMenu();
    window.addEventListener('click', handler);
    window.addEventListener('scroll', handler);
    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('scroll', handler);
    };
  }, [closeContextMenu]);

  const handleAutoFocusDone = useCallback((noteId: string) => {
    if (autoFocusNoteId === noteId) {
      setAutoFocusNoteId(null);
    }
  }, [autoFocusNoteId]);

  const backgroundStyle: React.CSSProperties = {
    backgroundColor: '#F0F0F0',
  };

  if (window.devicePixelRatio >= 2) {
    backgroundStyle.backgroundImage = `
      linear-gradient(to right, rgba(200,200,200,0.5) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(200,200,200,0.5) 1px, transparent 1px)
    `;
    backgroundStyle.backgroundSize = '50px 50px';
  }

  return (
    <div
      ref={boardRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        ...backgroundStyle,
        cursor: draggingId ? 'grabbing' : 'default',
      }}
      onClick={handleBoardClick}
      onMouseDown={closeContextMenu}
    >
      <div
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: 'rgba(255,255,255,0.8)',
          padding: '8px 14px',
          borderRadius: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: '#3498DB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {onlineCount}
        </div>
        <span style={{ fontSize: '13px', color: '#555' }}>
          {boardName}
        </span>
      </div>

      {notes.map((note) => {
        if (note.boardId !== boardId) return null;
        return (
          <StickyNote
            key={note.id}
            note={note}
            isDragging={draggingId === note.id}
            dragOffset={draggingId === note.id ? dragOffset : { x: 0, y: 0 }}
            onDragStart={handleDragStart}
            onEdit={handleEditNote}
            onDelete={handleDeleteNote}
            onChangeColor={handleChangeColor}
            onContextMenu={handleContextMenu}
            autoFocus={autoFocusNoteId === note.id}
            onAutoFocusDone={handleAutoFocusDone}
            isAnimatingDelete={deletingNotes.has(note.id)}
            onDeleteAnimationEnd={handleDeleteAnimationEnd}
          />
        );
      })}

      {contextMenu.visible && contextMenu.noteId && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            left: `${contextMenu.viewportX}px`,
            top: `${contextMenu.viewportY}px`,
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            padding: '12px',
            zIndex: 10000,
            minWidth: '180px',
            maxWidth: `${MENU_WIDTH}px`,
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div
            style={{
              fontSize: '12px',
              color: '#666',
              marginBottom: '10px',
              padding: '0 4px',
            }}
          >
            选择颜色
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              justifyItems: 'center',
              padding: '4px',
            }}
          >
            {NOTE_COLORS.map((color) => (
              <div
                key={color}
                onClick={() => handleColorSelect(color)}
                style={{
                  width: '20px',
                  height: '20px',
                  backgroundColor: color,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  border: '1px solid rgba(0,0,0,0.1)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.2)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow =
                    '0 2px 8px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Board;
