import React, { useState, useEffect } from 'react';
import { QuizEditor } from './components/QuizEditor';
import { QuizTaker } from './components/QuizTaker';
import { ResultAnalyzer } from './components/ResultAnalyzer';
import { paperApi } from './api';
import type { Paper } from './types';

type Page = 'editor' | 'taker' | 'analyzer';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('editor');
  const [activePaperId, setActivePaperId] = useState<string>('');
  const [analyzePaperId, setAnalyzePaperId] = useState<string>('');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: 'success' | 'error' }[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadPapers();
  }, []);

  const loadPapers = async () => {
    try {
      const data = await paperApi.list();
      setPapers(data);
    } catch {}
  };

  const showToast = (msg: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const handlePaperCreated = (paperId: string) => {
    setActivePaperId(paperId);
    loadPapers();
  };

  const goToTaker = (paperId: string) => {
    setActivePaperId(paperId);
    setCurrentPage('taker');
    setMenuOpen(false);
  };

  const goToAnalyzer = (paperId: string) => {
    setAnalyzePaperId(paperId);
    setCurrentPage('analyzer');
    setMenuOpen(false);
  };

  const navItems: { key: Page; label: string }[] = [
    { key: 'editor', label: '题库管理' },
    { key: 'taker', label: '在线作答' },
    { key: 'analyzer', label: '成绩分析' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#1a252c', color: '#ecf0f1', fontSize: 16, lineHeight: 1.6 }}>
      <style>{`
        @keyframes flashGreen {
          0% { background-color: #2ecc7140; }
          50% { background-color: #2ecc7180; }
          100% { background-color: transparent; }
        }
        @keyframes shakeRed {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes toastIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes toastOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        .flash-correct { animation: flashGreen 0.3s ease-out; }
        .shake-wrong { animation: shakeRed 0.3s ease-out; }
        .spin-icon { animation: spin 1s linear infinite; display: inline-block; }
        .toast-enter { animation: toastIn 0.2s ease-out; }

        @media (max-width: 767px) {
          .sidebar-panel {
            position: fixed !important;
            top: 56px !important;
            left: 0 !important;
            bottom: 0 !important;
            z-index: 999 !important;
            transform: translateX(-100%) !important;
            transition: transform 0.3s !important;
          }
          .sidebar-panel.open {
            transform: translateX(0) !important;
          }
        }

        @media (min-width: 768px) {
          .hamburger-btn { display: none !important; }
        }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #1a252c; }
        ::-webkit-scrollbar-thumb { background: #34495e; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #3d566e; }
      `}</style>

      <nav style={{
        height: 56,
        background: '#1a252cdd',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        borderBottom: '1px solid #34495e40',
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #3498db, #9b59b6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 14,
          color: '#fff',
          marginRight: 12,
          flexShrink: 0,
        }}>
          Q
        </div>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#ecf0f1', marginRight: 32 }}>
          QuizLab
        </span>

        {!isMobile && (
          <div style={{ display: 'flex', gap: 4 }}>
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setCurrentPage(item.key)}
                style={{
                  background: currentPage === item.key ? '#3498db30' : 'transparent',
                  border: 'none',
                  color: currentPage === item.key ? '#3498db' : '#bdc3c7',
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: currentPage === item.key ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {currentPage === 'taker' && !isMobile && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#bdc3c7' }}>试卷ID:</span>
            <input
              value={activePaperId}
              onChange={(e) => setActivePaperId(e.target.value)}
              placeholder="输入试卷ID"
              style={{
                background: '#34495e',
                color: '#ecf0f1',
                border: '2px solid transparent',
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: 13,
                width: 200,
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#3498db'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'transparent'}
            />
          </div>
        )}

        {currentPage === 'analyzer' && !isMobile && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#bdc3c7' }}>试卷:</span>
            <select
              value={analyzePaperId}
              onChange={(e) => setAnalyzePaperId(e.target.value)}
              style={{
                background: '#34495e',
                color: '#ecf0f1',
                border: '2px solid transparent',
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: 13,
                outline: 'none',
              }}
            >
              <option value="">选择试卷</option>
              {papers.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
        )}

        {isMobile && (
          <button
            className="hamburger-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: '#ecf0f1',
              fontSize: 24,
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            ☰
          </button>
        )}
      </nav>

      {isMobile && menuOpen && (
        <div style={{
          position: 'fixed',
          top: 56,
          left: 0,
          right: 0,
          background: '#1a252cdd',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 999,
          padding: '8px 12px',
          borderBottom: '1px solid #34495e',
        }}>
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => { setCurrentPage(item.key); setMenuOpen(false); }}
              style={{
                display: 'block',
                width: '100%',
                background: currentPage === item.key ? '#3498db30' : 'transparent',
                border: 'none',
                color: currentPage === item.key ? '#3498db' : '#bdc3c7',
                padding: '12px 16px',
                borderRadius: 8,
                fontSize: 16,
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              {item.label}
            </button>
          ))}

          {currentPage === 'taker' && (
            <div style={{ padding: '8px 16px' }}>
              <input
                value={activePaperId}
                onChange={(e) => setActivePaperId(e.target.value)}
                placeholder="输入试卷ID"
                style={{
                  width: '100%',
                  background: '#34495e',
                  color: '#ecf0f1',
                  border: '2px solid transparent',
                  borderRadius: 6,
                  padding: 8,
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>
          )}

          {currentPage === 'analyzer' && (
            <div style={{ padding: '8px 16px' }}>
              <select
                value={analyzePaperId}
                onChange={(e) => setAnalyzePaperId(e.target.value)}
                style={{
                  width: '100%',
                  background: '#34495e',
                  color: '#ecf0f1',
                  border: '2px solid transparent',
                  borderRadius: 6,
                  padding: 8,
                  fontSize: 14,
                  outline: 'none',
                }}
              >
                <option value="">选择试卷</option>
                {papers.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 56 }}>
        {currentPage === 'editor' && (
          <QuizEditor
            onPaperCreated={handlePaperCreated}
            onToast={showToast}
          />
        )}
        {currentPage === 'taker' && activePaperId && (
          <QuizTaker paperId={activePaperId} onToast={showToast} />
        )}
        {currentPage === 'taker' && !activePaperId && (
          <div style={{ padding: 40, textAlign: 'center', color: '#7f8c8d' }}>
            请输入试卷ID开始作答
          </div>
        )}
        {currentPage === 'analyzer' && analyzePaperId && (
          <ResultAnalyzer paperId={analyzePaperId} />
        )}
        {currentPage === 'analyzer' && !analyzePaperId && (
          <div style={{ padding: 40, textAlign: 'center', color: '#7f8c8d' }}>
            请选择试卷查看分析
          </div>
        )}
      </div>

      <div style={{
        position: 'fixed',
        top: 68,
        right: 20,
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast-enter"
            style={{
              background: t.type === 'success' ? '#2ecc71' : '#e74c3c',
              color: '#fff',
              padding: '10px 20px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              boxShadow: '0 4px 12px #00000040',
            }}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
