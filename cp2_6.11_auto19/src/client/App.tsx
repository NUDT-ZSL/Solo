/**
 * 主应用组件
 * 管理整体布局、响应式状态、初始化数据
 */

import { useState, useEffect, useCallback } from 'react';
import { Menu, X, Sparkles, Network } from 'lucide-react';
import GraphView from './components/GraphView';
import Sidebar from './components/Sidebar';
import ContextMenu from './components/ContextMenu';
import NoteModal from './components/NoteModal';
import { useGraphStore } from './store/useGraphStore';

export default function App() {
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const nodes = useGraphStore(state => state.nodes);
  const rootWord = useGraphStore(state => state.rootWord);
  const fetchSavedGraphs = useGraphStore(state => state.fetchSavedGraphs);
  const isLoading = useGraphStore(state => state.isLoading);
  const hideContextMenu = useGraphStore(state => state.hideContextMenu);

  // 响应式检测
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 计算 Canvas 尺寸
  useEffect(() => {
    const updateSize = () => {
      const headerHeight = 60;
      const sidebarWidth = isMobile ? 0 : (sidebarOpen ? 300 : 0);
      setCanvasSize({
        width: window.innerWidth - sidebarWidth,
        height: window.innerHeight - headerHeight,
      });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [sidebarOpen, isMobile]);

  // 初始化加载已保存的图谱列表
  useEffect(() => {
    fetchSavedGraphs();
  }, [fetchSavedGraphs]);

  // 点击空白处关闭右键菜单
  const handleMainClick = useCallback(() => {
    hideContextMenu();
  }, [hideContextMenu]);

  // ESC 键关闭各种弹窗
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        hideContextMenu();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [hideContextMenu]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#0D1B2A',
        background: 'linear-gradient(135deg, #0D1B2A 0%, #1B263B 100%)',
        background: '-webkit-linear-gradient(135deg, #0D1B2A 0%, #1B263B 100%)',
        overflow: 'hidden',
      }}
      onClick={handleMainClick}
    >
      {/* 顶部导航栏 */}
      <header
        style={{
          height: '60px',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(13, 27, 42, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          zIndex: 50,
        }}
      >
        {/* Logo 和标题 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #4A90D9 0%, #D98A4A 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(74, 144, 217, 0.4)',
            }}
          >
            <Network size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#fff',
              margin: 0,
              fontFamily: '"Noto Serif SC", serif',
              letterSpacing: '0.5px',
            }}>
              词络织梦
            </h1>
            {rootWord && (
              <div style={{
                fontSize: '11px',
                color: 'rgba(255,255,255,0.5)',
                fontFamily: '"Noto Sans SC", sans-serif',
              }}>
                关键词: <span style={{ color: '#4A90D9' }}>{rootWord}</span>
                {` · ${nodes.length} 节点`}
              </div>
            )}
          </div>
        </div>

        {/* 右侧操作区 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          {/* 加载状态指示 */}
          {isLoading && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '12px',
              fontFamily: '"Noto Sans SC", sans-serif',
            }}>
              <Sparkles size={14} className="spin" />
              <span>生成中...</span>
            </div>
          )}

          {/* 侧边栏切换按钮 */}
          <button
            onClick={toggleSidebar}
            style={{
              width: '36px',
              height: '36px',
              background: sidebarOpen
                ? 'rgba(74, 144, 217, 0.2)'
                : 'rgba(255,255,255,0.08)',
              border: `1px solid ${sidebarOpen
                ? 'rgba(74, 144, 217, 0.4)'
                : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '8px',
              color: sidebarOpen ? '#4A90D9' : 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(74, 144, 217, 0.25)';
              e.currentTarget.style.borderColor = 'rgba(74, 144, 217, 0.5)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = sidebarOpen
                ? 'rgba(74, 144, 217, 0.2)'
                : 'rgba(255,255,255,0.08)';
              e.currentTarget.style.borderColor = sidebarOpen
                ? 'rgba(74, 144, 217, 0.4)'
                : 'rgba(255,255,255,0.1)';
            }}
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* 主内容区 */}
      <main style={{
        flex: 1,
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Canvas 图谱区域 */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            background: '#0D1B2A',
            background: 'linear-gradient(135deg, #0D1B2A 0%, #1B263B 100%)',
            background: '-webkit-linear-gradient(135deg, #0D1B2A 0%, #1B263B 100%)',
          }}
        >
          {canvasSize.width > 0 && canvasSize.height > 0 && (
            <GraphView width={canvasSize.width} height={canvasSize.height} />
          )}

          {/* 空状态提示 */}
          {nodes.length === 0 && !isLoading && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.4)',
              pointerEvents: 'none',
            }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'rgba(74, 144, 217, 0.1)',
                  border: '2px dashed rgba(74, 144, 217, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                }}
              >
                <Network size={36} color="rgba(74, 144, 217, 0.6)" />
              </div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.6)',
                marginBottom: '8px',
                fontFamily: '"Noto Serif SC", serif',
              }}>
                开始你的知识之旅
              </h2>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.4)',
                textAlign: 'center',
                maxWidth: '360px',
                lineHeight: 1.6,
                fontFamily: '"Noto Sans SC", sans-serif',
              }}>
                在右侧搜索框输入关键词，探索关联词网络，
                构建属于你的知识图谱
              </p>
              <div style={{
                marginTop: '24px',
                display: 'flex',
                gap: '16px',
                fontSize: '12px',
                color: 'rgba(255,255,255,0.3)',
              }}>
                <span>💡 点击节点展开关联词</span>
                <span>🖱️ 拖拽调整位置</span>
                <span>📝 右键添加笔记</span>
              </div>
            </div>
          )}
        </div>

        {/* 侧边栏 */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </main>

      {/* 右键菜单 */}
      <ContextMenu />

      {/* 笔记编辑模态框 */}
      <NoteModal />

      {/* 移动端侧边栏遮罩 */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 99,
          }}
        />
      )}
    </div>
  );
}
