import React, { useMemo, useState } from 'react';
import { Card, List as ListType, Member, Project } from '../types';

interface GanttViewProps {
  projects: Project[];
  cards: Card[];
  lists: ListType[];
  members: Member[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;
}

const GanttView: React.FC<GanttViewProps> = ({
  projects,
  cards,
  lists,
  members,
  selectedProjectId,
  onSelectProject,
}) => {
  const [viewRange, setViewRange] = useState<number>(14);

  const filteredCards = useMemo(() => {
    if (!selectedProjectId) return cards;
    const projectLists = lists.filter((l) => l.projectId === selectedProjectId).map((l) => l.id);
    return cards.filter((c) => projectLists.includes(c.listId));
  }, [cards, lists, selectedProjectId]);

  const tasks = useMemo(() => {
    return filteredCards
      .filter((card) => card.dueDate)
      .map((card) => {
        const startDate = card.createdAt ? new Date(card.createdAt) : new Date();
        const endDate = card.dueDate ? new Date(card.dueDate) : new Date();
        const list = lists.find((l) => l.id === card.listId);
        return {
          ...card,
          startDate,
          endDate,
          listName: list?.title || '',
        };
      })
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [filteredCards, lists]);

  const { startDate, endDate, dateLabels, dayWidth } = useMemo(() => {
    if (tasks.length === 0) {
      const today = new Date();
      const start = new Date(today);
      start.setDate(start.getDate() - 3);
      const end = new Date(today);
      end.setDate(end.getDate() + viewRange);
      
      const labels: string[] = [];
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      for (let i = 0; i <= days; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
      }
      
      return {
        startDate: start,
        endDate: end,
        dateLabels: labels,
        dayWidth: 60,
      };
    }

    let minDate = new Date(Math.min(...tasks.map((t) => t.startDate.getTime())));
    let maxDate = new Date(Math.max(...tasks.map((t) => t.endDate.getTime())));

    minDate.setDate(minDate.getDate() - 3);
    maxDate.setDate(maxDate.getDate() + 3);

    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    const labels: string[] = [];
    for (let i = 0; i <= totalDays; i++) {
      const d = new Date(minDate);
      d.setDate(d.getDate() + i);
      labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
    }

    const width = Math.min(80, Math.max(40, 800 / totalDays));

    return {
      startDate: minDate,
      endDate: maxDate,
      dateLabels: labels,
      dayWidth: width,
    };
  }, [tasks, viewRange]);

  const getTaskPosition = (task: { startDate: Date; endDate: Date }) => {
    const startOffset = (task.startDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const duration = Math.max(1, (task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      left: startOffset * dayWidth,
      width: duration * dayWidth,
    };
  };

  const todayOffset = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const offset = (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    return offset * dayWidth;
  }, [startDate, dayWidth]);

  const getMemberName = (email: string | null) => {
    if (!email) return '未分配';
    const member = members.find((m) => m.email === email);
    return member ? member.name : email;
  };

  const getStatusColor = (card: Card) => {
    const list = lists.find((l) => l.id === card.listId);
    if (list?.title === '完成') return '#27ae60';
    if (list?.title === '进行中') return '#3498db';
    return '#95a5a6';
  };

  const isOverdue = (card: Card) => {
    if (!card.dueDate || card.completedAt) return false;
    const due = new Date(card.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  const totalWidth = dateLabels.length * dayWidth;

  return (
    <div className="gantt-view fade-in">
      <div className="gantt-header">
        <div className="gantt-controls">
          <div className="project-filter">
            <label>项目筛选：</label>
            <select
              value={selectedProjectId || ''}
              onChange={(e) => e.target.value && onSelectProject(e.target.value)}
              className="filter-select"
            >
              <option value="">全部项目</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="view-range-control">
            <label>时间范围：</label>
            <select
              value={viewRange}
              onChange={(e) => setViewRange(Number(e.target.value))}
              className="filter-select"
            >
              <option value={7}>7 天</option>
              <option value={14}>14 天</option>
              <option value={30}>30 天</option>
              <option value={60}>60 天</option>
            </select>
          </div>
        </div>
      </div>

      <div className="gantt-container">
        <div className="gantt-sidebar">
          <div className="gantt-sidebar-header">任务名称</div>
          <div className="gantt-sidebar-body">
            {tasks.length === 0 ? (
              <div className="empty-state">暂无任务数据</div>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className="gantt-task-row">
                  <div className="task-name" title={task.title}>
                    {task.title}
                  </div>
                  <div className="task-assignee">
                    <span className="task-avatar">
                      {getMemberName(task.assignee).charAt(0).toUpperCase()}
                    </span>
                    <span className="task-assignee-name">
                      {getMemberName(task.assignee)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="gantt-chart-wrapper">
          <div className="gantt-chart" style={{ width: totalWidth }}>
            <div className="gantt-timeline">
              {dateLabels.map((label, index) => (
                <div
                  key={index}
                  className="gantt-timeline-label"
                  style={{ width: dayWidth }}
                >
                  {label}
                </div>
              ))}
            </div>

            <div className="gantt-grid">
              {dateLabels.map((_, index) => (
                <div
                  key={index}
                  className="gantt-grid-line"
                  style={{ left: index * dayWidth, width: dayWidth }}
                />
              ))}
            </div>

            <div
              className="gantt-today-line"
              style={{ left: todayOffset }}
            />

            <div className="gantt-tasks">
              {tasks.map((task, index) => {
                const position = getTaskPosition(task);
                return (
                  <div
                    key={task.id}
                    className="gantt-task-bar"
                    style={{
                      top: index * 56 + 16,
                      left: position.left,
                      width: position.width,
                      backgroundColor: getStatusColor(task),
                      opacity: isOverdue(task) ? 0.7 : 1,
                    }}
                    title={`${task.title}\n负责人: ${getMemberName(task.assignee)}\n开始: ${task.startDate.toLocaleDateString()}\n截止: ${task.endDate.toLocaleDateString()}`}
                  >
                    <span className="task-bar-label">
                      {task.title.length > 10 ? task.title.slice(0, 10) + '...' : task.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="gantt-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#27ae60' }} />
          <span>已完成</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#3498db' }} />
          <span>进行中</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#95a5a6' }} />
          <span>待办</span>
        </div>
        <div className="legend-item">
          <span className="legend-line" style={{ borderColor: '#e74c3c' }} />
          <span>今天</span>
        </div>
      </div>

      <style>{`
        .gantt-view {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 24px;
          overflow: hidden;
        }

        .gantt-header {
          margin-bottom: 20px;
        }

        .gantt-controls {
          display: flex;
          gap: 24px;
          align-items: center;
          flex-wrap: wrap;
        }

        .project-filter,
        .view-range-control {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .project-filter label,
        .view-range-control label {
          font-size: 14px;
          color: var(--text-secondary);
        }

        .filter-select {
          padding: 8px 12px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          font-size: 14px;
          background: var(--bg-color);
          color: var(--text-primary);
          cursor: pointer;
          transition: var(--transition);
        }

        .filter-select:hover,
        .filter-select:focus {
          outline: none;
          border-color: var(--accent-color);
        }

        .gantt-container {
          flex: 1;
          display: flex;
          background: var(--bg-color);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          overflow: hidden;
        }

        .gantt-sidebar {
          width: 240px;
          flex-shrink: 0;
          border-right: 1px solid var(--border-color);
        }

        .gantt-sidebar-header {
          height: 40px;
          padding: 0 16px;
          display: flex;
          align-items: center;
          font-size: 14px;
          font-weight: 600;
          color: var(--primary-color);
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
        }

        .gantt-sidebar-body {
          overflow-y: auto;
          max-height: calc(100vh - 280px);
        }

        .gantt-task-row {
          height: 56px;
          padding: 0 16px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 4px;
          border-bottom: 1px solid var(--bg-secondary);
          transition: background 0.2s;
        }

        .gantt-task-row:hover {
          background: var(--bg-secondary);
        }

        .task-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--primary-color);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .task-assignee {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .task-avatar {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--accent-color);
          color: white;
          font-size: 10px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .task-assignee-name {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .gantt-chart-wrapper {
          flex: 1;
          overflow-x: auto;
          position: relative;
        }

        .gantt-chart {
          position: relative;
          min-height: 100%;
        }

        .gantt-timeline {
          display: flex;
          height: 40px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .gantt-timeline-label {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: var(--text-secondary);
          border-right: 1px solid var(--border-color);
        }

        .gantt-grid {
          position: absolute;
          top: 40px;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
        }

        .gantt-grid-line {
          position: absolute;
          top: 0;
          bottom: 0;
          border-right: 1px solid #f0f0f0;
        }

        .gantt-today-line {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 2px;
          background: #e74c3c;
          z-index: 5;
          pointer-events: none;
        }

        .gantt-today-line::after {
          content: '今天';
          position: absolute;
          top: 8px;
          left: 50%;
          transform: translateX(-50%);
          background: #e74c3c;
          color: white;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 3px;
          white-space: nowrap;
        }

        .gantt-tasks {
          position: relative;
          padding: 8px 0;
        }

        .gantt-task-bar {
          position: absolute;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          padding: 0 10px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .gantt-task-bar:hover {
          transform: scaleY(1.1);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }

        .task-bar-label {
          font-size: 12px;
          color: white;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .gantt-legend {
          display: flex;
          gap: 24px;
          margin-top: 16px;
          padding: 0 8px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--text-secondary);
        }

        .legend-color {
          width: 16px;
          height: 16px;
          border-radius: 4px;
        }

        .legend-line {
          width: 16px;
          height: 0;
          border-top: 2px dashed #e74c3c;
        }

        .empty-state {
          padding: 40px 20px;
          text-align: center;
          color: var(--text-light);
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};

export default GanttView;
