import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import {
  SkillNode,
  SkillLink,
  HoveredNode,
  getNodeRadius,
  getProgressRingWidth,
} from './types';

interface SkillCanvasProps {
  nodes: SkillNode[];
  links: SkillLink[];
  onNodesChange: (nodes: SkillNode[]) => void;
  onLinksChange: (links: SkillLink[]) => void;
  onDeleteLink: (linkId: string) => void;
}

type D3Node = SkillNode & d3.SimulationNodeDatum;
type D3Link = d3.SimulationLinkDatum<D3Node> & SkillLink;

const SkillCanvas: React.FC<SkillCanvasProps> = ({
  nodes,
  links,
  onNodesChange,
  onLinksChange,
  onDeleteLink,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<D3Node, D3Link> | null>(null);
  const [hoveredNode, setHoveredNode] = useState<HoveredNode | null>(null);
  const [dims, setDims] = useState({ width: 800, height: 600 });
  const [pulsingIds, setPulsingIds] = useState<Set<string>>(new Set());
  const connectingRef = useRef<{ fromId: string; tempLine: SVGLineElement | null } | null>(null);
  const prevNodeIdsRef = useRef<Set<string>>(new Set());
  const prevLinkIdsRef = useRef<Set<string>>(new Set());

  const getNodeDepth = useCallback(
    (nodeId: string, nodesMap: Map<string, SkillNode>): number => {
      let depth = 0;
      let current = nodesMap.get(nodeId);
      const visited = new Set<string>();
      while (current && current.parentId && !visited.has(current.id)) {
        visited.add(current.id);
        depth++;
        current = nodesMap.get(current.parentId);
      }
      return depth;
    },
    []
  );

  const getMaxDepth = useCallback(
    (nodeList: SkillNode[], nodesMap: Map<string, SkillNode>): number => {
      if (nodeList.length === 0) return 1;
      return Math.max(1, ...nodeList.map((n) => getNodeDepth(n.id, nodesMap) + 1));
    },
    [getNodeDepth]
  );

  const getLinkOpacity = useCallback(
    (link: D3Link, nodesMap: Map<string, SkillNode>, maxDepth: number): number => {
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      const depth = getNodeDepth(targetId, nodesMap);
      const t = maxDepth <= 1 ? 0 : depth / (maxDepth - 1);
      return 0.9 - t * 0.6;
    },
    [getNodeDepth]
  );

  useEffect(() => {
    const updateDims = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDims({ width: rect.width, height: rect.height });
      }
    };
    updateDims();
    window.addEventListener('resize', updateDims);
    return () => window.removeEventListener('resize', updateDims);
  }, []);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    const { width, height } = dims;
    if (width === 0 || height === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

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
      .attr('stdDeviation', '4')
      .attr('result', 'coloredBlur');
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const softGlow = defs
      .append('filter')
      .attr('id', 'softGlow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    softGlow
      .append('feGaussianBlur')
      .attr('stdDeviation', '2')
      .attr('result', 'blur');
    const feMerge2 = softGlow.append('feMerge');
    feMerge2.append('feMergeNode').attr('in', 'blur');
    feMerge2.append('feMergeNode').attr('in', 'SourceGraphic');

    const arrowMarker = defs
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto');
    arrowMarker
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#e94560');

    const nodesMap = new Map<string, SkillNode>();
    nodes.forEach((n) => nodesMap.set(n.id, n));
    const maxDepth = getMaxDepth(nodes, nodesMap);

    const d3Nodes: D3Node[] = nodes.map((n) => ({
      ...n,
      x: n.x ?? width / 2 + (Math.random() - 0.5) * 400,
      y: n.y ?? height / 2 + (Math.random() - 0.5) * 300,
    }));

    const nodeById = new Map<string, D3Node>();
    d3Nodes.forEach((n) => nodeById.set(n.id, n));

    const d3Links: D3Link[] = links.map((l) => {
      const src = typeof l.source === 'string' ? l.source : l.source.id;
      const tgt = typeof l.target === 'string' ? l.target : l.target.id;
      return {
        ...l,
        source: nodeById.get(src) || src,
        target: nodeById.get(tgt) || tgt,
      } as D3Link;
    });

    const container = svg.append('g').attr('class', 'zoom-container');

    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });
    svg.call(zoomBehavior as any);

    const linkGroup = container.append('g').attr('class', 'links');
    const linkLabelGroup = container.append('g').attr('class', 'link-labels');
    const nodeGroup = container.append('g').attr('class', 'nodes');
    const tempLineGroup = container.append('g').attr('class', 'temp-line');

    const simulation = d3
      .forceSimulation<D3Node>(d3Nodes)
      .force(
        'link',
        d3
          .forceLink<D3Node, D3Link>(d3Links)
          .id((d) => d.id)
          .distance((d) => {
            const src = typeof d.source === 'object' ? d.source : null;
            const tgt = typeof d.target === 'object' ? d.target : null;
            if (!src || !tgt) return 120;
            const avgProf = (src.proficiency + tgt.proficiency) / 2;
            return 100 + (100 - avgProf) * 0.8;
          })
          .strength(0.4)
      )
      .force('charge', d3.forceManyBody<D3Node>().strength(-350))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.05))
      .force(
        'collide',
        d3.forceCollide<D3Node>().radius((d) => getNodeRadius(d.proficiency) + 15)
      )
      .alphaDecay(0.02);

    simulationRef.current = simulation;

    const linkElements = linkGroup
      .selectAll<SVGLineElement, D3Link>('line')
      .data(d3Links, (d) => d.id)
      .enter()
      .append('line')
      .attr('stroke', (d) => {
        if (d.type === 'enhancement') return '#4ecdc4';
        if (d.type === 'manual') return '#ffd93d';
        return '#e94560';
      })
      .attr('stroke-opacity', (d) => getLinkOpacity(d, nodesMap, maxDepth))
      .attr('stroke-width', (d) => (d.type === 'dependency' ? 2 : 1.5))
      .attr('stroke-dasharray', (d) => {
        if (d.type === 'enhancement') return '6,4';
        if (d.type === 'manual') return '3,3';
        return 'none';
      })
      .attr('marker-end', (d) => (d.type === 'dependency' ? 'url(#arrowhead)' : null))
      .style('cursor', 'pointer')
      .on('contextmenu', function (event, d) {
        event.preventDefault();
        d3.select(this)
          .transition()
          .duration(300)
          .attr('stroke-opacity', 0)
          .attr('stroke-width', 0)
          .on('end', () => onDeleteLink(d.id));
      });

    const linkElementsWithEnter = linkGroup.selectAll<SVGLineElement, D3Link>('line');
    linkElementsWithEnter
      .attr('stroke-opacity', 0)
      .transition()
      .duration(500)
      .ease(d3.easeCubicOut)
      .attr('stroke-opacity', (d) => getLinkOpacity(d, nodesMap, maxDepth));

    const linkLabels = linkLabelGroup
      .selectAll<SVGTextElement, D3Link>('text')
      .data(d3Links, (d) => d.id)
      .enter()
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', -5)
      .attr('font-size', '9px')
      .attr('fill', 'rgba(255,255,255,0.5)')
      .attr('pointer-events', 'none')
      .text((d) => {
        if (d.type === 'enhancement') return '增强';
        if (d.type === 'manual') return '关联';
        return '依赖';
      })
      .style('opacity', 0)
      .transition()
      .duration(500)
      .style('opacity', 1);

    const nodeGroups = nodeGroup
      .selectAll<SVGGElement, D3Node>('g')
      .data(d3Nodes, (d) => d.id)
      .enter()
      .append('g')
      .attr('cursor', 'grab')
      .attr('class', 'node-group')
      .style('opacity', 0)
      .transition()
      .duration(500)
      .ease(d3.easeCubicOut)
      .style('opacity', 1);

    const nodeSelection = nodeGroup.selectAll<SVGGElement, D3Node>('g.node-group');

    d3Nodes.forEach((d) => {
      const gradId = `grad-${d.id}`;
      const gradient = defs
        .append('linearGradient')
        .attr('id', gradId)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '100%');
      gradient.append('stop').attr('offset', '0%').attr('stop-color', d.color).attr('stop-opacity', 1);
      gradient.append('stop').attr('offset', '100%').attr('stop-color', d.color).attr('stop-opacity', 0.7);
    });

    const progressArcsToAnimate: Array<{
      circle: d3.Selection<SVGCircleElement, D3Node, SVGGElement, unknown>;
      targetOffset: number;
      circumference: number;
    }> = [];

    nodeSelection.each(function (d) {
      const g = d3.select(this);
      const r = getNodeRadius(d.proficiency);
      const ringWidth = getProgressRingWidth(d.proficiency);
      const isLocked = d.parentId
        ? nodes.some((n) => n.id === d.parentId && n.proficiency < 50)
        : false;

      const outerG = g.append('g').attr('class', 'progress-ring-container');

      outerG
        .append('circle')
        .attr('class', 'progress-bg')
        .attr('r', r + ringWidth + 4)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(255,255,255,0.08)')
        .attr('stroke-width', ringWidth + 2)
        .attr('filter', 'url(#softGlow)');

      const circumference = 2 * Math.PI * (r + ringWidth + 4);
      const progressOffset = circumference * (1 - d.proficiency / 100);
      const gradId = `grad-${d.id}`;

      const progressArc = outerG
        .append('circle')
        .attr('class', 'progress-arc')
        .attr('r', r + ringWidth + 4)
        .attr('fill', 'none')
        .attr('stroke', `url(#${gradId})`)
        .attr('stroke-width', ringWidth + 2)
        .attr('stroke-linecap', 'round')
        .attr('stroke-dasharray', circumference)
        .attr('stroke-dashoffset', circumference)
        .attr('filter', 'url(#glow)');

      progressArcsToAnimate.push({
        circle: progressArc,
        targetOffset: progressOffset,
        circumference,
      });

      g.append('circle')
        .attr('class', 'glow-circle')
        .attr('r', r + 2)
        .attr('fill', 'none')
        .attr('stroke', d.color)
        .attr('stroke-width', 2)
        .attr('stroke-opacity', isLocked ? 0.15 : 0.4)
        .attr('filter', 'url(#glow)');

      g.append('circle')
        .attr('class', 'main-circle')
        .attr('r', r)
        .attr('fill', isLocked ? '#3a3a4a' : d.color)
        .attr('fill-opacity', isLocked ? 0.5 : 0.95)
        .attr('stroke', isLocked ? 'rgba(255,255,255,0.1)' : d.color)
        .attr('stroke-width', 2)
        .attr('stroke-opacity', isLocked ? 0.3 : 0.6);

      g.append('ellipse')
        .attr('class', 'inner-shine')
        .attr('cx', -r * 0.3)
        .attr('cy', -r * 0.35)
        .attr('rx', r * 0.35)
        .attr('ry', r * 0.2)
        .attr('fill', 'white')
        .attr('fill-opacity', isLocked ? 0.05 : 0.25);

      const textGroup = g.append('g').attr('class', 'text-group');

      textGroup
        .append('text')
        .attr('class', 'node-name')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('fill', '#ffffff')
        .attr('font-size', r > 40 ? 13 : r > 30 ? 11 : 9)
        .attr('font-weight', 700)
        .attr('pointer-events', 'none')
        .text(d.name.length > 6 ? d.name.slice(0, 5) + '…' : d.name)
        .style('text-shadow', '0 1px 4px rgba(0,0,0,0.6)');

      if (r > 45) {
        textGroup
          .append('text')
          .attr('class', 'node-prof')
          .attr('text-anchor', 'middle')
          .attr('dy', '2.2em')
          .attr('fill', 'rgba(255,255,255,0.8)')
          .attr('font-size', 10)
          .attr('font-weight', 600)
          .attr('pointer-events', 'none')
          .text(`${d.proficiency}%`);
      }

      const lockIcon = g
        .append('g')
        .attr('class', 'lock-icon')
        .attr('transform', `translate(${r * 0.5}, ${-r * 0.5})`);
      if (isLocked) {
        lockIcon.append('circle').attr('r', 10).attr('fill', '#666').attr('fill-opacity', 0.9);
        lockIcon
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '0.35em')
          .attr('font-size', 10)
          .attr('fill', '#fff')
          .text('🔒');
      }
    });

    setTimeout(() => {
      progressArcsToAnimate.forEach(({ circle, targetOffset }) => {
        circle
          .transition()
          .duration(800)
          .ease(d3.easeCubicOut)
          .attrTween('stroke-dashoffset', function () {
            const self = this as SVGCircleElement;
            const current = parseFloat(self.getAttribute('stroke-dashoffset') || '0');
            const i = d3.interpolateNumber(current, targetOffset);
            return (t: number) => String(i(t));
          });
      });
    }, 200);

    const drag = d3
      .drag<SVGGElement, D3Node>()
      .on('start', function (event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        d3.select(this).attr('cursor', 'grabbing');
        d3.select(this)
          .select('.main-circle')
          .transition()
          .duration(200)
          .ease(d3.easeBackOut.overshoot(1.5))
          .attr('r', getNodeRadius(d.proficiency) * 1.1);
      })
      .on('drag', function (event, d) {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', function (event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
        d3.select(this).attr('cursor', 'grab');
        d3.select(this)
          .select('.main-circle')
          .transition()
          .duration(300)
          .ease(d3.easeCubicOut)
          .attr('r', getNodeRadius(d.proficiency));

        const updatedNodes = d3Nodes.map((n) => ({
          id: n.id,
          name: n.name,
          description: n.description,
          proficiency: n.proficiency,
          color: n.color,
          hue: n.hue,
          category: n.category,
          x: n.x,
          y: n.y,
          parentId: n.parentId,
        }));
        onNodesChange(updatedNodes);
      });

    nodeSelection
      .call(drag)
      .on('mouseenter', function (event, d) {
        const r = getNodeRadius(d.proficiency);
        const el = d3.select(this);
        el.select('.main-circle')
          .transition()
          .duration(250)
          .ease(d3.easeBackOut.overshoot(1.3))
          .attr('r', r * 1.2)
          .attr('stroke-opacity', 1);
        el.select('.glow-circle')
          .transition()
          .duration(250)
          .attr('stroke-opacity', 0.9)
          .attr('r', r * 1.25 + 4);
        el.select('.progress-ring-container')
          .transition()
          .duration(250)
          .style('transform-origin', 'center')
          .attr('transform', 'scale(1.15)');
        el.select('.text-group')
          .transition()
          .duration(250)
          .attr('transform', 'scale(1.1)');

        const [svgX, svgY] = d3.pointer(event, svgRef.current);
        setHoveredNode({
          node: d,
          x: svgX,
          y: svgY,
        });
      })
      .on('mouseleave', function (_event, d) {
        const r = getNodeRadius(d.proficiency);
        const el = d3.select(this);
        el.select('.main-circle')
          .transition()
          .duration(250)
          .ease(d3.easeCubicOut)
          .attr('r', r)
          .attr('stroke-opacity', 0.6);
        el.select('.glow-circle')
          .transition()
          .duration(250)
          .attr('stroke-opacity', 0.4)
          .attr('r', r + 2);
        el.select('.progress-ring-container')
          .transition()
          .duration(250)
          .attr('transform', 'scale(1)');
        el.select('.text-group')
          .transition()
          .duration(250)
          .attr('transform', 'scale(1)');

        setHoveredNode(null);
      })
      .on('mousedown', function (event, d) {
        if (event.button !== 0) return;
        connectingRef.current = { fromId: d.id, tempLine: null };
      })
      .on('mouseup', function (event, d) {
        if (!connectingRef.current) return;
        const fromId = connectingRef.current.fromId;
        if (connectingRef.current.tempLine) {
          connectingRef.current.tempLine.remove();
        }
        if (fromId !== d.id) {
          const exists = links.some(
            (l) =>
              (typeof l.source === 'string' ? l.source : l.source.id) === fromId &&
              (typeof l.target === 'string' ? l.target : l.target.id) === d.id
          );
          if (!exists) {
            const newLink: SkillLink = {
              id: `m-${Date.now()}`,
              source: fromId,
              target: d.id,
              type: 'manual',
            };
            onLinksChange([...links, newLink]);
            const newPulse = new Set(pulsingIds);
            newPulse.add(newLink.id);
            setPulsingIds(newPulse);
            setTimeout(() => {
              setPulsingIds((prev) => {
                const next = new Set(prev);
                next.delete(newLink.id);
                return next;
              });
            }, 1000);
          }
        }
        connectingRef.current = null;
      });

    svg.on('mousemove', function (event) {
      if (!connectingRef.current) return;
      const [x, y] = d3.pointer(event, container.node() as Element);
      const fromNode = d3Nodes.find((n) => n.id === connectingRef.current!.fromId);
      if (!fromNode) return;

      if (!connectingRef.current.tempLine) {
        connectingRef.current.tempLine = tempLineGroup
          .append('line')
          .attr('stroke', '#ffd93d')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '5,5')
          .attr('stroke-opacity', 0.8)
          .attr('pointer-events', 'none')
          .attr('filter', 'url(#glow)')
          .node() as SVGLineElement;
      }

      if (connectingRef.current.tempLine) {
        d3.select(connectingRef.current.tempLine)
          .attr('x1', fromNode.x ?? 0)
          .attr('y1', fromNode.y ?? 0)
          .attr('x2', x)
          .attr('y2', y);
      }
    });

    svg.on('mouseup', function () {
      if (connectingRef.current) {
        if (connectingRef.current.tempLine) {
          connectingRef.current.tempLine.remove();
        }
        connectingRef.current = null;
      }
    });

    simulation.on('tick', () => {
      linkElementsWithEnter
        .attr('x1', (d) => (typeof d.source === 'object' ? d.source.x ?? 0 : 0))
        .attr('y1', (d) => (typeof d.source === 'object' ? d.source.y ?? 0 : 0))
        .attr('x2', (d) => (typeof d.target === 'object' ? d.target.x ?? 0 : 0))
        .attr('y2', (d) => (typeof d.target === 'object' ? d.target.y ?? 0 : 0));

      linkLabels
        .attr('x', (d) => {
          const sx = typeof d.source === 'object' ? d.source.x ?? 0 : 0;
          const tx = typeof d.target === 'object' ? d.target.x ?? 0 : 0;
          return (sx + tx) / 2;
        })
        .attr('y', (d) => {
          const sy = typeof d.source === 'object' ? d.source.y ?? 0 : 0;
          const ty = typeof d.target === 'object' ? d.target.y ?? 0 : 0;
          return (sy + ty) / 2;
        });

      nodeSelection.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    const currentNodeIds = new Set(nodes.map((n) => n.id));
    const newNodeIds = [...currentNodeIds].filter((id) => !prevNodeIdsRef.current.has(id));
    newNodeIds.forEach((id) => {
      const newPulse = new Set(pulsingIds);
      newPulse.add(`node-${id}`);
      setPulsingIds(newPulse);
      setTimeout(() => {
        setPulsingIds((prev) => {
          const next = new Set(prev);
          next.delete(`node-${id}`);
          return next;
        });
      }, 1000);

      nodeSelection
        .filter((d) => d.id === id)
        .select('.main-circle')
        .transition()
        .ease(d3.easeCubicOut)
        .duration(300)
        .attr('r', (d) => getNodeRadius(d.proficiency) * 1.2)
        .transition()
        .duration(300)
        .attr('r', (d) => getNodeRadius(d.proficiency));
    });
    prevNodeIdsRef.current = currentNodeIds;

    const currentLinkIds = new Set(links.map((l) => l.id));
    prevLinkIdsRef.current = currentLinkIds;

    return () => {
      simulation.stop();
    };
  }, [nodes.length, dims.width, dims.height]);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    pulsingIds.forEach((id) => {
      if (id.startsWith('node-')) {
        const nodeId = id.slice(5);
        svg
          .selectAll('.node-group')
          .filter((d: any) => d.id === nodeId)
          .select('.main-circle')
          .transition()
          .ease(d3.easeCubicOut)
          .duration(300)
          .attr('r', (d: any) => getNodeRadius(d.proficiency) * 1.2)
          .transition()
          .duration(300)
          .attr('r', (d: any) => getNodeRadius(d.proficiency));
      }
    });
  }, [pulsingIds]);

  const getDependentNames = (node: SkillNode): string[] => {
    return links
      .filter((l) => {
        const src = typeof l.source === 'string' ? l.source : l.source.id;
        return src === node.id && l.type === 'dependency';
      })
      .map((l) => {
        const tgt = typeof l.target === 'string' ? l.target : l.target.id;
        const targetNode = nodes.find((n) => n.id === tgt);
        return targetNode?.name || tgt;
      });
  };

  const getDependencyNames = (node: SkillNode): string[] => {
    return links
      .filter((l) => {
        const tgt = typeof l.target === 'string' ? l.target : l.target.id;
        return tgt === node.id;
      })
      .map((l) => {
        const src = typeof l.source === 'string' ? l.source : l.source.id;
        const srcNode = nodes.find((n) => n.id === src);
        return `${l.type === 'dependency' ? '依赖' : l.type === 'enhancement' ? '增强' : '关联'}: ${srcNode?.name || src}`;
      });
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background:
          'radial-gradient(ellipse at center, #252547 0%, #1a1a2e 70%, #0f0f1e 100%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }}
      />

      <svg
        ref={svgRef}
        width={dims.width}
        height={dims.height}
        style={{
          display: 'block',
          touchAction: 'none',
        }}
      />

      {hoveredNode && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(hoveredNode.x + 20, dims.width - 260),
            top: Math.min(hoveredNode.y - 10, dims.height - 240),
            minWidth: 240,
            padding: 14,
            borderRadius: 14,
            background: 'rgba(20, 20, 40, 0.92)',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${hoveredNode.node.color}50`,
            boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${hoveredNode.node.color}20`,
            pointerEvents: 'none',
            zIndex: 1000,
            animation: 'tooltipFade 0.3s ease-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: hoveredNode.node.color,
                boxShadow: `0 0 10px ${hoveredNode.node.color}`,
              }}
            />
            <h4
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#fff',
                margin: 0,
              }}
            >
              {hoveredNode.node.name}
            </h4>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 5,
              }}
            >
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>熟练度</span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: hoveredNode.node.color,
                }}
              >
                {hoveredNode.node.proficiency}%
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: 6,
                borderRadius: 3,
                background: 'rgba(255,255,255,0.08)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${hoveredNode.node.proficiency}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${hoveredNode.node.color}, ${hoveredNode.node.color}80)`,
                  borderRadius: 3,
                  transition: 'width 0.5s ease-out',
                }}
              />
            </div>
          </div>

          {hoveredNode.node.description && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 3 }}>
                描述
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
                {hoveredNode.node.description}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <span
              style={{
                padding: '3px 8px',
                borderRadius: 6,
                background: `${hoveredNode.node.color}20`,
                border: `1px solid ${hoveredNode.node.color}40`,
                fontSize: 10,
                color: hoveredNode.node.color,
                fontWeight: 600,
              }}
            >
              {hoveredNode.node.category}
            </span>
          </div>

          {getDependencyNames(hoveredNode.node).length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>
                前置关系
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {getDependencyNames(hoveredNode.node).map((name, i) => (
                  <span
                    key={i}
                    style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', paddingLeft: 6 }}
                  >
                    • {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {getDependentNames(hoveredNode.node).length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>
                解锁技能
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {getDependentNames(hoveredNode.node).map((name, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 10,
                      color: '#fff',
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'rgba(255,255,255,0.08)',
                    }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          padding: '10px 14px',
          borderRadius: 12,
          background: 'rgba(20, 20, 40, 0.7)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: 11,
          color: 'rgba(255,255,255,0.55)',
          lineHeight: 1.7,
        }}
      >
        <div><span style={{ color: '#e94560' }}>━━</span> 依赖关系 (实线箭头)</div>
        <div><span style={{ color: '#4ecdc4' }}>╌╌</span> 增强关系 (虚线)</div>
        <div><span style={{ color: '#ffd93d' }}>╌╌</span> 手动关联 (拖线创建/右键删除)</div>
        <div style={{ marginTop: 4, color: 'rgba(255,255,255,0.4)' }}>
          🖱️ 拖拽排列 · 滚轮缩放 · 拖节点创建连线
        </div>
      </div>

      <style>{`
        @keyframes tooltipFade {
          from { opacity: 0; transform: translateY(6px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        }
        input[type=range]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.15);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.25);
        }
      `}</style>
    </div>
  );
};

export default SkillCanvas;
