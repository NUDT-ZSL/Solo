import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Task, Member, Difficulty } from '../api/taskApi';

export type SortMode = 'status' | 'difficulty';

interface TaskListProps {
  tasks: Task[];
  currentMemberId: string | null;
  members: Member[];
  onClaim: (taskId: string) => Promise<void>;
  onComplete: (taskId: string) => void;
  familyId: string;
  sortMode?: SortMode;
  loading?: boolean;
  error?: string | null;
}

interface TaskItemProps {
  task: Task;
  currentMemberId: string | null;
  members: Member[];
  onClaim: (taskId: string) => Promise<void>;
  onComplete: (taskId: string) => void;
}

const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { color: string; label: string; order: number }
> = {
  easy: { color: '#4caf50', label: '简单', order: 0 },
  medium: { color: '#ff9800', label: '中等', order: 1 },
  hard: { color: '#f44336', label: '困难', order: 2 },
};

const getMemberName = (
  memberId: string | null,
  members: Member[]
): string => {
  if (!memberId) return '';
  const member = members.find((m) => m.id === memberId);
  return member?.name ?? '';
};

interface RippleData {
  x: number;
  y: number;
  id: number;
}

const RippleButton: React.FC<{
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  backgroundColor: string;
  children: React.ReactNode;
  loading?: boolean;
  style?: React.CSSProperties;
}> = memo(function RippleButton({
  onClick,
  disabled,
  backgroundColor,
  children,
  loading,
  style,
}) {
  const [ripples, setRipples] = useState<RippleData[]>([]);
  const rippleIdRef = useRef(0);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) return;
      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = ++rippleIdRef.current;

      setRipples((prev) => [...prev, { x, y, id }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 600);

      onClick(e);
    },
    [onClick, disabled, loading]
  );

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      style={{
        position: 'relative',
        overflow: 'hidden',
        backgroundColor,
        color: '#ffffff',
        border: 'none',
        borderRadius: '8px',
        padding: '6px 16px',
        fontSize: '14px',
        fontWeight: 500,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity 0.2s, transform 0.1s',
        whiteSpace: 'nowrap',
        ...style,
      }}
      onMouseDown={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.transform = 'scale(0.97)';
        }
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {loading ? '处理中...' : children}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          style={{
            position: 'absolute',
            left: ripple.x,
            top: ripple.y,
            width: 0,
            height: 0,
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.4)',
            transform: 'translate(-50%, -50%)',
            animation: 'ripple 0.6s ease-out forwards',
            pointerEvents: 'none',
          }}
        />
      ))}
    </button>
  );
});

const TaskItem: React.FC<TaskItemProps> = memo(function TaskItem({
  task,
  currentMemberId,
  members,
  onClaim,
  onComplete,
}) {
  const [claiming, setClaiming] = useState(false);
  const difficultyConfig = DIFFICULTY_CONFIG[task.difficulty];
  const isClaimed = !!task.claimed_by;
  const isCompleted = task.completed;
  const isCurrentUserClaimed = task.claimed_by === currentMemberId;
  const claimerName = getMemberName(task.claimed_by, members);

  const handleClaim = useCallback(async () => {
    if (isClaimed || isCompleted || claiming) return;
    setClaiming(true);
    try {
      await onClaim(task.id);
    } finally {
      setClaiming(false);
    }
  }, [isClaimed, isCompleted, claiming, onClaim, task.id]);

  const handleComplete = useCallback(() => {
    if (!isCurrentUserClaimed || isCompleted) return;
    onComplete(task.id);
  }, [isCurrentUserClaimed, isCompleted, onComplete, task.id]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '80px',
        borderRadius: '12px',
        backgroundColor: '#ffffff',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        borderLeft: `5px solid ${difficultyConfig.color}`,
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        boxSizing: 'border-box',
        marginBottom: '12px',
        transition: 'box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        if (!isCompleted) {
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.12)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
      }}
    >
      {isCompleted && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(158, 158, 158, 0.35)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              backgroundColor: '#9e9e9e',
              color: '#ffffff',
              padding: '4px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            已完成
          </span>
        </div>
      )}

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minWidth: 0,
          gap: '4px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#212121',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '40%',
            }}
            title={task.title}
          >
            {task.title}
          </span>
          <span
            style={{
              backgroundColor: difficultyConfig.color + '20',
              color: difficultyConfig.color,
              padding: '2px 10px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            {difficultyConfig.label}
          </span>
          <span
            style={{
              backgroundColor: '#fff3e0',
              color: '#ef6c00',
              padding: '2px 10px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            +{task.points} 积分
          </span>
          {isClaimed && !isCompleted && (
            <span
              style={{
                backgroundColor: '#e3f2fd',
                color: '#1565c0',
                padding: '2px 10px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 500,
              }}
              title={`认领者: ${claimerName}`}
            >
              👤 {claimerName}
            </span>
          )}
        </div>
        <span
          style={{
            fontSize: '13px',
            color: '#757575',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={task.description}
        >
          {task.description}
        </span>
      </div>

      <div
        style={{
          marginLeft: '16px',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        {!isCompleted && !isClaimed && (
          <RippleButton
            onClick={handleClaim}
            backgroundColor="#1976d2"
            disabled={!currentMemberId || claiming}
            loading={claiming}
          >
            认领
          </RippleButton>
        )}
        {!isCompleted && isCurrentUserClaimed && (
          <RippleButton
            onClick={handleComplete}
            backgroundColor="#2e7d32"
            disabled={claiming}
          >
            完成
          </RippleButton>
        )}
      </div>
    </div>
  );
});

const VirtualizedList: React.FC<{
  items: Task[];
  renderItem: (task: Task) => React.ReactNode;
  itemHeight: number;
  gap: number;
}> = memo(function VirtualizedList({ items, renderItem, itemHeight, gap }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateHeight = () => {
      setContainerHeight(container.clientHeight);
    };

    updateHeight();
    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  const totalHeight = items.length * (itemHeight + gap);
  const rowHeightWithGap = itemHeight + gap;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeightWithGap) - 5);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / rowHeightWithGap) + 5
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * rowHeightWithGap;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  if (items.length <= 50) {
    return (
      <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
        {items.map(renderItem)}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        overflowY: 'auto',
        flex: 1,
        padding: '4px 0',
      }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map(renderItem)}
        </div>
      </div>
    </div>
  );
});

const TaskList: React.FC<TaskListProps> = memo(function TaskList({
  tasks,
  currentMemberId,
  members,
  onClaim,
  onComplete,
  sortMode = 'status',
  loading = false,
  error = null,
}) {
  const sortedTasks = useMemo(() => {
    const tasksCopy = [...tasks];
    if (sortMode === 'difficulty') {
      tasksCopy.sort(
        (a, b) =>
          DIFFICULTY_CONFIG[a.difficulty].order -
          DIFFICULTY_CONFIG[b.difficulty].order
      );
    } else {
      const statusOrder = (task: Task): number => {
        if (task.completed) return 2;
        if (task.claimed_by) return 1;
        return 0;
      };
      tasksCopy.sort((a, b) => statusOrder(a) - statusOrder(b));
    }
    return tasksCopy;
  }, [tasks, sortMode]);

  const groupedTasks = useMemo(() => {
    if (sortMode !== 'status') return null;
    return {
      pending: sortedTasks.filter((t) => !t.claimed_by && !t.completed),
      claimed: sortedTasks.filter((t) => t.claimed_by && !t.completed),
      completed: sortedTasks.filter((t) => t.completed),
    };
  }, [sortedTasks, sortMode]);

  const renderTask = useCallback(
    (task: Task) => (
      <TaskItem
        key={task.id}
        task={task}
        currentMemberId={currentMemberId}
        members={members}
        onClaim={onClaim}
        onComplete={onComplete}
      />
    ),
    [currentMemberId, members, onClaim, onComplete]
  );

  const groupTitleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: '#616161',
    margin: '8px 0',
    paddingLeft: '4px',
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            border: '3px solid #e0e0e0',
            borderTop: '3px solid #1976d2',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <span style={{ color: '#757575', fontSize: '14px' }}>加载任务列表...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          gap: '12px',
          backgroundColor: '#ffebee',
          borderRadius: '12px',
          margin: '8px',
        }}
      >
        <span style={{ fontSize: '28px' }}>⚠️</span>
        <span style={{ color: '#c62828', fontSize: '14px' }}>{error}</span>
      </div>
    );
  }

  if (sortedTasks.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          gap: '12px',
        }}
      >
        <span style={{ fontSize: '48px' }}>📋</span>
        <span style={{ color: '#9e9e9e', fontSize: '14px' }}>暂无任务</span>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes ripple {
          to {
            width: 300px;
            height: 300px;
            opacity: 0;
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      {groupedTasks ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
          }}
        >
          {groupedTasks.pending.length > 0 && (
            <>
              <div style={groupTitleStyle}>
                待认领 ({groupedTasks.pending.length})
              </div>
              {groupedTasks.pending.map(renderTask)}
            </>
          )}
          {groupedTasks.claimed.length > 0 && (
            <>
              <div style={groupTitleStyle}>
                已认领 ({groupedTasks.claimed.length})
              </div>
              {groupedTasks.claimed.map(renderTask)}
            </>
          )}
          {groupedTasks.completed.length > 0 && (
            <>
              <div style={groupTitleStyle}>
                已完成 ({groupedTasks.completed.length})
              </div>
              {groupedTasks.completed.map(renderTask)}
            </>
          )}
        </div>
      ) : (
        <VirtualizedList
          items={sortedTasks}
          renderItem={renderTask}
          itemHeight={80}
          gap={12}
        />
      )}
    </>
  );
});

export default TaskList;
export { TaskItem, RippleButton };
