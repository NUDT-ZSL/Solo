import React, { useState, useEffect, useCallback } from 'react';
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
  const [animatingTaskId, setAnimatingTaskId] = useState<string | null>(null);

  const fetchActivity = useCallback(async () => {
    try {
      const data = await activityAPI.getById(activityId);
      setActivity(data);
    } catch (error) {
      console.error('Failed to fetch activity:', error);
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  useEffect(() => {
    fetchActivity();
    joinActivityRoom(activityId);

    const socket = getSocket();

    const handleTaskUpdate = (data: any) => {
      setActivity((prev) => {
        if (!prev) return prev;
        const updatedTasks = prev.tasks.map((task) => {
          if (task.id === data.taskId) {
            return { ...task, ...data.task };
          }
          return task;
        });
        return { ...prev, tasks: updatedTasks };
      });

      setAnimatingTaskId(data.taskId);
      setTimeout(() => setAnimatingTaskId(null), 300);

      if (onNotification && data.task?.assignee) {
        const taskName = data.task?.name || '任务';
        const assignee = data.task?.assignee || '';
        if (data.newStatus === 'in-progress') {
          onNotification(`${assignee} 开始了 ${taskName}`);
        } else if (data.newStatus === 'completed') {
          onNotification(`${assignee} 完成了 ${taskName}`);
        } else if (data.newStatus === 'pending') {
          onNotification(`${taskName} 已重置为待处理`);
        }
      }
    };

    socket.on('task-update', handleTaskUpdate);
    socket.on('participant-joined', (data: any) => {
      if (data.participant !== currentUser && onNotification) {
        onNotification(`${data.participant} 加入了活动`);
      }
    });

    return () => {
      leaveActivityRoom(activityId);
      socket.off('task-update', handleTaskUpdate);
    };
  }, [activityId, currentUser, fetchActivity, onNotification]);

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
  };

  const handleClaimTask = async (taskId: string) => {
    if (!activity) return;

    try {
      const updated = await activityAPI.claimTask(activityId, taskId, currentUser);
      setActivity(updated);
    } catch (error) {
      console.error('Failed to claim task:', error);
    }
  };

  const getTasksByStatus = (status: Task['status']) => {
    return activity?.tasks.filter((t) => t.status === status) || [];
  };

  const getColumnTitle = (status: string) => {
    switch (status) {
      case 'pending':
        return '待处理';
      case 'in-progress':
        return '进行中';
      case 'completed':
        return '已完成';
      default:
        return status;
    }
  };

  const getColumnColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FF9800';
      case 'in-progress':
        return '#4CAF50';
      case 'completed':
        return '#2196F3';
      default:
        return '#999';
    }
  };

  if (loading) {
    return (
      <div className="board-loading">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  if (!activity) {
    return <div className="board-error">活动不存在</div>;
  }

  return (
    <div className="activity-board">
      <div className="board-header">
        <h2>{activity.name}</h2>
        <div className="board-info">
          <span className="participant-count">
            👥 {activity.participants.length}/{activity.maxParticipants} 人
          </span>
          <span className="host-info">主持人: {activity.host}</span>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="board-columns">
          {(['pending', 'in-progress', 'completed'] as const).map((status) => (
            <div key={status} className="board-column">
              <div
                className="column-header"
                style={{ borderLeftColor: getColumnColor(status) }}
              >
                <h3>{getColumnTitle(status)}</h3>
                <span className="task-count">
                  {getTasksByStatus(status).length}
                </span>
              </div>

              <Droppable droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`task-list ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                  >
                    {getTasksByStatus(status).map((task, index) => (
                      <Draggable
                        key={task.id}
                        draggableId={task.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`task-card ${
                              snapshot.isDragging ? 'dragging' : ''
                            } ${
                              animatingTaskId === task.id ? 'animating' : ''
                            } ${
                              status === 'in-progress' ? 'in-progress-task' : ''
                            }`}
                          >
                            <div className="task-name">{task.name}</div>
                            
                            {task.assignee ? (
                              <div className="task-assignee">
                                <div className="assignee-avatar">
                                  {task.assignee.charAt(0).toUpperCase()}
                                </div>
                                <span className="assignee-name">
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
                                领取任务
                              </button>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default ActivityBoard;
