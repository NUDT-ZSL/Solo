import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { GameScene } from './gameScene';
import { AudiencePanel } from './audiencePanel';
import { GameAction, generateRandomDanmaku } from './commandParser';

interface DanmakuCommand {
  id: string;
  text: string;
  action: GameAction | null;
  timestamp: number;
  viewerId: string;
}

interface VoteResult {
  move: Record<string, number>;
  skill: Record<string, number>;
  story: Record<string, number>;
  totalCommands: number;
}

interface WSMessage {
  type: string;
  [key: string]: unknown;
}

const DEFAULT_VOTE: VoteResult = {
  move: { left: 0, right: 0, forward: 0, backward: 0 },
  skill: { fireball: 0, ice: 0, shield: 0 },
  story: { A: 0, B: 0, C: 0 },
  totalCommands: 0,
};

const App: React.FC = () => {
  const [viewerCount, setViewerCount] = useState(0);
  const [totalCommands, setTotalCommands] = useState(0);
  const [recentCommands, setRecentCommands] = useState<DanmakuCommand[]>([]);
  const [voteResult, setVoteResult] = useState<VoteResult>(DEFAULT_VOTE);
  const [currentAction, setCurrentAction] = useState<GameAction | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [resetFlag, setResetFlag] = useState(false);
  const [storyText, setStoryText] = useState<string | null>(null);
  const [danmakuInput, setDanmakuInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [simulatedDanmaku, setSimulatedDanmaku] = useState<string[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const connectWS = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:4000/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);

        switch (msg.type) {
          case 'init':
          case 'poll_response':
            setViewerCount((msg.viewerCount as number) || 0);
            setTotalCommands((msg.totalCommands as number) || 0);
            if (msg.voteResult) setVoteResult(msg.voteResult as VoteResult);
            if (msg.recentCommands) setRecentCommands(msg.recentCommands as DanmakuCommand[]);
            break;
          case 'new_command':
            if (msg.voteResult) setVoteResult(msg.voteResult as VoteResult);
            if (msg.recentCommands) setRecentCommands(msg.recentCommands as DanmakuCommand[]);
            setViewerCount((msg.viewerCount as number) || 0);
            if (msg.command) {
              const cmd = msg.command as DanmakuCommand;
              if (cmd.action) {
                setCurrentAction(cmd.action as GameAction);
              }
            }
            break;
          case 'viewer_update':
            setViewerCount((msg.viewerCount as number) || 0);
            break;
          case 'reset':
            setVoteResult(DEFAULT_VOTE);
            setRecentCommands([]);
            setTotalCommands(0);
            setResetFlag((prev) => !prev);
            break;
        }
      } catch {}
    };

    ws.onclose = () => {
      setIsConnected(false);
      setTimeout(connectWS, 2000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connectWS();

    pollIntervalRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'poll' }));
      }
    }, 100);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connectWS]);

  const sendDanmaku = async (text: string) => {
    try {
      await fetch('/api/danmaku', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
    } catch {}
  };

  const handleSimulate = () => {
    const danmakus = generateRandomDanmaku(10);
    setSimulatedDanmaku(danmakus);
    danmakus.forEach((d, i) => {
      setTimeout(() => sendDanmaku(d), i * 50);
    });
  };

  const handleSendSingle = () => {
    if (danmakuInput.trim()) {
      sendDanmaku(danmakuInput.trim());
      setDanmakuInput('');
    }
  };

  const handleStoryEvent = useCallback((text: string) => {
    setStoryText(text);
    setTimeout(() => setStoryText(null), 3000);
  }, []);

  return (
    <div style={styles.app}>
      <div style={styles.leftPanel}>
        <AudiencePanel
          viewerCount={viewerCount}
          totalCommands={totalCommands}
          recentCommands={recentCommands}
          voteResult={voteResult}
        />
      </div>

      <div style={styles.centerPanel}>
        <div style={styles.gameArea}>
          <GameScene
            currentAction={currentAction}
            onStoryEvent={handleStoryEvent}
            isPaused={isPaused}
            onReset={resetFlag}
          />
        </div>

        <div style={styles.controlBar}>
          <button
            style={{ ...styles.controlBtn, ...(isPaused ? {} : styles.activeBtn) }}
            onClick={() => setIsPaused(false)}
          >
            ▶ 开始
          </button>
          <button
            style={{ ...styles.controlBtn, ...(!isPaused ? {} : styles.activeBtn) }}
            onClick={() => setIsPaused(true)}
          >
            ⏸ 暂停
          </button>
          <button
            style={{ ...styles.controlBtn, background: '#aa2244' }}
            onClick={async () => {
              try {
                await fetch('/api/reset', { method: 'POST' });
              } catch {}
              setResetFlag((prev) => !prev);
            }}
          >
            ↺ 重置
          </button>
        </div>

        {storyText && (
          <div style={styles.storyOverlay}>
            <div style={styles.storyText}>{storyText}</div>
          </div>
        )}
      </div>

      <div style={styles.rightPanel}>
        <div style={styles.rightPanelContent}>
          <div style={styles.rightPanelHeader}>
            <span style={styles.rightPanelIcon}>💬</span>
            <span style={styles.rightPanelTitle}>弹幕模拟器</span>
          </div>

          <div style={styles.connectionStatus}>
            <div
              style={{
                ...styles.statusDot,
                background: isConnected ? '#44ff44' : '#ff4444',
              }}
            />
            <span style={styles.statusText}>
              {isConnected ? '已连接' : '未连接'}
            </span>
          </div>

          <input
            type="text"
            value={danmakuInput}
            onChange={(e) => setDanmakuInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendSingle()}
            placeholder="输入弹幕..."
            style={styles.danmakuInput}
          />

          <button onClick={handleSendSingle} style={styles.sendBtn}>
            发送弹幕
          </button>

          <div style={styles.divider} />

          <button onClick={handleSimulate} style={styles.simulateBtn}>
            模拟发送
          </button>

          {simulatedDanmaku.length > 0 && (
            <div style={styles.simulatedList}>
              {simulatedDanmaku.map((d, i) => (
                <div key={i} style={styles.simulatedItem}>
                  {d}
                </div>
              ))}
            </div>
          )}

          <div style={styles.divider} />

          <div style={styles.helpSection}>
            <div style={styles.helpTitle}>指令说明</div>
            <div style={styles.helpText}>移动：左移 / 右移 / 前进 / 后退</div>
            <div style={styles.helpText}>技能：放火球 / 放冰冻 / 放护盾</div>
            <div style={styles.helpText}>剧情：选项A / 选项B / 选项C</div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .app-layout {
            flex-direction: column !important;
          }
          .left-panel, .right-panel {
            width: 100% !important;
            height: auto !important;
            max-height: 200px;
          }
          .center-panel {
            width: 100% !important;
            flex: 1;
          }
          .game-area {
            min-height: 300px;
          }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    width: '100%',
    height: '100%',
    background: '#0b0b1a',
    color: '#e0e0e0',
    fontFamily: "'Segoe UI', 'Microsoft YaHei', sans-serif",
  },
  leftPanel: {
    width: '240px',
    height: '100%',
    flexShrink: 0,
  },
  centerPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    position: 'relative',
  },
  gameArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  controlBar: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    padding: '10px',
    background: '#0b0b1a',
    borderTop: '1px solid #1a1a3e',
  },
  controlBtn: {
    padding: '8px 20px',
    border: '1px solid #1a1a3e',
    borderRadius: '12px',
    background: '#1a1a2e',
    color: '#aaa',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s',
  },
  activeBtn: {
    background: '#00d4ff',
    color: '#0b0b1a',
    fontWeight: 600,
    border: '1px solid #00d4ff',
  },
  rightPanel: {
    width: '240px',
    height: '100%',
    background: '#0b0b1a',
    borderLeft: '1px solid #1a1a3e',
    flexShrink: 0,
  },
  rightPanelContent: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  rightPanelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingBottom: '8px',
    borderBottom: '1px solid #1a1a3e',
  },
  rightPanelIcon: { fontSize: '18px' },
  rightPanelTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#00d4ff',
  },
  connectionStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  statusText: {
    fontSize: '11px',
    color: '#888',
  },
  danmakuInput: {
    width: '220px',
    height: '40px',
    borderRadius: '8px',
    background: '#1e1e2e',
    border: '1px solid #2a2a4e',
    color: '#ffffff',
    padding: '0 12px',
    fontSize: '13px',
    outline: 'none',
  },
  sendBtn: {
    width: '220px',
    height: '36px',
    borderRadius: '20px',
    background: '#e85d3a',
    color: '#ffffff',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    transition: 'filter 0.2s',
  },
  simulateBtn: {
    width: '100px',
    height: '36px',
    borderRadius: '20px',
    background: '#e85d3a',
    color: '#ffffff',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
    transition: 'filter 0.2s',
  },
  divider: {
    height: '1px',
    background: '#1a1a3e',
    margin: '4px 0',
  },
  simulatedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    maxHeight: '160px',
    overflowY: 'auto',
  },
  simulatedItem: {
    padding: '3px 6px',
    background: '#1a1a2e',
    borderRadius: '3px',
    fontSize: '11px',
    color: '#aaa',
    animation: 'slideIn 0.15s ease-out',
  },
  helpSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  helpTitle: {
    fontSize: '11px',
    color: '#666',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    marginBottom: '2px',
  },
  helpText: {
    fontSize: '10px',
    color: '#555',
    lineHeight: 1.4,
  },
  storyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.5)',
    pointerEvents: 'none',
    zIndex: 10,
  },
  storyText: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#00d4ff',
    textShadow: '0 0 20px rgba(0,212,255,0.5)',
    animation: 'fadeInUp 0.5s ease-out',
    textAlign: 'center' as const,
    padding: '20px',
  },
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
