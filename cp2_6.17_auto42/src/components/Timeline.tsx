import { useState } from 'react';
import type { Task } from '../data/db';
import {
  getTaskTypeLabel,
  getTaskTypeColor,
  getTaskStatusLabel,
  formatExactTime,
  getStatusColor
} from '../utils/helpers';

interface TimelineProps {
  tasks: Task[];
  users?: { id: string; nickname: string; avatarUrl: string; building: string }[];
  currentUserId?: string;
}

export function Timeline({ tasks, users = [], currentUserId }: TimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sortedTasks = [...tasks].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

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
          暂无任务记录
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
          <div key={task.id} style={{ position: 'relative', marginBottom: '20px' }}>
            <div
              onClick={() => setExpandedId(isExpanded ? null : task.id)}
              style={{ cursor: 'pointer' }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '-27px',
                  top: '6px',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: getStatusColor(task.status),
                  border: '2px solid #ffffff',
                  boxShadow: '0 0 0 2px #e5e7eb',
                  zIndex: 1
                }}
              />

              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  transition: 'box-shadow 0.2s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span
                    style={{
                      backgroundColor: getTaskTypeColor(task.type),
                      color: '#ffffff',
                      padding: '2px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600
                    }}
                  >
                    {getTaskTypeLabel(task.type)}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937', flex: 1 }}>
                    {task.title}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: getStatusColor(task.status)
                    }}
                  >
                    {getTaskStatusLabel(task.status)}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '2px' }}>
                  {formatExactTime(task.createdAt)} {roleText}
                </div>

                {isExpanded && (
                  <div
                    style={{
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: '1px solid #f3f4f6',
                      animation: 'fadeIn 0.2s ease'
                    }}
                  >
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                        任务描述
                      </div>
                      <div style={{ fontSize: '13px', color: '#374151' }}>
                        {task.description || '暂无描述'}
                      </div>
                    </div>

                    {task.expectedTime && (
                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                          期望完成时间
                        </div>
                        <div style={{ fontSize: '13px', color: '#374151' }}>
                          {task.expectedTime}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                          发布者
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {publisher && (
                            <img
                              src={publisher.avatarUrl}
                              alt={publisher.nickname}
                              style={{ width: '20px', height: '20px', borderRadius: '50%', border: '1px solid #e5e7eb' }}
                            />
                          )}
                          <span style={{ fontSize: '12px', color: '#374151' }}>
                            {publisher ? `${publisher.nickname} (${publisher.building})` : '未知'}
                          </span>
                        </div>
                      </div>

                      {acceptor && (
                        <div>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                            接单人
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <img
                              src={acceptor.avatarUrl}
                              alt={acceptor.nickname}
                              style={{ width: '20px', height: '20px', borderRadius: '50%', border: '1px solid #e5e7eb' }}
                            />
                            <span style={{ fontSize: '12px', color: '#374151' }}>
                              {acceptor.nickname} ({acceptor.building})
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                        {task.completedAt && `完成时间：${formatExactTime(task.completedAt)}`}
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#f97316' }}>
                        奖励 +{task.rewardPoints} 分
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ marginTop: '6px', fontSize: '11px', color: '#d1d5db', textAlign: 'center' }}>
                  {isExpanded ? '▲ 点击收起' : '▼ 点击展开详情'}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
