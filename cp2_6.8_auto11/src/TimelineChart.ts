import * as d3 from 'd3';
import type { TimelineEvent } from './types';

export interface TimelineCallbacks {
  onEventClick: (id: string, x: number, y: number) => void;
  onEventContextMenu: (id: string, x: number, y: number) => void;
  onBackgroundClick: () => void;
}

interface NodeDatum {
  id: string;
  date: Date;
  color: string;
  name: string;
  description: string;
}

const MARGIN = { top: 60, right: 40, bottom: 60, left: 40 };
const NODE_RADIUS = 6;
const AXIS_COLOR = '#b0b8c4';
const BG_COLOR = '#f7f9fc';

export function createTimeline(
  container: HTMLElement,
  initialData: TimelineEvent[],
  callbacks: TimelineCallbacks,
) {
  const width = container.clientWidth;
  const height = container.clientHeight;

  const svg = d3
    .select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('background', BG_COLOR)
    .style('display', 'block');

  const defs = svg.append('defs');

  const glowFilter = defs
    .append('filter')
    .attr('id', 'glow')
    .attr('x', '-50%')
    .attr('y', '-50%')
    .attr('width', '200%')
    .attr('height', '200%');
  glowFilter
    .append('feGaussianBlur')
    .attr('stdDeviation', '3')
    .attr('result', 'coloredBlur');
  const feMerge = glowFilter.append('feMerge');
  feMerge.append('feMergeNode').attr('in', 'coloredBlur');
  feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

  const innerWidth = width - MARGIN.left - MARGIN.right;
  const innerHeight = height - MARGIN.top - MARGIN.bottom;

  const gRoot = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

  const gAxis = gRoot.append('g').attr('class', 'axis');
  const gLinks = gRoot.append('g').attr('class', 'links');
  const gNodes = gRoot.append('g').attr('class', 'nodes');

  const axisLineY = innerHeight / 2;

  let xScale = d3.scaleTime().range([0, innerWidth]);
  let currentData: TimelineEvent[] = [];
  let filteredIds: Set<string> = new Set();
  let selectedId: string | null = null;

  function computeExtent(data: TimelineEvent[]): [Date, Date] {
    if (data.length === 0) {
      const now = new Date();
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      return [yearAgo, now];
    }
    const dates = data.map((d) => new Date(d.date));
    let [min, max] = d3.extent(dates) as [Date, Date];
    const padding = Math.max((max.getTime() - min.getTime()) * 0.1, 30 * 24 * 60 * 60 * 1000);
    min = new Date(min.getTime() - padding);
    max = new Date(max.getTime() + padding);
    return [min, max];
  }

  const zoom = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([1, 600])
    .on('zoom', (event) => {
      const newScale = event.transform.rescaleX(xScale);
      renderAxis(newScale);
      updateNodePositions(newScale);
      updateLinkPositions(newScale);
    });

  svg.call(zoom);

  function getNodeY(index: number, total: number) {
    if (total <= 1) return axisLineY;
    const maxOffset = innerHeight / 2 - 40;
    const t = index / Math.max(total - 1, 1);
    const isEven = index % 2 === 0;
    const offset = (t * 2 - 1) * maxOffset;
    return axisLineY + (isEven ? -1 : 1) * Math.abs(offset) * 0.3;
  }

  function convertData(data: TimelineEvent[]): NodeDatum[] {
    const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return sorted.map((d) => ({
      id: d.id,
      date: new Date(d.date),
      color: d.color,
      name: d.name,
      description: d.description,
    }));
  }

  function renderAxis(scale: d3.ScaleTime<number, number>) {
    const axis = d3
      .axisBottom<Date>(scale)
      .ticks(d3.timeYear.every(1))
      .tickFormat((d) => d3.timeFormat('%Y')(d as Date))
      .tickSize(8)
      .tickPadding(8);

    gAxis
      .attr('transform', `translate(0,${axisLineY})`)
      .transition()
      .duration(200)
      .ease(d3.easeCubicOut)
      .call(axis);

    gAxis.selectAll('.domain').attr('stroke', AXIS_COLOR).attr('stroke-width', 2);
    gAxis.selectAll('.tick line').attr('stroke', AXIS_COLOR);
    gAxis.selectAll('.tick text').attr('fill', '#555').attr('font-size', '12px');
  }

  function renderLinks(nodes: NodeDatum[], scale: d3.ScaleTime<number, number>) {
    const linkData = nodes.map((n, i) => ({
      id: n.id,
      x: scale(n.date),
      y: getNodeY(i, nodes.length),
    }));

    const linkSelection = gLinks.selectAll<SVGLineElement, { id: string; x: number; y: number }>('line').data(
      linkData,
      (d) => d.id,
    );

    linkSelection.exit().remove();

    linkSelection
      .enter()
      .append('line')
      .attr('x1', (d) => d.x)
      .attr('y1', axisLineY)
      .attr('x2', (d) => d.x)
      .attr('y2', (d) => d.y)
      .attr('stroke', AXIS_COLOR)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3')
      .attr('opacity', 0)
      .transition()
      .duration(300)
      .attr('opacity', 0.6);

    linkSelection
      .transition()
      .duration(200)
      .ease(d3.easeCubicOut)
      .attr('x1', (d) => d.x)
      .attr('x2', (d) => d.x)
      .attr('y2', (d) => d.y);
  }

  function updateLinkPositions(scale: d3.ScaleTime<number, number>) {
    const nodes = convertData(currentData);
    const linkData = nodes.map((n, i) => ({
      id: n.id,
      x: scale(n.date),
      y: getNodeY(i, nodes.length),
    }));

    gLinks
      .selectAll<SVGLineElement, { id: string; x: number; y: number }>('line')
      .data(linkData, (d) => d.id)
      .attr('x1', (d) => d.x)
      .attr('x2', (d) => d.x)
      .attr('y2', (d) => d.y);
  }

  function renderNodes(data: TimelineEvent[], scale: d3.ScaleTime<number, number>) {
    const nodes = convertData(data);

    renderLinks(nodes, scale);

    const nodeSelection = gNodes.selectAll<SVGGElement, NodeDatum>('g.node').data(nodes, (d) => d.id);

    nodeSelection.exit().remove();

    const enter = nodeSelection
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('cursor', 'pointer')
      .attr('transform', (d, i) => `translate(${scale(d.date)},${getNodeY(i, nodes.length)})`)
      .attr('opacity', 0)
      .on('click', (event, d) => {
        event.stopPropagation();
        const rect = (svg.node() as SVGSVGElement).getBoundingClientRect();
        callbacks.onEventClick(d.id, event.clientX - rect.left, event.clientY - rect.top);
      })
      .on('contextmenu', (event, d) => {
        event.preventDefault();
        event.stopPropagation();
        const rect = (svg.node() as SVGSVGElement).getBoundingClientRect();
        callbacks.onEventContextMenu(d.id, event.clientX - rect.left, event.clientY - rect.top);
      });

    enter
      .append('circle')
      .attr('r', 0)
      .attr('fill', (d) => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .transition()
      .duration(300)
      .attr('r', NODE_RADIUS);

    enter
      .append('text')
      .attr('y', (_, i) => (getNodeY(i, nodes.length) < axisLineY ? -14 : 22))
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('fill', '#444')
      .attr('pointer-events', 'none')
      .text((d) => d.name.length > 12 ? d.name.slice(0, 12) + '…' : d.name);

    enter.transition().duration(300).attr('opacity', 1);

    applyFilterAndSelection();
  }

  function updateNodePositions(scale: d3.ScaleTime<number, number>) {
    const nodes = convertData(currentData);
    gNodes
      .selectAll<SVGGElement, NodeDatum>('g.node')
      .data(nodes, (d) => d.id)
      .attr('transform', (d, i) => `translate(${scale(d.date)},${getNodeY(i, nodes.length)})`);
  }

  function applyFilterAndSelection() {
    const hasFilter = filteredIds.size > 0;
    gNodes
      .selectAll<SVGGElement, NodeDatum>('g.node')
      .attr('opacity', (d) => {
        if (!hasFilter) return 1;
        return filteredIds.has(d.id) ? 1 : 0.2;
      })
      .select('circle')
      .attr('filter', (d) => (d.id === selectedId ? 'url(#glow)' : null))
      .attr('stroke', (d) => (d.id === selectedId ? d.color : '#fff'))
      .attr('stroke-width', (d) => (d.id === selectedId ? 3 : 2));
  }

  svg.on('click', () => callbacks.onBackgroundClick());

  function update(data: TimelineEvent[]) {
    currentData = data;
    const [min, max] = computeExtent(data);
    xScale = d3.scaleTime().domain([min, max]).range([0, innerWidth]);
    svg.call(zoom.transform, d3.zoomIdentity);
    renderAxis(xScale);
    renderNodes(data, xScale);
  }

  function updateFilter(newFilteredIds: Set<string>) {
    filteredIds = newFilteredIds;
    applyFilterAndSelection();
  }

  function updateSelected(newSelectedId: string | null) {
    selectedId = newSelectedId;
    applyFilterAndSelection();
  }

  function resize() {
    // 空实现：避免重复resize监听器，容器由CSS控制尺寸
  }

  function destroy() {
    svg.remove();
  }

  function getSvgNode() {
    return svg.node() as SVGSVGElement;
  }

  function getExportNode() {
    return container;
  }

  update(initialData);
  window.addEventListener('resize', resize);

  return {
    update,
    updateFilter,
    updateSelected,
    destroy,
    getSvgNode,
    getExportNode,
    cleanup: () => window.removeEventListener('resize', resize),
  };
}
