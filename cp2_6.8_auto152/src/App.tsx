import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import Canvas from './Canvas';
import HistoryPanel from './HistoryPanel';
import {
  User, CanvasElement, HistoryEntry, DrawMode,
  ANIMALS, ANIMAL_NAMES, PRESET_COLORS, EMOJI_LIST
} from './types';

const ONLINE_TIMEOUT = 5000;

function generateBoardId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [boardId, setBoardId] = useState<string>('');
  const [joinInput, setJoinInput] = useState('');
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [drawMode, setDrawMode] = useState<DrawMode>('pen');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [lineWidth, setLineWidth] = useState(3);
  const [selectedEmoji, setSelectedEmoji] = useState(EMOJI_LIST[0]);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(true);
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const replayTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 900);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const animalIdx = Math.floor(Math.random() * ANIMALS.length);
    const color = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
    const newUser: User = {
      id: uuidv4(),
      color,
      animal: ANIMALS[animalIdx],
      name: ANIMAL_NAMES[animalIdx],
      cursor: null,
      lastSeen: Date.now()
    };
    setCurrentUser(newUser);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setUsers(prev => prev.map(u => ({ ...u })));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const connectSocket = useCallback((bid: string, user: User) => {
    const newSocket = io('http://localhost:8000', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    newSocket.on('connect', () => {
      newSocket.emit('join_board', { boardId: bid, user });
    });

    newSocket.on('board_state', (data: { elements: CanvasElement[]; history: HistoryEntry[]; users: User[] }) => {
      setElements(data.elements || []);
      setHistory(data.history || []);
      setUsers(data.users || []);
    });

    newSocket.on('user_joined', (user: User) => {
      setUsers(prev => {
        const idx = prev.findIndex(u => u.id === user.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = user;
          return updated;
        }
        return [...prev, user];
      });
    });

    newSocket.on('user_left', (userId: string) => {
      setUsers(prev => prev.filter(u => u.id !== userId));
    });

    newSocket.on('cursor_update', (data: { userId: string; cursor: { x: number; y: number } | null }) => {
      setUsers(prev => prev.map(u =>
        u.id === data.userId
          ? { ...u, cursor: data.cursor, lastSeen: Date.now() }
          : u
      ));
    });

    newSocket.on('user_presence', (data: { userId: string; lastSeen: number }) => {
      setUsers(prev => prev.map(u =>
        u.id === data.userId ? { ...u, lastSeen: data.lastSeen } : u
      ));
    });

    newSocket.on('element_added', (data: { element: CanvasElement; historyEntry: HistoryEntry }) => {
      setElements(prev => [...prev, data.element]);
      setHistory(prev => {
        const newHistory = [data.historyEntry, ...prev];
        return newHistory.slice(0, 200);
      });
    });

    newSocket.on('element_moved', (data: { elementId: string; x: number; y: number; historyEntry: HistoryEntry }) => {
      setElements(prev => prev.map(el => {
        if (el.id === data.elementId && (el.type === 'sticky' || el.type === 'emoji')) {
          return { ...el, x: data.x, y: data.y } as CanvasElement;
        }
        return el;
      }));
      setHistory(prev => {
        const newHistory = [data.historyEntry, ...prev];
        return newHistory.slice(0, 200);
      });
    });

    newSocket.on('canvas_cleared', (historyEntry: HistoryEntry) => {
      setElements([]);
      setHistory(prev => {
        const newHistory = [historyEntry, ...prev];
        return newHistory.slice(0, 200);
      });
    });

    setSocket(newSocket);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const savedBoardId = localStorage.getItem('whiteboard_board_id');
    if (savedBoardId) {
      setBoardId(savedBoardId);
      connectSocket(savedBoardId, currentUser);
    }
  }, [currentUser, connectSocket]);

  const createNewBoard = useCallback(() => {
    if (!currentUser) return;
    if (socket) socket.disconnect();

    const newBoardId = generateBoardId();
    setBoardId(newBoardId);
    setElements([]);
    setHistory([]);
    setUsers([]);
    localStorage.setItem('whiteboard_board_id', newBoardId);

    navigator.clipboard.writeText(newBoardId).catch(() => {});

    connectSocket(newBoardId, currentUser);
  }, [currentUser, socket, connectSocket]);

  const joinBoard = useCallback(() => {
    if (!currentUser || !joinInput.trim()) return;
    if (socket) socket.disconnect();

    const bid = joinInput.trim().toUpperCase();
    setBoardId(bid);
    setElements([]);
    setHistory([]);
    setUsers([]);
    localStorage.setItem('whiteboard_board_id', bid);
    setJoinInput('');

    connectSocket(bid, currentUser);
  }, [currentUser, joinInput, socket, connectSocket]);

  const addElement = useCallback((element: CanvasElement) => {
    if (!socket || !currentUser || isReadOnly) return;
    const historyEntry: HistoryEntry = {
      id: uuidv4(),
      operation: 'add',
      elementId: element.id,
      element,
      userId: currentUser.id,
      userColor: currentUser.color,
      userAnimal: currentUser.animal,
      userName: currentUser.name,
      timestamp: Date.now()
    };
    socket.emit('add_element', { boardId, element, historyEntry });
  }, [socket, boardId, currentUser, isReadOnly]);

  const moveElement = useCallback((elementId: string, x: number, y: number) => {
    if (!socket || !currentUser || isReadOnly) return;
    const historyEntry: HistoryEntry = {
      id: uuidv4(),
      operation: 'move',
      elementId,
      userId: currentUser.id,
      userColor: currentUser.color,
      userAnimal: currentUser.animal,
      userName: currentUser.name,
      timestamp: Date.now()
    };
    socket.emit('move_element', { boardId, elementId, x, y, historyEntry });
  }, [socket, boardId, currentUser, isReadOnly]);

  const updateCursor = useCallback((cursor: { x: number; y: number } | null) => {
    if (!socket || !currentUser) return;
    socket.emit('update_cursor', { boardId, userId: currentUser.id, cursor });
  }, [socket, boardId, currentUser]);

  const clearCanvas = useCallback(() => {
    if (!socket || !currentUser) return;
    const historyEntry: HistoryEntry = {
      id: uuidv4(),
      operation: 'clear',
      userId: currentUser.id,
      userColor: currentUser.color,
      userAnimal: currentUser.animal,
      userName: currentUser.name,
      timestamp: Date.now()
    };
    socket.emit('clear_canvas', { boardId, historyEntry });
    setShowClearConfirm(false);
  }, [socket, boardId, currentUser]);

  const replayHistory = useCallback((entry: HistoryEntry) => {
    if (replayTimeoutRef.current) {
      clearTimeout(replayTimeoutRef.current);
    }
    setIsReadOnly(true);
    setReplayingId(entry.elementId || null);

    replayTimeoutRef.current = window.setTimeout(() => {
      setReplayingId(null);
      setIsReadOnly(false);
    }, 3000);
  }, []);

  const isUserOnline = (user: User): boolean => {
    return Date.now() - user.lastSeen < ONLINE_TIMEOUT;
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      position: 'relative',
      background: '#0D1117'
    }}>
      <div style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0
      }}>
        <div style={{
          position: 'absolute',
          top: 16,
          left: 16,
          right: 16,
          zIndex: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={createNewBoard}
              className="btn-animate"
              style={{
                padding: '8px 16px',
                background: '#63B3ED',
                color: '#1A202C',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              新建白板
            </button>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && joinBoard()}
                placeholder="输入白板ID"
                maxLength={4}
                style={{
                  padding: '8px 12px',
                  background: '#2D3748',
                  color: '#E2E8F0',
                  border: '1px solid #4A5568',
                  borderRadius: 8,
                  fontSize: 14,
                  width: 100,
                  outline: 'none',
                  textTransform: 'uppercase'
                }}
              />
              <button
                onClick={joinBoard}
                className="btn-animate"
                style={{
                  padding: '8px 14px',
                  background: '#4A5568',
                  color: '#E2E8F0',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontSize: 14
                }}
              >
                加入
              </button>
            </div>
            {boardId && (
              <div style={{
                padding: '6px 12px',
                background: '#2D3748',
                borderRadius: 8,
                fontSize: 14,
                color: '#A0AEC0',
                border: '1px solid #4A5568'
              }}>
                白板ID: <span style={{ color: '#63B3ED', fontWeight: 600, letterSpacing: 2 }}>{boardId}</span>
              </div>
            )}
          </div>

          <div style={{
            display: 'flex',
            gap: 8,
            background: '#1A202C',
            padding: 8,
            borderRadius: 12,
            border: '1px solid #2D3748'
          }}>
            {users.map(user => (
              <div
                key={user.id}
                style={{
                  position: 'relative',
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: '#2D3748',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  border: `2px solid ${user.color}`,
                  boxShadow: user.id === currentUser?.id ? `0 0 8px ${user.color}` : 'none'
                }}
                title={`${user.name}${user.id === currentUser?.id ? ' (我)' : ''}`}
              >
                {user.animal}
                <div style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: isUserOnline(user) ? '#48BB78' : '#718096',
                  border: '2px solid #1A202C'
                }} />
              </div>
            ))}
          </div>
        </div>

        <Canvas
          elements={elements}
          users={users.filter(u => u.id !== currentUser?.id && u.cursor)}
          currentUser={currentUser}
          drawMode={drawMode}
          selectedColor={selectedColor}
          lineWidth={lineWidth}
          selectedEmoji={selectedEmoji}
          isReadOnly={isReadOnly}
          replayingId={replayingId}
          onAddElement={addElement}
          onMoveElement={moveElement}
          onUpdateCursor={updateCursor}
        />

        <div style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: 12,
          background: 'rgba(26, 32, 44, 0.9)',
          borderRadius: 12,
          backdropFilter: 'blur(8px)',
          border: '1px solid #2D3748'
        }}>
          <div style={{
            display: 'flex',
            gap: 4,
            padding: 4,
            background: '#2D3748',
            borderRadius: 8
          }}>
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className="btn-animate"
                style={{
                  width: isMobile ? 24 : 28,
                  height: isMobile ? 24 : 28,
                  borderRadius: 6,
                  background: color,
                  border: selectedColor === color ? '2px solid white' : '2px solid transparent',
                  cursor: 'pointer',
                  padding: 0
                }}
              />
            ))}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 8px',
            borderLeft: '1px solid #4A5568',
            borderRight: '1px solid #4A5568'
          }}>
            <span style={{ fontSize: 12, color: '#A0AEC0' }}>粗细</span>
            <input
              type="range"
              min={1}
              max={10}
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              style={{
                width: 80,
                accentColor: '#63B3ED'
              }}
            />
            <span style={{ fontSize: 12, color: '#63B3ED', minWidth: 16, textAlign: 'center' }}>{lineWidth}</span>
          </div>

          <div style={{ display: 'flex', gap: 4 }}>
            {([
              { mode: 'pen' as DrawMode, icon: '✏️', label: '画笔' },
              { mode: 'sticky' as DrawMode, icon: '📝', label: '便签' },
              { mode: 'emoji' as DrawMode, icon: '😊', label: '贴图' }
            ]).map(({ mode, icon, label }) => (
              <button
                key={mode}
                onClick={() => {
                  setDrawMode(mode);
                  if (mode === 'emoji') setShowEmojiPicker(prev => !prev);
                  else setShowEmojiPicker(false);
                }}
                className="btn-animate"
                title={label}
                style={{
                  width: isMobile ? 32 : 40,
                  height: isMobile ? 32 : 40,
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  background: drawMode === mode ? '#63B3ED' : 'transparent',
                  fontSize: isMobile ? 16 : 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {icon}
              </button>
            ))}
          </div>

          {showEmojiPicker && drawMode === 'emoji' && (
            <div style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 4,
              padding: 8,
              background: '#2D3748',
              borderRadius: 12,
              border: '1px solid #4A5568'
            }} className="fade-in">
              {EMOJI_LIST.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setSelectedEmoji(emoji)}
                  className="btn-animate"
                  style={{
                    width: 36,
                    height: 36,
                    fontSize: 22,
                    background: selectedEmoji === emoji ? '#4A5568' : 'transparent',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer'
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setShowClearConfirm(true)}
            className="btn-animate"
            title="清空画布"
            style={{
              width: isMobile ? 32 : 40,
              height: isMobile ? 32 : 40,
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              background: 'transparent',
              color: '#FC8181',
              fontSize: isMobile ? 16 : 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            🗑️
          </button>
        </div>

        {isMobile && (
          <button
            onClick={() => setHistoryPanelOpen(prev => !prev)}
            className="btn-animate"
            style={{
              position: 'absolute',
              bottom: 80,
              right: 16,
              zIndex: 10,
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: '#63B3ED',
              color: '#1A202C',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer'
            }}
          >
            📋
          </button>
        )}

        {showClearConfirm && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100
          }} className="fade-in">
            <div style={{
              background: '#2D3748',
              padding: 24,
              borderRadius: 16,
              minWidth: 280
            }}>
              <h3 style={{ fontSize: 18, marginBottom: 12 }}>确认清空画布？</h3>
              <p style={{ color: '#A0AEC0', fontSize: 14, marginBottom: 20 }}>
                此操作将删除所有内容，不可恢复。
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="btn-animate"
                  style={{
                    padding: '8px 16px',
                    background: '#4A5568',
                    color: '#E2E8F0',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer'
                  }}
                >
                  取消
                </button>
                <button
                  onClick={clearCanvas}
                  className="btn-animate"
                  style={{
                    padding: '8px 16px',
                    background: '#E53E3E',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  清空
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {!isMobile ? (
        <HistoryPanel
          history={history}
          isOpen={historyPanelOpen}
          onToggle={() => setHistoryPanelOpen(prev => !prev)}
          onReplay={replayHistory}
        />
      ) : historyPanelOpen ? (
        <div style={{
          height: 240,
          background: '#2D3748',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          overflow: 'hidden'
        }} className="fade-in">
          <HistoryPanel
            history={history}
            isOpen={true}
            onToggle={() => setHistoryPanelOpen(false)}
            onReplay={replayHistory}
            isMobile={true}
          />
        </div>
      ) : null}
    </div>
  );
}

export default App;
