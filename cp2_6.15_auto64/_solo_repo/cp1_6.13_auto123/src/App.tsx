import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Toolbar } from './components/Toolbar';
import { InfiniteCanvas, type InfiniteCanvasHandle } from './components/InfiniteCanvas';
import { useWebSocket } from './hooks/useWebSocket';
import type { CanvasElement, ToolType, Transform, StickerType, WSMessage, Stroke, TextElement, Sticker } from './types';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const MAX_HISTORY = 50;

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function getRoomId(): string {
  const params = new URLSearchParams(window.location.search);
  let roomId = params.get('roomId');
  if (!roomId) {
    roomId = 'room-' + uuidv4().slice(0, 8);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('roomId', roomId);
    window.history.replaceState({}, '', newUrl.toString());
  }
  return roomId;
}

function getUserId(): string {
  let userId = localStorage.getItem('sketchy_userId');
  if (!userId) {
    userId = 'user-' + uuidv4().slice(0, 8);
    localStorage.setItem('sketchy_userId', userId);
  }
  return userId;
}

function getUsername(): string {
  return localStorage.getItem('sketchy_username') || '用户' + Math.floor(Math.random() * 10000);
}

export default function App() {
  const roomId = useMemo(getRoomId, []);
  const userId = useMemo(getUserId, []);
  const [username, setUsername] = useState<string>(getUsername);

  const [currentTool, setCurrentTool] = useState<ToolType>('brush');
  const [currentColor, setCurrentColor] = useState<string>('#000000');
  const [brushWidth, setBrushWidth] = useState<number>(3);

  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);

  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });

  const [history, setHistory] = useState<CanvasElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const isHistoryPushScheduled = useRef(false);

  const canvasRef = useRef<InfiniteCanvasHandle>(null);

  const handleWSMessage = useCallback(
    (msg: WSMessage) => {
      if (msg.userId === userId) return;

      switch (msg.type) {
        case 'element-add': {
          const el = msg.payload as CanvasElement;
          el.isRemote = true;
          el.opacity = 0.7;
          setElements((prev) => {
            if (prev.some((e) => e.id === el.id)) return prev;
            const next = [...prev, el];
            pushHistory(next);
            return next;
          });
          setNewlyAddedId(el.id);
          setTimeout(() => setNewlyAddedId((id) => (id === el.id ? null : id)), 300);
          break;
        }
        case 'element-update': {
          const el = msg.payload as CanvasElement;
          el.isRemote = true;
          el.opacity = 0.7;
          setElements((prev) => {
            const next = prev.map((e) => (e.id === el.id ? el : e));
            pushHistory(next);
            return next;
          });
          break;
        }
        case 'element-delete': {
          const id = msg.payload as string;
          setDeletingId(id);
          setTimeout(() => {
            setElements((prev) => {
              const next = prev.filter((e) => e.id !== id);
              pushHistory(next);
              return next;
            });
            setDeletingId(null);
            setSelectedElementId((sid) => (sid === id ? null : sid));
          }, 300);
          break;
        }
        case 'elements-batch': {
          const els = msg.payload as CanvasElement[];
          setElements(els.map((e) => ({ ...e, isRemote: true, opacity: 0.7 })));
          break;
        }
      }
    },
    [userId]
  );

  const { connected, send } = useWebSocket({ roomId, userId, onMessage: handleWSMessage });

  const pushHistory = useCallback(
    (nextElements: CanvasElement[]) => {
      if (isHistoryPushScheduled.current) return;
      isHistoryPushScheduled.current = true;
      queueMicrotask(() => {
        isHistoryPushScheduled.current = false;
        setHistory((prev) => {
          const truncated = prev.slice(0, historyIndex + 1);
          const newHistory = [...truncated, deepClone(nextElements)];
          if (newHistory.length > MAX_HISTORY) {
            newHistory.splice(0, newHistory.length - MAX_HISTORY);
          }
          setHistoryIndex(newHistory.length - 1);
          return newHistory;
        });
      });
    },
    [historyIndex]
  );

  useEffect(() => {
    if (history.length === 0 && elements.length === 0) {
      const initial = deepClone(elements);
      setHistory([initial]);
      setHistoryIndex(0);
    }
  }, []);

  useEffect(() => {
    axios
      .get<CanvasElement[]>(`/api/rooms/${encodeURIComponent(roomId)}/elements`)
      .then((res) => {
        if (res.data && res.data.length > 0) {
          const loaded = res.data.map((e) => ({ ...e, isRemote: false, opacity: 1 }));
          setElements(loaded);
          setHistory([deepClone(loaded)]);
          setHistoryIndex(0);
        }
      })
      .catch((e) => console.warn('Failed to load room elements:', e));
  }, [roomId]);

  const handleElementAdd = useCallback(
    (element: CanvasElement) => {
      setElements((prev) => {
        const next = [...prev, element];
        pushHistory(next);
        return next;
      });
      setNewlyAddedId(element.id);
      setTimeout(() => setNewlyAddedId((id) => (id === element.id ? null : id)), 300);
      send({ type: 'element-add', payload: element });
    },
    [send, pushHistory]
  );

  const handleElementUpdate = useCallback(
    (element: CanvasElement) => {
      setElements((prev) => {
        const idx = prev.findIndex((e) => e.id === element.id);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = element;
        return next;
      });
      send({ type: 'element-update', payload: element });
    },
    [send]
  );

  const handleElementDelete = useCallback(
    (id: string) => {
      setDeletingId(id);
      setTimeout(() => {
        setElements((prev) => {
          const next = prev.filter((e) => e.id !== id);
          pushHistory(next);
          return next;
        });
        setDeletingId(null);
      }, 300);
      if (selectedElementId === id) setSelectedElementId(null);
      send({ type: 'element-delete', payload: id });
    },
    [send, selectedElementId, pushHistory]
  );

  useEffect(() => {
    const flush = () => {
      setHistory((prev) => {
        if (prev.length === 0) {
          return [deepClone(elements)];
        }
        const last = prev[prev.length - 1];
        if (JSON.stringify(last) === JSON.stringify(elements)) return prev;
        const next = [...prev.slice(0, historyIndex + 1), deepClone(elements)];
        if (next.length > MAX_HISTORY) next.splice(0, next.length - MAX_HISTORY);
        setHistoryIndex(next.length - 1);
        return next;
      });
    };
    const t = setTimeout(flush, 200);
    return () => clearTimeout(t);
  }, [elements, historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    const newIndex = historyIndex - 1;
    const prevState = history[newIndex];
    if (prevState) {
      setElements(deepClone(prevState));
      setHistoryIndex(newIndex);
    }
  }, [canUndo, history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    const newIndex = historyIndex + 1;
    const nextState = history[newIndex];
    if (nextState) {
      setElements(deepClone(nextState));
      setHistoryIndex(newIndex);
    }
  }, [canRedo, history, historyIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleUndo, handleRedo]);

  const handleStickerSelect = useCallback(
    (stickerType: StickerType) => {
      const container = document.body;
      const centerX = (container.clientWidth / 2 - transform.x) / transform.scale;
      const centerY = (container.clientHeight / 2 - transform.y) / transform.scale;

      const sticker: Sticker = {
        id: `sticker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: 'sticker',
        roomId,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        x: centerX,
        y: centerY,
        stickerType,
        size: 60,
      };
      handleElementAdd(sticker);
    },
    [userId, roomId, transform, handleElementAdd]
  );

  const handleExport = useCallback(() => {
    canvasRef.current?.exportPNG();
  }, []);

  const handleUsernameChange = useCallback((name: string) => {
    setUsername(name);
    localStorage.setItem('sketchy_username', name);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (connected && elements.length > 0) {
        axios.post(`/api/rooms/${encodeURIComponent(roomId)}/elements`, { elements }).catch(() => {});
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [connected, roomId, elements]);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <InfiniteCanvas
        ref={canvasRef}
        elements={elements}
        currentTool={currentTool}
        currentColor={currentColor}
        brushWidth={brushWidth}
        userId={userId}
        roomId={roomId}
        transform={transform}
        setTransform={setTransform}
        selectedElementId={selectedElementId}
        setSelectedElementId={setSelectedElementId}
        onElementAdd={handleElementAdd}
        onElementUpdate={handleElementUpdate}
        onElementDelete={handleElementDelete}
        deletingId={deletingId}
        newlyAddedId={newlyAddedId}
      />

      <Toolbar
        currentTool={currentTool}
        setCurrentTool={(t) => {
          setCurrentTool(t);
          if (t !== 'select') setSelectedElementId(null);
        }}
        color={currentColor}
        setColor={setCurrentColor}
        brushWidth={brushWidth}
        setBrushWidth={setBrushWidth}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onDelete={() => selectedElementId && handleElementDelete(selectedElementId)}
        onExport={handleExport}
        onStickerSelect={handleStickerSelect}
        connected={connected}
        username={username}
        onUsernameChange={handleUsernameChange}
      />
    </div>
  );
}
