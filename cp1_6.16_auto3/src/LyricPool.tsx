import React, { useState, useCallback, useRef } from 'react';
import {
  LyricFragment,
  getGradientForTags,
  filterFragmentsByTag,
  PRESET_TAGS,
} from './businessLogic';

interface LyricPoolProps {
  fragments: LyricFragment[];
  onUpdateFragment: (id: string, newContent: string) => void;
  onDeleteFragment: (id: string) => void;
  onAddToWorkarea: (fragmentId: string) => void;
}

export function LyricPool({
  fragments,
  onUpdateFragment,
  onDeleteFragment,
  onAddToWorkarea,
}: LyricPoolProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredFragments = filterFragmentsByTag(fragments, filterTag);

  const handleEditStart = useCallback((fragment: LyricFragment) => {
    setEditingId(fragment.id);
    setEditText(fragment.content);
  }, []);

  const handleEditSave = useCallback(
    (id: string) => {
      if (editText.trim()) {
        onUpdateFragment(id, editText.trim());
      }
      setEditingId(null);
      setEditText('');
    },
    [editText, onUpdateFragment]
  );

  const handleCopy = useCallback(
    async (fragment: LyricFragment) => {
      try {
        await navigator.clipboard.writeText(fragment.content);
        setCopiedId(fragment.id);
        setTimeout(() => setCopiedId(null), 1500);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = fragment.content;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setCopiedId(fragment.id);
        setTimeout(() => setCopiedId(null), 1500);
      }
    },
    []
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, fragmentId: string) => {
      e.dataTransfer.setData('application/fragment-id', fragmentId);
      e.dataTransfer.effectAllowed = 'copy';
      setDraggingId(fragmentId);
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
  }, []);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <div
        style={{
          padding: '12px 16px 8px',
          borderBottom: '1px solid #E8DFD0',
        }}
      >
        <h3
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#2C3E50',
            fontFamily: "'Georgia', serif",
          }}
        >
          歌词池
        </h3>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            marginTop: 6,
          }}
        >
          <button
            onClick={() => setFilterTag(null)}
            style={{
              padding: '2px 8px',
              border: 'none',
              borderRadius: 3,
              fontSize: 10,
              cursor: 'pointer',
              background: filterTag === null ? '#5DADE2' : '#E8DFD0',
              color: filterTag === null ? '#FFF' : '#5D6D7E',
              transition: 'all 0.15s',
            }}
          >
            全部
          </button>
          {PRESET_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setFilterTag(tag)}
              style={{
                padding: '2px 8px',
                border: 'none',
                borderRadius: 3,
                fontSize: 10,
                cursor: 'pointer',
                background: filterTag === tag ? '#5DADE2' : '#E8DFD0',
                color: filterTag === tag ? '#FFF' : '#5D6D7E',
                transition: 'all 0.15s',
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {filteredFragments.length === 0 ? (
          <div
            style={{
              fontSize: 12,
              color: '#B0A090',
              textAlign: 'center',
              marginTop: 24,
            }}
          >
            {fragments.length === 0 ? '还没有歌词片段' : '无匹配片段'}
          </div>
        ) : (
          filteredFragments.map((fragment) => {
            const gradient = getGradientForTags(fragment.tags);
            const isEditing = editingId === fragment.id;
            const isDragging = draggingId === fragment.id;

            return (
              <div
                key={fragment.id}
                draggable={!isEditing}
                onDragStart={(e) => handleDragStart(e, fragment.id)}
                onDragEnd={handleDragEnd}
                className={`lyric-card${isDragging ? ' dragging' : ''}`}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 8,
                  overflow: 'hidden',
                  cursor: isEditing ? 'text' : 'grab',
                  opacity: isDragging ? 0.85 : 1,
                }}
              >
                <div
                  style={{
                    height: 4,
                    background: `linear-gradient(90deg, ${gradient[0]}, ${gradient[1]})`,
                  }}
                />

                <div
                  className="pool-card-content"
                  style={{ padding: '8px 10px' }}
                >
                  {isEditing ? (
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={() => handleEditSave(fragment.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleEditSave(fragment.id);
                        }
                      }}
                      autoFocus
                      style={{
                        width: '100%',
                        minHeight: 40,
                        border: '1px solid #5DADE2',
                        borderRadius: 4,
                        padding: 6,
                        fontSize: 13,
                        fontFamily: "'Georgia', serif",
                        resize: 'vertical',
                        outline: 'none',
                        lineHeight: 1.5,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        fontSize: 13,
                        color: '#2C3E50',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {fragment.content}
                    </div>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 4,
                      marginTop: 6,
                    }}
                  >
                    {fragment.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: 10,
                          padding: '1px 6px',
                          borderRadius: 3,
                          background: '#5DADE2',
                          color: '#FFFFFF',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                    <span
                      style={{
                        fontSize: 10,
                        color: '#B0A090',
                        marginLeft: 'auto',
                      }}
                    >
                      {fragment.charCount}字
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 4,
                    padding: '4px 10px 8px',
                  }}
                >
                  <button
                    onClick={() =>
                      isEditing
                        ? handleEditSave(fragment.id)
                        : handleEditStart(fragment)
                    }
                    style={{
                      padding: '3px 8px',
                      border: '1px solid #D3C4A5',
                      borderRadius: 4,
                      fontSize: 11,
                      cursor: 'pointer',
                      background: isEditing ? '#5DADE2' : '#FDFAF3',
                      color: isEditing ? '#FFF' : '#7F8C8D',
                      transition: 'all 0.15s',
                    }}
                  >
                    {isEditing ? '保存' : '编辑'}
                  </button>
                  <button
                    onClick={() => handleCopy(fragment)}
                    style={{
                      padding: '3px 8px',
                      border: '1px solid #D3C4A5',
                      borderRadius: 4,
                      fontSize: 11,
                      cursor: 'pointer',
                      background: copiedId === fragment.id ? '#A8E6CF' : '#FDFAF3',
                      color: '#7F8C8D',
                      transition: 'all 0.15s',
                    }}
                  >
                    {copiedId === fragment.id ? '已复制' : '复制'}
                  </button>
                  <button
                    onClick={() => onAddToWorkarea(fragment.id)}
                    style={{
                      padding: '3px 8px',
                      border: '1px solid #D3C4A5',
                      borderRadius: 4,
                      fontSize: 11,
                      cursor: 'pointer',
                      background: '#FDFAF3',
                      color: '#1E8449',
                      transition: 'all 0.15s',
                      marginLeft: 'auto',
                    }}
                  >
                    +工作区
                  </button>
                  <button
                    onClick={() => onDeleteFragment(fragment.id)}
                    style={{
                      padding: '3px 8px',
                      border: '1px solid #E8C4C4',
                      borderRadius: 4,
                      fontSize: 11,
                      cursor: 'pointer',
                      background: '#FDFAF3',
                      color: '#E74C3C',
                      transition: 'all 0.15s',
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
