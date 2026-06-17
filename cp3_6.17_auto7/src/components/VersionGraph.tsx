import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { RecipeVersion, VersionDiff } from '../types';
import dayjs from 'dayjs';

interface VersionGraphProps {
  versions: RecipeVersion[];
  onDiff: (v1: RecipeVersion, v2: RecipeVersion) => Promise<VersionDiff | null>;
  onSelectVersion?: (version: RecipeVersion) => void;
}

interface GraphNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  version: RecipeVersion;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink {
  source: string;
  target: string;
}

export const VersionGraph: React.FC<VersionGraphProps> = ({ versions, onDiff, onSelectVersion }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [diffResult, setDiffResult] = useState<VersionDiff | null>(null);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const animationRef = useRef<number>();
  const draggingRef = useRef<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

  const getNodeColor = useCallback((version: RecipeVersion) => {
    if (version.isMerge) return '#9c27b0';
    if (version.branch === 'main') return '#4caf50';
    return '#ff9800';
  }, []);

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const rect = svgRef.current.parentElement?.getBoundingClientRect();
        if (rect) {
          setDimensions({ width: rect.width, height: 400 });
        }
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    const versionMap = new Map(versions.map((v) => [v.id, v]));
    const branchMap = new Map<string, number>();
    const sortedVersions = [...versions].sort((a, b) =>
      dayjs(a.timestamp).valueOf() - dayjs(b.timestamp).valueOf()
    );

    const newNodes: GraphNode[] = sortedVersions.map((version, index) => {
      if (!branchMap.has(version.branch)) {
        branchMap.set(version.branch, branchMap.size);
      }
      const branchIndex = branchMap.get(version.branch) || 0;
      return {
        id: version.id,
        x: 100 + index * 80,
        y: 80 + branchIndex * 100,
        vx: 0,
        vy: 0,
        version,
      };
    });

    const newLinks: GraphLink[] = [];
    sortedVersions.forEach((version) => {
      version.parentIds.forEach((parentId) => {
        if (versionMap.has(parentId)) {
          newLinks.push({ source: parentId, target: version.id });
        }
      });
    });

    setNodes(newNodes);
    setLinks(newLinks);
  }, [versions]);

  useEffect(() => {
    if (nodes.length === 0) return;

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const alpha = 0.3;
    const alphaDecay = 0.02;
    const linkDistance = 100;
    const chargeStrength = -200;
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    let currentAlpha = alpha;

    const simulate = () => {
      const newNodes = nodes.map((node) => ({ ...node }));

      newNodes.forEach((node) => {
        if (node.fx !== undefined && node.fx !== null) node.x = node.fx;
        if (node.fy !== undefined && node.fy !== null) node.y = node.fy;
      });

      newNodes.forEach((node, i) => {
        if (node.fx !== undefined && node.fx !== null) return;
        newNodes.forEach((other, j) => {
          if (i === j) return;
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = chargeStrength / (dist * dist);
          node.vx += (dx / dist) * force * currentAlpha;
          node.vy += (dy / dist) * force * currentAlpha;
        });
      });

      links.forEach((link) => {
        const source = nodeMap.get(link.source);
        const target = nodeMap.get(link.target);
        if (!source || !target) return;
        const sourceNode = newNodes.find((n) => n.id === source.id);
        const targetNode = newNodes.find((n) => n.id === target.id);
        if (!sourceNode || !targetNode) return;

        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - linkDistance) * 0.05 * currentAlpha;

        if (sourceNode.fx === undefined || sourceNode.fx === null) {
          sourceNode.vx += (dx / dist) * force;
          sourceNode.vy += (dy / dist) * force;
        }
        if (targetNode.fx === undefined || targetNode.fx === null) {
          targetNode.vx -= (dx / dist) * force;
          targetNode.vy -= (dy / dist) * force;
        }
      });

      newNodes.forEach((node) => {
        if (node.fx === undefined || node.fx === null) {
          node.vx += (centerX - node.x) * 0.005 * currentAlpha;
          node.vy += (centerY - node.y) * 0.005 * currentAlpha;
        }
      });

      newNodes.forEach((node) => {
        if (node.fx === undefined || node.fx === null) {
          node.vx *= 0.9;
          node.vy *= 0.9;
          node.x += node.vx;
          node.y += node.vy;
          node.x = Math.max(40, Math.min(dimensions.width - 40, node.x));
          node.y = Math.max(40, Math.min(dimensions.height - 40, node.y));
        }
      });

      setNodes(newNodes);
      currentAlpha -= alphaDecay;

      if (currentAlpha > 0.001) {
        animationRef.current = requestAnimationFrame(simulate);
      }
    };

    animationRef.current = requestAnimationFrame(simulate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [links.length, dimensions]);

  const handleNodeClick = async (node: GraphNode) => {
    onSelectVersion?.(node.version);

    if (selectedNodes.length === 0) {
      setSelectedNodes([node.id]);
      setDiffResult(null);
    } else if (selectedNodes.length === 1 && selectedNodes[0] !== node.id) {
      const newSelected = [...selectedNodes, node.id];
      setSelectedNodes(newSelected);
      setLoadingDiff(true);

      const v1 = versions.find((v) => v.id === selectedNodes[0]);
      const v2 = versions.find((v) => v.id === node.id);
      if (v1 && v2) {
        const diff = await onDiff(v1, v2);
        setDiffResult(diff);
      }
      setLoadingDiff(false);
    } else {
      setSelectedNodes([node.id]);
      setDiffResult(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    draggingRef.current = nodeId;
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId
          ? { ...n, fx: n.x, fy: n.y }
          : n
      )
    );
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingRef.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setNodes((prev) =>
      prev.map((n) =>
        n.id === draggingRef.current
          ? { ...n, fx: x, fy: y }
          : n
      )
    );
  };

  const handleMouseUp = () => {
    if (draggingRef.current) {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === draggingRef.current
            ? { ...n, fx: null, fy: null }
            : n
        )
      );
      draggingRef.current = null;
    }
  };

  const renderDiff = (changes: { type: string; value: string }[] | undefined, label: string) => {
    if (!changes || changes.length === 0) return null;
    return (
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ color: '#3e2723', marginBottom: '6px', fontSize: '13px' }}>{label}</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px' }}>
          {changes.map((change, idx) => (
            <div
              key={idx}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                backgroundColor:
                  change.type === 'added'
                    ? '#c8e6c9'
                    : change.type === 'removed'
                    ? '#ffcdd2'
                    : 'transparent',
                color:
                  change.type === 'added'
                    ? '#1b5e20'
                    : change.type === 'removed'
                    ? '#b71c1c'
                    : '#5d4037',
                textDecoration: change.type === 'removed' ? 'line-through' : 'none',
              }}
            >
              {change.type === 'added' ? '+' : change.type === 'removed' ? '-' : ' '} {change.value}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ color: '#3e2723', marginBottom: '8px' }}>版本历史图</h3>
        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#5d4037' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#4caf50' }} />
            <span>主分支</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ff9800' }} />
            <span>功能分支</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#9c27b0' }} />
            <span>合并节点</span>
          </div>
        </div>
        {selectedNodes.length > 0 && (
          <p style={{ marginTop: '8px', fontSize: '13px', color: '#8b4513' }}>
            已选择 {selectedNodes.length}/2 个节点。点击两个节点查看差异。
            <button
              onClick={() => { setSelectedNodes([]); setDiffResult(null); }}
              style={{ marginLeft: '8px', padding: '2px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid #d7ccc8', backgroundColor: '#fff', cursor: 'pointer' }}
            >
              清除选择
            </button>
          </p>
        )}
      </div>

      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{ backgroundColor: '#fff8e7', borderRadius: '8px', cursor: 'default' }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#999" />
          </marker>
        </defs>

        {links.map((link, idx) => {
          const source = nodes.find((n) => n.id === link.source);
          const target = nodes.find((n) => n.id === link.target);
          if (!source || !target) return null;

          const midX = (source.x + target.x) / 2;
          const midY = (source.y + target.y) / 2 - 30;

          return (
            <path
              key={idx}
              d={`M ${source.x} ${source.y} Q ${midX} ${midY} ${target.x} ${target.y}`}
              fill="none"
              stroke="#999"
              strokeWidth="1.5"
              markerEnd="url(#arrowhead)"
            />
          );
        })}

        {nodes.map((node) => {
          const isSelected = selectedNodes.includes(node.id);
          return (
            <g
              key={node.id}
              style={{ cursor: 'pointer' }}
              onClick={() => handleNodeClick(node)}
              onMouseDown={(e) => handleMouseDown(e, node.id)}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={isSelected ? 14 : 12}
                fill={getNodeColor(node.version)}
                stroke={isSelected ? '#3e2723' : '#fff'}
                strokeWidth={isSelected ? 3 : 2}
                style={{ transition: 'r 0.15s ease' }}
              />
              <text
                x={node.x}
                y={node.y + 4}
                textAnchor="middle"
                fill="#fff"
                fontSize="10"
                fontWeight="bold"
                pointerEvents="none"
              >
                {node.version.version}
              </text>
              <text
                x={node.x}
                y={node.y + 28}
                textAnchor="middle"
                fill="#5d4037"
                fontSize="10"
                pointerEvents="none"
              >
                {node.version.authorName}
              </text>
              <text
                x={node.x}
                y={node.y + 40}
                textAnchor="middle"
                fill="#8d6e63"
                fontSize="9"
                pointerEvents="none"
              >
                {dayjs(node.version.timestamp).format('MM-DD HH:mm')}
              </text>
            </g>
          );
        })}
      </svg>

      {(diffResult || loadingDiff) && (
        <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #d7ccc8' }}>
          <h4 style={{ color: '#3e2723', marginBottom: '12px' }}>版本差异对比</h4>
          {loadingDiff ? (
            <p style={{ color: '#8d6e63' }}>正在计算差异...</p>
          ) : diffResult ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                {renderDiff(diffResult.ingredients, '食材变更')}
                {renderDiff(diffResult.notes, '备注变更')}
              </div>
              <div>
                {renderDiff(diffResult.steps, '步骤变更')}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
