import React, { useEffect, useState, useCallback } from 'react';
import { Contract } from './types';
import { getAllContracts, updateContract } from './db';
import Dashboard from './dashboard';
import ContractDetail from './contractDetail';

type Page = 'dashboard' | 'detail';

const App: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [autoOpenRenew, setAutoOpenRenew] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [fadeIn, setFadeIn] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      const data = await getAllContracts();
      setContracts(data);
    };
    load();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navigateTo = useCallback((page: Page, contractId?: string, renew?: boolean) => {
    setFadeIn(false);
    setTimeout(() => {
      setCurrentPage(page);
      setSelectedContractId(contractId ?? null);
      setAutoOpenRenew(!!renew);
      setMobileMenuOpen(false);
      setFadeIn(true);
    }, 150);
  }, []);

  const handleContractClick = (id: string) => {
    navigateTo('detail', id, false);
  };

  const handleRenewClick = (id: string) => {
    navigateTo('detail', id, true);
  };

  const handleBack = () => {
    navigateTo('dashboard');
  };

  const handleUpdateContract = async (updated: Contract) => {
    await updateContract(updated);
    setContracts(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const selectedContract = contracts.find(c => c.id === selectedContractId);

  const navItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: '10px',
    cursor: 'pointer',
    color: '#cbd5e1',
    fontSize: '14px',
    fontWeight: 500,
    marginBottom: '4px',
    transition: 'background-color 0.15s'
  };

  const activeNavStyle: React.CSSProperties = {
    ...navItemStyle,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#60a5fa'
  };

  const SidebarContent = () => (
    <>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundImage: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
          </div>
          <div>
            <div style={{ color: '#ffffff', fontSize: '16px', fontWeight: 600 }}>合同管家</div>
            <div style={{ color: '#64748b', fontSize: '11px' }}>Freelancer CRM</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '11px', color: '#64748b', letterSpacing: '0.5px', marginBottom: '12px', paddingLeft: '14px' }}>
          导航菜单
        </div>
        <div
          style={currentPage === 'dashboard' ? activeNavStyle : navItemStyle}
          onClick={handleBack}
          onMouseEnter={e => {
            if (currentPage !== 'dashboard') {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
            }
          }}
          onMouseLeave={e => {
            if (currentPage !== 'dashboard') {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          仪表板
        </div>
        <div
          style={{ ...navItemStyle, color: '#64748b', cursor: 'not-allowed' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 7h-3a2 2 0 0 1-2-2V2"></path>
            <path d="M9 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7l4 4v10a2 2 0 0 1-2 2z"></path>
            <path d="M3 7.6v12.8A1.6 1.6 0 0 0 4.6 22h9.8"></path>
          </svg>
          新建合同
        </div>
        <div
          style={{ ...navItemStyle, color: '#64748b', cursor: 'not-allowed' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20v-6M6 20V10M18 20V4"></path>
          </svg>
          数据统计
        </div>
        <div
          style={{ ...navItemStyle, color: '#64748b', cursor: 'not-allowed' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          设置
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        paddingTop: '20px',
        borderTop: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          border: '2px solid #1e40af',
          backgroundImage: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontSize: '16px',
          fontWeight: 600,
          flexShrink: 0
        }}>
          张
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            张伟
          </div>
          <div style={{ color: '#64748b', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            自由设计师
          </div>
        </div>
      </div>
    </>
  );

  const renderMobileSidebar = () => (
    <div style={{
      height: '60px',
      backgroundColor: '#1e293b',
      padding: '0 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flexShrink: 0
    }}>
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: '#cbd5e1',
          padding: '8px',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
      <div style={{ color: '#ffffff', fontSize: '15px', fontWeight: 600 }}>合同管家</div>
      <div style={{ marginLeft: 'auto', position: 'relative', width: '200px' }}>
        <svg
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none'
          }}
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="text"
          placeholder="搜索合同或里程碑..."
          value={searchQuery}
          onChange={e => handleSearch(e.target.value)}
          style={{
            width: '100%',
            height: '32px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#ffffff',
            paddingLeft: '36px',
            paddingRight: '12px',
            fontSize: '13px',
            color: '#1e293b',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
      </div>
    </div>
  );

  const renderMobileMenu = () => {
    if (!mobileMenuOpen) return null;
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        top: '60px',
        zIndex: 999,
        backgroundColor: 'rgba(0,0,0,0.5)'
      }} onClick={() => setMobileMenuOpen(false)}>
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: '240px',
            backgroundColor: '#1e293b',
            padding: '24px',
            height: 'calc(100vh - 60px)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <SidebarContent />
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {!isMobile && (
        <div style={{
          width: '240px',
          backgroundColor: '#1e293b',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh'
        }}>
          <SidebarContent />
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {isMobile && renderMobileSidebar()}
        {isMobile && renderMobileMenu()}

        {!isMobile && (
          <div style={{
            height: '52px',
            backgroundImage: 'linear-gradient(90deg, #1e293b 0%, #0f172a 100%)',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexShrink: 0
          }}>
            <div style={{ marginLeft: 'auto', position: 'relative', width: '320px' }}>
              <svg
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none'
                }}
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                placeholder="搜索合同客户名或里程碑名称..."
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#ffffff',
                  paddingLeft: '36px',
                  paddingRight: '12px',
                  fontSize: '14px',
                  color: '#1e293b',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        )}

        <div style={{
          flex: 1,
          backgroundColor: '#f8fafc',
          opacity: fadeIn ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out'
        }}>
          {currentPage === 'dashboard' && (
            <Dashboard
              contracts={contracts}
              searchQuery={searchQuery}
              onContractClick={handleContractClick}
              onRenewClick={handleRenewClick}
              isMobile={isMobile}
            />
          )}
          {currentPage === 'detail' && selectedContract && (
            <ContractDetail
              contract={selectedContract}
              autoOpenRenew={autoOpenRenew}
              onBack={handleBack}
              onUpdate={handleUpdateContract}
              isMobile={isMobile}
            />
          )}
          {currentPage === 'detail' && !selectedContract && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              合同未找到，请返回仪表板
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
