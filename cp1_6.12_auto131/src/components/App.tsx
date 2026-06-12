import React, { useState, useEffect, useCallback } from 'react';
import GameBoard from './GameBoard';
import UpgradePanel from './UpgradePanel';
import Leaderboard from './Leaderboard';
import ReplayPlayer from './ReplayPlayer';
import { GameEngine, UpgradeData, ReplayInput } from '../game/GameEngine';

type Page = 'menu' | 'game' | 'upgrade' | 'leaderboard' | 'replay';

const API_BASE = '/api';

interface LeaderboardEntry {
  _id: string;
  rank: number;
  date: string;
  score: number;
  stars: number;
  items: string[];
  completed: boolean;
  replayId: string;
}

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('menu');
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [upgradeData, setUpgradeData] = useState<UpgradeData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [replayInputs, setReplayInputs] = useState<ReplayInput[]>([]);
  const [replayId, setReplayId] = useState<string>('');
  const [lastStars, setLastStars] = useState(0);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/user`);
      const data = await res.json();
      if (data.upgrade) {
        setUpgradeData(data.upgrade);
      } else {
        const defaultUpgrade: UpgradeData = {
          angleRange: 45,
          aimLineLength: 33,
          bottomStep: 1,
          initialRows: 4,
          stars: 0,
          levels: { angleRange: 0, aimLineLength: 0, bottomStep: 0, initialRows: 0 },
        };
        setUpgradeData(defaultUpgrade);
      }
    } catch {
      const defaultUpgrade: UpgradeData = {
        angleRange: 45,
        aimLineLength: 33,
        bottomStep: 1,
        initialRows: 4,
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
      setLeaderboard(data);
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
    setLastStars(stars);

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

  const handleReplay = (id: string, inputs: ReplayInput[]) => {
    setReplayInputs(inputs);
    setReplayId(id);
    setPage('replay');
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

  const menuStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0b0b1a 0%, #1a1a3a 100%)',
    color: 'white',
    fontFamily: "'Segoe UI', sans-serif",
  };

  const btnStyle: React.CSSProperties = {
    display: 'block',
    width: 240,
    padding: '14px 0',
    margin: '8px 0',
    fontSize: 18,
    fontWeight: 600,
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    color: 'white',
    transition: 'transform 0.15s, box-shadow 0.15s',
  };

  const handleBtnHover = (e: React.MouseEvent<HTMLButtonElement>, color: string) => {
    const el = e.currentTarget;
    el.style.transform = 'scale(1.04)';
    el.style.boxShadow = `0 0 20px ${color}66`;
  };

  const handleBtnLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = e.currentTarget;
    el.style.transform = 'scale(1)';
    el.style.boxShadow = 'none';
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

  if (page === 'upgrade') {
    return (
      <UpgradePanel
        data={upgradeData!}
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
      <h1 style={{
        fontSize: 42,
        marginBottom: 8,
        background: 'linear-gradient(90deg, #ff4466, #aa44ff, #4488ff)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        Bubble Rogue
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 36, fontSize: 15 }}>
        Roguelike × Bubble Shooter
      </p>
      <button
        style={{ ...btnStyle, background: 'linear-gradient(135deg, #ff4466, #aa44ff)' }}
        onClick={handleStartGame}
        onMouseEnter={e => handleBtnHover(e, '#ff4466')}
        onMouseLeave={handleBtnLeave}
      >
        🎮 开始游戏
      </button>
      <button
        style={{ ...btnStyle, background: 'linear-gradient(135deg, #44dd66, #22aa88)' }}
        onClick={() => setPage('upgrade')}
        onMouseEnter={e => handleBtnHover(e, '#44dd66')}
        onMouseLeave={handleBtnLeave}
      >
        ⬆️ 永久升级 {upgradeData ? `(⭐${upgradeData.stars})` : ''}
      </button>
      <button
        style={{ ...btnStyle, background: 'linear-gradient(135deg, #4488ff, #2266cc)' }}
        onClick={() => { fetchLeaderboard(); setPage('leaderboard'); }}
        onMouseEnter={e => handleBtnHover(e, '#4488ff')}
        onMouseLeave={handleBtnLeave}
      >
        🏆 排行榜
      </button>
    </div>
  );
};

export default App;
