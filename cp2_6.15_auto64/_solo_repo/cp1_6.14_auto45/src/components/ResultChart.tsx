import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PollType, PollResult } from '../types';

interface ResultChartProps {
  type: PollType;
  options: string[];
  results: PollResult[];
  participantCount: number;
}

interface AnimatedValue {
  count: number;
  avgRating: number;
  startAngle: number;
  endAngle: number;
  barHeight: number;
  barWidth: number;
}

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#06b6d4', '#f97316'];
const ANIMATION_DURATION = 300;
const SIZE = 280;
const CENTER = SIZE / 2;
const OUTER_RADIUS = 110;
const INNER_RADIUS = 70;

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

const MIN_FPS = 50;
const FRAME_DURATION_TARGET = 1000 / 60;
const MAX_FRAME_SKIP = 2;

const ResultChart: React.FC<ResultChartProps> = ({ type, options, results, participantCount }) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const animatedValuesRef = useRef<AnimatedValue[]>([]);
  const targetValuesRef = useRef<AnimatedValue[]>([]);
  const startValuesRef = useRef<AnimatedValue[]>([]);
  const animationStartTimeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const fpsRef = useRef<number>(60);
  const [, forceRender] = useState({});

  const calculateAngles = useCallback((values: PollResult[]): { startAngle: number; endAngle: number }[] => {
    const total = values.reduce((sum, r) => sum + r.count, 0);
    if (total === 0) {
      return values.map(() => ({ startAngle: -Math.PI / 2, endAngle: -Math.PI / 2 }));
    }

    let currentAngle = -Math.PI / 2;
    return values.map(r => {
      const percentage = r.count / total;
      const angle = percentage * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;
      return { startAngle, endAngle };
    });
  }, []);

  const calculateBarHeights = useCallback((values: PollResult[], chartHeight: number): number[] => {
    const maxValue = Math.max(...values.map(r => r.avgRating || r.count), 1);
    return values.map(r => {
      const value = r.avgRating || r.count;
      return (value / maxValue) * (chartHeight - 40);
    });
  }, []);

  const calculateBarWidths = useCallback((values: PollResult[], chartWidth: number): number[] => {
    const maxValue = Math.max(...values.map(r => r.count), 1);
    return values.map(r => (r.count / maxValue) * (chartWidth - 120));
  }, []);

  const initAnimatedValues = useCallback(() => {
    const angles = calculateAngles(results);
    const barHeights = calculateBarHeights(results, 240);
    const barWidths = calculateBarWidths(results, 400);

    const values: AnimatedValue[] = results.map((r, i) => ({
      count: r.count,
      avgRating: r.avgRating || 0,
      startAngle: angles[i].startAngle,
      endAngle: angles[i].endAngle,
      barHeight: barHeights[i],
      barWidth: barWidths[i],
    }));

    animatedValuesRef.current = values;
    targetValuesRef.current = [...values];
    startValuesRef.current = [...values];
  }, [results, calculateAngles, calculateBarHeights, calculateBarWidths]);

  useEffect(() => {
    initAnimatedValues();
    setIsVisible(true);
  }, []);

  useEffect(() => {
    if (animatedValuesRef.current.length === 0) {
      initAnimatedValues();
      return;
    }

    const newAngles = calculateAngles(results);
    const newBarHeights = calculateBarHeights(results, 240);
    const newBarWidths = calculateBarWidths(results, 400);

    const newTargets: AnimatedValue[] = results.map((r, i) => ({
      count: r.count,
      avgRating: r.avgRating || 0,
      startAngle: newAngles[i].startAngle,
      endAngle: newAngles[i].endAngle,
      barHeight: newBarHeights[i],
      barWidth: newBarWidths[i],
    }));

    startValuesRef.current = animatedValuesRef.current.map(v => ({ ...v }));
    targetValuesRef.current = newTargets;
    animationStartTimeRef.current = performance.now();
    lastFrameTimeRef.current = performance.now();
    frameCountRef.current = 0;
    fpsRef.current = 60;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const animate = (currentTime: number) => {
      const elapsed = currentTime - animationStartTimeRef.current;
      const frameDuration = currentTime - lastFrameTimeRef.current;
      lastFrameTimeRef.current = currentTime;
      frameCountRef.current++;

      const instantFps = frameDuration > 0 ? 1000 / frameDuration : 60;
      fpsRef.current = fpsRef.current * 0.9 + instantFps * 0.1;

      let progress = Math.min(elapsed / ANIMATION_DURATION, 1);

      if (fpsRef.current < MIN_FPS && progress < 0.9) {
        const skipFactor = Math.min(MAX_FRAME_SKIP, Math.ceil(MIN_FPS / Math.max(fpsRef.current, 1)));
        const adjustedElapsed = elapsed + (skipFactor - 1) * FRAME_DURATION_TARGET;
        progress = Math.min(adjustedElapsed / ANIMATION_DURATION, 1);
        console.warn(`[ResultChart] FPS dropped to ${fpsRef.current.toFixed(1)}, accelerating animation`);
      }

      if (elapsed > ANIMATION_DURATION * 1.1) {
        progress = 1;
        console.warn(`[ResultChart] Animation exceeded ${ANIMATION_DURATION * 1.1}ms, forcing completion`);
      }

      const easedProgress = easeOutCubic(progress);

      animatedValuesRef.current = startValuesRef.current.map((start, i) => {
        const target = targetValuesRef.current[i] || start;
        return {
          count: start.count + (target.count - start.count) * easedProgress,
          avgRating: start.avgRating + (target.avgRating - start.avgRating) * easedProgress,
          startAngle: start.startAngle + (target.startAngle - start.startAngle) * easedProgress,
          endAngle: start.endAngle + (target.endAngle - start.endAngle) * easedProgress,
          barHeight: start.barHeight + (target.barHeight - start.barHeight) * easedProgress,
          barWidth: start.barWidth + (target.barWidth - start.barWidth) * easedProgress,
        };
      });

      forceRender({});

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        animationFrameRef.current = null;
        const totalDuration = performance.now() - animationStartTimeRef.current;
        const avgFps = frameCountRef.current / (totalDuration / 1000);
        if (avgFps < MIN_FPS) {
          console.warn(`[ResultChart] Animation completed with avg FPS: ${avgFps.toFixed(1)}, duration: ${totalDuration.toFixed(0)}ms`);
        } else if (process.env.NODE_ENV === 'development') {
          console.log(`[ResultChart] Animation OK - avg FPS: ${avgFps.toFixed(1)}, duration: ${totalDuration.toFixed(0)}ms`);
        }
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [results, calculateAngles, calculateBarHeights, calculateBarWidths, initAnimatedValues]);

  const createPiePath = (startAngle: number, endAngle: number): string => {
    const angle = endAngle - startAngle;
    if (angle < 0.001) return '';

    const x1 = CENTER + OUTER_RADIUS * Math.cos(startAngle);
    const y1 = CENTER + OUTER_RADIUS * Math.sin(startAngle);
    const x2 = CENTER + OUTER_RADIUS * Math.cos(endAngle);
    const y2 = CENTER + OUTER_RADIUS * Math.sin(endAngle);
    const x3 = CENTER + INNER_RADIUS * Math.cos(endAngle);
    const y3 = CENTER + INNER_RADIUS * Math.sin(endAngle);
    const x4 = CENTER + INNER_RADIUS * Math.cos(startAngle);
    const y4 = CENTER + INNER_RADIUS * Math.sin(startAngle);

    const largeArc = angle > Math.PI ? 1 : 0;

    return [
      `M ${x1} ${y1}`,
      `A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${INNER_RADIUS} ${INNER_RADIUS} 0 ${largeArc} 0 ${x4} ${y4}`,
      'Z',
    ].join(' ');
  };

  const renderPieChart = () => {
    const animated = animatedValuesRef.current;
    const totalVotes = animated.reduce((sum, r) => sum + r.count, 0);

    if (totalVotes === 0) {
      return (
        <div style={styles.emptyChart}>
          <p style={{ color: '#94a3b8' }}>暂无投票数据</p>
        </div>
      );
    }

    const segments = animated.map((value, index) => {
      const pathData = createPiePath(value.startAngle, value.endAngle);
      if (!pathData) return null;

      return (
        <path
          key={index}
          d={pathData}
          fill={COLORS[index % COLORS.length]}
        />
      );
    });

    return (
      <div style={styles.chartWrapper}>
        <svg width={SIZE} height={SIZE} style={styles.svg}>
          {segments}
          <text x={CENTER} y={CENTER - 8} textAnchor="middle" style={styles.centerText}>
            {Math.round(totalVotes)}
          </text>
          <text x={CENTER} y={CENTER + 16} textAnchor="middle" style={styles.centerSubtext}>
            总票数
          </text>
        </svg>
        <div style={styles.legend}>
          {animated.map((value, index) => (
            <div key={index} style={styles.legendItem}>
              <div
                style={{
                  ...styles.legendColor,
                  backgroundColor: COLORS[index % COLORS.length],
                }}
              />
              <span style={styles.legendLabel}>{options[index]}</span>
              <span style={styles.legendValue}>
                {Math.round(value.count)} ({totalVotes > 0 ? ((value.count / totalVotes) * 100).toFixed(1) : 0}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderBarChart = () => {
    const animated = animatedValuesRef.current;
    const chartHeight = 240;
    const barWidth = Math.min(60, 300 / options.length);
    const gap = 20;
    const chartWidth = options.length * (barWidth + gap) - gap;

    return (
      <div style={styles.chartWrapper}>
        <svg width={Math.max(chartWidth, 300)} height={chartHeight + 60} style={styles.svg}>
          <line
            x1={0}
            y1={chartHeight}
            x2={chartWidth}
            y2={chartHeight}
            stroke="#2a2a3e"
            strokeWidth={1}
          />
          {animated.map((value, index) => {
            const x = index * (barWidth + gap);
            const y = chartHeight - value.barHeight;

            return (
              <g key={index}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={value.barHeight}
                  fill={COLORS[index % COLORS.length]}
                  rx={6}
                />
                <text
                  x={x + barWidth / 2}
                  y={y - 8}
                  textAnchor="middle"
                  style={styles.barValue}
                >
                  {type === 'rating' ? value.avgRating.toFixed(1) : Math.round(value.count)}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 20}
                  textAnchor="middle"
                  style={styles.barLabel}
                >
                  {options[index]?.substring(0, 6)}
                  {options[index]?.length > 6 ? '...' : ''}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  const renderHorizontalBarChart = () => {
    const animated = animatedValuesRef.current;
    const sortedIndices = animated
      .map((_, i) => i)
      .sort((a, b) => animated[b].count - animated[a].count);

    const barHeight = 32;
    const gap = 12;
    const chartHeight = options.length * (barHeight + gap) - gap;
    const chartWidth = 400;

    return (
      <div style={styles.chartWrapper}>
        <svg width={chartWidth} height={chartHeight + 20} style={styles.svg}>
          {sortedIndices.map((originalIndex, displayIndex) => {
            const value = animated[originalIndex];
            const y = displayIndex * (barHeight + gap);

            return (
              <g key={originalIndex}>
                <text
                  x={0}
                  y={y + barHeight / 2 + 4}
                  style={styles.hBarLabel}
                >
                  {options[originalIndex]?.substring(0, 8)}
                  {options[originalIndex]?.length > 8 ? '...' : ''}
                </text>
                <rect
                  x={100}
                  y={y}
                  width={value.barWidth}
                  height={barHeight}
                  fill={COLORS[originalIndex % COLORS.length]}
                  rx={6}
                />
                <text
                  x={100 + value.barWidth + 8}
                  y={y + barHeight / 2 + 4}
                  style={styles.hBarValue}
                >
                  {Math.round(value.count)} 票
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  const renderChart = () => {
    switch (type) {
      case 'single':
      case 'multiple':
        return renderPieChart();
      case 'rating':
        return renderBarChart();
      case 'ranking':
        return renderHorizontalBarChart();
      default:
        return null;
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        ...styles.container,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.4s ease-out',
      }}
    >
      <div style={styles.header}>
        <h3 style={styles.title}>实时结果</h3>
        <span style={styles.participantBadge}>{participantCount} 人参与</span>
      </div>
      <div style={styles.chartContainer}>{renderChart()}</div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#1e1e2e',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#e2e8f0',
  },
  participantBadge: {
    fontSize: '13px',
    padding: '4px 12px',
    backgroundColor: '#6366f120',
    color: '#6366f1',
    borderRadius: '12px',
    fontWeight: 500,
  },
  chartContainer: {
    display: 'flex',
    justifyContent: 'center',
    minHeight: '300px',
  },
  chartWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  svg: {
    overflow: 'visible',
  },
  centerText: {
    fontSize: '32px',
    fontWeight: 700,
    fill: '#e2e8f0',
  },
  centerSubtext: {
    fontSize: '12px',
    fill: '#94a3b8',
  },
  legend: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: '180px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  legendColor: {
    width: '12px',
    height: '12px',
    borderRadius: '3px',
    flexShrink: 0,
  },
  legendLabel: {
    fontSize: '13px',
    color: '#e2e8f0',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  legendValue: {
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: 500,
  },
  barValue: {
    fontSize: '12px',
    fill: '#e2e8f0',
    fontWeight: 500,
  },
  barLabel: {
    fontSize: '11px',
    fill: '#94a3b8',
  },
  hBarLabel: {
    fontSize: '12px',
    fill: '#e2e8f0',
  },
  hBarValue: {
    fontSize: '12px',
    fill: '#94a3b8',
  },
  emptyChart: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    width: '100%',
  },
};

export default ResultChart;
