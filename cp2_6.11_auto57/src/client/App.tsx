import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import MazeGrid from './MazeGrid';
import wsManager from './WebSocketManager';
import { GRID_SIZE, CellType, Player, Hint, Operation, Position } from '../types';

const App: React.FC = () => {
  const [grid, setGrid] = useState<CellType[][]>(() =>
    Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('empty' as CellType))
  );
  const [players, setPlayers] = useState<Player[]>([]);
  const [hints, setHints] = useState<Hint[]>([]);
  const [history, setHistory] = useState<Operation[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isReplaying, setIsReplaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(300);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isTablet, setIsTablet] = useState(false);
  const [editName, setEditName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [floatBtnVisible, setFloatBtnVisible] = useState(false);

  const replayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncSnapshotRef = useRef<{ grid: CellType[][]; players: Player[] } | null>(null);

  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const roomId = useMemo(() => urlParams.get('room') || 'default', [urlParams]);
  const sharedData = useMemo(() => urlParams.get('data'), [urlParams]);

  useEffect(() => {
    const checkTablet = () => {
      const tablet = window.innerWidth <= 1024;
      setIsTablet(tablet);
      if (tablet) {
        setSidebarOpen(false);
        setFloatBtnVisible(true);
      } else {
        setSidebarOpen(true);
        setFloatBtnVisible(false);
      }
    };
    checkTablet();
    window.addEventListener('resize', checkTablet);
    return () => window.removeEventListener('resize', checkTablet);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setHints((prev) => {
        const now = Date.now();
        return prev.filter((h) => now - h.createdAt < h.duration);
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const createEmptyGrid = useCallback((): CellType[][] =>
    Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('empty' as CellType)), []);

  useEffect(() => {
    let cancelled = false;

    const initConnection = async () => {
      try {
        setConnecting(true);
        setError(null);

        const initData = await wsManager.connect(roomId);

        if (cancelled) return;

        let initialGrid = initData.grid;
        let initialPlayers = initData.players;

        if (sharedData) {
          try {
            const decoded = JSON.parse(decodeURIComponent(atob(sharedData)));
            if (decoded.grid && Array.isArray(decoded.grid)) {
              initialGrid = decoded.grid;
            }
            if (decoded.players && initialPlayers) {
              initialPlayers = initialPlayers.map((p: Player) => ({
                ...p,
                position: decoded.players[p.id]?.position || p.position,
              }));
            }
          } catch (e) {
            console.warn('加载分享数据失败，使用服务器原始数据:', e);
          }
        }

        setGrid(initialGrid);
        setPlayers(initialPlayers);
        setHints(initData.hints || []);
        setHistory(initData.history || []);
        setCurrentPlayer(initData.currentPlayer);
        setReplayIndex((initData.history || []).length);
        setIsConnected(true);
        setEditName(initData.currentPlayer.name);
      } catch (e) {
        console.error('连接失败:', e);
        if (!cancelled) {
          setError('连接服务器失败，请刷新页面重试');
        }
      } finally {
        if (!cancelled) setConnecting(false);
      }
    };

    initConnection();

    const unsubscribe = wsManager.subscribe((message) => {
      if (isReplaying) return;

      if (message.type === 'operation') {
        const op = message.data as Operation;
        applyOperation(op, true);
      } else if (message.type === 'player_list') {
        setPlayers(message.data);
      } else if (message.type === 'state_sync') {
        setGrid(message.data.grid);
        setPlayers(message.data.players);
        setHints(message.data.hints || []);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
      wsManager.disconnect();
      if (replayTimerRef.current) {
        clearTimeout(replayTimerRef.current);
        replayTimerRef.current = null;
      }
    };
  }, [roomId, sharedData, isReplaying, createEmptyGrid]);

  const applyOperation = useCallback((operation: Operation, fromRemote: boolean = false) => {
    if (!fromRemote) {
      setHistory((prev) => {
        const exists = prev.some((o) => o.id === operation.id);
        if (exists) return prev;
        const next = [...prev, operation];
        if (next.length > 100) next.shift();
        return next;
      });
    } else {
      setHistory((prev) => {
        const exists = prev.some((o) => o.id === operation.id);
        if (exists) return prev;
        return [...prev, operation];
      });
    }

    if (!isReplaying) {
      setReplayIndex((prev) => prev + 1);
    }

    switch (operation.type) {
      case 'move':
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === operation.playerId ? { ...p, position: operation.data.position } : p
          )
        );
        break;
      case 'toggle_obstacle': {
        setGrid((prev) => {
          const next = prev.map((row) => [...row]);
          const { x, y } = operation.data.position;
          next[y][x] = next[y][x] === 'empty' ? 'obstacle' : 'empty';
          return next;
        });
        break;
      }
      case 'add_hint': {
        const hint: Hint = {
          id: operation.id,
          position: operation.data.position,
          text: operation.data.text,
          createdAt: Date.now(),
          duration: 5000,
        };
        setHints((prev) => [...prev, hint]);
        break;
      }
      case 'player_join': {
        setPlayers((prev) => {
          const exists = prev.some((p) => p.id === operation.data.player.id);
          if (exists) return prev;
          return [...prev, operation.data.player];
        });
        break;
      }
      case 'player_leave':
        setPlayers((prev) => prev.filter((p) => p.id !== operation.data.playerId));
        break;
      case 'player_update': {
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === operation.playerId ? { ...p, ...operation.data } : p
          )
        );
        if (operation.playerId === currentPlayer?.id) {
          setCurrentPlayer((prev) => (prev ? { ...prev, ...operation.data } : null));
        }
        break;
      }
    }
  }, [currentPlayer?.id, isReplaying]);

  const editMaze = (
    type: 'toggle_obstacle' | 'move' | 'add_hint',
    position: Position,
    data?: any
  ) => {
    if (isReplaying) return;

    const operationData: any = { position };
    if (data) Object.assign(operationData, data);

    const localOp: Operation = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      type,
      playerId: wsManager.getPlayerId(),
      timestamp: Date.now(),
      data: operationData,
    };

    applyOperation(localOp, false);
    wsManager.send({ type, data: operationData });
  };

  const takeSnapshot = useCallback(() => {
    lastSyncSnapshotRef.current = {
      grid: grid.map((row) => [...row]),
      players: players.map((p) => ({ ...p })),
    };
  }, [grid, players]);

  const replayStep = useCallback((op: Operation) => {
    switch (op.type) {
      case 'move':
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === op.playerId ? { ...p, position: op.data.position } : p
          )
        );
        break;
      case 'toggle_obstacle':
        setGrid((prev) => {
          const next = prev.map((row) => [...row]);
          const { x, y } = op.data.position;
          next[y][x] = next[y][x] === 'empty' ? 'obstacle' : 'empty';
          return next;
        });
        break;
      case 'player_join':
        setPlayers((prev) => {
          const exists = prev.some((p) => p.id === op.data.player.id);
          if (exists) return prev;
          return [...prev, op.data.player];
        });
        break;
      case 'player_leave':
        setPlayers((prev) => prev.filter((p) => p.id !== op.data.playerId));
        break;
    }
  }, []);

  const startReplay = useCallback(() => {
    if (history.length === 0) return;
    takeSnapshot();
    setGrid(createEmptyGrid());
    setPlayers([]);
    setHints([]);
    setReplayIndex(0);
    setIsReplaying(true);
    setIsPlaying(true);
  }, [history.length, takeSnapshot, createEmptyGrid]);

  const stopReplay = useCallback(() => {
    setIsReplaying(false);
    setIsPlaying(false);
    if (replayTimerRef.current) {
      clearTimeout(replayTimerRef.current);
      replayTimerRef.current = null;
    }
    if (lastSyncSnapshotRef.current) {
      setGrid(lastSyncSnapshotRef.current.grid);
      setPlayers(lastSyncSnapshotRef.current.players);
      lastSyncSnapshotRef.current = null;
    } else {
      wsManager.requestStateSync();
    }
    setReplayIndex(history.length);
  }, [history.length]);

  useEffect(() => {
    if (isPlaying && isReplaying && replayIndex < history.length) {
      const step = () => {
        const op = history[replayIndex];
        if (op) replayStep(op);
        setReplayIndex((prev) => prev + 1);
      };
      replayTimerRef.current = setTimeout(step, replaySpeed);
    } else if (isPlaying && isReplaying && replayIndex >= history.length) {
      setIsPlaying(false);
    }

    return () => {
      if (replayTimerRef.current) {
        clearTimeout(replayTimerRef.current);
        replayTimerRef.current = null;
      }
    };
  }, [isPlaying, isReplaying, replayIndex, history.length, history, replaySpeed, replayStep]);

  const togglePlayPause = () => {
    if (replayIndex >= history.length) {
      startReplay();
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const seekReplay = (targetIndex: number) => {
    if (history.length === 0) return;

    if (!isReplaying) {
      takeSnapshot();
      setIsReplaying(true);
    }
    setIsPlaying(false);
    if (replayTimerRef.current) {
      clearTimeout(replayTimerRef.current);
      replayTimerRef.current = null;
    }

    setGrid(createEmptyGrid());
    setPlayers([]);
    setHints([]);

    for (let i = 0; i < targetIndex; i++) {
      const op = history[i];
      if (op) {
        switch (op.type) {
          case 'move':
            setPlayers((prev) =>
              prev.map((p) =>
                p.id === op.playerId ? { ...p, position: op.data.position } : p
              )
            );
            break;
          case 'toggle_obstacle':
            setGrid((prev) => {
              const next = prev.map((row) => [...row]);
              const { x, y } = op.data.position;
              next[y][x] = next[y][x] === 'empty' ? 'obstacle' : 'empty';
              return next;
            });
            break;
          case 'player_join':
            setPlayers((prev) => {
              const exists = prev.some((p) => p.id === op.data.player.id);
              if (exists) return prev;
              return [...prev, op.data.player];
            });
            break;
          case 'player_leave':
            setPlayers((prev) => prev.filter((p) => p.id !== op.data.playerId));
            break;
        }
      }
    }
    setReplayIndex(targetIndex);
  };

  const saveMaze = () => {
    const playersData = players.reduce((acc, p) => {
      acc[p.id] = { position: p.position };
      return acc;
    }, {} as Record<string, { position: Position }>);

    const saveData = {
      grid,
      players: playersData,
      savedAt: Date.now(),
      version: 1,
    };

    try {
      const encoded = btoa(encodeURIComponent(JSON.stringify(saveData)));
      const shareUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(roomId)}&data=${encoded}`;

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard
          .writeText(shareUrl)
          .then(() => showToast('分享链接已复制到剪贴板！', 'success'))
          .catch(() => promptLink(shareUrl));
      } else {
        promptLink(shareUrl);
      }
    } catch (e) {
      console.error('保存失败:', e);
      showToast('保存失败，请重试', 'error');
    }
  };

  const promptLink = (url: string) => {
    window.prompt('复制以下链接分享给好友：', url);
  };

  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const showToast = (message: string, type: string = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const updatePlayerName = () => {
    if (!editName.trim() || !currentPlayer) {
      setShowNameInput(false);
      return;
    }
    wsManager.send({
      type: 'player_update',
      data: { name: editName.trim() },
    });
    setShowNameInput(false);
    showToast('名称已更新', 'success');
  };

  const copyRoomLink = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(roomId)}`;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => showToast('房间链接已复制！', 'success'))
        .catch(() => promptLink(shareUrl));
    } else {
      promptLink(shareUrl);
    }
  };

  if (connecting) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 24,
          background:
            'radial-gradient(circle at 50% 50%, #1a1a3e 0%, #1A1A2E 100%)',
        }}
      >
        <div style={{ position: 'relative' }}>
          <div
            style={{
              width: 80,
              height: 80,
              border: '5px solid rgba(255,255,255,0.08)',
              borderTopColor: '#4ECDC4',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 32,
            }}
          >
            🧩
          </div>
        </div>
        <div style={{ fontSize: 18, opacity: 0.85, fontWeight: 500 }}>
          正在进入迷宫房间...
        </div>
        <div style={{ fontSize: 13, opacity: 0.45 }}>
          房间 ID: {roomId}
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 24,
          background:
            'radial-gradient(circle at 50% 50%, #2a1a2e 0%, #1A1A2E 100%)',
        }}
      >
        <div style={{ fontSize: 64, filter: 'drop-shadow(0 4px 12px rgba(255,107,107,0.4))' }}>
          ⚠️
        </div>
        <div style={{ fontSize: 20, color: '#FF8A8A', fontWeight: 500 }}>{error}</div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '14px 32px',
            backgroundColor: '#4ECDC4',
            border: 'none',
            borderRadius: 12,
            color: '#1A1A2E',
            fontSize: 16,
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(78, 205, 196, 0.4)',
            transition: 'transform 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          🔄 刷新重试
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        backgroundColor: '#1A1A2E',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 20% 10%, rgba(78, 205, 196, 0.06), transparent 40%), radial-gradient(circle at 80% 90%, rgba(255, 107, 107, 0.06), transparent 40%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            padding: '14px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(10px)',
            backgroundColor: 'rgba(26,26,46,0.85)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background:
                  'linear-gradient(135deg, rgba(78,205,196,0.2), rgba(255,107,107,0.2))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              🧩
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 0.5 }}>
                协作迷宫
              </div>
              <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>
                Collaborative Maze Editor
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '7px 14px',
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderRadius: 24,
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  backgroundColor: isConnected ? '#4ECDC4' : '#FF6B6B',
                  boxShadow: isConnected
                    ? '0 0 10px #4ECDC4'
                    : '0 0 10px #FF6B6B',
                  animation: 'dot-pulse 2s ease-in-out infinite',
                }}
              />
              <span style={{ fontSize: 13, opacity: 0.85 }}>
                {isConnected ? '已连接' : '连接中'}
              </span>
            </div>

            {isTablet && floatBtnVisible && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{
                  padding: '9px 16px',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {sidebarOpen ? '✕ 隐藏' : '☰ 面板'}
              </button>
            )}
          </div>
        </div>

        <MazeGrid
          grid={grid}
          players={players}
          hints={hints}
          currentPlayerId={currentPlayer?.id || ''}
          editMaze={editMaze}
          isReplaying={isReplaying}
        />
      </div>

      {(!isTablet || sidebarOpen) && (
        <div
          style={{
            width: 320,
            minWidth: isTablet ? 0 : 320,
            maxWidth: '90vw',
            borderLeft: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            padding: 22,
            gap: 24,
            overflowY: 'auto',
            position: isTablet ? 'absolute' : 'relative',
            right: 0,
            top: 0,
            height: '100%',
            zIndex: 100,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            backgroundColor: isTablet
              ? 'rgba(20, 20, 40, 0.96)'
              : 'rgba(255,255,255,0.02)',
            boxShadow: isTablet ? '-8px 0 32px rgba(0,0,0,0.5)' : 'none',
          }}
        >
          {currentPlayer && (
            <div>
              <h3
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 12,
                  opacity: 0.75,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                我的信息
              </h3>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: 16,
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    backgroundColor: currentPlayer.color,
                    flexShrink: 0,
                    color: currentPlayer.color,
                    animation: 'avatar-pulse 1.5s ease-in-out infinite',
                  }}
                />
                {showNameInput ? (
                  <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && updatePlayerName()}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 10,
                        border: '1px solid rgba(78,205,196,0.4)',
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        color: 'white',
                        fontSize: 14,
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={updatePlayerName}
                      style={{
                        padding: '0 14px',
                        backgroundColor: '#4ECDC4',
                        border: 'none',
                        borderRadius: 10,
                        color: '#1A1A2E',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                      }}
                    >
                      ✓
                    </button>
                  </div>
                ) : (
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div
                      onClick={() => setShowNameInput(true)}
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {currentPlayer.name}
                      </span>
                      <span style={{ opacity: 0.4, fontSize: 13 }}>✏️</span>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        opacity: 0.45,
                        marginTop: 4,
                      }}
                    >
                      点击修改名称
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <h3
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 12,
                opacity: 0.75,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              在线玩家 ({players.length}/8)
            </h3>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                maxHeight: 200,
                overflowY: 'auto',
              }}
            >
              {players.length === 0 && (
                <div style={{ fontSize: 13, opacity: 0.4, padding: 16, textAlign: 'center' }}>
                  暂无其他玩家在线
                </div>
              )}
              {players.map((player) => (
                <div
                  key={player.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    backgroundColor:
                      player.id === currentPlayer?.id
                        ? 'rgba(78, 205, 196, 0.1)'
                        : 'rgba(255,255,255,0.02)',
                    borderRadius: 12,
                    border:
                      player.id === currentPlayer?.id
                        ? '1px solid rgba(78, 205, 196, 0.25)'
                        : '1px solid transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      backgroundColor: player.color,
                      flexShrink: 0,
                      boxShadow: `0 0 8px ${player.color}80`,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 13.5,
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {player.name}
                  </span>
                  {player.id === currentPlayer?.id && (
                    <span
                      style={{
                        fontSize: 10,
                        color: '#4ECDC4',
                        fontWeight: 600,
                        padding: '2px 8px',
                        backgroundColor: 'rgba(78,205,196,0.12)',
                        borderRadius: 10,
                      }}
                    >
                      我
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 12,
                opacity: 0.75,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              历史操作回放
            </h3>
            <div
              style={{
                padding: 18,
                backgroundColor: 'rgba(255,255,255,0.02)',
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    opacity: 0.55,
                    fontFamily: 'monospace',
                  }}
                >
                  {replayIndex} / {history.length} 步
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {isReplaying ? (
                    <button
                      onClick={stopReplay}
                      title="停止回放"
                      style={{
                        padding: '7px 12px',
                        backgroundColor: 'rgba(255,107,107,0.15)',
                        border: '1px solid rgba(255,107,107,0.3)',
                        borderRadius: 10,
                        color: '#FF8A8A',
                        fontSize: 12,
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      ■ 停止
                    </button>
                  ) : (
                    <button
                      onClick={startReplay}
                      disabled={history.length === 0}
                      title="从开始回放"
                      style={{
                        padding: '7px 12px',
                        backgroundColor:
                          history.length === 0
                            ? 'rgba(255,255,255,0.04)'
                            : 'rgba(78,205,196,0.15)',
                        border:
                          history.length === 0
                            ? '1px solid transparent'
                            : '1px solid rgba(78,205,196,0.3)',
                        borderRadius: 10,
                        color: history.length === 0 ? 'rgba(255,255,255,0.3)' : '#4ECDC4',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: history.length === 0 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      ▶ 回放
                    </button>
                  )}
                  {isReplaying && (
                    <button
                      onClick={togglePlayPause}
                      style={{
                        padding: '7px 12px',
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 10,
                        color: 'white',
                        fontSize: 12,
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      {isPlaying ? '⏸ 暂停' : '▶ 继续'}
                    </button>
                  )}
                </div>
              </div>

              <input
                type="range"
                min={0}
                max={Math.max(history.length, 1)}
                value={replayIndex}
                onChange={(e) => seekReplay(parseInt(e.target.value))}
                disabled={history.length === 0 && !isReplaying}
                style={{
                  width: '100%',
                  height: 5,
                  borderRadius: 5,
                  background:
                    history.length > 0
                      ? `linear-gradient(to right, #4ECDC4 ${(replayIndex / Math.max(history.length, 1)) * 100}%, rgba(255,255,255,0.08) ${(replayIndex / Math.max(history.length, 1)) * 100}%)`
                      : 'rgba(255,255,255,0.06)',
                  outline: 'none',
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  cursor: history.length > 0 || isReplaying ? 'pointer' : 'default',
                }}
              />

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginTop: 16,
                  paddingTop: 14,
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <span style={{ fontSize: 12, opacity: 0.5 }}>速度:</span>
                <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                  {[
                    { v: 150, label: '快' },
                    { v: 300, label: '中' },
                    { v: 500, label: '慢' },
                  ].map(({ v, label }) => (
                    <button
                      key={v}
                      onClick={() => setReplaySpeed(v)}
                      style={{
                        padding: '6px 0',
                        flex: 1,
                        backgroundColor:
                          replaySpeed === v
                            ? 'rgba(78,205,196,0.18)'
                            : 'rgba(255,255,255,0.03)',
                        border:
                          replaySpeed === v
                            ? '1px solid rgba(78,205,196,0.35)'
                            : '1px solid transparent',
                        borderRadius: 8,
                        color: replaySpeed === v ? '#4ECDC4' : 'rgba(255,255,255,0.6)',
                        fontSize: 12,
                        fontWeight: replaySpeed === v ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 12,
                opacity: 0.75,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              房间信息
            </h3>
            <div
              onClick={copyRoomLink}
              style={{
                padding: 14,
                backgroundColor: 'rgba(255,255,255,0.02)',
                borderRadius: 12,
                cursor: 'pointer',
                transition: 'all 0.15s',
                fontSize: 13,
                border: '1px solid rgba(255,255,255,0.05)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(78,205,196,0.08)';
                e.currentTarget.style.borderColor = 'rgba(78,205,196,0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 15 }}>🔗</span>
                <span style={{ fontWeight: 600 }}>房间链接</span>
              </div>
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: 11,
                  opacity: 0.5,
                  wordBreak: 'break-all',
                  lineHeight: 1.4,
                }}
              >
                /room?room={roomId}
              </div>
              <div style={{ fontSize: 10, opacity: 0.4, marginTop: 6 }}>
                点击复制邀请链接
              </div>
            </div>
          </div>

          <button
            onClick={saveMaze}
            style={{
              padding: '16px 20px',
              background: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)',
              border: 'none',
              borderRadius: 14,
              color: '#151530',
              fontSize: 15,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow:
                '0 6px 24px rgba(78, 205, 196, 0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
              transition: 'all 0.15s',
              letterSpacing: 0.5,
              marginTop: 4,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow =
                '0 10px 32px rgba(78, 205, 196, 0.45), inset 0 1px 0 rgba(255,255,255,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow =
                '0 6px 24px rgba(78, 205, 196, 0.35), inset 0 1px 0 rgba(255,255,255,0.2)';
            }}
          >
            💾 保存迷宫并生成分享链接
          </button>

          <div
            style={{
              marginTop: 'auto',
              padding: 16,
              backgroundColor: 'rgba(255,255,255,0.015)',
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.04)',
              fontSize: 11.5,
              opacity: 0.6,
              lineHeight: 1.8,
            }}
          >
            <div style={{ marginBottom: 8, fontWeight: 700, opacity: 0.9 }}>
              🎮 操作指南
            </div>
            <div>• 单击空格 → 添加/移除障碍物</div>
            <div>• 双击任意格子 → 放置提示</div>
            <div>• 长按拖拽自己的图标 → 移动</div>
            <div>• 拖动历史滑块 → 回放操作</div>
          </div>
        </div>
      )}

      {isTablet && !sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            position: 'fixed',
            right: 20,
            bottom: 28,
            width: 58,
            height: 58,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4ECDC4, #44A08D)',
            border: 'none',
            color: '#1A1A2E',
            fontSize: 24,
            cursor: 'pointer',
            zIndex: 999,
            boxShadow: '0 8px 28px rgba(78,205,196,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
          }}
        >
          ☰
        </button>
      )}

      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 28,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 22px',
            backgroundColor:
              toast.type === 'success'
                ? 'rgba(78,205,196,0.95)'
                : toast.type === 'error'
                ? 'rgba(255,107,107,0.95)'
                : 'rgba(40,40,70,0.95)',
            color: toast.type === 'success' || toast.type === 'error' ? '#1A1A2E' : '#fff',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            zIndex: 9999,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(10px)',
            animation: 'toast-in 0.2s ease-out',
          }}
        >
          {toast.message}
        </div>
      )}

      <style>{`
        @keyframes dot-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.15); }
        }
        @keyframes avatar-pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 currentColor, 0 0 12px currentColor;
          }
          50% {
            box-shadow: 0 0 0 10px transparent, 0 0 24px currentColor, 0 0 48px currentColor;
          }
        }
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4ECDC4, #44A08D);
          cursor: pointer;
          box-shadow: 0 2px 10px rgba(78,205,196,0.5), 0 0 0 4px rgba(78,205,196,0.12);
          transition: transform 0.1s;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4ECDC4, #44A08D);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 10px rgba(78,205,196,0.5);
        }
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.02);
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
      `}</style>
    </div>
  );
};

export default App;
