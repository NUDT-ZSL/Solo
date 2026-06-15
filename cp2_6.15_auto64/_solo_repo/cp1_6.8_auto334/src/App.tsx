import { useState, useCallback } from 'react';
import { Book, books } from '@/data/books';
import BookCanvas from '@/BookCanvas';
import BookSelector from '@/BookSelector';
import ControlBar from '@/ControlBar';

type AppView = 'selector' | 'reading';

export default function App() {
  const [view, setView] = useState<AppView>('selector');
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [theme, setTheme] = useState<'dark' | 'parchment'>('dark');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleSelectBook = useCallback((book: Book) => {
    setCurrentBook(book);
    setCurrentPage(0);
    setView('reading');
  }, []);

  const handleBack = useCallback(() => {
    setView('selector');
    setCurrentBook(null);
    setCurrentPage(0);
  }, []);

  const handlePrev = useCallback(() => {
    if (!currentBook || isTransitioning) return;
    if (currentPage > 0) {
      setIsTransitioning(true);
    }
  }, [currentBook, currentPage, isTransitioning]);

  const handleNext = useCallback(() => {
    if (!currentBook || isTransitioning) return;
    if (currentPage < currentBook.pages.length - 1) {
      setIsTransitioning(true);
    }
  }, [currentBook, currentPage, isTransitioning]);

  const handlePageChange = useCallback((direction: 'next' | 'prev') => {
    setIsTransitioning(false);
    if (direction === 'next' && currentBook && currentPage < currentBook.pages.length - 1) {
      setCurrentPage((p) => p + 1);
    } else if (direction === 'prev' && currentPage > 0) {
      setCurrentPage((p) => p - 1);
    }
  }, [currentBook, currentPage]);

  const handleProgressChange = useCallback((page: number) => {
    if (page !== currentPage) {
      setCurrentPage(page);
    }
  }, [currentPage]);

  const handleThemeToggle = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'parchment' : 'dark'));
  }, []);

  const bgStyle = theme === 'dark'
    ? 'linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 50%, #0a0a0f 100%)'
    : 'linear-gradient(135deg, #f5e6c8 0%, #eddcb5 50%, #d4b896 100%)';

  return (
    <div
      className="app-root"
      data-theme={theme}
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: bgStyle,
        transition: 'background 0.8s ease',
        position: 'relative',
      }}
    >
      {view === 'selector' ? (
        <BookSelector onSelect={handleSelectBook} theme={theme} />
      ) : (
        currentBook && (
          <>
            <BookCanvas
              page={currentBook.pages[currentPage]}
              theme={theme}
              onPageChange={handlePageChange}
              isTransitioning={isTransitioning}
            />
            <ControlBar
              currentPage={currentPage}
              totalPages={currentBook.pages.length}
              onPrev={handlePrev}
              onNext={handleNext}
              onProgressChange={handleProgressChange}
              theme={theme}
              onThemeToggle={handleThemeToggle}
              onBack={handleBack}
            />
            <div
              style={{
                position: 'fixed',
                top: 20,
                left: 24,
                color: theme === 'dark' ? 'rgba(200,200,220,0.35)' : 'rgba(80,60,30,0.4)',
                fontFamily: '"ZCOOL XiaoWei", serif',
                fontSize: 14,
                letterSpacing: 2,
                transition: 'color 0.6s ease',
                pointerEvents: 'none',
                zIndex: 50,
              }}
            >
              {currentBook.title}
            </div>
          </>
        )
      )}

      {view === 'selector' && (
        <button
          onClick={handleThemeToggle}
          title={theme === 'dark' ? '切换至羊皮纸' : '切换至暗色'}
          style={{
            position: 'fixed',
            top: 20,
            right: 24,
            background: theme === 'dark' ? 'rgba(20,20,40,0.5)' : 'rgba(210,190,150,0.5)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(100,70,30,0.12)'}`,
            borderRadius: 12,
            padding: '8px 10px',
            cursor: 'pointer',
            color: theme === 'dark' ? '#b0b0cc' : '#6b5030',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.6s ease, color 0.6s ease, border-color 0.6s ease, transform 0.2s ease',
            zIndex: 100,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {theme === 'dark' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          )}
        </button>
      )}
    </div>
  );
}
