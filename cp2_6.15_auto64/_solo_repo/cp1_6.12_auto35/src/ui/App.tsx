import React, { useState, useMemo, useCallback } from 'react';
import SearchBar from './SearchBar';
import IconGrid from './IconGrid';
import IconDetailPanel from './IconDetailPanel';
import { filterIcons, type IconItem } from '../icons/iconData';

const App: React.FC = () => {
  const [searchValue, setSearchValue] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<IconItem | null>(null);

  const filteredIcons = useMemo(() => {
    return filterIcons(searchValue, categoryFilter || undefined);
  }, [searchValue, categoryFilter]);

  const handleSelectIcon = useCallback((icon: IconItem) => {
    setSelectedIcon(icon);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedIcon(null);
  }, []);

  return (
    <div style={styles.app}>
      <style>{`
        input:focus {
          box-shadow: 0 0 8px #0f3460 !important;
          border-color: #19458a !important;
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @media (min-width: 768px) {
          .main-with-panel {
            padding-right: 320px;
          }
        }
      `}</style>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logoArea}>
            <div style={styles.logoBox}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#e94560' }}>
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div>
              <h1 style={styles.appTitle}>IconForge</h1>
              <p style={styles.appSubtitle}>矢量图标搜索与定制面板</p>
            </div>
          </div>
          <div style={styles.stats}>
            <div style={styles.statItem}>
              <span style={styles.statValue}>{filteredIcons.length}</span>
              <span style={styles.statLabel}>匹配结果</span>
            </div>
          </div>
        </div>
      </header>

      <SearchBar
        value={searchValue}
        onChange={setSearchValue}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
      />

      <main className={selectedIcon ? 'main-with-panel' : ''} style={styles.main}>
        <div style={styles.gridWrapper}>
          <IconGrid
            icons={filteredIcons}
            onSelect={handleSelectIcon}
            selectedId={selectedIcon?.id}
          />
        </div>
      </main>

      <IconDetailPanel
        icon={selectedIcon}
        onClose={handleClosePanel}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#1a1a2e',
  },
  header: {
    padding: '16px 24px',
    borderBottom: '1px solid rgba(15, 52, 96, 0.5)',
    background: 'linear-gradient(180deg, rgba(15, 52, 96, 0.3), transparent)',
  },
  headerContent: {
    maxWidth: '1600px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoBox: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #0f3460, #16213e)',
    border: '1px solid rgba(233, 69, 96, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(233, 69, 96, 0.15)',
  },
  appTitle: {
    fontSize: '20px',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #ffffff, #a0a0b0)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    letterSpacing: '-0.5px',
  },
  appSubtitle: {
    fontSize: '12px',
    color: '#6c7a89',
    marginTop: '1px',
  },
  stats: {
    display: 'flex',
    gap: '16px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  statValue: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#00d9ff',
    lineHeight: 1,
  },
  statLabel: {
    fontSize: '11px',
    color: '#6c7a89',
    marginTop: '2px',
  },
  main: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    transition: 'all 0.3s ease',
  },
  gridWrapper: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
  },
};

export default App;
