import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { configApi, Card } from './api/configApi';
import GameBoard from './components/GameBoard';

const App: React.FC = () => {
  const [deck, setDeck] = useState<Card[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await configApi.getDeck();
        setDeck(data);
        setLoading(false);
      } catch (err) {
        setError('无法加载游戏数据，请确保后端服务已启动 (node server/index.js)');
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid #b87333',
            borderTop: '4px solid #ffd700',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <span style={{ fontSize: '20px' }}>正在加载蒸汽引擎...</span>
        </div>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          .loading {
            min-height: 100vh;
            background: #2c1e16;
            color: #ffd700;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Georgia, serif;
          }
        `}</style>
      </div>
    );
  }

  if (error || !deck) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#2c1e16',
        color: '#e74c3c',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Georgia, serif',
        padding: '40px',
        textAlign: 'center'
      }}>
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          padding: '30px 50px',
          borderRadius: '12px',
          border: '2px solid #b87333'
        }}>
          <h2 style={{ marginBottom: '20px', color: '#ffd700' }}>⚠ 错误</h2>
          <p style={{ fontSize: '16px', lineHeight: '1.6' }}>{error}</p>
        </div>
      </div>
    );
  }

  return <GameBoard deck={deck} />;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
