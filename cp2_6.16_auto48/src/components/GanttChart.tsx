import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import type { MindMapNode, Priority, Theme, GanttTask } from '../types';

interface GanttChartProps {
  nodes: Record<string, MindMapNode>;
  rootId: string;
  selectedNodeId: string | null;
  theme: Theme;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelectNode: (id: string) => void;
  onToggleNodeCollapse: (id: string) => void;
}

const priorityColors: Record<Priority, string> = {
  high: '#ef4444',
  medium: '#eab308',
  low: '#22c55e',
};

const ROW_HEIGHT = 40;
const BAR_HEIGHT = 24;
const LEFT_PADDING = 16;
const INDENT_SIZE = 20;
const DATE_LABEL_HEIGHT = 40;
const TOP_PADDING = 16;

function formatDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getTaskDuration(node: MindMapNode): number {
  if (node.isMilestone) return 1;
  return Math.max(1, Math.ceil(node.progress / 20) + 1);
}

const GanttChart: React.FC<GanttChartProps> = ({
  nodes,
  rootId,
  selectedNodeId,
  theme,
  collapsed,
  onToggleCollapse,
  onSelectNode,
  onToggleNodeCollapse,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    task: GanttTask | null;
  }>({ visible: false, x: 0, y: 0, task: null });
  const [containerSize, setContainerSize] = useState({ width: 300, height: 400 });

  const ganttTasks = useMemo<GanttTask[]>(() => {
    const tasks: GanttTask[] = [];

    function traverse(nodeId: string, level: number) {
      const node = nodes[nodeId];
      if (!node) return;

      const dueDate = new Date(node.dueDate);
      const duration = getTaskDuration(node);
      const startDate = addDays(dueDate, -duration + 1);

      tasks.push({
        id: node.id,
        title: node.title,
        priority: node.priority,
        startDate,
        endDate: dueDate,
        progress: node.progress,
        level,
        isMilestone: node.isMilestone,
        hasChildren: node.children.length > 0,
        collapsed: node.collapsed,
        parentId: node.parentId,
      });

      if (!node.collapsed) {
        node.children.forEach((childId) => traverse(childId, level + 1));
      }
    }

    if (rootId) {
      traverse(rootId, 0);
    }

    return tasks;
  }, [nodes, rootId]);

  const dateRange = useMemo(() => {
    if (ganttTasks.length === 0) {
      const today = new Date();
      return { start: today, end: addDays(today, 30) };
    }

    let minDate = ganttTasks[0].startDate;
    let maxDate = ganttTasks[0].endDate;

    ganttTasks.forEach((task) => {
      if (task.startDate < minDate) minDate = task.startDate;
      if (task.endDate > maxDate) maxDate = task.endDate;
    });

    minDate = addDays(minDate, -3);
    maxDate = addDays(maxDate, 3);

    return { start: minDate, end: maxDate };
  }, [ganttTasks]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [collapsed]);

  const chartWidth = useMemo(() => {
    return Math.max(containerSize.width - LEFT_PADDING - 20, 200);
  }, [containerSize.width]);

  const xScale = useMemo(() => {
    return d3
      .scaleTime()
      .domain([dateRange.start, dateRange.end])
      .range([0, chartWidth]);
  }, [dateRange, chartWidth]);

  const chartHeight = useMemo(() => {
    return ganttTasks.length * ROW_HEIGHT + TOP_PADDING + DATE_LABEL_HEIGHT;
  }, [ganttTasks.length]);

  const themeColors = useMemo(() => {
    if (theme === 'dark') {
      return {
        bg: '#1e293b',
        border: '#334155',
        text: '#f1f5f9',
        textSecondary: '#94a3b8',
        rowHover: '#334155',
        gridLine: '#334155',
        dateLabel: '#94a3b8',
      };
    }
    return {
      bg: '#ffffff',
      border: '#e2e8f0',
      text: '#1e293b',
      textSecondary: '#64748b',
      rowHover: '#f8fafc',
      gridLine: '#e2e8f0',
      dateLabel: '#94a3b8',
    };
  }, [theme]);

  const handleBarMouseEnter = useCallback(
    (e: React.MouseEvent, task: GanttTask) => {
      setTooltip({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        task,
      });
    },
    []
  );

  const handleBarMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltip((prev) => ({
      ...prev,
      x: e.clientX,
      y: e.clientY,
    }));
  }, []);

  const handleBarMouseLeave = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

  const dateLabels = useMemo(() => {
    const labels: Date[] = [];
    const days = d3.timeDay.range(dateRange.start, addDays(dateRange.end, 1));
    const step = Math.max(1, Math.ceil(days.length / 10));
    for (let i = 0; i < days.length; i += step) {
      labels.push(days[i]);
    }
    return labels;
  }, [dateRange]);

  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        style={{
          position: 'absolute',
          right: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          backgroundColor: '#3b82f6',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontSize: '18px',
          zIndex: 10,
          transition: 'transform 150ms ease',
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLButtonElement).style.transform = 'translateY(-50%) scale(1.05)';
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLButtonElement).style.transform = 'translateY(-50%) scale(1)';
        }}
        onMouseDown={(e) => {
          (e.target as HTMLButtonElement).style.transform = 'translateY(-50%) scale(0.95)';
        }}
        onMouseUp={(e) => {
          (e.target as HTMLButtonElement).style.transform = 'translateY(-50%) scale(1.05)';
        }}
      >
        ◀
      </button>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: themeColors.bg,
        borderRadius: '16px',
        border: `1px solid ${themeColors.border}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          padding: '16px',
          borderBottom: `1px solid ${themeColors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 600,
            color: themeColors.text,
          }}
        >
          甘特图
        </h3>
        <button
          onClick={onToggleCollapse}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: 'transparent',
            color: themeColors.textSecondary,
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 150ms ease',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor =
              theme === 'dark' ? '#334155' : '#f1f5f9';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
          }}
        >
          ▶
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <svg
          ref={svgRef}
          width="100%"
          height={chartHeight}
          style={{ display: 'block' }}
        >
          <g transform={`translate(${LEFT_PADDING}, ${TOP_PADDING})`}>
            <g transform={`translate(0, ${DATE_LABEL_HEIGHT})`}>
              {dateLabels.map((date, i) => {
                const x = xScale(date);
                return (
                  <g key={i}>
                    <line
                      x1={x}
                      y1={0}
                      x2={x}
                      y2={ganttTasks.length * ROW_HEIGHT}
                      stroke={themeColors.gridLine}
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={x}
                      y={-DATE_LABEL_HEIGHT + 20}
                      fontSize="12px"
                      fill={themeColors.dateLabel}
                      textAnchor="middle"
                    >
                      {formatDate(date)}
                    </text>
                  </g>
                );
              })}
            </g>

            <g transform={`translate(0, ${DATE_LABEL_HEIGHT})`}>
              {ganttTasks.map((task, index) => {
                const y = index * ROW_HEIGHT;
                const barY = y + (ROW_HEIGHT - BAR_HEIGHT) / 2;
                const barStartX = xScale(task.startDate);
                const barEndX = xScale(task.endDate);
                const barWidth = Math.max(20, barEndX - barStartX);
                const isSelected = selectedNodeId === task.id;
                const leftOffset = task.level * INDENT_SIZE;

                return (
                  <g
                    key={task.id}
                    transform={`translate(${leftOffset}, 0)`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onSelectNode(task.id)}
                  >
                    <rect
                      x={-leftOffset}
                      y={y}
                      width={chartWidth}
                      height={ROW_HEIGHT}
                      fill="transparent"
                      style={{
                        transition: 'fill 150ms ease',
                      }}
                      onMouseEnter={(e) => {
                        (e.target as SVGRectElement).setAttribute(
                          'fill',
                          themeColors.rowHover
                        );
                      }}
                      onMouseLeave={(e) => {
                        (e.target as SVGRectElement).setAttribute(
                          'fill',
                          'transparent'
                        );
                      }}
                    />

                    {task.hasChildren && (
                      <g
                        transform={`translate(${4}, ${y + ROW_HEIGHT / 2 - 4})`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleNodeCollapse(task.id);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <path
                          d={task.collapsed ? 'M 2 2 L 6 4 L 2 6 Z' : 'M 2 2 L 4 6 L 6 2 Z'}
                          fill={themeColors.textSecondary}
                        />
                      </g>
                    )}

                    <text
                      x={task.hasChildren ? 24 : 8}
                      y={y + ROW_HEIGHT / 2 + 4}
                      fontSize="12px"
                      fill={themeColors.text}
                      style={{
                        maxWidth: '100px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {task.title.length > 12
                        ? task.title.substring(0, 12) + '...'
                        : task.title}
                    </text>

                    {task.isMilestone ? (
                      <g
                        transform={`translate(${barStartX + barWidth / 2 - 8}, ${barY + BAR_HEIGHT / 2 - 8})`}
                        onMouseEnter={(e) => handleBarMouseEnter(e, task)}
                        onMouseMove={handleBarMouseMove}
                        onMouseLeave={handleBarMouseLeave}
                      >
                        <polygon
                          points="8,0 10,6 16,6 11,10 13,16 8,12 3,16 5,10 0,6 6,6"
                          fill={priorityColors[task.priority]}
                          stroke={isSelected ? '#3b82f6' : 'transparent'}
                          strokeWidth="2"
                          style={{
                            filter: isSelected
                              ? 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.4))'
                              : 'none',
                          }}
                        />
                      </g>
                    ) : (
                      <g
                        onMouseEnter={(e) => handleBarMouseEnter(e, task)}
                        onMouseMove={handleBarMouseMove}
                        onMouseLeave={handleBarMouseLeave}
                      >
                        <rect
                          x={barStartX}
                          y={barY}
                          width={barWidth}
                          height={BAR_HEIGHT}
                          rx="4"
                          ry="4"
                          fill={priorityColors[task.priority]}
                          opacity={0.8}
                          stroke={isSelected ? '#3b82f6' : 'transparent'}
                          strokeWidth="2"
                          style={{
                            filter: isSelected
                              ? 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.4))'
                              : 'none',
                            transition: 'filter 150ms ease',
                          }}
                        />
                        <rect
                          x={barStartX}
                          y={barY}
                          width={barWidth * (task.progress / 100)}
                          height={BAR_HEIGHT}
                          rx="4"
                          ry="4"
                          fill={priorityColors[task.priority]}
                          style={{ transition: 'width 300ms ease' }}
                        />
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          </g>
        </svg>
      </div>

      {tooltip.visible && tooltip.task && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y - 8,
            transform: 'translate(-50%, -100%)',
            backgroundColor: '#1e293b',
            color: '#ffffff',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '14px',
            zIndex: 1000,
            pointerEvents: 'none',
            opacity: tooltip.visible ? 1 : 0,
            transformOrigin: 'bottom center',
            animation: 'tooltipIn 150ms ease-out',
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '6px' }}>
            {tooltip.task.title}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>
            {formatDate(tooltip.task.startDate)} - {formatDate(tooltip.task.endDate)}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
            进度: {tooltip.task.progress}%
          </div>
        </div>
      )}

      <style>{`
        @keyframes tooltipIn {
          from {
            opacity: 0;
            transform: translate(-50%, calc(-100% + 8px));
          }
          to {
            opacity: 1;
            transform: translate(-50%, -100%);
          }
        }
      `}</style>
    </div>
  );
};

export default GanttChart;
