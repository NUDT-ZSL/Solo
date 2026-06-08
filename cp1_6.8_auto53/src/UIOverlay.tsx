import React, { useState } from 'react';
import { PaperModule, ToolType, ModuleType } from './PaperEngine';

interface UIOverlayProps {
  activeTool: ToolType;
  selectedModule: PaperModule | null;
  canUndo: boolean;
  canRedo: boolean;
  onToolChange: (tool: ToolType) => void;
  onAddModule: (type: ModuleType) => void;
  onDeleteSelected: () => void;
  onUndo: () => void;
  onRedo: () => void;
  moduleCount: number;
  connectionCount: number;
}

const toolbarButtonStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '8px 14px',
  border: `1.5px solid ${active ? '#D4A843' : 'rgba(180, 140, 60, 0.3)'}`,
  borderRadius: 8,
  background: active
    ? 'linear-gradient(135deg, rgba(212, 168, 67, 0.15), rgba(212, 168, 67, 0.08))'
    : 'rgba(255, 255, 255, 0.7)',
  color: active ? '#B8860B' : '#8B7355',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: active ? 600 : 400,
  backdropFilter: 'blur(8px)',
  transition: 'all 0.2s ease',
  boxShadow: active
    ? '0 2px 8px rgba(212, 168, 67, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
    : '0 1px 4px rgba(0, 0, 0, 0.06)',
  whiteSpace: 'nowrap',
});

const Toolbar: React.FC<{
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  onAddModule: (type: ModuleType) => void;
  onDeleteSelected: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}> = ({ activeTool, onToolChange, onAddModule, onDeleteSelected, onUndo, onRedo, canUndo, canRedo }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          padding: 12,
          background: 'rgba(255, 248, 231, 0.85)',
          backdropFilter: 'blur(12px)',
          borderRadius: 12,
          border: '1px solid rgba(212, 168, 67, 0.2)',
          boxShadow: '0 4px 16px rgba(180, 140, 60, 0.1)',
        }}
      >
        <div style={{ fontSize: 11, color: '#8B7355', marginBottom: 4, fontWeight: 600, letterSpacing: 1 }}>
          工具
        </div>
        <button
          style={toolbarButtonStyle(activeTool === 'select')}
          onClick={() => onToolChange('select')}
        >
          <span style={{ fontSize: 16 }}>⊹</span> 选择
        </button>
        <button
          style={toolbarButtonStyle(activeTool === 'connect')}
          onClick={() => onToolChange('connect')}
        >
          <span style={{ fontSize: 16 }}>⟡</span> 连接
        </button>
        <button
          style={toolbarButtonStyle(activeTool === 'fold')}
          onClick={() => onToolChange('fold')}
        >
          <span style={{ fontSize: 16 }}>⊹</span> 折叠
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          padding: 12,
          background: 'rgba(255, 248, 231, 0.85)',
          backdropFilter: 'blur(12px)',
          borderRadius: 12,
          border: '1px solid rgba(212, 168, 67, 0.2)',
          boxShadow: '0 4px 16px rgba(180, 140, 60, 0.1)',
        }}
      >
        <div style={{ fontSize: 11, color: '#8B7355', marginBottom: 4, fontWeight: 600, letterSpacing: 1 }}>
          添加模块
        </div>
        <button style={toolbarButtonStyle(false)} onClick={() => onAddModule('square')}>
          <span style={{ fontSize: 14 }}>◻</span> 正方形
        </button>
        <button style={toolbarButtonStyle(false)} onClick={() => onAddModule('triangle')}>
          <span style={{ fontSize: 14 }}>△</span> 三角形
        </button>
        <button style={toolbarButtonStyle(false)} onClick={() => onAddModule('diamond')}>
          <span style={{ fontSize: 14 }}>◇</span> 菱形
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: 8,
          background: 'rgba(255, 248, 231, 0.85)',
          backdropFilter: 'blur(12px)',
          borderRadius: 12,
          border: '1px solid rgba(212, 168, 67, 0.2)',
          boxShadow: '0 4px 16px rgba(180, 140, 60, 0.1)',
        }}
      >
        <button
          style={{
            ...toolbarButtonStyle(false),
            opacity: canUndo ? 1 : 0.4,
            flex: 1,
          }}
          onClick={onUndo}
          disabled={!canUndo}
        >
          ↶ 撤销
        </button>
        <button
          style={{
            ...toolbarButtonStyle(false),
            opacity: canRedo ? 1 : 0.4,
            flex: 1,
          }}
          onClick={onRedo}
          disabled={!canRedo}
        >
          ↷ 重做
        </button>
      </div>
    </div>
  );
};

const PropertyPanel: React.FC<{
  module: PaperModule | null;
  onDelete: () => void;
}> = ({ module, onDelete }) => {
  if (!module) {
    return (
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          width: 220,
          padding: 16,
          background: 'rgba(255, 248, 231, 0.85)',
          backdropFilter: 'blur(12px)',
          borderRadius: 12,
          border: '1px solid rgba(212, 168, 67, 0.2)',
          boxShadow: '0 4px 16px rgba(180, 140, 60, 0.1)',
          zIndex: 20,
          color: '#8B7355',
          fontSize: 13,
          textAlign: 'center',
        }}
      >
        点击模块以查看属性
      </div>
    );
  }

  const typeLabels: Record<ModuleType, string> = {
    square: '正方形',
    triangle: '三角形',
    diamond: '菱形',
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        width: 220,
        padding: 16,
        background: 'rgba(255, 248, 231, 0.85)',
        backdropFilter: 'blur(12px)',
        borderRadius: 12,
        border: '1px solid rgba(212, 168, 67, 0.2)',
        boxShadow: '0 4px 16px rgba(180, 140, 60, 0.1)',
        zIndex: 20,
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#8B6914',
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: '1px solid rgba(212, 168, 67, 0.2)',
        }}
      >
        模块属性
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: '#6B5B3E' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>类型</span>
          <span style={{ color: '#8B6914', fontWeight: 500 }}>{typeLabels[module.type]}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>位置 X</span>
          <span style={{ color: '#8B6914', fontWeight: 500 }}>{module.x.toFixed(0)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>位置 Y</span>
          <span style={{ color: '#8B6914', fontWeight: 500 }}>{module.y.toFixed(0)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>旋转</span>
          <span style={{ color: '#8B6914', fontWeight: 500 }}>{module.angle.toFixed(1)}°</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>缩放</span>
          <span style={{ color: '#8B6914', fontWeight: 500 }}>{module.scale.toFixed(2)}</span>
        </div>
      </div>
      <button
        onClick={onDelete}
        style={{
          marginTop: 12,
          width: '100%',
          padding: '8px 0',
          border: '1.5px solid rgba(200, 80, 60, 0.3)',
          borderRadius: 8,
          background: 'rgba(200, 80, 60, 0.08)',
          color: '#C8503C',
          cursor: 'pointer',
          fontSize: 13,
          transition: 'all 0.2s ease',
        }}
      >
        删除此模块
      </button>
    </div>
  );
};

const StatusBar: React.FC<{
  moduleCount: number;
  connectionCount: number;
  activeTool: ToolType;
}> = ({ moduleCount, connectionCount, activeTool }) => {
  const toolLabels: Record<ToolType, string> = {
    select: '选择模式',
    connect: '连接模式 — 点击起始模块，再点击目标模块',
    fold: '折叠模式 — 点击模块触发折叠动画',
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        padding: '10px 24px',
        background: 'rgba(255, 248, 231, 0.85)',
        backdropFilter: 'blur(12px)',
        borderRadius: 24,
        border: '1px solid rgba(212, 168, 67, 0.2)',
        boxShadow: '0 4px 16px rgba(180, 140, 60, 0.1)',
        zIndex: 20,
        fontSize: 12,
        color: '#8B7355',
      }}
    >
      <span>
        模块 <strong style={{ color: '#8B6914' }}>{moduleCount}</strong>
      </span>
      <span style={{ width: 1, height: 14, background: 'rgba(180, 140, 60, 0.3)' }} />
      <span>
        连接 <strong style={{ color: '#8B6914' }}>{connectionCount}</strong>
      </span>
      <span style={{ width: 1, height: 14, background: 'rgba(180, 140, 60, 0.3)' }} />
      <span style={{ color: '#B8860B', fontWeight: 500 }}>{toolLabels[activeTool]}</span>
    </div>
  );
};

export const UIOverlay: React.FC<UIOverlayProps> = ({
  activeTool,
  selectedModule,
  canUndo,
  canRedo,
  onToolChange,
  onAddModule,
  onDeleteSelected,
  onUndo,
  onRedo,
  moduleCount,
  connectionCount,
}) => {
  return (
    <>
      <Toolbar
        activeTool={activeTool}
        onToolChange={onToolChange}
        onAddModule={onAddModule}
        onDeleteSelected={onDeleteSelected}
        onUndo={onUndo}
        onRedo={onRedo}
        canUndo={canUndo}
        canRedo={canRedo}
      />
      <PropertyPanel module={selectedModule} onDelete={onDeleteSelected} />
      <StatusBar moduleCount={moduleCount} connectionCount={connectionCount} activeTool={activeTool} />
    </>
  );
};
