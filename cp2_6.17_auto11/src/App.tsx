import React from 'react';
import Header from './components/Header';
import WorkGrid from './components/WorkGrid';
import DetailPanel from './components/DetailPanel';
import { useAppContext } from './context/AppContext';

const App: React.FC = () => {
  const { selectedWorkId, favorites } = useAppContext();

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#fef9ef'
    }}>
      <Header />
      <main style={{
        maxWidth: '1400px',
        margin: '0 auto',
        position: 'relative'
      }}>
        <div style={{
          padding: '16px 24px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <p style={{
            color: '#6b7280',
            fontSize: '14px'
          }}>
            浏览精美的折纸作品，点击卡片查看详情
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#ef4444',
            fontSize: '14px',
            fontWeight: 500
          }}>
            <span>♥</span>
            <span>已收藏 {favorites.length} 件</span>
          </div>
        </div>
        <WorkGrid />
      </main>
      {selectedWorkId && <DetailPanel />}
    </div>
  );
};

export default App;
