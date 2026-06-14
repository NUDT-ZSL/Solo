import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { CodeEditor } from './CodeEditor';
import { executionEngine, OutputLine, OutputType } from './execution-engine';
import {
  User,
  CursorState,
  CursorPosition,
  SelectionRange,
  cursorSyncService,
  getRandomColor,
  generateUserId,
} from './cursor-sync';

interface OtherExecution {
  userId: string;
  userName: string;
  userColor: string;
  outputs: Array<{
    type: string;
    content: string;
    timestamp: number;
    order: number;
  }>;
  receivedAt: number;
}

interface UserCardKey {
  id: string;
  insertedAt: number;
}

const DEFAULT_CODE = `// 欢迎使用 CodeCanvas · 协作编码
// 支持多人实时协作，光标同步，选区高亮
// 点击运行按钮执行代码，支持异步操作

function greet(name) {
  console.log(\`Hello, \${name}!\`);
  return \`Welcome to CodeCanvas\`;
}

// 异步示例：setTimeout
setTimeout(() => {
  console.log('[异步] 1秒后输出的消息');
}, 1000);

// Promise 示例
const delay = (ms) => new Promise(r => setTimeout(r, ms));
delay(1500).then(() => {
  console.log('[Promise] 1.5秒后 resolve');
});

// 计算斐波那契数列
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// 测试代码
const result = greet('开发者');
console.log('Result:', result);

console.log('\\n斐波那契数列前10项:');
for (let i = 0; i < 10; i++) {
  console.log(\`F(\${i}) = \${fibonacci(i)}\`);
}

// 试试选中这段文字，查看选区同步效果！
`;

const STORAGE_KEY_CODE = 'codecanvas-code';
const STORAGE_KEY_NICK = 'codecanvas-nickname';
const STORAGE_KEY_USER_ID = 'codecanvas-userid';
const LS_USED_COLORS = 'codecanvas-used-colors';

const outputTypeClass: Record<OutputType, string> = {
  log: 'log',
  error: 'error',
  info: 'info',
  warn: 'warn',
  result: 'result',
  'async-complete': 'info',
};

const App: React.FC = () => {
  const [_nickname, setNickname] = useState('');
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [code, setCode] = useState(DEFAULT_CODE);
  const [myOutputs, setMyOutputs] = useState<OutputLine[]>([]);
  const [otherExecutions, setOtherExecutions] = useState<OtherExecution[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Map<string, CursorState>>(new Map());
  const [showCountPulse, setShowCountPulse] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');

  const [userCardOrder, setUserCardOrder] = useState<UserCardKey[]>([]);

  const myOutputRef = useRef<HTMLDivElement>(null);
  const otherOutputRef = useRef<HTMLDivElement>(null);
  const myOutputScrollTimer = useRef<number | null>(null);
  const otherOutputScrollTimer = useRef<number | null>(null);
  const countPulseTimer = useRef<number | null>(null);

  useEffect(() => {
    try {
      const savedCode = localStorage.getItem(STORAGE_KEY_CODE);
      if (savedCode && savedCode.length > 0) {
        setCode(savedCode);
      }
      const savedNick = localStorage.getItem(STORAGE_KEY_NICK);
      if (savedNick) {
        setNicknameDraft(savedNick);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const triggerCountPulse = useCallback(() => {
    setShowCountPulse(true);
    if (countPulseTimer.current) {
      window.clearTimeout(countPulseTimer.current);
    }
    countPulseTimer.current = window.setTimeout(() => setShowCountPulse(false), 320);
  }, []);

  useEffect(() => {
    if (!isJoined || !currentUser) return;

    const cleanups: Array<() => void> = [];

    cleanups.push(
      cursorSyncService.on('connected', (data) => {
        setConnectionStatus(data.success ? 'online' : 'offline');
      })
    );

    cleanups.push(
      cursorSyncService.on('disconnected', () => {
        setConnectionStatus('offline');
      })
    );

    cleanups.push(
      cursorSyncService.on('connection-error', () => {
        /* mock mode fallback handled internally */
      })
    );

    cleanups.push(
      cursorSyncService.on('user-joined', (data) => {
        setUsers(data.users);
        setUserCardOrder((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newOnes: UserCardKey[] = [];
          data.users.forEach((u, idx) => {
            if (!existingIds.has(u.id)) {
              newOnes.push({ id: u.id, insertedAt: Date.now() + idx });
            }
          });
          const next = [...prev.filter((p) => data.users.some((u) => u.id === p.id)), ...newOnes];
          return next;
        });
        triggerCountPulse();
      })
    );

    cleanups.push(
      cursorSyncService.on('user-left', (data) => {
        setUsers(data.users);
        setUserCardOrder((prev) => prev.filter((p) => data.users.some((u) => u.id === p.id)));
        setRemoteCursors((prev) => {
          const next = new Map(prev);
          next.delete(data.userId);
          return next;
        });
        triggerCountPulse();
      })
    );

    cleanups.push(
      cursorSyncService.on('cursor-update', (data) => {
        setRemoteCursors((prev) => {
          const next = new Map(prev);
          next.set(data.userId, data);
          return next;
        });
      })
    );

    cleanups.push(
      cursorSyncService.on('selection-update', (data) => {
        setRemoteCursors((prev) => {
          const next = new Map(prev);
          next.set(data.userId, data);
          return next;
        });
      })
    );

    cleanups.push(
      cursorSyncService.on('code-update', (data) => {
        if (data.code !== undefined) {
          setCode(data.code);
        }
      })
    );

    cleanups.push(
      cursorSyncService.on('execution-broadcast', (data) => {
        const user = users.find((u) => u.id === data.userId);
        if (user) {
          const execution: OtherExecution = {
            userId: data.userId,
            userName: user.nickname,
            userColor: user.color,
            outputs: data.outputs.slice(0, 50),
            receivedAt: Date.now(),
          };
          setOtherExecutions((prev) => [execution, ...prev].slice(0, 10));
        }
      })
    );

    cursorSyncService.connect(currentUser);

    return () => {
      cleanups.forEach((fn) => fn());
      cursorSyncService.disconnect();
      setConnectionStatus('offline');
    };
  }, [isJoined, currentUser, triggerCountPulse]);

  useEffect(() => {
    return () => {
      if (countPulseTimer.current) window.clearTimeout(countPulseTimer.current);
      if (myOutputScrollTimer.current) window.clearTimeout(myOutputScrollTimer.current);
      if (otherOutputScrollTimer.current) window.clearTimeout(otherOutputScrollTimer.current);
    };
  }, []);

  useEffect(() => {
    if (myOutputRef.current) {
      const el = myOutputRef.current;
      if (myOutputScrollTimer.current) window.clearTimeout(myOutputScrollTimer.current);
      myOutputScrollTimer.current = window.setTimeout(() => {
        el.scrollTop = el.scrollHeight;
      }, 30);
    }
  }, [myOutputs]);

  useEffect(() => {
    if (otherOutputRef.current) {
      const el = otherOutputRef.current;
      if (otherOutputScrollTimer.current) window.clearTimeout(otherOutputScrollTimer.current);
      otherOutputScrollTimer.current = window.setTimeout(() => {
        el.scrollTop = el.scrollHeight;
      }, 30);
    }
  }, [otherExecutions]);

  const orderedUsersForRender = useMemo(() => {
    const byId = new Map(users.map((u) => [u.id, u]));
    const ordered: User[] = [];
    userCardOrder.forEach((key) => {
      const u = byId.get(key.id);
      if (u) {
        ordered.push(u);
        byId.delete(key.id);
      }
    });
    byId.forEach((u) => ordered.push(u));
    return ordered;
  }, [users, userCardOrder]);

  const handleJoin = useCallback(() => {
    const trimmed = nicknameDraft.trim();
    if (!trimmed || trimmed.length > 10) return;

    const usedColors: string[] = [];
    try {
      const stored = localStorage.getItem(LS_USED_COLORS);
      if (stored) {
        try {
          const arr = JSON.parse(stored);
          if (Array.isArray(arr)) usedColors.push(...arr.filter((x) => typeof x === 'string'));
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* ignore */
    }

    const color = getRandomColor(usedColors);
    usedColors.push(color);
    try {
      localStorage.setItem(LS_USED_COLORS, JSON.stringify(usedColors.slice(-12)));
    } catch {
      /* ignore */
    }

    let uid: string;
    try {
      uid = localStorage.getItem(STORAGE_KEY_USER_ID) || generateUserId();
      localStorage.setItem(STORAGE_KEY_USER_ID, uid);
    } catch {
      uid = generateUserId();
    }

    const user: User = {
      id: uid,
      nickname: trimmed,
      color,
    };

    try {
      localStorage.setItem(STORAGE_KEY_NICK, trimmed);
    } catch {
      /* ignore */
    }

    setNickname(trimmed);
    setCurrentUser(user);
    setIsJoined(true);
  }, [nicknameDraft]);

  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode);
      cursorSyncService.sendCodeUpdate(newCode);
    },
    []
  );

  const handleCursorChange = useCallback(
    (position: CursorPosition, selection: SelectionRange | null) => {
      cursorSyncService.sendCursorPosition(position, selection);
    },
    []
  );

  const handleSelectionChange = useCallback(
    (selection: SelectionRange | null, position: CursorPosition) => {
      cursorSyncService.sendSelection(selection, position);
    },
    []
  );

  const handleRunCode = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    try {
      const result = await executionEngine.execute(code, true);
      setMyOutputs(result.outputs);
      const serializable = result.outputs.map((o) => ({
        type: o.type,
        content: o.content,
        timestamp: o.timestamp,
        order: o.order,
      }));
      cursorSyncService.broadcastExecution(serializable);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMyOutputs([
        {
          type: 'error',
          content: `执行引擎错误: ${msg}`,
          timestamp: Date.now(),
          order: 0,
        },
      ]);
    } finally {
      setIsRunning(false);
    }
  }, [code, isRunning]);

  const handleClearMyOutput = useCallback(() => {
    setMyOutputs([]);
  }, []);

  const handleClearOthersOutput = useCallback(() => {
    setOtherExecutions([]);
  }, []);

  const handleNicknameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleJoin();
  };

  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  const statusDotColor =
    connectionStatus === 'online' ? '#10b981' : connectionStatus === 'connecting' ? '#f59e0b' : '#ef4444';
  const statusText =
    connectionStatus === 'online' ? '在线' : connectionStatus === 'connecting' ? '连接中' : '离线';

  if (!isJoined) {
    return (
      <div
        className="nickname-modal-overlay"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      >
        <div
          className="nickname-modal"
          style={{
            background: 'linear-gradient(160deg, #1e293b 0%, #0f172a 100%)',
            borderRadius: 16,
            padding: '36px 32px 32px',
            width: '100%',
            maxWidth: 420,
            boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px #334155',
            animation: 'modalIn 0.4s ease both',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background:
                  'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: 24,
                fontWeight: 700,
                color: '#fff',
                letterSpacing: 1,
                boxShadow: '0 8px 24px rgba(59,130,246,0.4)',
              }}
            >
              {'</>'}
            </div>
            <h1
              className="modal-title"
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: '#fff',
                marginBottom: 6,
                letterSpacing: 0.5,
              }}
            >
              CodeCanvas
            </h1>
            <p className="modal-subtitle" style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>
              实时协作编码 · 光标同步 · 独立沙箱执行
            </p>
          </div>

          <label style={{ fontSize: 13, color: '#cbd5e1', display: 'block', marginBottom: 8, fontWeight: 500 }}>
            你的昵称
          </label>
          <input
            type="text"
            className="nickname-input"
            placeholder="例如：小明"
            value={nicknameDraft}
            onChange={(e) => setNicknameDraft(e.target.value.slice(0, 10))}
            onKeyDown={handleNicknameKeyDown}
            maxLength={10}
            autoFocus
            style={{
              width: '100%',
              padding: '14px 16px',
              fontSize: 15,
              border: '2px solid #334155',
              borderRadius: 10,
              background: '#0f172a',
              color: '#e2e8f0',
              outline: 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s',
              boxSizing: 'border-box',
              marginBottom: 10,
              fontFamily: 'inherit',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.boxShadow = '0 0 0 4px rgba(59,130,246,0.15)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#334155';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 24,
            }}
          >
            <p className="nickname-hint" style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
              最多 10 个字符
            </p>
            <p style={{ fontSize: 12, color: '#64748b', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
              {nicknameDraft.length}/10
            </p>
          </div>

          <button
            className="join-button"
            onClick={handleJoin}
            disabled={!nicknameDraft.trim() || nicknameDraft.length > 10}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 16,
              fontWeight: 700,
              cursor: nicknameDraft.trim() ? 'pointer' : 'not-allowed',
              transition: 'transform 0.15s, box-shadow 0.15s, opacity 0.15s',
              opacity: nicknameDraft.trim() ? 1 : 0.5,
              letterSpacing: 1,
              boxShadow: nicknameDraft.trim() ? '0 6px 20px rgba(59,130,246,0.4)' : 'none',
            }}
            onMouseDown={(e) => {
              if (nicknameDraft.trim()) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)';
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            加入协作 →
          </button>

          <div
            style={{
              marginTop: 20,
              padding: '12px 14px',
              background: 'rgba(59,130,246,0.08)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 8,
              fontSize: 12,
              color: '#93c5fd',
              lineHeight: 1.6,
            }}
          >
            <span style={{ fontWeight: 600 }}>💡 提示：</span> 无服务器时自动进入演示模式，2秒后将加入模拟协作用户体验光标同步效果。
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="app-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        padding: 16,
        gap: 16,
        boxSizing: 'border-box',
        background: '#0f172a',
        overflow: 'hidden',
      }}
    >
      <div
        className="header"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
          paddingBottom: 14,
          borderBottom: '1px solid #334155',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            {'</>'}
          </div>
          <h1
            className="title"
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: '#fff',
              letterSpacing: 0.5,
              margin: 0,
            }}
          >
            CodeCanvas · 协作编码
          </h1>
        </div>

        <div
          className="user-list-section"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            width: '100%',
            flexWrap: 'wrap',
          }}
        >
          <div
            className="user-list"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
              justifyContent: 'center',
              maxWidth: 'calc(100% - 120px)',
            }}
          >
            {orderedUsersForRender.map((user, idx) => {
              const orderKey = userCardOrder.find((k) => k.id === user.id);
              const animationDelay = orderKey
                ? Math.max(0, orderedUsersForRender.findIndex((x) => x.id === orderKey.id)) * 0.1
                : idx * 0.1;
              const isMe = user.id === currentUser?.id;
              return (
                <div
                  key={`card-${user.id}`}
                  className="user-card"
                  title={isMe ? `${user.nickname} (你)` : user.nickname}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '5px 14px 5px 5px',
                    background: '#1e293b',
                    borderRadius: 10,
                    border: `1px solid ${isMe ? user.color + '66' : '#334155'}`,
                    animation: `userCardFadeIn 0.35s ease ${animationDelay}s both`,
                    cursor: 'default',
                    boxShadow: isMe ? `0 0 0 1px ${user.color}33, 0 4px 12px ${user.color}11` : 'none',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                  }}
                >
                  <div
                    className="user-avatar"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 15,
                      background: user.color,
                      boxShadow: `0 0 0 2px ${user.color}33`,
                      flexShrink: 0,
                    }}
                  >
                    {getInitial(user.nickname)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                    <span
                      className="user-nickname"
                      style={{
                        fontSize: 13,
                        color: '#e2e8f0',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: 100,
                      }}
                    >
                      {user.nickname}
                    </span>
                    <span style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                      {isMe ? '你' : '在线'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 10px',
                background: '#1e293b',
                borderRadius: 8,
                border: '1px solid #334155',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: statusDotColor,
                  boxShadow: `0 0 6px ${statusDotColor}`,
                }}
              />
              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{statusText}</span>
            </div>

            <div
              className={`online-count ${showCountPulse ? 'pulse' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 56,
                height: 36,
                padding: '0 14px',
                background: '#1e293b',
                borderRadius: 10,
                border: '1px solid #334155',
                fontSize: 14,
                fontWeight: 700,
                color: '#10b981',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: 0.5,
                transition: 'transform 0.15s ease',
              }}
            >
              <span style={{ marginRight: 4, fontSize: 11, fontWeight: 500, color: '#64748b' }}>
                在线
              </span>
              {users.length}
            </div>
          </div>
        </div>
      </div>

      <div
        className="main-content"
        style={{
          display: 'flex',
          flex: 1,
          gap: 8,
          minHeight: 0,
          minWidth: 0,
        }}
      >
        <div
          className="editor-section"
          style={{
            width: '70%',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            minWidth: 0,
          }}
        >
          <div
            className="editor-header"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                className="editor-title"
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#94a3b8',
                }}
              >
                📝 代码编辑器
              </span>
              <span
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  background: 'rgba(59,130,246,0.1)',
                  color: '#93c5fd',
                  borderRadius: 6,
                  fontWeight: 500,
                }}
              >
                JavaScript · 支持异步
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setCode(DEFAULT_CODE)}
                style={{
                  padding: '8px 14px',
                  background: '#334155',
                  color: '#cbd5e1',
                  border: '1px solid #475569',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#475569';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#334155';
                }}
              >
                ↻ 示例代码
              </button>
              <button
                className="run-button"
                onClick={handleRunCode}
                disabled={isRunning}
                style={{
                  padding: '8px 20px',
                  background: isRunning ? '#2563eb' : '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: isRunning ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                  opacity: isRunning ? 0.75 : 1,
                  boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  letterSpacing: 0.3,
                }}
                onMouseEnter={(e) => {
                  if (!isRunning) (e.currentTarget as HTMLButtonElement).style.background = '#2563eb';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = isRunning ? '#2563eb' : '#3b82f6';
                }}
              >
                {isRunning ? (
                  <>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#fff',
                        borderRadius: '50%',
                        animation: 'spin 0.7s linear infinite',
                      }}
                    />
                    执行中...
                  </>
                ) : (
                  <>▶ 运行代码</>
                )}
              </button>
            </div>
          </div>

          <CodeEditor
            code={code}
            onChange={handleCodeChange}
            onCursorChange={handleCursorChange}
            onSelectionChange={handleSelectionChange}
            remoteCursors={remoteCursors}
            users={users}
          />
        </div>

        <div
          className="output-section"
          style={{
            width: '30%',
            display: 'flex',
            flexDirection: 'column',
            background: '#0f172a',
            borderRadius: 12,
            border: '1px solid #334155',
            padding: 16,
            gap: 12,
            minWidth: 0,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <h2
              className="output-title"
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#e2e8f0',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              📊 输出面板
            </h2>
            <span
              style={{
                fontSize: 10,
                color: '#64748b',
                background: '#1e293b',
                padding: '3px 8px',
                borderRadius: 6,
              }}
            >
              独立沙箱
            </span>
          </div>

          <div
            className="output-panel"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              gap: 12,
            }}
          >
            <div className="my-output" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                  flexShrink: 0,
                }}
              >
                <h3
                  className="output-subtitle"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#94a3b8',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: currentUser?.color || '#3b82f6',
                    }}
                  />
                  我的运行结果
                </h3>
                <button
                  onClick={handleClearMyOutput}
                  style={{
                    padding: '2px 8px',
                    background: 'transparent',
                    color: '#64748b',
                    border: '1px solid #334155',
                    borderRadius: 5,
                    fontSize: 11,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = '#e2e8f0';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#475569';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = '#64748b';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#334155';
                  }}
                >
                  清空
                </button>
              </div>

              <div
                className="output-content"
                ref={myOutputRef}
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  overflowX: 'auto',
                  fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace",
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: '#a0aec0',
                  background: '#1e293b',
                  borderRadius: 8,
                  padding: 12,
                  border: '1px solid #334155',
                  minHeight: 80,
                }}
              >
                {myOutputs.length === 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      minHeight: 60,
                      color: '#475569',
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 22 }}>🚀</span>
                    <span style={{ fontSize: 12 }}>点击「运行代码」查看输出</span>
                  </div>
                ) : (
                  myOutputs.map((output, index) => (
                    <div
                      key={`my-out-${output.timestamp}-${index}-${output.order}`}
                      className={`output-line ${outputTypeClass[output.type] || 'log'}`}
                      style={{
                        marginBottom: 3,
                        wordWrap: 'break-word',
                        whiteSpace: 'pre-wrap',
                        color:
                          output.type === 'error'
                            ? '#f87171'
                            : output.type === 'warn'
                              ? '#fbbf24'
                              : output.type === 'info'
                                ? '#60a5fa'
                                : output.type === 'result'
                                  ? '#34d399'
                                  : '#cbd5e1',
                        fontSize: 12.5,
                      }}
                    >
                      {output.content}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div
              className="divider"
              style={{
                width: '100%',
                height: 1,
                background: 'linear-gradient(90deg, transparent 0%, #334155 50%, transparent 100%)',
                margin: '2px 0',
                flexShrink: 0,
              }}
            />

            <div
              className="others-output"
              style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                  flexShrink: 0,
                }}
              >
                <h3
                  className="output-subtitle"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#94a3b8',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  👥 其他用户运行结果
                </h3>
                <button
                  onClick={handleClearOthersOutput}
                  style={{
                    padding: '2px 8px',
                    background: 'transparent',
                    color: '#64748b',
                    border: '1px solid #334155',
                    borderRadius: 5,
                    fontSize: 11,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = '#e2e8f0';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#475569';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = '#64748b';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#334155';
                  }}
                >
                  清空
                </button>
              </div>

              <div
                className="output-content"
                ref={otherOutputRef}
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  overflowX: 'auto',
                  background: '#1e293b',
                  borderRadius: 8,
                  padding: 10,
                  border: '1px solid #334155',
                  minHeight: 80,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {otherExecutions.length === 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      minHeight: 60,
                      color: '#475569',
                      gap: 4,
                      flex: 1,
                    }}
                  >
                    <span style={{ fontSize: 22 }}>🔔</span>
                    <span style={{ fontSize: 12 }}>暂无其他用户运行结果</span>
                  </div>
                ) : (
                  otherExecutions.map((execution, execIndex) => (
                    <div
                      key={`other-exec-${execution.userId}-${execution.receivedAt}-${execIndex}`}
                      className="other-execution-item"
                      style={{
                        padding: 10,
                        background: '#0f172a',
                        borderRadius: 8,
                        border: `1px solid ${execution.userColor}33`,
                        animation: 'execFadeIn 0.3s ease both',
                      }}
                    >
                      <div
                        className="other-execution-header"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 8,
                          paddingBottom: 6,
                          borderBottom: '1px dashed #334155',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            className="user-dot"
                            style={{
                              width: 9,
                              height: 9,
                              borderRadius: '50%',
                              background: execution.userColor,
                              boxShadow: `0 0 6px ${execution.userColor}`,
                            }}
                          />
                          <span
                            className="other-user-name"
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#e2e8f0',
                            }}
                          >
                            {execution.userName}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: 10,
                            color: '#475569',
                            fontFamily: "'Monaco', monospace",
                          }}
                        >
                          {new Date(execution.receivedAt).toLocaleTimeString('zh-CN', {
                            hour12: false,
                          })}
                        </span>
                      </div>
                      <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                        {execution.outputs.length === 0 ? (
                          <span style={{ fontSize: 11, color: '#475569' }}>（无输出）</span>
                        ) : (
                          execution.outputs.map((output, outIndex) => (
                            <div
                              key={`other-out-${execution.userId}-${outIndex}-${output.order}`}
                              className={`other-output-line ${output.type === 'error' ? 'error' : ''}`}
                              style={{
                                fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
                                fontSize: 11.5,
                                lineHeight: 1.55,
                                color: output.type === 'error' ? '#f87171' : '#a0aec0',
                                wordWrap: 'break-word',
                                whiteSpace: 'pre-wrap',
                                marginBottom: 2,
                              }}
                            >
                              {output.content}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from {
            opacity: 0;
            transform: scale(0.92) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes userCardFadeIn {
          from {
            opacity: 0;
            transform: translateY(-12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes execFadeIn {
          from {
            opacity: 0;
            transform: translateX(-8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes pulseScale {
          0% { transform: scale(1); }
          40% { transform: scale(1.12); }
          70% { transform: scale(0.98); }
          100% { transform: scale(1); }
        }
        .pulse {
          animation: pulseScale 0.3s ease;
        }
        .output-content::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .output-content::-webkit-scrollbar-track {
          background: transparent;
        }
        .output-content::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 3px;
        }
        .output-content::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
        code, pre, textarea, .code-textarea {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        textarea::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        textarea::-webkit-scrollbar-track {
          background: #1e293b;
        }
        textarea::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 4px;
          border: 2px solid #1e293b;
        }
        textarea::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
        textarea::selection {
          background-color: rgba(255, 255, 255, 0.18) !important;
        }
        * {
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>
    </div>
  );
};

export default App;
