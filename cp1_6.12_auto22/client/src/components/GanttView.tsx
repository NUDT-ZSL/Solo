import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Card, List as ListType, Member, Project } from '../types';

interface GanttViewProps {
  projects: Project[];
  cards: Card[];
  lists: ListType[];
  members: Member[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;
}

interface GanttTask {
  card: Card;
  startDate: Date;
  endDate: Date;
  listName: string;
}

const GanttView: React.FC<GanttViewProps> = ({
  projects,
  cards,
  lists,
  members,
  selectedProjectId,
  onSelectProject,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewRange, setViewRange] = useState<number>(30);
  const [hoveredTask, setHoveredTask] = useState<GanttTask | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const filteredCards = useMemo(() => {
    if (!selectedProjectId) return cards;
    const projectLists = lists.filter((l) => l.projectId === selectedProjectId).map((l) => l.id);
    return cards.filter((c) => projectLists.includes(c.listId));
  }, [cards, lists, selectedProjectId]);

  const tasks: GanttTask[] = useMemo(() => {
    return filteredCards
      .filter((card) => card.dueDate)
      .map((card) => {
        const startDate = card.createdAt ? new Date(card.createdAt) : new Date();
        startDate.setHours(0, 0, 0, 0);
        const endDate = card.dueDate ? new Date(card.dueDate) : new Date();
        endDate.setHours(0, 0, 0, 0);
        if (endDate < startDate) {
          const temp = new Date(startDate);
          startDate.setTime(endDate.getTime());
          endDate.setTime(temp.getTime());
        }
        const list = lists.find((l) => l.id === card.listId);
        return {
          card,
          startDate,
          endDate,
          listName: list?.title || '',
        };
      })
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [filteredCards, lists]);

  const dateRange = useMemo(() => {
    if (tasks.length === 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(today);
      start.setDate(start.getDate() - 3);
      const end = new Date(today);
      end.setDate(end.getDate() + viewRange);
      return { start, end };
    }

    let minDate = new Date(Math.min(...tasks.map((t) => t.startDate.getTime())));
    let maxDate = new Date(Math.max(...tasks.map((t) => t.endDate.getTime())));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    minDate = new Date(Math.min(minDate.getTime(), today.getTime()));
    maxDate = new Date(Math.max(maxDate.getTime(), today.getTime()));

    minDate.setDate(minDate.getDate() - 3);
    maxDate.setDate(maxDate.getDate() + 3);

    const totalDays = Math.ceil(
      (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (totalDays < viewRange) {
      const diff = viewRange - totalDays;
      maxDate.setDate(maxDate.getDate() + diff);
    }

    return { start: minDate, end: maxDate };
  }, [tasks, viewRange]);

  const totalDays = useMemo(() => {
    return Math.ceil(
      (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
    );
  }, [dateRange]);

  const chartLayout = useMemo(() => {
    const sidebarWidth = 240;
    const headerHeight = 50;
    const rowHeight = 56;
    const paddingLeft = 10;
    const paddingRight = 20;
    const minWidthPerDay = 40;

    const totalContentWidth = totalDays * minWidthPerDay + paddingLeft + paddingRight;

    return {
      sidebarWidth,
      headerHeight,
      rowHeight,
      paddingLeft,
      paddingRight,
      dayWidth: minWidthPerDay,
      totalWidth: sidebarWidth + totalContentWidth,
      totalHeight: headerHeight + Math.max(tasks.length * rowHeight + 40, 300),
    };
  }, [totalDays, tasks.length]);

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

  const getDateByOffset = (offsetDays: number): Date => {
    const date = new Date(dateRange.start);
    date.setDate(date.getDate() + offsetDays);
    return date;
  };

  const getDayOffset = (date: Date): number => {
    return Math.round(
      (date.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
    );
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const { totalWidth, totalHeight } = chartLayout;
    canvas.width = totalWidth * dpr;
    canvas.height = totalHeight * dpr;
    canvas.style.width = `${totalWidth}px`;
    canvas.style.height = `${totalHeight}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, totalWidth, totalHeight);

    const { sidebarWidth, headerHeight, rowHeight, dayWidth, paddingLeft, paddingRight } = chartLayout;

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, sidebarWidth, totalHeight);

    ctx.fillStyle = '#ecf0f1';
    ctx.fillRect(sidebarWidth, 0, totalWidth - sidebarWidth, headerHeight);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sidebarWidth, headerHeight, totalWidth - sidebarWidth, totalHeight - headerHeight);

    ctx.strokeStyle = '#e1e8ed';
    ctx.lineWidth = 1;
    for (let day = 0; day <= totalDays; day++) {
      const x = sidebarWidth + paddingLeft + day * dayWidth;
      ctx.beginPath();
      ctx.moveTo(x, headerHeight);
      ctx.lineTo(x, totalHeight);
      ctx.stroke();
    }

    for (let row = 0; row <= tasks.length; row++) {
      const y = headerHeight + row * rowHeight;
      ctx.beginPath();
      ctx.moveTo(sidebarWidth, y);
      ctx.lineTo(totalWidth, y);
      ctx.stroke();
    }

    for (let day = 0; day < totalDays; day++) {
      const date = getDateByOffset(day);
      const x = sidebarWidth + paddingLeft + day * dayWidth + dayWidth / 2;

      ctx.fillStyle = '#7f8c8d';
      ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const isFirstOfMonth = date.getDate() === 1;
      if (isFirstOfMonth || day === 0) {
        ctx.fillText(
          `${date.getMonth() + 1}月${date.getDate()}日`,
          x,
          headerHeight / 2
        );
      } else {
        ctx.fillText(`${date.getDate()}`, x, headerHeight / 2);
      }

      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      if (isWeekend) {
        ctx.fillStyle = 'rgba(241, 196, 15, 0.05)';
        const weekendX = sidebarWidth + paddingLeft + day * dayWidth;
        ctx.fillRect(weekendX, headerHeight, dayWidth, totalHeight - headerHeight);
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOffset = getDayOffset(today);
    if (todayOffset >= 0 && todayOffset <= totalDays) {
      const todayX = sidebarWidth + paddingLeft + todayOffset * dayWidth;

      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = '#e74c3c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(todayX, headerHeight);
      ctx.lineTo(todayX, totalHeight);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#e74c3c';
      const labelWidth = 42;
      const labelHeight = 18;
      const labelX = todayX - labelWidth / 2;
      ctx.fillRect(labelX, headerHeight - labelHeight - 2, labelWidth, labelHeight);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('今天', todayX, headerHeight - labelHeight / 2 - 2);
    }

    tasks.forEach((task, index) => {
      const y = headerHeight + index * rowHeight;
      const sidebarPadding = 16;
      const avatarSize = 20;

      ctx.fillStyle = '#2c3e50';
      ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      const taskName = task.card.title;
      const maxNameWidth = sidebarWidth - sidebarPadding - avatarSize - 12 - 20;
      let displayName = taskName;
      ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
      if (ctx.measureText(taskName).width > maxNameWidth) {
        let truncated = taskName;
        while (ctx.measureText(truncated + '...').width > maxNameWidth && truncated.length > 0) {
          truncated = truncated.slice(0, -1);
        }
        displayName = truncated + '...';
      }
      ctx.fillText(displayName, sidebarPadding, y + 10);

      const assigneeName = getMemberName(task.card.assignee);
      const avatarBg = isOverdue(task.card) ? '#e74c3c' : '#3498db';
      const avatarX = sidebarPadding;
      const avatarY = y + rowHeight - 10 - avatarSize;

      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, 2 * Math.PI);
      ctx.fillStyle = avatarBg;
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(assigneeName.charAt(0).toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2);

      ctx.fillStyle = '#7f8c8d';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(assigneeName, avatarX + avatarSize + 8, avatarY + avatarSize / 2);

      const startOffset = getDayOffset(task.startDate);
      const endOffset = getDayOffset(task.endDate);
      const duration = Math.max(1, endOffset - startOffset + 1);

      const barX = sidebarWidth + paddingLeft + startOffset * dayWidth + 2;
      const barY = y + 12;
      const barWidth = duration * dayWidth - 4;
      const barHeight = rowHeight - 24;
      const barRadius = 6;

      const color = getStatusColor(task.card);
      const alpha = isOverdue(task.card) ? 0.8 : 1;

      ctx.globalAlpha = alpha;

      ctx.beginPath();
      ctx.moveTo(barX + barRadius, barY);
      ctx.lineTo(barX + barWidth - barRadius, barY);
      ctx.quadraticCurveTo(barX + barWidth, barY, barX + barWidth, barY + barRadius);
      ctx.lineTo(barX + barWidth, barY + barHeight - barRadius);
      ctx.quadraticCurveTo(barX + barWidth, barY + barHeight, barX + barWidth - barRadius, barY + barHeight);
      ctx.lineTo(barX + barRadius, barY + barHeight);
      ctx.quadraticCurveTo(barX, barY + barHeight, barX, barY + barHeight - barRadius);
      ctx.lineTo(barX, barY + barRadius);
      ctx.quadraticCurveTo(barX, barY, barX + barRadius, barY);
      ctx.closePath();

      ctx.fillStyle = color;
      ctx.fill();

      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(barX, barY, barWidth, barHeight / 2);
      ctx.globalAlpha = alpha;

      ctx.fillStyle = '#ffffff';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      const labelText = task.card.title;
      const maxLabelWidth = barWidth - 16;
      let barLabel = labelText;
      if (ctx.measureText(labelText).width > maxLabelWidth) {
        let truncated = labelText;
        while (ctx.measureText(truncated + '...').width > maxLabelWidth && truncated.length > 0) {
          truncated = truncated.slice(0, -1);
        }
        barLabel = truncated + '...';
      }
      ctx.fillText(barLabel, barX + 8, barY + barHeight / 2);

      ctx.globalAlpha = 1;
    });

    ctx.strokeStyle = '#e1e8ed';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sidebarWidth, 0);
    ctx.lineTo(sidebarWidth, totalHeight);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, headerHeight);
    ctx.lineTo(totalWidth, headerHeight);
    ctx.stroke();

  }, [tasks, dateRange, totalDays, chartLayout, lists, members]);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width / (window.devicePixelRatio || 1);
    const scaleY = canvas.height / rect.height / (window.devicePixelRatio || 1);
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const { sidebarWidth, headerHeight, rowHeight, paddingLeft, dayWidth } = chartLayout;

    if (x > sidebarWidth && y > headerHeight) {
      const taskIndex = Math.floor((y - headerHeight) / rowHeight);
      if (taskIndex >= 0 && taskIndex < tasks.length) {
        const task = tasks[taskIndex];
        const startOffset = getDayOffset(task.startDate);
        const endOffset = getDayOffset(task.endDate);
        const duration = Math.max(1, endOffset - startOffset + 1);

        const barX = sidebarWidth + paddingLeft + startOffset * dayWidth + 2;
        const barY = headerHeight + taskIndex * rowHeight + 12;
        const barWidth = duration * dayWidth - 4;
        const barHeight = rowHeight - 24;

        if (x >= barX && x <= barX + barWidth && y >= barY && y <= barY + barHeight) {
          setHoveredTask(task);
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          return;
        }
      }
    }

    setHoveredTask(null);
  };

  return (
    <div className="gantt-view fade-in">
      <div className="gantt-header">
        <div className="gantt-controls">
          <div className="filter-group">
            <label>项目筛选：</label>
            <select
              value={selectedProjectId || ''}
              onChange={(e) => {
                if (e.target.value) {
                  onSelectProject(e.target.value);
                }
              }}
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
          <div className="filter-group">
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
              <option value={90}>90 天</option>
            </select>
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
            <span className="legend-line" />
            <span>今天</span>
          </div>
          <div className="legend-item">
            <span className="legend-weekend" />
            <span>周末</span>
          </div>
        </div>
      </div>

      <div className="gantt-chart-wrapper">
        <div className="gantt-chart-scroll">
          {tasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <h3>暂无任务数据</h3>
              <p>当前筛选条件下没有带截止日期的任务</p>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              className="gantt-canvas"
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={() => setHoveredTask(null)}
            />
          )}
        </div>
      </div>

      {hoveredTask && (
        <div
          className="gantt-tooltip"
          style={{
            left: mousePos.x + 15,
            top: mousePos.y + 15,
          }}
        >
          <div className="tooltip-title">{hoveredTask.card.title}</div>
          <div className="tooltip-row">
            <span className="tooltip-label">状态：</span>
            <span
              className="tooltip-value"
              style={{ color: getStatusColor(hoveredTask.card), fontWeight: 600 }}
            >
              {hoveredTask.listName}
            </span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">负责人：</span>
            <span className="tooltip-value">
              {getMemberName(hoveredTask.card.assignee)}
            </span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">开始：</span>
            <span className="tooltip-value">
              {hoveredTask.startDate.toLocaleDateString('zh-CN')}
            </span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">截止：</span>
            <span
              className={`tooltip-value ${isOverdue(hoveredTask.card) ? 'overdue' : ''}`}
            >
              {hoveredTask.endDate.toLocaleDateString('zh-CN')}
              {isOverdue(hoveredTask.card) && ' (已过期)'}
            </span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">优先级：</span>
            <span
              className="tooltip-value"
              style={{
                color:
                  hoveredTask.card.priority === 'high'
                    ? '#e74c3c'
                    : hoveredTask.card.priority === 'medium'
                    ? '#f39c12'
                    : '#27ae60',
                fontWeight: 600,
              }}
            >
              {hoveredTask.card.priority === 'high'
                ? '高'
                : hoveredTask.card.priority === 'medium'
                ? '中'
                : '低'}
            </span>
          </div>
        </div>
      )}

      <style>{`
        .gantt-view {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 24px;
          overflow: hidden;
          position: relative;
        }

        .gantt-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .gantt-controls {
          display: flex;
          gap: 24px;
          align-items: center;
          flex-wrap: wrap;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .filter-group label {
          font-size: 14px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .filter-select {
          padding: 8px 14px;
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
          box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
        }

        .gantt-legend {
          display: flex;
          gap: 20px;
          align-items: center;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--text-secondary);
        }

        .legend-color {
          width: 18px;
          height: 18px;
          border-radius: 4px;
        }

        .legend-line {
          width: 24px;
          height: 0;
          border-top: 2px dashed #e74c3c;
        }

        .legend-weekend {
          width: 18px;
          height: 18px;
          border-radius: 4px;
          background: rgba(241, 196, 15, 0.15);
          border: 1px solid rgba(241, 196, 15, 0.3);
        }

        .gantt-chart-wrapper {
          flex: 1;
          background: var(--bg-color);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .gantt-chart-scroll {
          flex: 1;
          overflow: auto;
          max-height: calc(100vh - 260px);
          position: relative;
        }

        .gantt-canvas {
          display: block;
          cursor: default;
        }

        .gantt-tooltip {
          position: absolute;
          background: var(--primary-color);
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
          font-size: 13px;
          pointer-events: none;
          z-index: 100;
          max-width: 280px;
        }

        .tooltip-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.15);
        }

        .tooltip-row {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 6px;
        }

        .tooltip-label {
          color: rgba(255, 255, 255, 0.6);
        }

        .tooltip-value {
          color: white;
          text-align: right;
        }

        .tooltip-value.overdue {
          color: #e74c3c;
          font-weight: 600;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 40px;
          color: var(--text-light);
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 20px;
          opacity: 0.5;
        }

        .empty-state h3 {
          font-size: 18px;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }

        .empty-state p {
          font-size: 14px;
          color: var(--text-light);
        }
      `}</style>
    </div>
  );
};

export default GanttView;
