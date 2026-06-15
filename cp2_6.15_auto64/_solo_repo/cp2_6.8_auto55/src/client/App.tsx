import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import Whiteboard from './Whiteboard';
import StickyNotes from './StickyNotes';
import {
  User,
  DrawingPath,
  StickyNote,
  BRUSH_COLORS,
  DEFAULT_ROOMS,
} from '../shared/types';

interface RoomInfo {
  id: string;
  name: string;
  userCount: number;
  maxUsers: number;
}

const App: React.FC = () => {
  const socketRef = useRef<Socket | null>(null);
  const [brushColor, setBrushColor] = useState(BRUSH_COLORS[4]);
  const [brushSize, setBrushSize] = useState(4);
  const [roomList, setRoomList] = useState<RoomInfo[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [drawings, setDrawings] = useState<DrawingPath[]>([]);
  const [stickies, setStickies] = useState<StickyNote[]>([]);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [customRoomInput, setCustomRoomInput] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const localActivePathRef = useRef<DrawingPath | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    const socket = io({ transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('get-rooms');
    });

    socket.on('rooms-list', (rooms: RoomInfo[]) => {
      setRoomList(rooms);
    });

    socket.on('room-joined', (data: {
      roomId: string;
      user: User;
      users: User[];
      stickies: StickyNote[];
      drawings: DrawingPath[];
    }) => {
      setRoomId(data.roomId);
      setRoomName(roomList.find((r) => r.id === data.roomId)?.name || data.roomId);
      setCurrentUser(data.user);
      setUsers(data.users);
      setStickies(data.stickies);
      setDrawings(data.drawings);
      showToast(`已加入房间`);
    });

    socket.on('room-full', () => {
      showToast('房间已满，最多8人');
    });

    socket.on('room-not-found', () => {
      showToast('房间不存在');
    });

    socket.on('user-joined', ({ user }: { user: User }) => {
      setUsers((prev) => {
        if (prev.find((u) => u.id === user.id)) return prev;
        return [...prev, user];
      });
    });

    socket.on('user-left', ({ userId }: { userId: string }) => {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    });

    socket.on('draw-start', (data: {
      userId: string; pathId: string; x: number; y: number; color: string; size: number;
    }) => {
      const win = window as unknown as {
        __remoteDrawStart?: (d: any) => void;
      };
      if (win.__remoteDrawStart) win.__remoteDrawStart(data);
    });

    socket.on('draw-move', (data: {
      userId: string; pathId: string; x: number; y: number;
    }) => {
      const win = window as unknown as {
        __remoteDrawMove?: (d: any) => void;
      };
      if (win.__remoteDrawMove) win.__remoteDrawMove(data);
    });

    socket.on('draw-end', (data: { userId: string; pathId: string }) => {
      const win = window as unknown as {
        __remoteDrawEnd?: (d: any) => void;
      };
      if (win.__remoteDrawEnd) win.__remoteDrawEnd(data);
    });

    socket.on('sticky-added', ({ sticky }: { sticky: StickyNote }) => {
      setStickies((prev) => {
        if (prev.find((s) => s.id === sticky.id)) return prev;
        return [...prev, sticky];
      });
    });

    socket.on('sticky-updated', ({ sticky }: { sticky: StickyNote }) => {
      setStickies((prev) => prev.map((s) => (s.id === sticky.id ? sticky : s)));
    });

    socket.on('sticky-deleted', ({ stickyId }: { stickyId: string }) => {
      setStickies((prev) => prev.filter((s) => s.id !== stickyId));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (roomList.length > 0 && roomId) {
      const r = roomList.find((x) => x.id === roomId);
      if (r) setRoomName(r.name);
    }
  }, [roomList, roomId]);

  const joinRoom = useCallback((id: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('join-room', { roomId: id });
  }, []);

  const handleDrawStart = useCallback(
    (x: number, y: number, color: string, size: number) => {
      if (!socketRef.current || !roomId || !currentUser) return;
      const pathId = `${currentUser.id}-${Date.now()}`;
      localActivePathRef.current = {
        id: pathId,
        userId: currentUser.id,
        color,
        size,
        points: [{ x, y }],
      };
      socketRef.current.emit('draw-start', { roomId, x, y, color, size });
    },
    [roomId, currentUser]
  );

  const handleDrawMove = useCallback(
    (x: number, y: number) => {
      if (!socketRef.current || !roomId) return;
      if (localActivePathRef.current) {
        localActivePathRef.current.points.push({ x, y });
        setDrawings((prev) => {
          const others = prev.filter((p) => p.id !== localActivePathRef.current!.id);
          return [...others, { ...localActivePathRef.current! }];
        });
      }
      socketRef.current.emit('draw-move', { roomId, x, y });
    },
    [roomId]
  );

  const handleDrawEnd = useCallback(() => {
    if (!socketRef.current || !roomId) return;
    if (localActivePathRef.current) {
      const finalPath = localActivePathRef.current;
      setDrawings((prev) => {
        const others = prev.filter((p) => p.id !== finalPath.id);
        if (finalPath.points.length > 1) {
          return [...others, finalPath];
        }
        return others;
      });
      localActivePathRef.current = null;
    }
    socketRef.current.emit('draw-end', { roomId });
  }, [roomId]);

  const handleAddSticky = useCallback(
    (sticky: StickyNote) => {
      if (!socketRef.current || !roomId) return;
      setStickies((prev) => [...prev, sticky]);
      socketRef.current.emit('sticky-add', { roomId, sticky });
    },
    [roomId]
  );

  const handleUpdateSticky = useCallback(
    (sticky: StickyNote) => {
      if (!socketRef.current || !roomId) return;
      setStickies((prev) => prev.map((s) => (s.id === sticky.id ? sticky : s)));
      socketRef.current.emit('sticky-update', { roomId, sticky });
    },
    [roomId]
  );

  const handleCustomRoom = () => {
    const id = customRoomInput.trim();
    if (!id) return;
    const existing = DEFAULT_ROOMS.find((r) => r.id === id);
    if (existing) {
      joinRoom(id);
    } else {
      joinRoom(id);
    }
    setCustomRoomInput('');
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: '#1C1C1E',
        color: '#FFFFFF',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 48,
          zIndex: 100,
          background: 'rgba(28,28,30,0.72)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 16,
        }}
      >
        <button
          onClick={() => setSidebarOpen((s) => !s)}
          title={sidebarOpen ? '隐藏房间列表' : '显示房间列表'}
          style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            border: 'none',
            background: 'rgba(255,255,255,0.06)',
            color: '#FFFFFF',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
          <span style={{ fontSize: 18 }}>✎</span>
          <span style={{ fontSize: 14, letterSpacing: 0.3 }}>协作白板</span>
        </div>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {BRUSH_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setBrushColor(color)}
              title={color}
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                border: brushColor === color ? '2px solid #FFFFFF' : '2px solid transparent',
                background: color,
                cursor: 'pointer',
                padding: 0,
                transition: 'transform 0.15s, border 0.15s',
                boxShadow: color === '#FFFFFF' ? 'inset 0 0 0 1px rgba(0,0,0,0.2)' : 'none',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            />
          ))}
        </div>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: brushSize,
                height: brushSize,
                borderRadius: '50%',
                background: brushColor,
              }}
            />
          </div>
          <input
            type="range"
            min={2}
            max={20}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            style={{
              width: 120,
              accentColor: brushColor,
              cursor: 'pointer',
            }}
          />
          <span style={{ fontSize: 12, color: '#8E8E93', minWidth: 28, textAlign: 'right' }}>
            {brushSize}px
          </span>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {users.slice(0, 6).map((u) => (
            <div
              key={u.id}
              title={u.name}
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: u.color,
                border: '2px solid #1C1C1E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: '#1C1C1E',
              }}
            >
              {u.name.slice(0, 1)}
            </div>
          ))}
          {users.length > 6 && (
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                border: '2px solid #1C1C1E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 600,
              }}
            >
              +{users.length - 6}
            </div>
          )}
        </div>
      </div>

      {sidebarOpen && (
        <div
          style={{
            position: 'absolute',
            top: 48,
            left: 0,
            bottom: 0,
            width: 240,
            zIndex: 90,
            background: '#2C2C2E',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
            padding: 16,
            gap: 12,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: '#8E8E93', letterSpacing: 0.6 }}>
            房间列表
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {roomList.map((room) => (
              <button
                key={room.id}
                onClick={() => joinRoom(room.id)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: roomId === room.id ? '1px solid rgba(0,122,255,0.5)' : '1px solid transparent',
                  background: roomId === room.id ? 'rgba(0,122,255,0.12)' : 'rgba(255,255,255,0.04)',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
                onMouseEnter={(e) => {
                  if (roomId !== room.id) e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background =
                    roomId === room.id ? 'rgba(0,122,255,0.12)' : 'rgba(255,255,255,0.04)';
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{room.name}</span>
                  <span style={{ fontSize: 10, color: '#8E8E93' }}>{room.id}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: room.userCount > 0 ? '#34C759' : '#636366',
                    }}
                  />
                  <span style={{ fontSize: 11, color: '#8E8E93' }}>
                    {room.userCount}/{room.maxUsers}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div style={{ fontSize: 12, fontWeight: 600, color: '#8E8E93', letterSpacing: 0.6, marginTop: 8 }}>
            输入房间号
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={customRoomInput}
              onChange={(e) => setCustomRoomInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCustomRoom()}
              placeholder="room-5"
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)',
                color: '#FFFFFF',
                fontSize: 12,
                outline: 'none',
              }}
            />
            <button
              onClick={handleCustomRoom}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: 'none',
                background: '#007AFF',
                color: '#FFFFFF',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#0A84FF')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#007AFF')}
            >
              加入
            </button>
          </div>

          <div style={{ flex: 1 }} />

          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.03)',
              fontSize: 11,
              color: '#8E8E93',
              lineHeight: 1.6,
            }}
          >
            <div style={{ color: '#AEAEB2', fontWeight: 500, marginBottom: 6 }}>操作提示</div>
            <div>• 左键：绘制</div>
            <div>• Alt + 拖拽 / 中键：平移</div>
            <div>• 滚轮：缩放（0.5x ~ 3x）</div>
            <div>• 双击便利贴：编辑</div>
          </div>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          top: 48,
          left: sidebarOpen ? 240 : 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          transition: 'left 0.25s ease',
        }}
      >
        {!roomId ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 20,
              color: '#8E8E93',
            }}
          >
            <div style={{ fontSize: 64, opacity: 0.4 }}>✎</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: '#EBEBF5' }}>选择一个房间开始协作</div>
            <div style={{ fontSize: 13 }}>左侧房间列表中点击加入，或输入自定义房间号</div>
          </div>
        ) : (
          <>
            <Whiteboard
              brushColor={brushColor}
              brushSize={brushSize}
              currentUserId={currentUser?.id || null}
              roomId={roomId}
              drawings={drawings}
              onDrawStart={handleDrawStart}
              onDrawMove={handleDrawMove}
              onDrawEnd={handleDrawEnd}
              offset={offset}
              setOffset={setOffset}
              scale={scale}
              setScale={setScale}
            />
            <StickyNotes
              stickies={stickies}
              currentUserId={currentUser?.id || null}
              offset={offset}
              scale={scale}
              onAdd={handleAddSticky}
              onUpdate={handleUpdateSticky}
            />
          </>
        )}
      </div>

      {roomId && (
        <div
          style={{
            position: 'absolute',
            right: 16,
            bottom: 16,
            zIndex: 80,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            borderRadius: 20,
            background: 'rgba(28,28,30,0.75)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34C759' }} />
            <span style={{ color: '#EBEBF5' }}>{roomName}</span>
          </div>
          <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.15)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#8E8E93' }}>
            <span>👥</span>
            <span>{users.length}/8</span>
          </div>
          <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.15)' }} />
          <div style={{ color: '#8E8E93' }}>{(scale * 100).toFixed(0)}%</div>
        </div>
      )}

      {toast && (
        <div
          style={{
            position: 'absolute',
            top: 64,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 200,
            padding: '10px 18px',
            borderRadius: 8,
            background: 'rgba(0,0,0,0.8)',
            color: '#FFFFFF',
            fontSize: 13,
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {toast}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -6px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        input[type="range"] {
          -webkit-appearance: none;
          height: 4px;
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #FFFFFF;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
};

export default App;
