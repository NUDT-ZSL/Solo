import React, { useEffect, useState } from 'react';
import type { Difficulty } from './DifficultySelect';

interface LeaderboardEntry {
  nickname: string;
  score: number;
  difficulty: Difficulty;
  date: string;
}

interface GameOverPanelProps {
  score: number;
  nickname: string;
  difficulty: Difficulty;
  onBack: () => void;
  onReplay: () => void;
}

const LEADERBOARD_KEY = 'rhythm_runner_leaderboard';

const getLeaderboard = (): LeaderboardEntry[] => {
  try {
    const data = localStorage.getItem(LEADERBOARD_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveLeaderboard = (entries: LeaderboardEntry[]) => {
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
};

const difficultyLabel: Record<Difficulty, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
};

const GameOverPanel: React.FC<GameOverPanelProps> = ({
  score,
  nickname,
  difficulty,
  onBack,
  onReplay,
}) => {
  const [displayScore, setDisplayScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const entry: LeaderboardEntry = {
      nickname,
      score,
      difficulty,
      date: new Date().toISOString().split('T')[0],
    };

    const current = getLeaderboard();
    current.push(entry);
    current.sort((a, b) => b.score - a.score);
    const top10 = current.slice(0, 10);
    saveLeaderboard(top10);
    setLeaderboard(top10);
  }, [score, nickname, difficulty]);

  useEffect(() => {
    let current = 0;
    const target = score;
    const duration = 1500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      current = Math.floor(target * eased);
      setDisplayScore(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayScore(target);
      }
    };

    animate();
  }, [score]);

  return (
    <div className="game-over-overlay">
      <div className="game-over-panel">
        <div className="game-over-title">游戏结束</div>
        <div className="game-over-score">
          <div className="score-label">本局得分</div>
          <div className="score-value">{displayScore.toLocaleString()}</div>
        </div>
        <div className="leaderboard-title">排行榜 TOP 10</div>
        <div className="leaderboard-list">
          {leaderboard.length === 0 ? (
            <div className="leaderboard-item" style={{ justifyContent: 'center', color: '#666' }}>
              暂无记录
            </div>
          ) : (
            leaderboard.map((entry, index) => (
              <div
                key={`${entry.nickname}-${entry.score}-${index}`}
                className={`leaderboard-item rank-${index + 1}`}
              >
                <div className="leaderboard-rank">#{index + 1}</div>
                <div className="leaderboard-name">{entry.nickname}</div>
                <div className="leaderboard-score">{entry.score.toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
        <div className="game-over-buttons">
          <button className="action-btn back" onClick={onBack}>
            返回菜单
          </button>
          <button className="action-btn replay" onClick={onReplay}>
            再来一局
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverPanel;
