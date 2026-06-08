import { useState, useCallback, useEffect, useRef } from 'react';
import { useGalleryStore, formatExposure, FOCAL_LABELS } from './StarGalleryEngine';
import type { Photo } from './StarGalleryEngine';
import PhotoCard from './PhotoCard';
import { Shuffle, X, Heart, Camera, Clock, Aperture } from 'lucide-react';

export default function GalleryLayout() {
  const { filteredPhotos, filters, favoriteCount, setFilters, toggleFavorite, randomize } = useGalleryStore();
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const starsRef = useRef<HTMLCanvasElement>(null);

  const handleExplode = useCallback((photo: Photo) => {
    setSelectedPhoto(photo);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedPhoto(null);
  }, []);

  const handleToggleFavorite = useCallback((id: string) => {
    toggleFavorite(id);
    if (selectedPhoto && selectedPhoto.id === id) {
      const updated = useGalleryStore.getState().photos.find((p) => p.id === id);
      if (updated) setSelectedPhoto(updated);
    }
  }, [selectedPhoto, toggleFavorite]);

  const handleMinExposure = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setFilters({ minExposure: Math.min(v, filters.maxExposure) });
  }, [filters.maxExposure, setFilters]);

  const handleMaxExposure = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setFilters({ maxExposure: Math.max(v, filters.minExposure) });
  }, [filters.minExposure, setFilters]);

  const handleFocalFilter = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ focalLengthFilter: e.target.value as typeof filters.focalLengthFilter });
  }, [setFilters]);

  useEffect(() => {
    const canvas = starsRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawStars(ctx, window.innerWidth, window.innerHeight);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden" style={{
      background: 'linear-gradient(135deg, #0a0e27 0%, #0f1438 30%, #1a0a2e 70%, #0a0e27 100%)',
    }}>
      <canvas
        ref={starsRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
      />

      {/* Mobile menu toggle */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden flex items-center justify-center w-10 h-10 rounded-lg backdrop-blur-xl"
        style={{
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.12)',
        }}
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <svg className="w-5 h-5 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {sidebarOpen ? <X /> : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-40 transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ width: '260px' }}
      >
        <div className="h-full backdrop-blur-2xl p-6 flex flex-col gap-6 overflow-y-auto" style={{
          background: 'rgba(10, 14, 39, 0.65)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, #7b2ff7, #00d4ff)',
            }}>
              <Camera className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-orbitron text-lg text-white tracking-widest">星轨画廊</h1>
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-xs text-white/50 font-orbitron tracking-wider mb-3 block">
                曝光时间范围
              </label>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-white/70">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 最短</span>
                  <span className="font-orbitron text-cyan-300">{formatExposure(filters.minExposure)}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={1800}
                  step={1}
                  value={filters.minExposure}
                  onChange={handleMinExposure}
                  className="w-full accent-cyan-400 h-1 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #00d4ff ${((filters.minExposure - 1) / 1799) * 100}%, rgba(255,255,255,0.1) ${((filters.minExposure - 1) / 1799) * 100}%)`,
                  }}
                />
                <div className="flex items-center justify-between text-xs text-white/70">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 最长</span>
                  <span className="font-orbitron text-purple-400">{formatExposure(filters.maxExposure)}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={1800}
                  step={1}
                  value={filters.maxExposure}
                  onChange={handleMaxExposure}
                  className="w-full accent-purple-400 h-1 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #7b2ff7 ${((filters.maxExposure - 1) / 1799) * 100}%, rgba(255,255,255,0.1) ${((filters.maxExposure - 1) / 1799) * 100}%)`,
                  }}
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-white/50 font-orbitron tracking-wider mb-2 block">
                焦距类型
              </label>
              <div className="relative">
                <select
                  value={filters.focalLengthFilter}
                  onChange={handleFocalFilter}
                  className="w-full rounded-lg px-3 py-2 text-sm text-white/80 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  {Object.entries(FOCAL_LABELS).map(([key, label]) => (
                    <option key={key} value={key} style={{ background: '#0a0e27' }}>
                      {label}
                    </option>
                  ))}
                </select>
                <Aperture className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
              </div>
            </div>

            <button
              onClick={randomize}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-orbitron tracking-wider text-white/90 transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, rgba(123,47,247,0.3), rgba(0,212,255,0.3))',
                border: '1px solid rgba(123,47,247,0.3)',
                boxShadow: '0 0 20px rgba(123,47,247,0.15)',
              }}
            >
              <Shuffle className="w-4 h-4" />
              随机切换
            </button>
          </div>

          <div className="mt-auto pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-xs text-white/30 font-orbitron tracking-wider">
              STAR TRAIL GALLERY
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-[260px] pb-16 relative" style={{ zIndex: 1 }}>
        <div className="px-4 pt-6 pb-4 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-orbitron text-xl text-white/90 tracking-widest">
              STAR TRAILS
            </h2>
            <div className="text-xs text-white/40 font-orbitron">
              {filteredPhotos.length} results
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5">
            {filteredPhotos.map((photo) => (
              <PhotoCard key={photo.id} photo={photo} onExplode={handleExplode} />
            ))}
          </div>

          {filteredPhotos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-white/30">
              <Camera className="w-12 h-12 mb-4 opacity-40" />
              <p className="font-orbitron text-sm tracking-wider">没有匹配的照片</p>
              <p className="text-xs mt-2">请调整筛选条件</p>
            </div>
          )}
        </div>
      </main>

      {/* Bottom stats bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 backdrop-blur-2xl"
        style={{
          background: 'rgba(10, 14, 39, 0.6)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="lg:ml-[260px] px-4 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-white/50 font-orbitron tracking-wider">
            <span>当前 <span className="text-cyan-300 font-bold">{filteredPhotos.length}</span> 张照片</span>
            <span className="text-white/20">·</span>
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3 text-yellow-400/70" />
              已收藏 <span className="text-yellow-400 font-bold">{favoriteCount}</span> 张
            </span>
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={handleCloseDetail}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg rounded-2xl overflow-hidden backdrop-blur-3xl"
            style={{
              background: 'rgba(15, 20, 56, 0.7)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 0 60px rgba(123,47,247,0.15), 0 25px 50px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-colors hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={handleCloseDetail}
            >
              <X className="w-4 h-4 text-white/60" />
            </button>

            <div className="aspect-video w-full overflow-hidden">
              <img
                src={selectedPhoto.imageUrl}
                alt={selectedPhoto.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-6 space-y-4">
              <h3 className="font-orbitron text-lg text-white tracking-wider">
                {selectedPhoto.title}
              </h3>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-xs text-white/40 mb-1 font-orbitron tracking-wider">曝光</div>
                  <div className="text-sm text-cyan-300 font-orbitron">{formatExposure(selectedPhoto.exposureTime)}</div>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-xs text-white/40 mb-1 font-orbitron tracking-wider">光圈</div>
                  <div className="text-sm text-purple-300 font-orbitron">{selectedPhoto.aperture}</div>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-xs text-white/40 mb-1 font-orbitron tracking-wider">ISO</div>
                  <div className="text-sm text-amber-300 font-orbitron">{selectedPhoto.iso}</div>
                </div>
              </div>

              <button
                onClick={() => handleToggleFavorite(selectedPhoto.id)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-orbitron tracking-wider transition-all duration-200 hover:scale-[1.02] active:scale-95"
                style={{
                  background: selectedPhoto.isFavorite
                    ? 'linear-gradient(135deg, rgba(250,204,21,0.2), rgba(250,204,21,0.1))'
                    : 'linear-gradient(135deg, rgba(123,47,247,0.25), rgba(0,212,255,0.25))',
                  border: selectedPhoto.isFavorite
                    ? '1px solid rgba(250,204,21,0.3)'
                    : '1px solid rgba(123,47,247,0.3)',
                  color: selectedPhoto.isFavorite ? '#facc15' : 'rgba(255,255,255,0.8)',
                }}
              >
                <Heart
                  className="w-4 h-4"
                  fill={selectedPhoto.isFavorite ? 'currentColor' : 'none'}
                />
                {selectedPhoto.isFavorite ? '已收藏' : '收藏'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function drawStars(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  const count = Math.floor((w * h) / 4000);
  for (let i = 0; i < count; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = Math.random() * 1.2;
    const opacity = 0.2 + Math.random() * 0.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${opacity})`;
    ctx.fill();
  }
}
