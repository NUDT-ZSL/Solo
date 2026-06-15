import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { SkillNode, NodeStatus } from './nodeData';
import {
  buildSkillTree,
  recalcLayout,
  countNodes,
  countByStatus,
  unlockChildren,
  findNodeById,
  flattenTree,
  collectEdges,
} from './nodeData';
import { NodePanel } from './nodePanel';

const NODE_W = 160;
const NODE_H = 80;
const PAD = 60;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const cx = (x1 + x2) / 2;
  return `M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`;
}

function edgeStatus(parent: SkillNode, child: SkillNode): string {
  if (parent.status === 'completed' && child.status === 'completed') return 'completed';
  if (parent.status === 'completed' && child.status === 'active') return 'active';
  if (parent.status === 'completed' && child.status === 'failed') return 'active';
  return '';
}

export const SkillTree: React.FC = () => {
  const [root, setRoot] = useState<SkillNode>(() => buildSkillTree());
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 80, y: 0 });
  const [barrageKey, setBarrageKey] = useState(0);
  const [pulseNodeId, setPulseNodeId] = useState<string | null>(null);
  const [shakeNodeId, setShakeNodeId] = useState<string | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  const totalNodes = countNodes(root);
  const completedNodes = countByStatus(root, 'completed');
  const progressPercent = totalNodes > 0 ? (completedNodes / totalNodes) * 100 : 0;

  const triggerBarrage = useCallback(() => {
    setBarrageKey((k) => k + 1);
  }, []);

  const handleNodeClick = useCallback(
    (node: SkillNode) => {
      if (node.status === 'locked') return;
      setSelectedNode(node);
    },
    []
  );

  const handleToggleExpand = useCallback(
    (e: React.MouseEvent, node: SkillNode) => {
      e.stopPropagation();
      const newRoot = { ...root };
      const target = findNodeById(newRoot, node.id);
      if (!target || target.children.length === 0) return;
      target.expanded = !target.expanded;
      recalcLayout(newRoot);
      setRoot(newRoot);
    },
    [root]
  );

  const handleSubmit = useCallback(
    (nodeId: string, passed: boolean) => {
      const newRoot = { ...root };
      const target = findNodeById(newRoot, nodeId);
      if (!target) return;

      if (passed) {
        target.status = 'completed';
        unlockChildren(target);
        setPulseNodeId(nodeId);
        setTimeout(() => setPulseNodeId(null), 800);
        triggerBarrage();
      } else {
        target.status = 'failed';
        setShakeNodeId(nodeId);
        setTimeout(() => {
          setShakeNodeId(null);
          const revertRoot = { ...root };
          const revertTarget = findNodeById(revertRoot, nodeId);
          if (revertTarget && revertTarget.status === 'failed') {
            revertTarget.status = 'active';
            setRoot(revertRoot);
          }
        }, 500);
      }

      recalcLayout(newRoot);
      setRoot(newRoot);
      setSelectedNode(null);
    },
    [root, triggerBarrage]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)));
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('.skill-node') || (e.target as HTMLElement).closest('.node-toggle')) return;
      isDragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY };
      panStart.current = { ...pan };
    },
    [pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPan({
        x: panStart.current.x + dx,
        y: panStart.current.y + dy,
      });
    },
    []
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const nodes = flattenTree(root);
    if (nodes.length === 0) return;
    const minX = Math.min(...nodes.map((n) => n.x));
    const maxX = Math.max(...nodes.map((n) => n.x)) + NODE_W;
    const minY = Math.min(...nodes.map((n) => n.y));
    const maxY = Math.max(...nodes.map((n) => n.y)) + NODE_H;
    const treeW = maxX - minX + PAD * 2;
    const treeH = maxY - minY + PAD * 2;
    const scaleX = rect.width / treeW;
    const scaleY = rect.height / treeH;
    const fitZoom = Math.min(scaleX, scaleY, MAX_ZOOM);
    const clampedZoom = Math.max(MIN_ZOOM, fitZoom);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setZoom(clampedZoom);
    setPan({
      x: rect.width / 2 - cx * clampedZoom,
      y: rect.height / 2 - cy * clampedZoom,
    });
  }, []);

  const nodes = flattenTree(root);
  const edges = collectEdges(root);

  const statusClass = (status: NodeStatus, nodeId: string): string => {
    let cls = status;
    if (status === 'completed' && pulseNodeId === nodeId) cls += ' pulse-success';
    if (status === 'failed' && shakeNodeId === nodeId) cls += ' failed';
    return cls;
  };

  const svgW = Math.max(...nodes.map((n) => n.x)) + NODE_W + PAD * 2;
  const svgH = Math.max(...nodes.map((n) => n.y)) + NODE_H + PAD * 2;

  return (
    <>
      <div className="progress-bar-container">
        <span className="progress-label">闯关进度</span>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <span className="node-count">{completedNodes}/{totalNodes}</span>
        {barrageKey > 0 && (
          <span className="barrage-text" key={barrageKey}>
            🎉 恭喜通关！继续前进吧！
          </span>
        )}
      </div>

      <div
        className="tree-viewport"
        ref={viewportRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="tree-canvas"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          <svg
            className="edge-svg"
            width={svgW}
            height={svgH}
            style={{ left: -PAD, top: -PAD }}
          >
            {edges.map(([parent, child]) => {
              const x1 = parent.x + NODE_W / 2;
              const y1 = parent.y + NODE_H;
              const x2 = child.x + NODE_W / 2;
              const y2 = child.y;
              const es = edgeStatus(parent, child);
              return (
                <path
                  key={`${parent.id}-${child.id}`}
                  d={bezierPath(x1, y1, x2, y2)}
                  className={`edge-path ${es}`}
                />
              );
            })}
          </svg>

          {nodes.map((node) => (
            <div
              key={node.id}
              className={`skill-node ${statusClass(node.status, node.id)}`}
              style={{
                left: node.x,
                top: node.y,
                width: NODE_W,
              }}
              onClick={() => handleNodeClick(node)}
            >
              <div className="node-header">
                <span className={`node-status-dot ${node.status}`} />
                <span className="node-title">{node.title}</span>
              </div>
              <div className="node-desc">{node.description}</div>
              {node.children.length > 0 && (
                <div
                  className={`node-toggle ${node.expanded ? '' : 'collapsed'}`}
                  onClick={(e) => handleToggleExpand(e, node)}
                >
                  ▼
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="zoom-controls">
          <button className="zoom-btn" onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 0.1))}>+</button>
          <button className="zoom-btn" onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 0.1))}>−</button>
          <button className="zoom-btn" onClick={() => setZoom(1)}>⤓</button>
        </div>
        <div className="zoom-indicator">{Math.round(zoom * 100)}%</div>
      </div>

      {selectedNode && (
        <NodePanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
};
