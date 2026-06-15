import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import type { GraphNode, GraphLink } from './types';

interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  type: GraphNode['type'];
  name: string;
  startLine: number;
  endLine: number;
  snippet: string;
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  type: GraphLink['type'];
}

interface GraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
  onNodeHover: (node: GraphNode | null) => void;
  onNodeClick: (node: GraphNode) => void;
  svgRefCallback: (svg: SVGSVGElement | null) => void;
}

const COLORS: Record<GraphNode['type'], string> = {
  function: '#4fc3f7',
  variable: '#81c784',
  branch: '#ffb74d',
  loop: '#ba68c8',
  call: '#f06292'
};

const NODE_RADIUS = 24;
const RECT_W = 70;
const RECT_H = 30;

const Graph: React.FC<GraphProps> = ({ nodes, links, onNodeHover, onNodeClick, svgRefCallback }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const simulationRef = useRef<d3.Simulation<D3Node, D3Link> | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const hoveredIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const draw = useCallback(() => {
    if (!containerRef.current || dimensions.width === 0) return;

    const existing = d3.select(containerRef.current).select('svg');
    existing.remove();
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const { width, height } = dimensions;

    const svg = d3
      .select(containerRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('xmlns', 'http://www.w3.org/2000/svg');

    svgRef.current = svg.node() as SVGSVGElement;
    svgRefCallback(svgRef.current);

    const gZoom = svg.append('g').attr('class', 'zoom-layer');

    const defs = svg.append('defs');
    defs
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 28)
      .attr('refY', 0)
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#666666');

    defs
      .append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%')
      .append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'coloredBlur');

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        gZoom.attr('transform', event.transform);
      });
    svg.call(zoomBehavior);

    const d3Nodes: D3Node[] = nodes.map((n) => ({
      ...n
    }));

    const idToNode = new Map(d3Nodes.map((n) => [n.id, n]));
    const d3Links: D3Link[] = links
      .filter((l) => idToNode.has(l.source) && idToNode.has(l.target))
      .map((l) => ({
        source: idToNode.get(l.source)!,
        target: idToNode.get(l.target)!,
        type: l.type
      }));

    const linkGroup = gZoom.append('g').attr('class', 'links');
    const nodeGroup = gZoom.append('g').attr('class', 'nodes');
    const labelGroup = gZoom.append('g').attr('class', 'labels');

    const linkSel = linkGroup
      .selectAll<SVGLineElement, D3Link>('line')
      .data(d3Links)
      .enter()
      .append('line')
      .attr('stroke', '#666666')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrowhead)')
      .style('transition', 'stroke-opacity 0.3s ease, stroke-width 0.3s ease');

    const nodeSel = nodeGroup
      .selectAll<SVGGElement, D3Node>('g.node')
      .data(d3Nodes, (d) => d.id)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'grab')
      .on('mouseover', function (_ev, d) {
        d3.select(this).style('cursor', 'grab');
        hoveredIdRef.current = d.id;
        const relatedIds = new Set<string>([d.id]);
        d3Links.forEach((l) => {
          const src = typeof l.source === 'object' ? l.source.id : l.source;
          const tgt = typeof l.target === 'object' ? l.target.id : l.target;
          if (src === d.id) relatedIds.add(tgt as string);
          if (tgt === d.id) relatedIds.add(src as string);
        });

        nodeSel.transition().duration(300).style('opacity', (n) => (relatedIds.has(n.id) ? 1 : 0.15));

        linkSel.transition().duration(300).style('stroke-opacity', (l) => {
          const src = typeof l.source === 'object' ? l.source.id : l.source;
          const tgt = typeof l.target === 'object' ? l.target.id : l.target;
          return src === d.id || tgt === d.id ? 1 : 0.08;
        }).style('stroke-width', (l) => {
          const src = typeof l.source === 'object' ? l.source.id : l.source;
          const tgt = typeof l.target === 'object' ? l.target.id : l.target;
          return src === d.id || tgt === d.id ? 2.5 : 1.5;
        });

        onNodeHover({
          id: d.id,
          type: d.type,
          name: d.name,
          startLine: d.startLine,
          endLine: d.endLine,
          snippet: d.snippet
        });
      })
      .on('mouseout', function () {
        hoveredIdRef.current = null;
        nodeSel.transition().duration(300).style('opacity', 1);
        linkSel.transition().duration(300).style('stroke-opacity', 0.6).style('stroke-width', 1.5);
        onNodeHover(null);
      })
      .on('click', function (_ev, d) {
        onNodeClick({
          id: d.id,
          type: d.type,
          name: d.name,
          startLine: d.startLine,
          endLine: d.endLine,
          snippet: d.snippet
        });
      });

    nodeSel
      .filter((d) => d.type === 'function')
      .append('circle')
      .attr('r', NODE_RADIUS)
      .attr('fill', (d) => COLORS[d.type])
      .attr('fill-opacity', 0.9)
      .attr('stroke', '#ffffff33')
      .attr('stroke-width', 1.5)
      .style('filter', (d) => `drop-shadow(0 0 8px ${COLORS[d.type]}aa)`);

    nodeSel
      .filter((d) => d.type === 'variable')
      .append('rect')
      .attr('x', -RECT_W / 2)
      .attr('y', -RECT_H / 2)
      .attr('width', RECT_W)
      .attr('height', RECT_H)
      .attr('rx', 6)
      .attr('fill', (d) => COLORS[d.type])
      .attr('fill-opacity', 0.9)
      .attr('stroke', '#ffffff33')
      .attr('stroke-width', 1.5)
      .style('filter', (d) => `drop-shadow(0 0 8px ${COLORS[d.type]}aa)`);

    nodeSel
      .filter((d) => d.type === 'branch')
      .append('polygon')
      .attr('points', '0,-24 28,0 0,24 -28,0')
      .attr('fill', (d) => COLORS[d.type])
      .attr('fill-opacity', 0.9)
      .attr('stroke', '#ffffff33')
      .attr('stroke-width', 1.5)
      .style('filter', (d) => `drop-shadow(0 0 8px ${COLORS[d.type]}aa)`);

    nodeSel
      .filter((d) => d.type === 'loop')
      .append('rect')
      .attr('x', -22)
      .attr('y', -22)
      .attr('width', 44)
      .attr('height', 44)
      .attr('rx', 8)
      .attr('fill', (d) => COLORS[d.type])
      .attr('fill-opacity', 0.9)
      .attr('stroke', '#ffffff33')
      .attr('stroke-width', 1.5)
      .style('filter', (d) => `drop-shadow(0 0 8px ${COLORS[d.type]}aa)`);

    nodeSel
      .filter((d) => d.type === 'call')
      .append('ellipse')
      .attr('rx', 28)
      .attr('ry', 18)
      .attr('fill', (d) => COLORS[d.type])
      .attr('fill-opacity', 0.9)
      .attr('stroke', '#ffffff33')
      .attr('stroke-width', 1.5)
      .style('filter', (d) => `drop-shadow(0 0 8px ${COLORS[d.type]}aa)`);

    labelGroup
      .selectAll<SVGTextElement, D3Node>('text')
      .data(d3Nodes, (d) => d.id)
      .enter()
      .append('text')
      .text((d) => d.name.length > 14 ? d.name.slice(0, 12) + '…' : d.name)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#ffffff')
      .attr('font-size', 11)
      .attr('font-weight', 600)
      .attr('pointer-events', 'none')
      .style('text-shadow', '0 1px 3px #000000aa');

    const drag = d3.drag<SVGGElement, D3Node>()
      .on('start', (event, d) => {
        if (!event.active) simulationRef.current?.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulationRef.current?.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeSel.call(drag);

    const simulation = d3
      .forceSimulation<D3Node>(d3Nodes)
      .force(
        'link',
        d3.forceLink<D3Node, D3Link>(d3Links).id((d) => d.id).distance(110).strength(0.6)
      )
      .force('charge', d3.forceManyBody().strength(-380))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(50))
      .alphaDecay(0.03);

    simulationRef.current = simulation;

    simulation.on('tick', () => {
      linkSel
        .attr('x1', (d) => (d.source as D3Node).x ?? 0)
        .attr('y1', (d) => (d.source as D3Node).y ?? 0)
        .attr('x2', (d) => (d.target as D3Node).x ?? 0)
        .attr('y2', (d) => (d.target as D3Node).y ?? 0);

      nodeSel.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
      labelGroup.selectAll<SVGTextElement, D3Node>('text').attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });
  }, [nodes, links, dimensions, onNodeHover, onNodeClick, svgRefCallback]);

  useEffect(() => {
    draw();
  }, [draw]);

  return <div ref={containerRef} className="graph-container" style={{ width: '100%', height: '100%' }} />;
};

export default Graph;
