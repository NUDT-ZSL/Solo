import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { saveAs } from 'file-saver';
import type {
  TextureParams,
  TextureLayer,
  GradientStop,
  BlendMode,
  GradientType,
  TextureType
} from './types';
import {
  TEXTURE_TYPE_LABELS,
  BLEND_MODE_LABELS,
  GRADIENT_TYPE_LABELS
} from './types';
import { textureSynthesizer } from './textureSynthesizer';
import {
  PRESETS,
  defaultTextureParams,
  generateRandomParams,
  createDefaultLayer,
  generateId,
  createDefaultGradientStops
} from './presets';
import { useHistory, formatRgb } from './utils';

const PREVIEW_SIZE = 512;
const EXPORT_SIZE = 1024;

const LAYER_ICONS: Record<TextureType, string> = {
  noise: '✨',
  stripes: '📊',
  waves: '🌊',
  grid: '🔲'
};

const LAYER_TYPES: TextureType[] = ['noise', 'stripes', 'waves', 'grid'];

function App() {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const gradientPreviewRef = useRef<HTMLDivElement>(null);
  const pixelInfoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { currentParams, pushState, undo, redo, canUndo, canRedo } =
    useHistory(defaultTextureParams);

  const [params, setParams] = useState<TextureParams>(currentParams);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [pixelInfo, setPixelInfo] = useState<{
    x: number;
    y: number;
    r: number;
    g: number;
    b: number;
  } | null>(null);
  const [showPixelInfo, setShowPixelInfo] = useState(false);
  const [previewImageData, setPreviewImageData] = useState<ImageData | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  const renderTexture = useCallback(
    (size: number = PREVIEW_SIZE): HTMLCanvasElement => {
      return textureSynthesizer.synthesize(params, size);
    },
    [params]
  );

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    setIsRendering(true);
    requestAnimationFrame(() => {
      try {
        const result = renderTexture(PREVIEW_SIZE);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
          ctx.drawImage(result, 0, 0);
          setPreviewImageData(ctx.getImageData(0, 0, PREVIEW_SIZE, PREVIEW_SIZE));
        }
      } finally {
        setIsRendering(false);
      }
    });
  }, [renderTexture]);

  const updateParams = useCallback(
    (updater: (prev: TextureParams) => TextureParams, commit: boolean = true) => {
      setParams((prev) => {
        const newParams = updater(prev);
        if (commit) {
          queueMicrotask(() => pushState(newParams));
        }
        return newParams;
      });
    },
    [pushState]
  );

  const updateParamsLive = useCallback(
    (updater: (prev: TextureParams) => TextureParams) => {
      setParams((prev) => updater(prev));
    },
    []
  );

  const commitParams = useCallback(() => {
    pushState(params);
  }, [params, pushState]);

  useEffect(() => {
    const el = gradientPreviewRef.current;
    if (!el) return;

    const { gradient } = params;
    if (!gradient.enabled || gradient.stops.length < 2) {
      el.style.background = 'var(--bg-primary)';
      return;
    }

    const sortedStops = [...gradient.stops].sort((a, b) => a.position - b.position);
    const colorStops = sortedStops
      .map((s) => `${s.color} ${s.position}%`)
      .join(', ');

    if (gradient.type === 'linear') {
      el.style.background = `linear-gradient(${gradient.angle}deg, ${colorStops})`;
    } else {
      el.style.background = `radial-gradient(circle, ${colorStops})`;
    }
  }, [params.gradient]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!previewImageData || isRendering) return;

      const canvas = previewCanvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);

      if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return;

      const index = (y * canvas.width + x) * 4;
      const data = previewImageData.data;

      setPixelInfo({
        x,
        y,
        r: data[index],
        g: data[index + 1],
        b: data[index + 2]
      });

      if (pixelInfoTimeoutRef.current) {
        clearTimeout(pixelInfoTimeoutRef.current);
      }
      setShowPixelInfo(true);
    },
    [previewImageData, isRendering]
  );

  const handleMouseLeave = useCallback(() => {
    pixelInfoTimeoutRef.current = setTimeout(() => {
      setShowPixelInfo(false);
    }, 300);
  }, []);

  const handleExport = useCallback(() => {
    setIsRendering(true);
    setTimeout(() => {
      try {
        const result = textureSynthesizer.synthesize(params, EXPORT_SIZE);
        result.toBlob((blob) => {
          if (blob) {
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
            saveAs(blob, `texture-loom-${timestamp}.png`);
          }
          setIsRendering(false);
        }, 'image/png');
      } catch {
        setIsRendering(false);
      }
    }, 50);
  }, [params]);

  const handleUndo = useCallback(() => {
    undo();
  }, [undo]);

  const handleRedo = useCallback(() => {
    redo();
  }, [redo]);

  useEffect(() => {
    setParams(currentParams);
  }, [currentParams]);

  const updateLayer = useCallback(
    (
      layerId: string,
      updates: Partial<TextureLayer>,
      live: boolean = false
    ) => {
      const updater = (prev: TextureParams): TextureParams => ({
        ...prev,
        layers: prev.layers.map((l) =>
          l.id === layerId ? { ...l, ...updates } : l
        )
      });
      if (live) {
        updateParamsLive(updater);
      } else {
        updateParams(updater);
      }
    },
    [updateParams, updateParamsLive]
  );

  const removeLayer = useCallback(
    (layerId: string) => {
      updateParams((prev) => ({
        ...prev,
        layers: prev.layers.filter((l) => l.id !== layerId)
      }));
    },
    [updateParams]
  );

  const addLayer = useCallback(
    (type: TextureType) => {
      updateParams((prev) => ({
        ...prev,
        layers: [...prev.layers, createDefaultLayer(type)]
      }));
    },
    [updateParams]
  );

  const moveLayer = useCallback(
    (fromIndex: number, toIndex: number) => {
      updateParams((prev) => {
        const newLayers = [...prev.layers];
        const [moved] = newLayers.splice(fromIndex, 1);
        newLayers.splice(toIndex, 0, moved);
        return { ...prev, layers: newLayers };
      });
    },
    [updateParams]
  );

  const handleDragStart = useCallback((e: React.DragEvent, layerId: string) => {
    setIsDragging(layerId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', layerId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, layerId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(layerId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      const sourceId = e.dataTransfer.getData('text/plain') || isDragging;
      setIsDragging(null);
      setDragOverId(null);

      if (!sourceId || sourceId === targetId) return;

      const fromIndex = params.layers.findIndex((l) => l.id === sourceId);
      const toIndex = params.layers.findIndex((l) => l.id === targetId);

      if (fromIndex !== -1 && toIndex !== -1) {
        moveLayer(fromIndex, toIndex);
      }
    },
    [isDragging, params.layers, moveLayer]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(null);
    setDragOverId(null);
  }, []);

  const updateGradient = useCallback(
    (updates: Partial<TextureParams['gradient']>, live: boolean = false) => {
      const updater = (prev: TextureParams): TextureParams => ({
        ...prev,
        gradient: { ...prev.gradient, ...updates }
      });
      if (live) {
        updateParamsLive(updater);
      } else {
        updateParams(updater);
      }
    },
    [updateParams, updateParamsLive]
  );

  const updateGradientStop = useCallback(
    (stopId: string, updates: Partial<GradientStop>, live: boolean = false) => {
      const updater = (prev: TextureParams): TextureParams => ({
        ...prev,
        gradient: {
          ...prev.gradient,
          stops: prev.gradient.stops.map((s) =>
            s.id === stopId ? { ...s, ...updates } : s
          )
        }
      });
      if (live) {
        updateParamsLive(updater);
      } else {
        updateParams(updater);
      }
    },
    [updateParams, updateParamsLive]
  );

  const addGradientStop = useCallback(
    (position: number) => {
      if (params.gradient.stops.length >= 5) return;

      const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181'];
      const newColor = colors[params.gradient.stops.length % colors.length];

      updateParams((prev) => ({
        ...prev,
        gradient: {
          ...prev.gradient,
          stops: [
            ...prev.gradient.stops,
            { id: generateId(), position, color: newColor }
          ]
        }
      }));
    },
    [params.gradient.stops.length, updateParams]
  );

  const removeGradientStop = useCallback(
    (stopId: string) => {
      if (params.gradient.stops.length <= 2) return;

      updateParams((prev) => ({
        ...prev,
        gradient: {
          ...prev.gradient,
          stops: prev.gradient.stops.filter((s) => s.id !== stopId)
        }
      }));
      setSelectedStopId(null);
    },
    [params.gradient.stops.length, updateParams]
  );

  const handleStopDrag = useCallback(
    (e: React.MouseEvent, stopId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedStopId(stopId);

      const previewEl = gradientPreviewRef.current;
      if (!previewEl) return;

      const startX = e.clientX;
      const rect = previewEl.getBoundingClientRect();
      const stop = params.gradient.stops.find((s) => s.id === stopId);
      if (!stop) return;
      const startPos = stop.position;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaPos = (deltaX / rect.width) * 100;
        let newPos = Math.max(0, Math.min(100, startPos + deltaPos));
        newPos = Math.round(newPos);
        updateGradientStop(stopId, { position: newPos }, true);
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        commitParams();
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [params.gradient.stops, updateGradientStop, commitParams]
  );

  const handleGradientPreviewClick = useCallback(
    (e: React.MouseEvent) => {
      if (params.gradient.stops.length >= 5) return;

      const previewEl = gradientPreviewRef.current;
      if (!previewEl) return;

      const rect = previewEl.getBoundingClientRect();
      const position = Math.round(((e.clientX - rect.left) / rect.width) * 100);
      addGradientStop(Math.max(0, Math.min(100, position)));
    },
    [params.gradient.stops.length, addGradientStop]
  );

  const applyPreset = useCallback(
    (presetId: string) => {
      const preset = PRESETS.find((p) => p.id === presetId);
      if (!preset) return;

      const newParams: TextureParams = {
        backgroundColor: preset.backgroundColor,
        layers: preset.layers.map((l) => ({ ...l, id: generateId() })),
        gradient: {
          ...preset.gradient,
          stops: preset.gradient.stops.map((s) => ({ ...s, id: generateId() }))
        }
      };

      setParams(newParams);
      pushState(newParams);
    },
    [pushState]
  );

  const handleRandomize = useCallback(() => {
    const newParams = generateRandomParams();
    setParams(newParams);
    pushState(newParams);
  }, [pushState]);

  const updateBackgroundColor = useCallback(
    (color: string) => {
      updateParamsLive((prev) => ({ ...prev, backgroundColor: color }));
    },
    [updateParamsLive]
  );

  const sortedStops = useMemo(
    () => [...params.gradient.stops].sort((a, b) => a.position - b.position),
    [params.gradient.stops]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')
      ) {
        e.preventDefault();
        handleRedo();
      }
    },
    [handleUndo, handleRedo]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="app">
      <div
        className={`mobile-overlay ${mobilePanelOpen ? 'visible' : ''}`}
        onClick={() => setMobilePanelOpen(false)}
      />

      <aside
        className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobilePanelOpen ? 'mobile-open' : ''}`}
      >
        <div className="sidebar-header">
          <div className="sidebar-title">
            <div className="logo-icon">T</div>
            <h1>纹理织机</h1>
          </div>
          <button
            className="toggle-btn"
            onClick={() => setSidebarCollapsed(true)}
            title="折叠面板"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>

        <div className="sidebar-content">
          <div className="section">
            <div className="section-header">
              <span className="section-title">历史记录</span>
            </div>
            <div className="history-controls">
              <button
                className="history-btn"
                onClick={handleUndo}
                disabled={!canUndo}
                title="撤销 (Ctrl+Z)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7v6h6" />
                  <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                </svg>
                撤销
              </button>
              <button
                className="history-btn"
                onClick={handleRedo}
                disabled={!canRedo}
                title="重做 (Ctrl+Y)"
              >
                重做
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 7v6h-6" />
                  <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
                </svg>
              </button>
            </div>
          </div>

          <div className="section">
            <div className="section-header">
              <span className="section-title">背景颜色</span>
            </div>
            <div className="bg-color-row">
              <div className="bg-color-left">
                <input
                  type="color"
                  className="color-input"
                  value={params.backgroundColor}
                  onChange={(e) => updateBackgroundColor(e.target.value)}
                  onMouseUp={commitParams}
                />
                <span className="bg-color-label">背景底色</span>
              </div>
              <span className="color-value">{params.backgroundColor.toUpperCase()}</span>
            </div>
          </div>

          <div className="section">
            <div className="section-header">
              <span className="section-title">纹理图层</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {LAYER_TYPES.map((type) => (
                  <button
                    key={type}
                    className="btn-icon"
                    onClick={() => addLayer(type)}
                    title={`添加${TEXTURE_TYPE_LABELS[type]}图层`}
                    style={{ fontSize: '16px' }}
                  >
                    {LAYER_ICONS[type]}
                  </button>
                ))}
              </div>
            </div>

            {params.layers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🎨</div>
                <div>暂无图层，点击上方按钮添加</div>
              </div>
            ) : (
              <div className="layer-list">
                {params.layers.map((layer, layerIndex) => (
                  <div
                    key={layer.id}
                    className={`layer-item ${isDragging === layer.id ? 'dragging' : ''} ${dragOverId === layer.id ? 'drag-over' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, layer.id)}
                    onDragOver={(e) => handleDragOver(e, layer.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, layer.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="layer-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="drag-handle" title="拖拽排序">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="9" cy="6" r="1.5" />
                            <circle cx="15" cy="6" r="1.5" />
                            <circle cx="9" cy="12" r="1.5" />
                            <circle cx="15" cy="12" r="1.5" />
                            <circle cx="9" cy="18" r="1.5" />
                            <circle cx="15" cy="18" r="1.5" />
                          </svg>
                        </span>
                        <div className="layer-icon">{LAYER_ICONS[layer.type]}</div>
                        <span className="layer-title">
                          {TEXTURE_TYPE_LABELS[layer.type]}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="control-value">#{layerIndex + 1}</span>
                        <button
                          className="btn-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeLayer(layer.id);
                          }}
                          title="删除图层"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="control-group">
                      <div className="control-row">
                        <span className="control-label">强度</span>
                        <span className="control-value">{layer.intensity}%</span>
                      </div>
                      <div className="slider-wrapper">
                        <input
                          type="range"
                          className="slider"
                          min="0"
                          max="100"
                          value={layer.intensity}
                          onChange={(e) =>
                            updateLayer(
                              layer.id,
                              { intensity: parseInt(e.target.value) },
                              true
                            )
                          }
                          onMouseUp={commitParams}
                          onTouchEnd={commitParams}
                        />
                      </div>
                    </div>

                    <div className="control-group">
                      <div className="control-row">
                        <span className="control-label">颜色</span>
                      </div>
                      <div className="color-input-wrapper">
                        <input
                          type="color"
                          className="color-input"
                          value={layer.color}
                          onChange={(e) =>
                            updateLayer(layer.id, { color: e.target.value }, true)
                          }
                          onMouseUp={commitParams}
                          onTouchEnd={commitParams}
                        />
                        <span className="color-value">{layer.color.toUpperCase()}</span>
                      </div>
                    </div>

                    <div className="control-group">
                      <div className="control-row">
                        <span className="control-label">缩放</span>
                        <span className="control-value">{layer.scale.toFixed(1)}</span>
                      </div>
                      <div className="slider-wrapper">
                        <input
                          type="range"
                          className="slider"
                          min="1"
                          max="20"
                          step="0.5"
                          value={layer.scale}
                          onChange={(e) =>
                            updateLayer(
                              layer.id,
                              { scale: parseFloat(e.target.value) },
                              true
                            )
                          }
                          onMouseUp={commitParams}
                          onTouchEnd={commitParams}
                        />
                      </div>
                    </div>

                    <div className="control-group">
                      <div className="control-row">
                        <span className="control-label">角度</span>
                        <span className="control-value">{layer.angle}°</span>
                      </div>
                      <div className="slider-wrapper">
                        <input
                          type="range"
                          className="slider"
                          min="-180"
                          max="180"
                          value={layer.angle}
                          onChange={(e) =>
                            updateLayer(
                              layer.id,
                              { angle: parseInt(e.target.value) },
                              true
                            )
                          }
                          onMouseUp={commitParams}
                          onTouchEnd={commitParams}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="section">
            <div className="section-header">
              <span className="section-title">渐变叠加</span>
              <div className="switch-wrapper">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={params.gradient.enabled}
                    onChange={(e) =>
                      updateGradient({ enabled: e.target.checked })
                    }
                  />
                  <span className="switch-slider" />
                </label>
              </div>
            </div>

            {params.gradient.enabled && (
              <div className="gradient-editor">
                <div className="control-group">
                  <div className="control-row">
                    <span className="control-label">渐变类型</span>
                  </div>
                  <select
                    className="select"
                    value={params.gradient.type}
                    onChange={(e) =>
                      updateGradient({
                        type: e.target.value as GradientType
                      })
                    }
                  >
                    {(Object.keys(GRADIENT_TYPE_LABELS) as GradientType[]).map(
                      (type) => (
                        <option key={type} value={type}>
                          {GRADIENT_TYPE_LABELS[type]}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {params.gradient.type === 'linear' && (
                  <div className="control-group">
                    <div className="control-row">
                      <span className="control-label">渐变角度</span>
                      <span className="control-value">{params.gradient.angle}°</span>
                    </div>
                    <div className="slider-wrapper">
                      <input
                        type="range"
                        className="slider"
                        min="0"
                        max="360"
                        value={params.gradient.angle}
                        onChange={(e) =>
                          updateGradient(
                            { angle: parseInt(e.target.value) },
                            true
                          )
                        }
                        onMouseUp={commitParams}
                        onTouchEnd={commitParams}
                      />
                    </div>
                  </div>
                )}

                <div className="control-group">
                  <div className="control-row">
                    <span className="control-label">混合模式</span>
                  </div>
                  <select
                    className="select"
                    value={params.gradient.blendMode}
                    onChange={(e) =>
                      updateGradient({
                        blendMode: e.target.value as BlendMode
                      })
                    }
                  >
                    {(Object.keys(BLEND_MODE_LABELS) as BlendMode[]).map(
                      (mode) => (
                        <option key={mode} value={mode}>
                          {BLEND_MODE_LABELS[mode]}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="control-group">
                  <div className="control-row">
                    <span className="control-label">不透明度</span>
                    <span className="control-value">{params.gradient.opacity}%</span>
                  </div>
                  <div className="slider-wrapper">
                    <input
                      type="range"
                      className="slider"
                      min="0"
                      max="100"
                      value={params.gradient.opacity}
                      onChange={(e) =>
                        updateGradient(
                          { opacity: parseInt(e.target.value) },
                          true
                        )
                      }
                      onMouseUp={commitParams}
                      onTouchEnd={commitParams}
                    />
                  </div>
                </div>

                <div className="control-group">
                  <div className="control-row">
                    <span className="control-label">
                      色标（{params.gradient.stops.length}/5）
                    </span>
                    {selectedStopId && params.gradient.stops.length > 2 && (
                      <button
                        className="btn-icon"
                        onClick={() => removeGradientStop(selectedStopId)}
                        title="删除选中色标"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div
                    className="gradient-preview"
                    ref={gradientPreviewRef}
                    onClick={handleGradientPreviewClick}
                    style={{ cursor: params.gradient.stops.length < 5 ? 'pointer' : 'default' }}
                  >
                    <div className="gradient-stops">
                      {sortedStops.map((stop) => (
                        <div
                          key={stop.id}
                          className={`gradient-stop ${selectedStopId === stop.id ? 'selected' : ''}`}
                          style={{ left: `${stop.position}%` }}
                          onMouseDown={(e) => handleStopDrag(e, stop.id)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStopId(stop.id);
                          }}
                        >
                          <div
                            className="stop-color"
                            style={{ background: stop.color }}
                          />
                          <div className="stop-triangle" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedStopId && (
                    <div style={{ marginTop: '24px' }}>
                      <div className="control-row">
                        <span className="control-label">色标颜色</span>
                      </div>
                      <div
                        className="color-input-wrapper"
                        style={{ marginBottom: '12px' }}
                      >
                        <input
                          type="color"
                          className="color-input"
                          value={
                            params.gradient.stops.find(
                              (s) => s.id === selectedStopId
                            )?.color || '#ffffff'
                          }
                          onChange={(e) =>
                            updateGradientStop(
                              selectedStopId,
                              { color: e.target.value },
                              true
                            )
                          }
                          onMouseUp={commitParams}
                          onTouchEnd={commitParams}
                        />
                        <span className="color-value">
                          {(
                            params.gradient.stops.find(
                              (s) => s.id === selectedStopId
                            )?.color || ''
                          ).toUpperCase()}
                        </span>
                      </div>
                      <div className="control-row">
                        <span className="control-label">色标位置</span>
                        <span className="control-value">
                          {params.gradient.stops.find(
                            (s) => s.id === selectedStopId
                          )?.position}
                          %
                        </span>
                      </div>
                      <div className="slider-wrapper">
                        <input
                          type="range"
                          className="slider"
                          min="0"
                          max="100"
                          value={
                            params.gradient.stops.find(
                              (s) => s.id === selectedStopId
                            )?.position || 0
                          }
                          onChange={(e) =>
                            updateGradientStop(
                              selectedStopId,
                              { position: parseInt(e.target.value) },
                              true
                            )
                          }
                          onMouseUp={commitParams}
                          onTouchEnd={commitParams}
                        />
                      </div>
                    </div>
                  )}

                  {!selectedStopId && params.gradient.stops.length < 5 && (
                    <div
                      style={{
                        marginTop: '24px',
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        textAlign: 'center'
                      }}
                    >
                      💡 点击渐变条添加新色标，拖动色标调整位置
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="section">
            <div className="section-header">
              <span className="section-title">预设库</span>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <button
                className="btn btn-secondary"
                style={{ width: '100%' }}
                onClick={handleRandomize}
              >
                🎲 随机灵感
              </button>
            </div>
            <div className="preset-grid">
              {PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  className="preset-card"
                  onClick={() => applyPreset(preset.id)}
                  title={preset.description}
                >
                  <div className="preset-thumbnail">{preset.thumbnail}</div>
                  <div className="preset-name">{preset.name}</div>
                  <div className="preset-desc">{preset.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={handleExport}
              disabled={isRendering}
            >
              {isRendering ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                    <line x1="12" y1="2" x2="12" y2="6" />
                    <line x1="12" y1="18" x2="12" y2="22" />
                    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                    <line x1="2" y1="12" x2="6" y2="12" />
                    <line x1="18" y1="12" x2="22" y2="12" />
                  </svg>
                  生成中...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  导出 (1024×1024)
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      {sidebarCollapsed && !mobilePanelOpen && (
        <button
          className="toggle-btn"
          style={{
            position: 'fixed',
            top: '16px',
            left: '16px',
            zIndex: 60,
            background: 'rgba(22, 33, 62, 0.9)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
            padding: '10px'
          }}
          onClick={() => setSidebarCollapsed(false)}
          title="展开面板"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      <main className="main-area">
        <div className="topbar">
          <div className="topbar-info">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            <span>预览：</span>
            <strong>{PREVIEW_SIZE}×{PREVIEW_SIZE}px</strong>
          </div>
          <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
          <button
            className="btn btn-primary"
            onClick={handleExport}
            disabled={isRendering}
            style={{ padding: '8px 14px', fontSize: '13px' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            导出 PNG
          </button>
        </div>

        <div className="preview-wrapper">
          <div className="preview-container" style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE, maxWidth: '100%', aspectRatio: '1' }}>
            <canvas
              ref={previewCanvasRef}
              className="preview-canvas"
              width={PREVIEW_SIZE}
              height={PREVIEW_SIZE}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{ width: '100%', height: '100%' }}
            />
            <div className={`pixel-info ${showPixelInfo && pixelInfo ? 'visible' : ''}`}>
              <div className="pixel-info-row">
                <span className="pixel-info-label">坐标</span>
                <span className="pixel-info-value">
                  ({pixelInfo?.x ?? 0}, {pixelInfo?.y ?? 0})
                </span>
              </div>
              <div className="pixel-info-row">
                <span className="pixel-info-label">颜色</span>
                <span className="pixel-info-value">
                  {pixelInfo ? formatRgb(pixelInfo.r, pixelInfo.g, pixelInfo.b) : ''}
                </span>
              </div>
              <div className="pixel-info-row">
                <span className="pixel-info-label">HEX</span>
                <span className="pixel-info-value">
                  {pixelInfo
                    ? `#${[pixelInfo.r, pixelInfo.g, pixelInfo.b]
                        .map((x) => x.toString(16).padStart(2, '0'))
                        .join('')
                        .toUpperCase()}`
                    : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <button
        className="mobile-toggle"
        onClick={() => setMobilePanelOpen((v) => !v)}
      >
        {mobilePanelOpen ? (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            关闭面板
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
            参数面板
          </>
        )}
      </button>
    </div>
  );
}

export default App;
