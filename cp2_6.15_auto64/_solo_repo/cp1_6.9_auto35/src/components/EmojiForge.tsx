import React, { useState, useMemo, useRef } from 'react';
import { EMOTION_BLOCKS, MAX_BLOCKS } from '../constants';
import { fuseColors, generateExpression } from '../utils';
import type { EmotionBlock, ExpressionFeatures, SpiritCreatePayload } from '../types';
import SpiritFace from './SpiritFace';
import { useBreathingGlow } from '../hooks/useBreathingGlow';

interface EmojiForgeProps {
  onCreated: () => void;
  onError: (message: string) => void;
}

const EmojiForge: React.FC<EmojiForgeProps> = ({ onCreated, onError }) => {
  const [placedBlocks, setPlacedBlocks] = useState<EmotionBlock[]>([]);
  const [spiritName, setSpiritName] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const previewHeadRef = useRef<HTMLDivElement>(null);

  const fusedColor = useMemo(() => fuseColors(placedBlocks), [placedBlocks]);
  const expression = useMemo<ExpressionFeatures>(
    () => generateExpression(placedBlocks.map((b) => b.id)),
    [placedBlocks]
  );

  useBreathingGlow(previewHeadRef as React.RefObject<HTMLElement>, fusedColor, {
    minOpacity: 0.8,
    maxOpacity: 1.0,
    period: 2,
  });

  const handleDragStart = (e: React.DragEvent, block: EmotionBlock) => {
    e.dataTransfer.setData('blockId', block.id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const blockId = e.dataTransfer.getData('blockId');
    if (!blockId) return;

    if (placedBlocks.length >= MAX_BLOCKS) {
      onError(`最多只能叠加 ${MAX_BLOCKS} 个色块`);
      return;
    }

    const block = EMOTION_BLOCKS.find((b) => b.id === blockId);
    if (!block) return;

    setPlacedBlocks((prev) => [...prev, block]);
  };

  const handleRemoveBlock = (index: number) => {
    setPlacedBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    setPlacedBlocks([]);
    setSpiritName('');
  };

  const handleSave = async () => {
    if (placedBlocks.length === 0) {
      onError('请至少放入一个情绪色块');
      return;
    }

    if (!spiritName.trim()) {
      onError('请为精灵起一个名字');
      return;
    }

    if (spiritName.length > 10) {
      onError('精灵名称不能超过10个字符');
      return;
    }

    setIsSaving(true);

    const payload: SpiritCreatePayload = {
      name: spiritName.trim(),
      fusedColor,
      expression,
      blockOrder: placedBlocks.map((b) => b.id),
    };

    try {
      const res = await fetch('/api/spirits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '保存失败');
      }

      handleClearAll();
      onCreated();
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存失败，请重试';
      onError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="forge-layout">
      <aside className="sidebar">
        <div className="sidebar-title">情绪色块</div>
        <div className="block-list">
          {EMOTION_BLOCKS.map((block) => (
            <div
              key={block.id}
              className="emotion-block"
              draggable
              onDragStart={(e) => handleDragStart(e, block)}
              style={{ backgroundColor: block.color }}
            >
              <span className="emotion-block-emoji">{block.emoji}</span>
              <span className="emotion-block-name">{block.name}</span>
            </div>
          ))}
        </div>
      </aside>

      <section className="canvas-area">
        <h2 className="canvas-title">✨ 拖拽色块，锻造你的专属精灵</h2>

        <div
          className={`drop-zone ${isDraggingOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {placedBlocks.length === 0 ? (
            <div className="drop-zone-hint">
              👆 从左侧拖拽色块到此处
              <br />
              <span style={{ opacity: 0.6, fontSize: '12px' }}>
                最多可叠加 {MAX_BLOCKS} 个情绪
              </span>
            </div>
          ) : (
            placedBlocks.map((block, index) => (
              <div
                key={`${block.id}-${index}`}
                className="placed-block"
                style={{ backgroundColor: block.color }}
                onClick={() => handleRemoveBlock(index)}
                title="点击移除"
              >
                <span className="placed-block-order">{index + 1}</span>
                <span className="placed-block-emoji">{block.emoji}</span>
                <span className="placed-block-name">{block.name}</span>
              </div>
            ))
          )}
        </div>

        <div className="preview-container">
          <div
            className="preview-backdrop"
            style={{
              background:
                placedBlocks.length > 0
                  ? `radial-gradient(circle, ${fusedColor}26 0%, transparent 70%)`
                  : 'transparent',
            }}
          >
            <div
              ref={previewHeadRef}
              className="spirit-head preview"
              style={{ backgroundColor: fusedColor }}
            >
              {placedBlocks.length > 0 && <SpiritFace expression={expression} size="md" />}
            </div>
          </div>

          <div className="name-input-group">
            <label className="name-label">为你的精灵命名（最多10字）</label>
            <input
              type="text"
              className="name-input"
              placeholder="输入一个好听的名字..."
              value={spiritName}
              onChange={(e) => setSpiritName(e.target.value.slice(0, 10))}
              maxLength={10}
            />
            <button
              className="save-btn"
              onClick={handleSave}
              disabled={isSaving || placedBlocks.length === 0 || !spiritName.trim()}
            >
              {isSaving ? '锻造中...' : '⚒️ 锻造并保存精灵'}
            </button>
            {placedBlocks.length > 0 && (
              <button
                onClick={handleClearAll}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.5)',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => {
                  (e.target as HTMLButtonElement).style.color = 'rgba(255,255,255,0.8)';
                  (e.target as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.3)';
                }}
                onMouseOut={(e) => {
                  (e.target as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)';
                  (e.target as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)';
                }}
              >
                清空画布
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default EmojiForge;
