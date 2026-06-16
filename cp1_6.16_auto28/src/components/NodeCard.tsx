import React, { useRef, useState, useCallback, useEffect } from 'react';
import { NodeData, PRESET_TAGS, updateNode, toggleNodeTag, NODE_WIDTH, NODE_HEIGHT } from '@/store';
import { MarkdownTitle, MarkdownContent } from '@/utils/markdown';

interface NodeCardProps {
  node: NodeData;
  isHighlighted: boolean;
  isDimmed: boolean;
  onDragStart: (id: string, e: React.MouseEvent) => void;
  onDragMove: (id: string, x: number, y: number) => void;
  onDragEnd: (id: string) => void;
  onStartConnection: (id: string, e: React.MouseEvent) => void;
}

const NodeCard: React.FC<NodeCardProps> = ({
  node,
  isHighlighted,
  isDimmed,
  onDragStart,
  onDragMove,
  onDragEnd,
  onStartConnection,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingField, setEditingField] = useState<'title' | 'content' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [contentHeight, setContentHeight] = useState(60);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (editingField) return;
      e.preventDefault();
      setIsDragging(true);
      onDragStart(node.id, e);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        onDragMove(node.id, moveEvent.clientX, moveEvent.clientY);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        onDragEnd(node.id);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [node.id, editingField, onDragStart, onDragMove, onDragEnd]
  );

  const handleTitleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingField('title');
    setEditValue(node.title);
  };

  const handleContentDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingField('content');
    setEditValue(node.content);
  };

  const handleEditBlur = () => {
    if (editingField && editValue !== (editingField === 'title' ? node.title : node.content)) {
      updateNode(node.id, { [editingField]: editValue });
    }
    setEditingField(null);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditBlur();
    } else if (e.key === 'Escape') {
      setEditingField(null);
    }
  };

  const handleTagClick = (tagId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNodeTag(node.id, tagId);
  };

  const handleAddTagClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTagMenu(!showTagMenu);
  };

  const handleConnectionHandleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStartConnection(node.id, e);
  };

  useEffect(() => {
    if (editingField === 'content' && contentTextareaRef.current) {
      const textarea = contentTextareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
      setContentHeight(Math.min(textarea.scrollHeight, 200));
    }
  }, [editValue, editingField]);

  useEffect(() => {
    if (!editingField) {
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.visibility = 'hidden';
      tempDiv.style.width = `${NODE_WIDTH - 24}px`;
      tempDiv.style.fontSize = '12px';
      tempDiv.style.lineHeight = '1.4';
      tempDiv.style.whiteSpace = 'pre-wrap';
      tempDiv.style.wordWrap = 'break-word';
      tempDiv.textContent = node.content || '';
      document.body.appendChild(tempDiv);
      const height = Math.min(Math.max(tempDiv.scrollHeight, 40), 200);
      document.body.removeChild(tempDiv);
      setContentHeight(height);
    }
  }, [node.content, editingField]);

  useEffect(() => {
    if (showTagMenu) {
      const handleClickOutside = () => setShowTagMenu(false);
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showTagMenu]);

  const togglePreviewMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPreviewMode(!isPreviewMode);
  };

  const handleContentEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPreviewMode(false);
    setEditingField('content');
    setEditValue(node.content);
  };

  const cardTags = PRESET_TAGS.filter((t) => node.tags.includes(t.id));

  return (
    <div
      ref={cardRef}
      className="node-card"
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        width: NODE_WIDTH,
        minHeight: NODE_HEIGHT,
        background: '#FFFFFF',
        borderRadius: '8px',
        boxShadow: isDragging
          ? '0 4px 20px rgba(0,0,0,0.2)'
          : '0 2px 8px rgba(0,0,0,0.1)',
        transition: isDragging
          ? 'none'
          : 'box-shadow 0.3s ease, transform 0.2s ease, opacity 0.2s ease, border-color 0.2s ease',
        cursor: editingField ? 'text' : 'grab',
        opacity: isDimmed ? 0.5 : 1,
        transform: isDragging ? 'scale(0.95)' : isHighlighted ? 'scale(1.02)' : 'scale(1)',
        border: isDragging
          ? '2px dashed #E74C3C'
          : isHighlighted
          ? '2px solid #3498DB'
          : '1px solid #E5E5E5',
        boxSizing: 'border-box',
        padding: '12px',
        zIndex: isDragging ? 1000 : isHighlighted ? 10 : 1,
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
    >
      {editingField === 'title' ? (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleEditBlur}
          onKeyDown={handleEditKeyDown}
          autoFocus
          style={{
            width: '100%',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            marginBottom: '8px',
            fontFamily: 'inherit',
            color: '#333',
          }}
        />
      ) : (
        <div
          className="node-title"
          onDoubleClick={handleTitleDoubleClick}
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#333',
            marginBottom: '8px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.3,
          }}
        >
          {isPreviewMode ? (
            <MarkdownTitle text={node.title || '新卡片'} />
          ) : (
            node.title || '新卡片'
          )}
        </div>
      )}

      {editingField === 'content' ? (
        <textarea
          ref={contentTextareaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleEditBlur}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setEditingField(null);
            }
          }}
          autoFocus
          style={{
            width: '100%',
            fontSize: '12px',
            border: '1px solid #3498DB',
            borderRadius: '4px',
            outline: 'none',
            background: 'transparent',
            resize: 'none',
            minHeight: '40px',
            maxHeight: '200px',
            fontFamily: 'inherit',
            color: '#333',
            padding: '4px 6px',
            boxSizing: 'border-box',
            overflowY: 'auto',
            lineHeight: 1.4,
            marginBottom: '8px',
          }}
        />
      ) : (
        <div
          className="node-content"
          onClick={handleContentEditClick}
          onDoubleClick={handleContentDoubleClick}
          style={{
            fontSize: '12px',
            color: '#666',
            lineHeight: 1.4,
            minHeight: '32px',
            maxHeight: '200px',
            marginBottom: '8px',
            overflowY: 'auto',
            wordBreak: 'break-word',
            cursor: 'text',
          }}
        >
          {isPreviewMode ? (
            node.content ? (
              <MarkdownContent text={node.content} />
            ) : (
              <span style={{ color: '#AAA' }}>点击编辑内容（支持 Markdown）</span>
            )
          ) : (
            <pre
              style={{
                margin: 0,
                fontFamily: 'inherit',
                fontSize: 'inherit',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color: 'inherit',
              }}
            >
              {node.content || '点击编辑内容（支持 Markdown）'}
            </pre>
          )}
        </div>
      )}

      <div className="node-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: 'auto' }}>
        {cardTags.map((tag) => (
          <span
            key={tag.id}
            onClick={(e) => handleTagClick(tag.id, e)}
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '4px',
              backgroundColor: tag.color,
              cursor: 'pointer',
              flexShrink: 0,
            }}
            title={tag.name}
          />
        ))}
        <div style={{ position: 'relative' }}>
          <button
            onClick={handleAddTagClick}
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '4px',
              border: '1px dashed #CCC',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999',
              fontSize: '12px',
              padding: 0,
              lineHeight: 1,
            }}
          >
            +
          </button>
          {showTagMenu && (
            <div
              className="tag-menu"
              style={{
                position: 'absolute',
                top: '20px',
                left: 0,
                background: '#FFF',
                borderRadius: '6px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                padding: '6px',
                zIndex: 100,
                minWidth: '100px',
              }}
            >
              {PRESET_TAGS.map((tag) => {
                const isSelected = node.tags.includes(tag.id);
                return (
                  <div
                    key={tag.id}
                    onClick={(e) => handleTagClick(tag.id, e)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '4px 6px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      opacity: isSelected ? 1 : 0.6,
                    }}
                  >
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '3px',
                        backgroundColor: tag.color,
                      }}
                    />
                    <span style={{ fontSize: '12px', color: '#333' }}>{tag.name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="card-toolbar" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #F0F0F0' }}>
        <button
          onClick={togglePreviewMode}
          title={isPreviewMode ? '切换到编辑模式' : '切换到预览模式'}
          style={{
            fontSize: '11px',
            padding: '2px 6px',
            border: '1px solid #DDD',
            borderRadius: '4px',
            background: isPreviewMode ? '#F5F5F5' : '#FFF',
            color: '#666',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {isPreviewMode ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              预览
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              编辑
            </>
          )}
        </button>
      </div>

      <div
        className="connection-handle"
        onMouseDown={handleConnectionHandleMouseDown}
        style={{
          position: 'absolute',
          right: '-8px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: '#FFF',
          border: '2px solid #2E86C1',
          cursor: 'crosshair',
          opacity: 0,
          transition: 'opacity 0.2s ease',
        }}
      />

      <style>{`
        .node-card:hover .connection-handle {
          opacity: 1;
        }
        .node-card:hover {
          box-shadow: 0 4px 20px rgba(0,0,0,0.2) !important;
        }
      `}</style>
    </div>
  );
};

export default NodeCard;
