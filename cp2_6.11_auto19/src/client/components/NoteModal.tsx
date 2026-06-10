/**
 * 笔记编辑模态框（磨砂玻璃效果）
 * 右键菜单"添加笔记"和"管理标签"触发
 *
 * 修复问题3：
 * - 支持 Tab 切换（笔记 / 标签）
 * - 根据右键菜单的选项自动激活对应 Tab 并聚焦
 * - 保存时正确关联到节点并调用后端持久化
 *
 * 设计要点：
 * - 背景: rgba(255,255,255,0.15) + backdrop-filter: blur(10px)
 * - 圆角: 16px
 * - 动画: 缩放淡入
 */

import { useState, useEffect, useRef } from 'react';
import { X, FileText, Tag, Check } from 'lucide-react';
import { useGraphStore } from '../store/useGraphStore';
import { TAG_COLORS } from '../../shared/types';

export default function NoteModal() {
  const isOpen = useGraphStore(state => state.isNoteModalOpen);
  const setOpen = useGraphStore(state => state.setNoteModalOpen);
  const initialTab = useGraphStore(state => state.noteModalInitialTab);
  const selectedNodeId = useGraphStore(state => state.selectedNodeId);
  const nodes = useGraphStore(state => state.nodes);
  const updateNodeNote = useGraphStore(state => state.updateNodeNote);

  const [note, setNote] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'note' | 'tags'>('note');

  // Refs 用于自动聚焦
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  // 初始化数据 + 根据初始tab自动聚焦
  useEffect(() => {
    if (isOpen && selectedNode) {
      setNote(selectedNode.note || '');
      setTags(selectedNode.tags || []);
      setTagInput('');
      setActiveTab(initialTab);
      // 延迟聚焦，等DOM渲染完成
      const focusTimer = setTimeout(() => {
        if (initialTab === 'tags') {
          tagInputRef.current?.focus();
        } else {
          noteTextareaRef.current?.focus();
        }
      }, 150);
      return () => clearTimeout(focusTimer);
    }
  }, [isOpen, selectedNode, initialTab]);

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

  const handleAddTagButton = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput('');
    tagInputRef.current?.focus();
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
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        animation: 'fadeIn 0.2s ease-out',
        WebkitAnimation: 'fadeIn 0.2s ease-out',
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
          WebkitAnimation: 'modalScaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
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
              {activeTab === 'note'
                ? <FileText size={20} color="#fff" />
                : <Tag size={20} color="#fff" />
              }
            </div>
            <div>
              <h2 style={{
                margin: 0,
                color: '#fff',
                fontSize: '18px',
                fontWeight: 600,
                fontFamily: '"Noto Serif SC", serif',
              }}>
                {activeTab === 'note' ? '编辑节点笔记' : '管理节点标签'}
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
              WebkitTransition: 'all 0.15s',
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

        {/* Tab 切换 - 修复问题3 */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          padding: '0 24px',
        }}>
          {(['note', 'tags'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setTimeout(() => {
                  if (tab === 'tags') tagInputRef.current?.focus();
                  else noteTextareaRef.current?.focus();
                }, 50);
              }}
              style={{
                padding: '12px 20px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab
                  ? '2px solid #4A90D9'
                  : '2px solid transparent',
                color: activeTab === tab ? '#4A90D9' : 'rgba(255,255,255,0.6)',
                fontSize: '13px',
                fontWeight: activeTab === tab ? 600 : 400,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s',
                WebkitTransition: 'all 0.15s',
                fontFamily: '"Noto Sans SC", sans-serif',
              }}
            >
              {tab === 'note'
                ? <><FileText size={14} /> 笔记内容</>
                : <><Tag size={14} /> 标签管理</>
              }
            </button>
          ))}
        </div>

        {/* 内容区 */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: activeTab === 'note' ? '0' : '0',
          minHeight: '320px',
        }}>
          {/* 标签 Tab */}
          {activeTab === 'tags' && (
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
                minHeight: '50px',
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
                      animation: 'fadeIn 0.2s ease-out',
                      WebkitAnimation: 'fadeIn 0.2s ease-out',
                    }}
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(index)}
                      aria-label={`删除标签 ${tag}`}
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
                        WebkitTransition: 'background 0.15s',
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
                  ref={tagInputRef}
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder={tags.length === 0 ? '输入标签后按回车或点击添加按钮...' : ''}
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
              {tagInput.trim() && (
                <button
                  onClick={handleAddTagButton}
                  style={{
                    marginTop: '10px',
                    padding: '6px 14px',
                    background: 'rgba(74, 144, 217, 0.2)',
                    border: '1px solid rgba(74, 144, 217, 0.4)',
                    borderRadius: '6px',
                    color: '#4A90D9',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    WebkitTransition: 'all 0.15s',
                    fontFamily: '"Noto Sans SC", sans-serif',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(74, 144, 217, 0.3)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(74, 144, 217, 0.2)';
                  }}
                >
                  + 添加「{tagInput.trim()}」
                </button>
              )}
              {tags.length > 0 && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: 'rgba(74, 144, 217, 0.08)',
                  border: '1px solid rgba(74, 144, 217, 0.15)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.6)',
                  lineHeight: 1.6,
                  fontFamily: '"Noto Sans SC", sans-serif',
                }}>
                  💡 已添加 <strong style={{ color: '#4A90D9' }}>{tags.length}</strong> 个标签。
                  标签可用于快速筛选和分类知识节点。
                </div>
              )}
            </div>
          )}

          {/* 笔记 Tab */}
          {activeTab === 'note' && (
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
                ref={noteTextareaRef}
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
                  minHeight: '260px',
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
                  transition: 'all 0.15s',
                  WebkitTransition: 'all 0.15s',
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
              {note.trim() && (
                <div style={{
                  marginTop: '10px',
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.4)',
                  fontFamily: '"Noto Sans SC", sans-serif',
                }}>
                  笔记长度：{note.length} 字符
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px',
        }}>
          <div style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.4)',
            fontFamily: '"Noto Sans SC", sans-serif',
          }}>
            {tags.length > 0 && `${tags.length} 个标签`}
            {tags.length > 0 && note.trim() ? ' · ' : ''}
            {note.trim() && '已写笔记'}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
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
                WebkitTransition: 'all 0.15s',
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
                WebkitTransition: 'all 0.15s',
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
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @-webkit-keyframes fadeIn {
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
        @-webkit-keyframes modalScaleIn {
          from {
            opacity: 0;
            -webkit-transform: scale(0.9);
          }
          to {
            opacity: 1;
            -webkit-transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
