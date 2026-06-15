import React, { useState, memo } from 'react';
import { useAppContext, ConfirmDialog } from '../App';
import type { Task, Member, Difficulty } from '../api/taskApi';

const DIFFICULTY_CONFIG: Record<Difficulty, { color: string; label: string }> = {
  easy: { color: '#4caf50', label: '简单' },
  medium: { color: '#ff9800', label: '中等' },
  hard: { color: '#f44336', label: '困难' },
};

interface TaskCardProps {
  task: Task;
  claimer?: Member;
  isCurrentUser: boolean;
  onClaim: () => void;
  onComplete: () => void;
  canClaim: boolean;
}

const TaskCard: React.FC<TaskCardProps> = memo(function TaskCard({
  task,
  claimer,
  isCurrentUser,
  onClaim,
  onComplete,
  canClaim,
}) {
  const config = DIFFICULTY_CONFIG[task.difficulty];

  return (
    <div className={`task-card ${task.difficulty} ${task.completed ? 'completed' : ''}`}>
      <div className="task-info">
        <div className="task-title">
          {task.title}
          {task.completed && (
            <span style={{ marginLeft: 8, color: '#4caf50' }}>✓ 已完成</span>
          )}
        </div>
        <div className="task-desc">{task.description}</div>
      </div>
      <div className="task-meta">
        <span
          className={`task-difficulty-tag ${task.difficulty}`}
          style={{ backgroundColor: config.color }}
        >
          {config.label}
        </span>
        <span className="task-points">+{task.points}分</span>
        {task.claimed_by && !task.completed && claimer && (
          <div className="task-claimer">
            <div className="task-claimer-avatar">{claimer.avatar}</div>
            <span>{claimer.name}</span>
          </div>
        )}
        {!task.completed && (
          <div className="task-actions">
            {!task.claimed_by && (
              <button
                className="btn btn-claim"
                onClick={onClaim}
                disabled={!canClaim}
              >
                认领
              </button>
            )}
            {task.claimed_by && isCurrentUser && (
              <button className="btn btn-complete" onClick={onComplete}>
                完成
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

const TaskList: React.FC = memo(function TaskList() {
  const {
    tasks,
    members,
    currentMemberId,
    claimTask,
    completeTask,
    showToast,
  } = useAppContext();

  const [dialog, setDialog] = useState<{
    open: boolean;
    taskId: string | null;
    title: string;
    content: string;
    isComplete: boolean;
  }>({ open: false, taskId: null, title: '', content: '', isComplete: false });

  const memberMap = new Map(members.map(m => [m.id, m]));

  const handleClaimClick = (taskId: string) => {
    if (!currentMemberId) {
      showToast('请先在上方选择一名成员', 'error');
      return;
    }
    const member = memberMap.get(currentMemberId);
    setDialog({
      open: true,
      taskId,
      title: '确认认领任务',
      content: `确定要由「${member?.name ?? '当前成员'}」认领此任务吗？`,
      isComplete: false,
    });
  };

  const handleCompleteClick = (task: Task) => {
    const claimer = task.claimed_by ? memberMap.get(task.claimed_by) : undefined;
    setDialog({
      open: true,
      taskId: task.id,
      title: '确认完成任务',
      content: `确定「${claimer?.name ?? '成员'}」已完成此任务？将获得 ${task.points} 积分。`,
      isComplete: true,
    });
  };

  const handleConfirm = async () => {
    const taskId = dialog.taskId;
    if (!taskId) return;
    try {
      if (dialog.isComplete) {
        await completeTask(taskId);
      } else {
        await claimTask(taskId);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : '操作失败', 'error');
    }
    setDialog({ open: false, taskId: null, title: '', content: '', isComplete: false });
  };

  const pendingTasks = tasks.filter(t => !t.claimed_by && !t.completed);
  const claimedTasks = tasks.filter(t => t.claimed_by && !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <div className="tasks-section">
      <h2 className="section-title">📋 任务列表</h2>
      {tasks.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">📝</div>
          <div className="empty-state-text">暂无任务</div>
        </div>
      ) : (
        <div className="tasks-list">
          {pendingTasks.length > 0 && (
            <>
              <div className="task-group-title">待认领 ({pendingTasks.length})</div>
              {pendingTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isCurrentUser={false}
                  onClaim={() => handleClaimClick(task.id)}
                  onComplete={() => {}}
                  canClaim={!!currentMemberId}
                />
              ))}
            </>
          )}
          {claimedTasks.length > 0 && (
            <>
              <div className="task-group-title">已认领 ({claimedTasks.length})</div>
              {claimedTasks.map(task => {
                const claimer = task.claimed_by ? memberMap.get(task.claimed_by) : undefined;
                return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    claimer={claimer}
                    isCurrentUser={task.claimed_by === currentMemberId}
                    onClaim={() => {}}
                    onComplete={() => handleCompleteClick(task)}
                    canClaim={!!currentMemberId}
                  />
                );
              })}
            </>
          )}
          {completedTasks.length > 0 && (
            <>
              <div className="task-group-title">已完成 ({completedTasks.length})</div>
              {completedTasks.map(task => {
                const claimer = task.claimed_by ? memberMap.get(task.claimed_by) : undefined;
                return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    claimer={claimer}
                    isCurrentUser={task.claimed_by === currentMemberId}
                    onClaim={() => {}}
                    onComplete={() => {}}
                    canClaim={false}
                  />
                );
              })}
            </>
          )}
        </div>
      )}

      <ConfirmDialog
        open={dialog.open}
        title={dialog.title}
        content={dialog.content}
        confirmText={dialog.isComplete ? '确认完成' : '确认认领'}
        cancelText="取消"
        confirmBtnClass={dialog.isComplete ? 'btn-complete' : 'btn-claim'}
        onConfirm={handleConfirm}
        onCancel={() =>
          setDialog({ open: false, taskId: null, title: '', content: '', isComplete: false })
        }
      />
    </div>
  );
});

export default TaskList;
