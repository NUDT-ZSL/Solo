import React, { useMemo } from 'react';
import type { Report, Topic } from '../types';

interface ReportPanelProps {
  topic: Topic;
  report: Report;
  onClose: () => void;
}

const REGION_COLORS = ['#E91E63', '#3F51B5', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4', '#FF5722', '#607D8B'];

export const ReportPanel: React.FC<ReportPanelProps> = ({ topic, report, onClose }) => {
  const shuffledColors = useMemo(() => {
    return [...REGION_COLORS].sort(() => Math.random() - 0.5);
  }, []);

  const renderLineChart = () => {
    const { voteTrend } = report;
    if (voteTrend.length < 2) {
      return <div className="chart-empty">暂无足够数据</div>;
    }

    const width = 600;
    const height = 300;
    const padding = { top: 30, right: 30, bottom: 50, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxCount = Math.max(...voteTrend.map((d) => d.count));
    const minCount = 0;

    const xScale = (index: number) => padding.left + (index / (voteTrend.length - 1)) * chartWidth;
    const yScale = (count: number) =>
      padding.top + chartHeight - ((count - minCount) / (maxCount - minCount || 1)) * chartHeight;

    const points = voteTrend.map((d, i) => `${xScale(i)},${yScale(d.count)}`).join(' ');

    const pathData = voteTrend
      .map((d, i) => {
        const x = xScale(i);
        const y = yScale(d.count);
        if (i === 0) return `M ${x} ${y}`;
        const prevX = xScale(i - 1);
        const prevY = yScale(voteTrend[i - 1].count);
        const cpx = (prevX + x) / 2;
        return `C ${cpx} ${prevY}, ${cpx} ${y}, ${x} ${y}`;
      })
      .join(' ');

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
      value: Math.round(minCount + t * (maxCount - minCount)),
      y: yScale(minCount + t * (maxCount - minCount)),
    }));

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="chart-svg">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#42A5F5" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#42A5F5" stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={tick.y}
              x2={width - padding.right}
              y2={tick.y}
              stroke="#eee"
              strokeDasharray="4,4"
            />
            <text x={padding.left - 10} y={tick.y + 4} textAnchor="end" fill="#888" fontSize="12">
              {tick.value}
            </text>
          </g>
        ))}

        <path d={pathData} fill="none" stroke="#42A5F5" strokeWidth="3" strokeLinecap="round" />

        <path
          d={`${pathData} L ${xScale(voteTrend.length - 1)} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`}
          fill="url(#lineGradient)"
        />

        {voteTrend.map((d, i) => (
          <g key={i}>
            <circle cx={xScale(i)} cy={yScale(d.count)} r="5" fill="#fff" stroke="#42A5F5" strokeWidth="2" />
            <text
              x={xScale(i)}
              y={height - padding.bottom + 20}
              textAnchor="middle"
              fill="#888"
              fontSize="11"
              transform={`rotate(-30, ${xScale(i)}, ${height - padding.bottom + 15})`}
            >
              {d.time}
            </text>
          </g>
        ))}

        <text x={width / 2} y={18} textAnchor="middle" fill="#666" fontSize="14" fontWeight="500">
          投票趋势
        </text>
      </svg>
    );
  };

  const renderPieChart = () => {
    const { regionDistribution } = report;
    if (regionDistribution.length === 0) {
      return <div className="chart-empty">暂无地域数据</div>;
    }

    const width = 400;
    const height = 350;
    const centerX = width / 2;
    const centerY = height / 2 - 20;
    const radius = Math.min(centerX, centerY) - 50;

    const total = regionDistribution.reduce((sum, d) => sum + d.count, 0);

    let currentAngle = -Math.PI / 2;
    const slices = regionDistribution.map((d, i) => {
      const percentage = d.count / total;
      const startAngle = currentAngle;
      const endAngle = currentAngle + percentage * Math.PI * 2;
      currentAngle = endAngle;

      const largeArcFlag = percentage > 0.5 ? 1 : 0;

      const startX = centerX + radius * Math.cos(startAngle);
      const startY = centerY + radius * Math.sin(startAngle);
      const endX = centerX + radius * Math.cos(endAngle);
      const endY = centerY + radius * Math.sin(endAngle);

      const midAngle = (startAngle + endAngle) / 2;
      const labelX = centerX + (radius + 25) * Math.cos(midAngle);
      const labelY = centerY + (radius + 25) * Math.sin(midAngle);

      return {
        ...d,
        percentage,
        path: `M ${centerX} ${centerY} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`,
        color: shuffledColors[i % shuffledColors.length],
        labelX,
        labelY,
      };
    });

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="chart-svg">
        {slices.map((slice, i) => (
          <g key={i}>
            <path d={slice.path} fill={slice.color} stroke="#fff" strokeWidth="2" />
            <text
              x={slice.labelX}
              y={slice.labelY}
              textAnchor="middle"
              fill="#333"
              fontSize="11"
              fontWeight="500"
            >
              {slice.region} {slice.percentage > 0.05 ? `${(slice.percentage * 100).toFixed(0)}%` : ''}
            </text>
          </g>
        ))}

        <text x={centerX} y={centerY + 5} textAnchor="middle" fill="#333" fontSize="20" fontWeight="bold">
          {total}
        </text>
        <text x={centerX} y={centerY + 25} textAnchor="middle" fill="#888" fontSize="12">
          总票数
        </text>

        <text x={width / 2} y={height - 15} textAnchor="middle" fill="#666" fontSize="14" fontWeight="500">
          参与者地域分布
        </text>
      </svg>
    );
  };

  const renderTagCloud = () => {
    const { hotComments } = report;
    if (hotComments.length === 0) {
      return <div className="chart-empty">暂无评论数据</div>;
    }

    const maxFreq = Math.max(...hotComments.map((c) => c.frequency));
    const minFreq = Math.min(...hotComments.map((c) => c.frequency));

    return (
      <div className="tag-cloud">
        {hotComments.map((comment, i) => {
          const normalized = (comment.frequency - minFreq) / (maxFreq - minFreq || 1);
          const fontSize = 12 + normalized * 16;
          const opacity = 0.5 + normalized * 0.5;
          const rotation = (Math.random() - 0.5) * 20;

          return (
            <span
              key={i}
              className="tag-item"
              style={{
                fontSize: `${fontSize}px`,
                opacity,
                transform: `rotate(${rotation}deg)`,
                background: `linear-gradient(135deg, rgba(117, 117, 117, ${0.1 + normalized * 0.1}) 0%, rgba(33, 33, 33, ${0.15 + normalized * 0.15}) 100%)`,
              }}
              title={`提及 ${comment.frequency} 次`}
            >
              {comment.text}
            </span>
          );
        })}
      </div>
    );
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content report-panel">
        <button className="modal-close" onClick={onClose} aria-label="关闭">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className="modal-header">
          <h2 className="modal-title">活动复盘报告</h2>
          <p className="modal-subtitle">{topic.title}</p>
          <div className="report-stats">
            <div className="stat-item">
              <span className="stat-value">{report.totalVotes}</span>
              <span className="stat-label">总投票数</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{topic.options.length}</span>
              <span className="stat-label">选项数量</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{report.regionDistribution.length}</span>
              <span className="stat-label">覆盖地区</span>
            </div>
          </div>
        </div>

        <div className="modal-body">
          <div className="chart-section">
            <div className="chart-container">{renderLineChart()}</div>
          </div>

          <div className="chart-row">
            <div className="chart-container half">{renderPieChart()}</div>
            <div className="chart-container half">
              <h4 className="chart-title">热门评论摘要</h4>
              {renderTagCloud()}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary btn-large" onClick={onClose}>
            关闭报告
          </button>
        </div>
      </div>
    </div>
  );
};
