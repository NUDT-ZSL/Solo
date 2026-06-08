import React from 'react';

interface Paragraph {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: number;
  updatedAt: number;
  parentId: string | null;
  children: string[];
  history: Array<{ authorId: string; authorName: string; timestamp: number; content: string }>;
}

interface Member {
  id: string;
  name: string;
  avatarColor: string;
  online: boolean;
}

interface TreeViewProps {
  paragraphs: Record<string, Paragraph>;
  nodeId: string;
  depth: number;
  selectedId: string | null;
  expandedNodes: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  members?: Record<string, Member>;
}

const formatTime = (timestamp: number) => {
  const d = new Date(timestamp);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
};

const truncate = (text: string, max: number) => text.length > max ? text.slice(0, max) + '...' : text;

const TreeView: React.FC<TreeViewProps> = ({
  paragraphs,
  nodeId,
  depth,
  selectedId,
  expandedNodes,
  onSelect,
  onToggle,
  members,
}) => {
  const node = paragraphs[nodeId];
  if (!node) return null;

  const isExpanded = expandedNodes.has(nodeId);
  const isSelected = selectedId === nodeId;
  const hasChildren = node.children.length > 0;
  const authorColor = members?.[node.authorId]?.avatarColor || '#888';

  return (
    <div style={{ overflow: 'hidden' }}>
      <div
        onClick={() => onSelect(nodeId)}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          padding: '10px 12px',
          paddingLeft: `${12 + depth * 24}px`,
          background: isSelected ? '#EDF2F7' : 'transparent',
          cursor: 'pointer',
          borderLeft: isSelected ? '3px solid #4ECDC4' : '3px solid transparent',
          transition: 'background 0.15s',
          gap: '8px',
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle(nodeId);
          }}
          style={{
            width: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            cursor: hasChildren ? 'pointer' : 'default',
            padding: 0,
            marginTop: '2px',
            fontSize: '10px',
            color: '#718096',
            flexShrink: 0,
            visibility: hasChildren ? 'visible' : 'hidden',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.25s ease-in-out',
          }}
        >
          ▶
        </button>
        <div
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: authorColor,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: 600,
            flexShrink: 0,
            marginTop: '1px',
          }}
          title={node.authorName}
        >
          {node.authorName.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '13px',
              color: '#2D3748',
              lineHeight: 1.4,
              whiteSpace: 'normal',
              wordBreak: 'break-word',
              fontWeight: isSelected ? 600 : 400,
            }}
          >
            {truncate(node.content, 40)}
          </div>
          <div style={{ fontSize: '11px', color: '#A0AEC0', marginTop: '2px' }}>
            {node.authorName} · {formatTime(node.createdAt)}
          </div>
        </div>
      </div>
      <div
        style={{
          maxHeight: isExpanded ? '5000px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.25s ease-in-out',
        }}
      >
        {node.children.map(childId => (
          <TreeView
            key={childId}
            paragraphs={paragraphs}
            nodeId={childId}
            depth={depth + 1}
            selectedId={selectedId}
            expandedNodes={expandedNodes}
            onSelect={onSelect}
            onToggle={onToggle}
            members={members}
          />
        ))}
      </div>
    </div>
  );
};

export default TreeView;
