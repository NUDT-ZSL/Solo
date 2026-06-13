import React, { useState, memo, useRef, useEffect } from 'react';
import {
  DeleteOutlined,
  SwapOutlined,
  SoundOutlined,
  FilterOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { EffectInstance, EffectType, LowpassParams, ReverbParams, DelayParams } from '../core/AudioEngine';
import AudioEngine from '../core/AudioEngine';

interface EffectRackProps {
  effects: EffectInstance[];
  engine: AudioEngine | null;
  onReorder: (newOrderIds: string[]) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onAdjust: (id: string, params: any) => void;
  onDropEffect: (type: EffectType) => void;
}

interface EffectCardProps {
  effect: EffectInstance;
  index: number;
  isDragging: boolean;
  dragOverId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragLeave: () => void;
  onDrop: (id: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onOpenPanel: (id: string) => void;
  isPanelOpen: boolean;
}

const effectIcons: Record<EffectType, React.ReactNode> = {
  lowpass: <FilterOutlined />,
  reverb: <SoundOutlined />,
  delay: <ClockCircleOutlined />,
};

const effectNames: Record<EffectType, string> = {
  lowpass: '低通滤波',
  reverb: '混响',
  delay: '延迟',
};

const EffectCard: React.FC<EffectCardProps> = ({
  effect,
  isDragging,
  dragOverId,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onToggle,
  onRemove,
  onOpenPanel,
  isPanelOpen,
}) => {
  const isDragOver = dragOverId === effect.id;

  return (
    <div
      className={`effect-card ${effect.enabled ? 'enabled' : 'disabled'} ${isDragging ? 'dragging' : ''} ${
        isDragOver ? 'drag-over' : ''
      }`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', effect.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(effect.id);
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onDragOver(e, effect.id);
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(effect.id);
      }}
      onClick={() => onOpenPanel(effect.id)}
    >
      <div className={`effect-indicator ${effect.enabled ? 'active' : ''}`} />
      <div className="effect-icon">{effectIcons[effect.type]}</div>
      <div className="effect-info">
        <div className="effect-name">{effectNames[effect.type]}</div>
        <div className="effect-status">{effect.enabled ? '已启用' : '已禁用'}</div>
      </div>
      <div className="effect-actions" onClick={(e) => e.stopPropagation()}>
        <button
          className={`toggle-btn ${effect.enabled ? 'on' : 'off'}`}
          onClick={() => onToggle(effect.id)}
          title={effect.enabled ? '禁用' : '启用'}
        >
          <div className="toggle-thumb" />
        </button>
        <button className="remove-btn" onClick={() => onRemove(effect.id)} title="移除">
          <DeleteOutlined />
        </button>
      </div>
      <div className="drag-handle">
        <SwapOutlined />
      </div>
    </div>
  );
};

const EffectPanel: React.FC<{
  effect: EffectInstance;
  onClose: () => void;
  onAdjust: (id: string, params: any) => void;
}> = ({ effect, onClose, onAdjust }) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const renderParams = () => {
    switch (effect.type) {
      case 'lowpass': {
        const params = effect.params as LowpassParams;
        return (
          <>
            <div className="param-item">
              <label>截止频率</label>
              <div className="param-value">{Math.round(params.frequency)} Hz</div>
              <input
                type="range"
                min="20"
                max="20000"
                step="10"
                value={params.frequency}
                onChange={(e) => onAdjust(effect.id, { frequency: Number(e.target.value) })}
              />
            </div>
            <div className="param-item">
              <label>Q 值 (共振)</label>
              <div className="param-value">{params.Q.toFixed(2)}</div>
              <input
                type="range"
                min="0.1"
                max="20"
                step="0.1"
                value={params.Q}
                onChange={(e) => onAdjust(effect.id, { Q: Number(e.target.value) })}
              />
            </div>
          </>
        );
      }
      case 'reverb': {
        const params = effect.params as ReverbParams;
        return (
          <>
            <div className="param-item">
              <label>衰减时间</label>
              <div className="param-value">{params.decay.toFixed(1)} 秒</div>
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={params.decay}
                onChange={(e) => onAdjust(effect.id, { decay: Number(e.target.value) })}
              />
            </div>
            <div className="param-item">
              <label>干湿比</label>
              <div className="param-value">{Math.round(params.wet * 100)}%</div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={params.wet}
                onChange={(e) => onAdjust(effect.id, { wet: Number(e.target.value) })}
              />
            </div>
          </>
        );
      }
      case 'delay': {
        const params = effect.params as DelayParams;
        return (
          <>
            <div className="param-item">
              <label>延迟时间</label>
              <div className="param-value">{params.time.toFixed(2)} 秒</div>
              <input
                type="range"
                min="0.01"
                max="2"
                step="0.01"
                value={params.time}
                onChange={(e) => onAdjust(effect.id, { time: Number(e.target.value) })}
              />
            </div>
            <div className="param-item">
              <label>反馈量</label>
              <div className="param-value">{Math.round(params.feedback * 100)}%</div>
              <input
                type="range"
                min="0"
                max="0.9"
                step="0.01"
                value={params.feedback}
                onChange={(e) => onAdjust(effect.id, { feedback: Number(e.target.value) })}
              />
            </div>
            <div className="param-item">
              <label>干湿比</label>
              <div className="param-value">{Math.round(params.wet * 100)}%</div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={params.wet}
                onChange={(e) => onAdjust(effect.id, { wet: Number(e.target.value) })}
              />
            </div>
          </>
        );
      }
    }
  };

  return (
    <div ref={panelRef} className="effect-panel">
      <div className="panel-header">
        <div className="panel-icon">{effectIcons[effect.type]}</div>
        <div className="panel-title">{effectNames[effect.type]} 参数</div>
        <button className="panel-close" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="panel-body">{renderParams()}</div>
    </div>
  );
};

const EffectRack: React.FC<EffectRackProps> = ({
  effects,
  engine,
  onReorder,
  onToggle,
  onRemove,
  onAdjust,
  onDropEffect,
}) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [openPanelId, setOpenPanelId] = useState<string | null>(null);
  const [isDragOverRack, setIsDragOverRack] = useState(false);

  const handleDragStart = (id: string) => {
    setDraggingId(id);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleDragOver = (_e: React.DragEvent, id: string) => {
    if (draggingId && draggingId !== id) {
      setDragOverId(id);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (targetId: string) => {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }

    const newOrder = effects.map((e) => e.id);
    const fromIndex = newOrder.indexOf(draggingId);
    const toIndex = newOrder.indexOf(targetId);

    if (fromIndex !== -1 && toIndex !== -1) {
      newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, draggingId);
      onReorder(newOrder);
    }

    setDraggingId(null);
    setDragOverId(null);
  };

  const handleRackDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOverRack(true);
  };

  const handleRackDragLeave = () => {
    setIsDragOverRack(false);
  };

  const handleRackDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverRack(false);

    const effectType = e.dataTransfer.getData('effect-type') as EffectType;
    if (effectType && ['lowpass', 'reverb', 'delay'].includes(effectType)) {
      onDropEffect(effectType);
    }
  };

  const sortedEffects = [...effects].sort((a, b) => a.order - b.order);

  return (
    <div
      className={`effect-rack ${isDragOverRack ? 'drag-over' : ''}`}
      onDragOver={handleRackDragOver}
      onDragLeave={handleRackDragLeave}
      onDrop={handleRackDrop}
    >
      <div className="rack-label">效果器链</div>
      <div className="rack-cards">
        {sortedEffects.length === 0 ? (
          <div className="empty-rack-placeholder">
            <SoundOutlined />
            <span>从左侧拖拽效果器到这里</span>
          </div>
        ) : (
          sortedEffects.map((effect) => (
            <div key={effect.id} className="effect-card-wrapper">
              <EffectCard
                effect={effect}
                index={effect.order}
                isDragging={draggingId === effect.id}
                dragOverId={dragOverId}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onToggle={onToggle}
                onRemove={onRemove}
                onOpenPanel={setOpenPanelId}
                isPanelOpen={openPanelId === effect.id}
              />
              {openPanelId === effect.id && (
                <EffectPanel effect={effect} onClose={() => setOpenPanelId(null)} onAdjust={onAdjust} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default memo(EffectRack);
