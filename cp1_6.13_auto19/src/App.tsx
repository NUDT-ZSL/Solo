import React, { useCallback, useEffect, useState } from 'react';
import { useStore } from './store';
import { ComponentType, THEME_PRESETS } from './types';
import Sidebar from './Sidebar';
import Canvas from './Canvas';
import PropertyPanel from './PropertyPanel';
import ExportModal from './ExportModal';
import { Download, ChevronDown, Paintbrush } from 'lucide-react';

const App: React.FC = () => {
  const { canvasBg, setCanvasBg, showExport, setShowExport, selectedId, deleteComponent } = useStore();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [themeOpen, setThemeOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedId) {
        deleteComponent(selectedId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, deleteComponent]);

  const isCompact = windowWidth < 1024;
  const sidebarWidth = isCompact ? 200 : 260;

  const handleDragStart = useCallback((type: ComponentType, e: React.DragEvent) => {
    e.dataTransfer.setData('component-type', type);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const handleDrop = useCallback(
    (type: ComponentType, x: number, y: number) => {
      useStore.getState().addComponent(type, x, y);
    },
    []
  );

  const currentTheme = THEME_PRESETS.find((t) => t.value === canvasBg) || THEME_PRESETS[0];

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#f0f4f8',
        fontFamily: "'Inter', sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* Navbar */}
      <nav
        style={{
          height: 56,
          background: '#1e293b',
          borderRadius: 12,
          margin: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Paintbrush size={20} style={{ color: '#3b82f6' }} />
          <span style={{ fontSize: 15, fontWeight: 600, color: '#ffffff' }}>
            CSS 组件库设计器
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Theme Selector */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setThemeOpen(!themeOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 8,
                border: '1px solid #334155',
                background: '#0f172a',
                color: '#e2e8f0',
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 4,
                  background: canvasBg,
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              />
              {currentTheme.label}
              <ChevronDown size={14} style={{ opacity: 0.6 }} />
            </button>
            {themeOpen && (
              <>
                <div
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9998,
                  }}
                  onClick={() => setThemeOpen(false)}
                />
                <div
                  className="animate-fade-in"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 4,
                    background: '#1e293b',
                    borderRadius: 10,
                    padding: 4,
                    minWidth: 160,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    zIndex: 9999,
                    border: '1px solid #334155',
                  }}
                >
                  {THEME_PRESETS.map((theme) => (
                    <button
                      key={theme.value}
                      onClick={() => {
                        setCanvasBg(theme.value);
                        setThemeOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: 'none',
                        background: canvasBg === theme.value ? '#334155' : 'transparent',
                        color: '#e2e8f0',
                        fontSize: 13,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 4,
                          background: theme.value,
                          border: '1px solid rgba(255,255,255,0.15)',
                          flexShrink: 0,
                        }}
                      />
                      {theme.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Export Button */}
          <button
            onClick={() => setShowExport(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#10b981',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#059669';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#10b981';
            }}
          >
            <Download size={14} />
            导出
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          gap: 8,
          padding: '0 8px 8px',
          minHeight: 0,
          flexDirection: isCompact ? 'column' : 'row',
        }}
      >
        {/* Sidebar */}
        {!isCompact && (
          <Sidebar onDragStart={handleDragStart} sidebarWidth={sidebarWidth} />
        )}
        {isCompact && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              padding: '0 4px',
              flexShrink: 0,
            }}
          >
            <Sidebar onDragStart={handleDragStart} sidebarWidth={sidebarWidth} />
          </div>
        )}

        {/* Canvas */}
        <Canvas onDrop={handleDrop} />

        {/* Property Panel (Desktop) */}
        {!isCompact && <PropertyPanel />}
      </div>

      {/* Bottom Drawer (Mobile) */}
      {isCompact && (
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            style={{
              width: '100%',
              padding: '8px',
              background: '#f8fafc',
              border: 'none',
              borderTop: '1px solid #e2e8f0',
              cursor: 'pointer',
              fontSize: 12,
              color: '#64748b',
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >
            {drawerOpen ? '▼ 收起属性面板' : '▲ 展开属性面板'}
          </button>
          <div
            style={{
              height: drawerOpen ? 280 : 0,
              overflow: 'hidden',
              transition: 'height 0.3s ease',
              background: '#f8fafc',
            }}
          >
            <div style={{ padding: '8px 12px', overflow: 'auto', height: 280 }}>
              <PropertyPanel />
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      <ExportModal />
    </div>
  );
};

export default App;
