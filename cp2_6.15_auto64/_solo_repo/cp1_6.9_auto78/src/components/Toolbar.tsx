import React, { useState } from 'react';

export interface ToolbarProps {
  onAddRootNode: () => void;
  onAddChildNode: () => void;
  onDeleteSelected: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onToggleVersionPanel: () => void;
  onTakeSnapshot: () => void;
  canUndo: boolean;
  canRedo: boolean;
  versionPanelOpen: boolean;
  roomId: string;
  userName: string;
}

const toolbarBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 14px',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: '#F5F5F5',
  cursor: 'pointer',
  fontSize: '13px',
  transition: 'all 0.2s ease',
  backdropFilter: 'blur(10px)',
  userSelect: 'none',
  whiteSpace: 'nowrap'
};

const Toolbar: React.FC<ToolbarProps> = ({
  onAddRootNode,
  onAddChildNode,
  onDeleteSelected,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onResetView,
  onToggleVersionPanel,
  onTakeSnapshot,
  canUndo,
  canRedo,
  versionPanelOpen,
  roomId,
  userName
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const btnHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    const target = e.currentTarget;
    target.style.background = 'rgba(59, 130, 246, 0.3)';
    target.style.borderColor = 'rgba(59, 130, 246, 0.5)';
  };

  const btnLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    const target = e.currentTarget;
    target.style.background = 'rgba(255,255,255,0.08)';
    target.style.borderColor = 'rgba(255,255,255,0.1)';
  };

  const btnDisabled: React.CSSProperties = {
    opacity: 0.4,
    cursor: 'not-allowed'
  };

  const renderToolbarButtons = () => (
    <>
      <button
        style={toolbarBtnStyle}
        onMouseEnter={btnHover}
        onMouseLeave={btnLeave}
        onClick={onAddRootNode}
        title="添加根节点"
      >
        <span style={{ fontSize: '16px' }}>🌳</span>
        <span>根节点</span>
      </button>

      <button
        style={toolbarBtnStyle}
        onMouseEnter={btnHover}
        onMouseLeave={btnLeave}
        onClick={onAddChildNode}
        title="添加子节点"
      >
        <span style={{ fontSize: '16px' }}>➕</span>
        <span>子节点</span>
      </button>

      <button
        style={toolbarBtnStyle}
        onMouseEnter={btnHover}
        onMouseLeave={btnLeave}
        onClick={onDeleteSelected}
        title="删除选中"
      >
        <span style={{ fontSize: '16px' }}>🗑️</span>
        <span>删除</span>
      </button>

      <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

      <button
        style={{ ...toolbarBtnStyle, ...(!canUndo ? btnDisabled : {}) }}
        onMouseEnter={canUndo ? btnHover : undefined}
        onMouseLeave={canUndo ? btnLeave : undefined}
        onClick={onUndo}
        disabled={!canUndo}
        title="撤销"
      >
        <span style={{ fontSize: '16px' }}>↩️</span>
        <span>撤销</span>
      </button>

      <button
        style={{ ...toolbarBtnStyle, ...(!canRedo ? btnDisabled : {}) }}
        onMouseEnter={canRedo ? btnHover : undefined}
        onMouseLeave={canRedo ? btnLeave : undefined}
        onClick={onRedo}
        disabled={!canRedo}
        title="重做"
      >
        <span style={{ fontSize: '16px' }}>↪️</span>
        <span>重做</span>
      </button>

      <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

      <button
        style={toolbarBtnStyle}
        onMouseEnter={btnHover}
        onMouseLeave={btnLeave}
        onClick={onZoomOut}
        title="缩小"
      >
        <span style={{ fontSize: '16px' }}>🔍</span>
        <span>-</span>
      </button>

      <button
        style={toolbarBtnStyle}
        onMouseEnter={btnHover}
        onMouseLeave={btnLeave}
        onClick={onZoomIn}
        title="放大"
      >
        <span style={{ fontSize: '16px' }}>🔍</span>
        <span>+</span>
      </button>

      <button
        style={toolbarBtnStyle}
        onMouseEnter={btnHover}
        onMouseLeave={btnLeave}
        onClick={onResetView}
        title="重置视图"
      >
        <span style={{ fontSize: '16px' }}>🎯</span>
        <span>重置</span>
      </button>

      <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

      <button
        style={toolbarBtnStyle}
        onMouseEnter={btnHover}
        onMouseLeave={btnLeave}
        onClick={onTakeSnapshot}
        title="保存版本"
      >
        <span style={{ fontSize: '16px' }}>💾</span>
        <span>保存</span>
      </button>

      <button
        style={{
          ...toolbarBtnStyle,
          background: versionPanelOpen ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255,255,255,0.08)',
          borderColor: versionPanelOpen ? 'rgba(59, 130, 246, 0.6)' : 'rgba(255,255,255,0.1)'
        }}
        onMouseEnter={btnHover}
        onMouseLeave={btnLeave}
        onClick={onToggleVersionPanel}
        title="版本历史"
      >
        <span style={{ fontSize: '16px' }}>📜</span>
        <span>历史</span>
      </button>
    </>
  );

  return (
    <div
      style={{
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        position: 'relative',
        zIndex: 100
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          fontSize: '18px',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #10B981, #3B82F6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          whiteSpace: 'nowrap'
        }}>
          🧠 智联图谱
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          background: 'rgba(16, 185, 129, 0.15)',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#10B981'
        }}>
          <span>房间:</span>
          <code style={{ fontFamily: 'monospace', fontWeight: 600 }}>{roomId}</code>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          background: 'rgba(59, 130, 246, 0.15)',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#60A5FA',
          whiteSpace: 'nowrap'
        }}>
          <span>👤</span>
          <span>{userName}</span>
        </div>
      </div>

      <div
        className="toolbar-desktop"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'nowrap'
        }}
      >
        {renderToolbarButtons()}
      </div>

      <div
        className="toolbar-mobile"
        style={{ display: 'none' }}
      >
        <button
          style={{
            ...toolbarBtnStyle,
            padding: '8px 12px'
          }}
          onMouseEnter={btnHover}
          onMouseLeave={btnLeave}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span style={{ fontSize: '18px' }}>{mobileMenuOpen ? '✕' : '☰'}</span>
        </button>
      </div>

      {mobileMenuOpen && (
        <div
          style={{
            position: 'absolute',
            top: '60px',
            right: '10px',
            background: 'rgba(26, 26, 46, 0.98)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            minWidth: '180px'
          }}
        >
          {renderToolbarButtons()}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .toolbar-desktop { display: none !important; }
          .toolbar-mobile { display: block !important; }
        }
        button:active { transform: scale(0.95); }
      `}</style>
    </div>
  );
};

export default Toolbar;
