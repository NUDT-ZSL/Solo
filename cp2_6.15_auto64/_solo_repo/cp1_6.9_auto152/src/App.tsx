import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CanvasController } from './CanvasController';
import { LayerRenderer } from './LayerRenderer';
import type { CanvasState, BlendMode, LightEffectType, TextureType, Layer } from './MaterialLibrary';
import { MATERIAL_LIBRARY } from './MaterialLibrary';

type PanelType = 'materials' | 'background' | 'layers' | 'export' | null;

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<CanvasController | null>(null);
  const [canvasState, setCanvasState] = useState<CanvasState | null>(null);
  const [activePanel, setActivePanel] = useState<PanelType>('materials');
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);
  const [dragLayerId, setDragLayerId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!canvasRef.current) return;
    const controller = new CanvasController(canvasRef.current, {
      onStateChange: () => {
        setCanvasState(controller.getState());
      }
    });
    controllerRef.current = controller;

    const handleResize = () => {
      if (!containerRef.current || !controllerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const w = Math.max(800, rect.width);
      const h = Math.max(600, rect.height);
      controllerRef.current.resizeCanvas(w, h);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    setCanvasState(controller.getState());

    return () => {
      window.removeEventListener('resize', handleResize);
      controller.destroy();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 50);
    return () => clearInterval(interval);
  }, []);

  const getController = useCallback(() => controllerRef.current, []);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    getController()?.handleMouseDown(e.clientX, e.clientY, e.shiftKey);
  }, [getController]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    getController()?.handleMouseMove(e.clientX, e.clientY);
  }, [getController]);

  const handleCanvasMouseUp = useCallback(() => {
    getController()?.handleMouseUp();
  }, [getController]);

  const handleCanvasWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    getController()?.handleWheel(e.clientX, e.clientY, e.deltaY);
  }, [getController]);

  const handleAddMaterial = useCallback((idx: number) => {
    const material = MATERIAL_LIBRARY[idx];
    getController()?.addLayer(material);
  }, [getController]);

  const handleDelete = useCallback(() => {
    getController()?.deleteSelectedLayer();
  }, [getController]);

  const handleDuplicate = useCallback(() => {
    getController()?.duplicateSelectedLayer();
  }, [getController]);

  const handleExport = useCallback(() => {
    getController()?.exportToPNG();
  }, [getController]);

  const handleSave = useCallback(() => {
    getController()?.saveProject();
  }, [getController]);

  const handleLoad = useCallback(() => {
    getController()?.loadProject();
  }, [getController]);

  const handleLayerDragStart = (e: React.DragEvent, id: string) => {
    setDragLayerId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleLayerDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleLayerDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragLayerId) {
      getController()?.moveLayerOrder(dragLayerId, index);
    }
    setDragLayerId(null);
    setDragOverIndex(null);
  };

  const handleLayerDragEnd = () => {
    setDragLayerId(null);
    setDragOverIndex(null);
  };

  const selectedLayer = canvasState?.selectedId
    ? canvasState.layers.find(l => l.id === canvasState.selectedId) || null
    : null;

  return (
    <div style={styles.app}>
      <div style={styles.toolbar}>
        <ToolButton
          icon="palette"
          label="素材库"
          active={activePanel === 'materials'}
          onHover={setHoveredTool}
          onClick={() => setActivePanel(activePanel === 'materials' ? null : 'materials')}
        />
        <ToolButton
          icon="image"
          label="背景设置"
          active={activePanel === 'background'}
          onHover={setHoveredTool}
          onClick={() => setActivePanel(activePanel === 'background' ? null : 'background')}
        />
        <ToolButton
          icon="layers"
          label="图层管理"
          active={activePanel === 'layers'}
          onHover={setHoveredTool}
          onClick={() => setActivePanel(activePanel === 'layers' ? null : 'layers')}
        />
        <ToolButton
          icon="export"
          label="导出"
          active={activePanel === 'export'}
          onHover={setHoveredTool}
          onClick={() => setActivePanel(activePanel === 'export' ? null : 'export')}
        />
        <div style={{ flex: 1 }} />
        <ToolButton
          icon="trash"
          label="删除选中"
          onHover={setHoveredTool}
          onClick={handleDelete}
          disabled={!selectedLayer}
        />
        <ToolButton
          icon="copy"
          label="复制选中"
          onHover={setHoveredTool}
          onClick={handleDuplicate}
          disabled={!selectedLayer}
        />
        {hoveredTool && (
          <div style={{
            position: 'absolute',
            left: 70,
            top: Object.keys(toolbarLabels).indexOf(hoveredTool) * 60 + 16,
            background: 'rgba(255,255,255,0.9)',
            color: '#333',
            padding: '4px 10px',
            borderRadius: 4,
            fontSize: 12,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 1000
          }}>
            {toolbarLabels[hoveredTool as keyof typeof toolbarLabels]}
          </div>
        )}
      </div>

      <div style={styles.canvasArea} ref={containerRef}>
        <canvas
          ref={canvasRef}
          style={styles.canvas}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onWheel={handleCanvasWheel}
        />
      </div>

      {activePanel && (
        <div style={styles.sidePanel}>
          {activePanel === 'materials' && (
            <MaterialsPanel onSelect={handleAddMaterial} />
          )}
          {activePanel === 'background' && canvasState && (
            <BackgroundPanel
              state={canvasState}
              controller={getController()}
            />
          )}
          {activePanel === 'layers' && canvasState && (
            <LayersPanel
              layers={canvasState.layers}
              selectedId={canvasState.selectedId}
              controller={getController()}
              dragLayerId={dragLayerId}
              dragOverIndex={dragOverIndex}
              onDragStart={handleLayerDragStart}
              onDragOver={handleLayerDragOver}
              onDrop={handleLayerDrop}
              onDragEnd={handleLayerDragEnd}
            />
          )}
          {activePanel === 'export' && (
            <ExportPanel
              onExport={handleExport}
              onSave={handleSave}
              onLoad={handleLoad}
            />
          )}
        </div>
      )}

      {selectedLayer && (
        <div style={styles.propertiesPanel}>
          <PropertiesPanel
            layer={selectedLayer}
            controller={getController()}
          />
        </div>
      )}
    </div>
  );
};

const toolbarLabels = {
  palette: '素材库',
  image: '背景设置',
  layers: '图层管理',
  export: '导出',
  trash: '删除选中',
  copy: '复制选中'
};

interface ToolButtonProps {
  icon: string;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  onHover: (label: string | null) => void;
}

const ToolButton: React.FC<ToolButtonProps> = ({ icon, label, active, disabled, onClick, onHover }) => {
  return (
    <div
      style={{
        ...styles.toolButton,
        background: active ? '#5B9BD5' : 'transparent',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer'
      }}
      onClick={() => !disabled && onClick()}
      onMouseEnter={() => onHover(label === '素材库' ? 'palette' : label === '背景设置' ? 'image' : label === '图层管理' ? 'layers' : label === '导出' ? 'export' : label === '删除选中' ? 'trash' : 'copy')}
      onMouseLeave={() => onHover(null)}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {icon === 'palette' && (<><circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></>)}
        {icon === 'image' && (<><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></>)}
        {icon === 'layers' && (<><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>)}
        {icon === 'export' && (<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>)}
        {icon === 'trash' && (<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>)}
        {icon === 'copy' && (<><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>)}
      </svg>
    </div>
  );
};

interface MaterialsPanelProps {
  onSelect: (idx: number) => void;
}

const MaterialsPanel: React.FC<MaterialsPanelProps> = ({ onSelect }) => {
  return (
    <div style={styles.panelContent}>
      <h3 style={styles.panelTitle}>素材库</h3>
      <p style={styles.panelSubtitle}>点击添加到画布中央</p>
      <div style={styles.materialGrid}>
        {MATERIAL_LIBRARY.map((m, idx) => (
          <div
            key={m.type}
            style={styles.materialCard}
            onClick={() => onSelect(idx)}
          >
            <MaterialThumbnail type={m.type} colors={m.colors} />
            <span style={styles.materialName}>{m.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const MaterialThumbnail: React.FC<{ type: string; colors: string[] }> = ({ type, colors }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 96;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#F5F0EB';
    ctx.fillRect(0, 0, 96, 96);
    ctx.save();
    ctx.translate(48, 48);
    ctx.scale(0.4, 0.4);
    ctx.translate(-100, -100);
    const fakeLayer: Layer = {
      id: 'thumb', name: 'thumb', type: type as any, x: 0, y: 0, width: 200, height: 200, colors,
      shadowOffsetX: 2, shadowOffsetY: 2, shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.2)',
      lightEffect: { type: 'none', intensity: 0, radius: 0 },
      rotation: 0, scale: 1, opacity: 1, visible: true, blendMode: 'normal' as any, pressAnim: 0
    };
    LayerRenderer.drawLayer(ctx, fakeLayer, true);
    ctx.restore();
  }, [type, colors]);
  return <canvas ref={canvasRef} style={{ width: 96, height: 96, borderRadius: 6 }} />;
};

interface BackgroundPanelProps {
  state: CanvasState;
  controller: CanvasController | null;
}

const BackgroundPanel: React.FC<BackgroundPanelProps> = ({ state, controller }) => {
  const presets = ['#F5F0EB', '#2A2A2A', '#FFFFFF', '#1E3A5F', '#5C4033', '#FAFAFA'];
  const textures: { key: TextureType; label: string }[] = [
    { key: 'none', label: '无纹理' },
    { key: 'old-paper', label: '旧纸张' },
    { key: 'burlap', label: '粗麻布' },
    { key: 'watercolor', label: '水彩颗粒' }
  ];

  return (
    <div style={styles.panelContent}>
      <h3 style={styles.panelTitle}>背景设置</h3>

      <div style={styles.section}>
        <label style={styles.sectionLabel}>背景颜色</label>
        <div style={styles.colorPresets}>
          {presets.map(c => (
            <div
              key={c}
              onClick={() => controller?.setBackgroundColor(c)}
              style={{
                ...styles.colorSwatch,
                background: c,
                border: state.backgroundColor === c ? '2px solid #5B9BD5' : '2px solid transparent'
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
          <input
            type="color"
            value={state.backgroundColor}
            onChange={e => controller?.setBackgroundColor(e.target.value)}
            style={styles.colorPicker}
          />
          <span style={styles.fieldValue}>{state.backgroundColor}</span>
        </div>
      </div>

      <div style={styles.section}>
        <label style={styles.sectionLabel}>纹理类型</label>
        <div style={styles.radioGroup}>
          {textures.map(t => (
            <div
              key={t.key}
              onClick={() => controller?.setTexture(t.key, state.textureSize)}
              style={{
                ...styles.radioItem,
                background: state.textureType === t.key ? '#5B9BD5' : 'rgba(255,255,255,0.08)',
                color: state.textureType === t.key ? '#fff' : '#E0E0E0'
              }}
            >
              {t.label}
            </div>
          ))}
        </div>
      </div>

      {state.textureType !== 'none' && (
        <div style={styles.section}>
          <label style={styles.sectionLabel}>
            颗粒大小: {state.textureSize.toFixed(1)}px
          </label>
          <input
            type="range"
            min={1}
            max={5}
            step={0.5}
            value={state.textureSize}
            onChange={e => controller?.setTexture(state.textureType, parseFloat(e.target.value))}
            style={styles.slider}
          />
        </div>
      )}
    </div>
  );
};

interface LayersPanelProps {
  layers: Layer[];
  selectedId: string | null;
  controller: CanvasController | null;
  dragLayerId: string | null;
  dragOverIndex: number | null;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
}

const LayersPanel: React.FC<LayersPanelProps> = ({ layers, selectedId, controller, dragLayerId, dragOverIndex, onDragStart, onDragOver, onDrop, onDragEnd }) => {
  return (
    <div style={styles.panelContent}>
      <h3 style={styles.panelTitle}>图层管理</h3>
      <p style={styles.panelSubtitle}>拖拽调整层级 · 共 {layers.length} 层</p>
      <div style={styles.layerList}>
        {layers.map((layer, index) => (
          <React.Fragment key={layer.id}>
            {dragOverIndex === index && dragLayerId && (
              <div style={{
                height: 2, background: '#5B9BD5', borderRadius: 2, margin: '2px 0',
                boxShadow: '0 0 6px #5B9BD5'
              }} />
            )}
            <div
              draggable
              onDragStart={e => onDragStart(e, layer.id)}
              onDragOver={e => onDragOver(e, index)}
              onDrop={e => onDrop(e, index)}
              onDragEnd={onDragEnd}
              onClick={() => controller?.selectLayer(layer.id)}
              style={{
                ...styles.layerItem,
                borderColor: selectedId === layer.id ? '#5B9BD5' : 'transparent',
                background: selectedId === layer.id ? 'rgba(91,155,213,0.15)' : 'rgba(255,255,255,0.05)',
                opacity: dragLayerId === layer.id ? 0.5 : 1
              }}
            >
              <LayerThumbnail layer={layer} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg
                    width="14" height="14" viewBox="0 0 24 24"
                    fill={layer.visible ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ cursor: 'pointer', color: layer.visible ? '#5B9BD5' : '#666', flexShrink: 0 }}
                    onClick={e => { e.stopPropagation(); controller?.setLayerVisible(layer.id, !layer.visible); }}
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <span style={styles.layerName}>{layer.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: '#888' }}>透明度</span>
                  <input
                    type="range" min={10} max={100} step={5}
                    value={Math.round(layer.opacity * 100)}
                    onClick={e => e.stopPropagation()}
                    onChange={e => controller?.setLayerOpacity(layer.id, parseInt(e.target.value) / 100)}
                    style={{ ...styles.smallSlider, flex: 1 }}
                  />
                  <span style={{ fontSize: 10, color: '#888', width: 28 }}>{Math.round(layer.opacity * 100)}%</span>
                </div>
              </div>
            </div>
          </React.Fragment>
        ))}
        {dragOverIndex === layers.length && dragLayerId && (
          <div style={{ height: 2, background: '#5B9BD5', borderRadius: 2, margin: '2px 0', boxShadow: '0 0 6px #5B9BD5' }} />
        )}
        {layers.length === 0 && (
          <div style={{ color: '#666', fontSize: 13, padding: 20, textAlign: 'center' }}>
            暂无图层，请从素材库添加
          </div>
        )}
      </div>
    </div>
  );
};

const LayerThumbnail: React.FC<{ layer: Layer }> = ({ layer }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(0, 0, 48, 48);
    ctx.save();
    const scale = 36 / Math.max(layer.width, layer.height);
    ctx.translate(24, 24);
    ctx.scale(scale, scale);
    ctx.translate(-layer.width / 2, -layer.height / 2);
    LayerRenderer.drawLayer(ctx, { ...layer, shadowOffsetX: 0, shadowOffsetY: 0, shadowBlur: 0, lightEffect: { ...layer.lightEffect, type: 'none' } }, true);
    ctx.restore();
  }, [layer.type, layer.colors.join(',')]);
  return <canvas ref={canvasRef} style={{ width: 40, height: 40, borderRadius: 4, flexShrink: 0 }} />;
};

interface ExportPanelProps {
  onExport: () => void;
  onSave: () => void;
  onLoad: () => void;
}

const ExportPanel: React.FC<ExportPanelProps> = ({ onExport, onSave, onLoad }) => {
  return (
    <div style={styles.panelContent}>
      <h3 style={styles.panelTitle}>导出与保存</h3>

      <div style={styles.section}>
        <label style={styles.sectionLabel}>导出海报</label>
        <p style={{ ...styles.panelSubtitle, marginBottom: 10 }}>PNG 格式 · 2048 × 2048 分辨率</p>
        <button style={styles.primaryButton} onClick={onExport}>
          📥 导出 PNG
        </button>
      </div>

      <div style={styles.section}>
        <label style={styles.sectionLabel}>项目管理</label>
        <p style={{ ...styles.panelSubtitle, marginBottom: 10 }}>保存到浏览器本地存储</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ ...styles.secondaryButton, flex: 1 }} onClick={onSave}>
            💾 保存项目
          </button>
          <button style={{ ...styles.secondaryButton, flex: 1 }} onClick={onLoad}>
            📂 恢复项目
          </button>
        </div>
      </div>

      <div style={styles.section}>
        <label style={styles.sectionLabel}>操作提示</label>
        <ul style={{ color: '#B0B0B0', fontSize: 12, lineHeight: 1.8, paddingLeft: 16 }}>
          <li>点击素材库 → 画布中央出现元素</li>
          <li>按住元素 → 拖拽移动（带弹性动画）</li>
          <li>Shift + 拖拽 → 旋转元素</li>
          <li>鼠标滚轮 → 缩放选中元素</li>
          <li>拖拽四角 → 按比例缩放尺寸</li>
        </ul>
      </div>
    </div>
  );
};

interface PropertiesPanelProps {
  layer: Layer;
  controller: CanvasController | null;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ layer, controller }) => {
  const blendModes: { key: BlendMode; label: string }[] = [
    { key: 'normal', label: '正常' },
    { key: 'multiply', label: '正片叠底' },
    { key: 'screen', label: '屏幕叠加' },
    { key: 'soft-light', label: '柔光' },
    { key: 'hard-light', label: '强光' }
  ];

  const lightEffects: { key: LightEffectType; label: string }[] = [
    { key: 'none', label: '无光效' },
    { key: 'soft-glow', label: '柔光' },
    { key: 'neon', label: '霓虹光' },
    { key: 'sparkle', label: '闪光' }
  ];

  return (
    <div style={{ padding: 16, overflowY: 'auto' }}>
      <h3 style={{ ...styles.panelTitle, marginBottom: 12 }}>属性调整</h3>
      <div style={{
        padding: '8px 12px',
        background: 'rgba(91,155,213,0.15)',
        borderRadius: 6,
        border: '1px solid rgba(91,155,213,0.3)',
        marginBottom: 16
      }}>
        <span style={{ color: '#5B9BD5', fontWeight: 600, fontSize: 13 }}>
          {layer.name} · {Math.round(layer.scale * 100)}% · {Math.round(layer.rotation % 360)}°
        </span>
      </div>

      <div style={styles.section}>
        <label style={styles.sectionLabel}>透明度：{Math.round(layer.opacity * 100)}%</label>
        <input
          type="range" min={10} max={100} step={5}
          value={Math.round(layer.opacity * 100)}
          onChange={e => controller?.setOpacity(parseInt(e.target.value) / 100)}
          style={styles.slider}
        />
      </div>

      <div style={styles.section}>
        <label style={styles.sectionLabel}>混合模式</label>
        <div style={{ ...styles.radioGroup, flexWrap: 'wrap' }}>
          {blendModes.map(b => (
            <div
              key={b.key}
              onClick={() => controller?.setBlendMode(b.key)}
              style={{
                ...styles.radioItem,
                fontSize: 11,
                padding: '6px 10px',
                background: layer.blendMode === b.key ? '#5B9BD5' : 'rgba(255,255,255,0.08)',
                color: layer.blendMode === b.key ? '#fff' : '#E0E0E0'
              }}
            >
              {b.label}
            </div>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <label style={styles.sectionLabel}>内阴影 X 偏移：{layer.shadowOffsetX}px</label>
        <input
          type="range" min={-10} max={10} step={1}
          value={layer.shadowOffsetX}
          onChange={e => controller?.setShadowOffset(parseInt(e.target.value), layer.shadowOffsetY)}
          style={styles.slider}
        />
      </div>

      <div style={styles.section}>
        <label style={styles.sectionLabel}>内阴影 Y 偏移：{layer.shadowOffsetY}px</label>
        <input
          type="range" min={-10} max={10} step={1}
          value={layer.shadowOffsetY}
          onChange={e => controller?.setShadowOffset(layer.shadowOffsetX, parseInt(e.target.value))}
          style={styles.slider}
        />
      </div>

      <div style={styles.section}>
        <label style={styles.sectionLabel}>光效类型</label>
        <div style={{ ...styles.radioGroup, flexWrap: 'wrap' }}>
          {lightEffects.map(le => (
            <div
              key={le.key}
              onClick={() => controller?.setLightEffect(le.key, layer.lightEffect.intensity, layer.lightEffect.radius)}
              style={{
                ...styles.radioItem,
                fontSize: 11,
                padding: '6px 10px',
                background: layer.lightEffect.type === le.key ? '#5B9BD5' : 'rgba(255,255,255,0.08)',
                color: layer.lightEffect.type === le.key ? '#fff' : '#E0E0E0'
              }}
            >
              {le.label}
            </div>
          ))}
        </div>
      </div>

      {layer.lightEffect.type !== 'none' && (
        <>
          <div style={styles.section}>
            <label style={styles.sectionLabel}>光效强度：{Math.round(layer.lightEffect.intensity * 100)}%</label>
            <input
              type="range" min={0} max={100} step={5}
              value={Math.round(layer.lightEffect.intensity * 100)}
              onChange={e => controller?.setLightEffect(layer.lightEffect.type, parseInt(e.target.value) / 100, layer.lightEffect.radius)}
              style={styles.slider}
            />
          </div>
          <div style={styles.section}>
            <label style={styles.sectionLabel}>光效半径：{layer.lightEffect.radius}px</label>
            <input
              type="range" min={5} max={100} step={5}
              value={layer.lightEffect.radius}
              onChange={e => controller?.setLightEffect(layer.lightEffect.type, layer.lightEffect.intensity, parseInt(e.target.value))}
              style={styles.slider}
            />
          </div>
        </>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    width: '100%',
    height: '100%',
    background: '#1E1E1E',
    color: '#E0E0E0',
    position: 'relative',
    overflow: 'hidden'
  },
  toolbar: {
    width: 60,
    background: '#2A2A2A',
    display: 'flex',
    flexDirection: 'column',
    padding: '12px 0',
    gap: 4,
    borderRight: '1px solid #1A1A1A',
    position: 'relative',
    flexShrink: 0
  },
  toolButton: {
    width: 44,
    height: 44,
    margin: '0 auto',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease-out'
  },
  canvasArea: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    overflow: 'auto',
    minWidth: 0
  },
  canvas: {
    background: '#F5F0EB',
    borderRadius: 8,
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    display: 'block',
    flexShrink: 0
  },
  sidePanel: {
    width: 260,
    background: '#3A3A3A',
    borderRadius: 12,
    margin: '16px 16px 16px 0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: '1px solid #2A2A2A',
    flexShrink: 0
  },
  propertiesPanel: {
    position: 'absolute',
    right: 292,
    top: 16,
    bottom: 16,
    width: 240,
    background: '#3A3A3A',
    borderRadius: 12,
    border: '1px solid #2A2A2A',
    overflow: 'hidden',
    boxShadow: '-4px 0 20px rgba(0,0,0,0.2)'
  },
  panelContent: {
    padding: 16,
    overflowY: 'auto',
    flex: 1
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#FFFFFF',
    margin: 0,
    marginBottom: 4
  },
  panelSubtitle: {
    fontSize: 11,
    color: '#888',
    margin: 0,
    marginBottom: 16
  },
  section: {
    marginBottom: 18
  },
  sectionLabel: {
    display: 'block',
    fontSize: 12,
    color: '#C0C0C0',
    marginBottom: 8,
    fontWeight: 500
  },
  materialGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10
  },
  materialCard: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 8,
    cursor: 'pointer',
    transition: 'all 0.2s ease-out',
    textAlign: 'center',
    border: '1px solid transparent'
  },
  materialName: {
    display: 'block',
    marginTop: 6,
    fontSize: 12,
    color: '#D0D0D0'
  },
  colorPresets: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)'
  },
  colorPicker: {
    width: 40,
    height: 32,
    border: 'none',
    borderRadius: 6,
    background: 'transparent',
    cursor: 'pointer',
    padding: 0
  },
  fieldValue: {
    fontSize: 12,
    color: '#B0B0B0',
    fontFamily: 'monospace'
  },
  radioGroup: {
    display: 'flex',
    gap: 6
  },
  radioItem: {
    padding: '8px 12px',
    borderRadius: 6,
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.2s ease-out'
  },
  slider: {
    width: '100%',
    accentColor: '#5B9BD5',
    cursor: 'pointer'
  },
  smallSlider: {
    accentColor: '#5B9BD5',
    cursor: 'pointer',
    height: 16
  },
  primaryButton: {
    width: '100%',
    padding: '12px 16px',
    background: '#5B9BD5',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease-out'
  },
  secondaryButton: {
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.1)',
    color: '#E0E0E0',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.2s ease-out'
  },
  layerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    maxHeight: 'calc(100vh - 200px)',
    overflowY: 'auto'
  },
  layerItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'solid',
    cursor: 'pointer',
    transition: 'all 0.2s ease-out'
  },
  layerName: {
    fontSize: 12,
    color: '#E0E0E0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontWeight: 500
  }
};

export default App;
