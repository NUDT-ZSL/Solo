import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3Force from 'd3-force';
import { Entity, Relation, EntityType } from '../types';

interface StoryMapProps {
  entities: Entity[];
  relations: Relation[];
  highlightedEntityIds: string[];
  isDraggingFromList: boolean;
  dragEntity: Entity | null;
  onDropOnMap: (targetX: number, targetY: number) => void;
  onNodeDoubleClick: (entity: Entity) => void;
  onNodePositionChange: (entityId: string, x: number, y: number) => void;
}

interface D3Node extends Entity {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface D3Link extends Relation {
  source: D3Node | string;
  target: D3Node | string;
}

const typeColors: Record<EntityType, string> = {
  character: '#6c63ff',
  location: '#00bcd4',
  event: '#ff4081'
};

const StoryMap: React.FC<StoryMapProps> = ({
  entities,
  relations,
  highlightedEntityIds,
  isDraggingFromList,
  dragEntity,
  onDropOnMap,
  onNodeDoubleClick,
  onNodePositionChange
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    entity: Entity | null;
    x: number;
    y: number;
  }>({ visible: false, entity: null, x: 0, y: 0 });
  const [dropIndicator, setDropIndicator] = useState<{ x: number; y: number } | null>(null);
  const nodesRef = useRef<D3Node[]>([]);
  const linksRef = useRef<D3Link[]>([]);
  const simulationRef = useRef<d3Force.Simulation<D3Node, D3Link> | null>(null);
  const dragNodeRef = useRef<D3Node | null>(null);
  const lastPositionUpdateRef = useRef<number>(0);

  const getNodeRadius = useCallback((count: number) => {
    const minCount = Math.min(...entities.map(e => e.count), 1);
    const maxCount = Math.max(...entities.map(e => e.count), 1);
    const range = maxCount - minCount || 1;
    const normalized = (count - minCount) / range;
    return 12 + normalized * 20;
  }, [entities]);

  const getLinkWidth = useCallback((cooccurrence: number) => {
    return Math.min(Math.max(1, cooccurrence), 4);
  }, []);

  useEffect(() => {
    if (!svgRef.current || entities.length === 0) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const nodes: D3Node[] = entities.map(e => ({
      ...e,
      x: e.x !== undefined ? e.x : width / 2 + (Math.random() - 0.5) * 200,
      y: e.y !== undefined ? e.y : height / 2 + (Math.random() - 0.5) * 200,
    }));

    const links: D3Link[] = relations.map(r => ({
      ...r,
      source: r.sourceId,
      target: r.targetId
    }));

    nodesRef.current = nodes;
    linksRef.current = links;

    const simulation = d3Force.forceSimulation<D3Node>(nodes)
      .force('link', d3Force.forceLink<D3Node, D3Link>(links)
        .id((d: any) => d.id)
        .distance(100)
        .strength(0.3))
      .force('charge', d3Force.forceManyBody().strength(-300))
      .force('center', d3Force.forceCenter(width / 2, height / 2))
      .force('collision', d3Force.forceCollide().radius((d: any) => getNodeRadius(d.count) + 10))
      .alphaDecay(0.02)
      .stop();

    for (let i = 0; i < 300; i++) {
      simulation.tick();
    }

    simulationRef.current = simulation;

    const svg = d3Force.select(svgRef.current);

    svg.selectAll('*').remove();

    const defs = svg.append('defs');
    const glowFilter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur');
    const merge = glowFilter.append('feMerge');
    merge.append('feMergeNode').attr('in', 'coloredBlur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    const linkGroup = svg.append('g').attr('class', 'links');
    const nodeGroup = svg.append('g').attr('class', 'nodes');

    const link = linkGroup.selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'map-link')
      .attr('stroke-width', (d: any) => getLinkWidth(d.cooccurrence));

    const node = nodeGroup.selectAll('g')
      .data(nodes, (d: any) => d.id)
      .enter()
      .append('g')
      .attr('class', (d: any) => `map-node ${d.type} ${highlightedEntityIds.includes(d.id) ? 'highlighted' : ''}`)
      .call(d3Force.drag<D3Node, SVGGElement>()
        .on('start', (event: any, d: D3Node) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
          dragNodeRef.current = d;
        })
        .on('drag', (event: any, d: D3Node) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event: any, d: D3Node) => {
          if (!event.active) simulation.alphaTarget(0);
          dragNodeRef.current = null;
          if (d.x !== undefined && d.y !== undefined) {
            onNodePositionChange(d.id, d.x, d.y);
          }
        })
      );

    node.append('circle')
      .attr('r', (d: any) => getNodeRadius(d.count))
      .attr('fill', (d: any) => d.color || typeColors[d.type])
      .attr('opacity', 0.9);

    node.append('text')
      .attr('class', 'node-label')
      .attr('dy', (d: any) => getNodeRadius(d.count) + 12)
      .text((d: any) => d.name.length > 8 ? d.name.slice(0, 8) + '...' : d.name);

    node.on('mouseover', (event: MouseEvent, d: D3Node) => {
      setTooltip({
        visible: true,
        entity: d as Entity,
        x: event.clientX + 15,
        y: event.clientY + 15
      });
    })
    .on('mousemove', (event: MouseEvent) => {
      setTooltip(prev => ({
        ...prev,
        x: event.clientX + 15,
        y: event.clientY + 15
      }));
    })
    .on('mouseout', () => {
      setTooltip({ visible: false, entity: null, x: 0, y: 0 });
    })
    .on('dblclick', (event: MouseEvent, d: D3Node) => {
      event.stopPropagation();
      onNodeDoubleClick(d as Entity);
    });

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);

      const now = Date.now();
      if (now - lastPositionUpdateRef.current > 1000) {
        nodes.forEach(n => {
          if (n.fx === undefined && n.fy === undefined && n.x !== undefined && n.y !== undefined) {
            onNodePositionChange(n.id, n.x, n.y);
          }
        });
        lastPositionUpdateRef.current = now;
      }
    });

    simulation.restart();

    return () => {
      simulation.stop();
    };
  }, [entities, relations, highlightedEntityIds, getNodeRadius, getLinkWidth, onNodePositionChange, onNodeDoubleClick]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3Force.select(svgRef.current);
    
    svg.selectAll('.map-node')
      .classed('highlighted', (d: any) => highlightedEntityIds.includes(d.id));
  }, [highlightedEntityIds]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDraggingFromList && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setDropIndicator({ x, y });
    }
  }, [isDraggingFromList]);

  const handleMouseLeave = useCallback(() => {
    setDropIndicator(null);
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isDraggingFromList && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      onDropOnMap(x, y);
    }
    setDropIndicator(null);
  }, [isDraggingFromList, onDropOnMap]);

  if (entities.length === 0) {
    return (
      <div className="story-map-panel">
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <div className="empty-state-text">上传电子书开始分析</div>
          <div className="empty-state-hint">支持 txt 和 epub 格式</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="story-map-panel"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseUp={handleMouseUp}
    >
      <svg ref={svgRef} className="story-map-svg" />
      
      {tooltip.visible && tooltip.entity && (
        <div 
          className="tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="tooltip-title">{tooltip.entity.name}</div>
          <div className="tooltip-row">
            类型：<span>{tooltip.entity.type === 'character' ? '角色' : tooltip.entity.type === 'location' ? '地点' : '事件'}</span>
          </div>
          <div className="tooltip-row">
            出现次数：<span>{tooltip.entity.count}</span>
          </div>
          <div className="tooltip-row">
            首次出现：<span>第{tooltip.entity.firstChapter}章</span>
          </div>
        </div>
      )}

      {dropIndicator && isDraggingFromList && (
        <div
          className="drop-zone-indicator"
          style={{ left: dropIndicator.x, top: dropIndicator.y }}
        />
      )}
    </div>
  );
};

export default StoryMap;
