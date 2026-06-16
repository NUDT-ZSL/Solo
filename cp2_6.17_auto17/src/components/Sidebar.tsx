import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { UserInfo } from '../types';

interface SidebarProps {
  roomId: string;
  users: UserInfo[];
  currentUserId?: string;
  isTeacher?: boolean;
}

const COLORS = [
  '#3b82f6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
  '#f97316', '#6366f1',
];

function getColorForUser(userId: string, assignedColor?: string): string {
  if (assignedColor) return assignedColor;
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return trimmed.charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function Sidebar({ roomId, users, currentUserId, isTeacher = false }: SidebarProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setIsCollapsed(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const containerStyle: React.CSSProperties = isMobile
    ? {
        ...styles.container,
        ...styles.containerMobile,
        ...(isCollapsed ? styles.containerMobileCollapsed : {}),
      }
    : {
        ...styles.container,
        width: 'var(--sidebar-width)',
        minWidth: '280px',
        maxWidth: '400px',
      };

  return (
    <aside style={containerStyle}>
      {isMobile && (
        <div style={styles.mobileHeader} onClick={() => setIsCollapsed(!isCollapsed)}>
          <span style={styles.mobileTitle}>在线用户 ({users.length})</span>
          <span style={{
            ...styles.collapseIcon,
            transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
          }}>▲</span>
        </div>
      )}

      <div style={{
        ...styles.content,
        ...(isMobile && isCollapsed ? styles.contentHidden : {}),
      }}>
        <div style={styles.roomTagContainer}>
          <div style={styles.roomTag}>
            <span style={styles.roomIcon}>🏠</span>
            <span style={styles.roomLabel}>房间号:</span>
            <span style={styles.roomValue}>{roomId}</span>
          </div>
        </div>

        <div style={styles.divider} />

        <div style={styles.userHeader}>
          <span style={styles.userHeaderText}>
            在线用户 <span style={styles.userCount}>({users.length})</span>
          </span>
        </div>

        <div style={styles.userList}>
          {users.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>👥</span>
              <span style={styles.emptyText}>暂无在线用户</span>
            </div>
          ) : (
            users.map((user) => {
              const userColor = getColorForUser(user.userId, user.color);
              const isCurrentUser = user.userId === currentUserId;
              const initials = getInitials(user.username);

              return (
                <div
                  key={user.userId}
                  style={{
                    ...styles.userItem,
                    ...(isCurrentUser ? styles.userItemCurrent : {}),
                    borderLeftColor: userColor,
                  }}
                >
                  <div style={styles.avatarWrapper}>
                    <div style={{
                      ...styles.avatar,
                      backgroundColor: userColor,
                    }}>
                      <span style={styles.avatarText}>{initials}</span>
                    </div>
                    <div style={styles.onlineDot} />
                  </div>

                  <div style={styles.userInfo}>
                    <div style={styles.userNameRow}>
                      <span style={styles.userName}>
                        {user.username}
                        {isCurrentUser && <span style={styles.currentUserBadge}>(我)</span>}
                      </span>
                      <span style={{
                        ...styles.roleBadge,
                        background: user.role === 'teacher'
                          ? 'linear-gradient(135deg, var(--accent-secondary), #0891b2)'
                          : 'linear-gradient(135deg, var(--accent-primary), #2563eb)',
                      }}>
                        {user.role === 'teacher' ? '教师' : '学生'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {isTeacher && (
          <>
            <div style={styles.divider} />
            <div style={styles.teacherActions}>
              <Link
                to={`/monitor/${encodeURIComponent(roomId)}`}
                style={styles.monitorLink}
              >
                <span style={styles.monitorIcon}>📊</span>
                <span style={styles.monitorText}>进入监控面板</span>
                <span style={styles.monitorArrow}>→</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100%',
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  containerMobile: {
    width: '100%',
    height: 'auto',
    maxWidth: 'none',
    minWidth: 'auto',
    borderRight: 'none',
    borderBottom: '1px solid var(--border-color)',
  },
  containerMobileCollapsed: {
    maxHeight: '56px',
  },
  mobileHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    cursor: 'pointer',
    borderBottom: '1px solid var(--border-color)',
    userSelect: 'none',
  },
  mobileTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  collapseIcon: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    transition: 'transform var(--transition-fast)',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
    transition: 'max-height var(--transition-normal)',
  },
  contentHidden: {
    display: 'none',
  },
  roomTagContainer: {
    padding: '20px 20px 16px',
  },
  roomTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    background: 'var(--bg-primary)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-color)',
  },
  roomIcon: {
    fontSize: '16px',
  },
  roomLabel: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  roomValue: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    fontFamily: 'monospace',
  },
  divider: {
    height: '1px',
    background: '#334155',
    margin: '0 20px',
  },
  userHeader: {
    padding: '16px 20px 12px',
  },
  userHeaderText: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  userCount: {
    color: 'var(--accent-primary)',
    fontWeight: 700,
  },
  userList: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 12px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    gap: '12px',
  },
  emptyIcon: {
    fontSize: '36px',
    opacity: 0.5,
  },
  emptyText: {
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    background: 'var(--bg-primary)',
    borderRadius: 'var(--radius-md)',
    borderLeft: '3px solid var(--accent-primary)',
    transition: 'background var(--transition-fast)',
  },
  userItemCurrent: {
    background: 'rgba(59, 130, 246, 0.08)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    borderLeft: '3px solid var(--accent-primary)',
  },
  avatarWrapper: {
    position: 'relative',
    flexShrink: 0,
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#fff',
    textShadow: '0 1px 2px rgba(0,0,0,0.2)',
  },
  onlineDot: {
    position: 'absolute',
    bottom: '0',
    right: '0',
    width: '12px',
    height: '12px',
    background: 'var(--accent-success)',
    borderRadius: '50%',
    border: '2px solid var(--bg-primary)',
    boxShadow: '0 0 0 2px var(--bg-primary)',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userNameRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  userName: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  currentUserBadge: {
    fontSize: '11px',
    color: 'var(--accent-primary)',
    marginLeft: '4px',
    fontWeight: 400,
  },
  roleBadge: {
    padding: '2px 8px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#fff',
    flexShrink: 0,
  },
  teacherActions: {
    padding: '16px 20px 20px',
  },
  monitorLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(59, 130, 246, 0.1))',
    borderRadius: 'var(--radius-md)',
    border: '1px solid rgba(6, 182, 212, 0.3)',
    textDecoration: 'none',
    transition: 'all var(--transition-fast)',
  },
  monitorIcon: {
    fontSize: '18px',
  },
  monitorText: {
    flex: 1,
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  monitorArrow: {
    fontSize: '14px',
    color: 'var(--accent-secondary)',
  },
};
