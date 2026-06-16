import React, { useState, useEffect, useCallback } from 'react';
import Dashboard from './components/Dashboard';
import Portfolio from './components/Portfolio';
import ClientLog from './components/ClientLog';
import { fetchPortfolio, fetchClients } from './api/dataService';
import type { PortfolioItem, Client } from './api/dataService';

type Page = 'dashboard' | 'portfolio' | 'clients';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [portfolioData, clientsData] = await Promise.all([
        fetchPortfolio(),
        fetchClients(),
      ]);
      setPortfolio(portfolioData);
      setClients(clientsData);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePortfolioUpdate = useCallback((items: PortfolioItem[]) => {
    setPortfolio(items);
  }, []);

  const handleClientsUpdate = useCallback((updatedClients: Client[]) => {
    setClients(updatedClients);
  }, []);

  const navItems: { id: Page; label: string; icon: string }[] = [
    { id: 'dashboard', label: '数据概览', icon: '📊' },
    { id: 'portfolio', label: '作品集', icon: '📸' },
    { id: 'clients', label: '客户管理', icon: '👥' },
  ];

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              border: '3px solid var(--bg-card)',
              borderTopColor: 'var(--accent)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <p style={{ color: 'var(--text-secondary)' }}>加载中...</p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <nav
        style={{
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backdropFilter: 'blur(12px)',
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '64px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--accent), #ff6b8a)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
              }}
            >
              📷
            </div>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              摄影师工作室
            </span>
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                style={{
                  padding: '10px 20px',
                  background: currentPage === item.id ? 'var(--accent)' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: currentPage === item.id ? 'white' : 'var(--text-secondary)',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.25s ease-out',
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== item.id) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage !== item.id) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main style={{ animation: 'fadeIn 0.5s ease-out' }}>
        {currentPage === 'dashboard' && (
          <Dashboard portfolio={portfolio} clients={clients} />
        )}
        {currentPage === 'portfolio' && (
          <Portfolio portfolio={portfolio} onPortfolioUpdate={handlePortfolioUpdate} />
        )}
        {currentPage === 'clients' && (
          <ClientLog clients={clients} onClientsUpdate={handleClientsUpdate} />
        )}
      </main>

      <footer
        style={{
          padding: '24px',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: '13px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          marginTop: '40px',
        }}
      >
        © 2025 摄影师工作室 - 作品授权管理系统
      </footer>
    </div>
  );
};

export default App;
