import React, { useState } from 'react';
import type { LayerData, BlendMode, AnimationType } from './types';
import { BLEND_MODE_LABELS } from './types';

interface LayerPanelProps {
  layers: LayerData[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdateLayer: (id: string, patch: Partial<LayerData>) => void;
  onDeleteLayer: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  selectedId,
  onSelect,
  onUpdateLayer,
  onDeleteLayer,
  onReorder,
}) => {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragIndex(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== idx) {
      onReorder(dragIndex, idx);
    }
    setDragIndex(null);
  };

  return (
    <div className="layer-panel">
      <div className="panel-header">
        <h2>图层</h2>
        <span className="layer-count">{layers.length} 层</span>
      </div>

      <div className="layers-list">
        {layers.length === 0 && (
          <div className="empty-state">
            <p>暂无图层</p>
            <span>点击左上角按钮添加</span>
          </div>
        )}
        {[...layers].reverse().map((layer, revIdx) => {
          const idx = layers.length - 1 - revIdx;
          const selected = layer.id === selectedId;
          return (
            <div
              key={layer.id}
              className={`layer-card ${selected ? 'selected' : ''}`}
              onClick={() => onSelect(layer.id)}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, idx)}
            >
              <div className="layer-thumb-wrap">
                <div className="layer-thumb" style={{ borderColor: selected ? '#4a90d9' : '#ccc' }}>
                  <img src={layer.src} alt="" draggable={false} />
                </div>
                {layer.animation.enabled && (
                  <div className="anim-indicator" title="微动画已开启">
                    <div className="anim-dot" />
                  </div>
                )}
              </div>

              <div className="layer-info">
                <div className="layer-title-row">
                  <span className="layer-name">
                    {layer.type === 'image' ? '图片' : '手绘'} #{idx + 1}
                  </span>
                  <button
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteLayer(layer.id);
                    }}
                    title="删除图层"
                  >
                    ×
                  </button>
                </div>

                {selected && (
                  <div className="layer-controls" onClick={(e) => e.stopPropagation()}>
                    <div className="control-group">
                      <label>
                        <span>透明度</span>
                        <div className="slider-wrap">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={Math.round(layer.opacity * 100)}
                            onChange={(e) =>
                              onUpdateLayer(layer.id, { opacity: Number(e.target.value) / 100 })
                            }
                            className="md-slider"
                          />
                          <span className="slider-value">{Math.round(layer.opacity * 100)}%</span>
                        </div>
                      </label>
                    </div>

                    <div className="control-group">
                      <label>
                        <span>混合模式</span>
                        <select
                          value={layer.blendMode}
                          onChange={(e) =>
                            onUpdateLayer(layer.id, { blendMode: e.target.value as BlendMode })
                          }
                          className="md-select"
                        >
                          {(Object.keys(BLEND_MODE_LABELS) as BlendMode[]).map((m) => (
                            <option key={m} value={m}>
                              {BLEND_MODE_LABELS[m]}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="control-group">
                      <label>
                        <span>缩放</span>
                        <div className="slider-wrap">
                          <input
                            type="range"
                            min="10"
                            max="300"
                            value={Math.round(layer.transform.scale * 100)}
                            onChange={(e) =>
                              onUpdateLayer(layer.id, {
                                transform: {
                                  ...layer.transform,
                                  scale: Number(e.target.value) / 100,
                                },
                              })
                            }
                            className="md-slider"
                          />
                          <span className="slider-value">{Math.round(layer.transform.scale * 100)}%</span>
                        </div>
                      </label>
                    </div>

                    <div className="control-group">
                      <label>
                        <span>旋转</span>
                        <div className="slider-wrap">
                          <input
                            type="range"
                            min="0"
                            max="360"
                            step="1"
                            value={layer.transform.rotation}
                            onChange={(e) =>
                              onUpdateLayer(layer.id, {
                                transform: {
                                  ...layer.transform,
                                  rotation: Number(e.target.value),
                                },
                              })
                            }
                            className="md-slider"
                          />
                          <span className="slider-value">{layer.transform.rotation}°</span>
                        </div>
                      </label>
                    </div>

                    <div className="control-group anim-section">
                      <div className="anim-toggle-row">
                        <span>微动画</span>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={layer.animation.enabled}
                            onChange={(e) =>
                              onUpdateLayer(layer.id, {
                                animation: {
                                  ...layer.animation,
                                  enabled: e.target.checked,
                                },
                              })
                            }
                          />
                          <span className="toggle-slider" />
                        </label>
                      </div>

                      {layer.animation.enabled && (
                        <div className="anim-controls">
                          <label>
                            <span>类型</span>
                            <select
                              value={layer.animation.type}
                              onChange={(e) =>
                                onUpdateLayer(layer.id, {
                                  animation: {
                                    ...layer.animation,
                                    type: e.target.value as AnimationType,
                                  },
                                })
                              }
                              className="md-select"
                            >
                              <option value="sine">正弦波</option>
                              <option value="noise">噪波</option>
                            </select>
                          </label>
                          <label>
                            <span>振幅 (px)</span>
                            <div className="slider-wrap">
                              <input
                                type="range"
                                min="1"
                                max="20"
                                value={layer.animation.amplitude}
                                onChange={(e) =>
                                  onUpdateLayer(layer.id, {
                                    animation: {
                                      ...layer.animation,
                                      amplitude: Number(e.target.value),
                                    },
                                  })
                                }
                                className="md-slider"
                              />
                              <span className="slider-value">{layer.animation.amplitude}</span>
                            </div>
                          </label>
                          <label>
                            <span>频率 (Hz)</span>
                            <div className="slider-wrap">
                              <input
                                type="range"
                                min="1"
                                max="50"
                                value={Math.round(layer.animation.frequency * 10)}
                                onChange={(e) =>
                                  onUpdateLayer(layer.id, {
                                    animation: {
                                      ...layer.animation,
                                      frequency: Number(e.target.value) / 10,
                                    },
                                  })
                                }
                                className="md-slider"
                              />
                              <span className="slider-value">{(layer.animation.frequency).toFixed(1)}</span>
                            </div>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LayerPanel;
