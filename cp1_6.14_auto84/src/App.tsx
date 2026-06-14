import { useState, useCallback, useEffect, memo } from 'react';
import RecommendPage from './RecommendPage';
import DetailPage from './DetailPage';
import { BeanSummary } from './api';

export type PageType = 'recommend' | 'detail';

const Navbar = memo(function Navbar({
  onNavigate,
}: {
  onNavigate: (page: PageType) => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogoClick = useCallback(() => {
    onNavigate('recommend');
    setMobileOpen(false);
  }, [onNavigate]);

  const handleMenuClick = useCallback(() => {
    onNavigate('recommend');
    setMobileOpen(false);
  }, [onNavigate]);

  return (
    <nav className="navbar">
      <div className="container navbar-content">
        <div className="navbar-logo" onClick={handleLogoClick}>
          BeanOracle
        </div>
        <div className="navbar-menu">
          <div className="navbar-item" onClick={handleMenuClick}>
            咖啡豆
          </div>
          <div className="navbar-item" onClick={handleMenuClick}>
            冲煮指南
          </div>
          <div className="navbar-item" onClick={handleMenuClick}>
            关于我们
          </div>
        </div>
        <div
          className="hamburger"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="menu"
        >
          <span />
          <span />
          <span />
        </div>
      </div>
      {mobileOpen && (
        <div className="mobile-menu open">
          <div className="navbar-item" onClick={handleMenuClick}>
            咖啡豆
          </div>
          <div className="navbar-item" onClick={handleMenuClick}>
            冲煮指南
          </div>
          <div className="navbar-item" onClick={handleMenuClick}>
            关于我们
          </div>
        </div>
      )}
    </nav>
  );
});

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('recommend');
  const [selectedBean, setSelectedBean] = useState<BeanSummary | null>(null);

  const goToDetail = useCallback((bean: BeanSummary) => {
    setSelectedBean(bean);
    setCurrentPage('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goToRecommend = useCallback(() => {
    setCurrentPage('recommend');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const navigate = useCallback((page: PageType) => {
    if (page === 'recommend') {
      goToRecommend();
    } else {
      setCurrentPage('detail');
    }
  }, [goToRecommend]);

  useEffect(() => {
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };
    const onTouchMove = () => {
      const y = window.scrollY;
      if (y < 50 || startY - window.scrollY < -20) {
        const el = document.querySelector('.navbar') as HTMLElement | null;
        if (el) el.style.transform = 'translateY(0)';
      }
    };
    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchmove', onTouchMove);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  return (
    <>
      <Navbar onNavigate={navigate} />
      <div className="page">
        <div className="container">
          {currentPage === 'recommend' ? (
            <RecommendPage onBeanClick={goToDetail} />
          ) : (
            <DetailPage
              beanSummary={selectedBean}
              onBack={goToRecommend}
            />
          )}
        </div>
      </div>
    </>
  );
}

export default App;
