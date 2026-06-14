import { useRef, useEffect, useState, useCallback } from "react";

interface TranscriptSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  sentiment: number;
}

interface SentimentChartProps {
  segments: TranscriptSegment[];
  currentTime: number;
  duration: number;
}

interface TooltipData {
  clientX: number;
  clientY: number;
  text: string;
  sentiment: number;
}

function catmullRomToBezier(
  p0x: number, p0y: number,
  p1x: number, p1y: number,
  p2x: number, p2y: number,
  p3x: number, p3y: number,
  tension: number = 0.5
): { cp1x: number; cp1y: number; cp2x: number; cp2y: number } {
  const t = tension;
  const cp1x = p1x + (p2x - p0x) * t / 6;
  const cp1y = p1y + (p2y - p0y) * t / 6;
  const cp2x = p2x - (p3x - p1x) * t / 6;
  const cp2y = p2y - (p3y - p1y) * t / 6;
  return { cp1x, cp1y, cp2x, cp2y };
}

export default function SentimentChart({ segments, currentTime, duration }: SentimentChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const paddingRef = useRef({ top: 10, right: 10, bottom: 10, left: 10 });

  const points = segments.map((seg) => ({
    x: seg.startTime + (seg.endTime - seg.startTime) / 2,
    y: seg.sentiment,
    text: seg.text,
  }));

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const padding = paddingRef.current;
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const toX = (time: number) => padding.left + (time / duration) * chartW;
    const toY = (sentiment: number) =>
      padding.top + ((1 - sentiment) / 2) * chartH;

    ctx.clearRect(0, 0, w, h);

    const zeroY = toY(0);
    ctx.beginPath();
    ctx.moveTo(padding.left, zeroY);
    ctx.lineTo(w - padding.right, zeroY);
    ctx.strokeStyle = "rgba(200, 200, 200, 0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const fillGradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
    fillGradient.addColorStop(0, "rgba(52, 211, 153, 0.25)");
    fillGradient.addColorStop(0.5, "rgba(167, 139, 250, 0.2)");
    fillGradient.addColorStop(1, "rgba(248, 113, 113, 0.25)");

    const lineGradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
    lineGradient.addColorStop(0, "#34d399");
    lineGradient.addColorStop(0.5, "#a78bfa");
    lineGradient.addColorStop(1, "#f87171");

    const tension = 1.0;

    const drawPoints = points.map(p => ({
      x: toX(p.x),
      y: toY(p.y),
    }));

    ctx.beginPath();

    if (drawPoints.length === 1) {
      const p = drawPoints[0];
      ctx.moveTo(p.x - 2, p.y);
      ctx.lineTo(p.x + 2, p.y);
    } else if (drawPoints.length === 2) {
      ctx.moveTo(drawPoints[0].x, drawPoints[0].y);
      const midX = (drawPoints[0].x + drawPoints[1].x) / 2;
      const midY = (drawPoints[0].y + drawPoints[1].y) / 2;
      ctx.quadraticCurveTo(midX, midY, drawPoints[1].x, drawPoints[1].y);
    } else {
      ctx.moveTo(drawPoints[0].x, drawPoints[0].y);

      for (let i = 0; i < drawPoints.length - 1; i++) {
        const p0 = drawPoints[i === 0 ? 0 : i - 1];
        const p1 = drawPoints[i];
        const p2 = drawPoints[i + 1];
        const p3 = drawPoints[i + 2 < drawPoints.length ? i + 2 : i + 1];

        const { cp1x, cp1y, cp2x, cp2y } = catmullRomToBezier(
          p0.x, p0.y,
          p1.x, p1.y,
          p2.x, p2.y,
          p3.x, p3.y,
          tension
        );

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      }
    }

    const linePath = new Path2D();
    if (drawPoints.length === 1) {
      const p = drawPoints[0];
      linePath.moveTo(p.x - 2, p.y);
      linePath.lineTo(p.x + 2, p.y);
    } else if (drawPoints.length === 2) {
      linePath.moveTo(drawPoints[0].x, drawPoints[0].y);
      const midX = (drawPoints[0].x + drawPoints[1].x) / 2;
      const midY = (drawPoints[0].y + drawPoints[1].y) / 2;
      linePath.quadraticCurveTo(midX, midY, drawPoints[1].x, drawPoints[1].y);
    } else {
      linePath.moveTo(drawPoints[0].x, drawPoints[0].y);
      for (let i = 0; i < drawPoints.length - 1; i++) {
        const p0 = drawPoints[i === 0 ? 0 : i - 1];
        const p1 = drawPoints[i];
        const p2 = drawPoints[i + 1];
        const p3 = drawPoints[i + 2 < drawPoints.length ? i + 2 : i + 1];

        const { cp1x, cp1y, cp2x, cp2y } = catmullRomToBezier(
          p0.x, p0.y,
          p1.x, p1.y,
          p2.x, p2.y,
          p3.x, p3.y,
          tension
        );

        linePath.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      }
    }

    const fillPath = new Path2D(linePath);
    fillPath.lineTo(drawPoints[drawPoints.length - 1].x, h - padding.bottom);
    fillPath.lineTo(drawPoints[0].x, h - padding.bottom);
    fillPath.closePath();

    ctx.fillStyle = fillGradient;
    ctx.fill(fillPath);

    ctx.strokeStyle = lineGradient;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke(linePath);

    if (duration > 0) {
      const indicatorX = toX(currentTime);
      ctx.beginPath();
      ctx.moveTo(indicatorX, padding.top);
      ctx.lineTo(indicatorX, h - padding.bottom);
      ctx.strokeStyle = "rgba(167, 139, 250, 0.75)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [points, currentTime, duration]);

  useEffect(() => {
    drawChart();
  }, [drawChart]);

  useEffect(() => {
    const handleResize = () => drawChart();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawChart]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || points.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = (canvas.width / window.devicePixelRatio) / rect.width;
    const scaleY = (canvas.height / window.devicePixelRatio) / rect.height;

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const padding = paddingRef.current;
    const chartW = (canvas.width / window.devicePixelRatio) - padding.left - padding.right;

    const time = ((mouseX - padding.left) / chartW) * duration;

    let nearestIndex = 0;
    let minDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const dist = Math.abs(points[i].x - time);
      if (dist < minDist) {
        minDist = dist;
        nearestIndex = i;
      }
    }

    const chartH = (canvas.height / window.devicePixelRatio) - padding.top - padding.bottom;
    const pointX = padding.left + (points[nearestIndex].x / duration) * chartW;
    const pointY = padding.top + ((1 - points[nearestIndex].y) / 2) * chartH;

    const distance = Math.sqrt((mouseX - pointX) ** 2 + (mouseY - pointY) ** 2);
    const threshold = Math.max(40, chartW / points.length * 1.5);

    if (distance < threshold) {
      setTooltip({
        clientX: e.clientX,
        clientY: e.clientY,
        text: points[nearestIndex].text,
        sentiment: points[nearestIndex].y,
      });
    } else {
      setTooltip(null);
    }
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  if (segments.length === 0) {
    return (
      <div className="flex h-[120px] items-center justify-center text-sm text-gray-400">
        暂无情感数据
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <h4 className="mb-2 text-sm font-semibold text-gray-600">情感曲线</h4>
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="h-[120px] w-full cursor-crosshair rounded-lg bg-white"
          style={{ display: "block" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
        {tooltip && (
          <div
            className="pointer-events-none fixed z-[9999] rounded-lg bg-dark px-3 py-2 text-xs text-white shadow-xl"
            style={{
              left: `${tooltip.clientX + 14}px`,
              top: `${tooltip.clientY + 14}px`,
              maxWidth: "240px",
            }}
          >
            <div className="mb-1 line-clamp-2 leading-snug">{tooltip.text}</div>
            <div className="text-[11px] text-gray-300">
              情感值: {tooltip.sentiment >= 0 ? "+" : ""}
              {tooltip.sentiment.toFixed(2)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
