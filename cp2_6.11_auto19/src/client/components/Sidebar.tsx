/**
 * 侧边栏组件
 * 包含：搜索框、图谱列表、笔记面板切换
 */

import { useState, useMemo } from 'react';
import { Search, Save, FolderKanban, ChevronDown, ChevronRight, Trash2, Network, Plus } from 'lucide-react';
import { useGraphStore } from '../store/useGraphStore';
import NotePanel from './NotePanel';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'graphs' | 'note'>('search');
  const [saveGraphName, setSaveGraphName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);

  const searchQuery = useGraphStore(state => state.searchQuery);
  const setSearchQuery = useGraphStore(state => state.setSearchQuery);
  const nodes = useGraphStore(state => state.nodes);
  const selectedNodeId = useGraphStore(state => state.selectedNodeId);
  const selectNode = useGraphStore(state => state.selectNode);
  const savedGraphs = useGraphStore(state => state.savedGraphs);
  const rootWord = useGraphStore(state => state.rootWord);
  const currentGraphId = useGraphStore(state => state.currentGraphId);
  const isLoading = useGraphStore(state => state.isLoading);

  const generateGraph = useGraphStore(state => state.generateGraph);
  const saveCurrentGraph = useGraphStore(state => state.saveCurrentGraph);
  const loadGraph = useGraphStore(state => state.loadGraph);
  const deleteGraph = useGraphStore(state => state.deleteGraph);
  const fetchSavedGraphs = useGraphStore(state => state.fetchSavedGraphs);
  const setHighlightNodes = useGraphStore(state => state.setHighlightNodes);
  const setViewTransform = useGraphStore(state => state.setViewTransform);

  // 搜索结果
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return nodes.filter(n => n.word.toLowerCase().includes(query));
  }, [searchQuery, nodes]);

  // 定位到节点
  const focusNode = (node: typeof nodes[0]) => {
    selectNode(node.id);
    // 居中显示节点
    setViewTransform(1, -node.x + 400, -node.y + 300);
    // 高亮
    const ids = new Set<string>();
    ids.add(node.id);
    setHighlightNodes(ids);
  };

  // 保存图谱
  const handleSave = async () => {
    if (!saveGraphName.trim() && !currentGraphId) {
      setShowSaveInput(true);
      return;
    }

    const name = saveGraphName.trim() || rootWord || '未命名图谱';
    const id = await saveCurrentGraph(name);
    if (id) {
      setSaveGraphName('');
      setShowSaveInput(false);
      await fetchSavedGraphs();
    }
  };

  const tabs = [
    { id: 'search', label: '搜索', icon: Search },
    { id: 'graphs', label: '图谱', icon: FolderKanban },
    { id: 'note', label: '笔记', icon: Save },
  ] as const;

  return (
    <div
      className={`sidebar ${isOpen ? 'open' : 'closed'}`}
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        height: '100vh',
        width: '300px',
        background: 'rgba(27, 38, 59, 0.85)',
        backdropFilter: 'blur(20px)',
        borderLeft: '1px solid rgba(255,255,255,0.1)',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
      }}
    >
      {/* 头部标签栏 */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '14px 8px',
              background: activeTab === tab.id ? 'rgba(74, 144, 217, 0.2)' : 'transparent',
              border: 'none',
              color: activeTab === tab.id ? '#4A90D9' : 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s',
              fontSize: '11px',
              fontFamily: '"Noto Sans SC", sans-serif',
            }}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* 搜索面板 */}
        {activeTab === 'search' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 关键词输入 */}
            <div>
              <label style={{
                display: 'block',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '12px',
                marginBottom: '6px',
                fontFamily: '"Noto Sans SC", sans-serif',
              }}>
                输入主关键词
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="如：人工智能"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      generateGraph(searchQuery);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    fontFamily: '"Noto Sans SC", sans-serif',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#4A90D9';
                    e.target.style.background = 'rgba(74, 144, 217, 0.1)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.15)';
                    e.target.style.background = 'rgba(255,255,255,0.08)';
                  }}
                />
                <button
                  onClick={() => generateGraph(searchQuery)}
                  disabled={isLoading}
                  style={{
                    padding: '10px 16px',
                    background: 'linear-gradient(135deg, #4A90D9, #1E3A5F)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                  }}
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* 搜索结果下拉 */}
            {searchQuery.trim() && nodes.length > 0 && (
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                overflow: 'hidden',
                animation: 'fadeIn 0.15s ease-out',
              }}>
                <div style={{
                  padding: '8px 12px',
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.5)',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}>
                  找到 {searchResults.length} 个节点
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {searchResults.map(node => (
                    <div
                      key={node.id}
                      onClick={() => focusNode(node)}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'background 0.15s',
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(74, 144, 217, 0.15)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: node.color,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{
                        flex: 1,
                        fontSize: '13px',
                        color: '#fff',
                        fontFamily: '"Noto Sans SC", sans-serif',
                      }}>
                        {node.word}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        color: 'rgba(255,255,255,0.4)',
                      }}>
                        Lv.{node.level}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 保存按钮 */}
            {nodes.length > 0 && (
              <div style={{
                padding: '12px',
                background: 'rgba(74, 144, 217, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(74, 144, 217, 0.3)',
              }}>
                {showSaveInput ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="请输入图谱名称..."
                      value={saveGraphName}
                      onChange={e => setSaveGraphName(e.target.value)}
                      autoFocus
                      style={{
                        padding: '8px 10px',
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '13px',
                        outline: 'none',
                        fontFamily: '"Noto Sans SC", sans-serif',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={handleSave}
                        style={{
                          flex: 1,
                          padding: '8px',
                          background: '#4A90D9',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#fff',
                          cursor: 'pointer',
                          fontSize: '13px',
                        }}
                      >
                        确认保存
                      </button>
                      <button
                        onClick={() => setShowSaveInput(false)}
                        style={{
                          padding: '8px 12px',
                          background: 'rgba(255,255,255,0.1)',
                          border: 'none',
                          borderRadius: '6px',
                          color: 'rgba(255,255,255,0.7)',
                          cursor: 'pointer',
                          fontSize: '13px',
                        }}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleSave}
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'linear-gradient(135deg, #4A90D9, #357ABD)',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      transition: 'all 0.2s',
                      fontFamily: '"Noto Sans SC", sans-serif',
                    }}
                  >
                    <Save size={16} />
                    {currentGraphId ? '更新当前图谱' : '保存此图谱'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 图谱列表面板 */}
        {activeTab === 'graphs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              fontSize: '13px',
              color: 'rgba(255,255,255,0.7)',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: '"Noto Sans SC", sans-serif',
            }}>
              <FolderKanban size={16} />
              我的图谱 ({savedGraphs.length})
            </div>

            {savedGraphs.length === 0 ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '13px',
                fontFamily: '"Noto Sans SC", sans-serif',
              }}>
                <Network size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <p>暂无保存的图谱</p>
                <p style={{ fontSize: '11px', marginTop: '4px' }}>
                  生成图谱后点击"保存"按钮
                </p>
              </div>
            ) : (
              savedGraphs.map(graph => (
                <div
                  key={graph.id}
                  style={{
                    padding: '12px',
                    background: currentGraphId === graph.id
                      ? 'rgba(74, 144, 217, 0.15)'
                      : 'rgba(255,255,255,0.03)',
                    borderRadius: '8px',
                    border: `1px solid ${currentGraphId === graph.id
                      ? 'rgba(74, 144, 217, 0.4)'
                      : 'rgba(255,255,255,0.08)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => loadGraph(graph.id)}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(74, 144, 217, 0.1)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = currentGraphId === graph.id
                      ? 'rgba(74, 144, 217, 0.15)'
                      : 'rgba(255,255,255,0.03)';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '4px',
                  }}>
                    <span style={{
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: 500,
                      fontFamily: '"Noto Sans SC", sans-serif',
                    }}>
                      {graph.name}
                    </span>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (confirm('确定删除此图谱？')) {
                          deleteGraph(graph.id);
                        }
                      }}
                      style={{
                        padding: '4px',
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255,255,255,0.4)',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color = '#FF6B6B';
                        e.currentTarget.style.background = 'rgba(255,107,107,0.1)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.5)',
                    fontFamily: '"Noto Sans SC", sans-serif',
                  }}>
                    <span>关键词: {graph.rootWord}</span>
                    <span>{graph.nodes.length} 节点</span>
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: 'rgba(255,255,255,0.35)',
                    marginTop: '6px',
                    fontFamily: 'monospace',
                  }}>
                    {new Date(graph.updatedAt).toLocaleString('zh-CN')}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 笔记面板 */}
        {activeTab === 'note' && (
          <NotePanel selectedNodeId={selectedNodeId} />
        )}
      </div>

      {/* 移动端关闭按钮 */}
      <button
        onClick={onClose}
        className="sidebar-close-btn"
        style={{
          display: 'none',
          '@media (max-width: 768px)': {
            display: 'block',
          },
          position: 'absolute',
          top: '10px',
          left: '-40px',
          padding: '8px',
          background: 'rgba(27, 38, 59, 0.8)',
          border: 'none',
          borderRadius: '50%',
          color: '#fff',
          cursor: 'pointer',
        }}
      >
        <ChevronRight size={20} />
      </button>

      <style>{`
        @media (max-width: 768px) {
          .sidebar {
            width: 100vw !important;
            height: 60vh !important;
            top: auto !important;
            bottom: 0 !important;
            border-left: none !important;
            border-top: 1px solid rgba(255,255,255,0.1) !important;
            transform: translateY(100%) !important;
            border-radius: 16px 16px 0 0 !important;
          }
          .sidebar.open {
            transform: translateY(0) !important;
          }
          .sidebar-close-btn {
            display: block !important;
            top: -40px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* 滚动条样式 */
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.3);
        }
      `}</style>
    </div>
  );
}
