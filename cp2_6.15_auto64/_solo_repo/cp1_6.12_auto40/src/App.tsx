/**
 * App.tsx - 应用根组件
 *
 * 数据流向：
 *   - 顶层：ThemeProvider → ComponentProvider → 向下注入全局状态
 *   - 布局层：三栏布局（左侧导航 + 中央预览 + 右侧编辑器）
 *   - 响应式：监听视口宽度 → 切换布局模式（桌面/平板/移动）
 *
 * 响应式布局逻辑：
 *   - > 900px (桌面)：完整三栏布局，240px + 自适应 + 320px
 *   - ≤ 900px (平板)：左侧 200px + 右侧折叠为底部抽屉
 *   - ≤ 700px (移动)：顶部标签页导航 + 内容区 + 底部抽屉
 *
 * 状态同步：
 *   - 抽屉状态：视口从桌面变平板时自动收起抽屉，避免布局跳跃
 *   - 组件选中状态：由 componentStore 统一管理，ComponentList 和 ComponentPreview 共享
 *
 * 调用关系：
 *   - 调用：ComponentList / ComponentPreview / ThemeEditor
 *   - 被调用：main.tsx 渲染根节点
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { ThemeProvider } from '@/state/themeStore';
import { ComponentProvider } from '@/state/componentStore';
import ComponentList from '@/components/ComponentList';
import ComponentPreview from '@/components/ComponentPreview';
import ThemeEditor from '@/components/ThemeEditor';
import { Palette, X } from 'lucide-react';
import './App.css';

const MOBILE_BREAKPOINT = 900;

const AppContent = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const prevIsMobileRef = useRef(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (prevIsMobileRef.current === false && mobile === true) {
        setDrawerOpen(false);
      }
      prevIsMobileRef.current = mobile;
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
            <div
              className="app__drawer-overlay"
              onClick={closeDrawer}
              role="presentation"
            />
          )}

          <div
            className={`app__drawer ${drawerOpen ? 'app__drawer--open' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="主题编辑器"
          >
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

const App = () => {
  return (
    <ThemeProvider>
      <ComponentProvider>
        <AppContent />
      </ComponentProvider>
    </ThemeProvider>
  );
};

export default App;
