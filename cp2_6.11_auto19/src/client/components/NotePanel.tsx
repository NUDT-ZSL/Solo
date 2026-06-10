/**
 * 笔记面板组件
 * 展示和编辑选中节点的笔记内容和标签
 */

import { useState, useEffect, useMemo } from 'react';
import { FileText, Tag, Edit3, X, Check } from 'lucide-react';
import { useGraphStore } from '../store/useGraphStore';
import { TAG_COLORS } from '../../shared/types';

interface NotePanelProps {
  selectedNodeId: string | null;
}

export default function NotePanel({ selectedNodeId }: NotePanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editNote, setEditNote] = useState('');
  const [editTags, setEditTags] = useState('');

  const nodes = useGraphStore(state => state.nodes);
  const updateNodeNote = useGraphStore(state => state.updateNodeNote);
  const isNoteModalOpen = useGraphStore(state => state.isNoteModalOpen);
  const setNoteModalOpen = useGraphStore(state => state.setNoteModalOpen);

  const selectedNode = useMemo(() =>
    nodes.find(n => n.id === selectedNodeId)
  , [nodes, selectedNodeId]);

  // 同步编辑状态
  useEffect(() => {
    if (selectedNode) {
      setEditNote(selectedNode.note || '');
      setEditTags(selectedNode.tags?.join(', ') || '');
    }
  }, [selectedNode]);

  const getTagColor = (index: number) => TAG_COLORS[index % TAG_COLORS.length];

  const parseTags = (tagStr: string): string[] => {
    return tagStr
      .split(/[,，\n]/)
      .map(t => t.trim())
      .filter(t => t.length > 0);
  };

  const handleSave = async () => {
    if (!selectedNode) return;
    const tags = parseTags(editTags);
    await updateNodeNote(selectedNode.id, editNote.trim(), tags);
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (selectedNode) {
      setEditNote(selectedNode.note || '');
      setEditTags(selectedNode.tags?.join(', ') || '');
    }
    setIsEditing(false);
  };

  // 简单的 Markdown 渲染（只支持标题、加粗、列表）
  const renderMarkdown = (text: string) => {
    if (!text.trim()) return null;

    const lines = text.split('\n');
    const elements: JSX.Element[] = [];

    lines.forEach((line, index) => {
      let content = line;

      // 标题
      if (content.startsWith('### ')) {
        elements.push(
          <h3 key={index} style={{
            color: '#fff',
            fontSize: '15px',
            fontWeight: 600,
            margin: '12px 0 8px',
            fontFamily: '"Noto Serif SC", serif',
          }}>
            {content.slice(4)}
          </h3>
        );
        return;
      }
      if (content.startsWith('## ')) {
        elements.push(
          <h2 key={index} style={{
            color: '#fff',
            fontSize: '17px',
            fontWeight: 700,
            margin: '14px 0 10px',
            fontFamily: '"Noto Serif SC", serif',
          }}>
            {content.slice(3)}
          </h2>
        );
        return;
      }
      if (content.startsWith('# ')) {
        elements.push(
          <h1 key={index} style={{
            color: '#4A90D9',
            fontSize: '19px',
            fontWeight: 700,
            margin: '16px 0 12px',
            fontFamily: '"Noto Serif SC", serif',
          }}>
            {content.slice(2)}
          </h1>
        );
        return;
      }

      // 无序列表
      if (content.startsWith('- ') || content.startsWith('* ')) {
        elements.push(
          <div key={index} style={{
            display: 'flex',
            gap: '8px',
            padding: '4px 0',
            paddingLeft: '8px',
          }}>
            <span style={{ color: '#4A90D9' }}>•</span>
            <span style={{
              flex: 1,
              color: 'rgba(255,255,255,0.85)',
              lineHeight: 1.6,
            }}>
              {renderInline(content.slice(2))}
            </span>
          </div>
        );
        return;
      }

      // 普通段落
      if (content.trim()) {
        elements.push(
          <p key={index} style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: '13px',
            lineHeight: 1.7,
            margin: '6px 0',
          }}>
            {renderInline(content)}
          </p>
        );
      } else {
        elements.push(<br key={index} />);
      }
    });

    return elements;
  };

  // 行内格式（加粗、斜体、代码）
  const renderInline = (text: string): JSX.Element => {
    // 处理 **加粗**
    let parts: Array<{ text: string; bold?: boolean; italic?: boolean; code?: boolean }> = [{ text }];

    // 加粗
    parts = parts.flatMap(p => {
      if (p.bold || p.italic || p.code) return [p];
      const segments: typeof parts = [];
      const regex = /\*\*(.*?)\*\*/g;
      let lastIndex = 0;
      let match;
      while ((match = regex.exec(p.text)) !== null) {
        if (match.index > lastIndex) {
          segments.push({ text: p.text.slice(lastIndex, match.index) });
        }
        segments.push({ text: match[1], bold: true });
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < p.text.length) {
        segments.push({ text: p.text.slice(lastIndex) });
      }
      return segments.length > 0 ? segments : [p];
    });

    return (
      <span>
        {parts.map((part, i) => {
          let style: React.CSSProperties = {};
          if (part.bold) style = { ...style, fontWeight: 600, color: '#fff' };
          if (part.italic) style = { ...style, fontStyle: 'italic' };
          if (part.code) style = {
            ...style,
            background: 'rgba(74, 144, 217, 0.2)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '12px',
          };
          return <span key={i} style={style}>{part.text}</span>;
        })}
      </span>
    );
  };

  if (!selectedNode) {
    return (
      <div style={{
        padding: '40px 20px',
        textAlign: 'center',
        color: 'rgba(255,255,255,0.4)',
        fontSize: '13px',
        fontFamily: '"Noto Sans SC", sans-serif',
      }}>
        <FileText size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
        <p>请选择一个节点</p>
        <p style={{ fontSize: '11px', marginTop: '4px' }}>
          右键节点添加笔记和标签
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 节点信息头部 */}
      <div style={{
        padding: '12px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '8px',
        borderLeft: `3px solid ${selectedNode.color}`,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '4px',
        }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: selectedNode.color,
              boxShadow: `0 0 10px ${selectedNode.color}`,
            }}
          />
          <span style={{
            color: '#fff',
            fontSize: '16px',
            fontWeight: 600,
            fontFamily: '"Noto Serif SC", serif',
          }}>
            {selectedNode.word}
          </span>
        </div>
        <div style={{
          fontSize: '11px',
          color: 'rgba(255,255,255,0.5)',
          fontFamily: '"Noto Sans SC", sans-serif',
        }}>
          层级 {selectedNode.level} · 关联强度 {(selectedNode.relevance * 100).toFixed(0)}%
        </div>
      </div>

      {/* 标签 */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '8px',
          fontSize: '12px',
          color: 'rgba(255,255,255,0.7)',
          fontFamily: '"Noto Sans SC", sans-serif',
        }}>
          <Tag size={14} />
          <span>标签</span>
        </div>

        {isEditing ? (
          <input
            type="text"
            placeholder="用逗号分隔多个标签..."
            value={editTags}
            onChange={e => setEditTags(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: '"Noto Sans SC", sans-serif',
            }}
          />
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {selectedNode.tags && selectedNode.tags.length > 0 ? (
              selectedNode.tags.map((tag, index) => (
                <span
                  key={index}
                  style={{
                    padding: '3px 10px',
                    background: `${getTagColor(index)}30`,
                    border: `1px solid ${getTagColor(index)}`,
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: getTagColor(index),
                    fontFamily: '"Noto Sans SC", sans-serif',
                  }}
                >
                  {tag}
                </span>
              ))
            ) : (
              <span style={{
                color: 'rgba(255,255,255,0.35)',
                fontSize: '12px',
                fontStyle: 'italic',
              }}>
                暂无标签
              </span>
            )}
          </div>
        )}
      </div>

      {/* 笔记内容 */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: 'rgba(255,255,255,0.7)',
            fontFamily: '"Noto Sans SC", sans-serif',
          }}>
            <FileText size={14} />
            <span>笔记</span>
          </div>

          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                padding: '4px 8px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '4px',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(74, 144, 217, 0.15)';
                e.currentTarget.style.borderColor = '#4A90D9';
                e.currentTarget.style.color = '#4A90D9';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
              }}
            >
              <Edit3 size={12} />
              编辑
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={handleSave}
                style={{
                  padding: '4px 8px',
                  background: '#4A90D9',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                }}
              >
                <Check size={12} />
                保存
              </button>
              <button
                onClick={handleCancel}
                style={{
                  padding: '4px 8px',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'rgba(255,255,255,0.7)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                }}
              >
                <X size={12} />
                取消
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <textarea
            value={editNote}
            onChange={e => setEditNote(e.target.value)}
            placeholder="支持 Markdown 格式...&#10;&#10;# 标题&#10;## 二级标题&#10;- 列表项&#10;**粗体文字**"
            style={{
              width: '100%',
              minHeight: '200px',
              padding: '12px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '13px',
              lineHeight: 1.6,
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
              fontFamily: '"Noto Sans SC", sans-serif',
            }}
          />
        ) : (
          <div style={{
            padding: '12px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.05)',
            minHeight: '100px',
            maxHeight: '350px',
            overflowY: 'auto',
          }}>
            {selectedNode.note ? (
              renderMarkdown(selectedNode.note)
            ) : (
              <p style={{
                color: 'rgba(255,255,255,0.35)',
                fontSize: '12px',
                fontStyle: 'italic',
                textAlign: 'center',
                padding: '20px 0',
              }}>
                暂无笔记，点击"编辑"添加
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
