import React, { useEffect, useState } from 'react';
import { ArrowLeft, Trash2, Calendar, Tag, ImageOff } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useNavigate } from 'react-router-dom';
import type { GalleryItem, StyleType } from '@/types';

const STYLE_LABELS: Record<StyleType, string> = {
  sketch: '手绘线稿',
  watercolor: '水彩晕染',
  pixel: '像素风',
  collage: '拼贴感',
  oil: '复古油画',
};

export const Gallery: React.FC = () => {
  const navigate = useNavigate();
  const { gallery, removeGalleryItem, setGallery } = useStore();
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [styleFilter, setStyleFilter] = useState<string>('all');

  useEffect(() => {
    fetch('/api/gallery')
      .then((r) => r.json())
      .then((data: GalleryItem[]) => {
        setGallery(data);
      })
      .catch(() => {});
  }, [setGallery]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await fetch(`/api/gallery/${id}`, { method: 'DELETE' });
      removeGalleryItem(id);
    } catch {
      removeGalleryItem(id);
    }
  };

  const filteredGallery = gallery.filter((item) => {
    if (styleFilter !== 'all' && item.style !== styleFilter) return false;
    if (dateFilter !== 'all') {
      const itemDate = new Date(item.createdAt).toISOString().slice(0, 10);
      const today = new Date().toISOString().slice(0, 10);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      if (dateFilter === 'today' && itemDate !== today) return false;
      if (dateFilter === 'week' && itemDate < weekAgo) return false;
    }
    return true;
  });

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '24px 48px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(74,63,53,0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => navigate('/')}
            className="hover-lift toolbar-icon"
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.5)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(74,63,53,0.1)',
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1
              style={{
                fontFamily: "'Playfair Display', 'Noto Serif SC', serif",
                fontSize: 26,
                fontWeight: 700,
                color: '#4A3F35',
              }}
            >
              我的画廊
            </h1>
            <p style={{ fontSize: 13, color: '#8B7D6F', marginTop: 2 }}>
              共 {gallery.length} 件作品
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.5)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(74,63,53,0.1)',
            }}
          >
            <Calendar size={14} color="#6B5B4F" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: 13,
                color: '#4A3F35',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <option value="all">全部日期</option>
              <option value="today">今天</option>
              <option value="week">最近一周</option>
            </select>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.5)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(74,63,53,0.1)',
            }}
          >
            <Tag size={14} color="#6B5B4F" />
            <select
              value={styleFilter}
              onChange={(e) => setStyleFilter(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: 13,
                color: '#4A3F35',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <option value="all">全部风格</option>
              {Object.entries(STYLE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div
        className="scrollbar-thin"
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '32px 48px 80px',
        }}
      >
        {filteredGallery.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '60%',
              color: '#8B7D6F',
            }}
          >
            <ImageOff size={48} style={{ marginBottom: 16, opacity: 0.4 }} />
            <p style={{ fontSize: 16, fontWeight: 500, color: '#4A3F35', marginBottom: 6 }}>
              暂无作品
            </p>
            <p style={{ fontSize: 13, opacity: 0.7 }}>
              {gallery.length === 0 ? '去创作你的第一件拼贴作品吧！' : '没有符合筛选条件的作品'}
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, 220px)',
              gap: 20,
              justifyContent: 'flex-start',
            }}
          >
            {filteredGallery.map((item) => (
              <div key={item.id} className="gallery-card">
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)',
                    opacity: 0,
                    transition: 'opacity 0.3s ease-in-out',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: 12,
                    color: 'white',
                    opacity: 0,
                    transition: 'opacity 0.3s ease-in-out',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      marginBottom: 4,
                      textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      opacity: 0.85,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>
                      {STYLE_LABELS[item.style]} · {formatDate(item.createdAt)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(e, item.id)}
                  className="hover-lift"
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: 'rgba(239, 68, 68, 0.9)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.3s ease-in-out',
                    color: 'white',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                  onFocus={(e) => (e.currentTarget.style.opacity = '1')}
                  onBlur={(e) => (e.currentTarget.style.opacity = '0')}
                >
                  <Trash2 size={13} />
                </button>
                <style>{`
                  .gallery-card:hover > div[style*="opacity: 0"],
                  .gallery-card:hover > button[style*="opacity: 0"] {
                    opacity: 1 !important;
                  }
                `}</style>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
