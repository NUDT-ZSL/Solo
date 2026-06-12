import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import {
  TimelineEvent,
  EVENT_TYPE_COLORS,
  EVENT_TYPE_LABELS,
  DEFAULT_TOTAL_DURATION,
  EventType
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

const TimelineBar: React.FC<TimelineBarProps> = ({
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
  const [dragOffsets, setDragOffsets] = useState<Record<string, number>>({});

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

  const timeToX = useCallback((time: number) => {
    return (time / totalDuration) * width;
  }, [width, totalDuration]);

  const xToTime = useCallback((x: number) => {
    return (x / width) * totalDuration;
  }, [width, totalDuration]);

  const getEventWidth = useCallback((duration: number) => {
    return Math.max(MIN_EVENT_WIDTH, (duration / totalDuration) * width);
  }, [width, totalDuration]);

  useEffect(() => {
    if (!svgRef.current || width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.attr('width', width).attr('height', TIMELINE_HEIGHT);

    svg.append('rect')
      .attr('class', 'timeline-track')
      .attr('x', 0)
      .attr('y', TRACK_Y)
      .attr('width', width)
      .attr('height', TRACK_HEIGHT)
      .attr('rx', 4);

    const xScale = d3.scaleLinear()
      .domain([0, totalDuration])
      .range([0, width]);

    const ticks = d3.range(0, totalDuration + 1, 1);

    const tickGroup = svg.append('g');
    ticks.forEach(t => {
      const x = xScale(t);
      tickGroup.append('line')
        .attr('class', 'tick-line')
        .attr('x1', x)
        .attr('y1', TRACK_Y)
        .attr('x2', x)
        .attr('y2', TRACK_Y + TRACK_HEIGHT);

      if (t % 5 === 0 || totalDuration <= 15) {
        tickGroup.append('text')
          .attr('class', 'tick-label')
          .attr('x', x)
          .attr('y', TRACK_Y + TRACK_HEIGHT + 16)
          .text(`${t}s`);
      }
    });

    events.forEach(event => {
      const x = timeToX(event.startTime + (dragOffsets[event.id] || 0));
      const eventWidth = getEventWidth(event.duration);
      const isDragging = draggingId === event.id;
      const isSnapping = snappingId === event.id;
      const isPlaying = playingEventId === event.id;
      const isSelected = selectedEventId === event.id;

      const classNames = ['event-block'];
      if (isDragging) classNames.push('dragging');
      if (isSnapping) classNames.push('snapping');
      if (isPlaying) classNames.push('playing');
      if (isSelected) classNames.push('selected');

      const g = svg.append('g')
        .attr('transform', `translate(${x}, ${EVENT_Y})`)
        .style('cursor', 'grab');

      g.append('rect')
        .attr('class', classNames.join(' '))
        .attr('width', eventWidth)
        .attr('height', EVENT_HEIGHT)
        .attr('fill', EVENT_TYPE_COLORS[event.type]);

      if (eventWidth > 40) {
        g.append('text')
          .attr('class', 'event-block-text')
          .attr('x', eventWidth / 2)
          .attr('y', EVENT_HEIGHT / 2 + 4)
          .attr('text-anchor', 'middle')
          .text(event.name.length > 8 ? event.name.slice(0, 8) + '…' : event.name);
      }

      g.on('mousedown', (e) => {
        e.stopPropagation();
        const rect = svgRef.current!.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const offset = xToTime(mouseX) - event.startTime;

        setDraggingId(event.id);
        setDragOffsets(prev => ({ ...prev, [event.id]: -offset + (dragOffsets[event.id] || 0) }));
        onEventSelect(event.id);
      });
    });

    svg.on('click', () => {
      onEventSelect(null);
    });
  }, [events, width, totalDuration, draggingId, snappingId, selectedEventId, playingEventId, dragOffsets, timeToX, xToTime, getEventWidth, onEventSelect]);

  useEffect(() => {
    if (!draggingId) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const draggedEvent = events.find(ev => ev.id === draggingId);
      if (!draggedEvent) return;

      const rawTime = xToTime(Math.max(0, Math.min(width - getEventWidth(draggedEvent.duration), mouseX)));
      const snapped = Math.round(rawTime);
      setDragOffsets(prev => ({
        ...prev,
        [draggingId]: snapped - draggedEvent.startTime
      }));
    };

    const handleMouseUp = () => {
      const draggedEvent = events.find(ev => ev.id === draggingId);
      if (draggedEvent) {
        const offset = dragOffsets[draggingId] || 0;
        const newStartTime = Math.max(0, Math.min(
          totalDuration - draggedEvent.duration,
          Math.round(draggedEvent.startTime + offset)
        ));

        setSnappingId(draggingId);
        setTimeout(() => {
          const updatedEvents = events.map(ev =>
            ev.id === draggingId ? { ...ev, startTime: newStartTime } : ev
          );
          onEventsChange(updatedEvents);
          setSnappingId(null);
        }, 200);
      }
      setDraggingId(null);
      setDragOffsets({});
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingId, events, dragOffsets, width, totalDuration, xToTime, getEventWidth, onEventsChange]);

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

export default TimelineBar;
