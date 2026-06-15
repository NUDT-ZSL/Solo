import { useRef, useEffect, useState } from 'react';
import { BurndownPoint } from '../App';

interface BurndownChartProps {
  data: BurndownPoint[];
}

const PADDING = { top: 20, right: 20, bottom: 40, left: 50 };

function BurndownChart({ data }: BurndownChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; point: BurndownPoint } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper || data.length === 0) return;

    const rect = wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width;
    const height = 300;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const chartWidth = width - PADDING.left - PADDING.right;
    const chartHeight = height - PADDING.top - PADDING.bottom;

    const maxY = Math.max(...data.map((d) => Math.max(d.ideal, d.actual)), 1) * 1.1;
    const ySteps = Math.ceil(maxY / 10) || 1;
    const yMax = ySteps * 10;

    ctx.strokeStyle = '#2A2A4A';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (let i = 0; i <= ySteps; i++) {
      const y = PADDING.top + (chartHeight / ySteps) * i;
      ctx.beginPath();
      ctx.moveTo(PADDING.left, y);
      ctx.lineTo(width - PADDING.right, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.fillStyle = '#888';
    ctx.font = '11px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= ySteps; i++) {
      const y = PADDING.top + (chartHeight / ySteps) * i;
      const value = Math.round(yMax - (yMax / ySteps) * i);
      ctx.fillText(`${value}h`, PADDING.left - 6, y);
    }

    const xStep = data.length > 1 ? chartWidth / (data.length - 1) : 0;
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const labelInterval = Math.max(1, Math.ceil(data.length / 7));
    data.forEach((d, i) => {
      if (i % labelInterval === 0 || i === data.length - 1) {
        const x = PADDING.left + xStep * i;
        const dateStr = d.date.slice(5);
        ctx.fillText(dateStr, x, height - PADDING.bottom + 8);
      }
    });

    const getX = (i: number) => PADDING.left + xStep * i;
    const getY = (v: number) => PADDING.top + chartHeight - (v / yMax) * chartHeight;

    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = getX(i);
      const y = getY(d.ideal);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = '#FF3B30';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = getX(i);
      const y = getY(d.actual);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    data.forEach((d, i) => {
      const x = getX(i);
      const y = getY(d.actual);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#FF3B30';
      ctx.fill();
      ctx.strokeStyle = '#16213E';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    (canvas as any)._points = data.map((d, i) => ({ x: getX(i), y: getY(d.actual), point: d }));
  }, [data]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !(canvas as any)._points) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const points = (canvas as any)._points as { x: number; y: number; point: BurndownPoint }[];
    let nearest: { x: number; y: number; point: BurndownPoint } | null = null;
    let minDist = Infinity;
    for (const p of points) {
      const dist = Math.abs(p.x - mx);
      if (dist < minDist && dist < 30) {
        minDist = dist;
        nearest = p;
      }
    }
    if (nearest) {
      setTooltip({ x: nearest.x, y: nearest.y, point: nearest.point });
    } else {
      setTooltip(null);
    }
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  return (
    <div className="burndown-container">
      <div className="burndown-title">燃尽图</div>
      <div className="burndown-canvas-wrapper" ref={wrapperRef}>
        <canvas
          ref={canvasRef}
          className="burndown-canvas"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
        {tooltip && (
          <div className="tooltip" style={{ left: tooltip.x, top: tooltip.y - 10 }}>
            <div className="tooltip-date">{tooltip.point.date}</div>
            <div className="tooltip-value">
              <span className="tooltip-ideal">理想: {tooltip.point.ideal}h</span>
              <span className="tooltip-actual">实际: {tooltip.point.actual}h</span>
            </div>
          </div>
        )}
      </div>
      <div className="legend">
        <div className="legend-item">
          <div className="legend-line ideal" />
          <span>理想线</span>
        </div>
        <div className="legend-item">
          <div className="legend-line actual" />
          <span>实际线</span>
        </div>
      </div>
    </div>
  );
}

export default BurndownChart;
