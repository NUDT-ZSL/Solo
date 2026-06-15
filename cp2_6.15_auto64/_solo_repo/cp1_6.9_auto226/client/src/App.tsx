import React, { useState, useEffect, useRef, useCallback } from 'react';
import Canvas, { DrawAction, Point } from './Canvas';

interface User {
  id: string;
  name: string;
  color: string;
  joinedAt: number;
}

type Tool = 'brush' | 'eraser';
type BrushSize = 'thin' | 'medium' | 'thick';
type ReplaySpeed = 1 | 2 | 4;

const BRUSH_SIZES: Record<BrushSize, number> = {
  thin: 3,
  medium: 8,
  thick: 20,
};

const PRESET_COLORS = [
  '#000000', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#F8B500', '#6C5CE7', '#A29BFE',
];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [actions, setActions] = useState<DrawAction[]>([]);

  const [selectedColor, setSelectedColor] = useState('#4ECDC4');
  const [brushSize, setBrushSize] = useState<BrushSize>('medium');
  const [tool, setTool] = useState<Tool>('brush');
  const [hue, setHue] = useState(170);
  const [opacity, setOpacity] = useState(100);

  const [isReplaying, setIsReplaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState<ReplaySpeed>(1);
  const [replayProgress, setReplayProgress] = useState(0);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [toolbarOpen, setToolbarOpen] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);
  const replayTimerRef = useRef<number | null>(null);
  const replayStartTimeRef = useRef<number>(0);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const connect = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnecting(false);
        ws.send(JSON.stringify({ type: 'join' }));
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        handleWsMessage(msg);
      };

      ws.onclose = () => {
        setConnecting(true);
        setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, []);

  const handleWsMessage = (msg: any) => {
    switch (msg.type) {
      case 'welcome':
        setUser(msg.user);
        setUsers(msg.users);
        setActions(msg.actions);
        if (msg.actions.length > 0) {
          msg.actions.forEach((a: DrawAction, i: number) => {
            setTimeout(() => (window as any).__addStroke?.(a), i * 10);
          });
        }
        break;
      case 'user-joined':
        setUsers(prev => [...prev, msg.user]);
        showToast(`${msg.user.name} 加入了画布`);
        break;
      case 'user-left':
        setUsers(prev => prev.filter(u => u.id !== msg.userId));
        const leftUser = users.find(u => u.id === msg.userId);
        if (leftUser) showToast(`${leftUser.name} 离开了`);
        break;
      case 'user-updated':
        setUsers(prev => prev.map(u => u.id === msg.user.id ? msg.user : u));
        if (user?.id === msg.user.id) {
          setUser(msg.user);
        }
        break;
      case 'draw':
        (window as any).__addStroke?.(msg.action, msg.userName);
        (window as any).__setUserName?.(msg.action.userId, msg.userName);
        setActions(prev => [...prev, msg.action]);
        break;
      case 'canvas-cleared':
        (window as any).__clearCanvas?.();
        setActions([]);
        showToast('画布已清空');
        break;
      case 'error':
        showToast(msg.message);
        break;
    }
  };

  const handleDrawAction = useCallback((actionData: {
    points: Point[];
    color: string;
    lineWidth: number;
    isEraser: boolean;
  }) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      type: 'draw',
      action: actionData,
    }));
  }, []);

  const handleClearCanvas = async () => {
    if (!user) return;
    try {
      await fetch('/api/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
    } catch (e) {
      showToast('清空失败');
    }
    setShowClearConfirm(false);
  };

  const handleUpdateName = () => {
    if (!user || !nameInput.trim()) {
      setEditingName(false);
      return;
    }
    wsRef.current?.send(JSON.stringify({
      type: 'update-name',
      name: nameInput.trim(),
    }));
    setEditingName(false);
  };

  const toggleReplay = () => {
    if (isReplaying) {
      setIsReplaying(false);
      if (replayTimerRef.current) {
        clearInterval(replayTimerRef.current);
        replayTimerRef.current = null;
      }
      return;
    }

    if (actions.length < 2) {
      showToast('没有可回放的内容');
      return;
    }

    const startTime = actions[0].timestamp;
    const endTime = actions[actions.length - 1].timestamp;
    const totalDuration = (endTime - startTime) / replaySpeed;

    setIsReplaying(true);
    setReplayProgress(0);
    replayStartTimeRef.current = Date.now();

    if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    replayTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - replayStartTimeRef.current;
      const progress = Math.min(100, (elapsed / totalDuration) * 100);
      setReplayProgress(progress);

      if (progress >= 100) {
        clearInterval(replayTimerRef.current!);
        replayTimerRef.current = null;
        setTimeout(() => {
          setIsReplaying(false);
          setReplayProgress(100);
        }, 500);
      }
    }, 50);
  };

  const cycleReplaySpeed = () => {
    setReplaySpeed(prev => prev === 1 ? 2 : prev === 2 ? 4 : 1);
  };

  useEffect(() => {
    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!editingName && user) {
      setNameInput(user.name);
    }
  }, [editingName, user]);

  const hslToHex = (h: number, s: number, l: number): string => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  const computedColor = hslToHex(hue, 75, 50);
  const lineWidth = BRUSH_SIZES[brushSize];
  const isEraser = tool === 'eraser';

  return (
    <div style={styles.app}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes slideOut {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes floatIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          cursor: pointer;
        }
        input[type="range"]::-webkit-slider-runnable-track {
          height: 6px;
          border-radius: 3px;
          background: rgba(255,255,255,0.2);
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 18px;
          width: 18px;
          border-radius: 50%;
          background: #fff;
          margin-top: -6px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          transition: transform 0.15s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        .hue-slider::-webkit-slider-runnable-track {
          background: linear-gradient(to right,
            hsl(0,75%,50%), hsl(60,75%,50%), hsl(120,75%,50%),
            hsl(180,75%,50%), hsl(240,75%,50%), hsl(300,75%,50%), hsl(360,75%,50%));
        }
      `}</style>

      {connecting && (
        <div style={styles.connectingOverlay}>
          <div style={styles.connectingSpinner}></div>
          <span style={styles.connectingText}>正在连接协作服务器...</span>
        </div>
      )}

      {toast && (
        <div style={styles.toast}>{toast}</div>
      )}

      {isMobile && toolbarOpen && (
        <div style={styles.mobileToolbar}>
          <MobileToolbarContent
            tool={tool} setTool={setTool}
            brushSize={brushSize} setBrushSize={setBrushSize}
            hue={hue} setHue={setHue}
            opacity={opacity} setOpacity={setOpacity}
            selectedColor={selectedColor} setSelectedColor={setSelectedColor}
            computedColor={computedColor}
            isEraser={isEraser}
            onClear={() => setShowClearConfirm(true)}
            onClose={() => setToolbarOpen(false)}
          />
        </div>
      )}

      {!isMobile && (
        <div style={styles.toolbar}>
          <ToolbarContent
            tool={tool} setTool={setTool}
            brushSize={brushSize} setBrushSize={setBrushSize}
            hue={hue} setHue={setHue}
            opacity={opacity} setOpacity={setOpacity}
            selectedColor={selectedColor} setSelectedColor={setSelectedColor}
            computedColor={computedColor}
            isEraser={isEraser}
            onClear={() => setShowClearConfirm(true)}
          />
        </div>
      )}

      {isMobile && !toolbarOpen && (
        <button
          onClick={() => setToolbarOpen(true)}
          style={{
            ...styles.fabButton,
            top: '20px',
            left: '20px',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="2" x2="12" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
          </svg>
        </button>
      )}

      <div style={styles.canvasWrapper}>
        {user && (
          <Canvas
            userId={user.id}
            userColor={user.color}
            selectedColor={isEraser ? '#FFFFFF' : selectedColor}
            lineWidth={lineWidth}
            isEraser={isEraser}
            isReplaying={isReplaying}
            replayActions={actions.map(a => ({
              ...a,
              timestamp: a.timestamp / replaySpeed + (a.timestamp - actions[0]?.timestamp || 0) * (1 - 1 / replaySpeed),
            }))}
            onDrawAction={handleDrawAction}
            onHoverUser={() => {}}
          />
        )}
      </div>

      <div style={styles.userList}>
        <div style={styles.userListHeader}>
          <span style={styles.userListTitle}>在线用户</span>
          <span style={styles.userCount}>{users.length}/20</span>
        </div>
        <div style={styles.userListContent}>
          {users.map((u) => (
            <div key={u.id} style={{
              ...styles.userItem,
              animation: 'floatIn 0.3s ease',
            }}>
              <span
                style={{
                  ...styles.userDot,
                  background: u.color,
                  boxShadow: `0 0 0 2px ${u.color}33`,
                }}
              />
              <span style={styles.userNameText}>
                {u.id === user?.id ? `${u.name}（我）` : u.name}
              </span>
            </div>
          ))}
        </div>
        {user && (
          <div style={styles.userFooter}>
            {editingName ? (
              <div style={styles.nameEditBox}>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onBlur={handleUpdateName}
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()}
                  autoFocus
                  maxLength={20}
                  style={styles.nameInput}
                />
              </div>
            ) : (
              <button
                onClick={() => setEditingName(true)}
                style={styles.editNameBtn}
              >
                修改昵称
              </button>
            )}
          </div>
        )}
      </div>

      <div style={styles.replayBar}>
        <button
          onClick={toggleReplay}
          style={{
            ...styles.playButton,
            background: isReplaying ? '#ff6b6b' : user?.color || '#4ECDC4',
          }}
        >
          {isReplaying ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <polygon points="6,3 20,12 6,21" />
            </svg>
          )}
        </button>

        <div style={styles.progressWrapper}>
          <div style={styles.progressTrack}>
            <div
              style={{
                ...styles.progressFill,
                width: `${replayProgress}%`,
                boxShadow: replayProgress > 0
                  ? `0 0 12px ${user?.color || '#4ECDC4'}, 0 0 24px ${user?.color || '#4ECDC4'}66`
                  : 'none',
              }}
            />
          </div>
          <div style={styles.progressLabels}>
            <span>
              {actions.length > 0
                ? formatTime((actions[actions.length - 1].timestamp - actions[0].timestamp) * replayProgress / 100 / replaySpeed)
                : '00:00'}
            </span>
            <span>
              {actions.length > 0
                ? formatTime((actions[actions.length - 1].timestamp - actions[0].timestamp) / replaySpeed)
                : '00:00'}
            </span>
          </div>
        </div>

        <button
          onClick={cycleReplaySpeed}
          style={styles.speedButton}
        >
          <span style={styles.speedText}>{replaySpeed}x</span>
        </button>
      </div>

      {showClearConfirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>确认清空画布？</h3>
            <p style={styles.modalText}>此操作将清除所有绘制内容，且无法撤销。</p>
            <div style={styles.modalActions}>
              <button
                onClick={() => setShowClearConfirm(false)}
                style={{ ...styles.modalBtn, background: '#f1f3f5', color: '#495057' }}
              >
                取消
              </button>
              <button
                onClick={handleClearCanvas}
                style={{ ...styles.modalBtn, background: '#ff6b6b', color: '#fff' }}
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ToolbarProps {
  tool: Tool;
  setTool: (t: Tool) => void;
  brushSize: BrushSize;
  setBrushSize: (s: BrushSize) => void;
  hue: number;
  setHue: (h: number) => void;
  opacity: number;
  setOpacity: (o: number) => void;
  selectedColor: string;
  setSelectedColor: (c: string) => void;
  computedColor: string;
  isEraser: boolean;
  onClear: () => void;
  onClose?: () => void;
}

const ToolbarContent: React.FC<ToolbarProps> = ({
  tool, setTool, brushSize, setBrushSize, hue, setHue,
  selectedColor, setSelectedColor, computedColor, isEraser, onClear,
}) => {
  const [activeBtn, setActiveBtn] = useState<string | null>(null);

  const clickWithAnim = (key: string, cb: () => void) => {
    setActiveBtn(key);
    cb();
    setTimeout(() => setActiveBtn(null), 200);
  };

  return (
    <>
      <div style={styles.toolGroup}>
        <button
          onClick={() => clickWithAnim('brush', () => setTool('brush'))}
          style={{
            ...styles.toolBtn,
            ...(tool === 'brush' ? styles.toolBtnActive : {}),
            transform: activeBtn === 'brush' ? 'scale(0.95)' : 'scale(1)',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            <path d="M2 2l7.586 7.586" />
            <circle cx="11" cy="11" r="2" />
          </svg>
        </button>
        <button
          onClick={() => clickWithAnim('eraser', () => setTool('eraser'))}
          style={{
            ...styles.toolBtn,
            ...(tool === 'eraser' ? styles.toolBtnActive : {}),
            transform: activeBtn === 'eraser' ? 'scale(0.95)' : 'scale(1)',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 20H7L3 16a2 2 0 0 1 0-2.8L14.2 2a2 2 0 0 1 2.8 0L21 6a2 2 0 0 1 0 2.8L10 19.8" />
            <path d="M18 13L7 2" />
          </svg>
        </button>
      </div>

      <div style={styles.divider} />

      <div style={styles.toolGroup}>
        {(['thin', 'medium', 'thick'] as BrushSize[]).map((size) => (
          <button
            key={size}
            onClick={() => clickWithAnim(size, () => setBrushSize(size))}
            style={{
              ...styles.sizeBtn,
              ...(brushSize === size ? { ...styles.toolBtnActive, borderColor: isEraser ? '#e8e8e8' : selectedColor } : {}),
              transform: activeBtn === size ? 'scale(0.95)' : 'scale(1)',
            }}
          >
            <div style={{
              ...styles.sizeDot,
              width: size === 'thin' ? 4 : size === 'medium' ? 9 : 18,
              height: size === 'thin' ? 4 : size === 'medium' ? 9 : 18,
              background: isEraser ? '#cbd5e0' : selectedColor,
            }} />
            <span style={styles.sizeLabel}>
              {size === 'thin' ? '细' : size === 'medium' ? '中' : '粗'}
            </span>
          </button>
        ))}
      </div>

      <div style={styles.divider} />

      <div style={styles.toolGroup}>
        <div style={styles.colorPreview}>
          <div style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: isEraser
              ? 'repeating-linear-gradient(45deg, #e8e8e8, #e8e8e8 3px, #fff 3px, #fff 6px)'
              : selectedColor,
          }} />
        </div>

        <div style={styles.hueContainer}>
          <input
            type="range"
            min="0" max="360"
            value={hue}
            onChange={(e) => {
              setHue(parseInt(e.target.value));
              setSelectedColor(computedColor);
            }}
            className="hue-slider"
            style={styles.hueSlider}
          />
        </div>

        <div style={styles.presetColors}>
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => {
                setSelectedColor(c);
                const hex = c.replace('#', '');
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                const max = Math.max(r, g, b), min = Math.min(r, g, b);
                let h = 0;
                if (max === min) h = 0;
                else if (max === r) h = 60 * (((g - b) / (max - min)) % 6);
                else if (max === g) h = 60 * (((b - r) / (max - min)) + 2);
                else h = 60 * (((r - g) / (max - min)) + 4);
                if (h < 0) h += 360;
                setHue(Math.round(h));
              }}
              style={{
                ...styles.presetColorBtn,
                background: c,
                ...(selectedColor === c && !isEraser ? styles.presetColorActive : {}),
              }}
            />
          ))}
        </div>
      </div>

      <div style={styles.divider} />

      <div style={styles.toolGroup}>
        <button
          onClick={() => clickWithAnim('clear', onClear)}
          style={{
            ...styles.clearBtn,
            transform: activeBtn === 'clear' ? 'scale(0.95)' : 'scale(1)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
          </svg>
          <span style={{ fontSize: '11px', marginTop: '2px' }}>清空</span>
        </button>
      </div>
    </>
  );
};

const MobileToolbarContent: React.FC<ToolbarProps> = (props) => {
  return (
    <div style={styles.mobileToolbarInner}>
      <div style={styles.mobileToolbarHeader}>
        <span style={styles.mobileToolbarTitle}>工具箱</span>
        <button onClick={props.onClose} style={styles.mobileCloseBtn}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div style={styles.mobileToolbarScroll}>
        <ToolbarContent {...props} />
      </div>
    </div>
  );
};

function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100%',
    height: '100%',
    position: 'relative',
    background: 'linear-gradient(135deg, #f8f9ff 0%, #ffffff 50%, #faf8ff 100%)',
    overflow: 'hidden',
  },
  connectingOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(255,255,255,0.9)',
    backdropFilter: 'blur(8px)',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
  },
  connectingSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e8e8e8',
    borderTopColor: '#4ECDC4',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  connectingText: {
    fontSize: '14px',
    color: '#6c757d',
  },
  toast: {
    position: 'fixed',
    top: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '10px 22px',
    background: 'rgba(33,37,41,0.9)',
    color: '#fff',
    borderRadius: '24px',
    fontSize: '13px',
    zIndex: 9000,
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    animation: 'floatIn 0.25s ease',
  },
  toolbar: {
    position: 'fixed',
    left: '24px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '72px',
    padding: '18px 12px',
    background: 'rgba(255,255,255,0.75)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.8)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    zIndex: 100,
  },
  mobileToolbar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
    animation: 'floatIn 0.3s ease',
  },
  mobileToolbarInner: {
    padding: '12px 16px',
  },
  mobileToolbarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  mobileToolbarTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#212529',
  },
  mobileCloseBtn: {
    padding: '6px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#6c757d',
  },
  mobileToolbarScroll: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    paddingBottom: '8px',
    alignItems: 'flex-start',
  },
  fabButton: {
    position: 'fixed',
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(0,0,0,0.06)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 100,
    color: '#212529',
  },
  toolGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
  },
  divider: {
    width: '70%',
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.08), transparent)',
    margin: '4px 0',
  },
  toolBtn: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    border: 'none',
    background: 'rgba(248,249,250,0.8)',
    color: '#495057',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  toolBtnActive: {
    background: 'rgba(78, 205, 196, 0.15)',
    color: '#4ECDC4',
    border: '1.5px solid rgba(78, 205, 196, 0.4)',
  },
  sizeBtn: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    border: '1.5px solid transparent',
    background: 'rgba(248,249,250,0.8)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  sizeDot: {
    borderRadius: '50%',
    transition: 'all 0.2s ease',
  },
  sizeLabel: {
    fontSize: '9px',
    color: '#868e96',
  },
  colorPreview: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    padding: '3px',
    background: 'linear-gradient(135deg, #f1f3f5, #e9ecef)',
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
  },
  hueContainer: {
    width: '100%',
    padding: '4px 4px',
  },
  hueSlider: {
    width: '100%',
    height: '20px',
  },
  presetColors: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '5px',
    padding: '4px 2px',
  },
  presetColorBtn: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    border: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    padding: 0,
  },
  presetColorActive: {
    borderColor: '#212529',
    transform: 'scale(1.15)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  clearBtn: {
    width: '44px',
    height: '56px',
    borderRadius: '12px',
    border: 'none',
    background: 'rgba(255,107,107,0.1)',
    color: '#ff6b6b',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
    fontWeight: 500,
  },
  canvasWrapper: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    height: '80%',
    maxWidth: 'calc(100vw - 180px)',
    maxHeight: 'calc(100vh - 160px)',
  },
  userList: {
    position: 'fixed',
    top: '24px',
    right: '24px',
    width: '220px',
    background: 'rgba(255,255,255,0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.9)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
    zIndex: 100,
    overflow: 'hidden',
  },
  userListHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 18px',
    borderBottom: '1px solid rgba(0,0,0,0.05)',
  },
  userListTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#212529',
  },
  userCount: {
    fontSize: '11px',
    color: '#868e96',
    background: '#f1f3f5',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  userListContent: {
    maxHeight: '240px',
    overflowY: 'auto',
    padding: '8px',
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    borderRadius: '10px',
    transition: 'background 0.15s ease',
  },
  userDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  userNameText: {
    fontSize: '12px',
    color: '#495057',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '150px',
  },
  userFooter: {
    padding: '10px 14px',
    borderTop: '1px solid rgba(0,0,0,0.05)',
  },
  editNameBtn: {
    width: '100%',
    padding: '7px 0',
    border: '1px dashed #ced4da',
    background: 'transparent',
    borderRadius: '8px',
    fontSize: '12px',
    color: '#6c757d',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  nameEditBox: {
    width: '100%',
  },
  nameInput: {
    width: '100%',
    padding: '7px 10px',
    border: '1px solid #4ECDC4',
    borderRadius: '8px',
    fontSize: '12px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  replayBar: {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '12px 20px',
    background: 'rgba(33,37,41,0.78)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '20px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
    zIndex: 100,
    width: 'min(520px, calc(100vw - 48px))',
  },
  playButton: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
    transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  progressWrapper: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  progressTrack: {
    width: '100%',
    height: '6px',
    background: 'rgba(255,255,255,0.15)',
    borderRadius: '3px',
    overflow: 'hidden',
    cursor: 'pointer',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #4ECDC4, #6C5CE7)',
    borderRadius: '3px',
    transition: 'width 0.05s linear',
  },
  progressLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'monospace',
  },
  speedButton: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    border: 'none',
    background: 'rgba(255,255,255,0.1)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.2s ease',
  },
  speedText: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#fff',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    backdropFilter: 'blur(4px)',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  modal: {
    background: '#fff',
    borderRadius: '20px',
    padding: '28px',
    maxWidth: '360px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    animation: 'floatIn 0.25s ease',
  },
  modalTitle: {
    fontSize: '17px',
    fontWeight: 600,
    color: '#212529',
    margin: 0,
    marginBottom: '10px',
  },
  modalText: {
    fontSize: '13px',
    color: '#6c757d',
    margin: 0,
    marginBottom: '24px',
    lineHeight: 1.6,
  },
  modalActions: {
    display: 'flex',
    gap: '10px',
  },
  modalBtn: {
    flex: 1,
    padding: '11px 0',
    borderRadius: '12px',
    border: 'none',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
};

export default App;
