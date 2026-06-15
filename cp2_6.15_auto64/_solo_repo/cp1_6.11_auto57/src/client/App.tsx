import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Action,
  CellType,
  Hint,
  MAZE_HEIGHT,
  MAZE_WIDTH,
  MazeState,
  Player,
  PLAYBACK_INTERVAL,
  createInitialState,
  getRandomColor,
  getRandomName,
} from '@shared/types';
import {
  WebSocketManager,
  setupMessageHandlers,
  applyActionToState,
} from './WebSocketManager';
import MazeGrid from './MazeGrid';
import ControlPanel from './components/ControlPanel';

function generateRoomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function getUrlParams(): { roomId?: string; data?: string } {
  const params = new URLSearchParams(window.location.search);
  return {
    roomId: params.get('id') || undefined,
    data: params.get('data') || undefined,
  };
}

const App: React.FC = () => {
  const [mazeState, setMazeState] = useState<MazeState>(createInitialState());
  const [selfPlayerId, setSelfPlayerId] = useState<string | null>(null);
  const [playerName] = useState<string>(getRandomName());
  const [playerColor] = useState<string>(getRandomColor());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  const [hintCell, setHintCell] = useState<{ x: number; y: number } | null>(null);
  const [hintText, setHintText] = useState('');

  const [isPlaybackMode, setIsPlaybackMode] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackState, setPlaybackState] = useState<MazeState | null>(null);
  const playbackTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const baseStateRef = useRef<MazeState | null>(null);

  const wsManagerRef = useRef<WebSocketManager | null>(null);
  const historyRef = useRef<Action[]>([]);

  useEffect(() => {
    historyRef.current = mazeState.history;
  }, [mazeState.history]);

  const activeState = isPlaybackMode && playbackState ? playbackState : mazeState;

  const cellSize = useMemo(() => {
    const availableWidth = Math.max(window.innerWidth - 340, 400);
    const availableHeight = window.innerHeight - 80;
    const sizeByWidth = Math.floor(availableWidth / MAZE_WIDTH);
    const sizeByHeight = Math.floor(availableHeight / MAZE_HEIGHT);
    return Math.max(20, Math.min(36, Math.min(sizeByWidth, sizeByHeight)));
  }, []);

  const handleStateSync = useCallback(
    (state: MazeState & { selfPlayerId: string; error?: string }) => {
      if (state.error) {
        setError(state.error);
        setIsLoading(false);
        return;
      }
      setMazeState({
        width: state.width,
        height: state.height,
        grid: state.grid.map((row) => [...row]),
        players: state.players.map((p) => ({ ...p })),
        hints: state.hints.map((h) => ({ ...h })),
        history: state.history.map((a) => ({ ...a })),
      });
      setSelfPlayerId(state.selfPlayerId);
      setIsLoading(false);
      setError(null);
    },
    []
  );

  const handlePlayerJoin = useCallback((player: Player) => {
    setMazeState((prev) => {
      if (prev.players.some((p) => p.id === player.id)) return prev;
      return { ...prev, players: [...prev.players, { ...player }] };
    });
  }, []);

  const handlePlayerLeave = useCallback((playerId: string) => {
    setMazeState((prev) => ({
      ...prev,
      players: prev.players.filter((p) => p.id !== playerId),
    }));
  }, []);

  const handlePlayerMove = useCallback(
    (data: { playerId: string; newX: number; newY: number }) => {
      setMazeState((prev) => ({
        ...prev,
        players: prev.players.map((p) =>
          p.id === data.playerId ? { ...p, x: data.newX, y: data.newY } : p
        ),
      }));
    },
    []
  );

  const handleToggleObstacle = useCallback(
    (data: { x: number; y: number; cellType: CellType }) => {
      setMazeState((prev) => {
        const newGrid = prev.grid.map((row) => [...row]);
        if (
          data.y >= 0 &&
          data.y < prev.height &&
          data.x >= 0 &&
          data.x < prev.width
        ) {
          newGrid[data.y][data.x] = data.cellType;
        }
        return { ...prev, grid: newGrid };
      });
    },
    []
  );

  const handleAddHint = useCallback((hint: Hint) => {
    setMazeState((prev) => ({ ...prev, hints: [...prev.hints, { ...hint }] }));

    setTimeout(() => {
      setMazeState((prev) => ({
        ...prev,
        hints: prev.hints.filter((h) => h.id !== hint.id),
      }));
    }, hint.duration);
  }, []);

  const handleRenamePlayer = useCallback(
    (data: { playerId: string; name: string }) => {
      setMazeState((prev) => ({
        ...prev,
        players: prev.players.map((p) =>
          p.id === data.playerId ? { ...p, name: data.name } : p
        ),
      }));
    },
    []
  );

  useEffect(() => {
    const { roomId: urlRoomId, data } = getUrlParams();
    const roomId = urlRoomId || generateRoomId();

    if (!urlRoomId) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('id', roomId);
      window.history.replaceState({}, '', newUrl.toString());
    }

    if (data) {
      try {
        const decoded = decodeURIComponent(escape(atob(data)));
        const imported = JSON.parse(decoded);
        if (imported.grid && imported.players) {
          setMazeState({
            width: imported.width || MAZE_WIDTH,
            height: imported.height || MAZE_HEIGHT,
            grid: imported.grid,
            players: imported.players.map((p: Player) => ({ ...p, id: p.id || Math.random().toString(36).slice(2) })),
            hints: [],
            history: [],
          });
        }
      } catch {
        // ignore invalid data
      }
    }

    const manager = new WebSocketManager(roomId);
    wsManagerRef.current = manager;

    const cleanup = setupMessageHandlers(manager, {
      onStateSync: handleStateSync,
      onPlayerJoin: handlePlayerJoin,
      onPlayerLeave: handlePlayerLeave,
      onPlayerMove: handlePlayerMove,
      onToggleObstacle: handleToggleObstacle,
      onAddHint: handleAddHint,
      onRenamePlayer: handleRenamePlayer,
    });

    manager
      .connect()
      .then(() => {
        manager.join(playerName, playerColor);
      })
      .catch(() => {
        setError('连接服务器失败，请刷新页面重试');
        setIsLoading(false);
      });

    return () => {
      cleanup();
      manager.close();
      wsManagerRef.current = null;
    };
  }, [
    playerName,
    playerColor,
    handleStateSync,
    handlePlayerJoin,
    handlePlayerLeave,
    handlePlayerMove,
    handleToggleObstacle,
    handleAddHint,
    handleRenamePlayer,
  ]);

  const editMaze = useCallback(
    (action: Action) => {
      setMazeState((prev) => applyActionToState(prev, action));
    },
    []
  );

  const handleToggleObstacleLocal = useCallback((x: number, y: number) => {
    if (isPlaybackMode) return;
    wsManagerRef.current?.toggleObstacle(x, y);
  }, [isPlaybackMode]);

  const handleMovePlayerLocal = useCallback((newX: number, newY: number) => {
    if (isPlaybackMode) return;
    wsManagerRef.current?.movePlayer(newX, newY);
  }, [isPlaybackMode]);

  const handleCellHint = useCallback((x: number, y: number) => {
    if (isPlaybackMode) return;
    setHintCell({ x, y });
    setHintText('');
  }, [isPlaybackMode]);

  const submitHint = useCallback(() => {
    if (!hintCell || !hintText.trim()) {
      setHintCell(null);
      return;
    }
    wsManagerRef.current?.addHint(hintCell.x, hintCell.y, hintText.trim());
    setHintCell(null);
    setHintText('');
  }, [hintCell, hintText]);

  const handleRename = useCallback((name: string) => {
    wsManagerRef.current?.renamePlayer(name);
  }, []);

  const handleSave = useCallback(async () => {
    try {
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: mazeState }),
      });
      const result = await response.json();
      if (result.shareUrl) {
        setShareLink(result.shareUrl);
      }
    } catch {
      setError('保存失败，请稍后重试');
      setTimeout(() => setError(null), 3000);
    }
  }, [mazeState]);

  const buildPlaybackState = useCallback((targetIndex: number): MazeState => {
    const base = baseStateRef.current || createInitialState(mazeState.width, mazeState.height);
    const cleanBase: MazeState = {
      ...base,
      grid: base.grid.map((row) => [...row]),
      players: [],
      hints: [],
      history: [],
    };

    const history = historyRef.current;
    let state = cleanBase;
    for (let i = 0; i < targetIndex && i < history.length; i++) {
      state = applyActionToState(state, history[i]);
    }
    return state;
  }, [mazeState.width, mazeState.height]);

  const enterPlaybackMode = useCallback(() => {
    if (mazeState.history.length === 0) return;

    const cleanBase: MazeState = {
      width: mazeState.width,
      height: mazeState.height,
      grid: mazeState.grid.map((row) => row.map(() => 'empty' as CellType)),
      players: [],
      hints: [],
      history: [],
    };
    baseStateRef.current = cleanBase;

    setIsPlaybackMode(true);
    setPlaybackIndex(0);
    setPlaybackState(cleanBase);
    setIsPlaying(false);
  }, [mazeState]);

  const exitPlaybackMode = useCallback(() => {
    setIsPlaybackMode(false);
    setPlaybackIndex(mazeState.history.length);
    setPlaybackState(null);
    setIsPlaying(false);
    baseStateRef.current = null;
    if (playbackTimer.current) {
      clearInterval(playbackTimer.current);
      playbackTimer.current = null;
    }
  }, [mazeState.history.length]);

  const handleSeek = useCallback(
    (index: number) => {
      const safeIndex = Math.max(0, Math.min(historyRef.current.length, index));
      if (!isPlaybackMode) {
        enterPlaybackMode();
      }
      setPlaybackIndex(safeIndex);
      setPlaybackState(buildPlaybackState(safeIndex));
    },
    [isPlaybackMode, enterPlaybackMode, buildPlaybackState]
  );

  const handleStepForward = useCallback(() => {
    if (!isPlaybackMode) {
      enterPlaybackMode();
    }
    setPlaybackIndex((prev) => {
      const next = Math.min(prev + 1, historyRef.current.length);
      setPlaybackState(buildPlaybackState(next));
      return next;
    });
  }, [isPlaybackMode, enterPlaybackMode, buildPlaybackState]);

  const handleStepBack = useCallback(() => {
    if (!isPlaybackMode) return;
    setPlaybackIndex((prev) => {
      const next = Math.max(0, prev - 1);
      setPlaybackState(buildPlaybackState(next));
      return next;
    });
  }, [isPlaybackMode, buildPlaybackState]);

  const handleReset = useCallback(() => {
    if (!isPlaybackMode) {
      enterPlaybackMode();
    }
    setPlaybackIndex(0);
    setPlaybackState(baseStateRef.current || createInitialState());
  }, [isPlaybackMode, enterPlaybackMode]);

  const handlePlayPause = useCallback(() => {
    if (!isPlaybackMode) {
      enterPlaybackMode();
    }

    if (isPlaying) {
      if (playbackTimer.current) {
        clearInterval(playbackTimer.current);
        playbackTimer.current = null;
      }
      setIsPlaying(false);
      return;
    }

    if (playbackIndex >= historyRef.current.length) {
      setPlaybackIndex(0);
      setPlaybackState(baseStateRef.current || createInitialState());
    }

    setIsPlaying(true);
    playbackTimer.current = setInterval(() => {
      setPlaybackIndex((prev) => {
        const next = prev + 1;
        if (next >= historyRef.current.length) {
          if (playbackTimer.current) {
            clearInterval(playbackTimer.current);
            playbackTimer.current = null;
          }
          setIsPlaying(false);
          setPlaybackState(buildPlaybackState(historyRef.current.length));
          return historyRef.current.length;
        }
        setPlaybackState(buildPlaybackState(next));
        return next;
      });
    }, PLAYBACK_INTERVAL);
  }, [isPlaybackMode, isPlaying, playbackIndex, enterPlaybackMode, buildPlaybackState]);

  useEffect(() => {
    return () => {
      if (playbackTimer.current) {
        clearInterval(playbackTimer.current);
        playbackTimer.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isPlaybackMode) {
      setPlaybackIndex(mazeState.history.length);
    }
  }, [mazeState.history.length, isPlaybackMode]);

  const { roomId } = getUrlParams();
  const displayRoomId = roomId || '未知';

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner" />
        <div className="loading-text">正在连接协作迷宫...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-overlay">
        <div className="error-text">{error}</div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="maze-container">
        <MazeGrid
          grid={activeState.grid}
          players={activeState.players}
          hints={activeState.hints}
          selfPlayerId={selfPlayerId}
          cellSize={cellSize}
          disabled={isPlaybackMode}
          onToggleObstacle={handleToggleObstacleLocal}
          onMovePlayer={handleMovePlayerLocal}
          onCellHint={handleCellHint}
        />
      </div>

      <ControlPanel
        players={mazeState.players}
        selfPlayerId={selfPlayerId}
        roomId={displayRoomId}
        history={mazeState.history}
        playbackIndex={playbackIndex}
        isPlaying={isPlaying}
        isPlaybackMode={isPlaybackMode}
        onRename={handleRename}
        onSave={handleSave}
        onShareLink={shareLink}
        onPlayPause={handlePlayPause}
        onStepForward={handleStepForward}
        onStepBack={handleStepBack}
        onReset={handleReset}
        onSeek={handleSeek}
        onExitPlayback={exitPlaybackMode}
        onToggleCollapse={() => setPanelCollapsed((prev) => !prev)}
        isCollapsed={panelCollapsed}
      />

      {hintCell && (
        <div className="hint-modal-backdrop" onClick={() => setHintCell(null)}>
          <div className="hint-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hint-modal-title">放置提示标签</div>
            <input
              type="text"
              className="hint-modal-input"
              placeholder="输入提示内容（最多100字）"
              value={hintText}
              onChange={(e) => setHintText(e.target.value.slice(0, 100))}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitHint();
                if (e.key === 'Escape') setHintCell(null);
              }}
              maxLength={100}
            />
            <div className="hint-modal-buttons">
              <button className="hint-modal-btn cancel" onClick={() => setHintCell(null)}>
                取消
              </button>
              <button className="hint-modal-btn confirm" onClick={submitHint}>
                放置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
