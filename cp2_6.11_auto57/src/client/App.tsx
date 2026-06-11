import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [replaySpeed, setReplaySpeed] = useState(300);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isTablet, setIsTablet] = useState(false);
  const [editName, setEditName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const replayIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const savedGridRef = useRef<CellType[][] | null>(null);
  const savedPlayersRef = useRef<Player[] | null>(null);

  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('room') || 'default';
  const sharedData = urlParams.get('data');

  useEffect(() => {
    const checkTablet = () => {
      setIsTablet(window.innerWidth <= 1024);
      if (window.innerWidth <= 1024) {
        setSidebarOpen(false);
      }
    };
    checkTablet();
    window.addEventListener('resize', checkTablet);
    return () => window.removeEventListener('resize', checkTablet);
  }, []);

  useEffect(() => {
    const initConnection = async () => {
      try {
        setConnecting(true);
        setError(null);

        const initData = await wsManager.connect(roomId);
        setGrid(initData.grid);
        setPlayers(initData.players);
        setHints(initData.hints);
        setHistory(initData.history);
        setCurrentPlayer(initData.currentPlayer);
        setReplayIndex(initData.history.length);
        setIsConnected(true);
        setEditName(initData.currentPlayer.name);

        if (sharedData) {
          try {
            const decoded = JSON.parse(decodeURIComponent(atob(sharedData)));
            if (decoded.grid && decoded.players) {
              setGrid(decoded.grid);
              initData.players.forEach((p: Player) => {
                if (decoded.players[p.id]) {
                  p.position = decoded.players[p.id].position;
                }
              });
              setPlayers([...initData.players]);
            }
          } catch (e) {
            console.error('加载分享数据失败:', e);
          }
        }
      } catch (e) {
        console.error('连接失败:', e);
        setError('连接服务器失败，请刷新页面重试');
      } finally {
        setConnecting(false);
      }
    };

    initConnection();

    const unsubscribe = wsManager.subscribe((message) => {
      if (message.type === 'operation' && !isReplaying) {
        handleIncomingOperation(message.data);
      } else if (message.type === 'player_list' && !isReplaying) {
        setPlayers(message.data);
      } else if (message.type === 'state_sync' && !isReplaying) {
        setGrid(message.data.grid);
        setPlayers(message.data.players);
        setHints(message.data.hints);
      }
    });

    return () => {
      unsubscribe();
      wsManager.disconnect();
      if (replayIntervalRef.current) {
        clearInterval(replayIntervalRef.current);
      }
    };
  }, [roomId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setHints((prev) => {
        const now = Date.now();
        return prev.filter((h) => now - h.createdAt < h.duration);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleIncomingOperation = useCallback((operation: Operation) => {
    setHistory((prev) => {
      const exists = prev.some((o) => o.id === operation.id);
      if (exists) return prev;
      const next = [...prev, operation];
      if (next.length > 100) next.shift();
      return next;
    });
    setReplayIndex((prev) => prev + 1);

    switch (operation.type) {
      case 'move': {
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === operation.playerId
              ? { ...p, position: operation.data.position }
              : p
          )
        );
        break;
      }
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
      case 'player_leave': {
        setPlayers((prev) => prev.filter((p) => p.id !== operation.data.playerId));
        break;
      }
      case 'player_update': {
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === operation.playerId
              ? { ...p, ...operation.data }
              : p
          )
        );
        if (operation.playerId === currentPlayer?.id) {
          setCurrentPlayer((prev) => prev ? { ...prev, ...operation.data } : null);
        }
        break;
      }
    }
  }, [currentPlayer?.id]);

  const editMaze = (
    type: 'toggle_obstacle' | 'move' | 'add_hint',
    position: Position,
    data?: any
  ) => {
    if (isReplaying) return;

    const operationData: any = { position };
    if (data) {
      Object.assign(operationData, data);
    }

    if (type === 'toggle_obstacle') {
      setGrid((prev) => {
        const next = prev.map((row) => [...row]);
        next[position.y][position.x] = next[position.y][position.x] === 'empty' ? 'obstacle' : 'empty';
        return next;
      });
    } else if (type === 'move' && currentPlayer) {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === currentPlayer.id ? { ...p, position } : p
        )
      );
    } else if (type === 'add_hint') {
      const hint: Hint = {
        id: Math.random().toString(36),
        position,
        text: data.text,
        createdAt: Date.now(),
        duration: 5000,
      };
      setHints((prev) => [...prev, hint]);
    }

    wsManager.send({ type, data: operationData });

    const localOp: Operation = {
      id: Math.random().toString(36),
      type,
      playerId: wsManager.getPlayerId(),
      timestamp: Date.now(),
      data: operationData,
    };
    setHistory((prev) => {
      const next = [...prev, localOp];
      if (next.length > 100) next.shift();
      return next;
    });
    setReplayIndex((prev) => prev + 1);
  };

  const applyReplayStep = (index: number) => {
    if (!savedGridRef.current || !savedPlayersRef.current) {
      savedGridRef.current = grid.map((row) => [...row]);
      savedPlayersRef.current = players.map((p) => ({ ...p }));
    }

    const op = history[index];
    if (!op) return;

    switch (op.type) {
      case 'toggle_obstacle': {
        setGrid((prev) => {
          const next = prev.map((row) => [...row]);
          const { x, y } = op.data.position;
          next[y][x] = next[y][x] === 'empty' ? 'obstacle' : 'empty';
          return next;
        });
        break;
      }
      case 'move': {
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === op.playerId
              ? { ...p, position: op.data.position }
              : p
          )
        );
        break;
      }
      case 'player_join': {
        setPlayers((prev) => {
          const exists = prev.some((p) => p.id === op.data.player.id);
          if (exists) return prev;
          return [...prev, op.data.player];
        });
        break;
      }
      case 'player_leave': {
        setPlayers((prev) => prev.filter((p) => p.id !== op.data.playerId));
        break;
      }
    }
  };

  const startReplay = () => {
    if (history.length === 0) return;

    savedGridRef.current = Array(GRID_SIZE).fill(null).map(() =>
      Array(GRID_SIZE).fill('empty' as CellType)
    );
    savedPlayersRef.current = [];

    setGrid(Array(GRID_SIZE).fill(null).map(() =>
      Array(GRID_SIZE).fill('empty' as CellType)
    ));
    setPlayers([]);
    setHints([]);
    setReplayIndex(0);
    setIsReplaying(true);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (isPlaying && isReplaying && replayIndex < history.length) {
      replayIntervalRef.current = setInterval(() => {
        applyReplayStep(replayIndex);
        setReplayIndex((prev) => prev + 1);
      }, replaySpeed);
    } else if (replayIndex >= history.length && isReplaying) {
      setIsPlaying(false);
    }

    return () => {
      if (replayIntervalRef.current) {
        clearInterval(replayIntervalRef.current);
      }
    };
  }, [isPlaying, isReplaying, replayIndex, history.length, replaySpeed]);

  const stopReplay = () => {
    setIsReplaying(false);
    setIsPlaying(false);
    savedGridRef.current = null;
    savedPlayersRef.current = null;
    wsManager.requestStateSync();
  };

  const togglePlayPause = () => {
    if (replayIndex >= history.length) {
      startReplay();
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetIndex = parseInt(e.target.value);
    if (!isReplaying) {
      startReplay();
      setIsPlaying(false);
    }
    
    setGrid(Array(GRID_SIZE).fill(null).map(() =>
      Array(GRID_SIZE).fill('empty' as CellType)
    ));
    setPlayers([]);
    
    for (let i = 0; i < targetIndex; i++) {
      const op = history[i];
      if (op.type === 'toggle_obstacle') {
        setGrid((prev) => {
          const next = prev.map((row) => [...row]);
          const { x, y } = op.data.position;
          next[y][x] = next[y][x] === 'empty' ? 'obstacle' : 'empty';
          return next;
        });
      } else if (op.type === 'move') {
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === op.playerId
              ? { ...p, position: op.data.position }
              : p
          )
        );
      } else if (op.type === 'player_join') {
        setPlayers((prev) => {
          const exists = prev.some((p) => p.id === op.data.player.id);
          if (exists) return prev;
          return [...prev, op.data.player];
        });
      } else if (op.type === 'player_leave') {
        setPlayers((prev) => prev.filter((p) => p.id !== op.data.playerId));
      }
    }
    setReplayIndex(targetIndex);
  };

  const saveMaze = () => {
    const saveData = {
      grid,
      players: players.reduce((acc, p) => {
        acc[p.id] = { position: p.position };
        return acc;
      }, {} as Record<string, { position: Position }>),
      savedAt: Date.now(),
    };
    const encoded = btoa(encodeURIComponent(JSON.stringify(saveData)));
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}&data=${encoded}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('分享链接已复制到剪贴板！');
    }).catch(() => {
      prompt('复制以下链接分享给好友：', shareUrl);
    });
  };

  const updatePlayerName = () => {
    if (!editName.trim() || !currentPlayer) return;
    wsManager.send({
      type: 'player_update',
      data: { name: editName.trim() },
    });
    setShowNameInput(false);
  };

  const copyRoomId = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('房间链接已复制到剪贴板！');
    }).catch(() => {
      prompt('复制以下链接邀请好友：', shareUrl);
    });
  };

  if (connecting) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 20,
      }}>
        <div style={{
          width: 60,
          height: 60,
          border: '4px solid rgba(255,255,255,0.1)',
          borderTopColor: '#4ECDC4',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <div style={{ fontSize: 18, opacity: 0.8 }}>正在连接迷宫服务器...</div>
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
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 20,
      }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <div style={{ fontSize: 18, color: '#FF6B6B' }}>{error}</div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '12px 24px',
            backgroundColor: '#4ECDC4',
            border: 'none',
            borderRadius: 8,
            color: '#1A1A2E',
            fontSize: 16,
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          刷新重试
        </button>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      backgroundColor: '#1A1A2E',
      position: 'relative',
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 24 }}>🧩</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 'bold' }}>协作迷宫</div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>Collaborative Maze</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderRadius: 20,
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: isConnected ? '#4ECDC4' : '#FF6B6B',
                animation: isConnected ? 'pulse-dot 2s ease-in-out infinite' : 'none',
              }} />
              <span style={{ fontSize: 13 }}>{isConnected ? '已连接' : '连接中'}</span>
            </div>
            {isTablet && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: 8,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                {sidebarOpen ? '隐藏面板' : '显示面板'}
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
        <div style={{
          width: isTablet ? 'auto' : 300,
          minWidth: isTablet ? 0 : 300,
          borderLeft: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          flexDirection: 'column',
          padding: 20,
          gap: 24,
          overflowY: 'auto',
          position: isTablet ? 'absolute' : 'relative',
          right: 0,
          top: 0,
          height: '100%',
          zIndex: 100,
          backdropFilter: isTablet ? 'blur(20px)' : 'none',
          backgroundColor: isTablet ? 'rgba(26, 26, 46, 0.95)' : 'rgba(255,255,255,0.03)',
        }}>
          {currentPlayer && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, opacity: 0.8 }}>
                我的信息
              </h3>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: 12,
              }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: currentPlayer.color,
                  boxShadow: `0 0 15px ${currentPlayer.color}`,
                  animation: 'pulse 1.5s ease-in-out infinite',
                }} />
                {showNameInput ? (
                  <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid rgba(255,255,255,0.2)',
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        color: 'white',
                        fontSize: 14,
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={updatePlayerName}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#4ECDC4',
                        border: 'none',
                        borderRadius: 6,
                        color: '#1A1A2E',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                      }}
                    >
                      确定
                    </button>
                  </div>
                ) : (
                  <div style={{ flex: 1 }}>
                    <div
                      onClick={() => setShowNameInput(true)}
                      style={{ fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
                    >
                      {currentPlayer.name} ✏️
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>
                      点击修改名称
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, opacity: 0.8 }}>
              在线玩家 ({players.length}/8)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {players.map((player) => (
                <div
                  key={player.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    backgroundColor: player.id === currentPlayer?.id
                      ? 'rgba(78, 205, 196, 0.15)'
                      : 'rgba(255,255,255,0.03)',
                    borderRadius: 8,
                    border: player.id === currentPlayer?.id
                      ? '1px solid rgba(78, 205, 196, 0.3)'
                      : '1px solid transparent',
                  }}
                >
                  <div style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    backgroundColor: player.color,
                    boxShadow: `0 0 8px ${player.color}`,
                  }} />
                  <span style={{ fontSize: 13 }}>{player.name}</span>
                  {player.id === currentPlayer?.id && (
                    <span style={{ fontSize: 10, color: '#4ECDC4', marginLeft: 'auto' }}>
                      (我)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, opacity: 0.8 }}>
              历史回放
            </h3>
            <div style={{
              padding: 16,
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderRadius: 12,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}>
                <span style={{ fontSize: 12, opacity: 0.6 }}>
                  步骤 {replayIndex} / {history.length}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {isReplaying ? (
                    <button
                      onClick={stopReplay}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#FF6B6B',
                        border: 'none',
                        borderRadius: 6,
                        color: 'white',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      停止回放
                    </button>
                  ) : (
                    <button
                      onClick={startReplay}
                      disabled={history.length === 0}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: history.length === 0 ? 'rgba(255,255,255,0.1)' : '#4ECDC4',
                        border: 'none',
                        borderRadius: 6,
                        color: history.length === 0 ? 'rgba(255,255,255,0.4)' : '#1A1A2E',
                        fontSize: 12,
                        fontWeight: 'bold',
                        cursor: history.length === 0 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      ▶️ 开始回放
                    </button>
                  )}
                  {isReplaying && (
                    <button
                      onClick={togglePlayPause}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: 6,
                        color: 'white',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      {isPlaying ? '⏸️ 暂停' : '▶️ 继续'}
                    </button>
                  )}
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={history.length}
                value={replayIndex}
                onChange={handleSliderChange}
                disabled={!isReplaying && history.length === 0}
                style={{
                  width: '100%',
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  outline: 'none',
                  WebkitAppearance: 'none',
                }}
              />
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginTop: 12,
              }}>
                <span style={{ fontSize: 12, opacity: 0.6 }}>速度:</span>
                {[150, 300, 500].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setReplaySpeed(speed)}
                    style={{
                      padding: '4px 10px',
                      backgroundColor: replaySpeed === speed ? '#4ECDC4' : 'rgba(255,255,255,0.1)',
                      border: 'none',
                      borderRadius: 6,
                      color: replaySpeed === speed ? '#1A1A2E' : 'white',
                      fontSize: 11,
                      fontWeight: replaySpeed === speed ? 'bold' : 'normal',
                      cursor: 'pointer',
                    }}
                  >
                    {speed === 150 ? '快' : speed === 300 ? '中' : '慢'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, opacity: 0.8 }}>
              房间信息
            </h3>
            <div
              onClick={copyRoomId}
              style={{
                padding: 12,
                backgroundColor: 'rgba(255,255,255,0.03)',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                fontSize: 13,
                fontFamily: 'monospace',
                wordBreak: 'break-all',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)')}
            >
              房间: {roomId}
              <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4 }}>
                点击复制邀请链接
              </div>
            </div>
          </div>

          <button
            onClick={saveMaze}
            style={{
              padding: '14px 20px',
              backgroundColor: 'linear-gradient(135deg, #4ECDC4, #44A08D)',
              background: 'linear-gradient(135deg, #4ECDC4, #44A08D)',
              border: 'none',
              borderRadius: 12,
              color: '#1A1A2E',
              fontSize: 15,
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 4px 15px rgba(78, 205, 196, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(78, 205, 196, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(78, 205, 196, 0.3)';
            }}
          >
            💾 保存并分享迷宫
          </button>

          <div style={{
            marginTop: 'auto',
            padding: 12,
            backgroundColor: 'rgba(255,255,255,0.02)',
            borderRadius: 8,
            fontSize: 11,
            opacity: 0.5,
            lineHeight: 1.6,
          }}>
            <div style={{ marginBottom: 6 }}><strong>操作说明:</strong></div>
            <div>• 点击空格添加/移除障碍物</div>
            <div>• 拖拽自己的图标移动</div>
            <div>• 点击自己的图标放置提示</div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 10px currentColor, 0 0 20px currentColor;
          }
          50% {
            box-shadow: 0 0 20px currentColor, 0 0 40px currentColor, 0 0 60px currentColor;
          }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #4ECDC4;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(78, 205, 196, 0.5);
        }
        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #4ECDC4;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 10px rgba(78, 205, 196, 0.5);
        }
      `}</style>
    </div>
  );
};

export default App;
