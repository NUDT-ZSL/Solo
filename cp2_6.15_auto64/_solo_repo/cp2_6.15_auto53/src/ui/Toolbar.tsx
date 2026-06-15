import React from 'react';
import { usePartsStore } from '../store/partsStore';
import { animationController } from '../interaction/AnimationController';

interface ToolbarButtonProps {
  icon: string;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'danger';
  disabled?: boolean;
  shortcut?: string;
}

function ToolbarButton({ icon, label, onClick, variant = 'default', disabled = false, shortcut }: ToolbarButtonProps) {
  const variantStyles = {
    default: {
      background: 'linear-gradient(180deg, #4a4a4a, #3a3a3a)',
      color: '#e8e8e8',
      border: '1px solid #555',
    },
    primary: {
      background: 'linear-gradient(180deg, #a87545, #8b5e3c)',
      color: '#fff',
      border: '1px solid #b08050',
    },
    danger: {
      background: 'linear-gradient(180deg, #c04040, #a03030)',
      color: '#fff',
      border: '1px solid #d05050',
    },
  };

  const styles = variantStyles[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={shortcut ? `${label} (${shortcut})` : label}
      style={{
        height: '36px',
        padding: '0 14px',
        borderRadius: '6px',
        border: styles.border,
        background: disabled ? '#3a3a3a' : styles.background,
        color: disabled ? '#777' : styles.color,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '13px',
        fontWeight: 500,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.18s ease-out',
        boxShadow: disabled
          ? 'none'
          : '0 2px 4px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
        opacity: disabled ? 0.5 : 1,
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        if (!disabled) {
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)';
        }
      }}
      onMouseDown={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      <span style={{ fontSize: '16px', lineHeight: 1 }}>{icon}</span>
      <span style={{ letterSpacing: '0.2px' }}>{label}</span>
    </button>
  );
}

export function Toolbar() {
  const store = usePartsStore();
  const hasParts = store.parts.length > 0;
  const hasConnections = store.connections.length > 0;
  const isAnimating = store.isAnimating;

  const handleResetView = () => {
    animationController.animateCameraReset();
  };

  const handleDisassembleAll = () => {
    animationController.animateDisassembleAll();
  };

  const handleResetAll = () => {
    if (store.parts.length === 0) return;
    if (confirm('确定要清空工作台吗？所有零件和连接将被移除。')) {
      animationController.animateResetAll();
    }
  };

  const handleExportScreenshot = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    try {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `榫卯设计_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
        a.click();
        URL.revokeObjectURL(url);
      });
    } catch (e) {
      console.warn('Screenshot failed:', e);
    }
  };

  return (
    <div style={{
      height: '50px',
      background: '#3a3a3a',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: '10px',
      borderBottom: '1px solid #1a1a1a',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      position: 'relative',
      zIndex: 10,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginRight: '16px',
        paddingRight: '16px',
        borderRight: '1px solid #555',
        height: '30px',
      }}>
        <div style={{
          width: '30px',
          height: '30px',
          borderRadius: '7px',
          background: 'linear-gradient(135deg, #d4a76a 0%, #8b5e3c 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          boxShadow: '0 2px 6px rgba(139,94,60,0.4)',
        }}>
          🏯
        </div>
        <div>
          <div style={{
            fontSize: '14px',
            fontWeight: 700,
            color: '#f0e4cc',
            letterSpacing: '0.3px',
          }}>
            榫卯结构交互演示
          </div>
          <div style={{
            fontSize: '10px',
            color: '#999',
            marginTop: '-1px',
          }}>
            Mortise & Tenon Simulator
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flex: 1,
      }}>
        <ToolbarButton
          icon="🎯"
          label="重置视角"
          onClick={handleResetView}
          variant="default"
        />
        <ToolbarButton
          icon="💥"
          label="一键拆解"
          onClick={handleDisassembleAll}
          variant="primary"
          disabled={!hasConnections || isAnimating}
        />
        <ToolbarButton
          icon="🗑️"
          label="清空工作台"
          onClick={handleResetAll}
          variant="danger"
          disabled={!hasParts || isAnimating}
        />
        <div style={{
          width: '1px',
          height: '24px',
          background: '#555',
          margin: '0 4px',
        }} />
        <ToolbarButton
          icon="📷"
          label="截图保存"
          onClick={handleExportScreenshot}
          variant="default"
          disabled={!hasParts}
        />
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 10px',
          background: '#2e2e2e',
          borderRadius: '6px',
          border: '1px solid #444',
        }}>
          <span style={{ fontSize: '13px' }}>📦</span>
          <span style={{
            fontSize: '12px',
            color: '#aaa',
            fontWeight: 500,
          }}>
            零件 <span style={{ color: '#d4a76a', fontWeight: 600 }}>{store.parts.length}</span>
          </span>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 10px',
          background: '#2e2e2e',
          borderRadius: '6px',
          border: '1px solid #444',
        }}>
          <span style={{ fontSize: '13px' }}>🔗</span>
          <span style={{
            fontSize: '12px',
            color: '#aaa',
            fontWeight: 500,
          }}>
            连接 <span style={{
              color: hasConnections > 0 ? '#86efac' : '#666',
              fontWeight: 600,
            }}>{store.connections.length}</span>
          </span>
        </div>
        {isAnimating && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            background: 'rgba(251, 191, 36, 0.1)',
            borderRadius: '6px',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            animation: 'pulse 1s ease-in-out infinite',
          }}>
            <span style={{ fontSize: '12px' }}>⏳</span>
            <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 500 }}>动画中...</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
