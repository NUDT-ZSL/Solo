import React, { useState, useEffect } from 'react';
import type { Topic } from '../types';

interface VotingPanelProps {
  topic: Topic;
  onClose: () => void;
  onVote: (optionId: string) => Promise<boolean>;
  hasVoted: boolean;
}

export const VotingPanel: React.FC<VotingPanelProps> = ({ topic, onClose, onVote, hasVoted: initialHasVoted }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [animateButton, setAnimateButton] = useState(false);
  const [voteSuccess, setVoteSuccess] = useState(false);
  const [localTopic, setLocalTopic] = useState(topic);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalTopic(topic);
  }, [topic]);

  const totalVotes = localTopic.options.reduce((sum, opt) => sum + opt.votes, 0);

  const handleSubmit = async () => {
    if (!selectedOption || hasVoted) return;

    setIsSubmitting(true);
    setAnimateButton(true);
    setError(null);

    setTimeout(() => setAnimateButton(false), 300);

    try {
      const success = await onVote(selectedOption);
      if (success) {
        setVoteSuccess(true);
        setLocalTopic((prev) => ({
          ...prev,
          options: prev.options.map((opt) =>
            opt.id === selectedOption ? { ...opt, votes: opt.votes + 1 } : opt
          ),
          totalVotes: prev.totalVotes + 1,
        }));

        setTimeout(() => {
          setVoteSuccess(false);
          setHasVoted(true);
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '投票失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content voting-panel">
        <button className="modal-close" onClick={onClose} aria-label="关闭">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className="modal-header">
          <h2 className="modal-title">{localTopic.title}</h2>
          <p className="modal-subtitle">
            {hasVoted ? '感谢您的参与！' : '请选择一个选项进行投票'}
          </p>
        </div>

        <div className="modal-body">
          <div className="voting-options">
            {localTopic.options.map((option) => {
              const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
              const isSelected = selectedOption === option.id;

              return (
                <div
                  key={option.id}
                  className={`voting-option ${isSelected ? 'selected' : ''} ${hasVoted ? 'voted' : ''}`}
                  onClick={() => !hasVoted && setSelectedOption(option.id)}
                >
                  <div className="option-header">
                    <div className="option-info">
                      {!hasVoted && (
                        <div className={`radio-circle ${isSelected ? 'checked' : ''}`}>
                          {isSelected && <div className="radio-inner" style={{ backgroundColor: option.color }}></div>}
                        </div>
                      )}
                      <span className="option-label">{option.text}</span>
                    </div>
                    <div className="vote-count">
                      <span className="count-number">{option.votes}</span>
                      <span className="count-label">票</span>
                    </div>
                  </div>

                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: option.color,
                      }}
                    ></div>
                  </div>

                  <div className="percentage-text">{percentage.toFixed(1)}%</div>
                </div>
              );
            })}
          </div>

          {error && <div className="error-message">{error}</div>}

          {hasVoted && (
            <div className="vote-success">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              投票成功！当前共 {totalVotes} 人参与
            </div>
          )}
        </div>

        <div className="modal-footer">
          {!hasVoted && !voteSuccess && (
            <button
              className={`btn btn-primary btn-large ${animateButton ? 'animate-scale' : ''}`}
              disabled={!selectedOption || isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? '提交中...' : '提交投票'}
            </button>
          )}
          {voteSuccess && (
            <button
              className="btn btn-success btn-large btn-vote-success"
              disabled
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              投票成功
            </button>
          )}
          {hasVoted && !voteSuccess && (
            <button className="btn btn-secondary btn-large" onClick={onClose}>
              关闭
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
