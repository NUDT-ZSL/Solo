import { useState, useEffect } from 'react';
import type { MindMapNode } from './types';
import { PRESET_COLORS } from './types';

interface Props {
  selectedNode: MindMapNode | null;
  onUpdateNode: (data: Partial<MindMapNode> & { id: string }) => void;
  onDeleteNode: (nodeId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const SidebarRight = ({ selectedNode, onUpdateNode, onDeleteNode, isOpen, onClose }: Props) => {
  const [localContent, setLocalContent] = useState('');
  const [debounced, setDebounced] = useState(false);

  useEffect(() => {
    if (selectedNode) {
      setLocalContent(selectedNode.content);
    }
  }, [selectedNode?.id, selectedNode?.content]);

  useEffect(() => {
    if (!selectedNode || !debounced) return;
    const t = setTimeout(() => {
      onUpdateNode({ id: selectedNode.id, content: localContent });
      setDebounced(false);
    }, 250);
    return () => clearTimeout(t);
  }, [localContent, debounced, selectedNode, onUpdateNode]);

  if (!selectedNode) {
    return (
      <>
        {isOpen && <div className="drawer-overlay mobile-only" onClick={onClose} />}
        <aside className={`sidebar-right ${isOpen ? 'drawer-open' : ''}`}>
          <div className="sidebar-header">
            <h3>⚙️ 节点属性</h3>
            <button className="icon-btn mobile-only" onClick={onClose}>×</button>
          </div>
          <div className="sidebar-content">
            <div className="empty-state">
              <div className="empty-icon">🎯</div>
              <p>未选择节点</p>
              <p className="empty-hint">点击画布上的任意节点以编辑其属性</p>
            </div>
          </div>
        </aside>
      </>
    );
  }

  return (
    <>
      {isOpen && <div className="drawer-overlay mobile-only" onClick={onClose} />}
      <aside className={`sidebar-right ${isOpen ? 'drawer-open' : ''}`}>
        <div className="sidebar-header">
          <h3>⚙️ 节点属性</h3>
          <button className="icon-btn mobile-only" onClick={onClose}>×</button>
        </div>
        <div className="sidebar-content">
          <div className="property-section">
            <label className="property-label">节点内容</label>
            <textarea
              className="content-textarea"
              value={localContent}
              onChange={(e) => {
                setLocalContent(e.target.value);
                setDebounced(true);
              }}
              placeholder="输入节点内容..."
              rows={3}
              maxLength={100}
            />
            <div className="char-count">{localContent.length}/100</div>
          </div>

          <div className="property-section">
            <label className="property-label">主题色</label>
            <div className="color-palette">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  className={`color-swatch ${selectedNode.color === color ? 'active' : ''}`}
                  style={{ background: color }}
                  onClick={() => onUpdateNode({ id: selectedNode.id, color })}
                  title={color}
                >
                  {selectedNode.color === color && <span className="check">✓</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="property-section">
            <label className="property-label">
              边框粗细 <span className="value-tag">{selectedNode.borderWidth}px</span>
            </label>
            <input
              type="range"
              min="1"
              max="4"
              step="1"
              value={selectedNode.borderWidth}
              onChange={(e) =>
                onUpdateNode({ id: selectedNode.id, borderWidth: Number(e.target.value) })
              }
              className="slider-input"
            />
            <div className="slider-marks">
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
            </div>
          </div>

          <div className="property-section">
            <label className="property-label">
              字体大小 <span className="value-tag">{selectedNode.fontSize}px</span>
            </label>
            <input
              type="range"
              min="14"
              max="24"
              step="1"
              value={selectedNode.fontSize}
              onChange={(e) =>
                onUpdateNode({ id: selectedNode.id, fontSize: Number(e.target.value) })
              }
              className="slider-input"
            />
            <div className="slider-marks">
              <span>14</span>
              <span>18</span>
              <span>22</span>
              <span>24</span>
            </div>
          </div>

          <div className="property-section">
            <label className="property-label">预览</label>
            <div className="preview-node" style={{ background: selectedNode.color, borderWidth: selectedNode.borderWidth }}>
              <span style={{ fontSize: selectedNode.fontSize }}>{selectedNode.content || '新想法'}</span>
            </div>
          </div>

          <div className="property-section danger-section">
            <button
              className="delete-node-btn"
              onClick={() => {
                if (window.confirm('确定删除该节点及其相关连线吗？')) {
                  onDeleteNode(selectedNode.id);
                }
              }}
            >
              🗑️ 删除此节点
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default SidebarRight;
