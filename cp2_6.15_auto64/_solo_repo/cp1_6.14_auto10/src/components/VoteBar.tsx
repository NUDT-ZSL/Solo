import React, { useState } from 'react';
import type { Vote } from '../types';

interface VoteBarProps {
  votes: Vote[];
  currentUserId: string;
  onVote: (voteType: 'approve' | 'reject' | 'abstain') => void;
}

const VoteBar: React.FC<VoteBarProps> = ({ votes, currentUserId, onVote }) => {
  const [animatingButton, setAnimatingButton] = useState<string | null>(null);

  const approveCount = votes.filter((v) => v.voteType === 'approve').length;
  const rejectCount = votes.filter((v) => v.voteType === 'reject').length;
  const abstainCount = votes.filter((v) => v.voteType === 'abstain').length;
  const totalCount = votes.length;

  const currentVote = votes.find((v) => v.userId === currentUserId)?.voteType || null;

  const approvePercent = totalCount > 0 ? (approveCount / totalCount) * 100 : 0;
  const rejectPercent = totalCount > 0 ? (rejectCount / totalCount) * 100 : 0;
  const abstainPercent = totalCount > 0 ? (abstainCount / totalCount) * 100 : 0;

  const handleVote = (voteType: 'approve' | 'reject' | 'abstain') => {
    setAnimatingButton(voteType);
    onVote(voteType);
    setTimeout(() => setAnimatingButton(null), 150);
  };

  return (
    <div style={styles.container}>
      <div style={styles.progressBarContainer}>
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressSegment,
              ...styles.approveSegment,
              width: `${approvePercent}%`,
            }}
          />
          <div
            style={{
              ...styles.progressSegment,
              ...styles.rejectSegment,
              width: `${rejectPercent}%`,
            }}
          />
          <div
            style={{
              ...styles.progressSegment,
              ...styles.abstainSegment,
              width: `${abstainPercent}%`,
            }}
          />
        </div>
      </div>

      <div style={styles.voteStats}>
        <div style={styles.statItem}>
          <span style={{ ...styles.statDot, backgroundColor: '#22c55e' }} />
          <span style={styles.statLabel}>赞成</span>
          <span style={styles.statCount}>{approveCount}</span>
        </div>
        <div style={styles.statItem}>
          <span style={{ ...styles.statDot, backgroundColor: '#ef4444' }} />
          <span style={styles.statLabel}>反对</span>
          <span style={styles.statCount}>{rejectCount}</span>
        </div>
        <div style={styles.statItem}>
          <span style={{ ...styles.statDot, backgroundColor: '#9ca3af' }} />
          <span style={styles.statLabel}>弃权</span>
          <span style={styles.statCount}>{abstainCount}</span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statLabel}>总计</span>
          <span style={styles.statCount}>{totalCount}</span>
        </div>
      </div>

      <div style={styles.voteButtons}>
        <button
          style={{
            ...styles.voteButton,
            ...styles.approveButton,
            ...(currentVote === 'approve' ? styles.activeButton : {}),
            transform: animatingButton === 'approve' ? 'scale(0.95)' : 'scale(1)',
          }}
          onClick={() => handleVote('approve')}
          onMouseEnter={(e) => {
            if (currentVote !== 'approve') {
              e.currentTarget.style.backgroundColor = '#16a34a';
            }
          }}
          onMouseLeave={(e) => {
            if (currentVote !== 'approve') {
              e.currentTarget.style.backgroundColor = '#22c55e';
            }
          }}
        >
          👍 赞成
        </button>
        <button
          style={{
            ...styles.voteButton,
            ...styles.rejectButton,
            ...(currentVote === 'reject' ? styles.activeButton : {}),
            transform: animatingButton === 'reject' ? 'scale(0.95)' : 'scale(1)',
          }}
          onClick={() => handleVote('reject')}
          onMouseEnter={(e) => {
            if (currentVote !== 'reject') {
              e.currentTarget.style.backgroundColor = '#dc2626';
            }
          }}
          onMouseLeave={(e) => {
            if (currentVote !== 'reject') {
              e.currentTarget.style.backgroundColor = '#ef4444';
            }
          }}
        >
          👎 反对
        </button>
        <button
          style={{
            ...styles.voteButton,
            ...styles.abstainButton,
            ...(currentVote === 'abstain' ? styles.activeButton : {}),
            transform: animatingButton === 'abstain' ? 'scale(0.95)' : 'scale(1)',
          }}
          onClick={() => handleVote('abstain')}
          onMouseEnter={(e) => {
            if (currentVote !== 'abstain') {
              e.currentTarget.style.backgroundColor = '#4b5563';
            }
          }}
          onMouseLeave={(e) => {
            if (currentVote !== 'abstain') {
              e.currentTarget.style.backgroundColor = '#6b7280';
            }
          }}
        >
          🤚 弃权
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
  },
  progressBarContainer: {
    marginBottom: '16px',
  },
  progressBar: {
    height: '12px',
    backgroundColor: '#e2e8f0',
    borderRadius: '999px',
    overflow: 'hidden',
    display: 'flex',
  },
  progressSegment: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
  approveSegment: {
    backgroundColor: '#22c55e',
    borderRadius: '999px 0 0 999px',
  },
  rejectSegment: {
    backgroundColor: '#ef4444',
  },
  abstainSegment: {
    backgroundColor: '#9ca3af',
    borderRadius: '0 999px 999px 0',
  },
  voteStats: {
    display: 'flex',
    gap: '24px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  statDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  statLabel: {
    fontSize: '13px',
    color: '#64748b',
  },
  statCount: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1e293b',
    marginLeft: '4px',
  },
  voteButtons: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  voteButton: {
    flex: 1,
    minWidth: '100px',
    padding: '12px 20px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#ffffff',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, transform 0.15s ease',
  },
  approveButton: {
    backgroundColor: '#22c55e',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  abstainButton: {
    backgroundColor: '#6b7280',
  },
  activeButton: {
    boxShadow: '0 0 0 2px #ffffff, 0 0 0 4px currentColor',
  },
};

export default VoteBar;
