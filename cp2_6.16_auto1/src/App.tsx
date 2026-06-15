import { useState } from 'react';
import type { DiaryRecord, PageType } from './types';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import EntryPage from './pages/EntryPage';
import StatsPage from './pages/StatsPage';
import ConfirmModal from './components/ConfirmModal';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [editingRecord, setEditingRecord] = useState<DiaryRecord | null>(null);
  const [showEntryModal, setShowEntryModal] = useState(false);

  const handleNavigate = (page: PageType) => {
    setCurrentPage(page);
    setEditingRecord(null);
    setShowEntryModal(false);
  };

  const handleAddRecord = () => {
    setEditingRecord(null);
    setShowEntryModal(true);
    if (window.innerWidth >= 768) {
      setCurrentPage('entry');
    }
  };

  const handleEditRecord = (record: DiaryRecord) => {
    setEditingRecord(record);
    setShowEntryModal(true);
    if (window.innerWidth >= 768) {
      setCurrentPage('entry');
    }
  };

  const handleEntrySuccess = () => {
    if (window.innerWidth >= 768) {
      setCurrentPage('home');
    }
    setShowEntryModal(false);
    setEditingRecord(null);
    window.location.reload();
  };

  const handleEntryCancel = () => {
    setShowEntryModal(false);
    setEditingRecord(null);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <HomePage
            onAddRecord={handleAddRecord}
            onEditRecord={handleEditRecord}
          />
        );
      case 'entry':
        return (
          <EntryPage
            editingRecord={editingRecord}
            onSuccess={handleEntrySuccess}
            onCancel={() => handleNavigate('home')}
          />
        );
      case 'stats':
        return <StatsPage />;
      default:
        return null;
    }
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#fff8e1' }}>
      <Header onNavigate={handleNavigate} currentPage={currentPage} />

      <main
        className="flex-1 w-full mx-auto py-6 px-4"
        style={{ maxWidth: '1100px' }}
      >
        {renderPage()}
      </main>

      {!isMobile && (
        <div className="fixed bottom-6 right-6 flex gap-3 z-40">
          <button
            onClick={() => handleNavigate(currentPage === 'stats' ? 'home' : 'stats')}
            className="px-5 py-3 rounded-full font-medium text-white shadow-lg transition-all duration-200 hover:opacity-90"
            style={{ backgroundColor: '#42a5f5' }}
          >
            {currentPage === 'stats' ? '返回首页' : '查看统计'}
          </button>
          {currentPage !== 'entry' && (
            <button
              onClick={handleAddRecord}
              className="px-5 py-3 rounded-full font-medium text-white shadow-lg transition-all duration-200 hover:opacity-90"
              style={{ backgroundColor: '#ff9800' }}
            >
              记录阅读
            </button>
          )}
        </div>
      )}

      {isMobile && (
        <nav
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-orange-100 flex justify-around py-3 z-40"
          style={{ boxShadow: '0 -4px 12px rgba(0,0,0,0.05)' }}
        >
          <button
            onClick={() => handleNavigate('home')}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors"
            style={{
              color: currentPage === 'home' ? '#ff9800' : '#8d6e63',
            }}
          >
            <span className="text-xl">🏠</span>
            <span className="text-xs font-medium">首页</span>
          </button>
          <button
            onClick={handleAddRecord}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors"
            style={{ color: '#ff9800' }}
          >
            <span className="text-2xl">📝</span>
            <span className="text-xs font-medium">记录</span>
          </button>
          <button
            onClick={() => handleNavigate('stats')}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors"
            style={{
              color: currentPage === 'stats' ? '#ff9800' : '#8d6e63',
            }}
          >
            <span className="text-xl">📊</span>
            <span className="text-xs font-medium">统计</span>
          </button>
        </nav>
      )}

      {isMobile && showEntryModal && (
        <div
          className="fixed inset-0 z-50 bg-white flex flex-col"
          style={{ animation: 'slide-up 0.3s ease-out' }}
        >
          <div
            className="flex items-center justify-between px-4 py-4 border-b border-orange-100"
            style={{
              background: 'linear-gradient(135deg, #ffcc80 0%, #ffb74d 100%)',
            }}
          >
            <button
              onClick={handleEntryCancel}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors"
            >
              <span style={{ color: '#5d4037' }}>✕</span>
            </button>
            <h2 className="text-lg font-bold" style={{ color: '#5d4037' }}>
              {editingRecord ? '编辑记录' : '记录阅读'}
            </h2>
            <div className="w-10" />
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <EntryPage
              editingRecord={editingRecord}
              onSuccess={handleEntrySuccess}
              onCancel={handleEntryCancel}
            />
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={false}
        title=""
        message=""
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    </div>
  );
}
