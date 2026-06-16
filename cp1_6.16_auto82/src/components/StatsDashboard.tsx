import { useState, useEffect, useRef, useCallback } from 'react';
import { getUserStats, UserStats } from '../utils/api';

interface StatsDashboardProps {
  userId: string;
}

interface TooltipData {
  x: number;
  y: number;
  score: number;
  date: string;
  index: number;
}

function StatsDashboard({ userId }: StatsDashboardProps) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const pointPathsRef = useRef<Path2D[]>([]);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getUserStats(userId);
        setStats(data);
      } catch (e) {
        console.error('Failed to fetch stats:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, [userId]);

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stats) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 30, right: 30, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(0, 0, width, height);

    const scores = stats.recentScores.map(s => s.score);
    const minScore = 0;
    const maxScore = 100;

    ctx.strokeStyle = 'rgba(236, 240, 241, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      const scoreValue = maxScore - ((maxScore - minScore) / 5) * i;
      ctx.fillStyle = '#95A5A6';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(scoreValue.toString(), padding.left - 10, y);
    }

    if (scores.length < 2) return;

    const stepX = chartWidth / (scores.length - 1);

    const getY = (score: number) => {
      return padding.top + chartHeight - ((score - minScore) / (maxScore - minScore)) * chartHeight;
    };

    const points: { x: number; y: number }[] = [];
    scores.forEach((score, i) => {
      points.push({
        x: padding.left + stepX * i,
        y: getY(score)
      });
    });
    pointsRef.current = points;

    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(46, 204, 113, 0.3)');
    gradient.addColorStop(1, 'rgba(46, 204, 113, 0.02)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, height - padding.bottom);
    points.forEach((point, i) => {
      if (i === 0) {
        ctx.lineTo(point.x, point.y);
      } else {
        const prev = points[i - 1];
        const cpX = (prev.x + point.x) / 2;
        ctx.bezierCurveTo(cpX, prev.y, cpX, point.y, point.x, point.y);
      }
    });
    ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = '#2ECC71';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    points.forEach((point, i) => {
      if (i === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        const prev = points[i - 1];
        const cpX = (prev.x + point.x) / 2;
        ctx.bezierCurveTo(cpX, prev.y, cpX, point.y, point.x, point.y);
      }
    });
    ctx.stroke();

    pointPathsRef.current = [];
    points.forEach((point, i) => {
      const isHovered = hoveredIndex === i;
      const radius = isHovered ? 8 : 5;

      const pointPath = new Path2D();
      pointPath.arc(point.x, point.y, radius + 5, 0, Math.PI * 2);
      pointPathsRef.current.push(pointPath);

      ctx.beginPath();
      ctx.arc(point.x, point.y, radius + 3, 0, Math.PI * 2);
      ctx.fillStyle = isHovered ? 'rgba(46, 204, 113, 0.3)' : 'rgba(46, 204, 113, 0.15)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#2ECC71';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(point.x, point.y, radius - 2, 0, Math.PI * 2);
      ctx.fillStyle = '#2C3E50';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#2ECC71';
      ctx.fill();
    });

    ctx.fillStyle = '#95A5A6';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    scores.forEach((_, i) => {
      const x = padding.left + stepX * i;
      const date = new Date(stats.recentScores[i].date);
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
      ctx.fillText(dateStr, x, height - padding.bottom + 10);
    });

    ctx.fillStyle = '#ECF0F1';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('分数', width - padding.right, padding.top - 20);

    ctx.fillStyle = '#95A5A6';
    ctx.textAlign = 'center';
    ctx.fillText('练习日期', width / 2, height - 10);
  }, [stats, hoveredIndex]);

  useEffect(() => {
    drawChart();
  }, [drawChart]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !stats) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const scores = stats.recentScores;
    if (scores.length < 2) return;

    let hoveredIdx = -1;

    for (let i = 0; i < pointPathsRef.current.length; i++) {
      if (ctx.isPointInPath(pointPathsRef.current[i], mouseX, mouseY)) {
        hoveredIdx = i;
        break;
      }
    }

    if (hoveredIdx < 0) {
      const padding = { left: 50, right: 30 };
      const chartWidth = canvas.width - padding.left - padding.right;
      const stepX = chartWidth / (scores.length - 1);
      let closestIdx = -1;
      let closestDist = Infinity;

      scores.forEach((_, i) => {
        const pointX = padding.left + stepX * i;
        const dist = Math.abs(mouseX - pointX);
        if (dist < closestDist && dist < stepX / 2) {
          closestDist = dist;
          closestIdx = i;
        }
      });
      hoveredIdx = closestIdx;
    }

    if (hoveredIdx >= 0) {
      setHoveredIndex(hoveredIdx);
      const point = pointsRef.current[hoveredIdx];
      setTooltip({
        x: point.x,
        y: point.y,
        score: scores[hoveredIdx].score,
        date: new Date(scores[hoveredIdx].date).toLocaleDateString('zh-CN'),
        index: hoveredIdx
      });
    } else {
      setHoveredIndex(null);
      setTooltip(null);
    }
  }, [stats]);

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
    setTooltip(null);
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#2ECC71';
    if (score >= 60) return '#F39C12';
    return '#E74C3C';
  };

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>加载中...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>学习统计</h2>

      <div style={styles.summaryCards}>
        <div style={styles.summaryCard}>
          <span style={styles.summaryIcon}>🎯</span>
          <div style={styles.summaryInfo}>
            <span style={styles.summaryValue}>{stats?.totalPractices || 0}</span>
            <span style={styles.summaryLabel}>总练习次数</span>
          </div>
        </div>
        <div style={styles.summaryCard}>
          <span style={styles.summaryIcon}>📊</span>
          <div style={styles.summaryInfo}>
            <span style={{ ...styles.summaryValue, color: getScoreColor(stats?.averageScore || 0) }}>
              {stats?.averageScore || 0}
            </span>
            <span style={styles.summaryLabel}>平均分</span>
          </div>
        </div>
        <div style={styles.summaryCard}>
          <span style={styles.summaryIcon}>🔤</span>
          <div style={styles.summaryInfo}>
            <span style={styles.summaryValue}>{stats?.phonemeAccuracy.length || 0}</span>
            <span style={styles.summaryLabel}>练习音素</span>
          </div>
        </div>
      </div>

      <div style={styles.chartCard}>
        <h3 style={styles.cardTitle}>最近10次评分趋势</h3>
        <div style={styles.chartContainer}>
          <canvas
            ref={canvasRef}
            width={700}
            height={280}
            style={styles.chartCanvas}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />
          {tooltip && (
            <div
              style={{
                ...styles.tooltip,
                left: tooltip.x + 10,
                top: tooltip.y - 30
              }}
            >
              <div style={styles.tooltipDate}>{tooltip.date}</div>
              <div style={styles.tooltipScore}>
                {tooltip.score} 分
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={styles.phonemesCard}>
        <h3 style={styles.cardTitle}>音素正确率</h3>
        <div style={styles.phonemeGrid}>
          {stats?.phonemeAccuracy.map((item, index) => (
            <div key={index} style={styles.phonemeItem}>
              <div style={styles.phonemeHeader}>
                <span style={styles.phonemeName}>{item.phoneme}</span>
                <span style={{
                  ...styles.phonemePercent,
                  color: getScoreColor(item.accuracy)
                }}>
                  {item.accuracy}%
                </span>
              </div>
              <div style={styles.progressBar}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${item.accuracy}%`,
                    background: `linear-gradient(90deg, #E74C3C 0%, #F39C12 50%, #2ECC71 100%)`,
                    backgroundPosition: `${100 - item.accuracy}% 0%`,
                    animation: 'progressFill 0.5s ease-out'
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    maxWidth: '800px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  title: {
    fontSize: '22px',
    fontWeight: 600,
    color: '#ECF0F1'
  },
  summaryCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px'
  },
  summaryCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '20px',
    backgroundColor: '#2C3E50',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
  },
  summaryIcon: {
    fontSize: '32px'
  },
  summaryInfo: {
    display: 'flex',
    flexDirection: 'column'
  },
  summaryValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#ECF0F1'
  },
  summaryLabel: {
    fontSize: '12px',
    color: '#95A5A6',
    marginTop: '2px'
  },
  chartCard: {
    backgroundColor: '#2C3E50',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#ECF0F1',
    marginBottom: '16px'
  },
  chartContainer: {
    position: 'relative',
    borderRadius: '10px',
    overflow: 'hidden'
  },
  chartCanvas: {
    width: '100%',
    height: '280px',
    display: 'block',
    borderRadius: '10px',
    cursor: 'crosshair'
  },
  tooltip: {
    position: 'absolute',
    padding: '8px 12px',
    backgroundColor: '#1C2833',
    border: '1px solid #34495E',
    borderRadius: '8px',
    pointerEvents: 'none',
    zIndex: 10,
    animation: 'fadeInTooltip 0.2s ease-out',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
  },
  tooltipDate: {
    fontSize: '11px',
    color: '#95A5A6',
    marginBottom: '4px'
  },
  tooltipScore: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#2ECC71'
  },
  phonemesCard: {
    backgroundColor: '#2C3E50',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
  },
  phonemeGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px'
  },
  phonemeItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  phonemeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  phonemeName: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#ECF0F1'
  },
  phonemePercent: {
    fontSize: '13px',
    fontWeight: 600
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#34495E',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px',
    backgroundSize: '200% 100%'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px',
    gap: '16px'
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid rgba(52, 152, 219, 0.2)',
    borderTopColor: '#3498DB',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    fontSize: '14px',
    color: '#95A5A6'
  }
};

export default StatsDashboard;
