import React, { useEffect, useState } from 'react';
import type { Difficulty } from './DifficultySelect';
import PlayerManager from '../player/PlayerManager';
import Leaderboard, { LeaderboardEntry } from '../player/Leaderboard';

interface GameOverPanelProps {
  score: number;
  nickname: string;
  difficulty: Difficulty;
  onBack: () => void;
  onReplay: () => void;
}

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uploadAndFetch = async () => {
      try {
        await PlayerManager.getInstance().saveScore(nickname, score, difficulty);
      } catch (e) {
        console.error('Failed to save score:', e);
      }

      try {
        const data = await Leaderboard.getInstance().fetchLeaderboard(difficulty);
        setLeaderboard(data.slice(0, 20));
      } catch (e) {
        console.error('Failed to fetch leaderboard:', e);
        setLeaderboard([]);
      }
      setLoading(false);
    };

    uploadAndFetch();
  }, [score, nickname, difficulty]);

  useEffect(() => {
    const scoreStr = score.toString();
    let displayedChars = 0;
    setDisplayScore(0);

    const typeNextChar = () => {
      displayedChars++;
      if (displayedChars <= scoreStr.length) {
        const currentStr = scoreStr.substring(0, displayedChars);
        setDisplayScore(parseInt(currentStr, 10));
        setTimeout(typeNextChar, 100);
      }
    };

    const initialDelay = setTimeout(typeNextChar, 200);

    return () => {
      clearTimeout(initialDelay);
    };
  }, [score]);

  return (
    <div className="game-over-overlay">
      <div className="game-over-panel">
        <div className="game-over-title">游戏结束</div>
        <div className="game-over-score">
          <div className="score-label">本局得分</div>
          <div className="score-value">{displayScore.toLocaleString()}</div>
        </div>
        <div className="leaderboard-title">排行榜 TOP 20</div>
        <div className="leaderboard-list">
          {loading ? (
            <div className="leaderboard-item" style={{ justifyContent: 'center', color: '#666' }}>
              加载中...
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="leaderboard-item" style={{ justifyContent: 'center', color: '#666' }}>
              暂无记录
            </div>
          ) : (
            leaderboard.map((entry, index) => (
              <div
                key={`${entry.nickname}-${entry.score}-${index}`}
                className={`leaderboard-item rank-${index + 1}`}
              >
                <div className="leaderboard-rank">#{entry.rank}</div>
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
