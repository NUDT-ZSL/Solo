import { Session, User } from '../types';

interface SidebarProps {
  session: Session;
  users: User[];
  currentUserId: string;
  isHost: boolean;
  onEndSession: () => void;
}

export default function Sidebar({
  session,
  users,
  currentUserId,
  isHost,
  onEndSession,
}: SidebarProps) {
  const deadlineStr = new Date(session.deadline).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className="sidebar"
      style={{
        width: 220,
        background: '#1e293b',
        color: '#e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'auto',
      }}
    >
      <div style={{ padding: 20, borderBottom: '1px solid #334155' }}>
        <h2
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#f8fafc',
            marginBottom: 4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {session.title}
        </h2>
        {session.description && (
          <p
            style={{
              fontSize: 12,
              color: '#94a3b8',
              marginBottom: 8,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {session.description}
          </p>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 10,
          }}
        >
          <span style={{ fontSize: 11, color: '#94a3b8' }}>邀请码</span>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: 16,
              fontWeight: 700,
              color: '#6366f1',
              letterSpacing: 2,
              background: '#312e81',
              padding: '2px 10px',
              borderRadius: 6,
            }}
          >
            {session.code}
          </span>
        </div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
          截止：{deadlineStr}
        </div>
      </div>

      <div style={{ padding: 16, flex: 1, overflow: 'auto' }}>
        <div
          style={{
            fontSize: 11,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 10,
            fontWeight: 600,
          }}
        >
          在线成员 ({users.length})
        </div>
        {users.map((user) => (
          <div
            key={user.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 0',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: user.color,
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span
              style={{
                fontSize: 13,
                color: user.id === currentUserId ? '#6366f1' : '#cbd5e1',
                fontWeight: user.id === currentUserId ? 600 : 400,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.name}
              {user.id === session.hostId && (
                <span style={{ fontSize: 10, color: '#fbbf24', marginLeft: 4 }}>
                  主持人
                </span>
              )}
              {user.id === currentUserId && (
                <span style={{ fontSize: 10, color: '#6366f1', marginLeft: 4 }}>
                  (你)
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      <div style={{ padding: 16, borderTop: '1px solid #334155' }}>
        <button
          onClick={onEndSession}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #475569',
            background: 'transparent',
            color: '#94a3b8',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            const t = e.target as HTMLElement;
            t.style.borderColor = '#ef4444';
            t.style.color = '#ef4444';
          }}
          onMouseLeave={(e) => {
            const t = e.target as HTMLElement;
            t.style.borderColor = '#475569';
            t.style.color = '#94a3b8';
          }}
        >
          {isHost ? '结束会议' : '离开会议'}
        </button>
      </div>
    </div>
  );
}
