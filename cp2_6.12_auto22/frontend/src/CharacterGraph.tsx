import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { CharacterGraphData, GraphNode, GraphLink } from './types';

interface Props {
  data: CharacterGraphData;
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  frequency: number;
  tags: string[];
  bio?: string;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  strength: number;
}

const NODE_COLORS = ['#4da6ff', '#e94560', '#ff9933', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
const NODE_MIN_RADIUS = 8;
const NODE_MAX_RADIUS = 28;
const LINK_MIN_WIDTH = 1;
const LINK_MAX_WIDTH = 5;
const DRAG_CLICK_DISTANCE = 5;

const CharacterGraph: React.FC<Props> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [popup, setPopup] = useState<{ node: SimNode; x: number; y: number } | null>(null);
  const simulationRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const prevPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    if (data.nodes.length === 0) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--text-muted)')
        .attr('font-size', 12)
        .text('定义角色后将显示关系图');
      return;
    }

    const maxFreq = Math.max(...data.nodes.map(n => n.frequency), 1);
    const maxStrength = Math.max(...data.links.map(l => l.strength), 1);

    const nodes: SimNode[] = data.nodes.map((n, i) => {
      const prev = prevPositionsRef.current.get(n.id);
      return {
        ...n,
        x: prev?.x ?? width / 2 + Math.cos(i / Math.PI) * 50,
        y: prev?.y ?? height / 2 + Math.sin(i / Math.PI) * 50,
      };
    });

    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    const links: SimLink[] = data.links.map(l => ({
      source: nodeMap.get(typeof l.source === 'string' ? l.source : l.source.id) as SimNode,
      target: nodeMap.get(typeof l.target === 'string' ? l.target : l.target.id) as SimNode,
      strength: l.strength,
    })).filter(l => l.source && l.target);

    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 2])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    const defs = svg.append('defs');
    data.nodes.forEach((n, i) => {
      const color = NODE_COLORS[i % NODE_COLORS.length];
      const grad = defs.append('radialGradient')
        .attr('id', `grad-${n.id}`)
        .attr('cx', '40%')
        .attr('cy', '40%');
      grad.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.9);
      grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0.5);
    });

    const linkGroup = g.append('g').attr('class', 'graph-links');
    const nodeGroup = g.append('g').attr('class', 'graph-nodes');

    const linkSel = linkGroup.selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'graph-link')
      .attr('stroke-width', d => LINK_MIN_WIDTH + (d.strength / maxStrength) * (LINK_MAX_WIDTH - LINK_MIN_WIDTH))
      .attr('stroke-opacity', d => 0.2 + (d.strength / maxStrength) * 0.5);

    const nodeSel = nodeGroup.selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'graph-node')
      .style('cursor', 'grab')
      .style('color', (d, i) => NODE_COLORS[i % NODE_COLORS.length]);

    const getRadius = (d: SimNode) => NODE_MIN_RADIUS + (d.frequency / maxFreq) * (NODE_MAX_RADIUS - NODE_MIN_RADIUS);

    nodeSel.append('circle')
      .attr('r', getRadius)
      .attr('fill', (d, i) => `url(#grad-${d.id})`)
      .attr('stroke', (d, i) => NODE_COLORS[i % NODE_COLORS.length])
      .attr('stroke-width', 1.5)
      .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))');

    nodeSel.append('text')
      .attr('dy', d => -getRadius(d) - 4)
      .attr('text-anchor', 'middle')
      .text(d => d.name)
      .style('font-family', 'var(--font-display)')
      .style('font-size', 11);

    const simulation = d3.forceSimulation<SimNode>(nodes)
      .force('link', d3.forceLink<SimNode, SimLink>(links)
        .id(d => d.id)
        .distance(80)
        .strength(d => 0.3 + (d.strength / maxStrength) * 0.4))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<SimNode>().radius(d => NODE_MIN_RADIUS + 6 + (d.frequency / maxFreq) * (NODE_MAX_RADIUS - NODE_MIN_RADIUS)))
      .alphaDecay(0.028);

    simulationRef.current = simulation;

    simulation.on('tick', () => {
      linkSel
        .attr('x1', d => (d.source as SimNode).x!)
        .attr('y1', d => (d.source as SimNode).y!)
        .attr('x2', d => (d.target as SimNode).x!)
        .attr('y2', d => (d.target as SimNode).y!);

      nodeSel.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    let dragStartX = 0;
    let dragStartY = 0;
    let hasDragged = false;

    const drag = d3.drag<SVGGElement, SimNode>()
      .on('start', (event, d) => {
        dragStartX = event.x;
        dragStartY = event.y;
        hasDragged = false;
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        d3.select(event.sourceEvent.target.closest('.graph-node')).classed('dragging', true);
        nodeSel.style('cursor', 'grabbing');
      })
      .on('drag', (event, d) => {
        const dx = Math.abs(event.x - dragStartX);
        const dy = Math.abs(event.y - dragStartY);
        if (dx > DRAG_CLICK_DISTANCE || dy > DRAG_CLICK_DISTANCE) {
          hasDragged = true;
        }
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
        d3.select(event.sourceEvent.target.closest('.graph-node')).classed('dragging', false);
        nodeSel.style('cursor', 'grab');
      });

    nodeSel.call(drag);

    nodeSel.on('click', (event, d) => {
      if (hasDragged) return;
      event.stopPropagation();
      const rect = container.getBoundingClientRect();
      setPopup({
        node: d,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    });

    svg.on('click', () => setPopup(null));

    simulation.alpha(1).restart();

    return () => {
      prevPositionsRef.current = new Map(nodes.map(n => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }]));
      simulation.stop();
    };
  }, [data]);

  return (
    <div className="character-graph-container" ref={containerRef}>
      <svg ref={svgRef} />
      {popup && (
        <div
          className="character-popup"
          style={{ left: Math.min(popup.x, 200), top: popup.y + 10 }}
        >
          <div className="character-popup-name">{popup.node.name}</div>
          <div className="character-popup-bio">
            {popup.node.bio || '暂无角色简介'}
          </div>
          <div className="chapter-tags">
            {popup.node.tags.map(t => (
              <span key={t} className="tag-chip">{t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterGraph;
