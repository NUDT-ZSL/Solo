import { useEffect, useRef, useState, useCallback } from 'react';
import type { LightPainting } from './App';
import { renderThumbnail, rgbToHex } from './lightPainting';

interface TimelineProps {
  paintings: LightPainting[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

interface ThumbSize {
  w: number;
  h: number;
  gap: number;
}

function getThumbSize(): ThumbSize {
  if (typeof window === 'undefined') return { w: 80, h: 60, gap: 12 };
  const w = window.innerWidth;
  if (w < 1024 && w >= 768) return { w: 60, h: 45, gap: 8 };
  return { w: 80, h: 60, gap: 12 };
}

export default function Timeline({ paintings, activeIndex, onSelect }: TimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const [size, setSize] = useState<ThumbSize>(getThumbSize());
  const thumbCanvasesRef = useRef<Map<number, HTMLCanvasElement>>(new Map());

  useEffect(() => {
    const onResize = () => setSize(getThumbSize());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const updateVisibleRange = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const itemSize = size.w + size.gap;
    const buffer = 2;
    const start = Math.max(0, Math.floor(el.scrollLeft / itemSize) - buffer);
    const visibleCount = Math.ceil(el.clientWidth / itemSize) + buffer * 2;
    const end = Math.min(paintings.length, start + visibleCount);
    setVisibleRange({ start, end });
  }, [paintings.length, size.w, size.gap]);

  useEffect(() => {
    updateVisibleRange();
  }, [updateVisibleRange]);

  useEffect(() => {
    if (activeIndex >= 0 && scrollRef.current) {
      const itemSize = size.w + size.gap;
      const target = activeIndex * itemSize - scrollRef.current.clientWidth / 2 + size.w / 2;
      scrollRef.current.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
    }
  }, [activeIndex, size.w, size.gap]);

  useEffect(() => {
    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      const painting = paintings[i];
      if (!painting) continue;
      const canvas = thumbCanvasesRef.current.get(i);
      if (!canvas) continue;
      if (canvas.dataset.rendered === painting.id) continue;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        renderThumbnail(ctx, canvas.width, canvas.height, painting.primaryColor);
        canvas.dataset.rendered = painting.id;
      }
    }
  }, [visibleRange, paintings, size.w, size.h]);

  const handleClick = (index: number) => {
    onSelect(index);
    setHighlightIndex(index);
    setTimeout(() => setHighlightIndex(null), 320);
  };

  const handleMouseEnter = (e: React.MouseEvent, index: number) => {
    setHoverIndex(index);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const parentRect = scrollRef.current?.getBoundingClientRect();
    if (parentRect) {
      setTooltip({
        x: rect.left - parentRect.left + rect.width / 2,
        y: rect.top - parentRect.top - 6,
        text: paintings[index].dateLabel,
      });
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setTooltip(null);
  };

  const totalWidth = paintings.length * (size.w + size.gap);

  if (paintings.length === 0) {
    return (
      <div className="timeline-empty">
        <div className="timeline-empty-hint">✨ 暂无光画记录，上传第一张照片开启光影旅程 ✨</div>
      </div>
    );
  }

  return (
    <div className="timeline-wrapper">
      <div className="timeline-header">
        <span className="timeline-title">光影河流</span>
        <span className="timeline-count">{paintings.length} 幅光画</span>
      </div>
      <div
        ref={scrollRef}
        className="timeline-scroll"
        onScroll={updateVisibleRange}
      >
        <div className="timeline-track" style={{ width: totalWidth }}>
          {Array.from({ length: paintings.length }).map((_, i) => {
            const isVisible = i >= visibleRange.start && i < visibleRange.end;
            const isActive = i === activeIndex;
            const isHover = i === hoverIndex;
            const isHighlight = i === highlightIndex;
            const p = paintings[i];
            const bgColor = rgbToHex(p.primaryColor);
            return (
              <div
                key={p.id}
                className={`timeline-item ${isActive ? 'active' : ''} ${isHighlight ? 'highlight' : ''}`}
                style={{
                  left: i * (size.w + size.gap),
                  width: size.w,
                  height: size.h,
                  transform: isHover ? 'scale(1.15)' : 'scale(1)',
                  zIndex: isHover || isActive ? 10 : 1,
                }}
                onClick={() => handleClick(i)}
                onMouseEnter={(e) => handleMouseEnter(e, i)}
                onMouseLeave={handleMouseLeave}
              >
                {isVisible ? (
                  <canvas
                    ref={(el) => {
                      if (el) thumbCanvasesRef.current.set(i, el);
                    }}
                    width={size.w}
                    height={size.h}
                    className="timeline-canvas"
                  />
                ) : (
                  <div className="timeline-placeholder" style={{ backgroundColor: bgColor }} />
                )}
                <div className="timeline-date" style={{ fontSize: size.h < 50 ? '9px' : '10px' }}>
                  {p.dateLabel.slice(5)}
                </div>
              </div>
            );
          })}
        </div>
        {tooltip && (
          <div className="timeline-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
            {tooltip.text}
          </div>
        )}
      </div>
    </div>
  );
}
