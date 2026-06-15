import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGalleryStore } from '@/lib/store';
import { Upload, Image as ImageIcon, MessageCircle, ChevronDown } from 'lucide-react';
import UploadModal from '@/components/UploadModal';

function LazyImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          img.src = src;
          observer.unobserve(img);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(img);
    return () => observer.disconnect();
  }, [src]);

  return (
    <img
      ref={imgRef}
      alt={alt}
      className={`${className} lazy-img ${loaded ? 'loaded' : ''}`}
      onLoad={() => setLoaded(true)}
      loading="lazy"
    />
  );
}

function GalleryCard({ item, index }: { item: ReturnType<typeof useGalleryStore.getState>['items'][0]; index: number }) {
  const navigate = useNavigate();

  return (
    <div
      className="waterfall-item"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div
        className="glass-card overflow-hidden cursor-pointer
          transition-all duration-300 ease-out
          hover:scale-[1.03] hover:shadow-[0_12px_40px_rgba(124,131,253,0.15)]
          active:scale-[0.98]"
        onClick={() => navigate(`/detail/${item.id}`)}
      >
        <div className="relative overflow-hidden">
          <LazyImage
            src={item.thumbnail_url}
            alt={item.description || '画廊图片'}
            className="w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
        </div>

        {(item.description || item.comment_count > 0) && (
          <div className="p-3 space-y-2">
            {item.description && (
              <p className="text-sm text-gray-600 font-body line-clamp-2 leading-relaxed">
                {item.description}
              </p>
            )}
            <div className="flex items-center justify-between">
              {item.comment_count > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                  <MessageCircle size={12} />
                  {item.comment_count}
                </span>
              )}
              <span className="text-xs text-gray-300">
                {new Date(item.created_at).toLocaleDateString('zh-CN')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="waterfall-item">
      <div className="glass-card overflow-hidden">
        <div className="w-full h-48 bg-gray-100/60 animate-pulse" />
        <div className="p-3 space-y-2">
          <div className="h-3 bg-gray-100/60 rounded animate-pulse w-3/4" />
          <div className="h-3 bg-gray-100/60 rounded animate-pulse w-1/2" />
        </div>
      </div>
    </div>
  );
}

export default function GalleryPage() {
  const { items, loading, loadGallery, loadMore, total } = useGalleryStore();
  const [showUpload, setShowUpload] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadGallery(1, 40);
  }, [loadGallery]);

  const handleLoadMore = useCallback(() => {
    if (!loading && items.length < total) {
      loadMore(40);
    }
  }, [loading, items.length, total, loadMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          handleLoadMore();
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleLoadMore]);

  const hasMore = items.length < total;

  return (
    <div className="min-h-screen">
      <nav className="glass-nav sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="font-display text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#7C83FD] to-[#A855F7] bg-clip-text text-transparent select-none">
            匿名画廊
          </h1>
          <button
            onClick={() => setShowUpload(true)}
            className="btn-gradient px-5 py-2.5 text-sm flex items-center gap-2"
          >
            <Upload size={16} />
            <span className="hidden sm:inline">上传图片</span>
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {items.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-32 text-gray-400">
            <ImageIcon size={64} strokeWidth={1} className="mb-4 opacity-40" />
            <p className="text-lg font-body">还没有图片，快来上传第一张吧</p>
          </div>
        )}

        <div className="waterfall">
          {items.map((item, i) => (
            <GalleryCard key={item.id} item={item} index={i} />
          ))}
          {loading && Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={`sk-${i}`} />)}
        </div>

        {hasMore && (
          <div ref={sentinelRef} className="flex justify-center py-8">
            {loading && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <ChevronDown size={16} className="animate-bounce" />
                加载中...
              </div>
            )}
          </div>
        )}

        {!hasMore && items.length > 0 && (
          <p className="text-center text-sm text-gray-300 py-8">已经到底啦</p>
        )}
      </main>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
    </div>
  );
}
