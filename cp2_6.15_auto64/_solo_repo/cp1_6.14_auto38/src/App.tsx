import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
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

const PINYIN_MAP: Record<string, string> = {
  '张': 'zhang', '李': 'li', '王': 'wang', '赵': 'zhao', '陈': 'chen', '刘': 'liu',
  '杨': 'yang', '黄': 'huang', '吴': 'wu', '周': 'zhou', '孙': 'sun', '马': 'ma',
  '朱': 'zhu', '胡': 'hu', '林': 'lin', '何': 'he', '郭': 'guo', '罗': 'luo',
  '高': 'gao', '梁': 'liang', '郑': 'zheng', '谢': 'xie', '韩': 'han', '唐': 'tang',
  '明': 'ming', '华': 'hua', '芳': 'fang', '强': 'qiang', '静': 'jing', '伟': 'wei',
  '春': 'chun', '夏': 'xia', '秋': 'qiu', '冬': 'dong', '大': 'da', '小': 'xiao',
  '蓝': 'lan', '色': 'se', '多': 'duo', '瑙': 'nao', '河': 'he', '卡': 'ka',
  '农': 'nong', '调': 'diao', '音': 'yin', '乐': 'yue', '会': 'hui', '季': 'ji',
};

function getPinyinInitials(name: string): string {
  let result = '';
  for (const char of name) {
    const py = PINYIN_MAP[char];
    if (py) {
      result += py[0];
    } else if (/[a-zA-Z]/.test(char)) {
      result += char.toLowerCase();
    }
  }
  return result;
}

function matchPinyinInitials(name: string, query: string): boolean {
  const queryLower = query.toLowerCase();
  const initials = getPinyinInitials(name);
  return initials.includes(queryLower);
}

function SearchVirtualList({ items, itemHeight, renderItem }: {
  items: SearchResult[];
  itemHeight: number;
  renderItem: (item: SearchResult, index: number) => React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const visibleHeight = 400;

  const totalHeight = items.length * itemHeight;

  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(start + Math.ceil(visibleHeight / itemHeight) + 2, items.length);
    return { start: Math.max(0, start), end };
  }, [scrollTop, itemHeight, items.length]);

  if (items.length === 0) {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>未找到结果</div>;
  }

  return (
    <div
      ref={containerRef}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      style={{ maxHeight: visibleHeight, overflowY: 'auto', position: 'relative' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {items.slice(visibleRange.start, visibleRange.end).map((item, i) => (
          <div
            key={visibleRange.start + i}
            style={{ position: 'absolute', top: (visibleRange.start + i) * itemHeight, width: '100%', height: itemHeight }}
          >
            {renderItem(item, visibleRange.start + i)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [adjustRequests, setAdjustRequests] = useState<AdjustRequest[]>([]);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AdjustRequest | null>(null);
  const [currentMemberId] = useState('m1');
  const navigate = useNavigate();
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
        let results = res.data;

        if (results.length === 0 && /^[a-zA-Z]+$/.test(query)) {
          try {
            const allRes = await searchApi.query('');
            if (Array.isArray(allRes.data)) {
              results = allRes.data.filter((item: SearchResult) => {
                return matchPinyinInitials(item.title, query);
              });
            }
          } catch {
            // fallback: use existing empty results
          }
        }

        setSearchResults(results);
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
            placeholder="搜索演出项目、曲目、成员（支持拼音首字母，如zm=张明）..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchQuery && setShowSearchResults(true)}
          />
          {showSearchResults && (
            <div
              className="search-results"
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#1a1a2e',
                borderRadius: '12px',
                boxShadow: '0 4px 12px #00000040',
                marginTop: '8px',
                zIndex: 100,
                overflow: 'hidden',
              }}
            >
              <SearchVirtualList
                items={searchResults}
                itemHeight={56}
                renderItem={(item) => (
                  <div
                    onClick={() => handleSearchResultClick(item)}
                    style={{
                      height: '56px',
                      padding: '0 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      textAlign: 'left',
                      borderBottom: '1px solid #333',
                      transition: 'background 0.2s ease-out',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#0f3460')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ fontSize: '15px', fontWeight: 500, color: '#cbd5e1' }}>{item.title}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{item.subtitle}</div>
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
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              color: '#1e293b',
              width: '540px',
              borderRadius: '16px',
              padding: '24px',
              animation: 'slideUp 0.3s ease-out',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
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
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 500, fontSize: '14px', transition: 'background 0.2s' }}
                onClick={() => handleAdjustRequest('rejected')}
              >
                拒绝
              </button>
              <button
                style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: 500, fontSize: '14px', transition: 'background 0.2s' }}
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
