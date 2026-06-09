import React, { useState, useEffect } from 'react';
import { SkillNode, hslToHex } from './types';

interface ControlPanelProps {
  nodes: SkillNode[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onAddNode: (node: Omit<SkillNode, 'id' | 'x' | 'y'>) => void;
  onUpdateNode: (id: string, updates: Partial<SkillNode>) => void;
  onDeleteNode: (id: string) => void;
  onSave: () => Promise<void>;
  onLoad: () => Promise<void>;
  isSaving: boolean;
  isLoading: boolean;
  panelCollapsed: boolean;
  onTogglePanel: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  nodes,
  selectedNodeId,
  onSelectNode,
  onAddNode,
  onUpdateNode,
  onDeleteNode,
  onSave,
  onLoad,
  isSaving,
  isLoading,
  panelCollapsed,
  onTogglePanel,
}) => {
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [proficiency, setProficiency] = useState(50);
  const [hue, setHue] = useState(210);
  const [category, setCategory] = useState('学习');
  const [parentId, setParentId] = useState<string | null>(null);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  useEffect(() => {
    if (selectedNode) {
      setFormMode('edit');
      setName(selectedNode.name);
      setDescription(selectedNode.description);
      setProficiency(selectedNode.proficiency);
      setHue(selectedNode.hue);
      setCategory(selectedNode.category);
      setParentId(selectedNode.parentId || null);
    }
  }, [selectedNode]);

  const resetForm = () => {
    setFormMode('add');
    setName('');
    setDescription('');
    setProficiency(50);
    setHue(210);
    setCategory('学习');
    setParentId(null);
    onSelectNode(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const color = hslToHex(hue, 80, 55);

    if (formMode === 'add') {
      onAddNode({
        name: name.trim(),
        description: description.trim(),
        proficiency,
        color,
        hue,
        category: category.trim() || '未分类',
        parentId: parentId || null,
      });
    } else if (selectedNodeId) {
      onUpdateNode(selectedNodeId, {
        name: name.trim(),
        description: description.trim(),
        proficiency,
        color,
        hue,
        category: category.trim() || '未分类',
        parentId: parentId || null,
      });
    }
    resetForm();
  };

  const categories = [...new Set(nodes.map((n) => n.category))];

  if (panelCollapsed) {
    return (
      <button
        onClick={onTogglePanel}
        style={{
          position: 'fixed',
          top: 20,
          left: 20,
          zIndex: 100,
          width: 48,
          height: 48,
          borderRadius: 12,
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          transition: 'all 0.3s ease',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
    );
  }

  return (
    <aside
      style={{
        width: 320,
        height: '100vh',
        flexShrink: 0,
        background: 'rgba(255, 255, 255, 0.04)',
        backdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#fff',
              marginBottom: 4,
            }}
          >
            技能树 · 成长图谱
          </h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            {nodes.length} 个节点 · 可视化追踪
          </p>
        </div>
        <button
          onClick={onTogglePanel}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.7)',
            transition: 'all 0.2s',
          }}
          title="折叠面板"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
        }}
      >
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
              {formMode === 'add' ? '➕ 添加新技能' : '✏️ 编辑技能'}
            </h3>
            {formMode === 'edit' && (
              <button
                onClick={resetForm}
                style={{
                  fontSize: 11,
                  color: '#e94560',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: 6,
                }}
              >
                取消
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.6)',
                  marginBottom: 6,
                }}
              >
                技能名称
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="如：Python、三维建模..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: 13,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.6)',
                  marginBottom: 6,
                }}
              >
                描述
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="技能描述或学习目标..."
                rows={2}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: 13,
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                  熟练度
                </label>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: hslToHex(hue, 80, 65),
                  }}
                >
                  {proficiency}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={proficiency}
                onChange={(e) => setProficiency(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: 6,
                  borderRadius: 3,
                  background: `linear-gradient(to right, ${hslToHex(
                    hue,
                    80,
                    55
                  )} ${proficiency}%, rgba(255,255,255,0.1) ${proficiency}%)`,
                  appearance: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.6)',
                  marginBottom: 6,
                }}
              >
                颜色
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={hue}
                  onChange={(e) => setHue(Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: 18,
                    borderRadius: 9,
                    background:
                      'linear-gradient(to right, hsl(0,80%,55%), hsl(60,80%,55%), hsl(120,80%,55%), hsl(180,80%,55%), hsl(240,80%,55%), hsl(300,80%,55%), hsl(360,80%,55%))',
                    appearance: 'none',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                />
                <div
                  style={{
                    marginTop: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: hslToHex(hue, 80, 55),
                      boxShadow: `0 0 12px ${hslToHex(hue, 80, 55)}80`,
                    }}
                  />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                    HSL({hue}°, 80%, 55%)
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.6)',
                  marginBottom: 6,
                }}
              >
                分类标签
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                list="category-list"
                placeholder="选择或输入分类..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
              <datalist id="category-list">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.6)',
                  marginBottom: 6,
                }}
              >
                父级技能（可选）
              </label>
              <select
                value={parentId || ''}
                onChange={(e) => setParentId(e.target.value || null)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: 13,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="" style={{ background: '#1a1a2e' }}>
                  无（根节点）
                </option>
                {nodes
                  .filter((n) => n.id !== selectedNodeId)
                  .map((n) => (
                    <option key={n.id} value={n.id} style={{ background: '#1a1a2e' }}>
                      {n.name}
                    </option>
                  ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={!name.trim()}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 12,
                background: name.trim()
                  ? `linear-gradient(135deg, ${hslToHex(hue, 80, 55)}, ${hslToHex(
                      (hue + 40) % 360,
                      80,
                      55
                    )})`
                  : 'rgba(255,255,255,0.08)',
                border: 'none',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: name.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                boxShadow: name.trim()
                  ? `0 4px 16px ${hslToHex(hue, 80, 55)}40`
                  : 'none',
              }}
            >
              {formMode === 'add' ? '➕ 添加技能' : '💾 保存修改'}
            </button>
          </form>
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 16,
            padding: 16,
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
              📋 技能列表 ({nodes.length})
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {nodes.length === 0 && (
              <div
                style={{
                  padding: 20,
                  textAlign: 'center',
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                暂无技能，开始添加吧！
              </div>
            )}
            {nodes.map((node) => {
              const isSelected = node.id === selectedNodeId;
              return (
                <div
                  key={node.id}
                  onClick={() => onSelectNode(isSelected ? null : node.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: isSelected
                      ? `${node.color}20`
                      : 'rgba(0,0,0,0.2)',
                    border: `1px solid ${
                      isSelected ? `${node.color}60` : 'rgba(255,255,255,0.06)'
                    }`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: node.color,
                      boxShadow: `0 0 8px ${node.color}80`,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#fff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {node.name}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: 'rgba(255,255,255,0.45)',
                        marginTop: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span>{node.category}</span>
                      <span
                        style={{
                          color: node.color,
                          fontWeight: 600,
                        }}
                      >
                        {node.proficiency}%
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNode(node.id);
                      if (isSelected) resetForm();
                    }}
                    title="删除节点"
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      background: 'rgba(233, 69, 96, 0.15)',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#e94560',
                      fontSize: 14,
                      transition: 'all 0.2s',
                      flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div
        style={{
          padding: '12px 20px 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          gap: 10,
        }}
      >
        <button
          onClick={onLoad}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: 10,
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            cursor: isLoading ? 'progress' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {isLoading ? '加载中...' : '📥 加载'}
        </button>
        <button
          onClick={onSave}
          disabled={isSaving}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: 10,
            background: 'linear-gradient(135deg, #e94560, #ff6b6b)',
            border: 'none',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            cursor: isSaving ? 'progress' : 'pointer',
            boxShadow: '0 4px 16px rgba(233, 69, 96, 0.4)',
            transition: 'all 0.2s',
          }}
        >
          {isSaving ? '保存中...' : '💾 保存图谱'}
        </button>
      </div>
    </aside>
  );
};

export default ControlPanel;
