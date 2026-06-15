import React, { useMemo, useRef, useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Legend
} from 'recharts';
import type { DataRow, ChartConfig } from '../types';

interface ChartPanelProps {
  config: ChartConfig;
  data: DataRow[];
  onClose: (id: string) => void;
  onDragStart: (id: string, e: React.MouseEvent) => void;
  isDragging: boolean;
  dragOverPosition: number | null;
  onDragOver: (index: number) => void;
  onDrop: (targetIndex: number) => void;
  index: number;
  totalCharts: number;
  justAdded: boolean;
}

const COLORS = ['#e94560', '#0f3460', '#533483', '#e9a945'];

const ChartPanel: React.FC<ChartPanelProps> = ({
  config,
  data,
  onClose,
  onDragStart,
  isDragging,
  dragOverPosition,
  onDragOver,
  onDrop,
  index,
  totalCharts,
  justAdded
}) => {
  const [closing, setClosing] = useState(false);
  const [refAreaLeft, setRefAreaLeft] = useState<string | number | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<string | number | null>(null);
  const [zoomedData, setZoomedData] = useState<DataRow[] | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const color = COLORS[index % COLORS.length];

  const chartData = useMemo(() => {
    const sourceData = zoomedData || data;
    return sourceData.map((row) => ({
      x: row[config.xField],
      y: Number(row[config.yField]) || 0
    }));
  }, [data, zoomedData, config.xField, config.yField]);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      onClose(config.id);
    }, 300);
  }, [onClose, config.id]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('.chart-close-btn') ||
          (e.target as HTMLElement).closest('.chart-reset-btn')) {
        return;
      }
      onDragStart(config.id, e);
    },
    [onDragStart, config.id]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      onDragOver(index);
    },
    [onDragOver, index]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      onDrop(index);
    },
    [onDrop, index]
  );

  const handleZoomStart = useCallback((e: any) => {
    if (e && e.activeLabel) {
      setRefAreaLeft(e.activeLabel);
    }
  }, []);

  const handleZoomMove = useCallback((e: any) => {
    if (e && e.activeLabel && refAreaLeft) {
      setRefAreaRight(e.activeLabel);
    }
  }, [refAreaLeft]);

  const handleZoomEnd = useCallback(() => {
    if (refAreaLeft && refAreaRight) {
      const left = Math.min(
        chartData.findIndex((d) => String(d.x) === String(refAreaLeft)),
        chartData.findIndex((d) => String(d.x) === String(refAreaRight))
      );
      const right = Math.max(
        chartData.findIndex((d) => String(d.x) === String(refAreaLeft)),
        chartData.findIndex((d) => String(d.x) === String(refAreaRight))
      );
      const sourceData = zoomedData || data;
      if (left >= 0 && right >= 0 && right >= left) {
        setZoomedData(sourceData.slice(left, right + 1));
      }
    }
    setRefAreaLeft(null);
    setRefAreaRight(null);
  }, [refAreaLeft, refAreaRight, chartData, zoomedData, data]);

  const resetZoom = useCallback(() => {
    setZoomedData(null);
  }, []);

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      onMouseDown: handleZoomStart,
      onMouseMove: handleZoomMove,
      onMouseUp: handleZoomEnd
    };

    switch (config.chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
              <XAxis
                dataKey="x"
                stroke="#a0a0c0"
                tick={{ fontSize: 11 }}
                label={{ value: config.xField, position: 'insideBottom', offset: -5, fill: '#a0a0c0', fontSize: 12 }}
              />
              <YAxis
                stroke="#a0a0c0"
                tick={{ fontSize: 11 }}
                label={{ value: config.yField, angle: -90, position: 'insideLeft', fill: '#a0a0c0', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#16213e',
                  border: '1px solid #e94560',
                  borderRadius: '8px',
                  color: '#fff',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                }}
                labelStyle={{ color: '#e94560', fontWeight: 'bold' }}
                formatter={(value: number) => [value.toFixed(2), config.yField]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="y"
                name={config.yField}
                stroke={color}
                strokeWidth={2}
                dot={{ fill: color, r: 3 }}
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                animationDuration={500}
              />
              {refAreaLeft && refAreaRight && (
                <ReferenceArea
                  x1={refAreaLeft}
                  x2={refAreaRight}
                  strokeOpacity={0.3}
                  fill={color}
                  fillOpacity={0.2}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
              <XAxis
                dataKey="x"
                stroke="#a0a0c0"
                tick={{ fontSize: 11 }}
                label={{ value: config.xField, position: 'insideBottom', offset: -5, fill: '#a0a0c0', fontSize: 12 }}
              />
              <YAxis
                stroke="#a0a0c0"
                tick={{ fontSize: 11 }}
                label={{ value: config.yField, angle: -90, position: 'insideLeft', fill: '#a0a0c0', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#16213e',
                  border: '1px solid #e94560',
                  borderRadius: '8px',
                  color: '#fff',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                }}
                labelStyle={{ color: '#e94560', fontWeight: 'bold' }}
                formatter={(value: number) => [value.toFixed(2), config.yField]}
              />
              <Legend />
              <Bar
                dataKey="y"
                name={config.yField}
                fill={color}
                radius={[4, 4, 0, 0]}
                animationDuration={500}
              />
              {refAreaLeft && refAreaRight && (
                <ReferenceArea
                  x1={refAreaLeft}
                  x2={refAreaRight}
                  strokeOpacity={0.3}
                  fill={color}
                  fillOpacity={0.2}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <ScatterChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
              <XAxis
                dataKey="x"
                stroke="#a0a0c0"
                tick={{ fontSize: 11 }}
                type="category"
                label={{ value: config.xField, position: 'insideBottom', offset: -5, fill: '#a0a0c0', fontSize: 12 }}
              />
              <YAxis
                dataKey="y"
                stroke="#a0a0c0"
                tick={{ fontSize: 11 }}
                type="number"
                label={{ value: config.yField, angle: -90, position: 'insideLeft', fill: '#a0a0c0', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#16213e',
                  border: '1px solid #e94560',
                  borderRadius: '8px',
                  color: '#fff',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                }}
                labelStyle={{ color: '#e94560', fontWeight: 'bold' }}
                formatter={(value: number) => [value.toFixed(2), config.yField]}
              />
              <Legend />
              <Scatter name={`${config.xField} vs ${config.yField}`} fill={color} animationDuration={500}>
                {chartData.map((entry, i) => (
                  <circle key={i} cx={0} cy={0} r={5} fill={color} fillOpacity={0.8} />
                ))}
              </Scatter>
              {refAreaLeft && refAreaRight && (
                <ReferenceArea
                  x1={refAreaLeft}
                  x2={refAreaRight}
                  strokeOpacity={0.3}
                  fill={color}
                  fillOpacity={0.2}
                />
              )}
            </ScatterChart>
          </ResponsiveContainer>
        );
    }
  };

  const chartTypeLabel = {
    line: '折线图',
    bar: '柱状图',
    scatter: '散点图'
  };

  return (
    <div
      ref={chartRef}
      className={`chart-card ${closing ? 'chart-closing' : ''} ${isDragging ? 'chart-dragging' : ''} ${justAdded ? 'chart-just-added' : ''} ${dragOverPosition === index ? 'chart-drag-over' : ''}`}
      style={{
        '--grid-cols': totalCharts === 1 ? 1 : totalCharts === 2 ? 2 : 2,
        '--index': index
      } as React.CSSProperties}
      onMouseDown={handleMouseDown}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      draggable={false}
    >
      <div className="chart-header">
        <div className="chart-title">
          <span className="chart-type-badge" style={{ backgroundColor: color }}>
            {chartTypeLabel[config.chartType]}
          </span>
          <span className="chart-title-text">
            {config.xField} → {config.yField}
          </span>
        </div>
        <div className="chart-actions">
          {zoomedData && (
            <button
              className="chart-reset-btn"
              onClick={resetZoom}
              title="重置缩放"
            >
              ↺
            </button>
          )}
          <button
            className="chart-close-btn"
            onClick={handleClose}
            title="关闭"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="chart-body">
        {renderChart()}
      </div>
    </div>
  );
};

export default ChartPanel;
