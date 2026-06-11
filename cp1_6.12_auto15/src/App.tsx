import { useState, useEffect, useRef, useCallback } from 'react';
import Canvas, { type CanvasHandle } from '@/components/Canvas';
import Toolbar, { PRESET_COLORS } from '@/components/Toolbar';
import { network, type DrawPayload, type UndoPayload } from '@/utils/network';

function ConfirmDialog({
  open,
  title,
  message,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="confirm-dialog" onClick={onCancel}>
      <div className="confirm-dialog-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="confirm-dialog-title">{title}</h3>
        <p className="confirm-dialog-message">{message}</p>
        <div className="confirm-dialog-actions">
          <button type="button" className="dialog-button cancel" onClick={onCancel}>
            取消
          </button>
          <button type="button" className="dialog-button confirm" onClick={onConfirm}>
            确认清除
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [currentColor, setCurrentColor] = useState<string>(PRESET_COLORS[9].hex);
  const [brushSize, setBrushSize] = useState<number>(4);
  const [userId, setUserId] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [initialized, setInitialized] = useState<boolean>(false);

  const strokesRef = useRef<DrawPayload[]>([]);
  const undoneStrokesRef = useRef<Set<string>>(new Set());
  const myStrokeIdsRef = useRef<string[]>([]);
  const canvasRef = useRef<CanvasHandle | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addStrokeLocal = useCallback((stroke: DrawPayload) => {
    strokesRef.current.push(stroke);
  }, []);

  const handleStrokeEnd = useCallback(
    (stroke: DrawPayload) => {
      addStrokeLocal(stroke);
      if (stroke.userId === userId) {
        myStrokeIdsRef.current.push(stroke.strokeId);
      }
    },
    [userId, addStrokeLocal]
  );

  const handleColorChange = useCallback((color: string) => {
    setCurrentColor(color);
  }, []);

  const handleBrushSizeChange = useCallback((size: number) => {
    setBrushSize(Math.max(1, Math.min(20, size)));
  }, []);

  const handleUndo = useCallback(() => {
    const myStrokes = myStrokeIdsRef.current;
    if (myStrokes.length === 0) return;

    let lastIndex = myStrokes.length - 1;
    while (lastIndex >= 0 && undoneStrokesRef.current.has(myStrokes[lastIndex])) {
      lastIndex--;
    }
    if (lastIndex < 0) return;

    const strokeId = myStrokes[lastIndex];
    undoneStrokesRef.current.add(strokeId);

    canvasRef.current?.undoStroke(strokeId);

    network.send({
      type: 'UNDO',
      payload: { userId, strokeId } as UndoPayload,
    });
  }, [userId]);

  const handleClearCanvasRequested = useCallback(() => {
    setConfirmOpen(true);
  }, []);

  const handleClearCanvasConfirmed = useCallback(() => {
    setConfirmOpen(false);
    setIsClearing(true);

    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    clearTimerRef.current = setTimeout(() => {
      strokesRef.current = [];
      undoneStrokesRef.current = new Set();
      myStrokeIdsRef.current = [];
      canvasRef.current?.clearAll();
      network.send({ type: 'CLEAR_CANVAS', payload: { userId } });

      setTimeout(() => {
        setIsClearing(false);
      }, 100);
    }, 1200);
  }, [userId]);

  const handleClearCancel = useCallback(() => {
    setConfirmOpen(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { userId: uid, isAdmin: admin, strokes } = await network.connect();
        if (cancelled) return;

        strokesRef.current = strokes;
        undoneStrokesRef.current = new Set();
        myStrokeIdsRef.current = strokes.filter((s) => s.userId === uid).map((s) => s.strokeId);

        setUserId(uid);
        setIsAdmin(admin);
        setOnlineCount(1);
        setInitialized(true);

        requestAnimationFrame(() => {
          canvasRef.current?.redrawAll();
        });
      } catch (err) {
        console.error('Failed to connect:', err);
      }
    }

    init();

    const unsub = network.onMessage((message) => {
      switch (message.type) {
        case 'USER_JOINED':
        case 'USER_LEFT':
          setOnlineCount(message.payload.onlineCount);
          if (message.type === 'USER_JOINED' && message.payload.userId === userId) {
            break;
          }
          break;
        case 'DRAW_BROADCAST': {
          const existing = strokesRef.current.find(
            (s) => s.strokeId === message.payload.strokeId
          );
          if (existing) {
            existing.points.push(...message.payload.points);
          } else {
            strokesRef.current.push({
              ...message.payload,
              points: [...message.payload.points],
            });
            if (message.payload.userId === userId) {
              myStrokeIdsRef.current.push(message.payload.strokeId);
            }
          }
          canvasRef.current?.redrawAll();
          break;
        }
        case 'UNDO_BROADCAST': {
          undoneStrokesRef.current.add(message.payload.strokeId);
          canvasRef.current?.undoStroke(message.payload.strokeId);
          break;
        }
        case 'CLEAR_BROADCAST': {
          strokesRef.current = [];
          undoneStrokesRef.current = new Set();
          myStrokeIdsRef.current = [];
          canvasRef.current?.clearAll();
          break;
        }
        default:
          break;
      }
    });

    return () => {
      cancelled = true;
      unsub();
      network.disconnect();
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canUndo =
    initialized && myStrokeIdsRef.current.some((id) => !undoneStrokesRef.current.has(id));

  return (
    <div className="app-root">
      <Toolbar
        currentColor={currentColor}
        brushSize={brushSize}
        isAdmin={isAdmin}
        canUndo={canUndo}
        onColorChange={handleColorChange}
        onBrushSizeChange={handleBrushSizeChange}
        onUndo={handleUndo}
        onClearCanvas={handleClearCanvasRequested}
      />
      <Canvas
        ref={canvasRef}
        currentColor={currentColor}
        brushSize={brushSize}
        userId={userId}
        onlineCount={onlineCount}
        isClearing={isClearing}
        onStrokeEnd={handleStrokeEnd}
        strokesRef={strokesRef}
        undoneStrokesRef={undoneStrokesRef}
      />
      <ConfirmDialog
        open={confirmOpen}
        title="确认清除画布"
        message="此操作将清除所有用户的所有绘制内容，且无法恢复。是否继续？"
        onCancel={handleClearCancel}
        onConfirm={handleClearCanvasConfirmed}
      />
    </div>
  );
}

export default App;
