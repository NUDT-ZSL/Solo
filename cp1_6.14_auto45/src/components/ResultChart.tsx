import React, { useEffect, useRef, useState } from 'react';
import { PollType, PollResult } from '../types';

interface ResultChartProps {
  type: PollType;
  options: string[];
  results: PollResult[];
  participantCount: number;
}

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#06b6d4', '#f97316'];

const ResultChart: React.FC<ResultChartProps> = ({ type, options, results, participantCount }) => {
  const [animatedResults, setAnimatedResults] = useState<PollResult[]>(results);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const startValues = animatedResults.map(r => ({ ...r }));
    const endValues = results.map(r => ({ ...r }));
    const duration = 300;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      const newResults = startValues.map((start, i) => {
        const end = endValues[i] || { optionIndex: i, count: 0, avgRating: 0 };
        return {
          optionIndex: start.optionIndex,
          count: start.count + (end.count - start.count) * easeProgress,
          avgRating: (start.avgRating || 0) + ((end.avgRating || 0) - (start.avgRating || 0)) * easeProgress,
        };
      });

      setAnimatedResults(newResults);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [results]);

  const renderPieChart = () => {
    const size = 280;
    const center = size / 2;
    const outerRadius = 110;
    const innerRadius = 70;
    const totalVotes = animatedResults.reduce((sum, r) => sum + r.count, 0);

    if (totalVotes === 0) {
      return (
        <div style={styles.emptyChart}>
          <p style={{ color: '#94a3b8' }}>暂无投票数据</p>
        </div>
      );
    }

    let currentAngle = -Math.PI / 2;
    const segments = animatedResults.map((result, index) => {
      const percentage = result.count / totalVotes;
      const angle = percentage * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      const x1 = center + outerRadius * Math.cos(startAngle);
      const y1 = center + outerRadius * Math.sin(startAngle);
      const x2 = center + outerRadius * Math.cos(endAngle);
      const y2 = center + outerRadius * Math.sin(endAngle);
      const x3 = center + innerRadius * Math.cos(endAngle);
      const y3 = center + innerRadius * Math.sin(endAngle);
      const x4 = center + innerRadius * Math.cos(startAngle);
      const y4 = center + innerRadius * Math.sin(startAngle);

      const largeArc = angle > Math.PI ? 1 : 0;

      const pathData = [
        `M ${x1} ${y1}`,
        `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${x3} ${y3}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
        'Z',
      ].join(' ');

      return (
        <g key={index}>
          <path
            d={pathData}
            fill={COLORS[index % COLORS.length]}
            style={{ transition: 'all 0.3s ease' }}
          />
        </g>
      );
    });

    return (
      <div style={styles.chartWrapper}>
        <svg width={size} height={size} style={styles.svg}>
          {segments}
          <text x={center} y={center - 8} textAnchor="middle" style={styles.centerText}>
            {Math.round(totalVotes)}
          </text>
          <text x={center} y={center + 16} textAnchor="middle" style={styles.centerSubtext}>
            总票数
          </text>
        </svg>
        <div style={styles.legend}>
          {animatedResults.map((result, index) => (
            <div key={index} style={styles.legendItem}>
              <div
                style={{
                  ...styles.legendColor,
                  backgroundColor: COLORS[index % COLORS.length],
                }}
              />
              <span style={styles.legendLabel}>{options[result.optionIndex]}</span>
              <span style={styles.legendValue}>
                {Math.round(result.count)} ({totalVotes > 0 ? ((result.count / totalVotes) * 100).toFixed(1) : 0}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderBarChart = () => {
    const maxValue = Math.max(...animatedResults.map(r => r.avgRating || r.count), 1);
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
          {animatedResults.map((result, index) => {
            const value = result.avgRating || result.count;
            const height = (value / maxValue) * (chartHeight - 40);
            const x = index * (barWidth + gap);
            const y = chartHeight - height;

            return (
              <g key={index}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={height}
                  fill={COLORS[index % COLORS.length]}
                  rx={6}
                  style={{ transition: 'all 0.3s ease' }}
                />
                <text
                  x={x + barWidth / 2}
                  y={y - 8}
                  textAnchor="middle"
                  style={styles.barValue}
                >
                  {type === 'rating' ? (result.avgRating || 0).toFixed(1) : Math.round(result.count)}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 20}
                  textAnchor="middle"
                  style={styles.barLabel}
                >
                  {options[result.optionIndex]?.substring(0, 6)}
                  {options[result.optionIndex]?.length > 6 ? '...' : ''}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  const renderHorizontalBarChart = () => {
    const maxValue = Math.max(...animatedResults.map(r => r.count), 1);
    const barHeight = 32;
    const gap = 12;
    const chartHeight = options.length * (barHeight + gap) - gap;
    const chartWidth = 400;

    return (
      <div style={styles.chartWrapper}>
        <svg width={chartWidth} height={chartHeight + 20} style={styles.svg}>
          {animatedResults
            .slice()
            .sort((a, b) => b.count - a.count)
            .map((result, index) => {
              const value = result.count;
              const width = (value / maxValue) * (chartWidth - 120);
              const y = index * (barHeight + gap);

              return (
                <g key={result.optionIndex}>
                  <text
                    x={0}
                    y={y + barHeight / 2 + 4}
                    style={styles.hBarLabel}
                  >
                    {options[result.optionIndex]?.substring(0, 8)}
                    {options[result.optionIndex]?.length > 8 ? '...' : ''}
                  </text>
                  <rect
                    x={100}
                    y={y}
                    width={width}
                    height={barHeight}
                    fill={COLORS[result.optionIndex % COLORS.length]}
                    rx={6}
                    style={{ transition: 'all 0.3s ease' }}
                  />
                  <text
                    x={100 + width + 8}
                    y={y + barHeight / 2 + 4}
                    style={styles.hBarValue}
                  >
                    {Math.round(value)} 票
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
