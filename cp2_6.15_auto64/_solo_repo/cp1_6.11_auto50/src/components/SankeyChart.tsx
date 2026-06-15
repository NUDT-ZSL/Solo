import { useEffect, useRef, useMemo, forwardRef, useImperativeHandle, useCallback } from 'react';
import * as d3 from 'd3';
import { sankey } from 'd3-sankey';
import type { SankeyData, SankeyNode, SankeyLink, SelectionState, FilterState } from '../types';

interface SankeyChartProps {
  data: SankeyData;
  selection: SelectionState;
  onSelectionChange: (selection: SelectionState) => void;
  onFilterChange: (filter: FilterState) => void;
  filteredLinks: number[];
}

interface ExtendedSankeyNode {
  id: string;
  label: string;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  sourceLinks?: ExtendedSankeyLink[];
  targetLinks?: ExtendedSankeyLink[];
  value?: number;
  index?: number;
  depth?: number;
  height?: number;
}

interface ExtendedSankeyLink {
  index: number;
  value: number;
  source: string | ExtendedSankeyNode;
  target: string | ExtendedSankeyNode;
  y0?: number;
  y1?: number;
  width?: number;
}

interface GradientStop {
  offset: number;
  color: string;
  opacity?: number;
}

interface ParsedGradient {
  id: string;
  type: 'linear' | 'radial';
  stops: GradientStop[];
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  cx?: number;
  cy?: number;
  r?: number;
  fx?: number;
  fy?: number;
  gradientUnits?: string;
}

const NODE_WIDTH = 20;
const COLOR_START = '#0F3460';
const COLOR_END = '#E94560';
const NODE_BORDER_COLOR = '#E94560';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
}

function interpolateRgb(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  return rgbToHex(
    c1.r + (c2.r - c1.r) * t,
    c1.g + (c2.g - c1.g) * t,
    c1.b + (c2.b - c1.b) * t
  );
}

const SankeyChart = forwardRef<{ exportPNG: () => void }, SankeyChartProps>(function SankeyChart(
  { data, selection, onSelectionChange, onFilterChange, filteredLinks },
  ref
) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const dimensionsRef = useRef({ width: 0, height: 0 });
  const nodesRef = useRef<ExtendedSankeyNode[]>([]);
  const linksRef = useRef<ExtendedSankeyLink[]>([]);

  const rafIdRef = useRef<number | null>(null);
  const pendingUpdatesRef = useRef<Set<string>>(new Set());

  const scheduleRepaint = useCallback((type: string, updateFn: () => void) => {
    pendingUpdatesRef.current.add(type);

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      pendingUpdatesRef.current.clear();
      updateFn();
      rafIdRef.current = null;
    });
  }, []);

  const nodeColorScale = useMemo(() => {
    return d3.scaleSequential<string>()
      .domain([0, Math.max(1, data.nodes.length - 1)])
      .interpolator(d3.interpolateRgb(COLOR_START, COLOR_END));
  }, [data.nodes.length]);

  const getNodeColor = useCallback((node: ExtendedSankeyNode, index: number) => {
    return nodeColorScale(index);
  }, [nodeColorScale]);

  useImperativeHandle(ref, () => ({
    exportPNG: () => {
      if (!svgRef.current || !gRef.current) return;

      const svg = svgRef.current;
      const { width, height } = dimensionsRef.current;
      const scale = 2;

      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const svgGradients = parseSvgGradients(svg);
      const transform = d3.zoomTransform(svg);

      ctx.fillStyle = '#1A1A2E';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);

      ctx.save();
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.k, transform.k);

      const links = linksRef.current;
      const nodes = nodesRef.current;

      for (const link of links) {
        const source = link.source as ExtendedSankeyNode;
        const target = link.target as ExtendedSankeyNode;
        const linkWidth = link.width ?? 1;

        const sourceX = source.x1 ?? 0;
        const targetX = target.x0 ?? 0;
        const sourceY = (link.y0 ?? 0) + linkWidth / 2;
        const targetY = (link.y1 ?? 0) - linkWidth / 2;

        const gradientId = `gradient-${link.index}`;
        const svgGrad = svgGradients.get(gradientId);

        let gradient: CanvasGradient;
        if (svgGrad && svgGrad.type === 'linear') {
          const gx1 = svgGrad.x1 ?? sourceX;
          const gy1 = svgGrad.y1 ?? sourceY;
          const gx2 = svgGrad.x2 ?? targetX;
          const gy2 = svgGrad.y2 ?? targetY;
          gradient = ctx.createLinearGradient(gx1, gy1, gx2, gy2);

          for (const stop of svgGrad.stops) {
            gradient.addColorStop(stop.offset, stop.color);
          }
        } else if (svgGrad && svgGrad.type === 'radial') {
          const cx = svgGrad.cx ?? ((sourceX + targetX) / 2);
          const cy = svgGrad.cy ?? ((sourceY + targetY) / 2);
          const r = svgGrad.r ?? (Math.abs(targetX - sourceX) / 2);
          const fx = svgGrad.fx ?? cx;
          const fy = svgGrad.fy ?? cy;
          gradient = ctx.createRadialGradient(fx, fy, 0, cx, cy, r);

          for (const stop of svgGrad.stops) {
            gradient.addColorStop(stop.offset, stop.color);
          }
        } else {
          gradient = ctx.createLinearGradient(sourceX, sourceY, targetX, targetY);
          gradient.addColorStop(0, COLOR_START);
          gradient.addColorStop(1, COLOR_END);
        }

        const midX = (sourceX + targetX) / 2;

        ctx.beginPath();
        ctx.moveTo(sourceX, sourceY - linkWidth / 2);

        ctx.bezierCurveTo(
          midX, sourceY - linkWidth / 2,
          midX, targetY - linkWidth / 2,
          targetX, targetY - linkWidth / 2
        );

        ctx.lineTo(targetX, targetY + linkWidth / 2);

        ctx.bezierCurveTo(
          midX, targetY + linkWidth / 2,
          midX, sourceY + linkWidth / 2,
          sourceX, sourceY + linkWidth / 2
        );

        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.globalAlpha = 0.6;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const nx = node.x0 ?? 0;
        const ny = node.y0 ?? 0;
        const nw = (node.x1 ?? 0) - nx;
        const nh = (node.y1 ?? 0) - ny;
        const fillColor = getNodeColor(node, i);

        ctx.fillStyle = fillColor;
        ctx.strokeStyle = NODE_BORDER_COLOR;
        ctx.lineWidth = 1;
        ctx.beginPath();
        const r = 3;
        ctx.moveTo(nx + r, ny);
        ctx.lineTo(nx + nw - r, ny);
        ctx.quadraticCurveTo(nx + nw, ny, nx + nw, ny + r);
        ctx.lineTo(nx + nw, ny + nh - r);
        ctx.quadraticCurveTo(nx + nw, ny + nh, nx + nw - r, ny + nh);
        ctx.lineTo(nx + r, ny + nh);
        ctx.quadraticCurveTo(nx, ny + nh, nx, ny + nh - r);
        ctx.lineTo(nx, ny + r);
        ctx.quadraticCurveTo(nx, ny, nx + r, ny);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        const isLeftSide = nx < dimensionsRef.current.width / 2;
        ctx.fillStyle = '#E8E8E8';
        ctx.font = '12px "Noto Sans SC", sans-serif';
        ctx.textAlign = isLeftSide ? 'left' : 'right';
        ctx.textBaseline = 'middle';
        const textX = isLeftSide ? nx + nw + 8 : nx - 8;
        const textY = ny + nh / 2;

        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 1;
        ctx.fillText(node.label, textX, textY);
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
      }

      ctx.restore();

      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `sankey-${Date.now()}.png`;
      link.href = pngUrl;
      link.click();
    }
  }), [getNodeColor]);

  const parseSvgGradients = (svgEl: SVGSVGElement): Map<string, ParsedGradient> => {
    const result = new Map<string, ParsedGradient>();

    const linearGradients = svgEl.querySelectorAll('linearGradient');
    linearGradients.forEach((grad) => {
      const id = grad.id;
      const stops = parseGradientStops(grad);
      const gradientUnits = grad.getAttribute('gradientUnits') || 'objectBoundingBox';

      result.set(id, {
        id,
        type: 'linear',
        stops,
        x1: parseFloatOrNull(grad.getAttribute('x1')) ?? undefined,
        y1: parseFloatOrNull(grad.getAttribute('y1')) ?? undefined,
        x2: parseFloatOrNull(grad.getAttribute('x2')) ?? undefined,
        y2: parseFloatOrNull(grad.getAttribute('y2')) ?? undefined,
        gradientUnits
      });
    });

    const radialGradients = svgEl.querySelectorAll('radialGradient');
    radialGradients.forEach((grad) => {
      const id = grad.id;
      const stops = parseGradientStops(grad);
      const gradientUnits = grad.getAttribute('gradientUnits') || 'objectBoundingBox';

      result.set(id, {
        id,
        type: 'radial',
        stops,
        cx: parseFloatOrNull(grad.getAttribute('cx')) ?? undefined,
        cy: parseFloatOrNull(grad.getAttribute('cy')) ?? undefined,
        r: parseFloatOrNull(grad.getAttribute('r')) ?? undefined,
        fx: parseFloatOrNull(grad.getAttribute('fx')) ?? undefined,
        fy: parseFloatOrNull(grad.getAttribute('fy')) ?? undefined,
        gradientUnits
      });
    });

    return result;
  };

  const parseGradientStops = (gradEl: SVGLinearGradientElement | SVGRadialGradientElement): GradientStop[] => {
    const stops: GradientStop[] = [];
    const stopEls = gradEl.querySelectorAll('stop');

    stopEls.forEach((stopEl) => {
      const offsetAttr = stopEl.getAttribute('offset') || '0%';
      const color = stopEl.getAttribute('stop-color') || '#000000';
      const opacityAttr = stopEl.getAttribute('stop-opacity');

      let offset: number;
      if (offsetAttr.endsWith('%')) {
        offset = parseFloat(offsetAttr) / 100;
      } else {
        offset = parseFloat(offsetAttr);
      }
      offset = Math.max(0, Math.min(1, isNaN(offset) ? 0 : offset));

      const opacity = opacityAttr !== null ? parseFloat(opacityAttr) : undefined;

      stops.push({ offset, color, opacity });
    });

    stops.sort((a, b) => a.offset - b.offset);

    if (stops.length === 0) {
      stops.push({ offset: 0, color: '#000000' });
      stops.push({ offset: 1, color: '#000000' });
    }

    return stops;
  };

  const parseFloatOrNull = (val: string | null): number | null => {
    if (val === null) return null;
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
  };

  const getRelatedNodeIds = useCallback((selection: SelectionState): Set<string> => {
    const related = new Set<string>();

    if (!selection.data) return related;

    if (selection.type === 'node') {
      const node = selection.data as SankeyNode;
      related.add(node.id);

      const graphNodes = nodesRef.current;
      const graphLinks = linksRef.current;

      const findUpstream = (nodeId: string, visited: Set<string>) => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        related.add(nodeId);
        const nodeData = graphNodes.find(n => n.id === nodeId);
        if (nodeData?.targetLinks) {
          nodeData.targetLinks.forEach(link => {
            const sourceNode = link.source as ExtendedSankeyNode;
            if (sourceNode?.id) {
              findUpstream(sourceNode.id, visited);
            }
          });
        }
      };

      const findDownstream = (nodeId: string, visited: Set<string>) => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        related.add(nodeId);
        const nodeData = graphNodes.find(n => n.id === nodeId);
        if (nodeData?.sourceLinks) {
          nodeData.sourceLinks.forEach(link => {
            const targetNode = link.target as ExtendedSankeyNode;
            if (targetNode?.id) {
              findDownstream(targetNode.id, visited);
            }
          });
        }
      };

      findUpstream(node.id, new Set());
      findDownstream(node.id, new Set());
    } else if (selection.type === 'link') {
      const link = selection.data as SankeyLink;
      const sourceNode = link.source as SankeyNode;
      const targetNode = link.target as SankeyNode;
      if (sourceNode?.id) related.add(sourceNode.id);
      if (targetNode?.id) related.add(targetNode.id);
    }

    return related;
  }, []);

  const getRelatedLinkIndices = useCallback((selection: SelectionState): Set<number> => {
    const related = new Set<number>();

    if (!selection.data) return related;

    const graphLinks = linksRef.current;

    if (selection.type === 'node') {
      const node = selection.data as SankeyNode;
      graphLinks.forEach(link => {
        const sourceNode = link.source as ExtendedSankeyNode;
        const targetNode = link.target as ExtendedSankeyNode;
        if (sourceNode.id === node.id || targetNode.id === node.id) {
          if (link.index !== undefined) {
            related.add(link.index);
          }
        }
      });
    } else if (selection.type === 'link') {
      const link = selection.data as SankeyLink;
      if (link.index !== undefined) {
        related.add(link.index);
      }
    }

    return related;
  }, []);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !gRef.current) return;

    const container = containerRef.current;
    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);
    let width = 0;
    let height = 0;

    const doRepaint = () => {
      const nodes = nodesRef.current;
      const links = linksRef.current;

      for (const node of nodes) {
        g.selectAll<SVGGElement, unknown>('.sankey-node')
          .filter((d: unknown) => (d as ExtendedSankeyNode).id === node.id)
          .each(function () {
            d3.select(this as SVGGElement).select('rect')
              .attr('y', node.y0 ?? 0)
              .attr('height', (node.y1 ?? 0) - (node.y0 ?? 0));

            d3.select(this as SVGGElement).select('text')
              .attr('x', (node.x0 || 0) < width / 2 ? (node.x1 || 0) - (node.x0 || 0) + 8 : -8)
              .attr('y', ((node.y0 || 0) + (node.y1 || 0)) / 2)
              .attr('text-anchor', (node.x0 || 0) < width / 2 ? 'start' : 'end');
          });
      }

      g.selectAll<SVGPathElement, unknown>('.sankey-link')
        .attr('d', (d: unknown) => {
          const linkD = d as ExtendedSankeyLink;
          const s = linkD.source as ExtendedSankeyNode;
          const t = linkD.target as ExtendedSankeyNode;
          const sx = s.x1 || 0;
          const tx = t.x0 || 0;
          const sy = (linkD.y0 || 0) + (linkD.width || 1) / 2;
          const ty = (linkD.y1 || 0) - (linkD.width || 1) / 2;
          const mx = (sx + tx) / 2;
          return `M${sx},${sy}C${mx},${sy} ${mx},${ty} ${tx},${ty}`;
        });

      g.selectAll<SVGTextElement, unknown>('.sankey-link-label')
        .attr('x', (d: unknown) => {
          const linkD = d as ExtendedSankeyLink;
          const s = linkD.source as ExtendedSankeyNode;
          const t = linkD.target as ExtendedSankeyNode;
          return ((s.x1 || 0) + (t.x0 || 0)) / 2;
        })
        .attr('y', (d: unknown) => {
          const linkD = d as ExtendedSankeyLink;
          return (linkD.y0 || 0) + (linkD.width || 1) / 2 - 5;
        });

      g.selectAll<SVGLinearGradientElement, unknown>('linearGradient')
        .attr('x1', (d: unknown) => ((d as ExtendedSankeyLink).source as ExtendedSankeyNode).x1 ?? 0)
        .attr('x2', (d: unknown) => ((d as ExtendedSankeyLink).target as ExtendedSankeyNode).x0 ?? 0);
    };

    const updateDimensions = () => {
      const { clientWidth, clientHeight } = container;
      dimensionsRef.current = { width: clientWidth, height: clientHeight };

      const margin = { top: 40, right: 150, bottom: 40, left: 150 };
      width = clientWidth - margin.left - margin.right;
      height = clientHeight - margin.top - margin.bottom;

      const filteredData = {
        nodes: data.nodes.map(n => ({ ...n })),
        links: data.links
          .filter((_, i) => !filteredLinks.includes(i))
          .map((l, i) => ({ ...l, index: i }))
      };

      const sankeyGenerator = (sankey as any)()
        .nodeWidth(NODE_WIDTH)
        .nodePadding(15)
        .extent([[margin.left, margin.top], [width + margin.left, height + margin.top]]);

      const { nodes, links } = sankeyGenerator(filteredData) as {
        nodes: ExtendedSankeyNode[];
        links: ExtendedSankeyLink[];
      };

      nodesRef.current = nodes;
      linksRef.current = links;

      svg.attr('width', clientWidth)
        .attr('height', clientHeight)
        .attr('viewBox', [0, 0, clientWidth, clientHeight]);

      const defs = g.selectAll('defs').data([null]);
      defs.enter().append('defs');

      const gradients = g.select('defs')
        .selectAll<SVGLinearGradientElement, unknown>('linearGradient')
        .data(links, (d: unknown) => `gradient-${(d as ExtendedSankeyLink).index}`);

      gradients.exit().remove();

      const gradientsEnter = gradients.enter()
        .append('linearGradient')
        .attr('id', (d: unknown) => `gradient-${(d as ExtendedSankeyLink).index}`)
        .attr('gradientUnits', 'userSpaceOnUse');

      gradientsEnter.append('stop')
        .attr('offset', '0%');

      gradientsEnter.append('stop')
        .attr('offset', '100%');

      const allGradients = gradientsEnter.merge(gradients);

      allGradients
        .attr('x1', (d: unknown) => ((d as ExtendedSankeyLink).source as ExtendedSankeyNode).x1 ?? 0)
        .attr('x2', (d: unknown) => ((d as ExtendedSankeyLink).target as ExtendedSankeyNode).x0 ?? 0)
        .attr('y1', 0)
        .attr('y2', 0);

      allGradients.select('stop:first-child')
        .attr('stop-color', (d: unknown) => {
          const link = d as ExtendedSankeyLink;
          const sourceNode = link.source as ExtendedSankeyNode;
          const sourceIndex = nodes.findIndex(n => n.id === sourceNode.id);
          return getNodeColor(sourceNode, sourceIndex);
        });

      allGradients.select('stop:last-child')
        .attr('stop-color', (d: unknown) => {
          const link = d as ExtendedSankeyLink;
          const targetNode = link.target as ExtendedSankeyNode;
          const targetIndex = nodes.findIndex(n => n.id === targetNode.id);
          return getNodeColor(targetNode, targetIndex);
        });

      const linkGroup = g.selectAll('.link-group').data([null]);
      linkGroup.enter().append('g').attr('class', 'link-group');

      const linkGroups = g.select('.link-group')
        .selectAll<SVGGElement, unknown>('g.link-wrapper')
        .data(links, (d: unknown) => `link-${(d as ExtendedSankeyLink).index}`);

      linkGroups.exit().remove();

      const linkGroupsEnter = linkGroups.enter()
        .append('g')
        .attr('class', 'link-wrapper');

      linkGroupsEnter.append('path')
        .attr('class', 'sankey-link')
        .attr('fill', 'none')
        .attr('stroke', (d: ExtendedSankeyLink) => `url(#gradient-${d.index})`)
        .attr('stroke-opacity', 0.6)
        .attr('stroke-linecap', 'butt');

      linkGroupsEnter.append('text')
        .attr('class', 'sankey-link-label');

      const allLinkGroups = linkGroupsEnter.merge(linkGroups);

      allLinkGroups.select('path')
        .attr('d', (d: unknown) => {
          const link = d as ExtendedSankeyLink;
          const s = link.source as ExtendedSankeyNode;
          const t = link.target as ExtendedSankeyNode;
          const sx = s.x1 || 0;
          const tx = t.x0 || 0;
          const sy = (link.y0 || 0) + (link.width || 1) / 2;
          const ty = (link.y1 || 0) - (link.width || 1) / 2;
          const mx = (sx + tx) / 2;
          return `M${sx},${sy}C${mx},${sy} ${mx},${ty} ${tx},${ty}`;
        })
        .attr('stroke-width', (d: unknown) => Math.max(1, (d as ExtendedSankeyLink).width || 1))
        .on('click', (event: Event, d: unknown) => {
          event.stopPropagation();
          const link = d as ExtendedSankeyLink;
          const originalLink = data.links[link.index];
          onSelectionChange({ type: 'link', data: { ...originalLink, index: link.index } });
        })
        .on('dblclick', (event: Event, d: unknown) => {
          event.stopPropagation();
          const link = d as ExtendedSankeyLink;
          onFilterChange({
            filteredLinks: [...filteredLinks, link.index],
            filteredNodeIds: []
          });
          onSelectionChange({ type: null, data: null });
        })
        .on('mouseenter', function (event: MouseEvent, d: unknown) {
          const link = d as ExtendedSankeyLink;
          d3.select(this as SVGPathElement)
            .interrupt()
            .attr('stroke-width', Math.max(1, (link.width || 1) * 1.2))
            .attr('stroke-opacity', 0.9);

          const parent = (this as SVGPathElement).parentNode;
          if (parent) {
            const wrapper = d3.select(parent as SVGGElement);
            wrapper.select('.sankey-link-label')
              .attr('class', 'sankey-link-label visible')
              .text(link.value.toLocaleString());
          }
        })
        .on('mouseleave', function (event: MouseEvent, d: unknown) {
          const link = d as ExtendedSankeyLink;
          d3.select(this as SVGPathElement)
            .interrupt()
            .attr('stroke-width', Math.max(1, link.width || 1))
            .attr('stroke-opacity', 0.6);

          const parent = (this as SVGPathElement).parentNode;
          if (parent) {
            const wrapper = d3.select(parent as SVGGElement);
            wrapper.select('.sankey-link-label')
              .attr('class', 'sankey-link-label');
          }
        });

      allLinkGroups.select('.sankey-link-label')
        .attr('x', (d: unknown) => {
          const link = d as ExtendedSankeyLink;
          const s = link.source as ExtendedSankeyNode;
          const t = link.target as ExtendedSankeyNode;
          return ((s.x1 || 0) + (t.x0 || 0)) / 2;
        })
        .attr('y', (d: unknown) => ((d as ExtendedSankeyLink).y0 || 0) + ((d as ExtendedSankeyLink).width || 1) / 2 - 5);

      const nodeGroup = g.selectAll('.node-group').data([null]);
      nodeGroup.enter().append('g').attr('class', 'node-group');

      const nodeGroups = g.select('.node-group')
        .selectAll<SVGGElement, unknown>('g.sankey-node')
        .data(nodes, (d: unknown) => (d as ExtendedSankeyNode).id);

      nodeGroups.exit().remove();

      const nodeGroupsEnter = nodeGroups.enter()
        .append('g')
        .attr('class', 'sankey-node');

      nodeGroupsEnter.append('rect')
        .attr('rx', 3)
        .attr('ry', 3)
        .attr('stroke', NODE_BORDER_COLOR)
        .attr('stroke-width', 1);

      nodeGroupsEnter.append('text')
        .attr('dy', '0.35em');

      const allNodeGroups = nodeGroupsEnter.merge(nodeGroups);

      const drag = d3.drag<SVGGElement, any>()
        .on('start', function (this: SVGGElement, event: any, d: any) {
          d3.select(this).raise();
          if (event.sourceEvent) {
            event.sourceEvent.stopPropagation();
          }
        })
        .on('drag', function (this: SVGGElement, event: any, d: any) {
          const node = d as ExtendedSankeyNode;
          const dy = event.dy;
          const newY0 = Math.max(0, (node.y0 || 0) + dy);
          const newY1 = newY0 + ((node.y1 || 0) - (node.y0 || 0));

          node.y0 = newY0;
          node.y1 = newY1;

          scheduleRepaint('drag', doRepaint);
        });

      allNodeGroups
        .attr('transform', (d: unknown) => {
          const node = d as ExtendedSankeyNode;
          return `translate(${node.x0},${node.y0})`;
        })
        .call(drag)
        .on('click', (event: Event, d: unknown) => {
          event.stopPropagation();
          const node = d as ExtendedSankeyNode;
          onSelectionChange({ type: 'node', data: { id: node.id, label: node.label } });
        });

      allNodeGroups.select('rect')
        .attr('width', (d: unknown) => ((d as ExtendedSankeyNode).x1 || 0) - ((d as ExtendedSankeyNode).x0 || 0))
        .attr('height', (d: unknown) => ((d as ExtendedSankeyNode).y1 || 0) - ((d as ExtendedSankeyNode).y0 || 0))
        .attr('fill', (d: unknown, i: number) => getNodeColor(d as ExtendedSankeyNode, i));

      allNodeGroups.select('text')
        .attr('x', (d: unknown) => {
          const node = d as ExtendedSankeyNode;
          return (node.x0 || 0) < width / 2 ? (node.x1 || 0) - (node.x0 || 0) + 8 : -8;
        })
        .attr('y', (d: unknown) => {
          const node = d as ExtendedSankeyNode;
          return ((node.y1 || 0) - (node.y0 || 0)) / 2;
        })
        .attr('text-anchor', (d: unknown) => {
          const node = d as ExtendedSankeyNode;
          return (node.x0 || 0) < width / 2 ? 'start' : 'end';
        })
        .text((d: unknown) => (d as ExtendedSankeyNode).label);

      svg.on('click', () => {
        onSelectionChange({ type: null, data: null });
      });

      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 3])
        .on('zoom', (event) => {
          g.attr('transform', event.transform.toString());
        });

      svg.call(zoom);
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [data, filteredLinks, onSelectionChange, onFilterChange, getNodeColor, scheduleRepaint]);

  useEffect(() => {
    if (!gRef.current) return;

    const g = d3.select(gRef.current);
    const relatedNodeIds = getRelatedNodeIds(selection);
    const relatedLinkIndices = getRelatedLinkIndices(selection);
    const hasSelection = selection.type !== null;

    g.selectAll<SVGGElement, unknown>('.sankey-node')
      .style('opacity', (d: unknown) => {
        const node = d as ExtendedSankeyNode;
        if (!hasSelection) return 1;
        return relatedNodeIds.has(node.id) ? 1 : 0.2;
      })
      .style('pointer-events', (d: unknown) => {
        const node = d as ExtendedSankeyNode;
        if (!hasSelection) return 'auto';
        return relatedNodeIds.has(node.id) ? 'auto' : 'none';
      });

    g.selectAll<SVGPathElement, unknown>('.sankey-link')
      .style('opacity', (d: unknown) => {
        const link = d as ExtendedSankeyLink;
        if (!hasSelection) return 0.6;
        return relatedLinkIndices.has(link.index) ? 0.9 : 0.1;
      })
      .style('pointer-events', (d: unknown) => {
        const link = d as ExtendedSankeyLink;
        if (!hasSelection) return 'auto';
        return relatedLinkIndices.has(link.index) ? 'auto' : 'none';
      });
  }, [selection, getRelatedNodeIds, getRelatedLinkIndices]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <svg ref={svgRef} className="sankey-svg">
        <defs>
          <filter id="text-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000" floodOpacity="0.8" />
          </filter>
        </defs>
        <g ref={gRef} />
      </svg>
    </div>
  );
});

export default SankeyChart;
