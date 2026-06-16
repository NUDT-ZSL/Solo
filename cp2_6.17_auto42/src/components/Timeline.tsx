import { useState, useMemo } from 'react';
import type { Task } from '../data/db';
import {
  getTaskTypeLabel,
  getTaskTypeColor,
  getTaskStatusLabel,
  formatExactTime,
  formatTime,
  getStatusColor
} from '../utils/helpers';

interface TimelineProps {
  tasks: Task[];
  users?: { id: string; nickname: string; avatarUrl: string; building: string }[];
  currentUserId?: string;
}

let timelineStyleInjected = false;
function injectTimelineStyles() {
  if (timelineStyleInjected) return;
  timelineStyleInjected = true;
  const css = `
    @keyframes timelineExpand {
      from {
        opacity: 0;
        max-height: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        max-height: 500px;
        transform: translateY(0);
      }
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.2); }
    }
    .timeline-details {
      animation: timelineExpand 0.3s ease-out forwards;
      overflow: hidden;
    }
    .timeline-node-dot {
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      cursor: pointer;
    }
    .timeline-node:hover .timeline-node-dot {
      transform: scale(1.3);
      box-shadow: 0 0 0 3px #e5e7eb, 0 0 0 6px rgba(99,102,241,0.2) !important;
    }
    .timeline-node.expanded .timeline-node-dot {
      animation: pulse 1s ease-in-out;
      box-shadow: 0 0 0 3px #e5e7eb, 0 0 0 6px rgba(99,102,241,0.15) !important;
    }
    .timeline-card {
      transition: all 0.2s ease;
      cursor: pointer;
    }
    .timeline-node:hover .timeline-card {
      transform: translateX(4px);
      box-shadow: 0 6px 18px rgba(0,0,0,0.1) !important;
    }
  `;
  const style = document.createElement('style');
  style.setAttribute('data-timeline', 'true');
  style.textContent = css;
  document.head.appendChild(style);
}

export function Timeline({ tasks, users = [], currentUserId }: TimelineProps) {
  useMemo(() => injectTimelineStyles(), []);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sortedTasks = useMemo(
    () =>
      [...tasks].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [tasks]
  );

  const toggleExpand = (taskId: string) => {
    setExpandedId((prev) => (prev === taskId ? null : taskId));
  };

  return (
    <div style={{ position: 'relative', paddingLeft: '32px' }}>
      <div
        style={{
          position: 'absolute',
          left: '11px',
          top: '6px',
          bottom: '6px',
          width: '2px',
          backgroundColor: '#e5e7eb'
        }}
      />

      {sortedTasks.length === 0 && (
        <div style={{ padding: '40px 0', textAlign: 'center', color: '#9ca3af' }}>
          <div style={{ fontSize: '42px', marginBottom: '12px' }}>📋</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>
            暂无任务记录
          </div>
          <div style={{ fontSize: '12px' }}>快去首页发布或接受第一个任务吧~</div>
        </div>
      )}

      {sortedTasks.map((task) => {
        const isExpanded = expandedId === task.id;
        const publisher = users.find((u) => u.id === task.publisherId);
        const acceptor = users.find((u) => u.id === task.acceptorId);
        const isPublisher = currentUserId === task.publisherId;
        const isAcceptor = currentUserId === task.acceptorId;

        let roleText = '';
        if (isPublisher) roleText = '（我发布的）';
        else if (isAcceptor) roleText = '（我接受的）';

        return (
          <div
            key={task.id}
            className={`timeline-node${isExpanded ? ' expanded' : ''}`}
            style={{ position: 'relative', marginBottom: '20px' }}
          >
            <div
              className="timeline-node-dot"
              onClick={() => toggleExpand(task.id)}
              title="点击展开/收起详情"
              style={{
                position: 'absolute',
                left: '-27px',
                top: '18px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: getStatusColor(task.status),
                border: '2px solid #ffffff',
                boxShadow: '0 0 0 2px #e5e7eb',
                zIndex: 2
              }}
            />

            <div
              className="timeline-card"
              onClick={() => toggleExpand(task.id)}
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '14px 16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                userSelect: 'none'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '6px',
                  flexWrap: 'wrap'
                }}
              >
                <span
                  style={{
                    backgroundColor: getTaskTypeColor(task.type),
                    color: '#ffffff',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.3px'
                  }}
                >
                  {getTaskTypeLabel(task.type)}
                </span>
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#1f2937',
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={task.title}
                >
                  {task.title}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: getStatusColor(task.status),
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: `${getStatusColor(task.status)}15`
                  }}
                >
                  {getTaskStatusLabel(task.status)}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: isExpanded ? '8px' : '2px'
                }}
              >
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                  <span title={formatExactTime(task.createdAt)}>{formatTime(task.createdAt)}</span>
                  {roleText && (
                    <span style={{ color: '#6366f1', fontWeight: 500, marginLeft: '6px' }}>
                      {roleText}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#f97316',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                >
                  <span style={{ fontSize: '11px', opacity: 0.8 }}>+</span>
                  {task.rewardPoints}
                  <span style={{ fontSize: '10px', fontWeight: 500, opacity: 0.7 }}>分</span>
                </div>
              </div>

              {!isExpanded && (
                <div
                  style={{
                    fontSize: '11px',
                    color: '#d1d5db',
                    textAlign: 'center',
                    marginTop: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    transition: 'color 0.2s ease'
                  }}
                  className="timeline-expand-hint"
                >
                  <span>点击节点或卡片查看详情</span>
                  <span style={{ fontSize: '9px' }}>▼</span>
                </div>
              )}

              {isExpanded && (
                <div className="timeline-details">
                  <div
                    style={{
                      marginTop: '12px',
                      paddingTop: '14px',
                      borderTop: '1px dashed #f3f4f6'
                    }}
                  >
                    <div style={{ marginBottom: '14px' }}>
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#9ca3af',
                          marginBottom: '6px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}
                      >
                        任务描述
                      </div>
                      <div
                        style={{
                          fontSize: '13px',
                          color: '#374151',
                          lineHeight: 1.6,
                          padding: '10px 12px',
                          background: '#fafafa',
                          borderRadius: '8px',
                          border: '1px solid #f3f4f6'
                        }}
                      >
                        {task.description || (
                          <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>暂无详细描述</span>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '12px',
                        marginBottom: '14px'
                      }}
                    >
                      {task.expectedTime && (
                        <div
                          style={{
                            padding: '10px 12px',
                            background: '#fffbeb',
                            borderRadius: '8px',
                            border: '1px solid #fef3c7'
                          }}
                        >
                          <div style={{ fontSize: '11px', color: '#92400e', marginBottom: '3px', fontWeight: 600 }}>
                            ⏰ 期望完成时间
                          </div>
                          <div style={{ fontSize: '13px', color: '#78350f', fontWeight: 500 }}>
                            {task.expectedTime}
                          </div>
                        </div>
                      )}

                      {task.completedAt && (
                        <div
                          style={{
                            padding: '10px 12px',
                            background: '#f0fdf4',
                            borderRadius: '8px',
                            border: '1px solid #bbf7d0'
                          }}
                        >
                          <div style={{ fontSize: '11px', color: '#166534', marginBottom: '3px', fontWeight: 600 }}>
                            ✅ 实际完成时间
                          </div>
                          <div style={{ fontSize: '13px', color: '#166534', fontWeight: 500 }}>
                            {formatExactTime(task.completedAt)}
                          </div>
                        </div>
                      )}

                      <div
                        style={{
                          padding: '10px 12px',
                          background: publisher ? '#eff6ff' : '#fef2f2',
                          borderRadius: '8px',
                          border: `1px solid ${publisher ? '#dbeafe' : '#fee2e2'}`
                        }}
                      >
                        <div
                          style={{
                            fontSize: '11px',
                            color: publisher ? '#1e40af' : '#991b1b',
                            marginBottom: '5px',
                            fontWeight: 600
                          }}
                        >
                          👤 发布者
                        </div>
                        {publisher ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <img
                              src={publisher.avatarUrl}
                              alt={publisher.nickname}
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                border: '1px solid #bfdbfe',
                                background: '#ffffff'
                              }}
                            />
                            <div>
                              <div style={{ fontSize: '12px', color: '#1e3a8a', fontWeight: 600 }}>
                                {publisher.nickname}
                              </div>
                              <div style={{ fontSize: '10px', color: '#3b82f6' }}>
                                {publisher.building}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#991b1b' }}>未知</span>
                        )}
                      </div>

                      <div
                        style={{
                          padding: '10px 12px',
                          background: acceptor ? '#f0fdf4' : '#f3f4f6',
                          borderRadius: '8px',
                          border: `1px solid ${acceptor ? '#bbf7d0' : '#e5e7eb'}`
                        }}
                      >
                        <div
                          style={{
                            fontSize: '11px',
                            color: acceptor ? '#166534' : '#6b7280',
                            marginBottom: '5px',
                            fontWeight: 600
                          }}
                        >
                          🤝 接单人
                        </div>
                        {acceptor ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <img
                              src={acceptor.avatarUrl}
                              alt={acceptor.nickname}
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                border: '1px solid #86efac',
                                background: '#ffffff'
                              }}
                            />
                            <div>
                              <div style={{ fontSize: '12px', color: '#166534', fontWeight: 600 }}>
                                {acceptor.nickname}
                              </div>
                              <div style={{ fontSize: '10px', color: '#22c55e' }}>
                                {acceptor.building}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
                            暂未接单
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        background: isPublisher || isAcceptor ? '#ecfdf5' : '#fff7ed',
                        borderRadius: '8px',
                        border: `1px solid ${isPublisher || isAcceptor ? '#a7f3d0' : '#fed7aa'}`
                      }}
                    >
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                        任务ID: <code style={{ fontSize: '10px', color: '#9ca3af' }}>{task.id.slice(0, 8)}...</code>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#92400e' }}>奖励积分</span>
                        <span
                          style={{
                            fontSize: '18px',
                            fontWeight: 800,
                            color: '#f97316',
                            background: '#ffffff',
                            padding: '2px 10px',
                            borderRadius: '8px',
                            border: '1px solid #fed7aa'
                          }}
                        >
                          +{task.rewardPoints}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: '12px',
                      fontSize: '11px',
                      color: '#9ca3af',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <span style={{ fontSize: '9px' }}>▲</span>
                    <span>点击收起详情</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
