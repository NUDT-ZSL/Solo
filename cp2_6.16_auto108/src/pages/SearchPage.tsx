import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { PhotoCard } from '../components/PhotoCard';
import { PhotoDetail } from '../components/PhotoDetail';
import { usePhotoData } from '../hooks/usePhotoData';
import type { Photo } from '../types';

function debounce<T extends unknown[], R>(fn: (...args: T) => R, delay: number) {
  let timer: number | undefined;
  return (...args: T) => {
    if (timer) clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}

export default function SearchPage() {
  const { photos, loading, fetchPhotos, searchPhotos } = usePhotoData();
  const [query, setQuery] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const debouncedSearch = useCallback(
    debounce((searchQuery: string) => {
      if (searchQuery.trim()) {
        searchPhotos(searchQuery);
        setHasSearched(true);
      } else {
        fetchPhotos();
        setHasSearched(false);
      }
    }, 300),
    [searchPhotos, fetchPhotos]
  );

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  const handlePhotoUpdated = (updated: Photo) => {
    if (query.trim()) {
      searchPhotos(query);
    } else {
      fetchPhotos();
    }
    setSelectedPhoto(updated);
  };

  const showEmpty = hasSearched && !loading && photos.length === 0;

  return (
    <div style={{ minHeight: '100vh' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          padding: '20px 40px',
          backgroundColor: 'var(--color-form-bg)',
          borderBottom: '1px solid var(--color-border)',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
          }}
        >
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--color-text)',
              fontSize: '14px',
              fontWeight: 500,
              textDecoration: 'none',
              padding: '8px 12px',
              borderRadius: '8px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-secondary)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <ArrowLeft size={18} />
            返回
          </Link>

          <div style={{ position: 'relative', flex: 1, display: 'flex', justifyContent: 'center' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: 'calc(50% - 180px)',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-light)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              className="search-input"
              placeholder="输入气味关键词，比如 花香、咖啡..."
              value={query}
              onChange={handleQueryChange}
              style={{ paddingLeft: '46px' }}
            />
          </div>

          <div style={{ width: '70px' }} />
        </div>
      </header>

      <main
        style={{
          padding: '32px 40px',
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
        {showEmpty ? (
          <div className="empty-state">
            <div className="empty-icon">?</div>
            <p className="empty-text">没有找到这个气味，试试其他词吧</p>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <p style={{ color: 'var(--color-text-light)', fontSize: '16px' }}>
              搜索中...
            </p>
          </div>
        ) : (
          <div className="masonry-grid">
            {photos.map((photo, idx) => (
              <div
                key={photo.id}
                className="fade-in-item"
                style={{ animationDelay: `${idx * 0.04}s`, opacity: 0 }}
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
