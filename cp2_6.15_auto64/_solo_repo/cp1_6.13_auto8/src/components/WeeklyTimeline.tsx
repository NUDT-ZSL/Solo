import React, { useRef, useEffect, useCallback } from 'react';
import { DailyStats, Habit } from '../types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface WeeklyTimelineProps {
  dailyStats: DailyStats[];
  habits: Habit[];
  habitWeeklyStatus: { [habitId: string]: boolean[] };
}

const DOT_SIZE = 12;
const DOT_GAP = 4;
const LINE_WIDTH = 2;
const CHART_COLOR = '#28a745';

const WeeklyTimeline: React.FC<WeeklyTimelineProps> = ({ dailyStats, habits, habitWeeklyStatus }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || dailyStats.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const width = Math.max(rect.width, 200);
    const height = 100;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const padding = { top: 12, right: 12, bottom: 12, left: 12 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const values = dailyStats.map(d => d.completedHabits);
    const maxValue = Math.max(...values, habits.length || 1);
    const minValue = 0;

    const getPointX = (i: number) => {
      if (dailyStats.length <= 1) return padding.left + chartWidth / 2;
      return padding.left + (i / (dailyStats.length - 1)) * chartWidth;
    };
    const getPointY = (v: number) => {
      const range = maxValue - minValue || 1;
      return padding.top + chartHeight - ((v - minValue) / range) * chartHeight;
    };

    const points = dailyStats.map((d, i) => ({
      x: getPointX(i),
      y: getPointY(d.completedHabits),
    }));

    ctx.save();
    ctx.strokeStyle = '#e9ecef';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const y = padding.top + (i / 3) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }
    ctx.restore();

    if (points.length > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = CHART_COLOR;
      ctx.lineWidth = LINE_WIDTH;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      points.forEach((point, i) => {
        if (i === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          const prev = points[i - 1];
          const cpx1 = prev.x + (point.x - prev.x) * 0.4;
          const cpx2 = prev.x + (point.x - prev.x) * 0.6;
          ctx.bezierCurveTo(cpx1, prev.y, cpx2, point.y, point.x, point.y);
        }
      });
      ctx.stroke();
      ctx.restore();

      const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      gradient.addColorStop(0, 'rgba(40, 167, 69, 0.28)');
      gradient.addColorStop(1, 'rgba(40, 167, 69, 0.02)');

      ctx.save();
      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.moveTo(points[0].x, height - padding.bottom);
      points.forEach((point) => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      points.forEach((point) => {
        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = '#ffffff';
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.strokeStyle = CHART_COLOR;
        ctx.lineWidth = LINE_WIDTH;
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });
    }
  }, [dailyStats, habits.length]);

  useEffect(() => {
    drawChart();
  }, [drawChart]);

  useEffect(() => {
    const handleResize = () => drawChart();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawChart]);

  const getDayLabel = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const today = new Date();
      if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
        return '今天';
      }
      return format(date, 'EEE', { locale: zhCN });
    } catch {
      return '';
    }
  };

  const isToday = (dateStr: string) => {
    return format(new Date(dateStr), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>本周趋势</h3>
        <span style={styles.subtitle}>近7天打卡统计</span>
      </div>

      <div ref={containerRef} style={styles.chartContainer}>
        <canvas ref={canvasRef} style={styles.canvas} />
      </div>

      <div style={styles.timeline}>
        {dailyStats.map((day, dayIndex) => (
          <div key={day.date} style={styles.dayColumn}>
            <div style={{
              ...styles.habitDotsContainer,
              gap: `${DOT_GAP}px`,
            }}>
              {habits.map((habit) => {
                const isChecked = habitWeeklyStatus[habit._id]?.[dayIndex] || false;
                return (
                  <div
                    key={habit._id}
                    style={{
                      ...styles.dot,
                      width: `${DOT_SIZE}px`,
                      height: `${DOT_SIZE}px`,
                      minWidth: `${DOT_SIZE}px`,
                      minHeight: `${DOT_SIZE}px`,
                      backgroundColor: isChecked ? '#28a745' : '#dee2e6',
                      boxShadow: isChecked ? '0 1px 4px rgba(40, 167, 69, 0.3)' : 'none',
                    }}
                    className={`timeline-dot ${isChecked ? 'timeline-dot-checked' : 'timeline-dot-unchecked'}`}
                    title={`${habit.name}: ${isChecked ? '已打卡' : '未打卡'}`}
                  />
                );
              })}
            </div>
            
            <span style={{
              ...styles.dayLabel,
              color: isToday(day.date) ? '#28a745' : '#6c757d',
              fontWeight: isToday(day.date) ? 600 : 400,
            }}>
              {getDayLabel(day.date)}
            </span>
            
            <span style={{
              ...styles.countLabel,
              backgroundColor: isToday(day.date) ? '#d4edda' : '#f8f9fa',
              color: isToday(day.date) ? '#28a745' : '#6c757d',
            }}>
              {day.completedHabits}/{day.totalHabits}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
  },
  header: {
    marginBottom: '16px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#343a40',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '12px',
    color: '#6c757d',
  },
  chartContainer: {
    width: '100%',
    height: '100px',
    marginBottom: '20px',
  },
  canvas: {
    display: 'block',
  },
  timeline: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '8px',
  },
  dayColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  habitDotsContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '8px',
  },
  dot: {
    borderRadius: '50%',
    transition: 'transform 0.2s ease',
  },
  dayLabel: {
    fontSize: '12px',
    marginBottom: '6px',
  },
  countLabel: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '10px',
    fontWeight: 500,
  },
};

const STYLE_ID = 'weekly-timeline-styles';
if (!document.getElementById(STYLE_ID)) {
  const styleSheet = document.createElement('style');
  styleSheet.id = STYLE_ID;
  styleSheet.textContent = `
    .timeline-dot {
      width: ${DOT_SIZE}px !important;
      height: ${DOT_SIZE}px !important;
    }
    .timeline-dot:hover {
      transform: scale(1.15);
    }
    .timeline-dot-checked {
      background-color: #28a745 !important;
    }
    .timeline-dot-unchecked {
      background-color: #dee2e6 !important;
    }
  `;
  document.head.appendChild(styleSheet);
}

export default WeeklyTimeline;
