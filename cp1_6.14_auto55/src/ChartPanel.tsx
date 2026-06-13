import { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import type { Dataset, DataPoint } from './types';

interface ChartPanelProps {
  dataset: Dataset;
  currentIndex: number;
  currentDataPoint: DataPoint | null;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  value: number;
  time: Date;
  unit: string;
}

const margin = { top: 30, right: 30, bottom: 40, left: 60 };

function ChartPanel({ dataset, currentIndex, currentDataPoint }: ChartPanelProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    value: 0,
    time: new Date(),
    unit: '',
  });

  const { data } = dataset;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const width = container.clientWidth;
      const isMobile = window.innerWidth < 768;
      const height = isMobile ? 300 : 500;
      setDimensions({ width, height });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const scales = useMemo(() => {
    if (data.length === 0) return null;
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    const xDomain = d3.extent(data, (d) => d.time) as [Date, Date];
    const yExtent = d3.extent(data, (d) => d.value) as [number, number];
    const yPadding = (yExtent[1] - yExtent[0]) * 0.1 || 1;
    const yDomain: [number, number] = [yExtent[0] - yPadding, yExtent[1] + yPadding];

    const xScale = d3.scaleTime().domain(xDomain).range([0, width]);
    const yScale = d3.scaleLinear().domain(yDomain).range([height, 0]);

    return { xScale, yScale, width, height };
  }, [data, dimensions]);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    if (!scales || data.length === 0) return;

    const { xScale, yScale, width, height } = scales;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xAxis = d3.axisBottom(xScale).ticks(6).tickFormat(d3.timeFormat('%m-%d'));
    const yAxis = d3.axisLeft(yScale).ticks(5);

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', '#8899aa')
      .style('font-size', '11px');

    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .selectAll('text')
      .attr('fill', '#8899aa')
      .style('font-size', '11px');

    g.selectAll('.domain, .tick line')
      .attr('stroke', '#2a2a45')
      .attr('stroke-width', 1);

    const line = d3
      .line<DataPoint>()
      .x((d) => xScale(d.time))
      .y((d) => yScale(d.value))
      .curve(d3.curveMonotoneX);

    const area = d3
      .area<DataPoint>()
      .x((d) => xScale(d.time))
      .y0(height)
      .y1((d) => yScale(d.value))
      .curve(d3.curveMonotoneX);

    const gradient = svg
      .append('defs')
      .append('linearGradient')
      .attr('id', 'area-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#00d4ff').attr('stop-opacity', 0.3);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#00d4ff').attr('stop-opacity', 0.02);

    g.append('path')
      .datum(data)
      .attr('class', 'area')
      .attr('fill', 'url(#area-gradient)')
      .attr('d', area);

    g.append('path')
      .datum(data)
      .attr('class', 'line')
      .attr('fill', 'none')
      .attr('stroke', '#00d4ff')
      .attr('stroke-width', 2)
      .attr('d', line);

    g.append('g')
      .attr('class', 'points-group')
      .selectAll('.data-point')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'data-point')
      .attr('cx', (d) => xScale(d.time))
      .attr('cy', (d) => yScale(d.value))
      .attr('r', 3)
      .attr('fill', 'white')
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('r', 5)
          .attr('fill', '#ff7f50');

        const [mx, my] = d3.pointer(event, svg.node());
        setTooltip({
          visible: true,
          x: mx + 15,
          y: my - 10,
          value: d.value,
          time: d.time,
          unit: dataset.unit,
        });
      })
      .on('mousemove', function (event) {
        const [mx, my] = d3.pointer(event, svg.node());
        setTooltip((prev) => ({
          ...prev,
          x: mx + 15,
          y: my - 10,
        }));
      })
      .on('mouseleave', function () {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('r', 3)
          .attr('fill', 'white');

        setTooltip((prev) => ({ ...prev, visible: false }));
      });

    const indicator = g.append('g').attr('class', 'current-indicator');

    indicator
      .append('line')
      .attr('class', 'indicator-line')
      .attr('x1', 0)
      .attr('x2', 0)
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', '#00d4ff')
      .attr('stroke-width', 2)
      .attr('opacity', 0.6)
      .attr('stroke-dasharray', '4,4');

    indicator
      .append('circle')
      .attr('class', 'indicator-point')
      .attr('r', 6)
      .attr('fill', '#ff7f50')
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

  }, [data, scales, dataset.unit]);

  useEffect(() => {
    if (!scales || data.length === 0) return;
    const { xScale, yScale, height } = scales;

    const svg = d3.select(svgRef.current);
    const indicator = svg.select('.current-indicator');
    if (indicator.empty()) return;

    const point = data[Math.max(0, Math.min(currentIndex, data.length - 1))];
    if (!point) return;

    const x = xScale(point.time);
    const y = yScale(point.value);

    indicator
      .select('.indicator-line')
      .transition()
      .duration(50)
      .attr('x1', x)
      .attr('x2', x)
      .attr('y1', 0)
      .attr('y2', height);

    indicator
      .select('.indicator-point')
      .transition()
      .duration(50)
      .attr('cx', x)
      .attr('cy', y);
  }, [currentIndex, data, scales]);

  const formatTime = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="chart-panel" ref={containerRef}>
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="chart-svg"
      />
      {tooltip.visible && (
        <div
          className="chart-tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y,
          }}
        >
          <div className="tooltip-value">
            {tooltip.value} {tooltip.unit}
          </div>
          <div className="tooltip-time">{formatTime(tooltip.time)}</div>
        </div>
      )}
      {currentDataPoint && (
        <div className="current-info-card">
          <div className="info-label">当前数值</div>
          <div className="info-value">
            {currentDataPoint.value} <span className="info-unit">{dataset.unit}</span>
          </div>
          <div className="info-time">{formatTime(currentDataPoint.time)}</div>
        </div>
      )}
    </div>
  );
}

export default ChartPanel;
