import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { PhotoCard } from '../components/PhotoCard';
import { PhotoDetail } from '../components/PhotoDetail';
import { usePhotoData } from '../hooks/usePhotoData';
import type { Photo } from '../types';

export default function HomePage() {
  const { photos, loading, fetchPhotos } = usePhotoData();
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const handlePhotoUpdated = (updated: Photo) => {
    fetchPhotos();
    setSelectedPhoto(updated);
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <header
        style={{
          padding: '32px 40px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--color-border)',
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: 700,
              color: 'var(--color-text)',
              letterSpacing: '0.5px',
            }}
          >
            气味记忆相册
          </h1>
          <p
            style={{
              margin: '6px 0 0',
              fontSize: '14px',
              color: 'var(--color-text-light)',
            }}
          >
            用气味唤醒那些美好的回忆
          </p>
        </div>
        <Link
          to="/search"
          className="btn-secondary"
          style={{ gap: '8px', textDecoration: 'none' }}
        >
          <Search size={18} />
          搜索气味
        </Link>
      </header>

      <main
        style={{
          padding: '32px 40px',
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <p style={{ color: 'var(--color-text-light)', fontSize: '16px' }}>
              加载中...
            </p>
          </div>
        ) : (
          <div className="masonry-grid">
            {photos.map((photo, idx) => (
              <div
                key={photo.id}
                className="fade-in-item"
                style={{ animationDelay: `${idx * 0.05}s`, opacity: 0 }}
              >
                <PhotoCard photo={photo} onClick={setSelectedPhoto} />
              </div>
            ))}
          </div>
        )}
      </main>

      {selectedPhoto && (
        <PhotoDetail
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          onUpdated={handlePhotoUpdated}
        />
      )}
    </div>
  );
}
