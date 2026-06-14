import React, { useMemo } from 'react';
import { StackFrame, TreeNodeProps } from '../types';

const ChevronIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ transformOrigin: 'center' }}
  >
    <polyline points="6,4 10,8 6,12" />
  </svg>
);

const ErrorIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 16 16"
    fill="currentColor"
    style={{ transformOrigin: 'center' }}
  >
    <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm1 13H7v-2h2v2zm0-4H7V5h2v4z" />
  </svg>
);

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  level,
  selectedId,
  expandedIds,
  errorFrameId,
  onToggle,
  onSelect,
}) => {
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.id;
  const isError = node.id === errorFrameId;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      onToggle(node.id);
    }
    onSelect(node);
  };

  return (
    <div className="call-tree-node">
      <div
        className={`tree-node-content ${isSelected ? 'selected' : ''}`}
        onClick={handleClick}
      >
        <span
          className={`expand-icon ${isExpanded ? 'expanded' : ''} ${!hasChildren ? 'leaf' : ''}`}
        >
          <ChevronIcon />
        </span>
        {isError && (
          <span className="error-icon">
            <ErrorIcon />
          </span>
        )}
        <span className="node-function">{node.functionName}</span>
        <span className="node-location">
          {node.fileName.split('/').pop()}:{node.lineNumber}:{node.columnNumber}
        </span>
      </div>
      {hasChildren && isExpanded && (
        <div className="tree-children">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              errorFrameId={errorFrameId}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface CallTreeProps {
  tree: StackFrame[];
  selectedId: string | null;
  expandedIds: Set<string>;
  errorFrameId?: string;
  onToggle: (id: string) => void;
  onSelect: (node: StackFrame) => void;
}

const CallTree: React.FC<CallTreeProps> = ({
  tree,
  selectedId,
  expandedIds,
  errorFrameId,
  onToggle,
  onSelect,
}) => {
  const memoizedTree = useMemo(() => tree, [tree]);

  if (memoizedTree.length === 0) {
    return (
      <div className="call-tree-panel">
        <div className="empty-state">
          <div className="empty-state-icon">🌲</div>
          <div className="empty-state-text">解析堆栈后将显示调用树</div>
        </div>
      </div>
    );
  }

  return (
    <div className="call-tree-panel">
      {memoizedTree.map((root) => (
        <TreeNode
          key={root.id}
          node={root}
          level={0}
          selectedId={selectedId}
          expandedIds={expandedIds}
          errorFrameId={errorFrameId}
          onToggle={onToggle}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};

export default CallTree;
