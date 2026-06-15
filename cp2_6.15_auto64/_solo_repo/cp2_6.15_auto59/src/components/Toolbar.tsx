import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useMindMapStore, MindMapNode } from '../store';

const PRESET_COLORS = ['#e91e63', '#2196f3', '#4caf50', '#ff9800', '#9c27b0'];

interface ToolbarProps {
  onToggleNav: () => void;
  onToggleNote: () => void;
  isMobile: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({ onToggleNav, onToggleNote, isMobile }) => {
  const nodes = useMindMapStore(s => s.nodes);
  const selectedNodeIds = useMindMapStore(s => s.selectedNodeIds);
  const selectedNodeId = useMindMapStore(s => s.selectedNodeId);
  const createNode = useMindMapStore(s => s.createNode);
  const deleteNode = useMindMapStore(s => s.deleteNode);
  const updateNode = useMindMapStore(s => s.updateNode);
  const search = useMindMapStore(s => s.search);
  const searchResults = useMindMapStore(s => s.searchResults);
  const searchQuery = useMindMapStore(s => s.searchQuery);
  const alignNodes = useMindMapStore(s => s.alignNodes);

  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  const handleAddNode = useCallback(() => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    createNode(null, cx, cy);
  }, [createNode]);

  const handleDelete = useCallback(() => {
    selectedNodeIds.forEach(id => deleteNode(id));
  }, [selectedNodeIds, deleteNode]);

  const handleToggleBold = useCallback(() => {
    if (!selectedNodeId) return;
    const node = nodes.find(n => n.id === selectedNodeId);
    if (!node) return;
    updateNode({ id: selectedNodeId, style: { ...node.style, bold: !node.style.bold } });
  }, [selectedNodeId, nodes, updateNode]);

  const handleColorMark = useCallback((color: string) => {
    if (!selectedNodeId) return;
    const node = nodes.find(n => n.id === selectedNodeId);
    if (!node) return;
    updateNode({ id: selectedNodeId, style: { ...node.style, colorMark: node.style.colorMark === color ? null : color } });
  }, [selectedNodeId, nodes, updateNode]);

  const handleExportPNG = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'mindmap.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (val.trim()) {
      setShowSearch(true);
      searchTimerRef.current = setTimeout(() => {
        search(val);
      }, 300);
    } else {
      setShowSearch(false);
      search('');
    }
  }, [search]);

  const getNodePath = useCallback((node: MindMapNode): string => {
    const path: string[] = [node.text || '未命名'];
    let current = node;
    while (current.parentId) {
      const parent = nodes.find(n => n.id === current.parentId);
      if (!parent) break;
      path.unshift(parent.text || '未命名');
      current = parent;
    }
    return path.join(' >> ');
  }, [nodes]);

  const handleSelectSearchResult = useCallback((nodeId: string) => {
    useMindMapStore.getState().selectNode(nodeId);
    setShowSearch(false);
  }, []);

  return (
    <div className="toolbar">
      {isMobile && (
        <button className="toolbar-btn" onClick={onToggleNav}>☰</button>
      )}

      <button className="toolbar-btn primary" onClick={handleAddNode}>
        <span>+</span> 添加节点
      </button>

      <button
        className="toolbar-btn danger"
        onClick={handleDelete}
        disabled={selectedNodeIds.length === 0}
        style={{ opacity: selectedNodeIds.length === 0 ? 0.5 : 1 }}
      >
        删除
      </button>

      <button className="toolbar-btn" onClick={() => useMindMapStore.getState().loadNodes()}>
        保存
      </button>

      <button className="toolbar-btn" onClick={handleExportPNG}>
        导出PNG
      </button>

      {selectedNode && (
        <>
          <div style={{ width: 1, height: 24, background: '#e0e0e0', margin: '0 4px' }} />

          <button
            className={`toolbar-btn ${selectedNode.style.bold ? 'active' : ''}`}
            onClick={handleToggleBold}
          >
            <strong>B</strong>
          </button>

          <div className="color-selector">
            {PRESET_COLORS.map(color => (
              <div
                key={color}
                className={`color-dot ${selectedNode.style.colorMark === color ? 'active' : ''}`}
                style={{ background: color }}
                onClick={() => handleColorMark(color)}
              />
            ))}
          </div>
        </>
      )}

      {selectedNodeIds.length >= 2 && (
        <>
          <div style={{ width: 1, height: 24, background: '#e0e0e0', margin: '0 4px' }} />
          <div className="align-buttons">
            <button className="toolbar-btn" onClick={() => alignNodes('left')}>左对齐</button>
            <button className="toolbar-btn" onClick={() => alignNodes('right')}>右对齐</button>
            <button className="toolbar-btn" onClick={() => alignNodes('center')}>垂直居中</button>
          </div>
        </>
      )}

      <button className="toolbar-btn" onClick={onToggleNote}>
        笔记
      </button>

      <div className="search-container">
        <input
          className="search-input"
          type="text"
          value={query}
          onChange={handleSearchChange}
          onFocus={() => query.trim() && setShowSearch(true)}
          onBlur={() => setTimeout(() => setShowSearch(false), 200)}
          placeholder="搜索节点或笔记..."
        />
        <span className="search-icon">🔍</span>
        {showSearch && searchResults && (
          <div className="search-results">
            {searchResults.nodes.slice(0, 10).map((node: MindMapNode) => (
              <div
                key={node.id}
                className="search-result-item"
                onMouseDown={() => handleSelectSearchResult(node.id)}
              >
                <div className="path">{getNodePath(node)}</div>
                <div className="preview">{node.text}</div>
              </div>
            ))}
            {searchResults.notes.slice(0, 5).map((note: any) => (
              <div
                key={note.id}
                className="search-result-item"
              >
                <div className="path">笔记: {note.title || '无标题'}</div>
                <div className="preview">{(note.content || '').replace(/<[^>]*>/g, '').slice(0, 50)}</div>
              </div>
            ))}
            {searchResults.nodes.length === 0 && searchResults.notes.length === 0 && (
              <div style={{ padding: 12, color: '#999', textAlign: 'center', fontSize: 13 }}>无搜索结果</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Toolbar;
