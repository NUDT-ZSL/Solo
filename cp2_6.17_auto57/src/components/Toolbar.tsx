import React from 'react';

interface ToolbarProps {
  editMode: 'raise' | 'lower';
  brushRadius: number;
  smoothIterations: number;
  onToggleEditMode: () => void;
  onBrushRadiusChange: (v: number) => void;
  onSmoothIterationsChange: (v: number) => void;
  onUndo: () => void;
  onReset: () => void;
  onExport: () => void;
  isTablet: boolean;
}

const buttonStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: '50%',
  background: '#263238',
  border: '1px solid #37474f',
  color: '#cfd8dc',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  fontSize: 18,
  outline: 'none',
  flexShrink: 0,
};

const Toolbar: React.FC<ToolbarProps> = ({
  editMode,
  brushRadius,
  smoothIterations,
  onToggleEditMode,
  onBrushRadiusChange,
  onSmoothIterationsChange,
  onUndo,
  onReset,
  onExport,
  isTablet,
}) => {
  const buttons = (
    <>
      <button
        onClick={onToggleEditMode}
        style={buttonStyle}
        title={editMode === 'raise' ? '切换到下陷' : '切换到隆起'}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = '#37474f';
          (e.currentTarget as HTMLElement).style.width = '48px';
          (e.currentTarget as HTMLElement).style.height = '48px';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 0 8px rgba(100,181,246,0.4)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = '#263238';
          (e.currentTarget as HTMLElement).style.width = '44px';
          (e.currentTarget as HTMLElement).style.height = '44px';
          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        }}
      >
        {editMode === 'raise' ? '⬆' : '⬇'}
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <button
          style={{ ...buttonStyle, fontSize: 14 }}
          title="刷头半径"
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#37474f';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 0 8px rgba(100,181,246,0.4)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#263238';
            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
          }}
        >
          ◯
        </button>
        <input
          type="range"
          min={20}
          max={100}
          value={brushRadius}
          onChange={(e) => onBrushRadiusChange(Number(e.target.value))}
          style={{ width: 40, accentColor: '#64b5f6' }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <button
          style={{ ...buttonStyle, fontSize: 14 }}
          title="平滑强度"
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#37474f';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 0 8px rgba(100,181,246,0.4)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#263238';
            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
          }}
        >
          ≋
        </button>
        <input
          type="range"
          min={0}
          max={5}
          value={smoothIterations}
          onChange={(e) => onSmoothIterationsChange(Number(e.target.value))}
          style={{ width: 40, accentColor: '#64b5f6' }}
        />
      </div>
      <button
        onClick={onUndo}
        style={buttonStyle}
        title="撤销"
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = '#37474f';
          (e.currentTarget as HTMLElement).style.width = '48px';
          (e.currentTarget as HTMLElement).style.height = '48px';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 0 8px rgba(100,181,246,0.4)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = '#263238';
          (e.currentTarget as HTMLElement).style.width = '44px';
          (e.currentTarget as HTMLElement).style.height = '44px';
          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        }}
      >
        ↩
      </button>
      <button
        onClick={onReset}
        style={buttonStyle}
        title="重置地形"
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = '#37474f';
          (e.currentTarget as HTMLElement).style.width = '48px';
          (e.currentTarget as HTMLElement).style.height = '48px';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 0 8px rgba(100,181,246,0.4)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = '#263238';
          (e.currentTarget as HTMLElement).style.width = '44px';
          (e.currentTarget as HTMLElement).style.height = '44px';
          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        }}
      >
        ⟲
      </button>
      <button
        onClick={onExport}
        style={buttonStyle}
        title="导出PNG高度图"
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = '#37474f';
          (e.currentTarget as HTMLElement).style.width = '48px';
          (e.currentTarget as HTMLElement).style.height = '48px';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 0 8px rgba(100,181,246,0.4)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = '#263238';
          (e.currentTarget as HTMLElement).style.width = '44px';
          (e.currentTarget as HTMLElement).style.height = '44px';
          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        }}
      >
        💾
      </button>
      <div
        style={{
          color: '#b0bec5',
          fontSize: 13,
          textAlign: 'center',
          lineHeight: 1.5,
          marginTop: 8,
        }}
      >
        笔刷直径: {brushRadius * 2}px
        <br />
        平滑次数: {smoothIterations}
      </div>
    </>
  );

  if (isTablet) {
    const [expanded, setExpanded] = React.useState(false);
    return (
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: expanded ? 220 : 60,
          background: '#1e2a38',
          border: '1px solid #37474f',
          borderRadius: '8px 8px 0 0',
          zIndex: 20,
          transition: 'height 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 8,
          overflow: 'hidden',
        }}
      >
        <div
          onClick={() => setExpanded(!expanded)}
          style={{
            width: 40,
            height: 4,
            background: '#546e7a',
            borderRadius: 2,
            cursor: 'pointer',
            marginBottom: 12,
            flexShrink: 0,
          }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12,
            justifyContent: 'center',
            overflow: 'auto',
          }}
        >
          {buttons}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: 12,
        transform: 'translateY(-50%)',
        background: '#1e2a38',
        border: '1px solid #37474f',
        borderRadius: 8,
        padding: '12px 8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        zIndex: 20,
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
      }}
    >
      {buttons}
    </div>
  );
};

export default Toolbar;
