import React, { useState, useCallback, useEffect } from 'react';
import { NodeData, NodeType, NODE_COLORS } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import styles from './ControlPanel.module.css';

interface ControlPanelProps {
  selectedNode: NodeData | null;
  onNodeSelect: (node: NodeData | null) => void;
  searchFilter: string;
  onSearchChange: (value: string) => void;
  hiddenTypes: NodeType[];
  onHiddenTypesChange: (types: NodeType[]) => void;
  onResetLayout: () => void;
  onFocusNode: () => void;
  connectionCount: number;
}

const NodeIcon: React.FC = () => (
  <svg
    className={styles.logo}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="24" cy="12" r="6" fill="#6366f1" />
    <circle cx="10" cy="36" r="6" fill="#f59e0b" />
    <circle cx="38" cy="36" r="6" fill="#22c55e" />
    <line
      x1="24"
      y1="18"
      x2="12"
      y2="30"
      stroke="#6366f1"
      strokeWidth="2"
      opacity="0.6"
    />
    <line
      x1="24"
      y1="18"
      x2="36"
      y2="30"
      stroke="#22c55e"
      strokeWidth="2"
      opacity="0.6"
    />
    <line
      x1="16"
      y1="36"
      x2="32"
      y2="36"
      stroke="#f59e0b"
      strokeWidth="2"
      opacity="0.6"
    />
  </svg>
);

const ControlPanel: React.FC<ControlPanelProps> = ({
  selectedNode,
  onNodeSelect,
  searchFilter,
  onSearchChange,
  hiddenTypes,
  onHiddenTypesChange,
  onResetLayout,
  onFocusNode,
  connectionCount
}) => {
  const [searchInput, setSearchInput] = useState(searchFilter);
  const debouncedSearch = useDebounce(searchInput, 300);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    onSearchChange(debouncedSearch);
  }, [debouncedSearch, onSearchChange]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchInput(e.target.value);
    },
    []
  );

  const handleTypeToggle = useCallback(
    (type: NodeType) => {
      onHiddenTypesChange(
        hiddenTypes.includes(type)
          ? hiddenTypes.filter(t => t !== type)
          : [...hiddenTypes, type]
      );
    },
    [hiddenTypes, onHiddenTypesChange]
  );

  const handleResetLayout = useCallback(() => {
    setSearchInput('');
    onSearchChange('');
    onHiddenTypesChange([]);
    onNodeSelect(null);
    onResetLayout();
  }, [onSearchChange, onHiddenTypesChange, onNodeSelect, onResetLayout]);

  const handleFocusClick = useCallback(() => {
    onFocusNode();
  }, [onFocusNode]);

  const handleToggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const typeOptions: { type: NodeType; label: string }[] = [
    { type: 'A', label: 'A 类节点' },
    { type: 'B', label: 'B 类节点' },
    { type: 'C', label: 'C 类节点' }
  ];

  return (
    <>
      <div
        className={`${styles.controlPanel} ${
          isMobile && isExpanded ? styles.expanded : ''
        } ${isMobile ? styles.mobile : ''}`}
      >
        <div className={styles.header}>
          <NodeIcon />
          <h1 className={styles.title}>FlowViz</h1>
          {isMobile && (
            <button
              className={styles.expandButton}
              onClick={handleToggleExpand}
              aria-label={isExpanded ? '收起' : '展开'}
            >
              {isExpanded ? '↓' : '↑'}
            </button>
          )}
        </div>

        <div className={styles.content}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>搜索</h3>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="搜索节点名称"
              value={searchInput}
              onChange={handleSearchChange}
            />
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>节点类型过滤</h3>
            <div className={styles.filterOptions}>
              {typeOptions.map(({ type, label }) => (
                <label key={type} className={styles.filterCheckbox}>
                  <input
                    type="checkbox"
                    checked={!hiddenTypes.includes(type)}
                    onChange={() => handleTypeToggle(type)}
                  />
                  <span
                    className={`${styles.typeDot} ${
                      styles[`typeDot${type}`]
                    }`}
                  />
                  <span className={styles.typeLabel}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <button
              className={styles.resetButton}
              onClick={handleResetLayout}
            >
              重置布局
            </button>
          </div>

          <div className={styles.detailsPanel}>
            <h3 className={styles.sectionTitle}>节点详情</h3>
            {selectedNode ? (
              <>
                <h4 className={styles.nodeName}>{selectedNode.name}</h4>
                <div className={styles.nodeType}>
                  <span
                    className={`${styles.typeDot} ${
                      styles[`typeDot${selectedNode.type}`]
                    }`}
                  />
                  <span>类型 {selectedNode.type}</span>
                </div>
                <div className={styles.connectionCount}>
                  连接数: <strong>{connectionCount}</strong>
                </div>
                <button
                  className={styles.focusButton}
                  onClick={handleFocusClick}
                >
                  聚焦
                </button>
              </>
            ) : (
              <div className={styles.emptyState}>
                点击场景中的节点查看详情
              </div>
            )}
          </div>
        </div>
      </div>

      {isMobile && !isExpanded && (
        <button
          className={styles.toggleButton}
          onClick={handleToggleExpand}
          aria-label="展开面板"
        >
          ↑
        </button>
      )}
    </>
  );
};

export default ControlPanel;
