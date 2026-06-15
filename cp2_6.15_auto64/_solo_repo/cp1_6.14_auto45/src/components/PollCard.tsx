import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Poll } from '../types';

interface PollCardProps {
  poll: Poll;
}

const PollCard: React.FC<PollCardProps> = ({ poll }) => {
  const navigate = useNavigate();

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      single: '单选',
      multiple: '多选',
      rating: '评分',
      ranking: '排序',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      single: '#6366f1',
      multiple: '#ec4899',
      rating: '#f59e0b',
      ranking: '#10b981',
    };
    return colors[type] || '#6366f1';
  };

  const formatDeadline = (deadline: number | null) => {
    if (!deadline) return '无截止时间';
    const date = new Date(deadline);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpired = poll.deadline && Date.now() > poll.deadline;

  return (
    <div
      style={{
        ...styles.card,
        height: '80px',
        backgroundColor: '#1e1e2e',
      }}
      onClick={() => navigate(`/poll/${poll.id}`)}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'linear-gradient(135deg, #1e1e2e, #2a2a3e)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#1e1e2e';
      }}
    >
      <div style={styles.leftContent}>
        <h3 style={styles.title}>{poll.title}</h3>
        <div style={styles.metaRow}>
          <span
            style={{
              ...styles.typeTag,
              backgroundColor: getTypeColor(poll.type) + '20',
              color: getTypeColor(poll.type),
            }}
          >
            {getTypeLabel(poll.type)}
          </span>
          <span style={styles.deadline}>
            {isExpired ? '已截止' : `截止: ${formatDeadline(poll.deadline)}`}
          </span>
        </div>
      </div>
      <div style={styles.rightContent}>
        <div style={styles.participantCount}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>{poll.participant_count} 人参与</span>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    borderRadius: '10px',
    padding: '0 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
  },
  leftContent: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#e2e8f0',
    marginBottom: '8px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  typeTag: {
    fontSize: '12px',
    padding: '2px 8px',
    borderRadius: '12px',
    fontWeight: 500,
  },
  deadline: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  rightContent: {
    marginLeft: '16px',
  },
  participantCount: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#94a3b8',
  },
};

export default PollCard;
