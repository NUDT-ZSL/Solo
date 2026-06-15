import React, { useState, useRef } from 'react';
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  MoreVertical,
  GripVertical
} from 'lucide-react';
import { usePixelState } from '../PixelState';
import { Layer } from '../types';

const LayerPanel: React.FC = () => {
  const { state, dispatch } = usePixelState();
  const project = state.project;
  const frame = project.frames[project.currentFrameIndex];
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const dragDataRef = useRef<{ startY: number; startIndex: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleAddLayer = () => {
    if (frame.layers.length < 8) {
      dispatch({ type: 'ADD_LAYER' });
    }
  };

  const handleDeleteLayer = (id: string) => {
    dispatch({ type: 'DELETE_LAYER', payload: id });
  };

  const handleSelectLayer = (id: string) => {
    dispatch({ type: 'SET_CURRENT_LAYER', payload: id });
  };

  const handleToggleVisible = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const layer = frame.layers.find(l => l.id === id);
    if (layer) {
      dispatch({ type: 'SET_LAYER_VISIBLE', payload: { id, visible: !layer.visible } });
    }
  };

  const handleOpacityChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_LAYER_OPACITY', payload: { id, opacity: Number(e.target.value) } });
  };

  const handleStartRename = (layer: Layer, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(layer.id);
    setEditValue(layer.name);
  };

  const handleCommitRename = (id: string) => {
    if (editValue.trim()) {
      dispatch({ type: 'SET_LAYER_NAME', payload: { id, name: editValue.trim() } });
    }
    setEditingId(null);
  };

  const handleDragStart = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    setDragIndex(index);
    setIsDragging(true);
    dragDataRef.current = { startY: e.clientY, startIndex: index };

    const onMove = (ev: MouseEvent) => {
      if (!dragDataRef.current) return;
      const cardHeight = 74;
      const delta = ev.clientY - dragDataRef.current.startY;
      const offset = Math.round(delta / cardHeight);
      const newIndex = Math.max(0, Math.min(frame.layers.length - 1, dragDataRef.current.startIndex + offset));
      setDragOverIndex(newIndex);
    };

    const onUp = () => {
      if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
        dispatch({ type: 'MOVE_LAYER', payload: { from: dragIndex, to: dragOverIndex } });
      }
      setDragIndex(null);
      setDragOverIndex(null);
      setIsDragging(false);
      dragDataRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const displayLayers = [...frame.layers].reverse();
  const originalIndex = (reversedIdx: number) => frame.layers.length - 1 - reversedIdx;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>图层</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            style={{
              ...styles.iconBtn,
              opacity: frame.layers.length >= 8 ? 0.4 : 1,
              cursor: frame.layers.length >= 8 ? 'not-allowed' : 'pointer'
            }}
            onClick={handleAddLayer}
            title="新建图层 (最多 8 个)"
          >
            <Plus size={16} color="#569cd6" />
          </button>
        </div>
      </div>

      <div style={styles.layerList}>
        {displayLayers.map((layer, revIdx) => {
          const origIdx = originalIndex(revIdx);
          const isActive = layer.id === project.currentLayerId;
          const isBeingDragged = dragIndex === origIdx;
          const insertAbove = dragOverIndex === origIdx && dragIndex !== null && dragIndex !== origIdx;
          const style: React.CSSProperties = {
            ...styles.layerCard,
            ...(isActive ? styles.layerCardActive : {}),
            ...(isBeingDragged ? { opacity: 0.4, backgroundColor: '#0e639c' } : {}),
            ...(isDragging && !isBeingDragged
              ? { transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)' }
              : {})
          };
          if (insertAbove && dragIndex !== null) {
            style.marginTop = dragIndex > origIdx ? '60px' : '0';
            style.marginBottom = dragIndex < origIdx ? '60px' : '0';
          }
          return (
            <div
              key={layer.id}
              style={style}
              onClick={() => handleSelectLayer(layer.id)}
            >
              <div
                style={styles.dragHandle}
                onMouseDown={(e) => handleDragStart(origIdx, e)}
                title="拖动调整顺序"
              >
                <GripVertical size={14} color="#888" />
              </div>

              <div style={styles.layerInfo}>
                {editingId === layer.id ? (
                  <input
                    style={styles.renameInput}
                    value={editValue}
                    autoFocus
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleCommitRename(layer.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCommitRename(layer.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    style={{
                      ...styles.layerName,
                      ...(isActive ? { color: '#569cd6' } : {})
                    }}
                    onDoubleClick={(e) => handleStartRename(layer, e)}
                    title="双击重命名"
                  >
                    {layer.name}
                  </span>
                )}
                <div style={styles.opacityRow}>
                  <span style={styles.opacityLabel}>{layer.opacity}%</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={layer.opacity}
                    style={styles.opacitySlider}
                    onChange={(e) => handleOpacityChange(layer.id, e)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>

              <div style={styles.layerActions}>
                <button
                  style={styles.smallIconBtn}
                  onClick={(e) => handleToggleVisible(layer.id, e)}
                  title={layer.visible ? '隐藏图层' : '显示图层'}
                >
                  {layer.visible ? (
                    <Eye size={14} color="#888" />
                  ) : (
                    <EyeOff size={14} color="#555" />
                  )}
                </button>
                {frame.layers.length > 1 && (
                  <button
                    style={styles.smallIconBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteLayer(layer.id);
                    }}
                    title="删除图层"
                  >
                    <Trash2 size={14} color="#e06c75" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={styles.footerInfo}>
        <span style={{ fontSize: '11px', color: '#666' }}>
          {frame.layers.length}/8 图层
        </span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '240px',
    backgroundColor: '#252526',
    borderLeft: '1px solid #3e3e42',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    boxSizing: 'border-box',
    color: '#ddd',
    userSelect: 'none'
  },
  header: {
    padding: '12px 14px',
    borderBottom: '1px solid #3e3e42',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  title: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#fff'
  },
  iconBtn: {
    width: '30px',
    height: '30px',
    border: '1px solid #444',
    borderRadius: '5px',
    backgroundColor: '#3c3c3c',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    outline: 'none',
    transition: 'all 0.1s'
  },
  layerList: {
    flex: 1,
    overflowY: 'auto',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  layerCard: {
    padding: '8px 10px',
    backgroundColor: '#2d2d2d',
    border: '1px solid #444',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    cursor: 'pointer',
    transition: 'all 0.1s ease',
    position: 'relative'
  },
  layerCardActive: {
    borderColor: '#569cd6',
    backgroundColor: '#1e3a52'
  },
  dragHandle: {
    cursor: 'grab',
    padding: '3px 2px',
    display: 'flex',
    alignItems: 'center',
    marginTop: '2px'
  },
  layerInfo: {
    flex: 1,
    minWidth: 0
  },
  layerName: {
    fontSize: '13px',
    fontWeight: 500,
    display: 'block',
    marginBottom: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  renameInput: {
    fontSize: '13px',
    width: '100%',
    padding: '2px 4px',
    borderRadius: '3px',
    border: '1px solid #569cd6',
    backgroundColor: '#1e1e1e',
    color: '#fff',
    outline: 'none',
    marginBottom: '4px',
    boxSizing: 'border-box'
  },
  opacityRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  opacityLabel: {
    fontSize: '10px',
    color: '#888',
    width: '28px'
  },
  opacitySlider: {
    flex: 1,
    height: '4px',
    accentColor: '#569cd6',
    cursor: 'pointer'
  },
  layerActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  smallIconBtn: {
    width: '24px',
    height: '24px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    outline: 'none',
    transition: 'background 0.1s'
  },
  footerInfo: {
    padding: '8px 14px',
    borderTop: '1px solid #3e3e42',
    textAlign: 'center'
  }
};

export default LayerPanel;
