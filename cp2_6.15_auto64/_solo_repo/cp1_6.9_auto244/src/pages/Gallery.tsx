import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getImages } from '../api';
import type { ImageItem, SortOption, ColorOption } from '../types';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
}

function LazyImage({ src, alt, className }: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '100px', threshold: 0.01 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} style={{ position: 'relative', width: '100%' }}>
      {!loaded && <div className="gallery-skeleton" />}
      {inView && (
        <img
          src={src}
          alt={alt}
          className={className}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.4s ease', display: loaded ? 'block' : 'none' }}
        />
      )}
    </div>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

const COLOR_OPTIONS: { value: ColorOption; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'red', label: '红色' },
  { value: 'blue', label: '蓝色' },
  { value: 'green', label: '绿色' },
  { value: 'yellow', label: '黄色' },
  { value: 'purple', label: '紫色' },
  { value: 'cyan', label: '青色' },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: '最新上传' },
  { value: 'oldest', label: '最早上传' },
];

export default function Gallery() {
  const navigate = useNavigate();
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>('newest');
  const [color, setColor] = useState<ColorOption>('all');
  const [transitioning, setTransitioning] = useState(false);

  const loadImages = async (s: SortOption, c: ColorOption) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getImages(s, c);
      setImages(data);
    } catch (e: any) {
      setError(e?.message || '加载失败');
    } finally {
      setLoading(false);
      setTimeout(() => setTransitioning(false), 50);
    }
  };

  useEffect(() => {
    loadImages(sort, color);
  }, [sort, color]);

  const handleSortChange = (s: SortOption) => {
    if (s === sort) return;
    setTransitioning(true);
    setSort(s);
  };

  const handleColorChange = (c: ColorOption) => {
    if (c === color) return;
    setTransitioning(true);
    setColor(c);
  };

  return (
    <div className="gallery-page">
      <div className="filter-bar glass-card">
        <div className="filter-group">
          <span className="filter-label">排序</span>
          <div className="filter-options">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`filter-chip ${sort === opt.value ? 'active' : ''}`}
                onClick={() => handleSortChange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group" style={{ marginLeft: 'auto' }}>
          <span className="filter-label">主色调</span>
          <div className="filter-options">
            {COLOR_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`filter-chip ${opt.value} ${color === opt.value ? 'active' : ''}`}
                onClick={() => handleColorChange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="gallery-container">
        {loading ? (
          <div className="page-loading">
            <div className="loading-big-spinner" />
            <div className="loading-text">正在加载画廊...</div>
          </div>
        ) : error ? (
          <div className="error-display">
            <div className="error-icon">⚠️</div>
            <div className="error-title">加载失败</div>
            <div className="error-desc">{error}</div>
            <button className="retry-btn" onClick={() => loadImages(sort, color)}>
              重试
            </button>
          </div>
        ) : images.length === 0 ? (
          <div className="gallery-empty glass-card">
            <div className="empty-icon">🎨</div>
            <div className="empty-title">{color === 'all' ? '画廊还是空的' : '该色调下暂无作品'}</div>
            <div className="empty-desc">
              {color === 'all' ? '快去上传你的第一幅AI作品吧～' : '换个色调试试，或上传新作品'}
            </div>
          </div>
        ) : (
          <div
            className="masonry"
            style={{
              opacity: transitioning ? 0.3 : 1,
              transform: transitioning ? 'translateY(8px)' : 'translateY(0)',
              transition: 'opacity 0.4s ease, transform 0.4s ease'
            }}
          >
            {images.map((img, index) => (
              <div
                key={img.id}
                className="masonry-item"
                style={{ animationDelay: `${index * 0.04}s` }}
                onClick={() => navigate(`/detail/${img.id}`)}
              >
                <div className="gallery-card">
                  <LazyImage
                    src={img.url}
                    alt={img.title}
                    className="gallery-img"
                  />
                  <div className="gallery-info">
                    <div className="gallery-title">{img.title}</div>
                    <div className="gallery-date">
                      {formatDate(img.createdAt)} · {img.author}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
