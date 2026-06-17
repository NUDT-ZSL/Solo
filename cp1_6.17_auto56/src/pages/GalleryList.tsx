import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Gallery, Artwork } from '../db/Database';
import db from '../db/Database';
import auctionEngine from '../db/AuctionEngine';
import GalleryCard from '../components/GalleryCard';
import './GalleryList.css';

export function GalleryList() {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifBlink, setNotifBlink] = useState(false);
  const currentUserId = 'user-1';
  const blinkTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    loadGalleries();
    updateUnreadCount();

    const handleBidOrSettle = () => {
      updateUnreadCount();
      triggerNotifBlink();
    };

    const unsubscribeBid = auctionEngine.onBid(() => handleBidOrSettle());
    const unsubscribeSettle = auctionEngine.onSettle(() => handleBidOrSettle());

    return () => {
      unsubscribeBid();
      unsubscribeSettle();
      if (blinkTimeoutRef.current) {
        clearTimeout(blinkTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    loadGalleries();
    updateUnreadCount();
  }, [filter]);

  const loadGalleries = () => {
    let allGalleries = db.getAllGalleries();
    
    if (filter !== 'all') {
      allGalleries = allGalleries.filter(g => g.theme === filter);
    }
    
    setGalleries(allGalleries);
  };

  const updateUnreadCount = () => {
    const user = db.getUser(currentUserId);
    const count = user?.notifications.filter(n => !n.read).length || 0;
    setUnreadCount(count);
  };

  const triggerNotifBlink = () => {
    setNotifBlink(false);
    requestAnimationFrame(() => {
      setNotifBlink(true);
      if (blinkTimeoutRef.current) {
        clearTimeout(blinkTimeoutRef.current);
      }
      blinkTimeoutRef.current = window.setTimeout(() => {
        setNotifBlink(false);
      }, 2500);
    });
  };

  const themes = ['all', '极简主义', '抽象表现', '印象派', '构成主义', '新中式', '赛博朋克'];
  const themeLabels: Record<string, string> = {
    'all': '全部',
    '极简主义': '极简主义',
    '抽象表现': '抽象表现',
    '印象派': '印象派',
    '构成主义': '构成主义',
    '新中式': '新中式',
    '赛博朋克': '赛博朋克'
  };

  return (
    <div className="gallery-list-page">
      <header className="app-header">
        <div className="container app-header__inner">
          <Link to="/" className="app-logo">
            <span className="app-logo__icon">◈</span>
            <span className="app-logo__text">ArtVault</span>
          </Link>
          
          <nav className="app-nav">
            <Link to="/" className="app-nav__link active">
              展厅
            </Link>
            <Link to="/profile" className="app-nav__link">
              我的
              {unreadCount > 0 && (
                <span className={`notification-badge ${notifBlink ? 'notification-dot-blink' : ''}`}>
                  {unreadCount}
                </span>
              )}
            </Link>
          </nav>
        </div>
      </header>

      <main className="container main-content">
        <div className="page-header">
          <h1 className="page-title">探索画廊</h1>
          <p className="page-subtitle">发现来自全球独立创作者的数字艺术珍品</p>
        </div>

        <div className="filter-tabs">
          {themes.map(theme => (
            <button
              key={theme}
              className={`filter-tab ${filter === theme ? 'active' : ''}`}
              onClick={() => setFilter(theme)}
            >
              {themeLabels[theme]}
            </button>
          ))}
        </div>

        <div className="gallery-grid">
          {galleries.map(gallery => (
            <GalleryCard key={gallery.id} gallery={gallery} />
          ))}
        </div>

        {galleries.length === 0 && (
          <div className="empty-state">
            <span className="empty-state__icon">◌</span>
            <p className="empty-state__text">暂无符合条件的画廊</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default GalleryList;
