/**
 * 笔记编辑模态框（磨砂玻璃效果）
 * 右键菜单"添加笔记"触发
 *
 * 设计要点：
 * - 背景: rgba(255,255,255,0.15) + backdrop-filter: blur(10px)
 * - 圆角: 16px
 * - 动画: 缩放淡入
 */

import { useState, useEffect } from 'react';
import { X, FileText, Tag, Check } from 'lucide-react';
import { useGraphStore } from '../store/useGraphStore';
import { TAG_COLORS } from '../../shared/types';

export default function NoteModal() {
  const isOpen = useGraphStore(state => state.isNoteModalOpen);
  const setOpen = useGraphStore(state => state.setNoteModalOpen);
  const selectedNodeId = useGraphStore(state => state.selectedNodeId);
  const nodes = useGraphStore(state => state.nodes);
  const updateNodeNote = useGraphStore(state => state.updateNodeNote);

  const [note, setNote] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  // 初始化数据
  useEffect(() => {
    if (isOpen && selectedNode) {
      setNote(selectedNode.note || '');
      setTags(selectedNode.tags || []);
      setTagInput('');
    }
  }, [isOpen, selectedNode]);

  const handleClose = () => {
    setOpen(false);
  };

  const handleSave = async () => {
    if (!selectedNodeId) return;
    await updateNodeNote(selectedNodeId, note, tags);
    handleClose();
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = tagInput.trim();
      if (trimmed && !tags.includes(trimmed)) {
        setTags([...tags, trimmed]);
      }
      setTagInput('');
    }
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const getTagColor = (index: number) => TAG_COLORS[index % TAG_COLORS.length];

  if (!isOpen) return null;

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(560px, 90vw)',
          maxHeight: '85vh',
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'modalScaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* 头部 */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: `linear-gradient(135deg, ${selectedNode?.color || '#4A90D9'}, #1E3A5F)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={20} color="#fff" />
            </div>
            <div>
              <h2 style={{
                margin: 0,
                color: '#fff',
                fontSize: '18px',
                fontWeight: 600,
                fontFamily: '"Noto Serif SC", serif',
              }}>
                编辑节点笔记
              </h2>
              <p style={{
                margin: '2px 0 0',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '12px',
                fontFamily: '"Noto Sans SC", sans-serif',
              }}>
                {selectedNode?.word}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              width: '32px',
              height: '32px',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '8px',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,107,107,0.2)';
              e.currentTarget.style.color = '#FF6B6B';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 内容区 */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}>
          {/* 标签区 */}
          <div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '13px',
              fontWeight: 500,
              marginBottom: '10px',
              fontFamily: '"Noto Sans SC", sans-serif',
            }}>
              <Tag size={14} />
              标签（回车或逗号添加）
            </label>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              minHeight: '42px',
            }}>
              {tags.map((tag, index) => (
                <span
                  key={index}
                  style={{
                    padding: '4px 10px 4px 12px',
                    background: `${getTagColor(index)}30`,
                    border: `1px solid ${getTagColor(index)}`,
                    borderRadius: '14px',
                    fontSize: '12px',
                    color: getTagColor(index),
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontFamily: '"Noto Sans SC", sans-serif',
                  }}
                >
                  {tag}
                  <button
                    onClick={() => removeTag(index)}
                    style={{
                      width: '16px',
                      height: '16px',
                      background: 'transparent',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder={tags.length === 0 ? '输入标签后按回车...' : ''}
                style={{
                  flex: 1,
                  minWidth: '120px',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: '13px',
                  fontFamily: '"Noto Sans SC", sans-serif',
                }}
              />
            </div>
          </div>

          {/* 笔记区 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '13px',
              fontWeight: 500,
              marginBottom: '10px',
              fontFamily: '"Noto Sans SC", sans-serif',
            }}>
              <FileText size={14} />
              笔记内容（支持 Markdown）
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={`# 标题

## 二级标题

- **加粗文字**
- 普通列表项
- \`代码片段\`

这里可以记录关于此节点的学习笔记、思考、参考资料链接等...`}
              style={{
                flex: 1,
                minHeight: '200px',
                padding: '14px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                lineHeight: 1.6,
                outline: 'none',
                resize: 'vertical',
                fontFamily: '"Noto Sans SC", sans-serif',
              }}
              onFocus={e => {
                e.target.style.borderColor = '#4A90D9';
                e.target.style.background = 'rgba(74, 144, 217, 0.08)';
              }}
              onBlur={e => {
                e.target.style.borderColor = 'rgba(255,255,255,0.15)';
                e.target.style.background = 'rgba(255,255,255,0.05)';
              }}
            />
          </div>
        </div>

        {/* 底部按钮 */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
        }}>
          <button
            onClick={handleClose}
            style={{
              padding: '10px 20px',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '8px',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.15s',
              fontFamily: '"Noto Sans SC", sans-serif',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(135deg, #4A90D9, #357ABD)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s',
              fontFamily: '"Noto Sans SC", sans-serif',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(74,144,217,0.4)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Check size={16} />
            保存
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalScaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

