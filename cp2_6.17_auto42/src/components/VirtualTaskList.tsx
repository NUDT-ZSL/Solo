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
  maxVisible?: number;
}

const CARD_WIDTH = 280;
const CARD_HEIGHT = 180;
const CARD_GAP = 20;
const BUFFER = 3;

export function VirtualTaskList({
  tasks,
  users,
  currentUserId,
  onAccept,
  onComplete,
  onCancel,
  maxVisible = 50
}: VirtualTaskListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(800);

  const displayTasks = useMemo(() => tasks.slice(0, maxVisible), [tasks, maxVisible]);

  const columns = useMemo(() => {
    if (containerWidth < 640) return 1;
    if (containerWidth < 1024) return 2;
    return 3;
  }, [containerWidth]);

  const rowHeight = CARD_HEIGHT + CARD_GAP;
  const totalRows = Math.ceil(displayTasks.length / columns);
  const totalHeight = totalRows * rowHeight - CARD_GAP + 40;

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const visibleStartRow = Math.max(0, Math.floor(scrollTop / rowHeight) - BUFFER);
  const visibleEndRow = Math.min(
    totalRows,
    Math.ceil((scrollTop + (containerRef.current?.clientHeight || 600)) / rowHeight) + BUFFER
  );

  const startIndex = visibleStartRow * columns;
  const endIndex = Math.min(displayTasks.length, visibleEndRow * columns);

  const visibleTasks = displayTasks.slice(startIndex, endIndex);

  const getCardPosition = (index: number) => {
    const actualIndex = startIndex + index;
    const row = Math.floor(actualIndex / columns);
    const col = actualIndex % columns;
    const totalGap = CARD_GAP * (columns - 1);
    const availableWidth = containerWidth - 32;
    const extraSpace = Math.max(0, availableWidth - (columns * CARD_WIDTH + totalGap));
    const colPadding = extraSpace / (columns * 2);

    return {
      left: col * (CARD_WIDTH + CARD_GAP) + 16 + colPadding,
      top: row * rowHeight + 20
    };
  };

  if (displayTasks.length === 0) {
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
      onScroll={handleScroll}
      style={{
        height: 'calc(100vh - 260px)',
        minHeight: '400px',
        overflowY: 'auto',
        overflowX: 'hidden',
        position: 'relative',
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      <div style={{ height: `${totalHeight}px`, position: 'relative', width: '100%' }}>
        {visibleTasks.map((task, i) => {
          const pos = getCardPosition(i);
          const animIndex = startIndex + i;
          return (
            <div
              key={task.id}
              style={{
                position: 'absolute',
                left: pos.left,
                top: pos.top,
                willChange: 'transform'
              }}
            >
              <TaskCard
                task={task}
                index={animIndex}
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

      {tasks.length > maxVisible && (
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
          还有 {tasks.length - maxVisible} 个任务未显示，使用筛选条件缩小范围
        </div>
      )}
    </div>
  );
}
