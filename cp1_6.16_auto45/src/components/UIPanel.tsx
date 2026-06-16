import { useState, useCallback } from 'react';
import type { FurnitureTemplate, LightingPreset } from '../logic/LogicModule';
import { logicModule } from '../logic/LogicModule';

interface UIPanelProps {
  furnitureTemplates: FurnitureTemplate[];
  lightingPresets: LightingPreset[];
  currentLightingId: string;
  onLightingChange: (presetId: string) => void;
}

const FURNITURE_ICONS: Record<string, string> = {
  sofa: '🛋️',
  coffeeTable: '🪑',
  floorLamp: '🪔',
  bookshelf: '📚',
};

const LIGHTING_ICONS: Record<string, string> = {
  morning: '🌅',
  noon: '☀️',
  night: '🌙',
};

export function UIPanel({
  furnitureTemplates,
  lightingPresets,
  currentLightingId,
  onLightingChange,
}: UIPanelProps) {
  const [pulsingButton, setPulsingButton] = useState<string | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, templateId: string) => {
    e.dataTransfer.setData('furnitureTemplateId', templateId);
    e.dataTransfer.effectAllowed = 'copy';
    logicModule.startDrag(templateId);
  }, []);

  const handleDragEnd = useCallback(() => {
    const dragState = logicModule.getDragState();
    if (dragState.isDragging) {
      logicModule.cancelDrag();
    }
  }, []);

  const handleLightingClick = useCallback((presetId: string) => {
    setPulsingButton(presetId);
    onLightingChange(presetId);
    setTimeout(() => setPulsingButton(null), 200);
  }, [onLightingChange]);

  const getLightingButtonStyle = (preset: LightingPreset) => {
    const isActive = currentLightingId === preset.id;
    const isPulsing = pulsingButton === preset.id;

    const baseStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px 8px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      background: isActive ? preset.ambientColor : 'rgba(255, 255, 255, 0.1)',
      color: isActive ? '#fff' : '#ecf0f1',
      transform: isPulsing ? 'scale(1.1)' : 'scale(1)',
      boxShadow: isActive ? `0 4px 15px ${preset.ambientColor}80` : 'none',
      minWidth: '70px',
    };

    return baseStyle;
  };

  return (
    <>
      <div style={leftPanelStyle}>
        <div style={panelTitleStyle}>
          <span style={{ marginRight: '8px' }}>🏠</span>
          家具库
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {furnitureTemplates.map((template) => (
            <div
              key={template.id}
              draggable
              onDragStart={(e) => handleDragStart(e, template.id)}
              onDragEnd={handleDragEnd}
              style={furnitureCardStyle}
            >
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>
                {FURNITURE_ICONS[template.type]}
              </div>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                {template.name}
              </div>
              <div style={dimensionsStyle}>
                {template.dimensions.width}x{template.dimensions.depth}x{template.dimensions.height}
              </div>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                background: template.color,
                border: '1px solid rgba(255,255,255,0.2)',
                marginTop: '8px',
              }} />
            </div>
          ))}
        </div>
        <div style={tipStyle}>
          <span style={{ marginRight: '6px' }}>💡</span>
          拖拽家具到房间中放置
        </div>
      </div>

      <div style={rightPanelStyle}>
        <div style={panelTitleStyle}>
          <span style={{ marginRight: '8px' }}>💡</span>
          光照方案
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {lightingPresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleLightingClick(preset.id)}
              style={getLightingButtonStyle(preset)}
            >
              <span style={{ fontSize: '24px', marginBottom: '4px' }}>
                {LIGHTING_ICONS[preset.id]}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 500 }}>
                {preset.name}
              </span>
            </button>
          ))}
        </div>
        <div style={tipStyle}>
          <span style={{ marginRight: '6px' }}>🎨</span>
          点击切换光照效果
        </div>
      </div>

      <div style={fpsCounterStyle}>
        <span style={{ marginRight: '6px' }}>⚡</span>
        FPS: <span id="fps-counter">--</span>
      </div>
    </>
  );
}

const leftPanelStyle: React.CSSProperties = {
  position: 'absolute',
  left: '20px',
  top: '20px',
  width: '180px',
  padding: '20px',
  background: 'rgba(44, 62, 80, 0.8)',
  backdropFilter: 'blur(10px)',
  borderRadius: '8px',
  color: '#ecf0f1',
  zIndex: 100,
  maxHeight: 'calc(100vh - 40px)',
  overflowY: 'auto',
};

const rightPanelStyle: React.CSSProperties = {
  position: 'absolute',
  right: '20px',
  top: '20px',
  width: '110px',
  padding: '20px',
  background: 'rgba(44, 62, 80, 0.8)',
  backdropFilter: 'blur(10px)',
  borderRadius: '8px',
  color: '#ecf0f1',
  zIndex: 100,
};

const panelTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 700,
  marginBottom: '16px',
  paddingBottom: '10px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  display: 'flex',
  alignItems: 'center',
};

const furnitureCardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '16px',
  background: 'rgba(255, 255, 255, 0.08)',
  borderRadius: '8px',
  cursor: 'grab',
  transition: 'all 0.2s ease',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  fontSize: '12px',
};

const dimensionsStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'rgba(236, 240, 241, 0.7)',
};

const tipStyle: React.CSSProperties = {
  marginTop: '16px',
  padding: '10px',
  background: 'rgba(255, 255, 255, 0.05)',
  borderRadius: '6px',
  fontSize: '11px',
  color: 'rgba(236, 240, 241, 0.8)',
  display: 'flex',
  alignItems: 'center',
};

const fpsCounterStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '20px',
  right: '20px',
  padding: '8px 16px',
  background: 'rgba(44, 62, 80, 0.8)',
  backdropFilter: 'blur(10px)',
  borderRadius: '6px',
  color: '#2ECC71',
  fontFamily: 'monospace',
  fontSize: '13px',
  zIndex: 100,
};
