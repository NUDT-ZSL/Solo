import React from 'react';

interface ControlPanelProps {
  beaconCount: number;
  canUndo: boolean;
  onClear: () => void;
  onUndo: () => void;
  onExport: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  beaconCount,
  canUndo,
  onClear,
  onUndo,
  onExport,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '10px 24px',
        background: 'rgba(15, 15, 40, 0.65)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(120, 110, 200, 0.2)',
        borderRadius: 16,
        zIndex: 10,
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(180, 170, 255, 0.08)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: 'rgba(190, 180, 240, 0.9)',
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: '0.5px',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(140, 120, 255, 0.4), rgba(80, 60, 200, 0.3))',
            border: '1px solid rgba(160, 140, 255, 0.3)',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {beaconCount}
        </span>
        <span>信标</span>
      </div>

      <div
        style={{
          width: 1,
          height: 24,
          background: 'rgba(120, 110, 200, 0.25)',
        }}
      />

      <PanelButton onClick={onClear} disabled={beaconCount === 0} title="清空所有信标">
        清空
      </PanelButton>

      <PanelButton onClick={onUndo} disabled={!canUndo} title="撤销上一步">
        撤销
      </PanelButton>

      <PanelButton onClick={onExport} disabled={beaconCount === 0} title="导出路径为JSON">
        导出
      </PanelButton>
    </div>
  );
};

interface PanelButtonProps {
  onClick: () => void;
  disabled: boolean;
  title: string;
  children: React.ReactNode;
}

const PanelButton: React.FC<PanelButtonProps> = ({ onClick, disabled, title, children }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        background: disabled
          ? 'rgba(60, 55, 100, 0.25)'
          : 'rgba(100, 90, 180, 0.25)',
        border: `1px solid ${disabled ? 'rgba(100, 90, 180, 0.1)' : 'rgba(140, 120, 255, 0.3)'}`,
        borderRadius: 10,
        padding: '6px 16px',
        color: disabled ? 'rgba(120, 110, 160, 0.5)' : 'rgba(200, 190, 255, 0.9)',
        fontSize: 13,
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        letterSpacing: '0.3px',
        outline: 'none',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          (e.target as HTMLButtonElement).style.background = 'rgba(120, 100, 220, 0.35)';
          (e.target as HTMLButtonElement).style.borderColor = 'rgba(160, 140, 255, 0.5)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          (e.target as HTMLButtonElement).style.background = 'rgba(100, 90, 180, 0.25)';
          (e.target as HTMLButtonElement).style.borderColor = 'rgba(140, 120, 255, 0.3)';
        }
      }}
    >
      {children}
    </button>
  );
};
