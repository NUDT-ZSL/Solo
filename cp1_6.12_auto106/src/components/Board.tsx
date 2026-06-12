import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import TaskCard from './TaskCard';
import type { User, Task, TaskStatus } from '../api';

interface BoardProps {
  tasks: Task[];
  columnOrder: TaskStatus[];
  columnNames: Record<TaskStatus, string>;
  columnCounts: Record<TaskStatus, number>;
  users: User[];
  userMap: Map<string, User>;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onTaskUpdate: (taskId: string, data: Partial<Task>) => void;
  onTaskCreate: (data: Partial<Task> & { title: string }) => void;
  onTaskDelete: (taskId: string) => void;
  isMobile: boolean;
}

const CARD_HEIGHT = 168;
const CARD_GAP = 12;
const VIRTUAL_THRESHOLD = 20;

const COLUMN_COLORS: Record<TaskStatus, { bg: string; border: string; accent: string; dot: string }> = {
  todo: {
    bg: 'rgba(148,163,184,0.06)',
    border: 'rgba(148,163,184,0.12)',
    accent: '#94a3b8',
    dot: '#94a3b8',
  },
  in_progress: {
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.15)',
    accent: '#3b82f6',
    dot: '#3b82f6',
  },
  review: {
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.15)',
    accent: '#f59e0b',
    dot: '#f59e0b',
  },
  done: {
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.15)',
    accent: '#10b981',
    dot: '#10b981',
  },
};

const VirtualCardList: React.FC<{
  items: Task[];
  users: User[];
  userMap: Map<string, User>;
  onTaskUpdate: (id: string, data: Partial<Task>) => void;
  onTaskDelete: (id: string) => void;
  draggingId: string | null;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
}> = ({ items, users, userMap, onTaskUpdate, onTaskDelete, draggingId, onDragStart, onDragEnd }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrollTop(el.scrollTop);
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setViewportHeight(e.contentRect.height);
    });
    el.addEventListener('scroll', onScroll, { passive: true });
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, []);

  const useVirtual = items.length > VIRTUAL_THRESHOLD;
  const totalHeight = items.length * (CARD_HEIGHT + CARD_GAP);
  const overscan = 4;

  const visibleRange = useMemo(() => {
    if (!useVirtual) return { start: 0, end: items.length };
    const start = Math.max(0, Math.floor(scrollTop / (CARD_HEIGHT + CARD_GAP)) - overscan);
    const end = Math.min(
      items.length,
      Math.ceil((scrollTop + viewportHeight) / (CARD_HEIGHT + CARD_GAP)) + overscan
    );
    return { start, end };
  }, [scrollTop, viewportHeight, items.length, useVirtual]);

  if (items.length === 0) {
    return (
      <div style={{
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        color: '#64748b',
        fontSize: 13,
      }}>
        <div style={{ fontSize: 36, opacity: 0.5 }}>📭</div>
        <div>暂无任务</div>
        <div style={{ fontSize: 11, opacity: 0.7 }}>拖拽其他列的任务到此处</div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '0 10px 10px',
        position: 'relative',
      }}
    >
      {useVirtual ? (
        <div style={{ height: totalHeight, position: 'relative' }}>
          {items.slice(visibleRange.start, visibleRange.end).map((task, idx) => {
            const realIdx = visibleRange.start + idx;
            return (
              <div
                key={task.id}
                style={{
                  position: 'absolute',
                  top: realIdx * (CARD_HEIGHT + CARD_GAP),
                  left: 0, right: 0,
                  height: CARD_HEIGHT,
                  opacity: draggingId === task.id ? 0.3 : 1,
                }}
              >
                <TaskCard
                  task={task}
                  users={users}
                  userMap={userMap}
                  onUpdate={(d) => onTaskUpdate(task.id, d)}
                  onDelete={() => onTaskDelete(task.id)}
                  draggable
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: CARD_GAP, padding: '4px 0' }}>
          {items.map((task) => (
            <div
              key={task.id}
              style={{
                opacity: draggingId === task.id ? 0.3 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              <TaskCard
                task={task}
                users={users}
                userMap={userMap}
                onUpdate={(d) => onTaskUpdate(task.id, d)}
                onDelete={() => onTaskDelete(task.id)}
                draggable
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Board: React.FC<BoardProps> = ({
  tasks,
  columnOrder,
  columnNames,
  columnCounts,
  users,
  userMap,
  onStatusChange,
  onTaskUpdate,
  onTaskCreate,
  onTaskDelete,
  isMobile,
}) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [editingColumn, setEditingColumn] = useState<TaskStatus | null>(null);
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const tasksByColumn = useMemo(() => {
    const map = new Map<TaskStatus, Task[]>();
    columnOrder.forEach((c) => map.set(c, []));
    tasks.forEach((t) => {
      const arr = map.get(t.status);
      if (arr) arr.push(t);
    });
    return map;
  }, [tasks, columnOrder]);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggingId(id);
    try {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', id);
      const img = new Image();
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      e.dataTransfer.setDragImage(img, 0, 0);
    } catch {}
    setGhostPos({ x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    if (!draggingId) return;
    const onMove = (e: MouseEvent) => {
      setGhostPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [draggingId]);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverColumn(null);
    setGhostPos(null);
  }, []);

  const handleColumnDragOver = useCallback((e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== status) {
      setDragOverColumn(status);
    }
  }, [dragOverColumn]);

  const handleColumnDragLeave = useCallback((status: TaskStatus) => {
    if (dragOverColumn === status) {
      setDragOverColumn(null);
    }
  }, [dragOverColumn]);

  const handleDrop = useCallback((e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.stopPropagation();
    const id = e.dataTransfer.getData('text/plain') || draggingId;
    if (id) {
      onStatusChange(id, status);
    }
    setDraggingId(null);
    setDragOverColumn(null);
    setGhostPos(null);
  }, [draggingId, onStatusChange]);

  const handleCreateInColumn = (status: TaskStatus) => {
    const title = prompt('请输入任务标题：');
    if (title && title.trim()) {
      onTaskCreate({
        title: title.trim(),
        status,
        description: '',
        estimated_hours: 4,
        due_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
      });
    }
    setEditingColumn(null);
  };

  const draggingTask = draggingId ? tasks.find((t) => t.id === draggingId) : null;

  return (
    <div
      ref={boardRef}
      style={{
        flex: 1,
        display: 'flex',
        overflow: isMobile ? 'auto hidden' : 'hidden auto',
        padding: isMobile ? '12px 8px 16px' : '20px 24px 24px',
        gap: 16,
        alignItems: 'stretch',
        minHeight: 0,
      }}
    >
      {columnOrder.map((status) => {
        const colors = COLUMN_COLORS[status];
        const colTasks = tasksByColumn.get(status) || [];
        const isDragOver = dragOverColumn === status && draggingId;
        const count = columnCounts[status] || 0;

        return (
          <div
            key={status}
            onDragOver={(e) => handleColumnDragOver(e, status)}
            onDragLeave={() => handleColumnDragLeave(status)}
            onDrop={(e) => handleDrop(e, status)}
            style={{
              minWidth: isMobile ? 280 : 300,
              width: isMobile ? 280 : '100%',
              flex: 1,
              maxWidth: isMobile ? 280 : 400,
              display: 'flex',
              flexDirection: 'column',
              background: colors.bg,
              border: isDragOver
                ? `2px dashed #3b82f6`
                : `1px solid ${colors.border}`,
              borderRadius: 14,
              transition: 'all 0.15s',
              boxShadow: isDragOver ? '0 0 0 4px rgba(59,130,246,0.1), 0 8px 24px rgba(59,130,246,0.15)' : 'none',
              minHeight: 0,
              position: 'relative',
            }}
          >
            <div
              style={{
                padding: '14px 14px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
                borderBottom: `1px solid ${colors.border}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', background: colors.dot,
                  boxShadow: `0 0 8px ${colors.dot}66`,
                }} />
                <span style={{
                  fontSize: 14, fontWeight: 600,
                  color: colors.accent,
                  letterSpacing: 0.3,
                }}>
                  {columnNames[status]}
                </span>
                <span style={{
                  background: colors.accent + '22',
                  color: colors.accent,
                  padding: '2px 10px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  minWidth: 28,
                  textAlign: 'center',
                }}>
                  {count}
                </span>
              </div>
              <button
                onClick={() => handleCreateInColumn(status)}
                title="在此列创建任务"
                style={{
                  width: 28, height: 28,
                  background: isDragOver ? 'rgba(59,130,246,0.25)' : 'transparent',
                  color: isDragOver ? '#fff' : colors.accent,
                  border: `1px solid ${isDragOver ? '#3b82f6' : colors.accent + '44'}`,
                  borderRadius: 7,
                  cursor: 'pointer',
                  fontSize: 16,
                  fontWeight: 500,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
              >
                +
              </button>
            </div>

            {isDragOver && (
              <div style={{
                position: 'absolute',
                top: 54, left: 10, right: 10, bottom: 10,
                border: '2px dashed rgba(59,130,246,0.4)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 1,
                background: 'rgba(59,130,246,0.04)',
              }}>
                <div style={{
                  color: '#3b82f6',
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: 0.3,
                }}>
                  🎯 放置到「{columnNames[status]}」列
                </div>
              </div>
            )}

            <VirtualCardList
              items={colTasks}
              users={users}
              userMap={userMap}
              onTaskUpdate={onTaskUpdate}
              onTaskDelete={onTaskDelete}
              draggingId={draggingId}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          </div>
        );
      })}

      {draggingTask && ghostPos && (
        <div
          style={{
            position: 'fixed',
            left: ghostPos.x + 16,
            top: ghostPos.y + 16,
            width: 260,
            pointerEvents: 'none',
            zIndex: 9999,
            opacity: 0.85,
            transform: 'rotate(2deg)',
          }}
        >
          <TaskCard
            task={draggingTask}
            users={users}
            userMap={userMap}
            onUpdate={() => {}}
            onDelete={() => {}}
            draggable={false}
            ghost
          />
        </div>
      )}
    </div>
  );
};

export default Board;
