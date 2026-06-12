import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Task, TooltipInfo, ROW_HEIGHT, HEADER_HEIGHT } from './types';
import { useTimeline } from './useTimeline';
import TaskBar from './components/TaskBar';
import DependencyLines from './components/DependencyLines';
import Minimap from './components/Minimap';
import Tooltip from './components/Tooltip';

interface GanttChartProps {
  tasks: Task[];
  newlyAddedId: string | null;
  onNewAddedConsumed: () => void;
}

function getConnectedTasks(taskId: string, tasks: Task[]): Set<string> {
  const result = new Set<string>();
  result.add(taskId);
  const visited = new Set<string>();

  function visitUp(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    for (const dep of task.dependencies) {
      result.add(dep);
      visitUp(dep);
    }
  }

  function visitDown(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    for (const task of tasks) {
      if (task.dependencies.includes(id)) {
        result.add(task.id);
        visitDown(task.id);
      }
    }
  }

  visitUp(taskId);
  visited.clear();
  visitDown(taskId);
  return result;
}

export default function GanttChart({ tasks, newlyAddedId, onNewAddedConsumed }: GanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(800);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const timeline = useTimeline(tasks, zoom, viewportWidth);

  const highlightedTaskIds = useMemo(() => {
    if (!highlightedTaskId) return new Set<string>();
    return getConnectedTasks(highlightedTaskId, tasks);
  }, [highlightedTaskId, tasks]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setViewportWidth(entry.contentRect.width);
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (newlyAddedId) {
      requestAnimationFrame(() => {
        const container = containerRef.current;
        if (!container) return;
        const pos = timeline.positions.find(p => p.id === newlyAddedId);
        if (pos) {
          container.scrollTo({
            top: pos.y - container.clientHeight / 2 + 40,
            left: Math.max(0, pos.x - 60),
            behavior: 'smooth',
          });
        }
        onNewAddedConsumed();
      });
    }
  }, [newlyAddedId, timeline.positions, onNewAddedConsumed]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (container) setScrollLeft(container.scrollLeft);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom(prev => {
        const delta = e.deltaY > 0 ? -0.5 : 0.5;
        return Math.min(5, Math.max(1, Math.round((prev + delta) * 2) / 2));
      });
    }
  }, []);

  const handleZoomSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setZoom(Number(e.target.value));
  }, []);

  const handleTaskClick = useCallback((taskId: string) => {
    setHighlightedTaskId(prev => prev === taskId ? null : taskId);
  }, []);

  const handleTaskMouseEnter = useCallback((e: React.MouseEvent, task: Task) => {
    setTooltip({ task, mouseX: e.clientX, mouseY: e.clientY });
  }, []);

  const handleTaskMouseMove = useCallback((e: React.MouseEvent, task: Task) => {
    setTooltip(prev => prev ? { ...prev, mouseX: e.clientX, mouseY: e.clientY } : null);
  }, []);

  const handleTaskMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const handleMinimapScroll = useCallback((newScrollLeft: number) => {
    const container = containerRef.current;
    if (container) {
      container.scrollLeft = newScrollLeft;
      setScrollLeft(newScrollLeft);
    }
  }, []);

  const completedCount = tasks.filter(t => t.category === 'completed').length;
  const completionPct = tasks.length > 0 ? Math.round(completedCount / tasks.length * 100) : 0;

  return (
    <div className="gantt-section">
      <div className="gantt-main-row">
        <div className="gantt-scroll-area" ref={containerRef} onScroll={handleScroll} onWheel={handleWheel}>
          <svg
            width={Math.max(timeline.totalWidth, viewportWidth)}
            height={timeline.totalHeight}
            style={{ display: 'block', minWidth: viewportWidth }}
          >
            <defs>
              <pattern id="grid-pattern" width={timeline.pixelsPerDay} height={ROW_HEIGHT} patternUnits="userSpaceOnUse">
                <line x1={0} y1={0} x2={0} y2={ROW_HEIGHT} stroke="#eee" strokeWidth={1} strokeDasharray="4,4" />
              </pattern>
            </defs>

            <rect
              x={0} y={HEADER_HEIGHT}
              width={Math.max(timeline.totalWidth, viewportWidth)}
              height={timeline.totalHeight - HEADER_HEIGHT}
              fill="url(#grid-pattern)"
            />

            {timeline.ticks.map((tick, i) => (
              <g key={i}>
                <line
                  x1={tick.x} y1={HEADER_HEIGHT - 6}
                  x2={tick.x} y2={HEADER_HEIGHT}
                  stroke="#aaa" strokeWidth={1}
                />
                <line
                  x1={tick.x} y1={HEADER_HEIGHT}
                  x2={tick.x} y2={timeline.totalHeight}
                  stroke="#eee" strokeWidth={1} strokeDasharray="4,4"
                />
                <text
                  x={tick.x + 4} y={HEADER_HEIGHT - 12}
                  fontSize={12} fill="#666"
                >
                  {tick.label}
                </text>
              </g>
            ))}

            {tasks.map((task) => {
              const pos = timeline.positions.find(p => p.id === task.id);
              if (!pos) return null;
              return (
                <TaskBar
                  key={task.id}
                  task={task}
                  position={pos}
                  isHighlighted={highlightedTaskId === task.id}
                  isDependencyHighlighted={highlightedTaskIds.has(task.id) && highlightedTaskId !== task.id}
                  onMouseEnter={handleTaskMouseEnter}
                  onMouseMove={handleTaskMouseMove}
                  onMouseLeave={handleTaskMouseLeave}
                  onClick={handleTaskClick}
                />
              );
            })}

            <DependencyLines
              tasks={tasks}
              positions={timeline.positions}
              highlightedTaskIds={highlightedTaskIds}
            />
          </svg>
        </div>

        {!isMobile && (
          <Minimap
            tasks={tasks}
            positions={timeline.positions}
            totalWidth={timeline.totalWidth}
            totalHeight={timeline.totalHeight}
            scrollLeft={scrollLeft}
            viewportWidth={viewportWidth}
            onScrollChange={handleMinimapScroll}
          />
        )}
      </div>

      <div className="zoom-control">
        <span className="zoom-label">缩放</span>
        <input
          type="range"
          min={1}
          max={5}
          step={0.5}
          value={zoom}
          onChange={handleZoomSlider}
          className="zoom-slider"
        />
        <span className="zoom-value">{zoom}x</span>
      </div>

      <div className="status-bar">
        <span className="status-text">
          总任务：{tasks.length}
        </span>
        <div className="status-progress-wrap">
          <div className="status-progress-bg">
            <motion.div
              className="status-progress-fill"
              animate={{ width: `${completionPct}%` }}
              transition={{ duration: 0.5, ease: 'linear' }}
            />
          </div>
          <span className="status-pct">{completionPct}%</span>
        </div>
      </div>

      {tooltip && (
        <Tooltip
          task={tooltip.task}
          mouseX={tooltip.mouseX}
          mouseY={tooltip.mouseY}
        />
      )}
    </div>
  );
}
