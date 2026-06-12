import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Task, Activity } from '../types';
import { activityAPI } from '../services/api';
import { getSocket, joinActivityRoom, leaveActivityRoom } from '../services/socket';
import './ActivityBoard.css';

interface ActivityBoardProps {
  activityId: string;
  currentUser: string;
  onNotification?: (message: string) => void;
}

const ActivityBoard: React.FC<ActivityBoardProps> = ({ activityId, currentUser, onNotification }) => {
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [animatingTasks, setAnimatingTasks] = useState<Set<string>>(new Set());
  const [recentSyncTime, setRecentSyncTime] = useState<number | null>(null);
  const lastSyncRef = useRef<Map<string, number>>(new Map());
  const rafRef = useRef<number | null>(null);

  const fetchActivity = useCallback(async () => {
    const startTime = performance.now();
    try {
      const data = await activityAPI.getById(activityId);
      setActivity(data);
    } catch (error) {
      console.error('Failed to fetch activity:', error);
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  const triggerTaskAnimation = useCallback((taskId: string) => {
    setAnimatingTasks((prev) => new Set(prev).add(taskId));
    setTimeout(() => {
      setAnimatingTasks((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }, 300);
  }, []);

  const throttledNotification = useCallback((message: string) => {
    if (!onNotification) return;
    const now = Date.now();
    const lastMessage = lastSyncRef.current.get(message);
    if (lastMessage && now - lastMessage < 500) return;
    lastSyncRef.current.set(message, now);
    onNotification(message);
  }, [onNotification]);

  useEffect(() => {
    fetchActivity();
    joinActivityRoom(activityId);

    const socket = getSocket();

    const handleTaskUpdate = (data: any) => {
      const syncStart = performance.now();

      setActivity((prev) => {
        if (!prev) return prev;
        const updatedTasks = prev.tasks.map((task) => {
          if (task.id === data.taskId) {
            const prevStatus = task.status;
            const newTask = { ...task, ...data.task };
            
            if (prevStatus !== data.newStatus && onNotification) {
              const taskName = data.task?.name || task.name;
              const assignee = data.task?.assignee || task.assignee || '某人';
              
              setTimeout(() => {
                if (data.newStatus === 'in-progress' && prevStatus !== 'in-progress') {
                  throttledNotification(`🎬 ${assignee} 开始了「${taskName}」`);
                } else if (data.newStatus === 'completed' && prevStatus !== 'completed') {
                  throttledNotification(`✅ ${assignee} 完成了「${taskName}」`);
                } else if (data.newStatus === 'pending' && prevStatus !== 'pending') {
                  throttledNotification(`📋「${taskName}」已重置为待处理`);
                }
              }, 0);
            }
            return newTask;
          }
          return task;
        });
        
        const participants = data.participants || prev.participants;
        return { ...prev, tasks: updatedTasks, participants };
      });

      triggerTaskAnimation(data.taskId);
      
      const latency = performance.now() - syncStart;
      setRecentSyncTime(Math.round(latency));
    };

    const handleParticipantJoined = (data: any) => {
      if (data.participant !== currentUser) {
        throttledNotification(`👋 ${data.participant} 加入了活动`);
      }
      setActivity((prev) => {
        if (!prev) return prev;
        return { ...prev, participants: data.participants || prev.participants };
      });
    };

    socket.on('task-update', handleTaskUpdate);
    socket.on('participant-joined', handleParticipantJoined);

    return () => {
      leaveActivityRoom(activityId);
      socket.off('task-update', handleTaskUpdate);
      socket.off('participant-joined', handleParticipantJoined);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [activityId, currentUser, fetchActivity, triggerTaskAnimation, throttledNotification]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !activity) return;

    const { draggableId, source, destination } = result;
    if (source.droppableId === destination.droppableId) return;

    const task = activity.tasks.find((t) => t.id === draggableId);
    if (!task) return;

    let newStatus: Task['status'];
    if (destination.droppableId === 'pending') {
      newStatus = 'pending';
    } else if (destination.droppableId === 'in-progress') {
      newStatus = 'in-progress';
    } else {
      newStatus = 'completed';
    }

    if (!task.assignee && newStatus !== 'pending') {
      const updatedTasks = activity.tasks.map((t) => {
        if (t.id === draggableId) {
          return { ...t, status: newStatus, assignee: currentUser };
        }
        return t;
      });
      setActivity({ ...activity, tasks: updatedTasks });

      try {
        await activityAPI.updateTask(activityId, draggableId, {
          status: newStatus,
          assignee: currentUser
        });
      } catch (error) {
        console.error('Failed to update task:', error);
        fetchActivity();
      }
    } else {
      const updatedTasks = activity.tasks.map((t) => {
        if (t.id === draggableId) {
          return { ...t, status: newStatus };
        }
        return t;
      });
      setActivity({ ...activity, tasks: updatedTasks });

      try {
        await activityAPI.updateTask(activityId, draggableId, { status: newStatus });
      } catch (error) {
        console.error('Failed to update task status:', error);
        fetchActivity();
      }
    }

    triggerTaskAnimation(draggableId);
  };

  const handleClaimTask = async (taskId: string) => {
    if (!activity) return;

    const task = activity.tasks.find((t) => t.id === taskId);
    if (task?.assignee) return;

    try {
      const updated = await activityAPI.claimTask(activityId, taskId, currentUser);
      setActivity(updated);
      throttledNotification(`🎯 你已领取「${task?.name || '任务'}」`);
      triggerTaskAnimation(taskId);
    } catch (error) {
      console.error('Failed to claim task:', error);
    }
  };

  const getTasksByStatus = (status: Task['status']) => {
    return activity?.tasks.filter((t) => t.status === status) || [];
  };

  const getColumnTitle = (status: string) => {
    switch (status) {
      case 'pending': return '待处理';
      case 'in-progress': return '进行中';
      case 'completed': return '已完成';
      default: return status;
    }
  };

  const getColumnColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FF9800';
      case 'in-progress': return '#4CAF50';
      case 'completed': return '#2196F3';
      default: return '#999';
    }
  };

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return '待定';
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="board-loading">
        <div className="loading-spinner"></div>
        <p>正在加载活动数据...</p>
      </div>
    );
  }

  if (!activity) {
    return <div className="board-error">😕 活动不存在或已结束</div>;
  }

  const columns = ['pending', 'in-progress', 'completed'] as const;

  return (
    <div className="activity-board">
      <div className="board-header">
        <div className="board-title-section">
          <h2>{activity.name}</h2>
          <div className="board-meta">
            <span className="meta-tag host-tag">
              👑 主持人: {activity.host}
            </span>
            <span className="meta-tag time-tag">
              ⏰ {formatTime(activity.startTime)}
            </span>
            {recentSyncTime !== null && (
              <span className="meta-tag sync-tag">
                ⚡ {recentSyncTime}ms
              </span>
            )}
          </div>
        </div>
        <div className="board-participants">
          <div className="participant-avatars">
            {activity.participants.slice(0, 5).map((p, i) => (
              <div
                key={i}
                className="mini-avatar"
                style={{
                  background: `hsl(${(i * 60 + 20) % 360}, 70%, 60%)`,
                  zIndex: 10 - i,
                  marginLeft: i > 0 ? '-10px' : '0'
                }}
                title={p}
              >
                {p.charAt(0).toUpperCase()}
              </div>
            ))}
            {activity.participants.length > 5 && (
              <div className="mini-avatar more-avatar" style={{ marginLeft: '-10px' }}>
                +{activity.participants.length - 5}
              </div>
            )}
          </div>
          <span className="participant-count-text">
            {activity.participants.length}/{activity.maxParticipants}人
          </span>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="board-columns">
          {columns.map((status) => {
            const columnTasks = getTasksByStatus(status);
            return (
              <div key={status} className="board-column" data-status={status}>
                <div
                  className="column-header"
                  style={{ borderLeftColor: getColumnColor(status) }}
                >
                  <div className="column-title-wrap">
                    <div
                      className="column-dot"
                      style={{ background: getColumnColor(status) }}
                    />
                    <h3>{getColumnTitle(status)}</h3>
                  </div>
                  <span
                    className="task-count"
                    style={{ background: `${getColumnColor(status)}20`, color: getColumnColor(status) }}
                  >
                    {columnTasks.length}
                  </span>
                </div>

                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`task-list ${
                        snapshot.isDraggingOver ? 'dragging-over' : ''
                      }`}
                      style={{
                        boxShadow: snapshot.isDraggingOver
                          ? `inset 0 0 0 2px ${getColumnColor(status)}50`
                          : 'none'
                      }}
                    >
                      {columnTasks.map((task, index) => (
                        <Draggable
                          key={task.id}
                          draggableId={task.id}
                          index={index}
                        >
                          {(provided, snapshot) => {
                            const isAnimating = animatingTasks.has(task.id);
                            const isInProgress = task.status === 'in-progress';
                            
                            return (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`task-card
                                  ${snapshot.isDragging ? 'dragging' : ''}
                                  ${isAnimating ? 'move-animating' : ''}
                                  ${isInProgress ? 'in-progress-card' : ''}
                                  ${task.status === 'completed' ? 'completed-card' : ''}
                                `}
                                style={{
                                  ...provided.draggableProps.style,
                                  transition: snapshot.isDragging
                                    ? 'none'
                                    : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                  willChange: isAnimating ? 'transform, opacity' : 'auto'
                                }}
                              >
                                <div className="task-card-inner">
                                  <div className="task-drag-handle">⋮⋮</div>
                                  <div className="task-main-content">
                                    <div className="task-name">{task.name}</div>
                                    
                                    <div className="task-footer">
                                      {task.assignee ? (
                                        <div className="task-assignee">
                                          <div
                                            className="assignee-avatar-sm"
                                            style={{
                                              background: `linear-gradient(135deg, var(--primary-color), var(--secondary-color))`
                                            }}
                                          >
                                            {task.assignee.charAt(0).toUpperCase()}
                                          </div>
                                          <span className="assignee-name-sm">
                                            {task.assignee}
                                          </span>
                                        </div>
                                      ) : (
                                        <button
                                          className="claim-btn"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleClaimTask(task.id);
                                          }}
                                        >
                                          <span>🙋</span> 领取
                                        </button>
                                      )}
                                      
                                      {task.status === 'completed' && (
                                        <span className="completed-badge">
                                          ✓ 完成
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {isInProgress && (
                                  <div className="pulse-border-indicator" />
                                )}
                              </div>
                            );
                          }}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {columnTasks.length === 0 && (
                        <div className="empty-column-hint">
                          {status === 'pending' && '拖拽任务到这里'}
                          {status === 'in-progress' && '放下任务开始进行'}
                          {status === 'completed' && '完成的任务放这里'}
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
};

export default ActivityBoard;
