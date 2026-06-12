import * as d3 from 'd3';
import { DataRecord } from './dataLoader';

export type ChartType = 'line' | 'bar' | 'pie' | 'heatmap';

export interface ChartConfig {
  type: ChartType;
  xField: string;
  yField: string;
  yFields?: string[];
  title?: string;
  barMode?: 'stacked' | 'grouped';
}

export interface DrawOptions {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  highlightValues?: (string | number)[];
  onDataClick?: (data: DataRecord) => void;
}

export function linearRegression(data: { x: number; y: number }[]): { slope: number; intercept: number } {
  const n = data.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  const sumX = data.reduce((sum, d) => sum + d.x, 0);
  const sumY = data.reduce((sum, d) => sum + d.y, 0);
  const sumXY = data.reduce((sum, d) => sum + d.x * d.y, 0);
  const sumX2 = data.reduce((sum, d) => sum + d.x * d.x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export function virtualizeData<T>(data: T[], viewport: { start: number; end: number }): T[] {
  return data.slice(Math.max(0, viewport.start), Math.min(data.length, viewport.end));
}

export const colorScale = d3.scaleLinear<string, string>()
  .domain([0, 1])
  .range(['#1e3a8a', '#60a5fa']);

export function drawLineChart(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  data: DataRecord[],
  config: ChartConfig,
  options: DrawOptions
): void {
  const { width, height, margin, highlightValues, onDataClick } = options;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  svg.selectAll('*').remove();

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const xValues = data.map(d => d[config.xField]);
  const yValues = data.map(d => Number(d[config.yField]) || 0);

  const isNumericX = xValues.every(v => typeof v === 'number');

  const xScaleLinear = d3.scaleLinear()
    .domain(d3.extent(xValues as number[]) as [number, number])
    .range([0, innerWidth]);

  const xScalePoint = d3.scalePoint()
    .domain(xValues.map(String))
    .range([0, innerWidth]);

  const yScale = d3.scaleLinear()
    .domain([d3.min(yValues) as number, d3.max(yValues) as number])
    .nice()
    .range([innerHeight, 0]);

  const line = d3.line<DataRecord>()
    .x(d => isNumericX ? xScaleLinear(Number(d[config.xField])) : xScalePoint(String(d[config.xField])) || 0)
    .y(d => yScale(Number(d[config.yField]) || 0))
    .curve(d3.curveCatmullRom.alpha(0.5));

  g.append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', '#3b82f6')
    .attr('stroke-width', 2)
    .attr('d', line);

  const points = data.map((d, i) => ({
    x: isNumericX ? Number(d[config.xField]) : i,
    y: Number(d[config.yField]) || 0
  }));

  const regression = linearRegression(points);
  const xMin = d3.min(points, p => p.x) as number;
  const xMax = d3.max(points, p => p.x) as number;
  const trendData = [
    { x: xMin, y: regression.slope * xMin + regression.intercept },
    { x: xMax, y: regression.slope * xMax + regression.intercept }
  ];

  const trendLine = d3.line<{ x: number; y: number }>()
    .x(d => isNumericX ? xScaleLinear(d.x) : xScalePoint(String(data[d.x]?.[config.xField])) || 0)
    .y(d => yScale(d.y));

  g.append('path')
    .datum(trendData)
    .attr('fill', 'none')
    .attr('stroke', '#ef4444')
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '5,5')
    .attr('d', trendLine);

  const tooltip = d3.select('body').append('div')
    .style('position', 'absolute')
    .style('padding', '8px 12px')
    .style('background', 'rgba(0,0,0,0.8)')
    .style('color', 'white')
    .style('border-radius', '4px')
    .style('font-size', '12px')
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .style('z-index', 1000);

  const renderPoints = (renderData: DataRecord[]) => {
    const circles = g.selectAll<SVGCircleElement, DataRecord>('.data-point')
      .data(renderData, d => String(d[config.xField]));

    circles.exit().remove();

    const newCircles = circles.enter()
      .append('circle')
      .attr('class', 'data-point')
      .attr('r', 4)
      .attr('cx', d => isNumericX ? xScaleLinear(Number(d[config.xField])) : xScalePoint(String(d[config.xField])) || 0)
      .attr('cy', d => yScale(Number(d[config.yField]) || 0))
      .attr('fill', '#3b82f6')
      .attr('cursor', 'pointer')
      .attr('opacity', d => {
        if (!highlightValues || highlightValues.length === 0) return 1;
        return highlightValues.includes(d[config.xField] as string | number) ? 1 : 0.2;
      });

    newCircles.merge(circles as d3.Selection<SVGCircleElement, DataRecord, SVGGElement, unknown>)
      .on('mouseenter', function(event, d) {
        d3.select(this).attr('r', 6);
        tooltip
          .style('opacity', 1)
          .html(`<strong>${config.xField}:</strong> ${d[config.xField]}<br/><strong>${config.yField}:</strong> ${d[config.yField]}`)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 28}px`);
      })
      .on('mousemove', function(event) {
        tooltip
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 28}px`);
      })
      .on('mouseleave', function() {
        d3.select(this).attr('r', 4);
        tooltip.style('opacity', 0);
      })
      .on('click', function(_event, d) {
        if (onDataClick) onDataClick(d);
      });
  };

  if (data.length > 1000) {
    const viewport = { start: 0, end: 1000 };
    renderPoints(virtualizeData(data, viewport));

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 10])
      .on('zoom', (event) => {
        const transform = event.transform;
        const start = Math.max(0, Math.floor(-transform.x / (innerWidth / data.length)));
        const end = Math.min(data.length, start + Math.ceil(innerWidth / (transform.k * (innerWidth / data.length))));
        renderPoints(virtualizeData(data, { start, end }));
      });

    svg.call(zoom);
  } else {
    renderPoints(data);
  }

  g.append('g')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(d3.axisBottom(isNumericX ? xScaleLinear : xScalePoint as unknown as d3.AxisScale<d3.NumberValue>));

  g.append('g')
    .call(d3.axisLeft(yScale));

  if (config.title) {
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .text(config.title);
  }
}

export function drawBarChart(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  data: DataRecord[],
  config: ChartConfig,
  options: DrawOptions
): void {
  const { width, height, margin, onDataClick } = options;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const barMode = config.barMode || 'grouped';
  const yFields = config.yFields || [config.yField];

  svg.selectAll('*').remove();

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const xValues = data.map(d => String(d[config.xField]));
  const xScale = d3.scaleBand()
    .domain(xValues)
    .range([0, innerWidth])
    .padding(0.2);

  const allYValues = data.flatMap(d => yFields.map(f => Number(d[f]) || 0));
  const yMax = barMode === 'stacked'
    ? d3.max(data, d => yFields.reduce((sum, f) => sum + (Number(d[f]) || 0), 0)) as number
    : d3.max(allYValues) as number;

  const yScale = d3.scaleLinear()
    .domain([0, yMax])
    .nice()
    .range([innerHeight, 0]);

  const color = d3.scaleOrdinal<string>()
    .domain(yFields)
    .range(['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']);

  const tooltip = d3.select('body').append('div')
    .style('position', 'absolute')
    .style('padding', '8px 12px')
    .style('background', 'rgba(0,0,0,0.8)')
    .style('color', 'white')
    .style('border-radius', '4px')
    .style('font-size', '12px')
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .style('z-index', 1000);

  if (barMode === 'stacked') {
    const stackedData = d3.stack<DataRecord>()
      .keys(yFields)
      .value((d, key) => Number(d[key]) || 0)(data);

    const groups = g.selectAll('.bar-group')
      .data(stackedData)
      .enter()
      .append('g')
      .attr('class', 'bar-group')
      .attr('fill', d => color(d.key));

    const bars = groups.selectAll('rect')
      .data(d => d)
      .enter()
      .append('rect')
      .attr('x', d => xScale(String(d.data[config.xField])) || 0)
      .attr('y', d => yScale(d[1]))
      .attr('width', xScale.bandwidth())
      .attr('height', d => yScale(d[0]) - yScale(d[1]))
      .attr('cursor', 'pointer');

    bars
      .on('mouseenter', function(event, d) {
        d3.select(this)
          .attr('filter', 'brightness(1.2)');
        tooltip
          .style('opacity', 1)
          .html(`<strong>${config.xField}:</strong> ${d.data[config.xField]}<br/><strong>Value:</strong> ${d[1] - d[0]}`)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 28}px`);
      })
      .on('mousemove', function(event) {
        tooltip
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 28}px`);
      })
      .on('mouseleave', function() {
        d3.select(this)
          .attr('filter', 'none');
        tooltip.style('opacity', 0);
      })
      .on('click', function(_event, d) {
        if (onDataClick) onDataClick(d.data);
      });

    groups.selectAll('.bar-label')
      .data(d => d)
      .enter()
      .append('text')
      .attr('class', 'bar-label')
      .attr('x', d => (xScale(String(d.data[config.xField])) || 0) + xScale.bandwidth() / 2)
      .attr('y', d => yScale(d[1]) - 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#374151')
      .text(d => {
        const value = d[1] - d[0];
        return value > 0 ? value.toFixed(1) : '';
      });
  } else {
    const x1Scale = d3.scaleBand()
      .domain(yFields)
      .range([0, xScale.bandwidth()])
      .padding(0.05);

    const groups = g.selectAll('.bar-group')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'bar-group')
      .attr('transform', d => `translate(${xScale(String(d[config.xField])) || 0},0)`);

    const bars = groups.selectAll('rect')
      .data(d => yFields.map(f => ({ field: f, value: Number(d[f]) || 0, data: d })))
      .enter()
      .append('rect')
      .attr('x', d => x1Scale(d.field) || 0)
      .attr('y', d => yScale(d.value))
      .attr('width', x1Scale.bandwidth())
      .attr('height', d => innerHeight - yScale(d.value))
      .attr('fill', d => color(d.field))
      .attr('cursor', 'pointer');

    bars
      .on('mouseenter', function(event, d) {
        d3.select(this)
          .attr('filter', 'brightness(1.2)');
        tooltip
          .style('opacity', 1)
          .html(`<strong>${config.xField}:</strong> ${d.data[config.xField]}<br/><strong>${d.field}:</strong> ${d.value}`)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 28}px`);
      })
      .on('mousemove', function(event) {
        tooltip
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 28}px`);
      })
      .on('mouseleave', function() {
        d3.select(this)
          .attr('filter', 'none');
        tooltip.style('opacity', 0);
      })
      .on('click', function(_event, d) {
        if (onDataClick) onDataClick(d.data);
      });

    groups.selectAll('.bar-label')
      .data(d => yFields.map(f => ({ field: f, value: Number(d[f]) || 0, data: d })))
      .enter()
      .append('text')
      .attr('class', 'bar-label')
      .attr('x', d => (x1Scale(d.field) || 0) + x1Scale.bandwidth() / 2)
      .attr('y', d => yScale(d.value) - 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#374151')
      .text(d => d.value > 0 ? d.value.toFixed(1) : '');
  }

  g.append('g')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale));

  g.append('g')
    .call(d3.axisLeft(yScale));

  if (config.title) {
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .text(config.title);
  }
}

export function drawPieChart(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  data: DataRecord[],
  config: ChartConfig,
  options: DrawOptions
): void {
  const { width, height, margin, onDataClick } = options;
  const radius = Math.min(width - margin.left - margin.right, height - margin.top - margin.bottom) / 2;

  svg.selectAll('*').remove();

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left + (width - margin.left - margin.right) / 2},${margin.top + (height - margin.top - margin.bottom) / 2})`);

  const pieData = data.map(d => ({
    label: String(d[config.xField]),
    value: Number(d[config.yField]) || 0,
    data: d
  }));

  const color = d3.scaleOrdinal<string>()
    .domain(pieData.map(d => d.label))
    .range(['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']);

  const pie = d3.pie<typeof pieData[0]>()
    .value(d => d.value)
    .padAngle(0.02);

  const arc = d3.arc<d3.PieArcDatum<typeof pieData[0]>>()
    .innerRadius(0)
    .outerRadius(radius - 10);

  const arcHover = d3.arc<d3.PieArcDatum<typeof pieData[0]>>()
    .innerRadius(0)
    .outerRadius(radius);

  const arcs = g.selectAll('.arc')
    .data(pie(pieData))
    .enter()
    .append('g')
    .attr('class', 'arc');

  arcs.append('path')
    .attr('fill', d => color(d.data.label))
    .attr('cursor', 'pointer')
    .on('mouseenter', function(_event, d) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('d', arcHover(d));
    })
    .on('mouseleave', function(_event, d) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('d', arc(d));
    })
    .on('click', function(_event, d) {
      if (onDataClick) onDataClick(d.data.data);
    })
    .transition()
    .duration(300)
    .attrTween('d', function(d) {
      const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
      return function(t) {
        return arc(interpolate(t)) || '';
      };
    });

  const total = pieData.reduce((sum, d) => sum + d.value, 0);

  arcs.append('text')
    .attr('transform', d => `translate(${arc.centroid(d)})`)
    .attr('text-anchor', 'middle')
    .attr('font-size', '11px')
    .attr('fill', 'white')
    .attr('font-weight', 'bold')
    .style('opacity', 0)
    .text(d => {
      const percentage = ((d.data.value / total) * 100).toFixed(1);
      return Number(percentage) > 3 ? `${percentage}%` : '';
    })
    .transition()
    .delay(300)
    .style('opacity', 1);

  if (config.title) {
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', margin.top / 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .text(config.title);
  }
}

export function drawHeatmap(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  data: DataRecord[],
  config: ChartConfig,
  options: DrawOptions
): void {
  const { width, height, margin, onDataClick } = options;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  svg.selectAll('*').remove();

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const xLabels = Array.from(new Set(data.map(d => String(d[config.xField]))));
  const yLabels = config.yFields || Array.from(new Set(data.map(d => String(d[config.yField]))));

  const xScale = d3.scaleBand()
    .domain(xLabels)
    .range([0, innerWidth])
    .padding(0.05);

  const yScale = d3.scaleBand()
    .domain(yLabels)
    .range([0, innerHeight])
    .padding(0.05);

  const values = data.map(d => Number(d[config.yField]) || 0);
  const minValue = d3.min(values) as number;
  const maxValue = d3.max(values) as number;

  const heatColorScale = d3.scaleLinear<string, string>()
    .domain([minValue, maxValue])
    .range(['#1e3a8a', '#60a5fa']);

  const tooltip = d3.select('body').append('div')
    .style('position', 'absolute')
    .style('padding', '8px 12px')
    .style('background', 'rgba(0,0,0,0.8)')
    .style('color', 'white')
    .style('border-radius', '4px')
    .style('font-size', '12px')
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .style('z-index', 1000);

  if (config.yFields && config.yFields.length > 0) {
    const flatData = data.flatMap(d =>
      config.yFields!.map(f => ({
        x: String(d[config.xField]),
        y: f,
        value: Number(d[f]) || 0,
        data: d
      }))
    );

    g.selectAll('.cell')
      .data(flatData)
      .enter()
      .append('rect')
      .attr('class', 'cell')
      .attr('x', d => xScale(d.x) || 0)
      .attr('y', d => yScale(d.y) || 0)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', d => heatColorScale(d.value))
      .attr('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        tooltip
          .style('opacity', 1)
          .html(`<strong>${config.xField}:</strong> ${d.x}<br/><strong>${d.y}:</strong> ${d.value}`)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 28}px`);
      })
      .on('mousemove', function(event) {
        tooltip
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 28}px`);
      })
      .on('mouseleave', function() {
        tooltip.style('opacity', 0);
      })
      .on('click', function(_event, d) {
        if (onDataClick) onDataClick(d.data);
      });
  } else {
    g.selectAll('.cell')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'cell')
      .attr('x', d => xScale(String(d[config.xField])) || 0)
      .attr('y', d => yScale(String(d[config.yField])) || 0)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', d => heatColorScale(Number(d[config.yField]) || 0))
      .attr('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        tooltip
          .style('opacity', 1)
          .html(`<strong>${config.xField}:</strong> ${d[config.xField]}<br/><strong>${config.yField}:</strong> ${d[config.yField]}`)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 28}px`);
      })
      .on('mousemove', function(event) {
        tooltip
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 28}px`);
      })
      .on('mouseleave', function() {
        tooltip.style('opacity', 0);
      })
      .on('click', function(_event, d) {
        if (onDataClick) onDataClick(d);
      });
  }

  g.append('g')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale))
    .selectAll('text')
    .attr('transform', 'rotate(-45)')
    .style('text-anchor', 'end')
    .attr('dx', '-.8em')
    .attr('dy', '.15em');

  g.append('g')
    .call(d3.axisLeft(yScale));

  if (config.title) {
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .text(config.title);
  }
}
