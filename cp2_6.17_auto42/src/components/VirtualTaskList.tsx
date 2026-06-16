import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { TaskCard } from './TaskCard';
import type { Task } from '../data/db';
import type { User } from '../data/db';

interface VirtualTaskListProps {
  tasks: Task[];
  users: User[];
  currentUserId: string | null;
  onAccept: (taskId: string) => void;
  onComplete: (taskId: string) => void;
  onCancel: (taskId: string) => void;
}

const CARD_WIDTH = 280;
const CARD_HEIGHT = 180;
const CARD_GAP = 20;
const BUFFER_ROWS = 3;
const MAX_VIRTUAL_LIMIT = 200;

let vlistStyleInjected = false;
function injectVListStyles() {
  if (vlistStyleInjected) return;
  vlistStyleInjected = true;
  const css = `
    @keyframes taskCardFadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .task-card-enter {
      opacity: 0;
      transform: translateY(20px);
      animation: taskCardFadeInUp 0.4s ease-out forwards;
    }
  `;
  const style = document.createElement('style');
  style.setAttribute('data-vlist', 'true');
  style.textContent = css;
  document.head.appendChild(style);
}

export function VirtualTaskList({
  tasks,
  users,
  currentUserId,
  onAccept,
  onComplete,
  onCancel
}: VirtualTaskListProps) {
  useMemo(() => injectVListStyles(), []);

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(800);
  const [containerHeight, setContainerHeight] = useState(600);
  const animatedIdsRef = useRef<Set<string>>(new Set());
  const firstLoadRef = useRef<boolean>(true);
  const tasksLengthRef = useRef<number>(0);

  const clampedTasks = useMemo(() => tasks.slice(0, MAX_VIRTUAL_LIMIT), [tasks]);
  const totalTasks = clampedTasks.length;

  useEffect(() => {
    if (totalTasks !== tasksLengthRef.current) {
      if (tasksLengthRef.current === 0 && totalTasks > 0) {
        firstLoadRef.current = true;
      } else if (totalTasks < tasksLengthRef.current) {
        animatedIdsRef.current.clear();
        firstLoadRef.current = true;
      }
      tasksLengthRef.current = totalTasks;
    }
  }, [totalTasks]);

  const columns = useMemo(() => {
    if (containerWidth < 640) return 1;
    if (containerWidth < 1024) return 2;
    return 3;
  }, [containerWidth]);

  const rowHeight = CARD_HEIGHT + CARD_GAP;
  const totalRows = Math.ceil(totalTasks / columns);
  const totalHeight = totalRows * rowHeight - CARD_GAP + 40;

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth);
      setContainerHeight(containerRef.current.clientHeight);
    }
  }, []);

  useEffect(() => {
    updateDimensions();
    const ro = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      ro.observe(containerRef.current);
    }
    window.addEventListener('resize', updateDimensions);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, [updateDimensions]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const rafRef = useRef<number | null>(null);
  const scrollHandler = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      handleScroll(e);
      rafRef.current = null;
    });
  }, [handleScroll]);

  const visibleStartRow = Math.max(0, Math.floor(scrollTop / rowHeight) - BUFFER_ROWS);
  const visibleEndRow = Math.min(
    totalRows,
    Math.ceil((scrollTop + containerHeight) / rowHeight) + BUFFER_ROWS
  );

  const startIndex = visibleStartRow * columns;
  const endIndex = Math.min(totalTasks, visibleEndRow * columns);

  const visibleTasks = useMemo(
    () => clampedTasks.slice(startIndex, endIndex),
    [clampedTasks, startIndex, endIndex]
  );

  const colPadding = useMemo(() => {
    const totalGap = CARD_GAP * (columns - 1);
    const availableWidth = containerWidth - 32;
    const extraSpace = Math.max(0, availableWidth - (columns * CARD_WIDTH + totalGap));
    return extraSpace / (columns * 2);
  }, [containerWidth, columns]);

  const getCardPosition = useCallback((actualIndex: number) => {
    const row = Math.floor(actualIndex / columns);
    const col = actualIndex % columns;
    return {
      left: col * (CARD_WIDTH + CARD_GAP) + 16 + colPadding,
      top: row * rowHeight + 20
    };
  }, [columns, colPadding, rowHeight]);

  const getAnimationDelay = useCallback((globalIndex: number) => {
    if (!firstLoadRef.current) return 0;
    if (globalIndex >= columns * 4) return 0;
    return globalIndex * 0.2;
  }, [columns]);

  useEffect(() => {
    if (totalTasks > 0) {
      const t = setTimeout(() => {
        firstLoadRef.current = false;
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [totalTasks]);

  if (totalTasks === 0) {
    return (
      <div
        style={{
          padding: '80px 20px',
          textAlign: 'center',
          color: '#9ca3af'
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
        <div style={{ fontSize: '16px', fontWeight: 600, color: '#6b7280', marginBottom: '6px' }}>
          暂无任务
        </div>
        <div style={{ fontSize: '13px' }}>
          快来发布第一个互助任务，或切换楼栋看看其他邻居的需求吧~
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={scrollHandler}
      style={{
        height: 'calc(100vh - 260px)',
        minHeight: '400px',
        overflowY: 'auto',
        overflowX: 'hidden',
        position: 'relative',
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
        willChange: 'scroll-position'
      }}
    >
      <div
        style={{
          height: `${totalHeight}px`,
          position: 'relative',
          width: '100%',
          contain: 'layout style paint'
        }}
      >
        {visibleTasks.map((task, localIndex) => {
          const globalIndex = startIndex + localIndex;
          const pos = getCardPosition(globalIndex);
          const delay = getAnimationDelay(globalIndex);
          const shouldAnimate = firstLoadRef.current && delay > 0 && !animatedIdsRef.current.has(task.id);

          if (shouldAnimate) {
            animatedIdsRef.current.add(task.id);
          }

          const animStyle: React.CSSProperties = shouldAnimate
            ? { animationDelay: `${delay}s` }
            : {};

          return (
            <div
              key={task.id}
              className={shouldAnimate ? 'task-card-enter' : ''}
              style={{
                position: 'absolute',
                left: pos.left,
                top: pos.top,
                willChange: 'transform',
                contain: 'layout style paint',
                ...animStyle
              }}
            >
              <TaskCard
                task={task}
                currentUserId={currentUserId}
                users={users}
                onAccept={onAccept}
                onComplete={onComplete}
                onCancel={onCancel}
              />
            </div>
          );
        })}
      </div>

      {tasks.length > MAX_VIRTUAL_LIMIT && (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '12px',
            textAlign: 'center',
            background: 'linear-gradient(to top, #fef9ef 60%, transparent)',
            fontSize: '12px',
            color: '#9ca3af'
          }}
        >
          还有 {tasks.length - MAX_VIRTUAL_LIMIT} 个任务未显示，使用筛选条件缩小范围
        </div>
      )}
    </div>
  );
}
