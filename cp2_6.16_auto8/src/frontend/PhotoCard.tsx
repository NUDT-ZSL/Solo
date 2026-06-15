import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Photo } from '../types';
import { Image, MapPin, Calendar, Trash2 } from 'lucide-react';

interface PhotoCardProps {
  photo: Photo;
  onSelect: (photo: Photo) => void;
  onDelete: (id: string) => void;
  isSelected: boolean;
}

const PhotoCard: React.FC<PhotoCardProps> = ({ photo, onSelect, onDelete, isSelected }) => {
  const [loaded, setLoaded] = useState(false);
  const [hover, setHover] = useState(false);
  const [error, setError] = useState(false);
  const [nearVisible, setNearVisible] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const hasBeenVisible = useRef(false);

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        hasBeenVisible.current = true;
        setNearVisible(true);
      }
    }
  }, []);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin: '300px 344px 300px 344px',
      threshold: 0,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleIntersection]);

  useEffect(() => {
    if (nearVisible && imgRef.current && !loaded) {
      imgRef.current.src = photo.filepath;
    }
  }, [nearVisible, photo.filepath, loaded]);

  const date = new Date(photo.timestamp);
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  return (
    <div
      ref={cardRef}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        margin: '0 12px',
        minWidth: '320px',
        flex: '0 0 auto',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        onClick={() => onSelect(photo)}
        style={{
          width: 200,
          background: '#fff',
          borderRadius: 12,
          padding: 12,
          boxShadow: isSelected
            ? '0 8px 24px rgba(30,136,229,0.35)'
            : '0 4px 16px rgba(0,0,0,0.08)',
          cursor: 'pointer',
          transition: 'transform 0.2s, box-shadow 0.2s',
          transform: hover ? 'translateY(-6px) scale(1.03)' : 'none',
          border: isSelected ? '2px solid #1e88e5' : '2px solid transparent',
          zIndex: hover ? 10 : 2,
          position: 'relative',
        }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(photo.id); }}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.5)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: hover ? 1 : 0,
            transition: 'opacity 0.2s',
            zIndex: 20,
          }}
          title="删除照片"
        >
          <Trash2 size={14} />
        </button>

        <div
          style={{
            width: '100%',
            height: 130,
            borderRadius: 8,
            overflow: 'hidden',
            background: '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {nearVisible && !error ? (
            <img
              ref={imgRef}
              onLoad={() => setLoaded(true)}
              onError={() => setError(true)}
              alt={photo.filename}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: loaded ? 'block' : 'none',
              }}
              loading="lazy"
            />
          ) : null}
          {(!loaded || !nearVisible || error) && (
            <Image size={36} color="#bbb" />
          )}
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={12} color="#1e88e5" />
            {photo.city || '未命名地点'}
          </div>
          {photo.location && (
            <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>{photo.location}</div>
          )}
          <div style={{ fontSize: 11, color: '#999', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={11} />
            {dateStr}
          </div>
        </div>
      </div>

      <div style={{
        width: 16, height: 16, borderRadius: '50%',
        background: '#1e88e5', border: '3px solid #fff',
        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        margin: '16px 0',
        zIndex: 3,
      }} />

      {hover && nearVisible && loaded && !error && (
        <div
          style={{
            position: 'absolute',
            top: -180,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 240,
            height: 160,
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
            zIndex: 100,
            pointerEvents: 'none',
            border: '2px solid #fff',
          }}
        >
          <img
            src={photo.filepath}
            alt="preview"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}
    </div>
  );
};

export default PhotoCard;
