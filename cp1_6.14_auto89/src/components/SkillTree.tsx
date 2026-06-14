import React, { useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import type { SkillNode, MasteryLevel } from '../types';

interface FlatNode {
  id: string;
  name: string;
  description: string;
  level: MasteryLevel;
  estimatedHours: number;
  depth: number;
  hasChildren: boolean;
  parentId: string | null;
  prerequisites: string[];
}

interface SkillTreeProps {
  nodes: SkillNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string) => void;
}

const LEVEL_COLORS: Record<MasteryLevel, string> = {
  unlearned: '#e0e0e0',
  learning: '#64b5f6',
  mastered: '#81c784',
};

const LEVEL_LABELS: Record<MasteryLevel, string> = {
  unlearned: '未学习',
  learning: '学习中',
  mastered: '已掌握',
};

const flattenTree = (nodes: SkillNode[], nodeMap: Map<string, SkillNode>): FlatNode[] => {
  const result: FlatNode[] = [];
  const topLevel = nodes.filter(n => !n.parentId);

  const traverse = (node: SkillNode, depth: number) => {
    result.push({
      id: node.id,
      name: node.name,
      description: node.description,
      level: node.level,
      estimatedHours: node.estimatedHours,
      depth,
      hasChildren: node.childrenIds.length > 0,
      parentId: node.parentId,
      prerequisites: node.prerequisites,
    });
    for (const childId of node.childrenIds) {
      const child = nodeMap.get(childId);
      if (child) traverse(child, depth + 1);
    }
  };

  for (const node of topLevel) {
    traverse(node, 0);
  }

  return result;
};

const DependencyArrows: React.FC<{ nodes: SkillNode[]; nodeMap: Map<string, SkillNode> }> = ({ nodes, nodeMap }) => {
  const edges = useMemo(() => {
    const deps: { from: SkillNode; to: SkillNode }[] = [];
    for (const node of nodes) {
      for (const preId of node.prerequisites) {
        const preNode = nodeMap.get(preId);
        if (preNode) deps.push({ from: preNode, to: node });
      }
    }
    return deps;
  }, [nodes, nodeMap]);

  if (edges.length === 0) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="8"
          markerHeight="6"
          refX="8"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 8 3, 0 6" fill="#90a4ae" />
        </marker>
      </defs>
      {edges.map((edge, idx) => (
        <line
          key={`dep-${edge.from.id}-${edge.to.id}-${idx}`}
          x1="0"
          y1="0"
          x2="0"
          y2="0"
          stroke="#90a4ae"
          strokeWidth={2}
          markerEnd="url(#arrowhead)"
          className="dep-arrow"
          data-from={edge.from.id}
          data-to={edge.to.id}
        />
      ))}
    </svg>
  );
};

const SkillTree: React.FC<SkillTreeProps> = ({ nodes, selectedId, onSelect, onAddChild }) => {
  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
  const flatNodes = useMemo(() => flattenTree(nodes, nodeMap), [nodes, nodeMap]);

  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const node = flatNodes[index];
      const isSelected = node.id === selectedId;
      const levelColor = LEVEL_COLORS[node.level];
      const indent = node.depth * 24;

      return (
        <div style={style}>
          <div
            onClick={() => onSelect(node.id)}
            style={{
              marginLeft: indent + 8,
              marginRight: 8,
              marginBottom: 4,
              padding: '8px 12px',
              background: isSelected ? '#e3f2fd' : '#fff',
              borderRadius: 8,
              boxShadow: isSelected
                ? '0 2px 8px rgba(0,0,0,0.15)'
                : '0 1px 3px rgba(0,0,0,0.12)',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              borderLeft: `4px solid ${levelColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.18)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = isSelected
                ? '0 2px 8px rgba(0,0,0,0.15)'
                : '0 1px 3px rgba(0,0,0,0.12)';
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: levelColor,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontWeight: isSelected ? 600 : 500,
                    fontSize: 14,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {node.name}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: '#78909c',
                    background: levelColor + '33',
                    padding: '1px 6px',
                    borderRadius: 4,
                    flexShrink: 0,
                  }}
                >
                  {LEVEL_LABELS[node.level]}
                </span>
              </div>
              {node.description && (
                <div
                  style={{
                    fontSize: 12,
                    color: '#90a4ae',
                    marginTop: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {node.description}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              {node.estimatedHours > 0 && (
                <span style={{ fontSize: 11, color: '#78909c' }}>
                  {node.estimatedHours}h
                </span>
              )}
              {node.prerequisites.length > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    background: '#eceff1',
                    color: '#546e7a',
                    padding: '1px 5px',
                    borderRadius: 4,
                  }}
                >
                  ←{node.prerequisites.length}
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddChild(node.id);
                }}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 4,
                  border: '1px solid #cfd8dc',
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#546e7a',
                  lineHeight: 1,
                  flexShrink: 0,
                }}
                title="添加子技能"
              >
                +
              </button>
            </div>
          </div>
        </div>
      );
    },
    [flatNodes, selectedId, onSelect, onAddChild]
  );

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <DependencyArrows nodes={nodes} nodeMap={nodeMap} />
      {flatNodes.length === 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#90a4ae',
            fontSize: 14,
            textAlign: 'center',
            padding: 32,
          }}
        >
          <div>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
            <div>还没有技能节点</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>在右侧面板添加你的第一个技能领域</div>
          </div>
        </div>
      ) : (
        <List
          height={window.innerHeight - 64 - 48}
          itemCount={flatNodes.length}
          itemSize={60}
          width="100%"
          overscanCount={10}
        >
          {Row}
        </List>
      )}
    </div>
  );
};

export default SkillTree;
