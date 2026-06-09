import React, { useState, useRef, useEffect } from 'react';
import type { Spirit } from '../types';
import { EMOTION_BLOCKS, GALLERY_PAGE_SIZE } from '../constants';
import { formatTimestamp } from '../utils';
import SpiritFace from './SpiritFace';
import { useBreathingGlow } from '../hooks/useBreathingGlow';

interface SpiritGalleryProps {
  spirits: Spirit[];
  onDeleted: () => void;
  onError: (message: string) => void;
}

interface SpiritCardProps {
  spirit: Spirit;
  onClick: () => void;
  onDelete: () => void;
}

const SpiritCardAvatar: React.FC<{ spirit: Spirit; size: 'sm' | 'lg' }> = ({ spirit, size }) => {
  const avatarRef = useRef<HTMLDivElement>(null);
  const isLarge = size === 'lg';

  useBreathingGlow(avatarRef as React.RefObject<HTMLElement>, spirit.fusedColor, {
    minOpacity: isLarge ? 0.5 : 0.8,
    maxOpacity: 1.0,
    period: isLarge ? 1.5 : 2,
  });

  return (
    <div
      ref={avatarRef}
      className={isLarge ? 'detail-spirit' : 'spirit-avatar'}
      style={{ backgroundColor: spirit.fusedColor }}
    >
      <SpiritFace expression={spirit.expression} size={size} />
    </div>
  );
};

const SpiritCard: React.FC<SpiritCardProps> = ({ spirit, onClick, onDelete }) => {
  return (
    <div className="spirit-card" onClick={onClick}>
      <button
        className="delete-btn"
        onClick={(e) => {
          e.stopPropagation();
          if (confirm(`确定要删除精灵「${spirit.name}」吗？`)) {
            onDelete();
          }
        }}
      >
        ✕
      </button>
      <div className="card-avatar-wrap">
        <SpiritCardAvatar spirit={spirit} size="sm" />
      </div>
      <div className="card-info">
        <div className="card-name">{spirit.name}</div>
        <div className="card-time">{formatTimestamp(spirit.createdAt)}</div>
      </div>
    </div>
  );
};

interface DetailModalProps {
  spirit: Spirit;
  onClose: () => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ spirit, onClose }) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={overlayRef}
      className="detail-overlay"
      onClick={(e) => {
        if (e.target === overlayRef.current) {
          onClose();
        }
      }}
    >
      <div className="detail-modal">
        <button className="detail-close" onClick={onClose}>
          ✕
        </button>
        <div className="detail-avatar-wrap">
          <SpiritCardAvatar spirit={spirit} size="lg" />
        </div>
        <div className="detail-name">{spirit.name}</div>
        <div className="detail-time">创建于 {formatTimestamp(spirit.createdAt)}</div>

        <div className="detail-info-row">
          <span className="detail-info-label">色块叠放顺序</span>
          <div className="block-order-dots">
            {spirit.blockOrder.map((blockId, idx) => {
              const block = EMOTION_BLOCKS.find((b) => b.id === blockId);
              return block ? (
                <div
                  key={`${blockId}-${idx}`}
                  className="block-dot"
                  style={{ backgroundColor: block.color }}
                  title={`第${idx + 1}层：${block.name}`}
                >
                  {block.emoji}
                </div>
              ) : null;
            })}
          </div>
        </div>

        <div className="detail-info-row">
          <span className="detail-info-label">融合颜色</span>
          <div className="color-hex">{spirit.fusedColor}</div>
        </div>
      </div>
    </div>
  );
};

const SpiritGallery: React.FC<SpiritGalleryProps> = ({ spirits, onDeleted, onError }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSpirit, setSelectedSpirit] = useState<Spirit | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [spirits.length]);

  const totalPages = Math.max(1, Math.ceil(spirits.length / GALLERY_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * GALLERY_PAGE_SIZE;
  const pageSpirits = spirits.slice(startIdx, startIdx + GALLERY_PAGE_SIZE);

  const handleDelete = async (id: string) => {
    setIsDeletingId(id);
    try {
      const res = await fetch(`/api/spirits/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '删除失败');
      }

      setSelectedSpirit(null);
      onDeleted();
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除失败，请重试';
      onError(message);
    } finally {
      setIsDeletingId(null);
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages: (number | 'ellipsis')[] = [];
    const addPage = (p: number) => {
      if (!pages.includes(p as any)) pages.push(p);
    };

    addPage(1);
    if (safePage - 1 > 1) pages.push('ellipsis');
    for (let p = Math.max(2, safePage - 1); p <= Math.min(totalPages - 1, safePage + 1); p++) {
      addPage(p);
    }
    if (safePage + 1 < totalPages) pages.push('ellipsis');
    if (totalPages > 1) addPage(totalPages);

    return (
      <div className="pagination">
        <button
          className="page-btn"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={safePage <= 1}
        >
          ←
        </button>
        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span
              key={`e-${i}`}
              style={{ padding: '0 4px', color: 'rgba(255,255,255,0.4)' }}
            >
              …
            </span>
          ) : (
            <button
              key={p}
              className={`page-btn ${p === safePage ? 'active' : ''}`}
              onClick={() => setCurrentPage(p)}
            >
              {p}
            </button>
          )
        )}
        <button
          className="page-btn"
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={safePage >= totalPages}
        >
          →
        </button>
      </div>
    );
  };

  if (spirits.length === 0) {
    return (
      <div className="gallery-container">
        <div className="gallery-header">
          <h2 className="gallery-title">🖼️ 精灵画廊</h2>
          <span className="gallery-count">还没有精灵</span>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">🪄</div>
          <div className="empty-state-text">画廊空空如也，快去锻造第一个精灵吧！</div>
        </div>
      </div>
    );
  }

  return (
    <div className="gallery-container">
      <div className="gallery-header">
        <h2 className="gallery-title">🖼️ 精灵画廊</h2>
        <span className="gallery-count">
          共 {spirits.length} 个精灵 · 第 {safePage}/{totalPages} 页
        </span>
      </div>

      <div className="gallery-grid">
        {pageSpirits.map((spirit) => (
          <SpiritCard
            key={spirit.id}
            spirit={spirit}
            onClick={() => setSelectedSpirit(spirit)}
            onDelete={() => handleDelete(spirit.id)}
          />
        ))}
      </div>

      {renderPagination()}

      {selectedSpirit && (
        <DetailModal spirit={selectedSpirit} onClose={() => setSelectedSpirit(null)} />
      )}

      {isDeletingId && null}
    </div>
  );
};

export default SpiritGallery;
