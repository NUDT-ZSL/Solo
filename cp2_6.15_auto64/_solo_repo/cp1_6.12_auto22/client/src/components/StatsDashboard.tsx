import React, { useEffect, useRef, useMemo } from 'react';
import { Card, Member, Project, List as ListType } from '../types';

interface StatsDashboardProps {
  project: Project | null;
  cards: Card[];
  lists: ListType[];
  members: Member[];
}

const StatsDashboard: React.FC<StatsDashboardProps> = ({ project, cards, lists, members }) => {
  const pieChartRef = useRef<HTMLCanvasElement>(null);
  const lineChartRef = useRef<HTMLCanvasElement>(null);

  const projectLists = useMemo(() => {
    if (!project) return lists;
    return lists.filter((l) => l.projectId === project.id);
  }, [project, lists]);

  const projectCards = useMemo(() => {
    const listIds = projectLists.map((l) => l.id);
    return cards.filter((c) => listIds.includes(c.listId));
  }, [cards, projectLists]);

  const stats = useMemo(() => {
    const total = projectCards.length;
    const completedList = projectLists.find((l) => l.title === '完成');
    const completed = completedList
      ? projectCards.filter((c) => c.listId === completedList.id).length
      : 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdue = projectCards.filter(
      (c) => c.dueDate && new Date(c.dueDate) < today && c.listId !== completedList?.id
    ).length;

    return { total, completed, overdue };
  }, [projectCards, projectLists]);

  const assigneeData = useMemo(() => {
    const data: { name: string; count: number; color: string }[] = [];
    const colorPalette = [
      '#3498db',
      '#2ecc71',
      '#e74c3c',
      '#f39c12',
      '#9b59b6',
      '#1abc9c',
      '#e67e22',
      '#34495e',
    ];

    const assigneeMap = new Map<string, number>();

    projectCards.forEach((card) => {
      const key = card.assignee || '未分配';
      assigneeMap.set(key, (assigneeMap.get(key) || 0) + 1);
    });

    let colorIndex = 0;
    assigneeMap.forEach((count, email) => {
      const member = members.find((m) => m.email === email);
      const name = member ? member.name : email;
      data.push({
        name,
        count,
        color: colorPalette[colorIndex % colorPalette.length],
      });
      colorIndex++;
    });

    return data.sort((a, b) => b.count - a.count);
  }, [projectCards, members]);

  const last7DaysData = useMemo(() => {
    const data: { date: string; count: number; dateObj: Date }[] = [];
    const completedList = projectLists.find((l) => l.title === '完成');

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const count = projectCards.filter((card) => {
        if (completedList && card.listId !== completedList.id) return false;
        if (!card.completedAt) return false;
        const completedDate = new Date(card.completedAt);
        return completedDate >= date && completedDate < nextDay;
      }).length;

      data.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        count,
        dateObj: date,
      });
    }

    return data;
  }, [projectCards, projectLists]);

  useEffect(() => {
    const canvas = pieChartRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(rect.width, 200);
    const height = Math.max(rect.height, 200);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.max(10, Math.min(centerX, centerY) - 20);

    ctx.clearRect(0, 0, width, height);

    if (assigneeData.length === 0) {
      ctx.fillStyle = '#bdc3c7';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('暂无数据', centerX, centerY);
      return;
    }

    const total = assigneeData.reduce((sum, item) => sum + item.count, 0);
    let startAngle = -Math.PI / 2;

    assigneeData.forEach((item) => {
      const sliceAngle = (item.count / total) * 2 * Math.PI;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = item.color;
      ctx.fill();

      startAngle += sliceAngle;
    });

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(total), centerX, centerY - 5);
    ctx.fillStyle = '#7f8c8d';
    ctx.font = '12px sans-serif';
    ctx.fillText('总任务', centerX, centerY + 15);
  }, [assigneeData]);

  useEffect(() => {
    const canvas = lineChartRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(rect.width, 200);
    const height = Math.max(rect.height, 200);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const padding = { top: 20, right: 20, bottom: 40, left: 40 };
    const chartWidth = Math.max(100, width - padding.left - padding.right);
    const chartHeight = Math.max(80, height - padding.top - padding.bottom);

    ctx.clearRect(0, 0, width, height);

    const maxCount = Math.max(...last7DaysData.map((d) => d.count), 1);

    ctx.strokeStyle = '#ecf0f1';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = '#95a5a6';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(String(Math.round(maxCount - (maxCount / 4) * i)), padding.left - 8, y + 4);
    }

    const points = last7DaysData.map((d, i) => {
      const x = padding.left + (chartWidth / (last7DaysData.length - 1)) * i;
      const y = padding.top + chartHeight - (d.count / maxCount) * chartHeight;
      return { x, y, ...d };
    });

    ctx.beginPath();
    ctx.moveTo(points[0].x, padding.top + chartHeight);
    points.forEach((p) => {
      ctx.lineTo(p.x, p.y);
    });
    ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
    gradient.addColorStop(0, 'rgba(52, 152, 219, 0.3)');
    gradient.addColorStop(1, 'rgba(52, 152, 219, 0.05)');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    ctx.stroke();

    points.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#3498db';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#7f8c8d';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.date, p.x, height - padding.bottom + 20);

      ctx.fillStyle = '#2c3e50';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(String(p.count), p.x, p.y - 10);
    });
  }, [last7DaysData]);

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="stats-dashboard fade-in">
      <h2 className="dashboard-title">
        {project ? `${project.name} - 概览统计` : '全部项目概览'}
      </h2>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon total-icon">📋</div>
          <div className="stat-info">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">总任务数</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon completed-icon">✅</div>
          <div className="stat-info">
            <span className="stat-value completed">{stats.completed}</span>
            <span className="stat-label">已完成</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon overdue-icon">⚠️</div>
          <div className="stat-info">
            <span className="stat-value overdue">{stats.overdue}</span>
            <span className="stat-label">过期未完成</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon rate-icon">📊</div>
          <div className="stat-info">
            <span className="stat-value">{completionRate}%</span>
            <span className="stat-label">完成率</span>
          </div>
        </div>
      </div>

      <div className="charts-row">
        <div className="chart-card">
          <h3 className="chart-title">任务分布（按负责人）</h3>
          <div className="chart-container">
            <canvas ref={pieChartRef} className="pie-chart" />
          </div>
          <div className="chart-legend">
            {assigneeData.map((item, index) => (
              <div key={index} className="legend-item">
                <span
                  className="legend-dot"
                  style={{ backgroundColor: item.color }}
                />
                <span className="legend-name">{item.name}</span>
                <span className="legend-count">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">近7天完成任务数</h3>
          <div className="chart-container">
            <canvas ref={lineChartRef} className="line-chart" />
          </div>
        </div>
      </div>

      <style>{`
        .stats-dashboard {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
        }

        .dashboard-title {
          font-size: 22px;
          font-weight: 600;
          color: var(--primary-color);
          margin-bottom: 24px;
        }

        .stats-cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: var(--bg-color);
          border-radius: var(--radius);
          padding: 20px;
          box-shadow: var(--shadow);
          display: flex;
          align-items: center;
          gap: 16px;
          transition: var(--transition);
        }

        .stat-card:hover {
          box-shadow: var(--shadow-hover);
          transform: translateY(-2px);
        }

        .stat-icon {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          background: var(--bg-secondary);
        }

        .stat-info {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: var(--primary-color);
          line-height: 1.2;
        }

        .stat-value.completed {
          color: #27ae60;
        }

        .stat-value.overdue {
          color: #e74c3c;
        }

        .stat-label {
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .charts-row {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 20px;
        }

        .chart-card {
          background: var(--bg-color);
          border-radius: var(--radius);
          padding: 20px;
          box-shadow: var(--shadow);
        }

        .chart-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--primary-color);
          margin-bottom: 16px;
        }

        .chart-container {
          width: 100%;
          height: 280px;
          position: relative;
        }

        .pie-chart {
          width: 100%;
          height: 100%;
        }

        .line-chart {
          width: 100%;
          height: 100%;
        }

        .chart-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--bg-secondary);
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
        }

        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .legend-name {
          color: var(--text-secondary);
        }

        .legend-count {
          color: var(--primary-color);
          font-weight: 600;
        }

        @media (max-width: 1200px) {
          .stats-cards {
            grid-template-columns: repeat(2, 1fr);
          }

          .charts-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default StatsDashboard;
