import React from 'react';
import type { Topic } from '../types';

interface TopicListProps {
  topics: Topic[];
  onTopicClick: (topic: Topic) => void;
  onGenerateReport: (topic: Topic) => void;
  onEdit: (topic: Topic) => void;
  onDelete: (topic: Topic) => void;
}

type TopicUrgency = 'ending-soon' | 'hot' | 'active';

const getTimeRemaining = (deadline: string): { text: string; isUrgent: boolean; urgency: TopicUrgency; totalMinutes: number } => {
  const now = new Date().getTime();
  const deadlineTime = new Date(deadline).getTime();
  const diff = deadlineTime - now;

  if (diff <= 0) {
    return { text: '已结束', isUrgent: false, urgency: 'active', totalMinutes: 0 };
  }

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  let text = '';
  if (days > 0) {
    text = `剩余 ${days} 天 ${hours} 小时`;
  } else if (hours > 0) {
    text = `剩余 ${hours} 小时 ${minutes} 分钟`;
  } else {
    text = `剩余 ${minutes} 分钟`;
  }

  let urgency: TopicUrgency = 'hot';
  if (totalMinutes < 60) {
    urgency = 'ending-soon';
  } else if (totalMinutes > 24 * 60) {
    urgency = 'active';
  }

  return { text, isUrgent: totalMinutes < 60, urgency, totalMinutes };
};

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const TopicList: React.FC<TopicListProps> = ({
  topics,
  onTopicClick,
  onGenerateReport,
  onEdit,
  onDelete,
}) => {
  const DEFAULT_TARGET_VOTES = 1000;

  const getStatusBadge = (status: Topic['status']) => {
    const styles: Record<string, string> = {
      pending: 'badge-pending',
      active: 'badge-active',
      ended: 'badge-ended',
    };
    const labels: Record<string, string> = {
      pending: '未开始',
      active: '进行中',
      ended: '已结束',
    };
    return <span className={`badge ${styles[status]}`}>{labels[status]}</span>;
  };

  const getUrgencyBadge = (urgency: TopicUrgency, status: Topic['status']) => {
    if (status !== 'active') return null;

    const config: Record<TopicUrgency, { label: string; className: string }> = {
      'ending-soon': { label: '即将结束', className: 'urgency-badge urgency-ending' },
      'hot': { label: '火热投票中', className: 'urgency-badge urgency-hot' },
      'active': { label: '进行中', className: 'urgency-badge urgency-active' },
    };

    const { label, className } = config[urgency];
    return (
      <span className={className}>
        {urgency === 'ending-soon' && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        )}
        {label}
      </span>
    );
  };

  const getCardClassName = (urgency: TopicUrgency, status: Topic['status']) => {
    let className = 'topic-card';
    if (status === 'active') {
      if (urgency === 'ending-soon') {
        className += ' card-urgent';
      } else if (urgency === 'hot') {
        className += ' card-hot';
      }
    }
    return className;
  };

  return (
    <div className="topic-grid">
      {topics.map((topic) => {
        const timeInfo = getTimeRemaining(topic.deadline);
        const totalVotes = topic.totalVotes;
        const targetVotes = topic.targetVotes || DEFAULT_TARGET_VOTES;
        const progressPercent = Math.min((totalVotes / targetVotes) * 100, 100);
        const previewOptions = topic.options.slice(0, 2);

        return (
          <div
            key={topic.id}
            className={getCardClassName(timeInfo.urgency, topic.status)}
            onClick={() => topic.status !== 'ended' && onTopicClick(topic)}
          >
            {topic.status === 'active' && (
              <div className="card-urgency-badge">
                {getUrgencyBadge(timeInfo.urgency, topic.status)}
              </div>
            )}
            <div className="card-header">
              <h3 className="card-title">{topic.title}</h3>
              {getStatusBadge(topic.status)}
            </div>

            <div className="card-body">
              <div className="options-preview">
                {previewOptions.map((option) => {
                  const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
                  return (
                    <div key={option.id} className="option-preview-item">
                      <div className="option-preview-label">
                        <span className="option-color-dot" style={{ backgroundColor: option.color }}></span>
                        <span className="option-text">{option.text}</span>
                        <span className="option-percentage">{percentage.toFixed(0)}%</span>
                      </div>
                      <div className="option-progress-bar">
                        <div
                          className="option-progress-fill"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: option.color,
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
                {topic.options.length > 2 && (
                  <div className="more-options">还有 {topic.options.length - 2} 个选项...</div>
                )}
              </div>
            </div>

            <div className="card-footer">
              <div className="card-meta">
                <span className="participants">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                  {totalVotes} 人参与
                </span>
                <span className={`deadline ${timeInfo.isUrgent ? 'urgent' : ''}`}>
                  {timeInfo.isUrgent && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                  )}
                  {timeInfo.text}
                </span>
              </div>

              {topic.status === 'active' && (
                <div className="card-progress">
                  <div className="card-progress-header">
                    <span className="progress-label">目标达成</span>
                    <span className="progress-value">{totalVotes} / {targetVotes}</span>
                  </div>
                  <div className="card-progress-bar">
                    <div
                      className="card-progress-fill"
                      style={{
                        width: `${progressPercent}%`,
                      }}
                    ></div>
                  </div>
                  <div className="progress-percent">{progressPercent.toFixed(0)}%</div>
                </div>
              )}

              <div className="card-actions">
                {topic.status === 'ended' ? (
                  <button
                    className="btn btn-primary btn-small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onGenerateReport(topic);
                    }}
                  >
                    生成报告
                  </button>
                ) : topic.status === 'pending' ? (
                  <>
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(topic);
                      }}
                    >
                      编辑
                    </button>
                    <button
                      className="btn btn-danger btn-small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(topic);
                      }}
                    >
                      删除
                    </button>
                  </>
                ) : (
                  <span className="hint-text">点击参与投票</span>
                )}
              </div>

              <div className="card-date">创建于 {formatDate(topic.createdAt)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
