import React, { useState, useCallback, useEffect } from 'react';
import { ThemeProvider } from '@/state/themeStore';
import { ComponentProvider } from '@/state/componentStore';
import ComponentList from '@/components/ComponentList';
import ComponentPreview from '@/components/ComponentPreview';
import ThemeEditor from '@/components/ThemeEditor';
import { Palette, X } from 'lucide-react';
import './App.css';

const AppContent: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 900);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleDrawer = useCallback(() => {
    setDrawerOpen(prev => !prev);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  return (
    <div className="app">
      <div className="app__layout">
        <ComponentList />
        <ComponentPreview />
        {!isMobile && <ThemeEditor />}
      </div>

      {isMobile && (
        <>
          <button
            className="app__drawer-toggle"
            onClick={toggleDrawer}
            type="button"
            aria-label="打开主题编辑器"
          >
            <Palette size={20} />
          </button>

          {drawerOpen && (
            <div className="app__drawer-overlay" onClick={closeDrawer} />
          )}

          <div className={`app__drawer ${drawerOpen ? 'app__drawer--open' : ''}`}>
            <div className="app__drawer-header">
              <h3 className="app__drawer-title">主题定制</h3>
              <button
                className="app__drawer-close"
                onClick={closeDrawer}
                type="button"
                aria-label="关闭"
              >
                <X size={20} />
              </button>
            </div>
            <div className="app__drawer-content">
              <ThemeEditor />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ComponentProvider>
        <AppContent />
      </ComponentProvider>
    </ThemeProvider>
  );
};

export default App;
