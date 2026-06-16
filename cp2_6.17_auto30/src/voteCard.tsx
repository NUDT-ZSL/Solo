import React from 'react';
import type { Topic } from './storage';

interface VoteCardProps {
  topic: Topic;
  voteCount: number;
  onClick: () => void;
  userVoted: boolean;
}

function calculateDivergenceIndex(voteCount: number, topicId: string): number {
  if (voteCount < 2) return 0;
  const seed = Array.from(topicId).reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const pseudoRandom = ((seed * 9301 + voteCount * 49297) % 233280) / 233280;
  return Math.round(30 + pseudoRandom * 60);
}

const VoteCard: React.FC<VoteCardProps> = ({ topic, voteCount, onClick, userVoted }) => {
  const divergence = calculateDivergenceIndex(voteCount, topic.id);
  return (
    <div
      onClick={onClick}
      style={{
        width: 240,
        height: 180,
        borderRadius: 12,
        background: '#ffffff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        padding: 16,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxSizing: 'border-box',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
      }}
    >
      <div>
        <h3
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 700,
            color: '#111827',
            lineHeight: 1.3,
            marginBottom: 8,
          }}
        >
          {topic.title}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: '#6b7280',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {topic.description}
        </p>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ fontSize: 12, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>{voteCount} 人参与</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {userVoted && (
            <span
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 10,
                background: '#dcfce7',
                color: '#16a34a',
                fontWeight: 600,
              }}
            >
              已投票
            </span>
          )}
          <div
            style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 10,
              background: divergence > 60 ? '#fef2f2' : divergence > 30 ? '#fffbeb' : '#f0fdf4',
              color: divergence > 60 ? '#dc2626' : divergence > 30 ? '#d97706' : '#16a34a',
              fontWeight: 600,
            }}
          >
            分歧 {divergence}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoteCard;
