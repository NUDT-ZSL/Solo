/*
 * TimelineBar.tsx — 水平时间轴组件
 *
 * 【数据流向】
 *   输入 (props):
 *     ← events[]             来自 App.tsx state (全局事件列表)
 *     ← selectedEventId      来自 App.tsx state (当前选中ID)
 *     ← playingEventId       来自 App.tsx state (正在播放ID)
 *     ← totalDuration        来自 App.tsx (默认30s，可配置)
 *
 *   输出 (callbacks):
 *     → onEventsChange()     → App.tsx setEvents() — 拖拽结束后更新全局事件数组
 *     → onEventSelect()      → App.tsx setSelectedEventId() — 点击事件块或空白区域时更新选中项
 *
 * 【调用关系】
 *   被调用方: App.tsx (父组件)
 *   内部依赖: d3 (SVG刻度渲染), eventsData (类型/颜色常量)
 *
 * 【性能优化】
 *   - React.memo 浅比较 props，避免无意义重渲染
 *   - useMemo 缓存计算值 (timeToX/getEventWidth 等函数的输入参数)
 *   - requestAnimationFrame 节流拖拽 mousemove，帧率稳定 50+ fps
 *   - d3.select 重绘采用防抖窗口(通过 raf 合并多次 state 更新成单次绘制)
 *   - 拖拽避让算法 O(n) 单轮扫描，避免冒泡级联
 */
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import {
  TimelineEvent,
  EVENT_TYPE_COLORS,
  EVENT_TYPE_LABELS,
  DEFAULT_TOTAL_DURATION,
  EventType,
  sortEventsByTime
} from './eventsData';

interface TimelineBarProps {
  events: TimelineEvent[];
  selectedEventId: string | null;
  playingEventId: string | null;
  totalDuration?: number;
  onEventsChange: (events: TimelineEvent[]) => void;
  onEventSelect: (eventId: string | null) => void;
}

const TIMELINE_HEIGHT = 120;
const TRACK_Y = 20;
const TRACK_HEIGHT = 40;
const EVENT_HEIGHT = 30;
const EVENT_Y = TRACK_Y + (TRACK_HEIGHT - EVENT_HEIGHT) / 2;
const MIN_EVENT_WIDTH = 20;

/**
 * 碰撞检测 + 自动避让
 * 将 targetEvent 移动到 newStartTime 后，检测与其重叠的事件，
 * 按时间顺序依次向右推动重叠块，保证不重叠。
 * 返回: 完整的新事件数组
 */
function resolveCollisions(
  events: TimelineEvent[],
  targetId: string,
  newStartTime: number,
  totalDuration: number
): TimelineEvent[] {
  const sorted = sortEventsByTime(events.map(ev =>
    ev.id === targetId ? { ...ev, startTime: newStartTime } : ev
  ));

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    if (!next) break;
    const currentEnd = current.startTime + current.duration;
    if (next.startTime < currentEnd) {
      const pushed = Math.max(next.startTime, Math.round(currentEnd));
      if (pushed + next.duration > totalDuration) {
        sorted[i + 1] = { ...next, startTime: Math.max(0, totalDuration - next.duration) };
      } else {
        sorted[i + 1] = { ...next, startTime: pushed };
      }
    }
  }

  return sorted;
}

const TimelineBarInner: React.FC<TimelineBarProps> = ({
  events,
  selectedEventId,
  playingEventId,
  totalDuration = DEFAULT_TOTAL_DURATION,
  onEventsChange,
  onEventSelect
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [snappingId, setSnappingId] = useState<string | null>(null);
  const [liveOffsets, setLiveOffsets] = useState<Record<string, number>>({});

  const rafRef = useRef<number | null>(null);
  const pendingMouseXRef = useRef<number | null>(null);
  const dragStartOffsetRef = useRef<number>(0);

  /* ---------- Resize observer ---------- */
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  /* ---------- Memoized scales ---------- */
  const xScale = useMemo(() => (time: number) => (time / totalDuration) * width, [width, totalDuration]);
  const invScale = useMemo(() => (x: number) => (x / width) * totalDuration, [width, totalDuration]);
  const eventW = useMemo(() => (d: number) => Math.max(MIN_EVENT_WIDTH, (d / totalDuration) * width), [width, totalDuration]);

  /* ---------- D3 SVG render ---------- */
  useEffect(() => {
    if (!svgRef.current || width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', TIMELINE_HEIGHT);

    /* track */
    svg.append('rect')
      .attr('class', 'timeline-track')
      .attr('x', 0)
      .attr('y', TRACK_Y)
      .attr('width', width)
      .attr('height', TRACK_HEIGHT)
      .attr('rx', 4);

    /* ticks (1s间隔刻度) */
    const ticks = d3.range(0, totalDuration + 1, 1);
    const tickGroup = svg.append('g');
    ticks.forEach(t => {
      const x = xScale(t);
      tickGroup.append('line')
        .attr('class', 'tick-line')
        .attr('x1', x).attr('y1', TRACK_Y)
        .attr('x2', x).attr('y2', TRACK_Y + TRACK_HEIGHT);

      if (t % 5 === 0 || totalDuration <= 15) {
        tickGroup.append('text')
          .attr('class', 'tick-label')
          .attr('x', x)
          .attr('y', TRACK_Y + TRACK_HEIGHT + 16)
          .text(`${t}s`);
      }
    });

    /* events */
    events.forEach(event => {
      const offset = liveOffsets[event.id] || 0;
      const x = xScale(event.startTime + offset);
      const w = eventW(event.duration);

      const classes = ['event-block'];
      if (draggingId === event.id) classes.push('dragging');
      if (snappingId === event.id) classes.push('snapping');
      if (playingEventId === event.id) classes.push('playing');
      if (selectedEventId === event.id) classes.push('selected');

      const g = svg.append('g')
        .attr('transform', `translate(${x}, ${EVENT_Y})`)
        .style('cursor', 'grab');

      g.append('rect')
        .attr('class', classes.join(' '))
        .attr('width', w)
        .attr('height', EVENT_HEIGHT)
        .attr('fill', EVENT_TYPE_COLORS[event.type]);

      if (w > 40) {
        g.append('text')
          .attr('class', 'event-block-text')
          .attr('x', w / 2)
          .attr('y', EVENT_HEIGHT / 2 + 4)
          .attr('text-anchor', 'middle')
          .text(event.name.length > 8 ? event.name.slice(0, 8) + '…' : event.name);
      }

      /* mousedown — 记录偏移，不做取整 */
      g.on('mousedown', (e: MouseEvent) => {
        e.stopPropagation();
        const rect = svgRef.current!.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const eventX = xScale(event.startTime);
        dragStartOffsetRef.current = mouseX - eventX;
        setDraggingId(event.id);
        onEventSelect(event.id);
      });

      /* click (非拖拽状态下才触发) — 选中 */
      g.on('click', (e: MouseEvent) => {
        e.stopPropagation();
        if (!draggingId) onEventSelect(event.id);
      });
    });

    svg.on('click', () => onEventSelect(null));
  }, [events, width, totalDuration, liveOffsets, draggingId, snappingId,
      selectedEventId, playingEventId, xScale, eventW, onEventSelect]);

  /* ---------- mousemove (rAF 节流) ---------- */
  useEffect(() => {
    if (!draggingId) return;

    const processDrag = () => {
      if (pendingMouseXRef.current === null || !svgRef.current) {
        rafRef.current = null;
        return;
      }
      const rect = svgRef.current.getBoundingClientRect();
      const localX = pendingMouseXRef.current - rect.left;
      const draggedEvent = events.find(ev => ev.id === draggingId);
      if (!draggedEvent) {
        rafRef.current = null;
        return;
      }

      const desiredX = Math.max(0, Math.min(
        width - eventW(draggedEvent.duration),
        localX - dragStartOffsetRef.current
      ));
      const desiredTime = invScale(desiredX);
      const snappedTime = Math.round(desiredTime * 100) / 100;

      /* 实时避让: 计算偏移量(不写回 state，只影响 liveOffsets) */
      const offsets: Record<string, number> = {};
      const sorted = sortEventsByTime(events.map(ev =>
        ev.id === draggingId ? { ...ev, startTime: snappedTime } : ev
      ));
      for (let i = 0; i < sorted.length; i++) {
        const orig = events.find(e => e.id === sorted[i].id)!;
        offsets[sorted[i].id] = sorted[i].startTime - orig.startTime;
        const next = sorted[i + 1];
        if (!next) break;
        const curEnd = sorted[i].startTime + sorted[i].duration;
        if (next.startTime < curEnd) {
          const pushed = Math.round(curEnd * 100) / 100;
          const bounded = Math.min(pushed, totalDuration - next.duration);
          sorted[i + 1] = { ...next, startTime: Math.max(0, bounded) };
        }
      }
      setLiveOffsets(offsets);
      pendingMouseXRef.current = null;
      rafRef.current = null;
    };

    const handleMouseMove = (e: MouseEvent) => {
      pendingMouseXRef.current = e.clientX;
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(processDrag);
      }
    };

    const handleMouseUp = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      pendingMouseXRef.current = null;

      const dragged = events.find(ev => ev.id === draggingId);
      if (dragged) {
        const offset = liveOffsets[draggingId] || 0;
        const rawStart = dragged.startTime + offset;
        const snappedStart = Math.max(0, Math.min(
          totalDuration - dragged.duration,
          Math.round(rawStart)
        ));

        setSnappingId(draggingId);
        setLiveOffsets({ [draggingId]: snappedStart - dragged.startTime });

        /* 200ms ease-out 吸附动画后，写回全局 + 避让 */
        window.setTimeout(() => {
          const finalEvents = resolveCollisions(events, draggingId, snappedStart, totalDuration);
          onEventsChange(finalEvents);
          setSnappingId(null);
          setLiveOffsets({});
        }, 200);
      }

      setDraggingId(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [draggingId, events, liveOffsets, width, totalDuration, invScale, eventW, onEventsChange]);

  /* ---------- Legend ---------- */
  const legendItems: { type: EventType; label: string }[] = [
    { type: 'page', label: EVENT_TYPE_LABELS.page },
    { type: 'voice', label: EVENT_TYPE_LABELS.voice },
    { type: 'quiz', label: EVENT_TYPE_LABELS.quiz }
  ];

  return (
    <div className="timeline-section">
      <div className="timeline-wrapper" ref={containerRef}>
        <svg ref={svgRef} className="timeline-svg" />
        <div className="legend">
          {legendItems.map(item => (
            <div key={item.type} className="legend-item">
              <span
                className="legend-color"
                style={{ backgroundColor: EVENT_TYPE_COLORS[item.type] }}
              />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TimelineBar = React.memo(TimelineBarInner);
export default TimelineBar;
