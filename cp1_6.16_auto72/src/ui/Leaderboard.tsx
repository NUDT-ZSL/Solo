import React, { useEffect, useState } from 'react';
import { LeaderboardEntry } from '../game/types';

const API_BASE = '/api';

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [saved, setSaved] = useState(false);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/leaderboard`);
      const json = await res.json();
      setEntries(json.data || []);
    } catch {
      setEntries([]);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const handleSave = async (steps: number, level: number) => {
    if (!playerName.trim() || saved) return;
    try {
      await fetch(`${API_BASE}/save-slot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: playerName.trim(), steps, level }),
      });
      setSaved(true);
      fetchLeaderboard();
    } catch {}
  };

  return (
    <div className="leaderboard-panel">
      <h2 className="lb-title">排行榜</h2>
      <div className="lb-list">
        {entries.length === 0 && <p className="lb-empty">暂无记录</p>}
        {entries.map((entry) => (
          <div key={entry.rank} className="lb-row">
            <span className="lb-rank">#{entry.rank}</span>
            <span className="lb-name">{entry.playerName}</span>
            <span className="lb-steps">{entry.steps}步</span>
            <span className="lb-level">层{entry.level}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export { Leaderboard };
