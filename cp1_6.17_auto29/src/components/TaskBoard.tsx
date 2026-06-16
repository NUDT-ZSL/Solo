import React from 'react';
import { CareTask, getWeekDates } from '../TaskService';

interface TaskBoardProps {
  tasks: CareTask[];
  onToggleTask: (taskId: string) => void;
}

const DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const TASK_TYPE_ICON: Record<string, string> = {
  '浇水': '💧',
  '施肥': '🌱',
  '修剪': '✂️',
  '转盆': '🔄',
};

const TaskBoard: React.FC<TaskBoardProps> = ({ tasks, onToggleTask }) => {
  const today = new Date();
  const weekDates = getWeekDates(today);
  const todayStr = today.toISOString().slice(0, 10);

  const tasksByDate: Record<string, CareTask[]> = {};
  for (const date of weekDates) {
    tasksByDate[date] = [];
  }
  for (const task of tasks) {
    if (tasksByDate[task.date]) {
      tasksByDate[task.date].push(task);
    }
  }

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 8,
          marginBottom: 16,
        }}
      >
        {DAY_NAMES.map((name) => (
          <div
            key={name}
            style={{
              textAlign: 'center',
              fontSize: 13,
              fontWeight: 600,
              color: '#7B8B6F',
              padding: '8px 0',
            }}
          >
            {name}
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 8,
        }}
      >
        {weekDates.map((date) => {
          const dayTasks = tasksByDate[date] || [];
          const isToday = date === todayStr;

          return (
            <div
              key={date}
              style={{
                minHeight: 120,
                background: isToday ? '#F1F8E9' : '#FAFAFA',
                borderRadius: 8,
                padding: 8,
                border: isToday ? '2px solid #4CAF50' : '1px solid #E8E8E8',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: isToday ? '#4CAF50' : '#AAA',
                  fontWeight: isToday ? 700 : 400,
                  marginBottom: 6,
                  textAlign: 'center',
                }}
              >
                {date.slice(5)}
              </div>

              {dayTasks.length === 0 && (
                <div style={{ fontSize: 11, color: '#CCC', textAlign: 'center', marginTop: 20 }}>
                  无任务
                </div>
              )}

              {dayTasks.map((task) => {
                const lightBg = task.color + '15';
                return (
                <div
                  key={task.id}
                  onClick={() => onToggleTask(task.id)}
                  className={`task-card ${task.completed ? 'task-completed' : ''}`}
                  style={{
                    background: lightBg,
                    borderRadius: 6,
                    padding: '6px 8px',
                    marginBottom: 4,
                    borderLeft: `3px solid ${task.color}`,
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'background 0.3s ease',
                  }}
                >
                  <div
                    className="strikethrough"
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: 8,
                      right: 8,
                      height: 2,
                      background: task.color,
                      transform: task.completed
                        ? 'scaleX(1)'
                        : 'scaleX(0)',
                      transformOrigin: 'left',
                      transition: 'transform 0.3s ease',
                    }}
                  />
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#333', position: 'relative' }}>
                    {TASK_TYPE_ICON[task.taskType]} {task.plantName}
                  </div>
                  <div style={{ fontSize: 10, color: '#999', marginTop: 2, position: 'relative' }}>
                    {task.taskType}
                    {!task.completed && isToday && (
                      <span
                        style={{
                          display: 'inline-block',
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          background: task.color,
                          marginLeft: 4,
                          animation: 'blink 1.5s infinite',
                        }}
                      />
                    )}
                  </div>
                </div>
              );
              })}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
        @keyframes strikeThrough {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        .task-completed .strikethrough {
          animation: strikeThrough 0.3s ease forwards;
          transform-origin: left;
        }
        .task-completed {
          opacity: 0.6;
        }
        @media (max-width: 768px) {
          .task-grid-responsive {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default TaskBoard;
