import { useRef, useEffect, useMemo } from "react";

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

export default function SentimentChart({ segments, currentTime, duration }: SentimentChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const points = useMemo(() => {
    if (segments.length === 0) return [];
    return segments.map((seg) => ({
      x: seg.startTime,
      y: seg.sentiment,
    }));
  }, [segments]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    const padding = { top: 10, right: 10, bottom: 10, left: 10 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const toX = (time: number) => padding.left + (time / duration) * chartW;
    const toY = (sentiment: number) => padding.top + (1 - sentiment) * chartH;

    const gradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
    gradient.addColorStop(0, "rgba(248, 113, 113, 0.2)");
    gradient.addColorStop(1, "rgba(52, 211, 153, 0.2)");

    ctx.beginPath();
    ctx.moveTo(toX(points[0].x), toY(points[0].y));
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (toX(prev.x) + toX(curr.x)) / 2;
      ctx.bezierCurveTo(cpx, toY(prev.y), cpx, toY(curr.y), toX(curr.x), toY(curr.y));
    }
    ctx.lineTo(toX(points[points.length - 1].x), h - padding.bottom);
    ctx.lineTo(toX(points[0].x), h - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    const lineGradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
    lineGradient.addColorStop(0, "#f87171");
    lineGradient.addColorStop(1, "#34d399");

    ctx.beginPath();
    ctx.moveTo(toX(points[0].x), toY(points[0].y));
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (toX(prev.x) + toX(curr.x)) / 2;
      ctx.bezierCurveTo(cpx, toY(prev.y), cpx, toY(curr.y), toX(curr.x), toY(curr.y));
    }
    ctx.strokeStyle = lineGradient;
    ctx.lineWidth = 2;
    ctx.stroke();

    if (duration > 0) {
      const indicatorX = toX(currentTime);
      ctx.beginPath();
      ctx.moveTo(indicatorX, padding.top);
      ctx.lineTo(indicatorX, h - padding.bottom);
      ctx.strokeStyle = "rgba(167, 139, 250, 0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [points, currentTime, duration]);

  if (segments.length === 0) {
    return (
      <div className="flex h-[120px] items-center justify-center text-sm text-gray-400">
        暂无情感数据
      </div>
    );
  }

  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-gray-600">情感曲线</h4>
      <canvas
        ref={canvasRef}
        className="h-[120px] w-full rounded-lg bg-white"
        style={{ display: "block" }}
      />
    </div>
  );
}
