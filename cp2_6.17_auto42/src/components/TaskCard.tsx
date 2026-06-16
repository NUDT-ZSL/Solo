import { useState } from 'react';
import type { Task } from '../data/db';
import { getTaskTypeLabel, getTaskTypeColor, getTaskStatusLabel, formatTime, formatExactTime } from '../utils/helpers';

interface TaskCardProps {
  task: Task;
  index?: number;
  currentUserId?: string | null;
  users?: { id: string; nickname: string; avatarUrl: string; building: string }[];
  onAccept?: (taskId: string) => void;
  onComplete?: (taskId: string) => void;
  onCancel?: (taskId: string) => void;
}

export function TaskCard({ task, index = 0, currentUserId, users = [], onAccept, onComplete, onCancel }: TaskCardProps) {
  const [hover, setHover] = useState(false);
  const publisher = users.find((u) => u.id === task.publisherId);
  const acceptor = users.find((u) => u.id === task.acceptorId);
  const isPublisher = currentUserId === task.publisherId;
  const isAcceptor = currentUserId === task.acceptorId;

  const cardStyle: React.CSSProperties = {
    width: '280px',
    height: '180px',
    borderRadius: '12px',
    background: '#ffffff',
    boxShadow: hover ? '0 4px 16px rgba(0,0,0,0.12)' : '0 2px 8px rgba(0,0,0,0.08)',
    padding: '0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    cursor: 'default',
    opacity: 0,
    transform: 'translateY(20px)',
    animation: `fadeInUp 0.4s ease-out ${index * 0.2}s forwards`,
    transition: 'box-shadow 0.2s ease'
  };

  const labelStyle: React.CSSProperties = {
    backgroundColor: getTaskTypeColor(task.type),
    color: '#ffffff',
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: 600,
    borderTopLeftRadius: '12px',
    borderBottomRightRadius: '8px',
    display: 'inline-block'
  };

  const btnBase: React.CSSProperties = {
    padding: '6px 16px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    transition: 'background-color 0.2s ease, transform 0.1s ease'
  };

  const acceptBtnStyle: React.CSSProperties = {
    ...btnBase,
    backgroundColor: '#f97316',
    color: '#ffffff'
  };

  const completeBtnStyle: React.CSSProperties = {
    ...btnBase,
    backgroundColor: '#22c55e',
    color: '#ffffff'
  };

  const cancelBtnStyle: React.CSSProperties = {
    ...btnBase,
    backgroundColor: '#ef4444',
    color: '#ffffff'
  };

  const disabledBtnStyle: React.CSSProperties = {
    ...btnBase,
    backgroundColor: '#d1d5db',
    color: '#6b7280',
    cursor: 'not-allowed'
  };

  const renderButton = () => {
    if (task.status === 'active') {
      if (isPublisher) {
        return (
          <button
            style={cancelBtnStyle}
            onClick={() => onCancel && onCancel(task.id)}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#dc2626')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ef4444')}
          >
            取消
          </button>
        );
      }
      if (currentUserId && !isPublisher) {
        return (
          <button
            style={acceptBtnStyle}
            onClick={() => onAccept && onAccept(task.id)}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ea580c')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f97316')}
          >
            接受
          </button>
        );
      }
      return <button style={disabledBtnStyle} disabled>请先登录</button>;
    }

    if (task.status === 'in-progress') {
      if (isPublisher) {
        return (
          <button
            style={completeBtnStyle}
            onClick={() => onComplete && onComplete(task.id)}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#16a34a')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#22c55e')}
          >
            确认完成
          </button>
        );
      }
      return (
        <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600 }}>
          {isAcceptor ? '你正在进行中' : '进行中...'}
        </span>
      );
    }

    if (task.status === 'completed') {
      return <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>✓ 已完成</span>;
    }

    return <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>已取消</span>;
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={labelStyle}>{getTaskTypeLabel(task.type)}</span>
        <span
          style={{
            padding: '4px 10px',
            fontSize: '11px',
            color: '#6b7280',
            marginTop: '4px',
            marginRight: '8px'
          }}
        >
          {getTaskStatusLabel(task.status)}
        </span>
      </div>

      <div style={{ padding: '10px 14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{
            margin: '0 0 6px 0',
            fontSize: '15px',
            fontWeight: 600,
            color: '#1f2937',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {task.title}
          </h3>
          <p style={{
            margin: '0 0 4px 0',
            fontSize: '12px',
            color: '#6b7280',
            lineHeight: 1.5,
            height: '36px',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}>
            {task.description || '暂无描述'}
          </p>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: '#9ca3af' }} title={formatExactTime(task.createdAt)}>
              {formatTime(task.createdAt)}
            </span>
            <span style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#f97316'
            }}>
              +{task.rewardPoints} 分
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {publisher && (
                <img
                  src={publisher.avatarUrl}
                  alt={publisher.nickname}
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    border: '1px solid #e5e7eb'
                  }}
                />
              )}
              <span style={{ fontSize: '11px', color: '#6b7280' }}>
                {publisher ? publisher.building : '未知楼栋'}
              </span>
            </div>
            {renderButton()}
          </div>
        </div>
      </div>
    </div>
  );
}
