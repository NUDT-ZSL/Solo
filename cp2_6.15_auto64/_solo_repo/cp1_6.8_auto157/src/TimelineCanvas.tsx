import { useRef, useEffect, useState, useCallback } from "react";
import { TimelinePoint, SENTIMENT_COLORS, SENTIMENT_LABELS, Sentiment, diaryEngine } from "./DiaryEngine";
import { useDiaryStore } from "./store";
import { X, Calendar, Tag } from "lucide-react";

interface DotInfo {
  x: number;
  y: number;
  radius: number;
  point: TimelinePoint;
}

export default function TimelineCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const dotsRef = useRef<DotInfo[]>([]);
  const timeRef = useRef(0);

  const { timeline, diaries, selectedDiary, setSelectedDiary, deleteDiary } = useDiaryStore();
  const [hoveredDot, setHoveredDot] = useState<TimelinePoint | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 280 });

  const DOT_BASE_RADIUS = 10;
  const DOT_SPACING = 56;
  const BAND_Y_RATIO = 0.55;
  const PADDING_LEFT = 40;
  const PADDING_RIGHT = 40;

  const updateCanvasSize = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width;
    const height = Math.max(280, Math.min(360, window.innerHeight * 0.35));

    setCanvasSize({ width, height });

    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);
  }, []);

  useEffect(() => {
    updateCanvasSize();
    const handleResize = () => updateCanvasSize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateCanvasSize]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvasSize;
    ctx.clearRect(0, 0, width, height);

    const bandY = height * BAND_Y_RATIO;
    const points = timeline.length > 0 ? timeline : [];
    const totalDotsWidth = points.length > 0 ? (points.length - 1) * DOT_SPACING : 0;
    const startX = Math.max(PADDING_LEFT, (width - totalDotsWidth) / 2);

    timeRef.current += 0.015;
    const t = timeRef.current;

    dotsRef.current = [];

    if (points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(startX, bandY);
      for (let i = 0; i < points.length; i++) {
        const x = startX + i * DOT_SPACING;
        ctx.lineTo(x, bandY);
      }
      ctx.strokeStyle = "rgba(200, 200, 200, 0.25)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const gradient = ctx.createLinearGradient(startX, bandY, startX + totalDotsWidth, bandY);
      gradient.addColorStop(0, "rgba(245, 197, 66, 0.08)");
      gradient.addColorStop(0.5, "rgba(200, 200, 200, 0.06)");
      gradient.addColorStop(1, "rgba(107, 163, 214, 0.08)");
      ctx.beginPath();
      ctx.moveTo(startX, bandY - 20);
      ctx.lineTo(startX + totalDotsWidth, bandY - 20);
      ctx.lineTo(startX + totalDotsWidth, bandY + 20);
      ctx.lineTo(startX, bandY + 20);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const x = startX + i * DOT_SPACING;
      const color = SENTIMENT_COLORS[point.sentiment];
      const pulse = Math.sin(t + i * 0.5) * 0.15 + 1;
      const r = DOT_BASE_RADIUS * pulse;

      dotsRef.current.push({ x, y: bandY, radius: r, point });

      const glowGrad = ctx.createRadialGradient(x, bandY, 0, x, bandY, r * 3);
      glowGrad.addColorStop(0, color.replace(")", ",0.25)").replace("rgb", "rgba"));
      glowGrad.addColorStop(1, "rgba(250,248,245,0)");
      ctx.beginPath();
      ctx.arc(x, bandY, r * 3, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();

      const dotGrad = ctx.createRadialGradient(x - r * 0.3, bandY - r * 0.3, 0, x, bandY, r);
      dotGrad.addColorStop(0, lightenColor(color, 30));
      dotGrad.addColorStop(1, color);
      ctx.beginPath();
      ctx.arc(x, bandY, r, 0, Math.PI * 2);
      ctx.fillStyle = dotGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, bandY, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = "11px 'Noto Serif SC', serif";
      ctx.fillStyle = "rgba(58,58,58,0.5)";
      ctx.textAlign = "center";
      const label = point.date.substring(5);
      ctx.fillText(label, x, bandY + r + 18);
    }

    if (points.length === 0) {
      ctx.font = "16px 'Noto Serif SC', serif";
      ctx.fillStyle = "rgba(58,58,58,0.3)";
      ctx.textAlign = "center";
      ctx.fillText("写下你的第一篇日记，光带将在此点亮", width / 2, bandY);
    }

    animFrameRef.current = requestAnimationFrame(drawCanvas);
  }, [canvasSize, timeline]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(drawCanvas);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [drawCanvas]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setMousePos({ x: e.clientX, y: e.clientY });

    const hitDot = dotsRef.current.find(
      (d) => Math.hypot(mx - d.x, my - d.y) <= d.radius + 6
    );

    if (hitDot) {
      setHoveredDot(hitDot.point);
      canvas.style.cursor = "pointer";
    } else {
      setHoveredDot(null);
      canvas.style.cursor = "default";
    }
  }, []);

  const handleClick = useCallback(() => {
    if (!hoveredDot) return;
    const diary = diaries.find((d) => d.date === hoveredDot.date);
    if (diary) {
      setSelectedDiary(diary);
    }
  }, [hoveredDot, diaries, setSelectedDiary]);

  const handleDeleteDiary = useCallback(async () => {
    if (!selectedDiary) return;
    await deleteDiary(selectedDiary.id);
    setSelectedDiary(null);
  }, [selectedDiary, deleteDiary, setSelectedDiary]);

  const gradientBg = selectedDiary
    ? diaryEngine.generateGradientFromKeywords(selectedDiary.keywords)
    : "";

  return (
    <div ref={containerRef} className="relative w-full">
      <canvas
        ref={canvasRef}
        className="w-full"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseLeave={() => setHoveredDot(null)}
      />

      {hoveredDot && (
        <div
          className="fixed z-50 glass-card px-3 py-2 text-xs pointer-events-none animate-fade-in"
          style={{
            left: mousePos.x + 16,
            top: mousePos.y - 40,
          }}
        >
          <div className="font-display text-sm">{hoveredDot.date}</div>
          <div className="flex items-center gap-1 mt-0.5">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ background: SENTIMENT_COLORS[hoveredDot.sentiment] }}
            />
            <span className="text-gray-500">
              {SENTIMENT_LABELS[hoveredDot.sentiment]} · {hoveredDot.sentiment_score > 0 ? "+" : ""}
              {hoveredDot.sentiment_score}
            </span>
          </div>
          <div className="text-gray-400 mt-0.5 max-w-[180px] truncate">{hoveredDot.summary}</div>
        </div>
      )}

      {selectedDiary && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedDiary(null)}
        >
          <div className="absolute inset-0 bg-black/10 backdrop-blur-sm" />
          <div
            className="relative glass-card-glow max-w-lg w-full overflow-hidden animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="h-32 w-full"
              style={{ background: gradientBg }}
            />
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-500 font-display">
                    {selectedDiary.date}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs sentiment-tag-${selectedDiary.sentiment}`}
                  >
                    {SENTIMENT_LABELS[selectedDiary.sentiment]}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedDiary(null)}
                  className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/50 transition-colors"
                >
                  <X size={16} className="text-gray-400" />
                </button>
              </div>
              <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-wrap mb-4">
                {selectedDiary.content}
              </p>
              <div className="flex items-center gap-1 flex-wrap mb-4">
                <Tag size={12} className="text-gray-400" />
                {selectedDiary.keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-full text-xs bg-white/50 text-gray-500"
                  >
                    {kw}
                  </span>
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleDeleteDiary}
                  className="btn-secondary text-xs text-red-400 hover:text-red-500"
                >
                  删除日记
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}
