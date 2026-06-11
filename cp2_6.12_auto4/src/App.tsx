import { useState, useEffect, useCallback, useRef } from 'react';
import Canvas from './Canvas';
import Toolbar from './Toolbar';
import type { ToolType, DrawAction, ConnectedUser, WebSocketMessage } from './types';

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#ec4899', '#111827', '#ffffff',
];

function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export default function App() {
  const [tool, setTool] = useState<ToolType>('brush');
  const [color, setColor] = useState('#3b82f6');
  const [lineWidth, setLineWidth] = useState(4);
  const [actions, setActions] = useState<DrawAction[]>([]);
  const [undoStack, setUndoStack] = useState<DrawAction[]>([]);
  const [users, setUsers] = useState<ConnectedUser[]>([]);
  const [connected, setConnected] = useState(false);
  const [userId, setUserId] = useState('');
  const [userColor, setUserColor] = useState('#3b82f6');
  const [undoingIds, setUndoingIds] = useState<Set<string>>(new Set());
  const [redoingIds, setRedoingIds] = useState<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const pendingRef = useRef<DrawAction[]>([]);

  const MAX_HISTORY = 50;
  const userNameRef = useRef('用户' + Math.floor(Math.random() * 1000));

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    const ws = new WebSocket(`${protocol}//${host}:3002`);

    ws.onopen = () => {
      setConnected(true);
      const msg = {
        type: 'join',
        userId: userId || generateId(),
        userName: userNameRef.current,
        color: userColor,
      } as const;
      ws.send(JSON.stringify(msg));
      pendingRef.current.forEach((a) => {
        ws.send(JSON.stringify({ type: 'draw', action: a }));
      });
      pendingRef.current = [];
    };

    ws.onclose = () => {
      setConnected(false);
      setTimeout(connect, 2000);
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WebSocketMessage;
        if (data.type === 'init') {
          setUserId(data.userId);
          setUserColor(data.color);
          setActions(data.history);
        } else if (data.type === 'draw') {
          if (data.action.userId !== userId) {
            setActions((prev) => {
              const next = [...prev, data.action];
              return next.slice(-MAX_HISTORY);
            });
          }
        } else if (data.type === 'undo') {
          handleRemoteUndo(data.actionId);
        } else if (data.type === 'redo') {
          handleRemoteRedo(data.action);
        } else if (data.type === 'users') {
          setUsers(data.users);
        }
      } catch (e) {
        console.error('WS parse error:', e);
      }
    };

    wsRef.current = ws;
  }, [userId, userColor]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!userId) return;
    setColor(userColor);
  }, [userId, userColor]);

  const sendAction = useCallback(
    (action: DrawAction) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'draw', action }));
      } else {
        pendingRef.current.push(action);
      }
    },
    []
  );

  const handleDrawComplete = useCallback(
    (action: DrawAction) => {
      setActions((prev) => {
        const next = [...prev, action];
        return next.slice(-MAX_HISTORY);
      });
      setUndoStack([]);
      sendAction(action);
    },
    [sendAction]
  );

  const handleRemoteUndo = useCallback((actionId: string) => {
    setUndoingIds((prev) => {
      const next = new Set(prev);
      next.add(actionId);
      return next;
    });
    setTimeout(() => {
      setActions((prev) => prev.filter((a) => a.id !== actionId));
      setUndoingIds((prev) => {
        const next = new Set(prev);
        next.delete(actionId);
        return next;
      });
    }, 400);
  }, []);

  const handleRemoteRedo = useCallback((action: DrawAction) => {
    setRedoingIds((prev) => {
      const next = new Set(prev);
      next.add(action.id);
      return next;
    });
    setActions((prev) => {
      const next = [...prev, action];
      return next.slice(-MAX_HISTORY);
    });
    setTimeout(() => {
      setRedoingIds((prev) => {
        const next = new Set(prev);
        next.delete(action.id);
        return next;
      });
    }, 400);
  }, []);

  const handleUndo = useCallback(() => {
    setActions((prev) => {
      const myActions = prev.filter((a) => a.userId === userId);
      if (myActions.length === 0) return prev;
      const last = myActions[myActions.length - 1];

      setUndoingIds((s) => {
        const next = new Set(s);
        next.add(last.id);
        return next;
      });

      setUndoStack((stack) => [...stack, last]);

      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'undo', actionId: last.id, userId }));
      }

      setTimeout(() => {
        setActions((p) => p.filter((a) => a.id !== last.id));
        setUndoingIds((s) => {
          const next = new Set(s);
          next.delete(last.id);
          return next;
        });
      }, 400);

      return prev;
    });
  }, [userId]);

  const handleRedo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const last = stack[stack.length - 1];

      setRedoingIds((s) => {
        const next = new Set(s);
        next.add(last.id);
        return next;
      });

      setActions((prev) => {
        const next = [...prev, last];
        return next.slice(-MAX_HISTORY);
      });

      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'redo', action: last, userId }));
      }

      setTimeout(() => {
        setRedoingIds((s) => {
          const next = new Set(s);
          next.delete(last.id);
          return next;
        });
      }, 400);

      return stack.slice(0, -1);
    });
  }, [userId]);

  const myActions = actions.filter((a) => a.userId === userId);
  const canUndo = myActions.length > 0 && undoingIds.size === 0;
  const canRedo = undoStack.length > 0 && redoingIds.size === 0;

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Toolbar
        tool={tool}
        setTool={setTool}
        color={color}
        setColor={setColor}
        lineWidth={lineWidth}
        setLineWidth={setLineWidth}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        colors={COLORS}
        connected={connected}
        users={users}
        currentUserId={userId}
        currentUserColor={userColor}
      />

      <Canvas
        tool={tool}
        color={color}
        lineWidth={lineWidth}
        actions={actions}
        userId={userId}
        userName={userNameRef.current}
        onDrawComplete={handleDrawComplete}
        undoingIds={undoingIds}
        redoingIds={redoingIds}
      />

      <div className="bottom-status glass-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className={`connection-dot ${connected ? 'connected' : 'disconnected'}`} />
          <span style={{ fontSize: 13, color: '#5a5a7a', fontWeight: 500 }}>
            {connected ? '已连接' : '重连中...'}
          </span>
        </div>
        <div className="divider" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {users.length > 0 && (
            <span style={{ fontSize: 13, color: '#5a5a7a' }}>
              {users.length} 人在线
            </span>
          )}
          <div style={{ display: 'flex', marginLeft: 4 }}>
            {users.slice(0, 6).map((u, i) => (
              <div
                key={u.id}
                className="user-dot"
                title={u.name}
                style={{
                  background: u.color,
                  marginLeft: i === 0 ? 0 : -6,
                  zIndex: users.length - i,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
