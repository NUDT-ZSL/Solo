import React, { useState } from 'react';
import type { TeamMember } from '../utils/types';
import Avatar from './Avatar';

interface MemberCardProps {
  member: TeamMember;
  onLike: (id: string) => void;
}

interface Bubble {
  id: number;
}

const MemberCard: React.FC<MemberCardProps> = ({ member, onLike }) => {
  const [liked, setLiked] = useState(false);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  const totalContribution = member.prCount + member.issueCount;

  const handleLikeClick = () => {
    setLiked(true);
    const newBubble: Bubble = { id: Date.now() };
    setBubbles((prev) => [...prev, newBubble]);
    onLike(member.id);

    setTimeout(() => {
      setBubbles((prev) => prev.filter((b) => b.id !== newBubble.id));
    }, 800);
  };

  return (
    <div
      style={{
        width: 280,
        borderRadius: 12,
        backgroundColor: '#ffffff',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        transition: 'transform 0.25s ease-out, box-shadow 0.25s ease-out',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Avatar initial={member.avatarInitial} color={member.avatarColor} size={48} />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#1e293b',
              marginBottom: 4,
            }}
          >
            {member.name}
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>团队成员</div>
        </div>
      </div>

      <div
        style={{
          borderTop: '1px solid #f1f5f9',
          paddingTop: 16,
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: '#38bdf8',
              lineHeight: 1.2,
            }}
          >
            {totalContribution}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
            当月贡献
          </div>
        </div>
        <div style={{ width: 1, height: 40, backgroundColor: '#e2e8f0' }} />
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: '#1e293b',
              lineHeight: 1.2,
            }}
          >
            {member.prCount}
            <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 400 }}>
              /{member.issueCount}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
            PR/Issue
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid #f1f5f9',
          paddingTop: 16,
        }}
      >
        <div style={{ fontSize: 14, color: '#64748b' }}>
          收到点赞：
          <span style={{ fontWeight: 600, color: '#1e293b', marginLeft: 4 }}>
            {member.likes}
          </span>
        </div>
        <div style={{ position: 'relative' }}>
          <button
            onClick={handleLikeClick}
            style={{
              position: 'relative',
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: liked ? '#fef2f2' : '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = liked ? '#fee2e2' : '#f1f5f9';
              e.currentTarget.style.transform = 'scale(1.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = liked ? '#fef2f2' : '#f8fafc';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill={liked ? '#ef4444' : 'none'}
              stroke={liked ? '#ef4444' : '#94a3b8'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transition: 'all 0.2s ease-out' }}
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
          {bubbles.map((bubble) => (
            <span
              key={bubble.id}
              style={{
                position: 'absolute',
                left: '50%',
                top: 0,
                color: '#ef4444',
                fontWeight: 700,
                fontSize: 16,
                pointerEvents: 'none',
                animation: 'popUp 0.8s ease-out forwards',
                zIndex: 10,
              }}
            >
              +1
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MemberCard;
