import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Canvas from './components/Canvas';
import { useWebSocket } from './hooks/useWebSocket';

// ==================== 工具栏按钮组件 ====================
interface ToolButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  mobile?: boolean;
}

const ToolButton: React.FC<ToolButtonProps> = ({ onClick, icon, label, shortcut, disabled, mobile }) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);
  const rippleIdRef = useRef(0);

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;
    const btn = btnRef.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = ++rippleIdRef.current;
      setRipples((prev) => [...prev, { x, y, id }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 600);
    }
    onClick();
  };

  return (
    <button
      ref={btnRef}
      onClick={handleClick}
      disabled={disabled}
      title={shortcut ? `${label} (${shortcut})` : label}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: mobile ? 'center' : 'flex-start',
        gap: 10,
        padding: mobile ? '12px 14px' : '10px 16px',
        width: mobile ? '100%' : 'auto',
        minWidth: mobile ? 'auto' : 44,
        height: mobile ? 'auto' : 44,
        border: '0.5px solid rgba(255,255,255,0.15)',
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        color: disabled ? 'rgba(255,255,255,0.3)' : '#FFFFFF',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 14,
        fontWeight: 500,
        transition: 'transform 0.15s ease, background-color 0.2s ease, box-shadow 0.2s ease',
        transform: disabled ? 'none' : 'scale(1)',
        overflow: 'hidden',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        fontFamily: 'inherit',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
          (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 18px rgba(0,0,0,0.4)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
          (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        }
      }}
      onMouseDown={(e) => {
        if (!disabled) (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)';
      }}
      onMouseUp={(e) => {
        if (!disabled) (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, flexShrink: 0 }}>
        {icon}
      </span>
      {!mobile && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
      {!mobile && shortcut && (
        <span style={{
          marginLeft: 'auto',
          fontSize: 11,
          color: 'rgba(255,255,255,0.4)',
          fontWeight: 500,
          padding: '2px 6px',
          border: '0.5px solid rgba(255,255,255,0.12)',
          borderRadius: 5,
        }}>
          {shortcut}
        </span>
      )}
      {/* 波纹 */}
      {ripples.map((r) => (
        <span
          key={r.id}
          style={{
            position: 'absolute',
            left: r.x,
            top: r.y,
            width: 0,
            height: 0,
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.4)',
            transform: 'translate(-50%, -50%)',
            animation: 'ripple 0.6s ease-out forwards',
            pointerEvents: 'none',
          }}
        />
      ))}
    </button>
  );
};

// ==================== 分隔线 ====================
const Divider: React.FC = () => (
  <div style={{
    width: '100%',
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    margin: '6px 0',
  }} />
);

// ==================== 主应用组件 ====================
const App: React.FC = () => {
  const { state, users, connected, send, autoLayoutTrigger } = useWebSocket();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 响应式判断
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const cardsArray = useMemo(() => Object.values(state.cards), [state.cards]);
  const connectionsArray = useMemo(() => Object.values(state.connections), [state.connections]);

  const handleAddCard = useCallback(() => {
    // 新卡片放到画布中心附近
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = (w / 2) * 0.5 - 110 + Math.random() * 80;
    const cy = (h / 2) * 0.5 - 80 + Math.random() * 80;
    send('createCard', { x: cx, y: cy });
  }, [send]);

  const handleAutoLayout = useCallback(() => {
    send('autoLayout');
  }, [send]);

  const handleUndo = useCallback(() => {
    send('undo');
  }, [send]);

  const handleRedo = useCallback(() => {
    send('redo');
  }, [send]);

  const handleCreateCard = useCallback((x: number, y: number) => {
    send('createCard', { x, y });
  }, [send]);

  const handleUpdateCard = useCallback((id: string, changes: any) => {
    send('updateCard', { id, changes });
  }, [send]);

  const handleDeleteCard = useCallback((id: string) => {
    send('deleteCard', { id });
    if (selectedCardId === id) setSelectedCardId(null);
  }, [send, selectedCardId]);

  const handleCreateConnection = useCallback((fromId: string, toId: string) => {
    send('createConnection', { fromCardId: fromId, toCardId: toId });
  }, [send]);

  const handleDeleteConnection = useCallback((id: string) => {
    send('deleteConnection', { id });
  }, [send]);

  // 工具按钮图标
  const iconAdd = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
  const iconLayout = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="6" r="2.5" />
      <circle cx="19" cy="6" r="2.5" />
      <circle cx="12" cy="18" r="2.5" />
      <line x1="7" y1="8" x2="10.5" y2="16" />
      <line x1="17" y1="8" x2="13.5" y2="16" />
      <line x1="7.5" y1="6" x2="16.5" y2="6" />
    </svg>
  );
  const iconUndo = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-15-6.7L3 13" />
    </svg>
  );
  const iconRedo = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 0 1 15-6.7L21 13" />
    </svg>
  );
  const iconMenu = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
  const iconClose = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  const toolbarContent = (
    <>
      <ToolButton onClick={handleAddCard} icon={iconAdd} label="添加卡片" shortcut="双击画布" mobile={isMobile} />
      <ToolButton onClick={handleAutoLayout} icon={iconLayout} label="自动布局" mobile={isMobile} />
      {isMobile && <Divider />}
      <ToolButton onClick={handleUndo} icon={iconUndo} label="撤销" shortcut="Ctrl+Z" mobile={isMobile} />
      <ToolButton onClick={handleRedo} icon={iconRedo} label="重做" shortcut="Ctrl+Y" mobile={isMobile} />
    </>
  );

  return (
    <>
      {/* 波纹动画样式 */}
      <style>{`
        @keyframes ripple {
          0% { width: 0; height: 0; opacity: 0.6; }
          100% { width: 400px; height: 400px; opacity: 0; }
        }
        [contenteditable][data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: rgba(255,255,255,0.3);
          pointer-events: none;
        }
        [contenteditable][data-placeholder]:not([data-placeholder*="标题"]):empty::before {
          color: rgba(26,26,46,0.35);
        }
      `}</style>

      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        {/* 画布 */}
        <Canvas
          cards={cardsArray}
          connections={connectionsArray}
          selectedCardId={selectedCardId}
          onSelectCard={setSelectedCardId}
          onCreateCard={handleCreateCard}
          onUpdateCard={handleUpdateCard}
          onDeleteCard={handleDeleteCard}
          onCreateConnection={handleCreateConnection}
          onDeleteConnection={handleDeleteConnection}
          onUndo={handleUndo}
          onRedo={handleRedo}
          autoLayoutTrigger={autoLayoutTrigger}
        />

        {/* 桌面工具栏 */}
        {!isMobile && (
          <div
            style={{
              position: 'fixed',
              top: 20,
              left: 20,
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: 12,
              borderRadius: 14,
              backgroundColor: 'rgba(26, 26, 46, 0.55)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '0.5px solid rgba(255,255,255,0.12)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '2px 4px 10px 4px',
              borderBottom: '0.5px solid rgba(255,255,255,0.08)',
              marginBottom: 4,
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: 8,
                background: 'linear-gradient(135deg, #9B59B6 0%, #3498DB 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14,
              }}>
                💡
              </div>
              <div>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>灵感网</div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10.5, marginTop: 2 }}>协作脑暴白板</div>
              </div>
              <div style={{
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 8px',
                borderRadius: 999,
                backgroundColor: connected ? 'rgba(39, 174, 96, 0.15)' : 'rgba(231, 76, 60, 0.15)',
                border: `0.5px solid ${connected ? 'rgba(39, 174, 96, 0.4)' : 'rgba(231, 76, 60, 0.4)'}`,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  backgroundColor: connected ? '#27AE60' : '#E74C3C',
                  boxShadow: connected ? '0 0 6px rgba(39,174,96,0.6)' : '0 0 6px rgba(231,76,60,0.6)',
                }} />
                <span style={{ fontSize: 10.5, color: connected ? '#6FCF97' : '#F29B9B', fontWeight: 600 }}>
                  {connected ? '已连接' : '断开'}
                </span>
              </div>
            </div>
            {toolbarContent}
            <Divider />
            <div style={{
              padding: '4px 6px',
              color: 'rgba(255,255,255,0.4)',
              fontSize: 10.5,
              lineHeight: 1.7,
              maxWidth: 230,
            }}>
              <div>🖱️ 滚轮缩放 / 拖拽平移</div>
              <div>✏️ 双击创建卡片</div>
              <div>🔗 Shift+拖拽标题创建连接</div>
            </div>
          </div>
        )}

        {/* 移动端：汉堡菜单按钮 */}
        {isMobile && (
          <>
            <button
              onClick={() => setMobileMenuOpen(true)}
              style={{
                position: 'fixed',
                top: 16,
                left: 16,
                zIndex: 1000,
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: 'rgba(26, 26, 46, 0.7)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '0.5px solid rgba(255,255,255,0.15)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 24px rgba(0,0,0,0.4)',
              }}
            >
              {iconMenu}
            </button>
            {/* 小Logo */}
            <div style={{
              position: 'fixed',
              top: 16,
              left: 72,
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 12px',
              height: 48,
              borderRadius: 12,
              backgroundColor: 'rgba(26, 26, 46, 0.6)',
              backdropFilter: 'blur(16px)',
              border: '0.5px solid rgba(255,255,255,0.12)',
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6,
                background: 'linear-gradient(135deg, #9B59B6 0%, #3498DB 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12,
              }}>💡</div>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>灵感网</span>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                backgroundColor: connected ? '#27AE60' : '#E74C3C',
                marginLeft: 4,
              }} />
            </div>

            {/* 移动端菜单遮罩 */}
            {mobileMenuOpen && (
              <div
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 2000,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(2px)',
                }}
              />
            )}
            {/* 移动端侧边栏菜单 */}
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: mobileMenuOpen ? 0 : -300,
                width: '78%',
                maxWidth: 280,
                height: '100%',
                zIndex: 2001,
                backgroundColor: 'rgba(22, 22, 40, 0.96)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRight: '0.5px solid rgba(255,255,255,0.1)',
                boxShadow: '10px 0 40px rgba(0,0,0,0.5)',
                transition: 'left 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                display: 'flex',
                flexDirection: 'column',
                padding: 16,
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: 'linear-gradient(135deg, #9B59B6 0%, #3498DB 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18,
                  }}>💡</div>
                  <div>
                    <div style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>灵感网</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 }}>协作脑暴白板</div>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    width: 38, height: 38,
                    borderRadius: 10,
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    border: '0.5px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >{iconClose}</button>
              </div>
              <Divider />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {toolbarContent}
              </div>
              <Divider />
              <div style={{
                padding: '10px 6px',
                color: 'rgba(255,255,255,0.45)',
                fontSize: 11.5,
                lineHeight: 1.9,
              }}>
                <div style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 600, marginBottom: 4 }}>操作指南</div>
                <div>🖱️ 双指/滚轮缩放画布</div>
                <div>✋ 单指拖拽或空格+拖拽平移</div>
                <div>📌 双击空白创建卡片</div>
                <div>🎨 文字情感自动上色</div>
                <div>🔗 按住Shift从卡片底部拖至另一卡片顶部</div>
              </div>
            </div>
          </>
        )}

        {/* 右下角：在线用户 + 缩放比例 */}
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 10,
          }}
        >
          {/* 用户头像组 */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            padding: '8px 10px',
            borderRadius: 14,
            backgroundColor: 'rgba(26, 26, 46, 0.55)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '0.5px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
            maxWidth: 220,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: users.length > 0 ? 8 : 0,
              padding: users.length > 0 ? '0 2px' : 0,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
                在线 · {users.length} 人
              </span>
            </div>
            {users.length > 0 && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: -6,
                justifyContent: 'flex-end',
              }}>
                {users.map((user, idx) => (
                  <div
                    key={user.id}
                    title={`${user.name}`}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      backgroundColor: user.color,
                      border: '2px solid #1A1A2E',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      marginLeft: idx > 0 ? -8 : 0,
                      position: 'relative',
                      zIndex: users.length - idx,
                      flexShrink: 0,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    }}
                  >
                    {user.avatar}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 统计信息 */}
          <div style={{
            display: 'flex',
            gap: 8,
          }}>
            <div style={{
              padding: '7px 12px',
              borderRadius: 10,
              backgroundColor: 'rgba(26, 26, 46, 0.55)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              fontSize: 11,
              color: 'rgba(255,255,255,0.55)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span style={{
                display: 'inline-block',
                width: 7, height: 7, borderRadius: 2,
                backgroundColor: '#9B59B6',
              }} />
              {cardsArray.length} 卡片
            </div>
            <div style={{
              padding: '7px 12px',
              borderRadius: 10,
              backgroundColor: 'rgba(26, 26, 46, 0.55)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              fontSize: 11,
              color: 'rgba(255,255,255,0.55)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" strokeLinecap="round">
                <line x1="5" y1="19" x2="19" y2="5" />
              </svg>
              {connectionsArray.length} 连线
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default App;
