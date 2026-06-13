import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ProjectDetail from './pages/ProjectDetail';
import Schedule from './pages/Schedule';
import Review from './pages/Review';
import { searchApi, SearchResult, adjustRequestApi, AdjustRequest } from './utils/api';

const navItems = [
  { path: '/', icon: '🏠', label: '首页' },
  { path: '/schedule', icon: '📅', label: '排练时间' },
  { path: '/review', icon: '📊', label: '排练回顾' },
];

const bottomNavItems = [
  { path: '/', icon: '🏠', label: '首页' },
  { path: '/schedule', icon: '📅', label: '时间' },
  { path: '/review', icon: '📊', label: '回顾' },
];

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [adjustRequests, setAdjustRequests] = useState<AdjustRequest[]>([]);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AdjustRequest | null>(null);
  const [currentMemberId] = useState('m1');
  const navigate = useNavigate();
  const _location = useLocation();
  const searchRef = useRef<HTMLDivElement>(null);

  const loadAdjustRequests = useCallback(async () => {
    try {
      const res = await adjustRequestApi.getAll();
      setAdjustRequests(res.data.filter((r) => r.status === 'pending'));
    } catch (e) {
      console.error('Failed to load adjust requests:', e);
    }
  }, []);

  useEffect(() => {
    loadAdjustRequests();
    const interval = setInterval(loadAdjustRequests, 5000);
    return () => clearInterval(interval);
  }, [loadAdjustRequests]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length > 0) {
      try {
        const res = await searchApi.query(query);
        setSearchResults(res.data);
        setShowSearchResults(true);
      } catch (e) {
        console.error('Search failed:', e);
      }
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  const handleSearchResultClick = (result: SearchResult) => {
    setShowSearchResults(false);
    setSearchQuery('');
    if (result.type === 'project' || result.type === 'track') {
      navigate(`/project/${result.id}`);
    } else if (result.type === 'member') {
      navigate('/');
    }
  };

  const handleAdjustRequest = async (status: 'approved' | 'rejected') => {
    if (!selectedRequest) return;
    try {
      await adjustRequestApi.update(selectedRequest.id, status);
      setSelectedRequest(null);
      setShowAdjustModal(false);
      await loadAdjustRequests();
    } catch (e) {
      console.error('Failed to process adjust request:', e);
    }
  };

  const VirtualList = ({ items, itemHeight = 56, renderItem }: {
    items: SearchResult[];
    itemHeight?: number;
    renderItem: (item: SearchResult, index: number) => React.ReactNode;
  }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const containerHeight = Math.min(items.length * itemHeight, 400);

    const visibleItems = useMemo(() => {
      const startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.min(startIndex + Math.ceil(400 / itemHeight) + 2, items.length);
      return items.slice(startIndex, endIndex).map((item, i) => ({
        item,
        index: startIndex + i,
      }));
    }, [items, scrollTop, itemHeight]);

    if (items.length === 0) {
      return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>未找到结果</div>;
    }

    return (
      <div
        ref={containerRef}
        className="virtual-list"
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        style={{ maxHeight: containerHeight > 400 ? 400 : containerHeight }}
      >
        <div style={{ height: items.length * itemHeight, position: 'relative' }}>
          {visibleItems.map(({ item, index }) => (
            <div
              key={index}
              className="virtual-list-item"
              style={{ top: index * itemHeight }}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>🎵 音乐社团</h1>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          {adjustRequests.length > 0 && (
            <div
              className="nav-item"
              onClick={() => {
                setSelectedRequest(adjustRequests[0]);
                setShowAdjustModal(true);
              }}
              style={{ marginTop: '20px', background: '#7f1d1d' }}
            >
              <span style={{ fontSize: '18px' }}>⚠️</span>
              <span>调整申请 ({adjustRequests.length})</span>
            </div>
          )}
        </nav>
      </aside>

      <main className="main-content">
        <div className="search-bar" ref={searchRef}>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="搜索演出项目、曲目、成员（支持拼音首字母）..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchQuery && setShowSearchResults(true)}
          />
          {showSearchResults && (
            <div className="search-results">
              <VirtualList
                items={searchResults}
                itemHeight={56}
                renderItem={(item) => (
                  <div
                    className="search-result-item"
                    onClick={() => handleSearchResultClick(item)}
                    style={{ position: 'static' }}
                  >
                    <div className="search-result-title">{item.title}</div>
                    <div className="search-result-subtitle">{item.subtitle}</div>
                  </div>
                )}
              />
            </div>
          )}
        </div>

        <Routes>
          <Route path="/" element={<Dashboard currentMemberId={currentMemberId} />} />
          <Route path="/project/:id" element={<ProjectDetail currentMemberId={currentMemberId} />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/review" element={<Review />} />
        </Routes>
      </main>

      <nav className="bottom-nav">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {showAdjustModal && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowAdjustModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">声部调整申请</h2>
              <button className="modal-close" onClick={() => setShowAdjustModal(false)}>×</button>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <p style={{ marginBottom: '12px' }}>
                <strong>成员：</strong>{selectedRequest.memberName}
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong>项目：</strong>{selectedRequest.projectTitle}
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong>曲目：</strong>{selectedRequest.trackTitle}
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong>当前声部：</strong>{selectedRequest.currentPart}
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong>申请调整为：</strong>{selectedRequest.requestedPart || '未指定'}
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong>理由：</strong>{selectedRequest.reason || '无'}
              </p>
              <p style={{ fontSize: '12px', color: '#64748b' }}>
                申请时间：{new Date(selectedRequest.createdAt).toLocaleString('zh-CN')}
              </p>
            </div>
            <div className="flex gap-4" style={{ justifyContent: 'flex-end' }}>
              <button
                className="btn btn-danger"
                onClick={() => handleAdjustRequest('rejected')}
              >
                拒绝
              </button>
              <button
                className="btn btn-success"
                onClick={() => handleAdjustRequest('approved')}
              >
                批准
              </button>
            </div>
            {adjustRequests.length > 1 && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
                  还有 {adjustRequests.length - 1} 个待处理申请
                </p>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const nextIndex = adjustRequests.findIndex((r) => r.id === selectedRequest.id) + 1;
                    if (nextIndex < adjustRequests.length) {
                      setSelectedRequest(adjustRequests[nextIndex]);
                    }
                  }}
                >
                  下一个 →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
