import React, { useState, useMemo, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { KeymapItem, ScopeType, SCOPE_LABELS, DEFAULT_KEYMAPS } from '../utils/keyboardLayout';
import { useKeyRecorder } from '../hooks/useKeyRecorder';

interface KeymapBoardProps {
  keymaps: KeymapItem[];
  onKeymapsChange: (items: KeymapItem[]) => void;
  activeTab: ScopeType | 'all';
  conflicts: Map<string, string[]>;
  recentlyChangedId: string | null;
}

const SCOPE_ORDER: ScopeType[] = ['common', 'edit', 'nav', 'window'];

export const KeymapBoard: React.FC<KeymapBoardProps> = ({
  keymaps,
  onKeymapsChange,
  activeTab,
  conflicts,
  recentlyChangedId,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editingItem, setEditingItem] = useState<KeymapItem | null>(null);
  const [conflictFlashIds, setConflictFlashIds] = useState<Set<string>>(new Set());

  const { combo, isRecording, startRecording, reset, setValue } = useKeyRecorder('');
  const [editDescription, setEditDescription] = useState<string>('');

  const filteredKeymaps = useMemo(() => {
    const tabFiltered = activeTab === 'all'
      ? keymaps
      : keymaps.filter(k => k.scope === activeTab);

    if (!searchTerm.trim()) return tabFiltered;

    const term = searchTerm.trim().toLowerCase();
    return tabFiltered.map(k => ({
      ...k,
      _matched: k.description.toLowerCase().includes(term) ||
        k.boundKey.toLowerCase().includes(term) ||
        k.defaultKey.toLowerCase().includes(term),
    }));
  }, [keymaps, activeTab, searchTerm]);

  const groupedKeymaps = useMemo(() => {
    const groups: Record<string, any[]> = {};
    SCOPE_ORDER.forEach(s => { groups[s] = []; });

    const scopesToShow = activeTab === 'all' ? SCOPE_ORDER : [activeTab];

    filteredKeymaps.forEach(k => {
      if (scopesToShow.includes(k.scope)) {
        groups[k.scope].push(k);
      }
    });

    scopesToShow.forEach(s => {
      groups[s].sort((a, b) => a.order - b.order);
    });

    return groups;
  }, [filteredKeymaps, activeTab]);

  useEffect(() => {
    if (conflicts.size > 0) {
      const ids = new Set(conflicts.keys());
      setConflictFlashIds(ids);
      const t = setTimeout(() => setConflictFlashIds(new Set()), 2000);
      return () => clearTimeout(t);
    }
  }, [conflicts]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination } = result;

    const sourceScope = source.droppableId as ScopeType;
    const destScope = destination.droppableId as ScopeType;

    const newKeymaps = [...keymaps];
    const scopeGroup = groupedKeymaps;

    const sourceList = scopeGroup[sourceScope] || [];
    const destList = scopeGroup[destScope] || [];

    const movedId = sourceList[source.index].id;
    const movedItemIdx = newKeymaps.findIndex(k => k.id === movedId);
    if (movedItemIdx === -1) return;

    const movedItem = { ...newKeymaps[movedItemIdx], scope: destScope };

    const reordered = (list: any[], sIdx: number, dIdx: number, dScope: ScopeType) => {
      const working = [...keymaps];
      if (sIdx === dIdx && sourceScope === dScope) return working;

      const allByScopeOrder = SCOPE_ORDER.flatMap(scope =>
        working
          .filter(k => k.scope === scope && k.id !== movedId)
          .sort((a, b) => a.order - b.order)
      );

      const destScopeItems = allByScopeOrder
        .map((k, idx) => ({ k, idx }))
        .filter(({ k }) => k.scope === dScope);

      let insertGlobalIdx: number;
      if (dScope === sourceScope) {
        if (destScopeItems.length === 0) {
          insertGlobalIdx = allByScopeOrder.length;
        } else {
          const base = destScopeItems[0].idx;
          insertGlobalIdx = Math.min(base + dIdx, base + destScopeItems.length);
        }
      } else {
        if (destScopeItems.length === 0) {
          const firstNext = allByScopeOrder
            .map((k, idx) => ({ k, idx }))
            .find(({ k }) => SCOPE_ORDER.indexOf(k.scope) > SCOPE_ORDER.indexOf(dScope));
          insertGlobalIdx = firstNext ? firstNext.idx : allByScopeOrder.length;
        } else {
          const base = destScopeItems[0].idx;
          insertGlobalIdx = Math.min(base + dIdx, base + destScopeItems.length);
        }
      }

      const filtered = working.filter(k => k.id !== movedId);
      filtered.splice(insertGlobalIdx, 0, movedItem);

      return filtered.map((k, idx) => ({ ...k, order: idx }));
    };

    const updated = reordered(newKeymaps, source.index, destination.index, destScope);
    onKeymapsChange(updated);
  };

  const openEdit = (item: KeymapItem) => {
    setEditingItem(item);
    setValue(item.boundKey);
    setEditDescription(item.description);
    reset();
  };

  const closeEdit = () => {
    setEditingItem(null);
    reset();
  };

  const handleReset = () => {
    if (editingItem) {
      setValue(editingItem.defaultKey);
    }
  };

  const handleSave = () => {
    if (!editingItem) return;
    const finalCombo = combo || editingItem.boundKey;
    const updated = keymaps.map(k =>
      k.id === editingItem.id
        ? { ...k, boundKey: finalCombo, description: editDescription }
        : k
    );
    onKeymapsChange(updated);
    closeEdit();
  };

  const getMatched = (item: KeymapItem) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.trim().toLowerCase();
    return item.description.toLowerCase().includes(term) ||
      item.boundKey.toLowerCase().includes(term) ||
      item.defaultKey.toLowerCase().includes(term);
  };

  const renderComboParts = (str: string) => {
    if (!str) return <span style={{ color: '#999', fontSize: 13 }}>请点击后按下组合键</span>;
    return str.split('+').map((p, i) => (
      <span key={i} className="key-part">{p}</span>
    ));
  };

  return (
    <div className="board-container">
      <div className="search-bar-wrapper">
        <div className="search-bar">
          <span className="search-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </span>
          <input
            type="text"
            className="search-input"
            placeholder="搜索快捷键功能，如“保存”、“Ctrl+S”..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="keymap-board">
          {SCOPE_ORDER.map(scope => {
            if (activeTab !== 'all' && activeTab !== scope) return null;
            const groupItems = groupedKeymaps[scope] || [];
            if (groupItems.length === 0) return null;

            return (
              <React.Fragment key={scope}>
                <div className="group-header">
                  <span className="group-title">{SCOPE_LABELS[scope]}</span>
                  <span className="group-line" />
                </div>

                <Droppable droppableId={scope} direction="horizontal">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{
                        display: 'contents',
                      }}
                    >
                      {groupItems.map((item, index) => {
                        const matched = getMatched(item);
                        const hasConflict = conflicts.has(item.id);
                        const isFlash = conflictFlashIds.has(item.id);
                        const isRecentlyChanged = recentlyChangedId === item.id;

                        return (
                          <Draggable
                            key={item.id}
                            draggableId={item.id}
                            index={index}
                            isDragDisabled={!matched}
                          >
                            {(dragProvided, dragSnapshot) => {
                              const dragging = dragSnapshot.isDragging;
                              return (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  style={{
                                    ...dragProvided.draggableProps.style,
                                    gridColumn: 'span 3',
                                  }}
                                  className={[
                                    'key-card',
                                    dragging ? 'dragging' : '',
                                    !matched ? 'filtered' : '',
                                    (isFlash || isRecentlyChanged && hasConflict) ? 'conflict' : '',
                                  ].join(' ')}
                                  onClick={() => matched && openEdit(item)}
                                >
                                  <div className="key-card-header">
                                    <span className="key-badge">{item.boundKey || '未设置'}</span>
                                    <span className={`scope-tag scope-${item.scope}`}>
                                      {SCOPE_LABELS[item.scope]}
                                    </span>
                                  </div>
                                  <div className="key-card-desc">{item.description}</div>
                                </div>
                              );
                            }}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </React.Fragment>
            );
          })}
        </div>
      </DragDropContext>

      {editingItem && (
        <div className="modal-overlay" onClick={closeEdit}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-title">编辑快捷键</div>

            <div className="form-group">
              <label className="form-label">键位组合（点击后按下按键）</label>
              <div
                className={`key-recorder ${isRecording ? 'recording' : ''}`}
                onClick={startRecording}
                tabIndex={0}
              >
                <span className="key-combo-display">
                  {renderComboParts(combo)}
                </span>
                <span className="key-recorder-hint">
                  {isRecording ? '正在监听...' : '点击开始录制'}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">功能描述</label>
              <input
                type="text"
                className="form-input"
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                placeholder="请输入功能描述"
              />
            </div>

            <div className="modal-actions">
              <button className="btn-reset" onClick={handleReset}>重置为默认</button>
              <div style={{ flex: 1 }} />
              <button className="btn-cancel" onClick={closeEdit}>取消</button>
              <button className="btn-save" onClick={handleSave}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KeymapBoard;
