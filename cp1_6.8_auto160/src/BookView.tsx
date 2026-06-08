import { useRef, useEffect, useCallback, useState } from "react";
import { useBookStore } from "./store";
import { getScrollEngine } from "./ScrollEngine";
import { TrailRenderer, ParticleRenderer } from "./TrailRenderer";

export default function BookView() {
  const trailCanvasRef = useRef<HTMLCanvasElement>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
  const trailRendererRef = useRef<TrailRenderer | null>(null);
  const particleRendererRef = useRef<ParticleRenderer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentChapter = useBookStore((s) => s.currentChapter);
  const completedChapters = useBookStore((s) => s.completedChapters);
  const chapters = useBookStore((s) => s.chapters);
  const isScrollAnimating = useBookStore((s) => s.isScrollAnimating);
  const completeCurrentChapter = useBookStore((s) => s.completeCurrentChapter);
  const jumpToChapter = useBookStore((s) => s.jumpToChapter);

  const [scrollExpanded, setScrollExpanded] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);

  const engine = getScrollEngine();
  const chapter = chapters[currentChapter];

  useEffect(() => {
    const timer = setTimeout(() => setScrollExpanded(true), 300);
    const timer2 = setTimeout(() => setContentVisible(true), 800);
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, []);

  useEffect(() => {
    if (!trailCanvasRef.current) return;
    if (!trailRendererRef.current) {
      trailRendererRef.current = new TrailRenderer();
    }
    trailRendererRef.current.attach(trailCanvasRef.current);

    const handleResize = () => {
      trailRendererRef.current?.resize();
      renderTrails();
    };

    renderTrails();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      trailRendererRef.current?.detach();
    };
  }, []);

  useEffect(() => {
    if (!particleCanvasRef.current) return;
    if (!particleRendererRef.current) {
      particleRendererRef.current = new ParticleRenderer();
    }
    particleRendererRef.current.attach(particleCanvasRef.current);

    const handleResize = () => {
      particleRendererRef.current?.resize();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      particleRendererRef.current?.detach();
    };
  }, []);

  const renderTrails = useCallback(() => {
    if (!trailRendererRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const segments = engine.computeTrailSegments(rect.width, 48);
    trailRendererRef.current.renderTrails(segments, true);
  }, [engine]);

  useEffect(() => {
    renderTrails();
  }, [completedChapters, renderTrails]);

  const handleTrailClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const padding = 16;
      const gap = 6;
      const totalChapters = chapters.length;
      const availableWidth = rect.width - padding * 2;
      const segmentWidth =
        (availableWidth - gap * (totalChapters - 1)) / totalChapters;

      for (let i = 0; i < totalChapters; i++) {
        const segStart = padding + i * (segmentWidth + gap);
        const segEnd = segStart + segmentWidth;
        if (clickX >= segStart && clickX <= segEnd) {
          jumpToChapter(i);
          break;
        }
      }
    },
    [chapters.length, jumpToChapter]
  );

  const indicatorPosition = useCallback(() => {
    if (!containerRef.current) return { left: "50%" };
    const rect = containerRef.current.getBoundingClientRect();
    const pos = engine.computeIndicatorPosition(rect.width, 48);
    return { left: `${pos.x}px` };
  }, [engine, currentChapter]);

  const isLastChapter =
    completedChapters.length === chapters.length &&
    completedChapters.includes(currentChapter);
  const isCurrentCompleted = completedChapters.includes(currentChapter);

  return (
    <div className="flex flex-col items-center w-full min-h-screen py-8 px-4 relative">
      <canvas
        ref={particleCanvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none z-0"
      />

      <h1
        className="text-3xl md:text-4xl mb-8 z-10 text-center"
        style={{ fontFamily: "'Ma Shan Zheng', cursive", color: "#5D3A1A" }}
      >
        流光书卷
      </h1>

      <div
        className="relative z-10 w-full max-w-[800px] transition-all duration-700 ease-out"
        style={{
          maxWidth: "min(800px, 90vw)",
        }}
      >
        <div
          ref={containerRef}
          className="relative rounded-xl overflow-hidden shadow-2xl"
          style={{
            background: "#F5F0E8",
            border: "6px solid #5D3A1A",
            borderTopWidth: "12px",
            borderBottomWidth: "12px",
            borderImage: "linear-gradient(90deg, #5D3A1A 0%, #8B6914 50%, #5D3A1A 100%) 1",
            transform: scrollExpanded ? "scaleY(1)" : "scaleY(0)",
            opacity: scrollExpanded ? 1 : 0,
            transition: "transform 0.7s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease",
          }}
          onClick={handleTrailClick}
        >
          <canvas
            ref={trailCanvasRef}
            className="absolute inset-0 w-full h-12 cursor-pointer z-10"
            style={{ pointerEvents: "auto" }}
          />

          <div
            className="absolute top-0 z-20 pointer-events-none"
            style={{
              ...indicatorPosition(),
              top: "24px",
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="scroll-indicator" />
          </div>

          <div
            className="px-8 md:px-12 py-10 md:py-14 min-h-[400px] flex flex-col justify-between"
            style={{
              opacity: contentVisible ? 1 : 0,
              transform: contentVisible ? "translateY(0)" : "translateY(20px)",
              transition: "opacity 0.5s ease, transform 0.5s ease",
            }}
          >
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-[2px]" style={{ background: "#5D3A1A" }} />
                <span
                  className="text-sm tracking-widest"
                  style={{
                    fontFamily: "'Noto Serif SC', serif",
                    color: "#8B7355",
                  }}
                >
                  第{currentChapter + 1}章 / 共{chapters.length}章
                </span>
                <div className="flex-1 h-[2px]" style={{ background: "#5D3A1A" }} />
              </div>

              <h2
                className="text-2xl md:text-3xl mb-8 text-center"
                style={{
                  fontFamily: "'Ma Shan Zheng', cursive",
                  color: "#5D3A1A",
                }}
              >
                {chapter?.title}
              </h2>

              <div
                className="text-base md:text-lg leading-[1.8] whitespace-pre-line max-h-[300px] overflow-y-auto pr-2 custom-scrollbar"
                style={{
                  fontFamily: "'Noto Serif SC', serif",
                  color: "#3D2B1F",
                }}
              >
                {chapter?.content}
              </div>
            </div>

            <div className="flex justify-center mt-8 gap-4">
              {!isLastChapter && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setContentVisible(false);
                    setTimeout(() => {
                      completeCurrentChapter();
                      setTimeout(() => setContentVisible(true), 300);
                    }, 300);
                  }}
                  className="px-8 py-3 rounded-lg text-base transition-all duration-300 hover:scale-105 active:scale-95"
                  style={{
                    fontFamily: "'Noto Serif SC', serif",
                    background: isCurrentCompleted
                      ? "rgba(93, 58, 26, 0.15)"
                      : "rgba(93, 58, 26, 0.9)",
                    color: isCurrentCompleted ? "#5D3A1A" : "#F5F0E8",
                    boxShadow: isCurrentCompleted
                      ? "none"
                      : "0 4px 15px rgba(93, 58, 26, 0.3)",
                  }}
                >
                  {isCurrentCompleted ? "已读 · 继续前行" : "阅读完成 · 留下轨迹"}
                </button>
              )}

              {isLastChapter && (
                <div
                  className="text-center py-4"
                  style={{
                    fontFamily: "'Ma Shan Zheng', cursive",
                    fontSize: "1.5rem",
                    color: "#E8934A",
                    textShadow: "0 0 20px rgba(232, 147, 74, 0.4)",
                  }}
                >
                  ✦ 画卷已成 · 流光不散 ✦
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
