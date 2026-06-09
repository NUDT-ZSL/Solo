import { useEffect, useState } from 'react';
import type { GraphNode, GraphLink } from '../api';

interface Props {
  selectedId: string | null;
  selectedType: 'node' | 'link' | null;
  nodes: GraphNode[];
  links: GraphLink[];
  onUpdateNode: (id: string, data: Partial<GraphNode>) => void;
  onDeleteNode: (id: string) => void;
  onUpdateLink: (id: string, data: Partial<GraphLink>) => void;
  onDeleteLink: (id: string) => void;
  onClose: () => void;
  readonly?: boolean;
}

const NODE_COLORS = ['#e94560', '#0f3460', '#16213e', '#533483', '#e94560', '#00b4a6', '#f59e0b', '#8b5cf6'];

const RELATION_TYPES = ['朋友', '同事', '家人', '同学', '认识', '合作伙伴', '师生', '邻居', '其他'];

const PropertyPanel = ({
  selectedId,
  selectedType,
  nodes,
  links,
  onUpdateNode,
  onDeleteNode,
  onUpdateLink,
  onDeleteLink,
  onClose,
  readonly = false,
}: Props) => {
  const node = selectedType === 'node' ? nodes.find((n) => n.id === selectedId) : undefined;
  const link = selectedType === 'link' ? links.find((l) => l.id === selectedId) : undefined;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#16213e');
  const [size, setSize] = useState(20);

  const [linkType, setLinkType] = useState('');
  const [weight, setWeight] = useState(5);

  useEffect(() => {
    if (node) {
      setName(node.name);
      setDescription(node.description);
      setColor(node.color);
      setSize(node.size);
    }
  }, [node]);

  useEffect(() => {
    if (link) {
      setLinkType(link.type);
      setWeight(link.weight);
    }
  }, [link]);

  const getNodeName = (id: string | GraphNode): string => {
    if (typeof id !== 'string') return id.name;
    const n = nodes.find((x) => x.id === id);
    return n ? n.name : id;
  };

  if (!selectedId || !selectedType) {
    return (
      <div className="property-panel empty">
        <div className="empty-illustration">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <circle cx="25" cy="30" r="12" stroke="#ffaa00" strokeWidth="2" strokeDasharray="4 2" opacity="0.6" />
            <circle cx="55" cy="50" r="10" stroke="#e94560" strokeWidth="2" strokeDasharray="4 2" opacity="0.6" />
            <line x1="33" y1="35" x2="48" y2="46" stroke="#888" strokeWidth="2" strokeDasharray="4 2" opacity="0.5" />
          </svg>
        </div>
        <h3 className="empty-title">选择节点或关系</h3>
        <p className="empty-hint">点击图谱中的节点或连线，查看并编辑其详细属性。</p>
      </div>
    );
  }

  return (
    <div className="property-panel">
      <div className="panel-header">
        <div className="panel-title-row">
          <span className={`type-badge ${selectedType}`}>
            {selectedType === 'node' ? '◉ 节点' : '⟷ 关系'}
          </span>
          {!readonly && (
            <button className="close-btn" onClick={onClose} aria-label="关闭">
              ×
            </button>
          )}
        </div>
        {selectedType === 'node' && node && (
          <h2 className="panel-item-title">{node.name}</h2>
        )}
        {selectedType === 'link' && link && (
          <h2 className="panel-item-title link-title">
            {getNodeName(link.source)}
            <span className="link-arrow">→</span>
            {getNodeName(link.target)}
          </h2>
        )}
      </div>

      <div className="panel-body">
        {selectedType === 'node' && node && (
          <>
            <div className="field-group">
              <label className="field-label">名称</label>
              <input
                className="field-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => !readonly && name !== node.name && onUpdateNode(node.id, { name })}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                disabled={readonly}
              />
            </div>

            <div className="field-group">
              <label className="field-label">描述</label>
              <textarea
                className="field-input textarea"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => !readonly && description !== node.description && onUpdateNode(node.id, { description })}
                disabled={readonly}
                placeholder="添加备注、背景信息..."
              />
            </div>

            <div className="field-group">
              <label className="field-label">节点颜色</label>
              <div className="color-picker">
                {NODE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`color-swatch ${color === c ? 'active' : ''}`}
                    style={{ background: c }}
                    disabled={readonly}
                    onClick={() => {
                      setColor(c);
                      if (!readonly) onUpdateNode(node.id, { color: c });
                    }}
                  />
                ))}
                <input
                  type="color"
                  className="custom-color"
                  value={color}
                  disabled={readonly}
                  onChange={(e) => {
                    setColor(e.target.value);
                    if (!readonly) onUpdateNode(node.id, { color: e.target.value });
                  }}
                />
              </div>
            </div>

            <div className="field-group">
              <div className="field-label-row">
                <label className="field-label">节点大小</label>
                <span className="field-value">{size}px</span>
              </div>
              <input
                type="range"
                min={12}
                max={45}
                value={size}
                disabled={readonly}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setSize(v);
                }}
                onMouseUp={() => !readonly && size !== node.size && onUpdateNode(node.id, { size })}
                onTouchEnd={() => !readonly && size !== node.size && onUpdateNode(node.id, { size })}
                className="range-slider"
              />
            </div>
          </>
        )}

        {selectedType === 'link' && link && (
          <>
            <div className="field-group">
              <label className="field-label">关系类型</label>
              <select
                className="field-input"
                value={linkType}
                disabled={readonly}
                onChange={(e) => {
                  setLinkType(e.target.value);
                  if (!readonly) onUpdateLink(link.id, { type: e.target.value });
                }}
              >
                {RELATION_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input
                type="text"
                className="field-input mt8"
                placeholder="自定义类型..."
                value={linkType}
                disabled={readonly}
                onChange={(e) => setLinkType(e.target.value)}
                onBlur={() => !readonly && linkType !== link.type && onUpdateLink(link.id, { type: linkType })}
              />
            </div>

            <div className="field-group">
              <div className="field-label-row">
                <label className="field-label">权重（亲密度）</label>
                <span className="field-value">{weight}/10</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={weight}
                disabled={readonly}
                onChange={(e) => setWeight(Number(e.target.value))}
                onMouseUp={() => !readonly && weight !== link.weight && onUpdateLink(link.id, { weight })}
                onTouchEnd={() => !readonly && weight !== link.weight && onUpdateLink(link.id, { weight })}
                className="range-slider"
              />
              <div className="weight-bar">
                <div className="weight-fill" style={{ width: `${(weight / 10) * 100}%` }} />
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">连接节点</label>
              <div className="link-nodes">
                <div className="link-node-chip">
                  <span className="chip-dot" style={{ background: nodes.find(n => n.id === (typeof link.source === 'string' ? link.source : link.source.id))?.color || '#888' }} />
                  {getNodeName(link.source)}
                </div>
                <span className="chip-arrow">↔</span>
                <div className="link-node-chip">
                  <span className="chip-dot" style={{ background: nodes.find(n => n.id === (typeof link.target === 'string' ? link.target : link.target.id))?.color || '#888' }} />
                  {getNodeName(link.target)}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {!readonly && (
        <div className="panel-footer">
          <button
            className="danger-btn"
            onClick={() => {
              if (confirm(selectedType === 'node' ? '确定删除此节点？所有关联关系将一并删除。' : '确定删除此关系？')) {
                selectedType === 'node' && selectedId && onDeleteNode(selectedId);
                selectedType === 'link' && selectedId && onDeleteLink(selectedId);
              }
            }}
          >
            {selectedType === 'node' ? '删除节点' : '删除关系'}
          </button>
        </div>
      )}
    </div>
  );
};

export default PropertyPanel;
