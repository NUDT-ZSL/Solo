import React, { useState, useCallback } from 'react';
import {
  LyricFragment,
  WorkareaSlot,
  getGradientForTags,
} from './businessLogic';

interface WorkareaProps {
  slots: WorkareaSlot[];
  fragments: LyricFragment[];
  songTitle: string;
  totalChars: number;
  onSongTitleChange: (title: string) => void;
  onRemoveSlot: (slotId: string) => void;
  onReorderSlots: (fromIndex: number, toIndex: number) => void;
  onGenerateDraft: () => void;
  onUpdateFragment: (id: string, newContent: string) => void;
  onAddToWorkarea: (fragmentId: string) => void;
}

export function Workarea({
  slots,
  fragments,
  songTitle,
  totalChars,
  onSongTitleChange,
  onRemoveSlot,
  onReorderSlots,
  onGenerateDraft,
  onUpdateFragment,
  onAddToWorkarea,
}: WorkareaProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverSlotIndex, setDragOverSlotIndex] = useState<number | null>(null);
  const [editingSlotFragmentId, setEditingSlotFragmentId] = useState<string | null>(null);
  const [slotEditText, setSlotEditText] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleEditValue, setTitleEditValue] = useState(songTitle);
  const [dragSlotIndex, setDragSlotIndex] = useState<number | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const hasFragment = e.dataTransfer.types.includes('application/fragment-id');
    const hasSlot = e.dataTransfer.types.includes('application/slot-index');
    if (hasFragment || hasSlot) {
      e.dataTransfer.dropEffect = hasFragment ? 'copy' : 'move';
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      setIsDragOver(false);
      setDragOverSlotIndex(null);
    }
  }, []);

  const handleMainDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      setDragOverSlotIndex(null);
      const fragmentId = e.dataTransfer.getData('application/fragment-id');
      if (fragmentId) {
        onAddToWorkarea(fragmentId);
        return;
      }
      const slotIndexStr = e.dataTransfer.getData('application/slot-index');
      if (slotIndexStr) {
        const fromIndex = parseInt(slotIndexStr, 10);
        const toIndex = slots.length - 1;
        if (fromIndex !== toIndex && !isNaN(fromIndex)) {
          onReorderSlots(fromIndex, toIndex);
        }
      }
    },
    [onAddToWorkarea, onReorderSlots, slots.length]
  );

  const handleSlotDragStart = useCallback(
    (e: React.DragEvent, index: number) => {
      e.dataTransfer.setData('application/slot-index', String(index));
      e.dataTransfer.effectAllowed = 'move';
      setDragSlotIndex(index);
    },
    []
  );

  const handleSlotDragEnd = useCallback(() => {
    setDragSlotIndex(null);
    setDragOverSlotIndex(null);
  }, []);

  const handleSlotDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.stopPropagation();
      const hasSlot = e.dataTransfer.types.includes('application/slot-index');
      const hasFragment = e.dataTransfer.types.includes('application/fragment-id');
      if (hasSlot || hasFragment) {
        setDragOverSlotIndex(index);
      }
    },
    []
  );

  const handleSlotDrop = useCallback(
    (e: React.DragEvent, toIndex: number) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverSlotIndex(null);

      const slotIndexStr = e.dataTransfer.getData('application/slot-index');
      if (slotIndexStr) {
        const fromIndex = parseInt(slotIndexStr, 10);
        if (fromIndex !== toIndex && !isNaN(fromIndex)) {
          onReorderSlots(fromIndex, toIndex);
        }
        return;
      }

      const fragmentId = e.dataTransfer.getData('application/fragment-id');
      if (fragmentId) {
        onAddToWorkarea(fragmentId);
      }
    },
    [onReorderSlots, onAddToWorkarea]
  );

  const handleSlotEditStart = useCallback(
    (fragmentId: string, content: string) => {
      setEditingSlotFragmentId(fragmentId);
      setSlotEditText(content);
    },
    []
  );

  const handleSlotEditSave = useCallback(
    (fragmentId: string) => {
      if (slotEditText.trim()) {
        onUpdateFragment(fragmentId, slotEditText.trim());
      }
      setEditingSlotFragmentId(null);
      setSlotEditText('');
    },
    [slotEditText, onUpdateFragment]
  );

  const handleTitleSubmit = useCallback(() => {
    onSongTitleChange(titleEditValue.trim() || '未命名曲目');
    setIsEditingTitle(false);
  }, [titleEditValue, onSongTitleChange]);

  const sortedSlots = [...slots].sort((a, b) => a.order - b.order);

  const getFragmentById = (id: string): LyricFragment | undefined =>
    fragments.find((f) => f.id === id);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        height: '100%',
      }}
    >
      <div
        style={{
          background: '#2C3E50',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color: '#FFFFFF',
            fontSize: 14,
            fontFamily: "'Georgia', serif",
            fontWeight: 700,
            letterSpacing: 1,
          }}
        >
          &#9834;
        </span>
        {isEditingTitle ? (
          <input
            value={titleEditValue}
            onChange={(e) => setTitleEditValue(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSubmit();
            }}
            autoFocus
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 4,
              padding: '4px 8px',
              color: '#FFFFFF',
              fontSize: 14,
              fontFamily: "'Georgia', serif",
              fontWeight: 600,
              outline: 'none',
              flex: 1,
            }}
          />
        ) : (
          <span
            onClick={() => {
              setTitleEditValue(songTitle);
              setIsEditingTitle(true);
            }}
            style={{
              color: '#FFFFFF',
              fontSize: 14,
              fontFamily: "'Georgia', serif",
              fontWeight: 600,
              cursor: 'pointer',
              borderBottom: '1px dashed rgba(255,255,255,0.4)',
              padding: '2px 0',
            }}
          >
            {songTitle}
          </span>
        )}
        <span
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.5)',
            marginLeft: 'auto',
          }}
        >
          {slots.length} 段
        </span>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleMainDrop}
        className={isDragOver ? 'workarea-drop-active' : ''}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          border: isDragOver ? '2px dashed #5DADE2' : '2px solid transparent',
          borderRadius: isDragOver ? 8 : 0,
          margin: isDragOver ? 8 : 0,
          transition: 'all 0.2s ease',
          background: isDragOver ? 'rgba(93,173,226,0.05)' : 'transparent',
        }}
      >
        {sortedSlots.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 8,
              color: '#B0A090',
            }}
          >
            <div style={{ fontSize: 32, opacity: 0.5 }}>&#9835;</div>
            <div
              style={{
                fontSize: 14,
                fontFamily: "'Georgia', serif",
              }}
            >
              从歌词池拖拽片段到这里
            </div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>
              或点击卡片上的「+工作区」按钮
            </div>
          </div>
        ) : (
          sortedSlots.map((slot, index) => {
            const fragment = getFragmentById(slot.fragmentId);
            if (!fragment) return null;
            const gradient = getGradientForTags(fragment.tags);
            const isEditing = editingSlotFragmentId === fragment.id;
            const isDragOverThis = dragOverSlotIndex === index;
            const isThisDragging = dragSlotIndex === index;

            return (
              <div
                key={slot.id}
                draggable={!isEditing}
                onDragStart={(e) => handleSlotDragStart(e, index)}
                onDragEnd={handleSlotDragEnd}
                onDragOver={(e) => handleSlotDragOver(e, index)}
                onDrop={(e) => handleSlotDrop(e, index)}
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'flex-start',
                  opacity: isThisDragging ? 0.5 : 1,
                  borderTop: isDragOverThis
                    ? '3px solid #1E8449'
                    : '3px solid transparent',
                  transition: 'all 0.2s ease',
                  cursor: isEditing ? 'default' : 'grab',
                }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: '#1E8449',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 700,
                    fontFamily: "'Georgia', serif",
                    marginTop: 2,
                  }}
                >
                  {index + 1}
                </div>

                <div
                  style={{
                    flex: 1,
                    background: '#FFFFFF',
                    borderRadius: 8,
                    overflow: 'hidden',
                    boxShadow: '0 1px 4px rgba(211,196,165,0.4)',
                  }}
                >
                  <div
                    style={{
                      height: 3,
                      background: `linear-gradient(90deg, ${gradient[0]}, ${gradient[1]})`,
                    }}
                  />

                  <div style={{ padding: '8px 12px' }}>
                    {isEditing ? (
                      <textarea
                        value={slotEditText}
                        onChange={(e) => setSlotEditText(e.target.value)}
                        onBlur={() => handleSlotEditSave(fragment.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSlotEditSave(fragment.id);
                          }
                        }}
                        autoFocus
                        style={{
                          width: '100%',
                          minHeight: 36,
                          border: '1px solid #5DADE2',
                          borderRadius: 4,
                          padding: 6,
                          fontSize: 14,
                          fontFamily: "'Georgia', serif",
                          resize: 'vertical',
                          outline: 'none',
                          lineHeight: 1.6,
                        }}
                      />
                    ) : (
                      <div
                        onClick={() =>
                          handleSlotEditStart(fragment.id, fragment.content)
                        }
                        style={{
                          fontSize: 14,
                          color: '#2C3E50',
                          lineHeight: 1.7,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          cursor: 'text',
                          minHeight: 20,
                        }}
                      >
                        {fragment.content}
                      </div>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        marginTop: 4,
                      }}
                    >
                      {fragment.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontSize: 9,
                            padding: '1px 5px',
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
                      padding: '2px 12px 8px',
                    }}
                  >
                    <button
                      onClick={() =>
                        isEditing
                          ? handleSlotEditSave(fragment.id)
                          : handleSlotEditStart(fragment.id, fragment.content)
                      }
                      style={{
                        padding: '2px 8px',
                        border: '1px solid #D3C4A5',
                        borderRadius: 4,
                        fontSize: 10,
                        cursor: 'pointer',
                        background: isEditing ? '#5DADE2' : '#FDFAF3',
                        color: isEditing ? '#FFF' : '#7F8C8D',
                      }}
                    >
                      {isEditing ? '保存' : '编辑'}
                    </button>
                    <button
                      onClick={() => onRemoveSlot(slot.id)}
                      style={{
                        padding: '2px 8px',
                        border: '1px solid #E8C4C4',
                        borderRadius: 4,
                        fontSize: 10,
                        cursor: 'pointer',
                        background: '#FDFAF3',
                        color: '#E74C3C',
                      }}
                    >
                      移除
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div
        style={{
          background: '#FDFAF3',
          borderTop: '1px solid #E8DFD0',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: '#7F8C8D',
              fontFamily: "'Georgia', serif",
            }}
          >
            字数统计
          </span>
          <div
            style={{
              flex: 1,
              height: 6,
              background: '#E8DFD0',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, (totalChars / 1000) * 100)}%`,
                background:
                  totalChars > 800
                    ? '#E74C3C'
                    : totalChars > 500
                    ? '#F39C12'
                    : '#1E8449',
                borderRadius: 3,
                transition: 'width 0.3s ease, background 0.3s ease',
              }}
            />
          </div>
          <span
            style={{
              fontSize: 11,
              color: '#2C3E50',
              fontWeight: 600,
              fontFamily: "'Georgia', serif",
              minWidth: 36,
              textAlign: 'right',
            }}
          >
            {totalChars}
          </span>
        </div>
        <button
          onClick={onGenerateDraft}
          disabled={slots.length === 0}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: 8,
            background: slots.length === 0 ? '#D3C4A5' : '#2C3E50',
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: 600,
            cursor: slots.length === 0 ? 'not-allowed' : 'pointer',
            fontFamily: "'Georgia', serif",
            transition: 'background 0.2s',
          }}
        >
          生成草稿
        </button>
      </div>
    </div>
  );
}
