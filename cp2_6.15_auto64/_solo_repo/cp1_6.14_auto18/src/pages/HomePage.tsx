import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { fetchProjects } from '@/api/projectApi';
import type { Project } from '../../server/models';
import ProjectCard from '@/components/ProjectCard';
import { Sparkles, ChevronDown } from 'lucide-react';

const MAX_VISIBLE_CARDS = 20;
const CARD_WIDTH = 280;
const CARD_HEIGHT = 340;
const GAP = 24;
const PADDING = 16;

const HomePage = () => {
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [renderCount, setRenderCount] = useState(MAX_VISIBLE_CARDS);
  const [scrollOffset, setScrollOffset] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

  const sentinelTopRef = useRef<HTMLDivElement>(null);
  const sentinelBottomRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const [viewportWidth, setViewportWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const columns = useMemo(() => {
    return Math.max(1, Math.floor((viewportWidth - 48 - PADDING * 2) / (CARD_WIDTH + GAP)));
  }, [viewportWidth]);

  const rowsPerPage = Math.ceil(MAX_VISIBLE_CARDS / columns);
  const rowHeight = CARD_HEIGHT + GAP;

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await fetchProjects();
        setAllProjects(data);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProjects();
  }, []);

  const handleScroll = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        setScrollOffset(scrollContainerRef.current.scrollTop);
      }
    });
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [handleScroll]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (entry.target === sentinelBottomRef.current) {
              setRenderCount((prev) =>
                Math.min(allProjects.length, prev + MAX_VISIBLE_CARDS)
              );
            } else if (entry.target === sentinelTopRef.current) {
              setRenderCount((prev) => Math.max(MAX_VISIBLE_CARDS, prev - MAX_VISIBLE_CARDS));
            }
          }
        });
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '200px',
        threshold: 0,
      }
    );

    const observer = observerRef.current;
    if (sentinelTopRef.current) observer.observe(sentinelTopRef.current);
    if (sentinelBottomRef.current) observer.observe(sentinelBottomRef.current);

    return () => {
      observer.disconnect();
    };
  }, [allProjects.length]);

  const startRow = useMemo(() => {
    return Math.max(0, Math.floor(scrollOffset / rowHeight) - 2);
  }, [scrollOffset, rowHeight]);

  const visibleRowCount = rowsPerPage + 4;
  const startIndex = Math.min(
    Math.max(0, startRow * columns),
    Math.max(0, allProjects.length - MAX_VISIBLE_CARDS)
  );
  const endIndex = Math.min(
    allProjects.length,
    Math.min(renderCount, startIndex + MAX_VISIBLE_CARDS)
  );

  const visibleProjects = useMemo(() => {
    const slice = allProjects.slice(startIndex, endIndex);
    return slice.length > MAX_VISIBLE_CARDS ? slice.slice(0, MAX_VISIBLE_CARDS) : slice;
  }, [allProjects, startIndex, endIndex]);

  const getCardPosition = useCallback(
    (globalIndex: number) => {
      const row = Math.floor(globalIndex / columns);
      const col = globalIndex % columns;
      return {
        top: row * rowHeight + PADDING,
        left: col * (CARD_WIDTH + GAP) + PADDING,
      };
    },
    [columns, rowHeight]
  );

  const totalRows = Math.ceil(renderCount / columns);
  const totalHeight = Math.max(0, totalRows * rowHeight - GAP + PADDING * 2);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-10 h-10 text-[#3b82f6]" />
          <h1 className="text-3xl font-bold text-[#1f2937]">发现精彩项目</h1>
        </div>
        <p className="text-[#4b5563] text-lg">
          探索创意项目，支持你喜欢的想法，让梦想照进现实
        </p>
      </div>

      <div
        ref={scrollContainerRef}
        className="relative overflow-auto rounded-xl border border-gray-200 bg-white"
        style={{
          height: 'calc(100vh - 280px)',
          width: '100%',
        }}
      >
        <div style={{ height: totalHeight, position: 'relative', width: '100%' }}>
          <div ref={sentinelTopRef} style={{ height: 1, position: 'absolute', top: 0, left: 0, right: 0 }} />

          {visibleProjects.map((project, idx) => {
            const globalIndex = startIndex + idx;
            const position = getCardPosition(globalIndex);
            return (
              <div
                key={project.id}
                style={{
                  position: 'absolute',
                  top: position.top,
                  left: position.left,
                  width: CARD_WIDTH,
                  height: CARD_HEIGHT,
                }}
              >
                <ProjectCard project={project} />
              </div>
            );
          })}

          <div
            ref={sentinelBottomRef}
            style={{
              height: 1,
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
            }}
          />
        </div>

        {allProjects.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-6xl mb-4">🚀</div>
            <h3 className="text-xl font-semibold text-[#1f2937] mb-2">还没有项目</h3>
            <p className="text-[#4b5563]">成为第一个发起项目的人吧！</p>
          </div>
        )}
      </div>

      <div className="mt-6 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div className="text-sm text-[#64748b]">
            <span className="font-medium text-[#1f2937]">{visibleProjects.length}</span> 个项目正在渲染 /
            共 <span className="font-medium text-[#1f2937]">{allProjects.length}</span> 个项目
            <span className="mx-2">|</span>
            最多同时渲染 <span className="font-medium text-[#3b82f6]">{MAX_VISIBLE_CARDS}</span> 张卡片
            <span className="mx-2">|</span>
            {columns} 列布局
          </div>
          {renderCount < allProjects.length && (
            <button
              onClick={() => {
                setRenderCount((prev) =>
                  Math.min(allProjects.length, prev + MAX_VISIBLE_CARDS)
                );
              }}
              className="flex items-center gap-1 text-sm text-[#3b82f6] hover:text-[#2563eb] font-medium transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
              加载更多
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
