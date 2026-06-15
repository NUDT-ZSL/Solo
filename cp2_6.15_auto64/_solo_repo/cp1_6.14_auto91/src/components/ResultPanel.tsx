import React, { useRef, useEffect, useState, useCallback } from 'react';
import { NodeOutput, ChartConfig, ChartDataPoint } from '../types';

interface ResultPanelProps {
  isOpen?: boolean;
  nodeId: string | null;
  nodeType: string | null;
  output: NodeOutput | null;
  chartConfig?: ChartConfig;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  content: string;
}

const ResultPanel: React.FC<ResultPanelProps> = ({
  isOpen = true,
  nodeId,
  nodeType,
  output,
  chartConfig,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, content: '' });
  const [dataPoints, setDataPoints] = useState<Array<{ x: number; y: number; w?: number; h?: number; data: ChartDataPoint }>>([]);

  const renderBarChart = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    data: ChartDataPoint[],
    config?: ChartConfig
  ) => {
    const padding = { top: 40, right: 20, bottom: 60, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#333333';
    ctx.font = 'bold 14px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(config?.title || '柱状图', width / 2, 24);

    if (data.length === 0) return;

    const yValues = data.map((d) => d.y);
    const maxY = Math.max(...yValues) * 1.2 || 1;

    const barWidth = Math.max(10, (chartWidth / data.length) * 0.7);
    const gap = (chartWidth / data.length) * 0.3;

    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = '#999999';
      ctx.font = '11px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      const val = maxY - (maxY / 5) * i;
      ctx.fillText(val.toFixed(1), padding.left - 8, y + 4);
    }

    const points: Array<{ x: number; y: number; w: number; h: number; data: ChartDataPoint }> = [];

    data.forEach((d, i) => {
      const barH = (d.y / maxY) * chartHeight;
      const x = padding.left + i * (barWidth + gap) + gap / 2;
      const y = padding.top + chartHeight - barH;

      const gradient = ctx.createLinearGradient(x, y, x, y + barH);
      gradient.addColorStop(0, '#00a896');
      gradient.addColorStop(1, '#008574');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, [4, 4, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#666666';
      ctx.font = '11px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.save();
      ctx.translate(x + barWidth / 2, padding.top + chartHeight + 12);
      const label = String(d.x);
      if (label.length > 8) {
        ctx.rotate(-Math.PI / 6);
      }
      ctx.fillText(label.length > 12 ? label.slice(0, 12) + '…' : label, 0, 0);
      ctx.restore();

      points.push({ x, y, w: barWidth, h: barH, data: d });
    });

    setDataPoints(points);
  }, []);

  const renderLineChart = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    data: ChartDataPoint[],
    config?: ChartConfig
  ) => {
    const padding = { top: 40, right: 20, bottom: 60, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#333333';
    ctx.font = 'bold 14px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(config?.title || '折线图', width / 2, 24);

    if (data.length === 0) return;

    const yValues = data.map((d) => d.y);
    const maxY = Math.max(...yValues) * 1.2 || 1;

    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = '#999999';
      ctx.font = '11px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      const val = maxY - (maxY / 5) * i;
      ctx.fillText(val.toFixed(1), padding.left - 8, y + 4);
    }

    const points: Array<{ x: number; y: number; data: ChartDataPoint }> = [];

    const step = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth;

    ctx.beginPath();
    ctx.strokeStyle = '#00a896';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';

    data.forEach((d, i) => {
      const x = padding.left + i * step;
      const y = padding.top + chartHeight - (d.y / maxY) * chartHeight;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      points.push({ x, y, data: d });

      ctx.fillStyle = '#666666';
      ctx.font = '11px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.save();
      ctx.translate(x, padding.top + chartHeight + 12);
      const label = String(d.x);
      if (data.length > 8 && label.length > 5) {
        ctx.rotate(-Math.PI / 6);
      }
      ctx.fillText(label.length > 10 ? label.slice(0, 10) + '…' : label, 0, 0);
      ctx.restore();
    });
    ctx.stroke();

    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
    gradient.addColorStop(0, 'rgba(0, 168, 150, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 168, 150, 0.02)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(points[0].x, padding.top + chartHeight);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight);
    ctx.closePath();
    ctx.fill();

    points.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#00a896';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    setDataPoints(points.map((p) => ({ x: p.x - 8, y: p.y - 8, w: 16, h: 16, data: p.data })));
  }, []);

  const renderScatterChart = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    data: ChartDataPoint[],
    config?: ChartConfig
  ) => {
    const padding = { top: 40, right: 20, bottom: 60, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#333333';
    ctx.font = 'bold 14px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(config?.title || '散点图', width / 2, 24);

    if (data.length === 0) return;

    const yValues = data.map((d) => d.y);
    const maxY = Math.max(...yValues) * 1.2 || 1;

    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = '#999999';
      ctx.font = '11px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      const val = maxY - (maxY / 5) * i;
      ctx.fillText(val.toFixed(1), padding.left - 8, y + 4);
    }

    const points: Array<{ x: number; y: number; data: ChartDataPoint }> = [];

    const step = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth;

    data.forEach((d, i) => {
      const x = padding.left + i * step;
      const y = padding.top + chartHeight - (d.y / maxY) * chartHeight;

      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 168, 150, 0.6)';
      ctx.fill();
      ctx.strokeStyle = '#00a896';
      ctx.lineWidth = 2;
      ctx.stroke();

      points.push({ x, y, data: d });
    });

    setDataPoints(points.map((p) => ({ x: p.x - 8, y: p.y - 8, w: 16, h: 16, data: p.data })));
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !output || nodeType !== 'chart' || !chartConfig) return;
    if (!output.chartData || output.chartData.length === 0) return;

    const canvas = canvasRef.current;
    const container = chartContainerRef.current;
    if (!container) return;

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = container.clientWidth;
    const displayHeight = 280;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    switch (chartConfig.chartType) {
      case 'bar':
        renderBarChart(ctx, displayWidth, displayHeight, output.chartData, chartConfig);
        break;
      case 'line':
        renderLineChart(ctx, displayWidth, displayHeight, output.chartData, chartConfig);
        break;
      case 'scatter':
        renderScatterChart(ctx, displayWidth, displayHeight, output.chartData, chartConfig);
        break;
    }
  }, [output, nodeType, chartConfig, renderBarChart, renderLineChart, renderScatterChart]);

  const handleChartMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || dataPoints.length === 0) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let found = false;
    for (const point of dataPoints) {
      const px = point.x;
      const py = point.y;
      const pw = point.w || 16;
      const ph = point.h || 16;

      if (x >= px && x <= px + pw && y >= py && y <= py + ph) {
        setTooltip({
          visible: true,
          x: e.clientX - (chartContainerRef.current?.getBoundingClientRect().left || 0),
          y: e.clientY - (chartContainerRef.current?.getBoundingClientRect().top || 0),
          content: `${point.data.x}: ${point.data.y}`,
        });
        found = true;
        break;
      }
    }

    if (!found) {
      setTooltip((prev) => prev.visible ? { ...prev, visible: false } : prev);
    }
  }, [dataPoints]);

  const handleChartMouseLeave = useCallback(() => {
    setTooltip((prev) => prev.visible ? { ...prev, visible: false } : prev);
  }, []);

  const renderTable = () => {
    if (!output || !output.data.length || !output.columns.length) {
      return (
        <div className="no-results">
          <span className="no-results-icon">📋</span>
          <span>暂无表格数据</span>
        </div>
      );
    }

    return (
      <table className="data-table">
        <thead>
          <tr>
            {output.columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {output.data.map((row, rowIdx) => (
            <tr key={rowIdx}>
              {output.columns.map((col) => (
                <td key={col}>{String(row[col] ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderChart = () => {
    if (!output?.chartData || output.chartData.length === 0) {
      return (
        <div className="no-results">
          <span className="no-results-icon">📊</span>
          <span>暂无图表数据</span>
        </div>
      );
    }

    return (
      <div className="chart-container" ref={chartContainerRef} style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          className="chart-canvas"
          onMouseMove={handleChartMouseMove}
          onMouseLeave={handleChartMouseLeave}
        />
        {tooltip.visible && (
          <div
            className="chart-tooltip"
            style={{
              left: tooltip.x,
              top: tooltip.y,
            }}
          >
            {tooltip.content}
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (!nodeId || !output) {
      return (
        <div className="result-empty">
          点击运行按钮查看结果
        </div>
      );
    }

    if (nodeType === 'chart') {
      return renderChart();
    }

    return renderTable();
  };

  return (
    <aside className={`result-panel ${isOpen ? 'open' : ''}`}>
      <div className="result-panel-header">
        <h3 className="result-panel-title">结果预览</h3>
      </div>
      <div className="result-panel-content">
        {renderContent()}
      </div>
    </aside>
  );
};

export default ResultPanel;
