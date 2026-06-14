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

const STORY_EVENTS = [
  { options: ['打开宝箱', '跳过'], results: ['你获得了神秘道具！', '你安全地离开了'] },
  { options: ['进入洞穴', '绕道而行'], results: ['你发现了一块宝石！', '你避开了危险'] },
  { options: ['帮助旅人', '继续赶路'], results: ['旅人赠送了你地图！', '你节省了时间'] },
  { options: ['挑战巨人', '悄悄溜走'], results: ['你击败了巨人！', '你明智地选择了回避'] },
  { options: ['饮下泉水', '离开水池'], results: ['你恢复了体力！', '你没有冒险'] },
];

const MOVE_DIR_MAP: Record<string, GameAction> = {
  left: 'MOVE_LEFT',
  right: 'MOVE_RIGHT',
  forward: 'MOVE_FORWARD',
  backward: 'MOVE_BACKWARD',
};

const SKILL_ACTION_MAP: Record<string, GameAction> = {
  fireball: 'SKILL_FIREBALL',
  ice: 'SKILL_ICE',
  shield: 'SKILL_SHIELD',
};

const App: React.FC = () => {
  const [viewerCount, setViewerCount] = useState(0);
  const [totalCommands, setTotalCommands] = useState(0);
  const [recentCommands, setRecentCommands] = useState<DanmakuCommand[]>([]);
  const [voteResult, setVoteResult] = useState<VoteResult>(DEFAULT_VOTE);
  const [executeAction, setExecuteAction] = useState<GameAction | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [resetFlag, setResetFlag] = useState(false);
  const [storyText, setStoryText] = useState<string | null>(null);
  const [storyOptions, setStoryOptions] = useState<string[] | null>(null);
  const [danmakuInput, setDanmakuInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [simulatedDanmaku, setSimulatedDanmaku] = useState<string[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const moveVoteTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const storyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storyVoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skillCooldownRef = useRef<Record<string, number>>({ fireball: 0, ice: 0, shield: 0 });
  const currentEventRef = useRef<{ options: string[]; results: string[] } | null>(null);
  const storyVotingActiveRef = useRef(false);

  const triggerStoryEvent = useCallback(() => {
    if (storyVotingActiveRef.current) return;
    const event = STORY_EVENTS[Math.floor(Math.random() * STORY_EVENTS.length)];
    currentEventRef.current = event;
    storyVotingActiveRef.current = true;
    setStoryOptions(event.options);

    storyVoteTimerRef.current = setTimeout(() => {
      const votes = voteResultRef.current.story;
      const entries = Object.entries(votes);
      let maxKey = 'A';
      let maxVal = -1;
      for (const [k, v] of entries) {
        if (v > maxVal) {
          maxVal = v;
          maxKey = k;
        }
      }
      const idx = maxKey === 'A' ? 0 : maxKey === 'B' ? 1 : 0;
      const resultText = currentEventRef.current
        ? currentEventRef.current.results[Math.min(idx, currentEventRef.current.results.length - 1)]
        : '你获得了神秘道具！';
      setStoryText(resultText);
      setStoryOptions(null);
      storyVotingActiveRef.current = false;
      currentEventRef.current = null;
      setTimeout(() => setStoryText(null), 3000);
    }, 3000);
  }, []);

  const voteResultRef = useRef<VoteResult>(DEFAULT_VOTE);
  useEffect(() => {
    voteResultRef.current = voteResult;
  }, [voteResult]);

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

  useEffect(() => {
    if (isPaused) return;

    moveVoteTimerRef.current = setInterval(() => {
      const votes = voteResultRef.current.move;
      const entries = Object.entries(votes);
      let maxKey = '';
      let maxVal = 0;
      let total = 0;
      for (const [k, v] of entries) {
        total += v;
        if (v > maxVal) {
          maxVal = v;
          maxKey = k;
        }
      }
      if (total > 0 && maxKey && MOVE_DIR_MAP[maxKey]) {
        setExecuteAction(MOVE_DIR_MAP[maxKey]);
        setTimeout(() => setExecuteAction(null), 100);
      }
    }, 2000);

    storyTimerRef.current = setInterval(() => {
      triggerStoryEvent();
    }, 30000);

    setTimeout(() => triggerStoryEvent(), 5000);

    return () => {
      if (moveVoteTimerRef.current) clearInterval(moveVoteTimerRef.current);
      if (storyTimerRef.current) clearInterval(storyTimerRef.current);
      if (storyVoteTimerRef.current) clearTimeout(storyVoteTimerRef.current);
    };
  }, [isPaused, triggerStoryEvent]);

  useEffect(() => {
    if (isPaused) return;
    const votes = voteResult.skill;
    const total = Object.values(votes).reduce((a, b) => a + b, 0);
    if (total === 0) return;
    const now = Date.now();
    for (const [key, count] of Object.entries(votes)) {
      if (count / total > 0.5) {
        if (now - (skillCooldownRef.current[key] || 0) > 8000) {
          skillCooldownRef.current[key] = now;
          setExecuteAction(SKILL_ACTION_MAP[key]);
          setTimeout(() => setExecuteAction(null), 100);
        }
        break;
      }
    }
  }, [voteResult.skill, isPaused]);

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
            executeAction={executeAction}
            isPaused={isPaused}
            onReset={resetFlag}
          />
        </div>

        {storyOptions && (
          <div style={styles.storyOptions}>
            <div style={styles.storyOptionsTitle}>分支剧情 - 请投票选择：</div>
            <div style={styles.storyOptionsRow}>
              {storyOptions.map((opt, i) => (
                <div key={i} style={styles.storyOption}>
                  选项{i === 0 ? 'A' : 'B'}: {opt}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={styles.controlBar}>
          <button
            style={{ ...styles.controlBtn, ...(isPaused ? {} : styles.activeBtn) }}
            onClick={() => setIsPaused(false)}
            onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
          >
            ▶ 开始
          </button>
          <button
            style={{ ...styles.controlBtn, ...(!isPaused ? {} : styles.activeBtn) }}
            onClick={() => setIsPaused(true)}
            onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
          >
            ⏸ 暂停
          </button>
          <button
            style={{ ...styles.controlBtn, background: '#aa2244' }}
            onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
            onClick={async () => {
              try {
                await fetch('/api/reset', { method: 'POST' });
              } catch {}
              setResetFlag((prev) => !prev);
              skillCooldownRef.current = { fireball: 0, ice: 0, shield: 0 };
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

          <button
            onClick={handleSendSingle}
            style={styles.sendBtn}
            onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
          >
            发送弹幕
          </button>

          <div style={styles.divider} />

          <button
            onClick={handleSimulate}
            style={styles.simulateBtn}
            onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
          >
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
        @keyframes slideIn {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
          .app-layout { flex-direction: column !important; }
          .left-panel, .right-panel { width: 100% !important; height: auto !important; max-height: 200px; }
          .center-panel { width: 100% !important; flex: 1; }
          .game-area { min-height: 300px; }
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
  storyOptions: {
    position: 'absolute',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(11,11,26,0.95)',
    border: '1px solid #00d4ff',
    borderRadius: '12px',
    padding: '12px 20px',
    zIndex: 5,
    animation: 'fadeInUp 0.3s ease-out',
  },
  storyOptionsTitle: {
    fontSize: '12px',
    color: '#00d4ff',
    textAlign: 'center' as const,
    marginBottom: '8px',
  },
  storyOptionsRow: {
    display: 'flex',
    gap: '12px',
  },
  storyOption: {
    background: '#1a1a2e',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#eee',
    border: '1px solid #2a2a4e',
  },
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
