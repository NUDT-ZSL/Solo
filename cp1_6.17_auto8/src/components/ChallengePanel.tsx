import React, { useState } from 'react';
import type { ChallengeQuestion, ChallengeResult, LeaderboardEntry, CoffeeLog } from '../types';
import { useApp } from '../context/AppContext';
import '../styles/challenge.css';

interface ChallengePanelProps {
  question: ChallengeQuestion | null;
  onNextQuestion: () => void;
  loading: boolean;
}

const ChallengePanel: React.FC<ChallengePanelProps> = ({ question, onNextQuestion, loading }) => {
  const { user, leaderboard, fetchLeaderboard } = useApp();
  const [selected, setSelected] = useState<'A' | 'B' | null>(null);
  const [result, setResult] = useState<ChallengeResult | null>(null);
  const [answered, setAnswered] = useState(false);
  const [animating, setAnimating] = useState(false);

  const handleGuess = async (choice: 'A' | 'B') => {
    if (answered || !question) return;
    setSelected(choice);
    setAnswered(true);

    try {
      const res = await fetch('/api/challenge/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || '1',
          guess: choice,
          correctAnswer: question.correctAnswer,
        }),
      });
      const data: ChallengeResult = await res.json();
      setResult(data);
      setAnimating(true);
      setTimeout(() => {
        fetchLeaderboard();
        setAnimating(false);
      }, 200);
    } catch (e) {
      console.error(e);
    }
  };

  const handleNext = () => {
    setSelected(null);
    setResult(null);
    setAnswered(false);
    onNextQuestion();
  };

  const getRankStyle = (index: number) => {
    if (index === 0) return 'gold';
    if (index === 1) return 'silver';
    if (index === 2) return 'bronze';
    return '';
  };

  const renderOption = (option: Omit<CoffeeLog, 'userId' | 'origin' | 'beanName' | 'roast' | 'process' | 'photoUrl' | 'likes' | 'comments' | 'createdAt' | 'beanType'>, label: 'A' | 'B') => {
    let className = 'challenge-option';
    if (selected === label) className += ' selected';
    if (answered && question) {
      if (label === question.correctAnswer) className += ' correct';
      else if (selected === label) className += ' wrong';
    }

    return (
      <div className={className} onClick={() => handleGuess(label)}>
        <div className="option-label">选项 {label} — 点击猜测</div>
        <div className="option-flavors">
          {option.flavors.map((f) => (
            <span key={f.name} className="flavor-chip" style={{ backgroundColor: f.color, cursor: 'default' }}>
              {f.name}
            </span>
          ))}
        </div>
        <div className="option-brew">
          <span>🌡 {option.waterTemp}°C</span>
          <span>⚙ {option.grindSize}</span>
          <span>⏱ {option.brewTime}</span>
        </div>
        <div className="option-notes">{option.notes}</div>
      </div>
    );
  };

  return (
    <div className="challenge-page">
      <div className="leaderboard-section">
        <div className="leaderboard-title">
          <span>🏆</span>
          <span>挑战排行榜</span>
        </div>
        <ul className="leaderboard-list">
          {leaderboard.map((entry: LeaderboardEntry, i: number) => (
            <li
              key={entry.userId}
              className="leaderboard-item"
              style={{ opacity: animating ? 0.6 : 1 }}
            >
              <span className={`leaderboard-rank rank-${i + 1}`}>{i + 1}</span>
              <img src={entry.avatar} alt={entry.username} className="leaderboard-avatar" />
              <span className="leaderboard-username">{entry.username}</span>
              <span className={`leaderboard-score ${getRankStyle(i)}`}>{entry.score}</span>
            </li>
          ))}
        </ul>
      </div>

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      ) : question ? (
        <div className="challenge-section">
          <div className="challenge-header">
            <h2 className="page-title" style={{ marginBottom: 0 }}>
              🎯 香气风味盲猜挑战
            </h2>
            <p className="challenge-desc">
              根据风味描述和冲煮备注，猜猜哪一支是浅烘水洗瑰夏，哪一支是深烘日晒曼特宁
            </p>
          </div>

          {result && (
            <div className="challenge-stats">
              <div className="challenge-stat">
                <div className="challenge-stat-value">{result.totalScore}</div>
                <div className="challenge-stat-label">累计得分</div>
              </div>
              <div className="challenge-stat">
                <div className="challenge-stat-value">{result.streak}</div>
                <div className="challenge-stat-label">连续猜对</div>
              </div>
            </div>
          )}

          <div className="challenge-options">
            {renderOption(question.optionA, 'A')}
            {renderOption(question.optionB, 'B')}
          </div>

          {result && (
            <div className="challenge-result">
              <div className={`challenge-result-text ${result.isCorrect ? 'correct' : 'wrong'}`}>
                {result.isCorrect ? '🎉 回答正确！' : '😅 答错了，再接再厉！'}
              </div>
              <div className="challenge-result-score">
                本次得分 +{result.score} 分
                {result.streak >= 2 && result.isCorrect && ' （连续猜对奖励 +5分）'}
              </div>
            </div>
          )}

          <div className="challenge-actions">
            {answered ? (
              <button className="btn btn-secondary" onClick={handleNext}>
                下一题
              </button>
            ) : (
              <button
                className="btn"
                onClick={() => selected && handleGuess(selected)}
                disabled={!selected}
                style={{ opacity: selected ? 1 : 0.5 }}
              >
                确认猜测
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ChallengePanel;
