import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import UploadZone from '../components/UploadZone';
import PhotoCard from '../components/PhotoCard';
import { getPhotos } from '../api';
import type { Photo } from '../types';

interface HomePageProps {
  photos: Photo[];
  loading: boolean;
  onUpload: (photos: Photo[]) => void;
  onLoadMore: () => void;
}

export default function HomePage({ photos, loading, onUpload }: HomePageProps) {
  const [displayedPhotos, setDisplayedPhotos] = useState<Photo[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const initialLoadDone = useRef(false);
  const offsetRef = useRef(30);

  useEffect(() => {
    if (photos.length > 0 && !initialLoadDone.current) {
      setDisplayedPhotos(photos.slice(0, 30));
      initialLoadDone.current = true;
    }
  }, [photos]);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const more = await getPhotos(10, offsetRef.current);
      if (more.length > 0) {
        setDisplayedPhotos((prev) => [...prev, ...more]);
        offsetRef.current += 10;
      }
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div style={{ minHeight: '100vh', padding: '32px 24px', maxWidth: 1400, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 32,
        }}
      >
        <div>
          <h1
            style={{
              color: '#f5c518',
              fontSize: 36,
              fontWeight: 'bold',
              marginBottom: 8,
            }}
          >
            🎉 微笑照片墙
          </h1>
          <p style={{ color: '#8888aa', fontSize: 16 }}>
            记录美好瞬间，找出最灿烂的笑容
          </p>
        </div>
        <Link to="/rank">
          <motion.button
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              padding: '12px 28px',
              background: 'linear-gradient(135deg, #f5c518, #ffd700)',
              color: '#1a1a2e',
              border: 'none',
              borderRadius: 30,
              fontSize: 16,
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(245, 197, 24, 0.4)',
            }}
          >
            🏆 查看排行榜
          </motion.button>
        </Link>
      </div>

      <div style={{ marginBottom: 40 }}>
        <UploadZone onUpload={onUpload} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#8888aa' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            style={{ fontSize: 48, marginBottom: 16 }}
          >
            ⏳
          </motion.div>
          <p>加载照片中...</p>
        </div>
      ) : displayedPhotos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#8888aa' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🖼️</div>
          <p>还没有照片，快上传一些来开始吧！</p>
        </div>
      ) : (
        <>
          <div
            style={{
              columns: '3',
              columnGap: 16,
              marginBottom: 32,
            }}
          >
            {displayedPhotos.map((photo, index) => (
              <PhotoCard key={photo.id} photo={photo} index={index} />
            ))}
          </div>

          <div ref={sentinelRef} style={{ height: 20 }} />

          {loadingMore && (
            <div style={{ textAlign: 'center', padding: 20, color: '#8888aa' }}>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{ display: 'inline-block' }}
              >
                ⏳
              </motion.span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
