import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import type { ChartSession } from '../types';
import './ComparisonChart.css';

interface ComparisonChartProps {
  chartSessions: ChartSession[];
  onRemoveSession: (sessionId: string) => void;
  onToggleVisibility: (sessionId: string) => void;
  onReorderSessions: (fromIndex: number, toIndex: number) => void;
  onDropSession: (sessionId: string) => void;
  addedSessionIds: string[];
}

interface ChartDataPoint {
  timeIndex: number;
  timeLabel: string;
  [key: string]: number | string;
}

interface SelectionState {
  startIndex: number;
  endIndex: number;
  startX: number;
  currentX: number;
  isSelecting: boolean;
}

function formatTimeLabel(isoString: string): string {
  const date = new Date(isoString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

const ANIMATION_DURATION = 800;

function ComparisonChart({
  chartSessions,
  onRemoveSession,
  onToggleVisibility,
  onReorderSessions,
  onDropSession,
  addedSessionIds,
}: ComparisonChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [selectionResult, setSelectionResult] = useState<{
    startIndex: number;
    endIndex: number;
    conversions: { name: string; rate: number; color: string }[];
  } | null>(null);
  const [dragOverChart, setDragOverChart] = useState(false);
  const [animatedSessions, setAnimatedSessions] = useState<Set<string>>(new Set());
  const [draggedLegendIndex, setDraggedLegendIndex] = useState<number | null>(null);
  const [dragOverLegendIndex, setDragOverLegendIndex] = useState<number | null>(null);

  const visibleSessions = chartSessions.filter((s) => s.visible);

  useEffect(() => {
    const styleId = 'flash-analytics-line-animations';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    chartSessions.forEach((cs) => {
      if (!animatedSessions.has(cs.session.id)) {
        const timer = setTimeout(() => {
          if (!svgRef.current) {
            const svg = chartWrapperRef.current?.querySelector('svg');
            if (svg) svgRef.current = svg as SVGSVGElement;
          }
          if (svgRef.current) {
            const paths = svgRef.current.querySelectorAll<SVGPathElement>(
              `path.recharts-curve.recharts-line-curve`
            );
            const sessionIndex = chartSessions.findIndex(
              (s) => s.session.id === cs.session.id
            );
            const visibleIndex = visibleSessions.findIndex(
              (s) => s.session.id === cs.session.id
            );
            const pathIndex = visibleIndex >= 0 ? visibleIndex : sessionIndex;
            const path = paths[pathIndex];
            if (path) {
              try {
                const totalLength = path.getTotalLength();
                const animName = `drawLine_${cs.session.id.replace(/-/g, '_')}`;
                if (styleEl && !styleEl.textContent?.includes(animName)) {
                  styleEl.textContent += `
                    @keyframes ${animName} {
                      from { stroke-dashoffset: ${totalLength}; }
                      to { stroke-dashoffset: 0; }
                    }
                  `;
                }
                path.style.strokeDasharray = String(totalLength);
                path.style.strokeDashoffset = String(totalLength);
                path.style.animation = `${animName} ${ANIMATION_DURATION}ms ease-out forwards`;
                setAnimatedSessions((prev) => new Set(prev).add(cs.session.id));
              } catch (err) {
                console.warn('获取路径长度失败:', err);
                setAnimatedSessions((prev) => new Set(prev).add(cs.session.id));
              }
            } else {
              setAnimatedSessions((prev) => new Set(prev).add(cs.session.id));
            }
          } else {
            setAnimatedSessions((prev) => new Set(prev).add(cs.session.id));
          }
        }, 50);
        return () => clearTimeout(timer);
      }
    });
  }, [chartSessions, animatedSessions, visibleSessions]);

  const maxTimePoints = useMemo(() => {
    if (visibleSessions.length === 0) return 480;
    return Math.max(...visibleSessions.map((s) => s.session.data.length));
  }, [visibleSessions]);

  const chartData: ChartDataPoint[] = useMemo(() => {
    if (visibleSessions.length === 0) {
      return [];
    }

    const data: ChartDataPoint[] = [];
    for (let i = 0; i < maxTimePoints; i++) {
      const point: ChartDataPoint = {
        timeIndex: i,
        timeLabel: '',
      };

      visibleSessions.forEach((cs) => {
        const dataPoint = cs.session.data[i];
        if (dataPoint) {
          point[`pv_${cs.session.id}`] = dataPoint.pv;
          point[`orders_${cs.session.id}`] = dataPoint.orders;
          point[`conversion_${cs.session.id}`] =
            dataPoint.pv > 0 ? (dataPoint.orders / dataPoint.pv) * 100 : 0;
          if (i === 0 || !point.timeLabel) {
            point.timeLabel = formatTimeLabel(dataPoint.timestamp);
          }
        }
      });

      data.push(point);
    }
    return data;
  }, [visibleSessions, maxTimePoints]);

  const calculateAverageConversion = useCallback(
    (startIndex: number, endIndex: number) => {
      const results: { name: string; rate: number; color: string }[] = [];

      visibleSessions.forEach((cs) => {
        const start = Math.max(0, Math.min(startIndex, endIndex));
        const end = Math.min(cs.session.data.length - 1, Math.max(startIndex, endIndex));

        let totalPv = 0;
        let totalOrders = 0;

        for (let i = start; i <= end; i++) {
          const dp = cs.session.data[i];
          if (dp) {
            totalPv += dp.pv;
            totalOrders += dp.orders;
          }
        }

        const avgRate = totalPv > 0 ? (totalOrders / totalPv) * 100 : 0;
        results.push({
          name: cs.session.name,
          rate: avgRate,
          color: cs.color,
        });
      });

      return results;
    },
    [visibleSessions]
  );

  const getChartArea = useCallback(() => {
    if (!chartWrapperRef.current) return null;
    const rect = chartWrapperRef.current.getBoundingClientRect();
    const chartLeft = 70;
    const chartRight = rect.width - 40;
    const chartWidth = chartRight - chartLeft;
    const chartTop = 50;
    const chartBottom = rect.height - 30;
    return { rect, chartLeft, chartRight, chartWidth, chartTop, chartBottom };
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!chartWrapperRef.current || chartSessions.length === 0) return;
      if (e.button !== 0) return;

      const area = getChartArea();
      if (!area) return;

      const x = e.clientX - area.rect.left - area.chartLeft;
      const y = e.clientY - area.rect.top - area.chartTop;

      if (x < 0 || x > area.chartWidth || y < 0 || y > area.chartBottom - area.chartTop) return;

      const timeIndex = Math.round((x / area.chartWidth) * (maxTimePoints - 1));

      setSelection({
        startIndex: timeIndex,
        endIndex: timeIndex,
        startX: x,
        currentX: x,
        isSelecting: true,
      });
      setSelectionResult(null);
    },
    [chartSessions.length, getChartArea, maxTimePoints]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!selection?.isSelecting || !chartWrapperRef.current) return;

      const area = getChartArea();
      if (!area) return;

      const x = Math.max(0, Math.min(area.chartWidth, e.clientX - area.rect.left - area.chartLeft));
      const timeIndex = Math.round((x / area.chartWidth) * (maxTimePoints - 1));

      setSelection((prev) =>
        prev ? { ...prev, currentX: x, endIndex: timeIndex } : prev
      );
    },
    [selection, getChartArea, maxTimePoints]
  );

  const handleMouseUp = useCallback(() => {
    if (!selection?.isSelecting) return;

    const start = Math.min(selection.startIndex, selection.endIndex);
    const end = Math.max(selection.startIndex, selection.endIndex);

    if (end - start > 2) {
      const conversions = calculateAverageConversion(start, end);
      setSelectionResult({ startIndex: start, endIndex: end, conversions });
    } else {
      setSelection(null);
      setSelectionResult(null);
    }

    setSelection((prev) => (prev ? { ...prev, isSelecting: false } : prev));
  }, [selection, calculateAverageConversion]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (selection?.isSelecting) {
        handleMouseUp();
      }
    };
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [selection, handleMouseUp]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverChart(true);
  };

  const handleDragLeave = () => {
    setDragOverChart(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverChart(false);
    const sessionId = e.dataTransfer.getData('sessionId');
    if (sessionId && !addedSessionIds.includes(sessionId)) {
      onDropSession(sessionId);
    }
  };

  const handleLegendDragStart = (e: React.DragEvent, index: number) => {
    setDraggedLegendIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleLegendDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverLegendIndex(index);
  };

  const handleLegendDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedLegendIndex !== null && draggedLegendIndex !== toIndex) {
      onReorderSessions(draggedLegendIndex, toIndex);
    }
    setDraggedLegendIndex(null);
    setDragOverLegendIndex(null);
  };

  const handleLegendDragEnd = () => {
    setDraggedLegendIndex(null);
    setDragOverLegendIndex(null);
  };

  const xAxisTicks = useMemo(() => {
    if (maxTimePoints <= 0) return [];
    const ticks: number[] = [];
    const step = Math.floor(maxTimePoints / 8);
    for (let i = 0; i < maxTimePoints; i += step) {
      ticks.push(i);
    }
    return ticks;
  }, [maxTimePoints]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const timeLabel = payload[0]?.payload?.timeLabel;
      return (
        <div className="custom-tooltip">
          <div className="tooltip-time">{timeLabel}</div>
          {visibleSessions.map((cs) => {
            const pvKey = `pv_${cs.session.id}`;
            const ordersKey = `orders_${cs.session.id}`;
            const pv = payload.find((p: any) => p.dataKey === pvKey)?.value;
            const orders = payload.find((p: any) => p.dataKey === ordersKey)?.value;
            const rate = pv && pv > 0 ? ((orders / pv) * 100).toFixed(2) : '0.00';
            return (
              <div key={cs.session.id} className="tooltip-item">
                <span
                  className="tooltip-dot"
                  style={{ backgroundColor: cs.color }}
                />
                <span className="tooltip-name">{cs.session.name}</span>
                <span className="tooltip-values">
                  PV: {pv?.toLocaleString() || 0} | 订单: {orders || 0} | 转化率: {rate}%
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const selectionLabelLeft = useMemo(() => {
    if (!selectionResult || !chartWrapperRef.current) return 0;
    const area = getChartArea();
    if (!area) return 0;
    const centerIndex = (selectionResult.startIndex + selectionResult.endIndex) / 2;
    return area.chartLeft + (centerIndex / (maxTimePoints - 1)) * area.chartWidth;
  }, [selectionResult, maxTimePoints, getChartArea]);

  return (
    <div className="comparison-chart" ref={chartRef}>
      <div className="chart-header">
        <div className="chart-title-row">
          <h2 className="chart-title">流量与转化对比</h2>
          {selectionResult && (
            <button
              className="clear-selection-btn"
              onClick={() => {
                setSelection(null);
                setSelectionResult(null);
              }}
            >
              清除选区
            </button>
          )}
        </div>
        <div className="chart-legend">
          {chartSessions.map((cs, index) => (
            <div
              key={cs.session.id}
              className={`legend-item ${cs.visible ? '' : 'hidden'} ${
                draggedLegendIndex === index ? 'dragging' : ''
              } ${dragOverLegendIndex === index ? 'drag-over' : ''}`}
              draggable
              onDragStart={(e) => handleLegendDragStart(e, index)}
              onDragOver={(e) => handleLegendDragOver(e, index)}
              onDrop={(e) => handleLegendDrop(e, index)}
              onDragEnd={handleLegendDragEnd}
            >
              <span
                className="legend-color"
                style={{ backgroundColor: cs.visible ? cs.color : 'rgba(229, 231, 235, 0.3)' }}
                onClick={() => onToggleVisibility(cs.session.id)}
              />
              <span
                className="legend-name"
                onClick={() => onToggleVisibility(cs.session.id)}
              >
                {cs.session.name}
              </span>
              <button
                className="legend-remove"
                onClick={() => onRemoveSession(cs.session.id)}
                title="移除"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <div
        className={`chart-container ${dragOverChart ? 'drag-over' : ''}`}
        ref={chartWrapperRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {chartSessions.length === 0 ? (
          <div className="empty-chart">
            <div className="empty-chart-icon">📈</div>
            <p className="empty-chart-text">从左侧拖拽场次卡片到这里开始对比</p>
            <p className="empty-chart-sub">最多支持同时对比 6 个场次</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 50, right: 30, left: 10, bottom: 30 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(229, 231, 235, 0.08)"
                />
                <XAxis
                  dataKey="timeIndex"
                  ticks={xAxisTicks}
                  tick={{ fill: 'rgba(229, 231, 235, 0.5)', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(229, 231, 235, 0.2)' }}
                  tickLine={{ stroke: 'rgba(229, 231, 235, 0.2)' }}
                  tickFormatter={(value) => {
                    const point = chartData[value];
                    return point?.timeLabel || '';
                  }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: 'rgba(229, 231, 235, 0.5)', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(229, 231, 235, 0.2)' }}
                  tickLine={{ stroke: 'rgba(229, 231, 235, 0.2)' }}
                  tickFormatter={(value) => value.toLocaleString()}
                  width={60}
                />
                <Tooltip content={<CustomTooltip />} />

                {visibleSessions.map((cs) => (
                  <Line
                    key={`pv_${cs.session.id}`}
                    type="monotone"
                    dataKey={`pv_${cs.session.id}`}
                    stroke={cs.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2 }}
                    isAnimationActive={false}
                    strokeOpacity={cs.visible ? 1 : 0.2}
                  />
                ))}

                {selection && selectionResult && (
                  <ReferenceArea
                    x1={Math.min(selectionResult.startIndex, selectionResult.endIndex)}
                    x2={Math.max(selectionResult.startIndex, selectionResult.endIndex)}
                    stroke="none"
                    fill="#3498db"
                    fillOpacity={0.15}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>

            {selection && selection.isSelecting && chartWrapperRef.current && (
              <div
                className="selection-overlay"
                style={{
                  left: `${70 + Math.min(selection.startX, selection.currentX)}px`,
                  width: `${Math.abs(selection.currentX - selection.startX)}px`,
                  top: `${50}px`,
                  bottom: `${30}px`,
                }}
              />
            )}

            {selectionResult && (
              <div
                className="selection-label"
                style={{
                  left: `${selectionLabelLeft}px`,
                }}
              >
                <div className="selection-label-title">转化率对比</div>
                {selectionResult.conversions.map((c) => (
                  <div key={c.name} className="selection-label-item">
                    <span
                      className="selection-label-dot"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="selection-label-name">{c.name}</span>
                    <span className="selection-label-value">{c.rate.toFixed(2)}%</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {dragOverChart && (
          <div className="drop-hint">
            <span className="drop-hint-icon">➕</span>
            <span>松开鼠标添加到此对比</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ComparisonChart;
