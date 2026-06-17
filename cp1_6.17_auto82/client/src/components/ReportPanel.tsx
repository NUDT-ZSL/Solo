import React, { useMemo, useRef, useState } from 'react';
import type { DetailedReport, Topic } from '../types';

interface ReportPanelProps {
  topic: Topic;
  report: DetailedReport;
  onClose: () => void;
}

const REGION_COLORS = ['#E91E63', '#3F51B5', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4', '#FF5722', '#607D8B'];
const DEVICE_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AAE3E2'];
const SENTIMENT_COLORS = { positive: '#4CAF50', neutral: '#FF9800', negative: '#F44336' };

export const ReportPanel: React.FC<ReportPanelProps> = ({ topic, report, onClose }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const shuffledRegionColors = useMemo(() => {
    return [...REGION_COLORS].sort(() => Math.random() - 0.5);
  }, []);

  const shuffledDeviceColors = useMemo(() => {
    return [...DEVICE_COLORS].sort(() => Math.random() - 0.5);
  }, []);

  const renderLineChart = () => {
    const { hourlyTrend } = report;
    if (hourlyTrend.length < 2) {
      return <div className="chart-empty">暂无足够数据</div>;
    }

    const width = 700;
    const height = 320;
    const padding = { top: 40, right: 30, bottom: 60, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxCount = Math.max(...hourlyTrend.map((d) => d.count));
    const minCount = 0;

    const xScale = (index: number) => padding.left + (index / (hourlyTrend.length - 1)) * chartWidth;
    const yScale = (count: number) =>
      padding.top + chartHeight - ((count - minCount) / (maxCount - minCount || 1)) * chartHeight;

    const pathData = hourlyTrend
      .map((d, i) => {
        const x = xScale(i);
        const y = yScale(d.count);
        if (i === 0) return `M ${x} ${y}`;
        const prevX = xScale(i - 1);
        const prevY = yScale(hourlyTrend[i - 1].count);
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
            <stop offset="0%" stopColor="#42A5F5" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#42A5F5" stopOpacity="0" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
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

        <path
          d={`${pathData} L ${xScale(hourlyTrend.length - 1)} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`}
          fill="url(#lineGradient)"
        />

        <path
          d={pathData}
          fill="none"
          stroke="#42A5F5"
          strokeWidth="3"
          strokeLinecap="round"
          filter="url(#glow)"
        />

        {hourlyTrend.map((d, i) => (
          <g key={i}>
            <circle cx={xScale(i)} cy={yScale(d.count)} r="6" fill="#fff" stroke="#42A5F5" strokeWidth="2" />
            <text
              x={xScale(i)}
              y={yScale(d.count) - 12}
              textAnchor="middle"
              fill="#42A5F5"
              fontSize="11"
              fontWeight="600"
            >
              {d.count}
            </text>
            <text
              x={xScale(i)}
              y={height - padding.bottom + 20}
              textAnchor="middle"
              fill="#888"
              fontSize="10"
              transform={`rotate(-45, ${xScale(i)}, ${height - padding.bottom + 15})`}
            >
              {d.hour}
            </text>
          </g>
        ))}

        <text x={width / 2} y={22} textAnchor="middle" fill="#333" fontSize="16" fontWeight="600">
          每小时投票趋势
        </text>
        <text x={width / 2} y={height - 5} textAnchor="middle" fill="#999" fontSize="11">
          时间
        </text>
        <text x={12} y={height / 2} textAnchor="middle" fill="#999" fontSize="11" transform={`rotate(-90, 12, ${height / 2})`}>
          票数
        </text>
      </svg>
    );
  };

  const renderPieChart = (
    data: { name: string; value: number }[],
    title: string,
    colors: string[],
    size: number = 280
  ) => {
    if (data.length === 0) {
      return <div className="chart-empty">暂无数据</div>;
    }

    const width = size;
    const height = size + 60;
    const centerX = width / 2;
    const centerY = height / 2 - 10;
    const outerRadius = Math.min(centerX, centerY) - 40;
    const innerRadius = outerRadius * 0.5;

    const total = data.reduce((sum, d) => sum + d.value, 0);

    let currentAngle = -Math.PI / 2;
    const slices = data.map((d, i) => {
      const percentage = d.value / total;
      const startAngle = currentAngle;
      const endAngle = currentAngle + percentage * Math.PI * 2;
      currentAngle = endAngle;

      const largeArcFlag = percentage > 0.5 ? 1 : 0;

      const startX = centerX + outerRadius * Math.cos(startAngle);
      const startY = centerY + outerRadius * Math.sin(startAngle);
      const endX = centerX + outerRadius * Math.cos(endAngle);
      const endY = centerY + outerRadius * Math.sin(endAngle);

      const innerStartX = centerX + innerRadius * Math.cos(startAngle);
      const innerStartY = centerY + innerRadius * Math.sin(startAngle);
      const innerEndX = centerX + innerRadius * Math.cos(endAngle);
      const innerEndY = centerY + innerRadius * Math.sin(endAngle);

      const midAngle = (startAngle + endAngle) / 2;
      const labelX = centerX + (outerRadius + 20) * Math.cos(midAngle);
      const labelY = centerY + (outerRadius + 20) * Math.sin(midAngle);

      return {
        ...d,
        percentage,
        path: `M ${innerStartX} ${innerStartY} L ${startX} ${startY} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endX} ${endY} L ${innerEndX} ${innerEndY} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStartX} ${innerStartY} Z`,
        color: colors[i % colors.length],
        labelX,
        labelY,
      };
    });

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="chart-svg">
        {slices.map((slice, i) => (
          <g key={i}>
            <path d={slice.path} fill={slice.color} stroke="#fff" strokeWidth="2" className="pie-slice" />
            <text
              x={slice.labelX}
              y={slice.labelY}
              textAnchor="middle"
              fill="#333"
              fontSize="10"
              fontWeight="500"
            >
              {slice.name}
            </text>
            {slice.percentage > 0.08 && (
              <text
                x={centerX + (outerRadius + innerRadius) / 2 * Math.cos((slice as any).startAngle + (slice as any).percentage * Math.PI)}
                y={centerY + (outerRadius + innerRadius) / 2 * Math.sin((slice as any).startAngle + (slice as any).percentage * Math.PI)}
                textAnchor="middle"
                fill="#fff"
                fontSize="11"
                fontWeight="600"
              >
                {slice.percentage > 0.1 ? `${(slice.percentage * 100).toFixed(0)}%` : ''}
              </text>
            )}
          </g>
        ))}

        <text x={centerX} y={centerY - 5} textAnchor="middle" fill="#333" fontSize="18" fontWeight="bold">
          {total}
        </text>
        <text x={centerX} y={centerY + 12} textAnchor="middle" fill="#888" fontSize="10">
          总票数
        </text>

        <text x={width / 2} y={height - 10} textAnchor="middle" fill="#666" fontSize="13" fontWeight="500">
          {title}
        </text>
      </svg>
    );
  };

  const renderBarChart = () => {
    const { optionPerformance } = report;
    if (optionPerformance.length === 0) {
      return <div className="chart-empty">暂无数据</div>;
    }

    const width = 400;
    const height = 280;
    const padding = { top: 30, right: 20, bottom: 80, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxCount = Math.max(...optionPerformance.map((d) => d.votes));
    const barWidth = (chartWidth / optionPerformance.length) * 0.7;
    const gap = (chartWidth / optionPerformance.length) * 0.3;

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="chart-svg">
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={padding.top + chartHeight * t}
              x2={width - padding.right}
              y2={padding.top + chartHeight * t}
              stroke="#eee"
              strokeDasharray="3,3"
            />
            <text
              x={padding.left - 10}
              y={padding.top + chartHeight * t + 4}
              textAnchor="end"
              fill="#888"
              fontSize="11"
            >
              {Math.round(maxCount * (1 - t))}
            </text>
          </g>
        ))}

        {optionPerformance.map((opt, i) => {
          const barHeight = (opt.votes / maxCount) * chartHeight;
          const x = padding.left + i * (barWidth + gap) + gap / 2;
          const y = padding.top + chartHeight - barHeight;

          return (
            <g key={opt.optionId}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={opt.color}
                rx="4"
                className="bar-rect"
              />
              <text
                x={x + barWidth / 2}
                y={y - 8}
                textAnchor="middle"
                fill="#333"
                fontSize="11"
                fontWeight="600"
              >
                {opt.percentage}%
              </text>
              <text
                x={x + barWidth / 2}
                y={height - padding.bottom + 15}
                textAnchor="middle"
                fill="#555"
                fontSize="10"
                transform={`rotate(-30, ${x + barWidth / 2}, ${height - padding.bottom + 15})`}
              >
                {opt.text.length > 6 ? opt.text.slice(0, 6) + '...' : opt.text}
              </text>
            </g>
          );
        })}

        <text x={width / 2} y={20} textAnchor="middle" fill="#333" fontSize="14" fontWeight="600">
          选项得票分布
        </text>
      </svg>
    );
  };

  const renderTagCloud = () => {
    const { commentKeywords } = report;
    if (commentKeywords.length === 0) {
      return <div className="chart-empty">暂无评论数据</div>;
    }

    const maxFreq = Math.max(...commentKeywords.map((c) => c.frequency));
    const minFreq = Math.min(...commentKeywords.map((c) => c.frequency));

    return (
      <div className="tag-cloud">
        {commentKeywords.map((item, i) => {
          const normalized = (item.frequency - minFreq) / (maxFreq - minFreq || 1);
          const fontSize = 12 + normalized * 18;
          const opacity = 0.6 + normalized * 0.4;
          const rotation = (Math.random() - 0.5) * 15;
          const color = SENTIMENT_COLORS[item.sentiment];

          return (
            <span
              key={i}
              className="tag-item keyword-tag"
              style={{
                fontSize: `${fontSize}px`,
                opacity,
                transform: `rotate(${rotation}deg)`,
                borderColor: color,
                color: color,
                background: `${color}15`,
              }}
              title={`${item.keyword} - 提及${item.frequency}次 (${item.sentiment === 'positive' ? '正面' : item.sentiment === 'neutral' ? '中性' : '负面'})`}
            >
              {item.keyword}
            </span>
          );
        })}
      </div>
    );
  };

  const renderCommentList = () => {
    const { hotComments } = report;
    if (hotComments.length === 0) return null;

    return (
      <div className="comment-list">
        <h4 className="chart-title">热门评论摘要</h4>
        <div className="comments-grid">
          {hotComments.slice(0, 8).map((comment, i) => (
            <div key={i} className="comment-item">
              <span className="comment-text">"{comment.text}"</span>
              <span className="comment-count">提及 {comment.frequency} 次</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const exportAsImage = async () => {
    if (!reportRef.current) return;
    setExporting(true);

    try {
      const svgElements = reportRef.current.querySelectorAll('svg');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const rect = reportRef.current.getBoundingClientRect();

      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;

      if (ctx) {
        ctx.scale(2, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, rect.width, rect.height);

        const svgPromises = Array.from(svgElements).map(async (svg, index) => {
          const svgData = new XMLSerializer().serializeToString(svg);
          const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(svgBlob);

          return new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              const svgRect = svg.getBoundingClientRect();
              const x = svgRect.left - rect.left;
              const y = svgRect.top - rect.top;
              ctx.drawImage(img, x, y, svgRect.width, svgRect.height);
              URL.revokeObjectURL(url);
              resolve();
            };
            img.src = url;
          });
        });

        await Promise.all(svgPromises);

        const link = document.createElement('a');
        link.download = `报告-${topic.title}-${new Date().toLocaleDateString('zh-CN')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    } catch (err) {
      console.error('导出失败:', err);
      alert('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  const exportAsPDF = () => {
    if (!reportRef.current) return;
    setExporting(true);

    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('请允许弹出窗口以导出PDF');
        setExporting(false);
        return;
      }

      const reportContent = reportRef.current.outerHTML;
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>话题互动报告 - ${topic.title}</title>
          ${styles}
          <style>
            body { margin: 0; padding: 20px; background: #fff; }
            .report-export-container { max-width: 1000px; margin: 0 auto; }
            .modal-header, .chart-section, .chart-row, .report-stats { page-break-inside: avoid; }
            @media print {
              body { padding: 0; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="report-export-container">
            ${reportContent}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.onafterprint = function() { window.close(); };
              }, 500);
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error('导出失败:', err);
      alert('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content report-panel-enhanced">
        <button className="modal-close no-print" onClick={onClose} aria-label="关闭">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div ref={reportRef} className="report-content">
          <div className="modal-header">
            <div className="report-title-section">
              <h2 className="modal-title">活动复盘报告</h2>
              <p className="modal-subtitle">{topic.title}</p>
              <p className="report-date">生成时间：{new Date().toLocaleString('zh-CN')}</p>
            </div>
            <div className="report-stats">
              <div className="stat-card">
                <span className="stat-icon">📊</span>
                <span className="stat-value">{report.totalVotes}</span>
                <span className="stat-label">总投票数</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon">⏱️</span>
                <span className="stat-value">{report.averageVotesPerHour}</span>
                <span className="stat-label">平均每小时</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon">🔥</span>
                <span className="stat-value">{report.peakVotingTime.count}</span>
                <span className="stat-label">峰值票数</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon">👥</span>
                <span className="stat-value">{report.engagementRate}%</span>
                <span className="stat-label">参与率</span>
              </div>
            </div>
          </div>

          <div className="modal-body">
            <div className="chart-section">
              <div className="chart-container full">{renderLineChart()}</div>
            </div>

            <div className="chart-row">
              <div className="chart-container half">
                {renderPieChart(
                  report.regionDistribution.map(r => ({ name: r.region, value: r.count })),
                  '参与者地域分布',
                  shuffledRegionColors,
                  300
                )}
              </div>
              <div className="chart-container half">
                {renderPieChart(
                  report.deviceDistribution.map(d => ({ name: d.device, value: d.count })),
                  '用户设备分布',
                  shuffledDeviceColors,
                  300
                )}
              </div>
            </div>

            <div className="chart-row">
              <div className="chart-container half">
                {renderBarChart()}
              </div>
              <div className="chart-container half">
                <h4 className="chart-title">热门关键词云</h4>
                {renderTagCloud()}
              </div>
            </div>

            <div className="chart-section">
              {renderCommentList()}
            </div>

            <div className="insights-section">
              <h4 className="chart-title">📈 数据洞察</h4>
              <div className="insights-grid">
                <div className="insight-card">
                  <span className="insight-icon">🏆</span>
                  <div className="insight-content">
                    <span className="insight-label">最受欢迎选项</span>
                    <span className="insight-value">
                      {report.optionPerformance[0]?.text || '-'}
                      <span className="insight-percent">({report.optionPerformance[0]?.percentage || 0}%)</span>
                    </span>
                  </div>
                </div>
                <div className="insight-card">
                  <span className="insight-icon">📍</span>
                  <div className="insight-content">
                    <span className="insight-label">最活跃地区</span>
                    <span className="insight-value">
                      {report.regionDistribution[0]?.region || '-'}
                      <span className="insight-percent">
                        ({report.regionDistribution[0]?.count || 0}票)
                      </span>
                    </span>
                  </div>
                </div>
                <div className="insight-card">
                  <span className="insight-icon">⏰</span>
                  <div className="insight-content">
                    <span className="insight-label">投票高峰时段</span>
                    <span className="insight-value">{report.peakVotingTime.time || '-'}</span>
                  </div>
                </div>
                <div className="insight-card">
                  <span className="insight-icon">📱</span>
                  <div className="insight-content">
                    <span className="insight-label">最常用设备</span>
                    <span className="insight-value">
                      {report.deviceDistribution[0]?.device || '-'}
                      <span className="insight-percent">
                        ({report.deviceDistribution[0]?.percentage || 0}%)
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer no-print">
          <div className="export-buttons">
            <button
              className="btn btn-secondary btn-large"
              onClick={exportAsImage}
              disabled={exporting}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              {exporting ? '导出中...' : '导出图片'}
            </button>
            <button
              className="btn btn-primary btn-large"
              onClick={exportAsPDF}
              disabled={exporting}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              导出PDF
            </button>
          </div>
          <button className="btn btn-secondary btn-large" onClick={onClose}>
            关闭报告
          </button>
        </div>
      </div>
    </div>
  );
};
