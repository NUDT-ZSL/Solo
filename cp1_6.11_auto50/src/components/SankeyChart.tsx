import { useEffect, useRef, useMemo, forwardRef, useImperativeHandle, useCallback } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal, SankeyGraph, SankeyNode as D3SankeyNode, SankeyLink as D3SankeyLink } from 'd3-sankey';
import type { SankeyData, SankeyNode, SankeyLink, SelectionState, FilterState } from '../types';

interface SankeyChartProps {
  data: SankeyData;
  selection: SelectionState;
  onSelectionChange: (selection: SelectionState) => void;
  onFilterChange: (filter: FilterState) => void;
  filteredLinks: number[];
}

interface ExtendedSankeyNode extends D3SankeyNode<SankeyNode, SankeyLink> {
  id: string;
  label: string;
}

interface ExtendedSankeyLink extends D3SankeyLink<ExtendedSankeyNode, SankeyLink> {
  index: number;
  value: number;
}

const NODE_WIDTH = 20;
const COLOR_START = '#0F3460';
const COLOR_END = '#E94560';
const NODE_COLOR = '#16213E';
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

function interpolateColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
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
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

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
      const serializer = new XMLSerializer();
      const source = serializer.serializeToString(svg);
      const canvas = document.createElement('canvas');
      const { width, height } = dimensionsRef.current;
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        ctx.fillStyle = '#1A1A2E';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);

        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `sankey-${Date.now()}.png`;
        link.href = pngUrl;
        link.click();
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
      };

      img.src = url;
    }
  }), []);

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

    const updateDimensions = () => {
      const { clientWidth, clientHeight } = container;
      dimensionsRef.current = { width: clientWidth, height: clientHeight };

      const margin = { top: 40, right: 150, bottom: 40, left: 150 };
      const width = clientWidth - margin.left - margin.right;
      const height = clientHeight - margin.top - margin.bottom;

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

      svg.attr('width', clientWidth)
        .attr('height', clientHeight)
        .attr('viewBox', [0, 0, clientWidth, clientHeight]);

      const defs = g.selectAll('defs').data([null]);
      defs.enter().append('defs');

      const gradients = g.select('defs')
        .selectAll('linearGradient')
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
        .attr('stop-color', (d: ExtendedSankeyLink, i: number) => {
          const sourceIndex = nodes.indexOf(d.source as ExtendedSankeyNode);
          return getNodeColor(d.source as ExtendedSankeyNode, sourceIndex);
        });

      allGradients.select('stop:last-child')
        .attr('stop-color', (d: ExtendedSankeyLink, i: number) => {
          const targetIndex = nodes.indexOf(d.target as ExtendedSankeyNode);
          return getNodeColor(d.target as ExtendedSankeyNode, targetIndex);
        });

      const linkGroup = g.selectAll('.link-group').data([null]);
      linkGroup.enter().append('g').attr('class', 'link-group');

      const linkGroups = g.select('.link-group')
        .selectAll('g.link-wrapper')
        .data(links, (d: ExtendedSankeyLink) => `link-${d.index}`);

      linkGroups.exit().remove();

      const linkGroupsEnter = linkGroups.enter()
        .append('g')
        .attr('class', 'link-wrapper');

      linkGroupsEnter.append('path')
        .attr('class', 'sankey-link')
        .attr('fill', 'none')
        .attr('stroke', (d: ExtendedSankeyLink) => `url(#gradient-${d.index})`)
        .attr('stroke-opacity', 0.6);

      linkGroupsEnter.append('text')
        .attr('class', 'sankey-link-label');

      const allLinkGroups = linkGroupsEnter.merge(linkGroups);

      const linkPath = d3.linkHorizontal<ExtendedSankeyLink, [number, number]>()
        .source(d => [(d.source as ExtendedSankeyNode).x1, d.y0! + (d.y1! - d.y0!) / 2])
        .target(d => [(d.target as ExtendedSankeyNode).x0, d.y0! + (d.y1! - d.y0!) / 2]);

      allLinkGroups.select('path')
        .attr('d', (d: ExtendedSankeyLink) => {
          const source = d.source as ExtendedSankeyNode;
          const target = d.target as ExtendedSankeyNode;
          const d0 = {
            source: [source.x1, d.y0! + d.width! / 2],
            target: [target.x0, d.y1! - d.width! / 2]
          } as unknown as ExtendedSankeyLink;
          return linkPath(d);
        })
        .attr('stroke-width', (d: ExtendedSankeyLink) => Math.max(1, d.width!))
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
            .transition()
            .duration(200)
            .attr('stroke-width', Math.max(1, d.width! * 1.2))
            .attr('stroke-opacity', 0.9);

          const wrapper = d3.select(this.parentNode);
          wrapper.select('.sankey-link-label')
            .attr('class', 'sankey-link-label visible')
            .text(d.value.toLocaleString());
        })
        .on('mouseleave', function (event: MouseEvent, d: ExtendedSankeyLink) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('stroke-width', Math.max(1, d.width!))
            .attr('stroke-opacity', 0.6);

          const wrapper = d3.select(this.parentNode);
          wrapper.select('.sankey-link-label')
            .attr('class', 'sankey-link-label');
        });

      allLinkGroups.select('.sankey-link-label')
        .attr('x', (d: ExtendedSankeyLink) => {
          const source = d.source as ExtendedSankeyNode;
          const target = d.target as ExtendedSankeyNode;
          return (source.x1! + target.x0!) / 2;
        })
        .attr('y', (d: ExtendedSankeyLink) => {
          return d.y0! + d.width! / 2 - 5;
        });

      const nodeGroup = g.selectAll('.node-group').data([null]);
      nodeGroup.enter().append('g').attr('class', 'node-group');

      const nodeGroups = g.select('.node-group')
        .selectAll('g.sankey-node')
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
        .on('start', function (event: d3.D3DragEvent<SVGGElement, ExtendedSankeyNode, ExtendedSankeyNode>, d: ExtendedSankeyNode) {
          d3.select(this).raise();
          (event.sourceEvent as Event).stopPropagation();
        })
        .on('drag', function (event: d3.D3DragEvent<SVGGElement, ExtendedSankeyNode, ExtendedSankeyNode>, d: ExtendedSankeyNode) {
          const dy = event.dy;
          const newY0 = Math.max(0, d.y0! + dy);
          const newY1 = newY0 + (d.y1! - d.y0!);

          d.y0 = newY0;
          d.y1 = newY1;

          requestAnimationFrame(() => {
            d3.select(this).select('rect')
              .attr('y', d.y0)
              .attr('height', d.y1! - d.y0!);

            d3.select(this).select('text')
              .attr('x', d.x0! < width / 2 ? d.x1! + 8 : d.x0! - 8)
              .attr('y', (d.y0! + d.y1!) / 2)
              .attr('text-anchor', d.x0! < width / 2 ? 'start' : 'end');

            g.selectAll('.sankey-link')
              .attr('d', (linkD: ExtendedSankeyLink) => {
                const linkPathGen = d3.linkHorizontal<ExtendedSankeyLink, [number, number]>()
                  .source(ld => [(ld.source as ExtendedSankeyNode).x1, ld.y0! + ld.width! / 2])
                  .target(ld => [(ld.target as ExtendedSankeyNode).x0, ld.y1! - ld.width! / 2]);
                return linkPathGen(linkD);
              });

            g.selectAll('.sankey-link-label')
              .attr('x', (linkD: ExtendedSankeyLink) => {
                const source = linkD.source as ExtendedSankeyNode;
                const target = linkD.target as ExtendedSankeyNode;
                return (source.x1! + target.x0!) / 2;
              })
              .attr('y', (linkD: ExtendedSankeyLink) => linkD.y0! + linkD.width! / 2 - 5);

            g.selectAll('linearGradient')
              .attr('x1', (linkD: ExtendedSankeyLink) => (linkD.source as ExtendedSankeyNode).x1)
              .attr('x2', (linkD: ExtendedSankeyLink) => (linkD.target as ExtendedSankeyNode).x0);
          });
        })
        .on('end', function () {
          d3.select(this);
        });

      allNodeGroups
        .attr('transform', d => `translate(${d.x0},${d.y0})`)
        .call(drag)
        .on('click', (event: Event, d: ExtendedSankeyNode) => {
          event.stopPropagation();
          onSelectionChange({ type: 'node', data: { id: d.id, label: d.label } });
        });

      allNodeGroups.select('rect')
        .attr('width', d => d.x1! - d.x0!)
        .attr('height', d => d.y1! - d.y0!)
        .attr('fill', (d, i) => getNodeColor(d, i));

      allNodeGroups.select('text')
        .attr('x', d => d.x0! < width / 2 ? d.x1! - d.x0! + 8 : -8)
        .attr('y', d => (d.y1! - d.y0!) / 2)
        .attr('text-anchor', d => d.x0! < width / 2 ? 'start' : 'end')
        .text(d => d.label);

      svg.on('click', () => {
        onSelectionChange({ type: null, data: null });
      });

      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 3])
        .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
          g.attr('transform', event.transform.toString());
        });

      zoomRef.current = zoom;
      svg.call(zoom);
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [data, filteredLinks, onSelectionChange, onFilterChange, getNodeColor]);

  useEffect(() => {
    if (!gRef.current) return;

    const g = d3.select(gRef.current);
    const relatedNodeIds = getRelatedNodeIds(selection);
    const relatedLinkIndices = getRelatedLinkIndices(selection);
    const hasSelection = selection.type !== null;

    g.selectAll('.sankey-node')
      .style('opacity', (d: ExtendedSankeyNode) => {
        if (!hasSelection) return 1;
        return relatedNodeIds.has(d.id) ? 1 : 0.2;
      });

    g.selectAll('.sankey-link')
      .style('opacity', (d: ExtendedSankeyLink) => {
        if (!hasSelection) return 0.6;
        return relatedLinkIndices.has(d.index) ? 0.9 : 0.1;
      });
  }, [selection, getRelatedNodeIds, getRelatedLinkIndices]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <svg ref={svgRef} className="sankey-svg">
        <g ref={gRef} />
      </svg>
    </div>
  );
});

export default SankeyChart;
