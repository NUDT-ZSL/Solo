import React, { useState, useEffect, useCallback } from 'react';
import GameBoard from './GameBoard';
import UpgradePanel from './UpgradePanel';
import Leaderboard from './Leaderboard';
import ReplayPlayer from './ReplayPlayer';
import { GameEngine, UpgradeData, ReplayInput } from '../game/GameEngine';

type Page = 'menu' | 'game' | 'upgrade' | 'leaderboard' | 'replay';

const API_BASE = '/api';

export interface LeaderboardEntry {
  _id: string;
  date: string;
  score: number;
  stars: number;
  items: string[];
  completed: boolean;
  replayId: string;
  replayInputs?: ReplayInput[];
}

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('menu');
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [upgradeData, setUpgradeData] = useState<UpgradeData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [replayInputs, setReplayInputs] = useState<ReplayInput[]>([]);
  const [replayId, setReplayId] = useState<string>('');

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/user`);
      const data = await res.json();
      if (data && data.upgrade) {
        setUpgradeData(data.upgrade);
      } else {
        const defaultUpgrade: UpgradeData = {
          stars: 0,
          levels: { angleRange: 0, aimLineLength: 0, bottomStep: 0, initialRows: 0 },
        };
        setUpgradeData(defaultUpgrade);
      }
    } catch {
      const defaultUpgrade: UpgradeData = {
        stars: 0,
        levels: { angleRange: 0, aimLineLength: 0, bottomStep: 0, initialRows: 0 },
      };
      setUpgradeData(defaultUpgrade);
    }
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/leaderboard`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const sorted = [...data]
          .sort((a, b) => b.stars - a.stars)
          .slice(0, 10)
          .map((e, i) => ({ ...e, rank: i + 1 }));
        setLeaderboard(sorted);
      }
    } catch {
      setLeaderboard([]);
    }
  }, []);

  useEffect(() => {
    fetchUser();
    fetchLeaderboard();
  }, [fetchUser, fetchLeaderboard]);

  const handleStartGame = () => {
    const eng = new GameEngine(upgradeData ?? undefined);
    eng.startGame();
    setEngine(eng);
    setPage('game');
  };

  const handleGameOver = async (eng: GameEngine) => {
    const stars = eng.calculateStars();
    const inputs = eng.getReplayInputs();
    const record = {
      date: new Date().toISOString(),
      score: eng.state.score,
      stars,
      level: eng.state.level,
      items: eng.state.items.map(i => i.id),
      completed: eng.state.levelComplete,
      replayInputs: inputs,
    };

    try {
      await fetch(`${API_BASE}/save-record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });

      if (upgradeData) {
        const newUpgrade = { ...upgradeData, stars: upgradeData.stars + stars };
        await fetch(`${API_BASE}/upgrade`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newUpgrade),
        });
        setUpgradeData(newUpgrade);
      }
    } catch { }

    fetchLeaderboard();
  };

  const handleReplay = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/replay/${id}`);
      const data = await res.json();
      if (data && Array.isArray(data.replayInputs)) {
        setReplayInputs(data.replayInputs);
        setReplayId(id);
        setPage('replay');
      }
    } catch { }
  };

  const handleUpgrade = async (newData: UpgradeData) => {
    try {
      await fetch(`${API_BASE}/upgrade`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData),
      });
      setUpgradeData(newData);
    } catch { }
  };

  const handleClearLeaderboard = async () => {
    try {
      await fetch(`${API_BASE}/leaderboard`, { method: 'DELETE' });
      fetchLeaderboard();
    } catch { }
  };

  const menuStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0b0b1a 0%, #1a1a3a 100%)',
    color: 'white',
    fontFamily: "'Segoe UI', sans-serif",
    position: 'relative',
    overflow: 'hidden',
  };

  const btnStyle: React.CSSProperties = {
    display: 'block',
    width: 260,
    padding: '14px 0',
    margin: '8px 0',
    fontSize: 17,
    fontWeight: 600,
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    color: 'white',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  };

  const btnEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'scale(1.04)';
  };
  const btnLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'scale(1)';
  };

  if (page === 'game' && engine) {
    return (
      <GameBoard
        engine={engine}
        onGameOver={handleGameOver}
        onBack={() => setPage('menu')}
        upgradeData={upgradeData}
      />
    );
  }

  if (page === 'upgrade' && upgradeData) {
    return (
      <UpgradePanel
        data={upgradeData}
        onUpgrade={handleUpgrade}
        onBack={() => setPage('menu')}
      />
    );
  }

  if (page === 'leaderboard') {
    return (
      <Leaderboard
        entries={leaderboard}
        onReplay={handleReplay}
        onBack={() => setPage('menu')}
        onRefresh={fetchLeaderboard}
        onClearAll={handleClearLeaderboard}
      />
    );
  }

  if (page === 'replay') {
    return (
      <ReplayPlayer
        inputs={replayInputs}
        replayId={replayId}
        onBack={() => setPage('leaderboard')}
        upgradeData={upgradeData}
      />
    );
  }

  return (
    <div style={menuStyle}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 30%, rgba(170,68,255,0.15), transparent 60%)',
          pointerEvents: 'none',
        }}
      />
      <h1 style={{
        fontSize: 48,
        marginBottom: 6,
        background: 'linear-gradient(90deg, #ff4466, #aa44ff, #4488ff)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        fontWeight: 800,
        letterSpacing: 2,
      }}>
        BUBBLE ROGUE
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 36, fontSize: 14, letterSpacing: 3 }}>
        ROGUELIKE × BUBBLE SHOOTER
      </p>
      <button
        style={{ ...btnStyle, background: 'linear-gradient(135deg, #ff4466, #aa44ff)' }}
        onClick={handleStartGame}
        onMouseEnter={btnEnter}
        onMouseLeave={btnLeave}
      >
        🎮 开始游戏
      </button>
      <button
        style={{ ...btnStyle, background: 'linear-gradient(135deg, #44dd66, #22aa88)' }}
        onClick={() => setPage('upgrade')}
        onMouseEnter={btnEnter}
        onMouseLeave={btnLeave}
      >
        ⬆️ 永久升级 {upgradeData ? `(⭐${upgradeData.stars})` : ''}
      </button>
      <button
        style={{ ...btnStyle, background: 'linear-gradient(135deg, #4488ff, #2266cc)' }}
        onClick={() => { fetchLeaderboard(); setPage('leaderboard'); }}
        onMouseEnter={btnEnter}
        onMouseLeave={btnLeave}
      >
        🏆 排行榜
      </button>
      <style>{`button:active { transform: scale(0.95) !important; }`}</style>
    </div>
  );
};

export default App;
