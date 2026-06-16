import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Gallery, Artwork } from '../db/Database';
import db from '../db/Database';
import auctionEngine from '../db/AuctionEngine';
import ExhibitionGrid from '../components/ExhibitionGrid';
import AuctionPanel from '../components/AuctionPanel';
import './GalleryDetail.css';

export function GalleryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [isAuctionOpen, setIsAuctionOpen] = useState(false);
  const [version, setVersion] = useState(0);

  const currentUserId = 'user-2';
  const currentUser = db.getUser(currentUserId);
  const unreadCount = currentUser?.notifications.filter(n => !n.read).length || 0;

  useEffect(() => {
    if (id) {
      loadGalleryData();
    }
  }, [id, version]);

  useEffect(() => {
    const unsubscribe = auctionEngine.onSettle(() => {
      setVersion(v => v + 1);
    });
    return unsubscribe;
  }, []);

  const loadGalleryData = () => {
    if (!id) return;
    
    const galleryData = db.getGallery(id);
    if (galleryData) {
      setGallery(galleryData);
      const galleryArtworks = db.getArtworksByGallery(id);
      setArtworks(galleryArtworks);
    }
  };

  const curator = gallery ? db.getUser(gallery.curatorId) : null;

  const handleArtworkClick = (artwork: Artwork) => {
    if (artwork.auctionActive && artwork.auctionEndTime) {
      setSelectedArtwork(artwork);
      setIsAuctionOpen(true);
    }
  };

  const handleBidSuccess = () => {
    setVersion(v => v + 1);
  };

  const handleUpdate = () => {
    setVersion(v => v + 1);
  };

  if (!gallery) {
    return (
      <div className="gallery-detail-page">
        <header className="app-header">
          <div className="container app-header__inner">
            <Link to="/" className="app-logo">
              <span className="app-logo__icon">◈</span>
              <span className="app-logo__text">ArtVault</span>
            </Link>
          </div>
        </header>
        <div className="container">
          <div className="empty-state" style={{ padding: '100px 20px' }}>
            <span className="empty-state__icon">◌</span>
            <p className="empty-state__text">画廊不存在</p>
            <Link to="/" className="back-btn">返回首页</Link>
          </div>
        </div>
      </div>
    );
  }

  const activeAuctionCount = artworks.filter(a => a.auctionActive && a.auctionEndTime).length;

  return (
    <div className="gallery-detail-page">
      <header className="app-header">
        <div className="container app-header__inner">
          <Link to="/" className="app-logo">
            <span className="app-logo__icon">◈</span>
            <span className="app-logo__text">ArtVault</span>
          </Link>
          
          <nav className="app-nav">
            <Link to="/" className="app-nav__link">展厅</Link>
            <Link to="/profile" className="app-nav__link">
              我的
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount}</span>
              )}
            </Link>
          </nav>
        </div>
      </header>

      <main className="container main-content">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← 返回
        </button>

        <div className="gallery-header">
          <div className="gallery-header__info">
            <h1 className="gallery-header__title">{gallery.name}</h1>
            <div className="gallery-header__meta">
              <div className="gallery-curator">
                <div
                  className="gallery-curator__avatar"
                  style={{ backgroundColor: curator?.avatar || '#ccc' }}
                >
                  {curator?.name.charAt(0) || '?'}
                </div>
                <div>
                  <span className="gallery-curator__label">策展人</span>
                  <span className="gallery-curator__name">{curator?.name || '未知'}</span>
                </div>
              </div>
              <div className="gallery-stats">
                <div className="gallery-stat">
                  <span className="gallery-stat__value">{artworks.length}</span>
                  <span className="gallery-stat__label">件作品</span>
                </div>
                <div className="gallery-stat gallery-stat--highlight">
                  <span className="gallery-stat__value">{activeAuctionCount}</span>
                  <span className="gallery-stat__label">竞拍中</span>
                </div>
              </div>
            </div>
          </div>

          <div className="gallery-header__tags">
            <span className="gallery-tag">{gallery.theme}</span>
            <span className="gallery-tag">{gallery.layout}</span>
            <span className="gallery-tag">{gallery.lighting}光</span>
          </div>
        </div>

        <div className="gallery-exhibition">
          <h2 className="section-title">展厅预览</h2>
          <p className="section-desc">点击作品查看详情并参与竞拍</p>
          
          <ExhibitionGrid
            galleryId={gallery.id}
            artworks={artworks}
            onArtworkClick={handleArtworkClick}
            onUpdate={handleUpdate}
            canEdit={false}
          />
        </div>
      </main>

      <AuctionPanel
        artwork={selectedArtwork}
        isOpen={isAuctionOpen}
        onClose={() => setIsAuctionOpen(false)}
        onSuccess={handleBidSuccess}
        currentUserId={currentUserId}
      />
    </div>
  );
}

export default GalleryDetail;
