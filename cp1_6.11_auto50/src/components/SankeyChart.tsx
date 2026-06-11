import { useEffect, useRef, useMemo, forwardRef, useImperativeHandle, useCallback } from 'react';
import * as d3 from 'd3';
import { sankey, SankeyGraph, SankeyNode as D3SankeyNode, SankeyLink as D3SankeyLink } from 'd3-sankey';
import type { SankeyData, SankeyNode, SankeyLink, SelectionState, FilterState } from '../types';

interface SankeyChartProps {
  data: SankeyData;
  selection: SelectionState;
  onSelectionChange: (selection: SelectionState) => void;
  onFilterChange: (filter: FilterState) => void;
  filteredLinks: number[];
}

interface ExtendedSankeyNode extends Omit<D3SankeyNode<ExtendedSankeyNode, ExtendedSankeyLink>, 'sourceLinks' | 'targetLinks'> {
  id: string;
  label: string;
  sourceLinks?: ExtendedSankeyLink[];
  targetLinks?: ExtendedSankeyLink[];
}

interface ExtendedSankeyLink extends Omit<D3SankeyLink<ExtendedSankeyNode, ExtendedSankeyLink>, 'source' | 'target' | 'index'> {
  index: number;
  value: number;
  source: string | ExtendedSankeyNode;
  target: string | ExtendedSankeyNode;
}

interface GradientInfo {
  x1: number;
  x2: number;
  colorStart: string;
  colorEnd: string;
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
  const gradientMapRef = useRef<Map<number, GradientInfo>>(new Map());

  const rafIdRef = useRef<number | null>(null);
  const pendingUpdatesRef = useRef<Set<string>>(new Set());

  const scheduleRepaint = useCallback((type: string, updateFn: () => void) => {
    pendingUpdatesRef.current.add(type);

    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        pendingUpdatesRef.current.clear();
        updateFn();
        rafIdRef.current = null;
      });
    }
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

      const transform = d3.zoomTransform(svg);

      ctx.fillStyle = '#1A1A2E';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);

      ctx.save();
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.k, transform.k);

      const gradientMap = gradientMapRef.current;
      const links = linksRef.current;
      const nodes = nodesRef.current;

      for (const link of links) {
        const source = link.source as ExtendedSankeyNode;
        const target = link.target as ExtendedSankeyNode;
        const linkWidth = link.width || 1;

        const sourceX = source.x1 || 0;
        const targetX = target.x0 || 0;
        const sourceY = (link.y0 || 0) + linkWidth / 2;
        const targetY = (link.y1 || 0) - linkWidth / 2;

        const gradient = ctx.createLinearGradient(sourceX, sourceY, targetX, targetY);
        const info = gradientMap.get(link.index);
        if (info) {
          gradient.addColorStop(0, info.colorStart);
          gradient.addColorStop(1, info.colorEnd);
        } else {
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
        const nx = node.x0 || 0;
        const ny = node.y0 || 0;
        const nw = (node.x1 || 0) - nx;
        const nh = (node.y1 || 0) - ny;
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

        const isLeftSide = (node.x0 || 0) < (dimensionsRef.current.width / 2);
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
        g.selectAll<SVGGElement, ExtendedSankeyNode>('.sankey-node')
          .filter((d) => d.id === node.id)
          .each(function () {
            d3.select(this).select('rect')
              .attr('y', node.y0)
              .attr('height', (node.y1 || 0) - (node.y0 || 0));

            d3.select(this).select('text')
              .attr('x', (node.x0 || 0) < width / 2 ? (node.x1 || 0) - (node.x0 || 0) + 8 : -8)
              .attr('y', ((node.y0 || 0) + (node.y1 || 0)) / 2)
              .attr('text-anchor', (node.x0 || 0) < width / 2 ? 'start' : 'end');
          });
      }

      g.selectAll<SVGPathElement, ExtendedSankeyLink>('.sankey-link')
        .attr('d', (linkD: ExtendedSankeyLink) => {
          const s = linkD.source as ExtendedSankeyNode;
          const t = linkD.target as ExtendedSankeyNode;
          const sx = s.x1 || 0;
          const tx = t.x0 || 0;
          const sy = (linkD.y0 || 0) + (linkD.width || 1) / 2;
          const ty = (linkD.y1 || 0) - (linkD.width || 1) / 2;
          const mx = (sx + tx) / 2;
          return `M${sx},${sy}C${mx},${sy} ${mx},${ty} ${tx},${ty}`;
        });

      g.selectAll<SVGTextElement, ExtendedSankeyLink>('.sankey-link-label')
        .attr('x', (linkD: ExtendedSankeyLink) => {
          const s = linkD.source as ExtendedSankeyNode;
          const t = linkD.target as ExtendedSankeyNode;
          return ((s.x1 || 0) + (t.x0 || 0)) / 2;
        })
        .attr('y', (linkD: ExtendedSankeyLink) => (linkD.y0 || 0) + (linkD.width || 1) / 2 - 5);

      g.selectAll<SVGLinearGradientElement, ExtendedSankeyLink>('linearGradient')
        .attr('x1', (linkD: ExtendedSankeyLink) => (linkD.source as ExtendedSankeyNode).x1)
        .attr('x2', (linkD: ExtendedSankeyLink) => (linkD.target as ExtendedSankeyNode).x0);

      for (const link of links) {
        const info = gradientMapRef.current.get(link.index);
        if (info) {
          info.x1 = (link.source as ExtendedSankeyNode).x1 || 0;
          info.x2 = (link.target as ExtendedSankeyNode).x0 || 0;
        }
      }
    };

    const updateDimensions = () => {
      const { clientWidth, clientHeight } = container;
      dimensionsRef.current = { width: clientWidth, height: clientHeight };

      const margin = { top: 40, right: 150, bottom: 40, left: 150 };
      width = clientWidth - margin.left - margin.right;
      height = clientHeight - margin.top - margin.bottom;

      const filteredData: SankeyGraph<ExtendedSankeyNode, ExtendedSankeyLink> = {
        nodes: data.nodes.map(n => ({ ...n } as ExtendedSankeyNode)),
        links: data.links
          .filter((_, i) => !filteredLinks.includes(i))
          .map((l, i) => ({ ...l, index: i } as ExtendedSankeyLink))
      };

      const sankeyGenerator = sankey<ExtendedSankeyNode, ExtendedSankeyLink>()
        .nodeWidth(NODE_WIDTH)
        .nodePadding(15)
        .extent([[margin.left, margin.top], [width + margin.left, height + margin.top]]);

      const { nodes, links } = sankeyGenerator(filteredData);

      nodesRef.current = nodes;
      linksRef.current = links;

      gradientMapRef.current.clear();

      svg.attr('width', clientWidth)
        .attr('height', clientHeight)
        .attr('viewBox', [0, 0, clientWidth, clientHeight]);

      const defs = g.selectAll('defs').data([null]);
      defs.enter().append('defs');

      const gradients = g.select('defs')
        .selectAll<SVGLinearGradientElement, ExtendedSankeyLink>('linearGradient')
        .data(links, (d: ExtendedSankeyLink) => `gradient-${d.index}`);

      gradients.exit().remove();

      const gradientsEnter = gradients.enter()
        .append('linearGradient')
        .attr('id', (d: ExtendedSankeyLink) => `gradient-${d.index}`)
        .attr('gradientUnits', 'userSpaceOnUse');

      gradientsEnter.append('stop')
        .attr('offset', '0%');

      gradientsEnter.append('stop')
        .attr('offset', '100%');

      const allGradients = gradientsEnter.merge(gradients);

      allGradients
        .attr('x1', (d: ExtendedSankeyLink) => (d.source as ExtendedSankeyNode).x1)
        .attr('x2', (d: ExtendedSankeyLink) => (d.target as ExtendedSankeyNode).x0)
        .attr('y1', 0)
        .attr('y2', 0);

      allGradients.select('stop:first-child')
        .attr('stop-color', (d: ExtendedSankeyLink) => {
          const sourceIndex = nodes.indexOf(d.source as ExtendedSankeyNode);
          const color = getNodeColor(d.source as ExtendedSankeyNode, sourceIndex);
          gradientMapRef.current.set(d.index, {
            x1: (d.source as ExtendedSankeyNode).x1 || 0,
            x2: (d.target as ExtendedSankeyNode).x0 || 0,
            colorStart: color,
            colorEnd: ''
          });
          return color;
        });

      allGradients.select('stop:last-child')
        .attr('stop-color', (d: ExtendedSankeyLink) => {
          const targetIndex = nodes.indexOf(d.target as ExtendedSankeyNode);
          const color = getNodeColor(d.target as ExtendedSankeyNode, targetIndex);
          const info = gradientMapRef.current.get(d.index);
          if (info) {
            info.colorEnd = color;
          }
          return color;
        });

      const linkGroup = g.selectAll('.link-group').data([null]);
      linkGroup.enter().append('g').attr('class', 'link-group');

      const linkGroups = g.select('.link-group')
        .selectAll<SVGGElement, ExtendedSankeyLink>('g.link-wrapper')
        .data(links, (d: ExtendedSankeyLink) => `link-${d.index}`);

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
        .attr('d', (d: ExtendedSankeyLink) => {
          const s = d.source as ExtendedSankeyNode;
          const t = d.target as ExtendedSankeyNode;
          const sx = s.x1 || 0;
          const tx = t.x0 || 0;
          const sy = (d.y0 || 0) + (d.width || 1) / 2;
          const ty = (d.y1 || 0) - (d.width || 1) / 2;
          const mx = (sx + tx) / 2;
          return `M${sx},${sy}C${mx},${sy} ${mx},${ty} ${tx},${ty}`;
        })
        .attr('stroke-width', (d: ExtendedSankeyLink) => Math.max(1, d.width || 1))
        .on('click', (event: Event, d: ExtendedSankeyLink) => {
          event.stopPropagation();
          const originalLink = data.links[d.index];
          onSelectionChange({ type: 'link', data: { ...originalLink, index: d.index } });
        })
        .on('dblclick', (event: Event, d: ExtendedSankeyLink) => {
          event.stopPropagation();
          onFilterChange({
            filteredLinks: [...filteredLinks, d.index],
            filteredNodeIds: []
          });
          onSelectionChange({ type: null, data: null });
        })
        .on('mouseenter', function (event: MouseEvent, d: ExtendedSankeyLink) {
          d3.select(this)
            .interrupt()
            .attr('stroke-width', Math.max(1, (d.width || 1) * 1.2))
            .attr('stroke-opacity', 0.9);

          const wrapper = d3.select(this.parentNode as SVGGElement);
          wrapper.select('.sankey-link-label')
            .attr('class', 'sankey-link-label visible')
            .text(d.value.toLocaleString());
        })
        .on('mouseleave', function (event: MouseEvent, d: ExtendedSankeyLink) {
          d3.select(this)
            .interrupt()
            .attr('stroke-width', Math.max(1, d.width || 1))
            .attr('stroke-opacity', 0.6);

          const wrapper = d3.select(this.parentNode as SVGGElement);
          wrapper.select('.sankey-link-label')
            .attr('class', 'sankey-link-label');
        });

      allLinkGroups.select('.sankey-link-label')
        .attr('x', (d: ExtendedSankeyLink) => {
          const s = d.source as ExtendedSankeyNode;
          const t = d.target as ExtendedSankeyNode;
          return ((s.x1 || 0) + (t.x0 || 0)) / 2;
        })
        .attr('y', (d: ExtendedSankeyLink) => (d.y0 || 0) + (d.width || 1) / 2 - 5);

      const nodeGroup = g.selectAll('.node-group').data([null]);
      nodeGroup.enter().append('g').attr('class', 'node-group');

      const nodeGroups = g.select('.node-group')
        .selectAll<SVGGElement, ExtendedSankeyNode>('g.sankey-node')
        .data(nodes, (d: ExtendedSankeyNode) => d.id);

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

      const drag = d3.drag<SVGGElement, ExtendedSankeyNode>()
        .on('start', function (event, d) {
          d3.select(this).raise();
          (event.sourceEvent as Event).stopPropagation();
        })
        .on('drag', function (event, d) {
          const dy = event.dy;
          const newY0 = Math.max(0, (d.y0 || 0) + dy);
          const newY1 = newY0 + ((d.y1 || 0) - (d.y0 || 0));

          d.y0 = newY0;
          d.y1 = newY1;

          scheduleRepaint('drag', doRepaint);
        });

      allNodeGroups
        .attr('transform', d => `translate(${d.x0},${d.y0})`)
        .call(drag)
        .on('click', (event: Event, d: ExtendedSankeyNode) => {
          event.stopPropagation();
          onSelectionChange({ type: 'node', data: { id: d.id, label: d.label } });
        });

      allNodeGroups.select('rect')
        .attr('width', d => (d.x1 || 0) - (d.x0 || 0))
        .attr('height', d => (d.y1 || 0) - (d.y0 || 0))
        .attr('fill', (d, i) => getNodeColor(d, i));

      allNodeGroups.select('text')
        .attr('x', d => (d.x0 || 0) < width / 2 ? (d.x1 || 0) - (d.x0 || 0) + 8 : -8)
        .attr('y', d => ((d.y1 || 0) - (d.y0 || 0)) / 2)
        .attr('text-anchor', d => (d.x0 || 0) < width / 2 ? 'start' : 'end')
        .text(d => d.label);

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

    g.selectAll<SVGGElement, ExtendedSankeyNode>('.sankey-node')
      .style('opacity', (d) => {
        if (!hasSelection) return 1;
        return relatedNodeIds.has(d.id) ? 1 : 0.2;
      })
      .style('pointer-events', (d) => {
        if (!hasSelection) return 'auto';
        return relatedNodeIds.has(d.id) ? 'auto' : 'none';
      });

    g.selectAll<SVGPathElement, ExtendedSankeyLink>('.sankey-link')
      .style('opacity', (d) => {
        if (!hasSelection) return 0.6;
        return relatedLinkIndices.has(d.index) ? 0.9 : 0.1;
      })
      .style('pointer-events', (d) => {
        if (!hasSelection) return 'auto';
        return relatedLinkIndices.has(d.index) ? 'auto' : 'none';
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
