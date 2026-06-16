import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { User } from '../data/db';

interface UserCardProps {
  user: User;
  isCurrentUser?: boolean;
  compact?: boolean;
}

let styleInjected = false;
function injectUserCardStyles() {
  if (styleInjected) return;
  styleInjected = true;
  const css = `
    .user-card-avatar {
      transition: border-color 0.2s ease, transform 0.2s ease;
    }
    .user-card-link:hover .user-card-avatar {
      border-color: #6366f1 !important;
    }
    .user-card-link:hover .user-card-avatar-compact {
      border-color: #6366f1 !important;
      transform: scale(1.05);
    }
    .user-card-link:hover .user-card-wrapper {
      box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
    }
  `;
  const style = document.createElement('style');
  style.setAttribute('data-user-card', 'true');
  style.textContent = css;
  document.head.appendChild(style);
}

export function UserCard({ user, isCurrentUser = false, compact = false }: UserCardProps) {
  useMemo(() => injectUserCardStyles(), []);

  if (compact) {
    return (
      <Link
        to={`/profile/${user.id}`}
        className="user-card-link"
        style={{ textDecoration: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src={user.avatarUrl}
            alt={user.nickname}
            className="user-card-avatar user-card-avatar-compact"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '2px solid #e5e7eb',
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
      className="user-card-link"
      style={{ textDecoration: 'none', display: 'inline-block' }}
    >
      <div
        className="user-card-wrapper"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          padding: '16px',
          borderRadius: '12px',
          background: '#ffffff',
          boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
          transition: 'box-shadow 0.2s ease',
          width: 'fit-content'
        }}
      >
        <img
          src={user.avatarUrl}
          alt={user.nickname}
          className="user-card-avatar"
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            border: '2px solid #e5e7eb',
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
