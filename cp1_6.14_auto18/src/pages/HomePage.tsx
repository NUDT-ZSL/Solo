import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchProjects } from '@/api/projectApi';
import type { Project } from '../../server/models';
import ProjectCard from '@/components/ProjectCard';
import { Sparkles } from 'lucide-react';

const CARD_WIDTH = 280;
const CARD_HEIGHT = 340;
const GAP = 24;
const PADDING = 16;
const MAX_VISIBLE_CARDS = 20;
const OVERSCAN = 3;

const HomePage = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleStart, setVisibleStart] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await fetchProjects();
        setProjects(data);
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
        setScrollTop(scrollContainerRef.current.scrollTop);
      }
    });
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        container.removeEventListener('scroll', handleScroll);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [handleScroll]);

  const columns = Math.max(1, Math.floor((window.innerWidth - 48) / (CARD_WIDTH + GAP)));
  const rowsPerPage = Math.ceil(MAX_VISIBLE_CARDS / columns);
  const rowHeight = CARD_HEIGHT + GAP;

  const visibleRowStart = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
  const visibleRowEnd = Math.min(
    Math.ceil(projects.length / columns),
    visibleRowStart + rowsPerPage + OVERSCAN * 2
  );

  const visibleStartIndex = visibleRowStart * columns;
  const visibleEndIndex = Math.min(projects.length, visibleRowEnd * columns);
  const visibleProjects = projects.slice(visibleStartIndex, visibleEndIndex);

  const totalRows = Math.ceil(projects.length / columns);
  const totalHeight = totalRows * rowHeight - GAP + PADDING * 2;

  const getCardPosition = (index: number) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    return {
      top: row * rowHeight + PADDING,
      left: col * (CARD_WIDTH + GAP) + PADDING,
    };
  };

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
        className="relative overflow-auto"
        style={{
          height: 'calc(100vh - 280px)',
          width: '100%',
        }}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleProjects.map((project, idx) => {
            const absoluteIndex = visibleStartIndex + idx;
            const position = getCardPosition(absoluteIndex);
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
        </div>

        {projects.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-6xl mb-4">🚀</div>
            <h3 className="text-xl font-semibold text-[#1f2937] mb-2">
              还没有项目
            </h3>
            <p className="text-[#4b5563]">成为第一个发起项目的人吧！</p>
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-[#64748b] text-center">
        显示 {visibleProjects.length} / {projects.length} 个项目 | 同时渲染不超过 {MAX_VISIBLE_CARDS} 张卡片
      </div>
    </div>
  );
};

export default HomePage;
