import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { User } from '../data/db';

interface UserCardProps {
  user: User;
  isCurrentUser?: boolean;
  compact?: boolean;
}

export function UserCard({ user, isCurrentUser = false, compact = false }: UserCardProps) {
  const [hover, setHover] = useState(false);

  if (compact) {
    return (
      <Link
        to={`/profile/${user.id}`}
        style={{ textDecoration: 'none' }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src={user.avatarUrl}
            alt={user.nickname}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: `2px solid ${hover ? '#6366f1' : '#e5e7eb'}`,
              transition: 'border-color 0.2s ease',
              objectFit: 'cover',
              background: '#f3f4f6'
            }}
          />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>
              {user.nickname}
              {isCurrentUser && <span style={{ color: '#f97316', marginLeft: '4px', fontSize: '11px' }}>（我）</span>}
            </div>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>{user.building}</div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/profile/${user.id}`}
      style={{ textDecoration: 'none' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          padding: '16px',
          borderRadius: '12px',
          background: '#ffffff',
          boxShadow: hover ? '0 4px 12px rgba(0,0,0,0.1)' : '0 2px 6px rgba(0,0,0,0.06)',
          transition: 'box-shadow 0.2s ease',
          width: 'fit-content'
        }}
      >
        <img
          src={user.avatarUrl}
          alt={user.nickname}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            border: `2px solid ${hover ? '#6366f1' : '#e5e7eb'}`,
            transition: 'border-color 0.2s ease',
            objectFit: 'cover',
            background: '#f3f4f6'
          }}
        />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>
            {user.nickname}
            {isCurrentUser && <span style={{ color: '#f97316', marginLeft: '4px', fontSize: '12px' }}>（我）</span>}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{user.building}</div>
          <div style={{
            marginTop: '6px',
            fontSize: '12px',
            fontWeight: 700,
            color: '#f59e0b'
          }}>
            信用 {user.creditScore} 分
          </div>
        </div>
      </div>
    </Link>
  );
}
