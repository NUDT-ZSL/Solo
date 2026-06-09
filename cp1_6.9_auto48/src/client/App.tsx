import { useEffect, useCallback, useState } from 'react';
import socket from './socket';
import { useStore } from './store';
import Canvas from './Canvas';
import NotePad from './NotePad';
import Toolbar from './Toolbar';
import Sidebar from './Sidebar';
import CursorLayer from './CursorLayer';
import type { DrawCommand, Note, User, Point } from './types';
import { generateId } from './types';

export default function App() {
  const {
    setSelfUser,
    setUsers,
    removeUser,
    addDrawing,
    setDrawings,
    markDrawingUndone,
    clearAll,
    addNote,
    setNotes,
    updateNote,
    deleteNote,
    setCursor,
    removeCursor,
    sidebarOpen,
    toggleSidebar,
  } = useStore();

  const [selfId, setSelfId] = useState<string | null>(null);

  useEffect(() => {
    socket.on('selfInfo', (user: User) => {
      setSelfUser(user);
      setSelfId(user.id);
    });

    socket.on('userList', (users: User[]) => {
      setUsers(users);
    });

    socket.on('userLeft', ({ userId }: { userId: string }) => {
      removeUser(userId);
      removeCursor(userId);
    });

    socket.on('drawBatch', (cmds: DrawCommand[]) => {
      setDrawings(cmds);
    });

    socket.on('draw', (cmd: DrawCommand) => {
      addDrawing(cmd);
    });

    socket.on('undoBroadcast', ({ commandId }: { userId: string; commandId: string }) => {
      markDrawingUndone(commandId);
    });

    socket.on('canvasCleared', () => {
      clearAll();
    });

    socket.on('noteBatch', (notes: Note[]) => {
      setNotes(notes);
    });

    socket.on('addNote', (note: Note) => {
      addNote(note);
    });

    socket.on('updateNote', (note: Note) => {
      updateNote(note);
    });

    socket.on('deleteNote', ({ id }: { id: string }) => {
      deleteNote(id);
    });

    socket.on('cursorUpdate', ({ userId, x, y }: { userId: string; x: number; y: number }) => {
      setCursor(userId, { x, y });
    });

    return () => {
      socket.removeAllListeners();
    };
  }, [
    setSelfUser,
    setUsers,
    removeUser,
    addDrawing,
    setDrawings,
    markDrawingUndone,
    clearAll,
    addNote,
    setNotes,
    updateNote,
    deleteNote,
    setCursor,
    removeCursor,
  ]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        socket.emit('undo');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleCanvasDoubleClick = useCallback((pos: Point) => {
    const note: Note = {
      id: generateId(),
      userId: selfId || '',
      x: pos.x,
      y: pos.y,
      content: '',
      color: '#FFF3CD',
    };
    socket.emit('addNote', note);
  }, [selfId]);

  return (
    <div className="app-container">
      <Toolbar />

      <div className="main-content">
        <div className="canvas-area">
          <div className="canvas-grid" />
          <Canvas onDoubleClickAt={handleCanvasDoubleClick} />
          <NotePad />
          <CursorLayer />
        </div>

        <Sidebar className={sidebarOpen ? 'mobile-open' : ''} />
      </div>

      <button
        className="mobile-toggle"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
    </div>
  );
}
