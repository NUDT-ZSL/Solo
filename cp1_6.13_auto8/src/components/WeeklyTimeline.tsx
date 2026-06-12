import React, { useRef, useEffect } from 'react';
import { DailyStats } from '../types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface WeeklyTimelineProps {
  data: DailyStats[];
  habitStatuses: { [habitId: string]: boolean[] };
}

const WeeklyTimeline: React.FC<WeeklyTimelineProps> = ({ data, habitStatuses }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (data.length > 0) {
      drawChart();
    }
  }, [data]);

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 10, right: 10, bottom: 10, left: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    const values = data.map(d => d.completedHabits);
    const maxValue = Math.max(...values, 1);
    const minValue = 0;

    const points = data.map((d, i) => ({
      x: padding.left + (i / (data.length - 1)) * chartWidth,
      y: padding.top + chartHeight - ((d.completedHabits - minValue) / (maxValue - minValue)) * chartHeight,
    }));

    ctx.beginPath();
    ctx.strokeStyle = '#d4edda';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const y = padding.top + (i / 3) * chartHeight;
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = '#28a745';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    points.forEach((point, i) => {
      if (i === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        const prev = points[i - 1];
        const cpx = (prev.x + point.x) / 2;
        ctx.bezierCurveTo(cpx, prev.y, cpx, point.y, point.x, point.y);
      }
    });
    ctx.stroke();

    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(40, 167, 69, 0.3)');
    gradient.addColorStop(1, 'rgba(40, 167, 69, 0.05)');

    ctx.beginPath();
    ctx.fillStyle = gradient;
    ctx.moveTo(points[0].x, height - padding.bottom);
    points.forEach((point) => {
      ctx.lineTo(point.x, point.y);
    });
    ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
    ctx.closePath();
    ctx.fill();

    points.forEach((point) => {
      ctx.beginPath();
      ctx.fillStyle = '#ffffff';
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#28a745';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  };

  const getDayLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return '今天';
    }
    return format(date, 'EEE', { locale: zhCN });
  };

  const habitIds = Object.keys(habitStatuses);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>本周趋势</h3>
        <span style={styles.subtitle}>近7天打卡统计</span>
      </div>

      <div style={styles.chartContainer}>
        <canvas ref={canvasRef} style={styles.canvas} />
      </div>

      <div style={styles.timeline}>
        {data.map((day, dayIndex) => (
          <div key={day.date} style={styles.dayColumn}>
            <div style={styles.habitDots}>
              {habitIds.map((habitId, habitIndex) => {
                const isChecked = habitStatuses[habitId]?.[dayIndex] || false;
                return (
                  <div
                    key={`${habitId}-${dayIndex}`}
                    style={{
                      ...styles.dot,
                      backgroundColor: isChecked ? '#28a745' : '#dee2e6',
                      marginTop: habitIndex === 0 ? 0 : '4px',
                    }}
                    title={`${isChecked ? '已打卡' : '未打卡'}`}
                  />
                );
              })}
            </div>
            <span style={{
              ...styles.dayLabel,
              color: dayIndex === data.length - 1 ? '#28a745' : '#6c757d',
              fontWeight: dayIndex === data.length - 1 ? 600 : 400,
            }}>
              {getDayLabel(day.date)}
            </span>
            <span style={styles.countLabel}>
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
    height: '100px',
    marginBottom: '20px',
  },
  canvas: {
    width: '100%',
    height: '100%',
    display: 'block',
  },
  timeline: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  dayColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
  },
