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
  x: number;
  y: number;
  text: string;
  sentiment: number;
}

function getControlPoints(
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  tension: number
): { cp1x: number; cp1y: number; cp2x: number; cp2y: number } {
  const d01 = Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2);
  const d12 = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

  const d = d01 + d12;
  if (d === 0) {
    return { cp1x: x1, cp1y: y1, cp2x: x1, cp2y: y1 };
  }

  const fa = (tension * d01) / d;
  const fb = (tension * d12) / d;

  const p1x = x1 - fa * (x2 - x0);
  const p1y = y1 - fa * (y2 - y0);
  const p2x = x1 + fb * (x2 - x0);
  const p2y = y1 + fb * (y2 - y0);

  return { cp1x: p1x, cp1y: p1y, cp2x: p2x, cp2y: p2y };
}

export default function SentimentChart({ segments, currentTime, duration }: SentimentChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

    const gradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
    gradient.addColorStop(0, "rgba(52, 211, 153, 0.2)");
    gradient.addColorStop(0.5, "rgba(167, 139, 250, 0.2)");
    gradient.addColorStop(1, "rgba(248, 113, 113, 0.2)");

    const lineGradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
    lineGradient.addColorStop(0, "#34d399");
    lineGradient.addColorStop(0.5, "#a78bfa");
    lineGradient.addColorStop(1, "#f87171");

    const tension = 0.4;

    ctx.beginPath();
    ctx.moveTo(toX(points[0].x), toY(points[0].y));

    if (points.length === 2) {
      const midX = (toX(points[0].x) + toX(points[1].x)) / 2;
      const midY = (toY(points[0].y) + toY(points[1].y)) / 2;
      ctx.quadraticCurveTo(midX, midY, toX(points[1].x), toY(points[1].y));
    } else if (points.length > 2) {
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i === 0 ? 0 : i - 1];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

        const { cp2x } = getControlPoints(
          toX(p0.x), toY(p0.y),
          toX(p1.x), toY(p1.y),
          toX(p2.x), toY(p2.y),
          tension
        );
        const { cp1x, cp1y } = getControlPoints(
          toX(p1.x), toY(p1.y),
          toX(p2.x), toY(p2.y),
          toX(p3.x), toY(p3.y),
          tension
        );

        if (i === 0) {
          ctx.moveTo(toX(p1.x), toY(p1.y));
        }

        ctx.bezierCurveTo(
          cp2x, toY(p1.y),
          cp1x, cp1y,
          toX(p2.x), toY(p2.y)
        );
      }
    }

    const strokePath = new Path2D();
    strokePath.moveTo(toX(points[0].x), toY(points[0].y));
    if (points.length === 2) {
      const midX = (toX(points[0].x) + toX(points[1].x)) / 2;
      const midY = (toY(points[0].y) + toY(points[1].y)) / 2;
      strokePath.quadraticCurveTo(midX, midY, toX(points[1].x), toY(points[1].y));
    } else if (points.length > 2) {
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i === 0 ? 0 : i - 1];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

        const { cp2x } = getControlPoints(
          toX(p0.x), toY(p0.y),
          toX(p1.x), toY(p1.y),
          toX(p2.x), toY(p2.y),
          tension
        );
        const { cp1x, cp1y } = getControlPoints(
          toX(p1.x), toY(p1.y),
          toX(p2.x), toY(p2.y),
          toX(p3.x), toY(p3.y),
          tension
        );

        if (i === 0) {
          strokePath.moveTo(toX(p1.x), toY(p1.y));
        }

        strokePath.bezierCurveTo(
          cp2x, toY(p1.y),
          cp1x, cp1y,
          toX(p2.x), toY(p2.y)
        );
      }
    }

    const fillPath = new Path2D(strokePath);
    fillPath.lineTo(toX(points[points.length - 1].x), h - padding.bottom);
    fillPath.lineTo(toX(points[0].x), h - padding.bottom);
    fillPath.closePath();

    ctx.fillStyle = gradient;
    ctx.fill(fillPath);

    ctx.strokeStyle = lineGradient;
    ctx.lineWidth = 2;
    ctx.stroke(strokePath);

    if (duration > 0) {
      const indicatorX = toX(currentTime);
      ctx.beginPath();
      ctx.moveTo(indicatorX, padding.top);
      ctx.lineTo(indicatorX, h - padding.bottom);
      ctx.strokeStyle = "rgba(167, 139, 250, 0.7)";
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
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const padding = paddingRef.current;
    const chartW = rect.width - padding.left - padding.right;

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

    const chartH = rect.height - padding.top - padding.bottom;
    const pointX = padding.left + (points[nearestIndex].x / duration) * chartW;
    const pointY = padding.top + ((1 - points[nearestIndex].y) / 2) * chartH;

    const distance = Math.sqrt((mouseX - pointX) ** 2 + (mouseY - pointY) ** 2);
    if (distance < 40) {
      setTooltip({
        x: mouseX,
        y: mouseY,
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
    <div className="relative">
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
            className="pointer-events-none absolute z-10 rounded-lg bg-dark px-3 py-2 text-xs text-white shadow-lg"
            style={{
              left: `${Math.min(tooltip.x + 12, window.innerWidth - 200)}px`,
              top: `${tooltip.y + 12}px`,
              maxWidth: "220px",
              transform: tooltip.x > window.innerWidth - 220 ? "translateX(-100%)" : "none",
            }}
          >
            <div className="mb-1 line-clamp-2">{tooltip.text}</div>
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
