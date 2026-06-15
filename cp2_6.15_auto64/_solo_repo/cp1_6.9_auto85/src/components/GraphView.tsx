import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { GraphNode, GraphLink } from '../api';

interface Props {
  nodes: GraphNode[];
  links: GraphLink[];
  selectedId: string | null;
  selectedType: 'node' | 'link' | null;
  searchQuery: string;
  onSelectNode: (id: string) => void;
  onSelectLink: (id: string) => void;
  onBackdropClick: () => void;
  newlyAddedIds?: Set<string>;
  removedIds?: Set<string>;
  readonly?: boolean;
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  description: string;
  color: string;
  size: number;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  id: string;
  type: string;
  weight: number;
}

const interpolateLinkColor = (weight: number): string => {
  const t = Math.max(1, Math.min(10, weight)) / 10;
  const c1 = d3.color('#888')!;
  const c2 = d3.color('#ffaa00')!;
  return d3.interpolateRgb(c1.formatHex(), c2.formatHex())(t);
};

const GraphView = ({
  nodes,
  links,
  selectedId,
  selectedType,
  searchQuery,
  onSelectNode,
  onSelectLink,
  onBackdropClick,
  newlyAddedIds = new Set(),
  removedIds = new Set(),
  readonly = false,
}: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const widthRef = useRef(800);
  const heightRef = useRef(600);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const resize = () => {
      widthRef.current = container.clientWidth;
      heightRef.current = container.clientHeight;
      if (svgRef.current) {
        d3.select(svgRef.current).attr('width', widthRef.current).attr('height', heightRef.current);
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', widthRef.current)
      .attr('height', heightRef.current)
      .style('background', 'transparent')
      .style('cursor', 'grab');
    svgRef.current = svg.node();

    const defs = svg.append('defs');
    const glow = defs.append('filter').attr('id', 'glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    glow.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur');
    const merge = glow.append('feMerge');
    merge.append('feMergeNode').attr('in', 'coloredBlur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    const pulse = defs.append('filter').attr('id', 'pulse').attr('x', '-100%').attr('y', '-100%').attr('width', '300%').attr('height', '300%');
    const morph = pulse.append('feMorphology').attr('operator', 'dilate').attr('radius', '2');
    morph.append('animate').attr('attributeName', 'radius').attr('values', '2;8;2').attr('dur', '1.5s').attr('repeatCount', 'indefinite');
    const pulseGauss = pulse.append('feGaussianBlur').attr('stdDeviation', '6');
    pulseGauss.append('animate').attr('attributeName', 'stdDeviation').attr('values', '4;10;4').attr('dur', '1.5s').attr('repeatCount', 'indefinite');
    const pulseMerge = pulse.append('feMerge');
    pulseMerge.append('feMergeNode');
    pulseMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const g = svg.append('g');
    gRef.current = g.node();

    g.append('g').attr('class', 'links');
    g.append('g').attr('class', 'link-labels');
    g.append('g').attr('class', 'nodes');
    g.append('g').attr('class', 'node-labels');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
      });
    svg.call(zoom);
    zoomRef.current = zoom;

    svg.on('dblclick.zoom', null);
    svg.on('dblclick', () => {
      svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
    });

    svg.on('click', (event) => {
      if (event.target === svgRef.current || (event.target as Element).tagName === 'rect') {
        onBackdropClick();
      }
    });

    const simulation = d3
      .forceSimulation<SimNode>([])
      .force('link', d3.forceLink<SimNode, SimLink>().id((d) => d.id).distance(120).strength(0.4))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(widthRef.current / 2, heightRef.current / 2))
      .force('collision', d3.forceCollide<SimNode>().radius((d) => d.size + 4))
      .alphaDecay(0.02)
      .velocityDecay(0.3);
    simRef.current = simulation;

    simulation.on('tick', () => {
      const linksSel = g.select<SVGGElement>('.links').selectAll<SVGLineElement, SimLink>('line');
      linksSel
        .attr('x1', (d) => (d.source as SimNode).x || 0)
        .attr('y1', (d) => (d.source as SimNode).y || 0)
        .attr('x2', (d) => (d.target as SimNode).x || 0)
        .attr('y2', (d) => (d.target as SimNode).y || 0);

      const linkLabelsSel = g.select<SVGGElement>('.link-labels').selectAll<SVGTextElement, SimLink>('text');
      linkLabelsSel
        .attr('x', (d) => {
          const sx = (d.source as SimNode).x || 0;
          const tx = (d.target as SimNode).x || 0;
          return (sx + tx) / 2;
        })
        .attr('y', (d) => {
          const sy = (d.source as SimNode).y || 0;
          const ty = (d.target as SimNode).y || 0;
          return (sy + ty) / 2 - 6;
        });

      const nodesSel = g.select<SVGGElement>('.nodes').selectAll<SVGCircleElement, SimNode>('circle');
      nodesSel.attr('cx', (d) => d.x || 0).attr('cy', (d) => d.y || 0);

      const nodeLabelsSel = g.select<SVGGElement>('.node-labels').selectAll<SVGTextElement, SimNode>('text');
      nodeLabelsSel.attr('x', (d) => d.x || 0).attr('y', (d) => (d.y || 0) + d.size + 14);
    });

    return () => {
      simulation.stop();
      ro.disconnect();
      svg.remove();
    };
  }, [onBackdropClick]);

  useEffect(() => {
    if (!simRef.current || !gRef.current) return;

    const sim = simRef.current;
    const g = d3.select(gRef.current);
    const simNodes: SimNode[] = nodes.map((n) => ({
      id: n.id,
      name: n.name,
      description: n.description,
      color: n.color,
      size: n.size,
      x: n.x ?? widthRef.current / 2 + (Math.random() - 0.5) * 200,
      y: n.y ?? heightRef.current / 2 + (Math.random() - 0.5) * 200,
    }));

    const simLinks: SimLink[] = links.map((l) => ({
      id: l.id,
      source: typeof l.source === 'string' ? l.source : l.source.id,
      target: typeof l.target === 'string' ? l.target : l.target.id,
      type: l.type,
      weight: l.weight,
    }));

    sim.nodes(simNodes);
    (sim.force('link') as d3.ForceLink<SimNode, SimLink>).links(simLinks);
    sim.alpha(0.6).restart();

    const q = searchQuery.trim().toLowerCase();
    const highlightNodeIds = new Set<string>();
    if (q) {
      const matched = simNodes.filter((n) => n.name.toLowerCase().includes(q));
      matched.forEach((n) => highlightNodeIds.add(n.id));
      simLinks.forEach((l) => {
        const sid = (l.source as SimNode).id;
        const tid = (l.target as SimNode).id;
        if (highlightNodeIds.has(sid)) highlightNodeIds.add(tid);
        if (highlightNodeIds.has(tid)) highlightNodeIds.add(sid);
      });
    }
    const hasSearch = q.length > 0;

    const linksG = g.select<SVGGElement>('.links');
    const linkSel = linksG.selectAll<SVGLineElement, SimLink>('line').data(simLinks, (d) => d.id);

    linkSel.exit().each(function (d) {
      const isRemoving = removedIds.has(d.id);
      d3.select(this)
        .transition()
        .duration(isRemoving ? 200 : 200)
        .style('opacity', 0)
        .remove();
    });

    const newLink = linkSel
      .enter()
      .append('line')
      .attr('stroke', (d) => interpolateLinkColor(d.weight))
      .attr('stroke-opacity', 0)
      .attr('stroke-width', 0)
      .attr('stroke-linecap', 'round')
      .style('cursor', readonly ? 'default' : 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        if (!readonly) onSelectLink(d.id);
      });

    newLink
      .transition()
      .duration(300)
      .attr('stroke-opacity', 0.5)
      .attr('stroke-width', (d) => 1 + ((d.weight - 1) / 9) * 4);

    linkSel
      .merge(newLink)
      .attr('stroke', (d) => interpolateLinkColor(d.weight))
      .attr('stroke-width', (d) => 1 + ((d.weight - 1) / 9) * 4)
      .attr('stroke-opacity', (d) => {
        if (!hasSearch) return 0.5;
        const sid = (d.source as SimNode).id;
        const tid = (d.target as SimNode).id;
        return highlightNodeIds.has(sid) && highlightNodeIds.has(tid) ? 0.9 : 0.08;
      })
      .attr('stroke', (d) => {
        if (selectedId === d.id && selectedType === 'link') return '#ffaa00';
        return interpolateLinkColor(d.weight);
      })
      .attr('stroke-width', (d) => {
        const base = 1 + ((d.weight - 1) / 9) * 4;
        if (selectedId === d.id && selectedType === 'link') return base + 2;
        return base;
      });

    const linkLabelsG = g.select<SVGGElement>('.link-labels');
    const linkLabelSel = linkLabelsG.selectAll<SVGTextElement, SimLink>('text').data(simLinks, (d) => d.id);
    linkLabelSel.exit().remove();

    const newLinkLabel = linkLabelSel
      .enter()
      .append('text')
      .text((d) => d.type)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'IBM Plex Sans, sans-serif')
      .attr('font-size', '11px')
      .attr('fill', '#b8b8d0')
      .attr('font-weight', 500)
      .attr('paint-order', 'stroke')
      .attr('stroke', '#1a1a2e')
      .attr('stroke-width', 3)
      .attr('stroke-opacity', 0.8)
      .style('opacity', 0)
      .style('pointer-events', 'none');

    newLinkLabel.transition().duration(400).style('opacity', 1);

    linkLabelSel.merge(newLinkLabel).text((d) => d.type).style('opacity', (d) => {
      if (!hasSearch) return 1;
      const sid = (d.source as SimNode).id;
      const tid = (d.target as SimNode).id;
      return highlightNodeIds.has(sid) && highlightNodeIds.has(tid) ? 1 : 0;
    });

    const nodesG = g.select<SVGGElement>('.nodes');
    const nodeSel = nodesG.selectAll<SVGCircleElement, SimNode>('circle').data(simNodes, (d) => d.id);

    nodeSel.exit().each(function (d) {
      const isRemoving = removedIds.has(d.id);
      d3.select(this)
        .transition()
        .duration(isRemoving ? 200 : 200)
        .attr('r', 0)
        .style('opacity', 0)
        .remove();
    });

    const newNode = nodeSel
      .enter()
      .append('circle')
      .attr('r', 0)
      .attr('fill', (d) => d.color)
      .attr('stroke', '#0a0a1a')
      .attr('stroke-width', 2)
      .style('cursor', readonly ? 'default' : 'grab');

    newNode
      .transition()
      .duration(newlyAddedIds.size > 0 ? 300 : 0)
      .delay((d) => (newlyAddedIds.has(d.id) ? 0 : 0))
      .attr('r', (d) => d.size);

    if (!readonly) {
      const drag = d3
        .drag<SVGCircleElement, SimNode>()
        .on('start', (event, d) => {
          if (!event.active) sim.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
          d3.select(event.sourceEvent.target).style('cursor', 'grabbing');
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) sim.alphaTarget(0);
          d.fx = null;
          d.fy = null;
          d3.select(event.sourceEvent.target).style('cursor', 'grab');
        });
      newNode.call(drag);
    }

    newNode.on('click', (event, d) => {
      event.stopPropagation();
      if (!readonly) onSelectNode(d.id);
    });

    const mergedNode = nodeSel.merge(newNode);
    mergedNode
      .attr('r', (d) => d.size)
      .attr('fill', (d) => d.color)
      .style('opacity', (d) => {
        if (!hasSearch) return 1;
        return highlightNodeIds.has(d.id) ? 1 : 0.15;
      })
      .attr('filter', (d) => {
        const filters: string[] = [];
        if (selectedId === d.id && selectedType === 'node') filters.push('url(#glow)');
        if (hasSearch && highlightNodeIds.has(d.id)) filters.push('url(#pulse)');
        return filters.length ? filters.join(' ') : null;
      })
      .attr('stroke', (d) => {
        if (hasSearch && highlightNodeIds.has(d.id)) return '#ffaa00';
        if (selectedId === d.id && selectedType === 'node') return '#ffaa00';
        return '#0a0a1a';
      })
      .attr('stroke-width', (d) => {
        if (selectedId === d.id && selectedType === 'node') return 3;
        if (hasSearch && highlightNodeIds.has(d.id)) return 3;
        return 2;
      });

    const nodeLabelsG = g.select<SVGGElement>('.node-labels');
    const nodeLabelSel = nodeLabelsG.selectAll<SVGTextElement, SimNode>('text').data(simNodes, (d) => d.id);
    nodeLabelSel.exit().remove();

    const newNodeLabel = nodeLabelSel
      .enter()
      .append('text')
      .text((d) => d.name)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Playfair Display, serif')
      .attr('font-size', '13px')
      .attr('font-weight', 600)
      .attr('fill', '#e8e8f0')
      .attr('paint-order', 'stroke')
      .attr('stroke', '#1a1a2e')
      .attr('stroke-width', 4)
      .attr('stroke-opacity', 0.85)
      .style('opacity', 0)
      .style('pointer-events', 'none');

    newNodeLabel.transition().duration(400).style('opacity', 1);

    nodeLabelSel.merge(newNodeLabel).text((d) => d.name).style('opacity', (d) => {
      if (!hasSearch) return 1;
      return highlightNodeIds.has(d.id) ? 1 : 0.15;
    });
  }, [nodes, links, selectedId, selectedType, searchQuery, newlyAddedIds, removedIds, readonly, onSelectNode, onSelectLink]);

  return <div ref={containerRef} className="graph-view-container" style={{ width: '100%', height: '100%', position: 'relative' }} />;
};

export default GraphView;
