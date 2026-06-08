import { useRef, useEffect, useCallback, useState } from 'react';
import { StarTrailRenderer } from './StarTrailRenderer';
import type { Photo } from './StarGalleryEngine';

interface PhotoCardProps {
  photo: Photo;
  onExplode: (photo: Photo) => void;
}

export default function PhotoCard({ photo, onExplode }: PhotoCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<StarTrailRenderer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imgSrc, setImgSrc] = useState(photo.imageUrl);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new StarTrailRenderer(canvas);
    rendererRef.current = renderer;
    renderer.configure(photo.focalLengthType, photo.theme, photo.exposureTime);
    return () => {
      renderer.stop();
      rendererRef.current = null;
    };
  }, [photo.focalLengthType, photo.theme, photo.exposureTime]);

  useEffect(() => {
    if (!rendererRef.current) return;
    rendererRef.current.setHovered(isHovered);
  }, [isHovered]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !rendererRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          rendererRef.current?.resize(width, height);
          rendererRef.current?.start();
        }
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  const handleClick = useCallback(() => {
    if (rendererRef.current) {
      rendererRef.current.triggerExplosion();
    }
    onExplode(photo);
  }, [photo, onExplode]);

  const handleImageError = useCallback(() => {
    setImgSrc('');
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-xl cursor-pointer group transition-transform duration-300 ${isHovered ? 'scale-105 z-10' : 'scale-100'}`}
      style={{
        aspectRatio: '4/3',
        background: photo.theme === 'warm'
          ? 'linear-gradient(135deg, #1a0a1e 0%, #2a1020 50%, #1a0a1e 100%)'
          : 'linear-gradient(135deg, #0a0e27 0%, #0e1a30 50%, #0a0e27 100%)',
        boxShadow: isHovered
          ? photo.theme === 'warm'
            ? '0 0 30px rgba(255,107,53,0.3), 0 8px 32px rgba(0,0,0,0.6)'
            : '0 0 30px rgba(0,212,255,0.3), 0 8px 32px rgba(0,0,0,0.6)'
          : '0 4px 16px rgba(0,0,0,0.4)',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none' }}
      />

      {imgSrc && (
        <img
          src={imgSrc}
          alt={photo.title}
          className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-opacity duration-300"
          onLoad={() => setImageLoaded(true)}
          onError={handleImageError}
          loading="lazy"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
        <h3 className="text-white font-orbitron text-sm tracking-wider mb-1 drop-shadow-lg">
          {photo.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-white/60">
          <span className="inline-flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {photo.exposureTime >= 60 ? `${Math.floor(photo.exposureTime / 60)}m${photo.exposureTime % 60 > 0 ? photo.exposureTime % 60 + 's' : ''}` : `${photo.exposureTime}s`}
          </span>
          <span>{photo.aperture}</span>
          <span>ISO {photo.iso}</span>
        </div>
      </div>

      {photo.isFavorite && (
        <div className="absolute top-2 right-2 z-10">
          <svg className="w-4 h-4 text-yellow-400 drop-shadow-lg" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </div>
      )}
    </div>
  );
}
