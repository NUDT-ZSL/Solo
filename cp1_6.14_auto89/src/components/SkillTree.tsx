import React, { useMemo, useCallback, useState, useEffect, memo } from 'react';
import { FixedSizeList as List, areEqual } from 'react-window';
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
  dependencies: string[];
}

interface SkillTreeProps {
  nodes: SkillNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string) => void;
}

interface ListItemData {
  flatNodes: FlatNode[];
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

const ITEM_SIZE = 60;

const flattenTreeIncremental = (
  nodes: SkillNode[],
  nodeMap: Map<string, SkillNode>,
  startIndex: number,
  count: number
): FlatNode[] => {
  const result: FlatNode[] = [];
  const topLevel = nodes.filter(n => !n.parentId);
  let globalIndex = 0;

  const traverse = (node: SkillNode, depth: number): boolean => {
    if (globalIndex >= startIndex + count) return true;
    if (globalIndex >= startIndex) {
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
        dependencies: node.dependencies,
      });
    }
    globalIndex++;

    for (const childId of node.childrenIds) {
      const child = nodeMap.get(childId);
      if (child) {
        const stop = traverse(child, depth + 1);
        if (stop) return true;
      }
    }
    return false;
  };

  for (const node of topLevel) {
    const stop = traverse(node, 0);
    if (stop) break;
  }

  return result;
};

const getTotalCount = (nodes: SkillNode[], nodeMap: Map<string, SkillNode>): number => {
  let count = 0;
  const topLevel = nodes.filter(n => !n.parentId);
  const traverse = (node: SkillNode) => {
    count++;
    for (const childId of node.childrenIds) {
      const child = nodeMap.get(childId);
      if (child) traverse(child);
    }
  };
  for (const node of topLevel) traverse(node);
  return count;
};

const NodeRow = memo(({
  index,
  style,
  data,
}: {
  index: number;
  style: React.CSSProperties;
  data: ListItemData;
}) => {
  const { flatNodes, selectedId, onSelect, onAddChild } = data;
  const start = index - (index % 1);
  const nodeChunk = useMemo(() => {
    const nodeMap = new Map();
    return flatNodes[index];
  }, [flatNodes, index]);

  if (!nodeChunk) return null;

  const node = nodeChunk;
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
}, areEqual);

NodeRow.displayName = 'NodeRow';

const SkillTree: React.FC<SkillTreeProps> = ({ nodes, selectedId, onSelect, onAddChild }) => {
  const [listHeight, setListHeight] = useState(() => typeof window !== 'undefined' ? window.innerHeight - 64 - 48 : 600);

  useEffect(() => {
    const handleResize = () => {
      setListHeight(window.innerHeight - 64 - 48);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
  const totalCount = useMemo(() => getTotalCount(nodes, nodeMap), [nodes, nodeMap]);
  const flatNodes = useMemo(() => {
    return flattenTreeIncremental(nodes, nodeMap, 0, totalCount);
  }, [nodes, nodeMap, totalCount]);

  const itemData: ListItemData = useMemo(() => ({
    flatNodes,
    selectedId,
    onSelect,
    onAddChild,
  }), [flatNodes, selectedId, onSelect, onAddChild]);

  if (totalCount === 0) {
    return (
      <div style={{ position: 'relative', height: '100%' }}>
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
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <List
        height={listHeight}
        itemCount={totalCount}
        itemSize={ITEM_SIZE}
        width="100%"
        itemData={itemData}
        overscanCount={10}
      >
        {NodeRow}
      </List>
    </div>
  );
};

export default SkillTree;
