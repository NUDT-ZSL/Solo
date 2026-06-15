import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Room, VoteResult } from '../types';
import { submitVote, endVoting, goToFinal, getSocket } from '../utils/roomManager';
import '../styles/VotingPanel.css';

interface VotingPanelProps {
  room: Room;
  userId: string;
}

const VOTING_DURATION = 15;

const VotingPanel: React.FC<VotingPanelProps> = ({ room, userId }) => {
  const [timeLeft, setTimeLeft] = useState<number>(VOTING_DURATION);
  const [hasVoted, setHasVoted] = useState<Record<string, 'yes' | 'no' | null>>({});
  const [votes, setVotes] = useState<Record<string, VoteResult>>({});
  const [animatingButton, setAnimatingButton] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const [localVotingEnded, setLocalVotingEnded] = useState<boolean>(false);

  const isResultsPhase = room.phase === 'results';

  useEffect(() => {
    if (room.votes) {
      setVotes(room.votes);
    }
  }, [room.votes]);

  useEffect(() => {
    if (isResultsPhase) {
      setLocalVotingEnded(true);
    }
  }, [isResultsPhase]);

  useEffect(() => {
    const socket = getSocket();

    const handleVoteUpdated = ({ cityId, votes: newVotes }: { cityId: string; votes: VoteResult }) => {
      setVotes((prev) => ({
        ...prev,
        [cityId]: newVotes,
      }));
    };

    const handleVotingEnded = (updatedRoom: Room) => {
      setLocalVotingEnded(true);
      if (updatedRoom?.votes) {
        setVotes(updatedRoom.votes);
      }
    };

    socket.on('vote-updated', handleVoteUpdated);
    socket.on('voting-ended', handleVotingEnded);

    return () => {
      socket.off('vote-updated', handleVoteUpdated);
      socket.off('voting-ended', handleVotingEnded);
    };
  }, []);

  useEffect(() => {
    if (isResultsPhase) {
      return;
    }
    if (room.votingStartTime) {
      const elapsed = Math.floor((Date.now() - room.votingStartTime) / 1000);
      const remaining = Math.max(0, VOTING_DURATION - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        setLocalVotingEnded(true);
        endVoting();
      }
    }
  }, [room.votingStartTime, isResultsPhase]);

  useEffect(() => {
    if (isResultsPhase || localVotingEnded || timeLeft <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setLocalVotingEnded(true);
          endVoting();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isResultsPhase, localVotingEnded, timeLeft]);

  const handleVote = useCallback(
    (cityId: string, vote: 'yes' | 'no') => {
      if (localVotingEnded || isResultsPhase) return;

      const buttonKey = `${cityId}-${vote}`;
      setAnimatingButton(buttonKey);
      setTimeout(() => setAnimatingButton(null), 300);

      setHasVoted((prev) => ({
        ...prev,
        [cityId]: vote,
      }));

      submitVote(cityId, vote);
    },
    [localVotingEnded, isResultsPhase]
  );

  const getVotePercentage = (cityId: string): number => {
    const cityVotes = votes[cityId];
    if (!cityVotes) return 0;
    const total = cityVotes.yes.length + cityVotes.no.length;
    if (total === 0) return 0;
    return (cityVotes.yes.length / total) * 100;
  };

  const getYesCount = (cityId: string): number => {
    return votes[cityId]?.yes.length || 0;
  };

  const getNoCount = (cityId: string): number => {
    return votes[cityId]?.no.length || 0;
  };

  const isPassed = (cityId: string): boolean => {
    const totalMembers = room.members.length;
    const yesCount = getYesCount(cityId);
    return yesCount > totalMembers / 2;
  };

  const progressColor = (percentage: number): string => {
    const green = { r: 78, g: 205, b: 196 };
    const red = { r: 255, g: 107, b: 107 };
    const ratio = percentage / 100;
    const r = Math.round(red.r + (green.r - red.r) * ratio);
    const g = Math.round(red.g + (green.g - red.g) * ratio);
    const b = Math.round(red.b + (green.b - red.b) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const handleGoToFinal = () => {
    goToFinal();
  };

  const showResults = localVotingEnded || isResultsPhase;

  return (
    <div className="voting-panel">
      <div className="voting-header">
        <h2>{showResults ? '投票结果' : '投票决定目的地'}</h2>
        {!showResults && (
          <div className="countdown-container">
            <div className="countdown-label">剩余时间</div>
            <div className={`countdown-timer ${timeLeft <= 5 ? 'warning' : ''}`}>
              {timeLeft}s
            </div>
          </div>
        )}
        <p className="voting-subtitle">
          {showResults
            ? isResultsPhase
              ? '投票已结束，查看结果后进入最终行程'
              : '正在统计结果...'
            : '点击对勾或叉号为每个城市投票'}
        </p>
      </div>

      <div className="voting-grid">
        {room.selectedCities.map((city) => (
          <div
            key={city.id}
            className={`voting-card ${showResults && isPassed(city.id) ? 'passed' : ''} ${showResults && !isPassed(city.id) ? 'failed' : ''}`}
          >
            <div className="voting-card-image">
              <img src={city.image} alt={city.name} />
              <div className="voting-card-overlay"></div>
              <div className="voting-card-title">
                <h3>{city.name}</h3>
                <p>{city.nameEn}</p>
              </div>
            </div>

            {!showResults ? (
              <div className="voting-actions">
                <button
                  className={`vote-btn vote-yes ${hasVoted[city.id] === 'yes' ? 'active' : ''} ${animatingButton === `${city.id}-yes` ? 'animating' : ''}`}
                  onClick={() => handleVote(city.id, 'yes')}
                >
                  ✓
                </button>
                <button
                  className={`vote-btn vote-no ${hasVoted[city.id] === 'no' ? 'active' : ''} ${animatingButton === `${city.id}-no` ? 'animating' : ''}`}
                  onClick={() => handleVote(city.id, 'no')}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="voting-results">
                <div className="result-stats">
                  <span className="stat-yes">
                    <span className="stat-icon">✓</span>
                    {getYesCount(city.id)}
                  </span>
                  <span className="stat-percentage">
                    {getVotePercentage(city.id).toFixed(0)}%
                  </span>
                  <span className="stat-no">
                    <span className="stat-icon">✕</span>
                    {getNoCount(city.id)}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${getVotePercentage(city.id)}%`,
                      backgroundColor: progressColor(getVotePercentage(city.id)),
                    }}
                  ></div>
                </div>
                <div className="result-label">
                  {isPassed(city.id) ? (
                    <span className="passed-label">✓ 通过，进入最终清单</span>
                  ) : (
                    <span className="failed-label">✕ 未达到半数</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showResults && (
        <div className="voting-summary">
          <p>
            共 {room.selectedCities.length} 个候选城市，
            <span className="passed-count">
              {' '}
              {room.finalCities?.length || 0}{' '}
            </span>
            个城市通过投票
          </p>
          {isResultsPhase && (room.finalCities?.length || 0) > 0 && (
            <button className="btn-go-final" onClick={handleGoToFinal}>
              查看最终行程 →
            </button>
          )}
          {isResultsPhase && (room.finalCities?.length || 0) === 0 && (
            <p className="no-passed-hint">没有城市通过投票，可在导航栏点击"重新开始"</p>
          )}
        </div>
      )}
    </div>
  );
};

export default VotingPanel;
