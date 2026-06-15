import React, { useState, useEffect, lazy, Suspense } from 'react';
import { FilterCriteria, MatchResult } from '../types';
import { matchCaregivers } from '../logic/matching';
import SearchPanel from './SearchPanel';
import CaregiverCard from './CaregiverCard';

const MyBookings = lazy(() => import('./MyBookings'));
const CaregiverDashboard = lazy(() => import('./CaregiverDashboard'));

type Role = 'owner' | 'caregiver';
type Page = 'home' | 'bookings';

const NavBar: React.FC<{
  role: Role;
  onRoleChange: (r: Role) => void;
  page: Page;
  onPageChange: (p: Page) => void;
}> = ({ role, onRoleChange, page, onPageChange }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backgroundColor: '#FFFEF7',
      borderBottom: '2px solid #E8DCC8',
      boxShadow: '0 2px 8px rgba(139, 115, 85, 0.08)'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0 24px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px'
      }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            fontSize: '22px',
            fontWeight: 800,
            color: '#8B4513'
          }}
          onClick={() => { onPageChange('home'); if (role !== 'owner') onRoleChange('owner'); }}
        >
          <span style={{ fontSize: '28px' }}>🐾</span>
          <span>萌宠寄养</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="desktop-nav">
          <div style={{
            display: 'flex',
            padding: '4px',
            borderRadius: '10px',
            backgroundColor: '#F5DEB340',
            border: '1px solid #DEB88760'
          }}>
            <button
              onClick={() => { onRoleChange('owner'); onPageChange('home'); }}
              style={{
                padding: '8px 16px',
                borderRadius: '7px',
                border: 'none',
                backgroundColor: role === 'owner' ? '#B22222' : 'transparent',
                color: role === 'owner' ? '#FFFFFF' : '#8B7355',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                transition: 'all 0.25s ease'
              }}
            >
              🐶 主人端
            </button>
            <button
              onClick={() => onRoleChange('caregiver')}
              style={{
                padding: '8px 16px',
                borderRadius: '7px',
                border: 'none',
                backgroundColor: role === 'caregiver' ? '#B22222' : 'transparent',
                color: role === 'caregiver' ? '#FFFFFF' : '#8B7355',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                transition: 'all 0.25s ease'
              }}
            >
              🏠 寄养端
            </button>
          </div>

          {role === 'owner' && (
            <div style={{
              display: 'flex',
              marginLeft: '8px',
              padding: '4px',
              borderRadius: '10px',
              backgroundColor: '#F5DEB320'
            }}>
              <button
                onClick={() => onPageChange('home')}
                style={{
                  padding: '8px 14px',
                  borderRadius: '7px',
                  border: page === 'home' ? '1.5px solid #DEB887' : '1.5px solid transparent',
                  backgroundColor: page === 'home' ? '#FFFFFF' : 'transparent',
                  color: '#8B7355',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.2s ease'
                }}
              >
                🔍 找寄养
              </button>
              <button
                onClick={() => onPageChange('bookings')}
                style={{
                  padding: '8px 14px',
                  borderRadius: '7px',
                  border: page === 'bookings' ? '1.5px solid #DEB887' : '1.5px solid transparent',
                  backgroundColor: page === 'bookings' ? '#FFFFFF' : 'transparent',
                  color: '#8B7355',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.2s ease'
                }}
              >
                📋 我的预约
              </button>
            </div>
          )}

          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            backgroundColor: '#F0E68C', marginLeft: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', border: '2px solid #DEB887'
          }}>
            👤
          </div>
        </div>

        <button
          className="mobile-menu-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            display: 'none',
            width: '40px', height: '40px',
            border: '1px solid #DEB887', borderRadius: '8px',
            backgroundColor: '#F5DEB340', cursor: 'pointer',
            fontSize: '20px'
          }}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {menuOpen && (
        <div className="mobile-menu" style={{
          padding: '0 24px 16px 24px',
          borderTop: '1px solid #E8DCC8',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{
            display: 'flex', padding: '4px',
            borderRadius: '10px', backgroundColor: '#F5DEB340',
            border: '1px solid #DEB88760'
          }}>
            <button onClick={() => { onRoleChange('owner'); onPageChange('home'); setMenuOpen(false); }}
              style={{
                flex: 1, padding: '10px', borderRadius: '7px',
                border: 'none',
                backgroundColor: role === 'owner' ? '#B22222' : 'transparent',
                color: role === 'owner' ? '#FFFFFF' : '#8B7355',
                cursor: 'pointer', fontWeight: 600
              }}>🐶 主人端</button>
            <button onClick={() => { onRoleChange('caregiver'); setMenuOpen(false); }}
              style={{
                flex: 1, padding: '10px', borderRadius: '7px',
                border: 'none',
                backgroundColor: role === 'caregiver' ? '#B22222' : 'transparent',
                color: role === 'caregiver' ? '#FFFFFF' : '#8B7355',
                cursor: 'pointer', fontWeight: 600
              }}>🏠 寄养端</button>
          </div>
          {role === 'owner' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { onPageChange('home'); setMenuOpen(false); }}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px',
                  border: page === 'home' ? '1.5px solid #DEB887' : '1px solid #E8DCC8',
                  backgroundColor: page === 'home' ? '#DEB88730' : '#FFFFFF',
                  color: '#8B7355', cursor: 'pointer', fontWeight: 500
                }}>🔍 找寄养</button>
              <button onClick={() => { onPageChange('bookings'); setMenuOpen(false); }}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px',
                  border: page === 'bookings' ? '1.5px solid #DEB887' : '1px solid #E8DCC8',
                  backgroundColor: page === 'bookings' ? '#DEB88730' : '#FFFFFF',
                  color: '#8B7355', cursor: 'pointer', fontWeight: 500
                }}>📋 我的预约</button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

const HomePage: React.FC = () => {
  const [filters, setFilters] = useState<FilterCriteria>({});
  const [results, setResults] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchExpanded, setSearchExpanded] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filterKey, setFilterKey] = useState(0);

  const runMatch = async () => {
    setLoading(true);
    setFilterKey(k => k + 1);
    try {
      const data = await matchCaregivers(filters);
      setResults(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    runMatch();
  }, [filters, refreshKey]);

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined);

  return (
    <div style={{
      display: 'flex',
      gap: '24px',
      padding: '24px 4px',
      alignItems: 'flex-start'
    }}
      className="home-layout"
    >
      <div style={{ width: '320px', flexShrink: 0 }} className="search-sidebar">
        <div style={{ position: 'sticky', top: '88px' }}>
          <SearchPanel
            filters={filters}
            onFilterChange={setFilters}
          />
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }} className="mobile-search-wrap">
        <div className="mobile-search-panel">
          <SearchPanel
            filters={filters}
            onFilterChange={setFilters}
            isExpanded={searchExpanded}
            onToggleExpand={() => setSearchExpanded(!searchExpanded)}
          />
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#8B7355' }}>
              {hasActiveFilters ? '🎯 为您推荐' : '🏡 全部寄养人'}
              <span style={{
                marginLeft: '10px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#A08870',
                backgroundColor: '#F5DEB340',
                padding: '4px 12px',
                borderRadius: '12px'
              }}>
                共 {results.length} 位
              </span>
            </h2>
            {!loading && results.length > 0 && (
              <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#A08870' }}>
                按匹配度从高到低排序，找到最适合您爱宠的寄养人～
              </p>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={() => setFilters({})}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #DEB887',
                backgroundColor: '#FFFFFF',
                color: '#8B7355',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500
              }}
            >
              清除所有筛选 ✕
            </button>
          )}
        </div>

        {loading ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '16px'
          }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} style={{
                height: '240px',
                borderRadius: '8px',
                backgroundColor: '#FFFEF7',
                border: '1px solid #E8DCC8',
                animation: 'pulse 1.5s ease-in-out infinite'
              }} />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div style={{
            padding: '80px 20px',
            textAlign: 'center',
            backgroundColor: '#FFFEF7',
            borderRadius: '12px',
            border: '1px solid #E8DCC8'
          }}>
            <div style={{ fontSize: '60px', marginBottom: '16px' }}>😿</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#5C4A32' }}>没有找到匹配的寄养人</h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#A08870' }}>
              试试调整筛选条件，或者放宽日期范围吧～
            </p>
          </div>
        ) : (
          <div
            key={`results-${filterKey}`}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '16px'
            }}
          >
            {results.map((r, idx) => (
              <CaregiverCard
                key={r.caregiver.id}
                result={r}
                index={idx}
                filters={filters}
                onBooked={() => setRefreshKey(k => k + 1)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [role, setRole] = useState<Role>('owner');
  const [page, setPage] = useState<Page>('home');

  useEffect(() => {
    if (role === 'caregiver') setPage('home');
  }, [role]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FFF8F0',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      color: '#5C4A32'
    }}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cardStaggerIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
        @keyframes statusPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        .status-badge-transition {
          transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .status-badge-transition.changed {
          animation: statusPulse 0.3s ease;
        }
        @media (max-width: 1024px) {
          .search-sidebar { display: none !important; }
          .mobile-search-panel { display: block !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .order-info-grid { grid-template-columns: auto 1fr !important; }
          .order-info-grid > *:last-child { grid-column: 1 / -1; text-align: left !important; }
          .revenue-header-row { flex-direction: column; gap: 12px; align-items: flex-start !important; }
        }
        @media (min-width: 1025px) {
          .mobile-search-panel { display: none !important; }
          .mobile-menu-btn { display: none !important; }
        }
        @media (max-width: 768px) {
          .week-schedule-grid { grid-template-columns: repeat(7, minmax(90px, 1fr)) !important; }
          .dashboard-header { flex-direction: column; align-items: flex-start !important; }
          .pending-order-row { flex-direction: column; align-items: stretch !important; }
          .pending-order-row > *:last-child { justify-content: flex-end; }
          .modal-content-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      <NavBar role={role} onRoleChange={setRole} page={page} onPageChange={setPage} />

      <main style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0 24px 40px 24px'
      }}>
        <Suspense fallback={
          <div style={{
            padding: '60px 20px', textAlign: 'center',
            backgroundColor: '#FFFEF7', borderRadius: '12px',
            border: '1px solid #E8DCC8', marginTop: '24px'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px', animation: 'pulse 1.5s infinite' }}>⏳</div>
            <div style={{ color: '#8B7355' }}>页面加载中...</div>
          </div>
        }>
          {role === 'owner' && page === 'home' && <HomePage />}
          {role === 'owner' && page === 'bookings' && <div style={{ paddingTop: '24px' }}><MyBookings /></div>}
          {role === 'caregiver' && <div style={{ paddingTop: '24px' }}><CaregiverDashboard /></div>}
        </Suspense>
      </main>

      <footer style={{
        borderTop: '1px solid #E8DCC8',
        backgroundColor: '#FFFEF7',
        padding: '24px',
        textAlign: 'center',
        color: '#A08870',
        fontSize: '13px'
      }}>
        <div>🐾 萌宠寄养 · 让每一只毛孩子都被温柔以待</div>
        <div style={{ marginTop: '6px', fontSize: '12px', opacity: 0.7 }}>
          © 2026 PetSitting Platform · Made with ❤️
        </div>
      </footer>
    </div>
  );
};

export default App;
