import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import type { StatsDataPoint, TimeRange } from '../types';

interface HeatMapProps {
  data: StatsDataPoint[];
  range: TimeRange;
}

const TIME_SLOTS = [
  { key: 'morning', label: '凌晨 (0-6)' },
  { key: 'forenoon', label: '上午 (6-12)' },
  { key: 'afternoon', label: '下午 (12-18)' },
  { key: 'evening', label: '晚上 (18-24)' }
];

const DAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  date?: string;
  timeOfDay?: string;
  count?: number;
}

export default function HeatMap({ data, range }: HeatMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0 });
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth - 120);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const { weeks, startDate } = useMemo(() => {
    const dates = [...new Set(data.map((d) => d.date))].sort();
    let start: Date;
    let totalWeeks: number;

    if (range === 'weekly') {
      totalWeeks = 1;
      const now = new Date();
      start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
    } else if (range === 'monthly') {
      totalWeeks = 5;
      const now = new Date();
      start = new Date(now);
      start.setDate(now.getDate() - 34);
    } else {
      totalWeeks = 13;
      const now = new Date();
      start = new Date(now);
      start.setDate(now.getDate() - 90);
    }

    const weeksArr: string[][] = [];
    for (let w = 0; w < totalWeeks; w++) {
      const week: string[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(start);
        date.setDate(start.getDate() + w * 7 + d);
        week.push(date.toISOString().slice(0, 10));
      }
      weeksArr.push(week);
    }
    void dates;
    return { weeks: weeksArr, startDate: start };
  }, [data, range]);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const cellWidth = Math.max(18, Math.min(42, (containerWidth - 40) / Math.max(weeks.length, 8)));
    const cellHeight = 24;
    const cellGap = 3;
    const labelWidth = 90;
    const topPadding = 30;
    const leftPadding = 10;

    const totalCells = weeks.length * 7;
    void totalCells;

    const maxCount = Math.max(1, ...data.map((d) => d.count));

    const colorScale = d3
      .scaleSequential<string>()
      .domain([0, maxCount])
      .interpolator(d3.interpolateRgbBasis(['#1e3a5f', '#2a5298', '#4a90d9', '#64b5f6', '#90caf9']));

    const g = svg.append('g').attr('transform', `translate(${leftPadding}, ${topPadding})`);

    for (let t = 0; t < TIME_SLOTS.length; t++) {
      g.append('text')
        .attr('x', labelWidth - 10)
        .attr('y', t * (cellHeight + cellGap) + cellHeight / 2 + 4)
        .attr('text-anchor', 'end')
        .attr('fill', '#a8b2d1')
        .attr('font-size', '11px')
        .text(TIME_SLOTS[t].label);
    }

    for (let w = 0; w < weeks.length; w++) {
      for (let d = 0; d < 7; d++) {
        if (w === 0) {
          g.append('text')
            .attr('x', labelWidth + w * (cellWidth + cellGap) + cellWidth / 2)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .attr('fill', '#a8b2d1')
            .attr('font-size', '11px')
            .text(DAY_LABELS[d][2]);
        }

        const date = weeks[w][d];
        const dateObj = new Date(date);
        const dayOfWeek = dateObj.getDay();

        for (let t = 0; t < TIME_SLOTS.length; t++) {
          const slot = TIME_SLOTS[t].key as StatsDataPoint['timeOfDay'];
          const point = data.find(
            (p) =>
              p.date === date &&
              p.timeOfDay === slot &&
              p.dayOfWeek === dayOfWeek
          );
          const count = point?.count || 0;

          const cellX = labelWidth + d * (cellWidth + cellGap) + w * 7 * (cellWidth + cellGap);
          const cellY = t * (cellHeight + cellGap);

          const cell = g
            .append('rect')
            .attr('class', 'heatmap-cell')
            .attr('x', cellX)
            .attr('y', cellY)
            .attr('width', cellWidth)
            .attr('height', cellHeight)
            .attr('rx', 4)
            .attr('fill', count === 0 ? 'rgba(255,255,255,0.04)' : colorScale(count))
            .attr('stroke', 'rgba(255,255,255,0.05)')
            .attr('stroke-width', 0.5);

          cell
            .on('mouseenter', function (event) {
              const [x, y] = d3.pointer(event, document.body);
              d3.select(this).style('opacity', 0.7);
              setTooltip({
                visible: true,
                x: x + 12,
                y: y - 10,
                date: date,
                timeOfDay: TIME_SLOTS[t].label,
                count
              });
            })
            .on('mousemove', function (event) {
              const [x, y] = d3.pointer(event, document.body);
              setTooltip((prev) => ({ ...prev, x: x + 12, y: y - 10 }));
            })
            .on('mouseleave', function () {
              d3.select(this).style('opacity', 1);
              setTooltip((prev) => ({ ...prev, visible: false }));
            });
        }
      }
    }
  }, [data, weeks, containerWidth]);

  const totalWidth = useMemo(() => {
    const cellWidth = Math.max(18, Math.min(42, (containerWidth - 40) / Math.max(weeks.length, 8)));
    const cellGap = 3;
    const labelWidth = 90;
    return labelWidth + weeks.length * 7 * (cellWidth + cellGap) + 40;
  }, [weeks.length, containerWidth]);

  const svgHeight = TIME_SLOTS.length * 27 + 60;

  const maxCount = Math.max(1, ...data.map((d) => d.count));
  const legendSteps = [0, 0.25, 0.5, 0.75, 1].map((t) =>
    d3.interpolateRgbBasis(['#1e3a5f', '#2a5298', '#4a90d9', '#64b5f6', '#90caf9'])(t)
  );

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        className="heatmap-svg"
        viewBox={`0 0 ${totalWidth} ${svgHeight}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', maxWidth: `${totalWidth}px` }}
      />

      <div className="heatmap-legend">
        <span>少</span>
        <div className="heatmap-legend-steps">
          {legendSteps.map((color, i) => (
            <div
              key={i}
              className="heatmap-legend-step"
              style={{ background: color }}
              title={String(Math.round(maxCount * (i / (legendSteps.length - 1))))}
            />
          ))}
        </div>
        <span>多</span>
      </div>

      {tooltip.visible && (
        <div
          className="heatmap-tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y
          }}
        >
          <div className="heatmap-tooltip-date">{tooltip.date}</div>
          <div className="heatmap-tooltip-value">
            {tooltip.timeOfDay} · 打卡 {tooltip.count} 次
          </div>
        </div>
      )}
    </div>
  );
}
