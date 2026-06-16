import React from 'react';
import type { Instrument } from '../types';
import { getStatusStyle, mapRatingToStars } from '../lib/businessService';

interface InstrumentCardProps {
  instrument: Instrument;
  onClick?: () => void;
  actions?: React.ReactNode;
  showCreatedAt?: boolean;
}

const InstrumentCard: React.FC<InstrumentCardProps> = ({ instrument, onClick, actions, showCreatedAt }) => {
  const statusStyle = getStatusStyle(instrument.status);
  const stars = mapRatingToStars(instrument.sellerRating);

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#16213E',
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'transform 0.3s ease-out, box-shadow 0.3s ease-out, background-color 0.3s ease, border-color 0.3s ease-out',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #e0e0e0'
  };

  const imageContainerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '200px',
    overflow: 'hidden',
    backgroundColor: '#0F3460'
  };

  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.3s ease-out'
  };

  const statusBadgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: '12px',
    right: '12px',
    backgroundColor: statusStyle.bg,
    color: '#FFFFFF',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    zIndex: 10
  };

  const contentStyle: React.CSSProperties = {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: '1.4'
  };

  const brandStyle: React.CSSProperties = {
    fontSize: '13px',
    color: '#8892B0',
    fontWeight: '400'
  };

  const priceStyle: React.CSSProperties = {
    fontSize: '22px',
    fontWeight: '700',
    color: '#E94560',
    marginTop: '4px'
  };

  const footerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: '12px'
  };

  const sellerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  };

  const sellerNameStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#8892B0'
  };

  const starsStyle: React.CSSProperties = {
    display: 'flex',
    gap: '2px',
    fontSize: '12px',
    color: '#F1C40F'
  };

  const dateStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#8892B0',
    marginTop: '8px'
  };

  const metaRowStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#a0a0a0',
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  };

  const getDaysAgo = (dateStr: string): string => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return '今天发布';
    if (diffDays === 1) return '1天前发布';
    return `${diffDays}天前发布`;
  };

  const renderStars = (count: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} style={{ opacity: i < count ? 1 : 0.3 }}>★</span>
    ));
  };

  return (
    <div
      style={cardStyle}
      className="instrument-card"
      onClick={onClick}
      onMouseEnter={(e) => {
        const target = e.currentTarget;
        target.style.transform = 'translateY(-6px)';
        target.style.boxShadow = '0 12px 24px rgba(0,0,0,0.4)';
        target.style.borderColor = '#b0b0b0';
        const img = target.querySelector('img');
        if (img) img.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        const target = e.currentTarget;
        target.style.transform = 'translateY(0)';
        target.style.boxShadow = 'none';
        target.style.borderColor = '#e0e0e0';
        const img = target.querySelector('img');
        if (img) img.style.transform = 'scale(1)';
      }}
    >
      <div style={imageContainerStyle}>
        <div style={statusBadgeStyle}>{statusStyle.label}</div>
        <img
          src={instrument.images[0]}
          alt={instrument.name}
          style={imageStyle}
          loading="lazy"
        />
      </div>
      <div style={contentStyle}>
        <div style={titleStyle}>{instrument.name}</div>
        <div style={brandStyle}>{instrument.brand}</div>
        <div style={priceStyle}>¥{instrument.price.toLocaleString()}</div>
        <div style={footerStyle}>
          <div style={sellerStyle}>
            <div style={starsStyle}>{renderStars(stars)}</div>
            <span style={sellerNameStyle}>{instrument.sellerName}</span>
          </div>
        </div>
        <div style={metaRowStyle}>
          <span>{instrument.brand}</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>{getDaysAgo(instrument.createdAt)}</span>
        </div>
        {showCreatedAt && (
          <div style={dateStyle}>
            发布于 {new Date(instrument.createdAt).toLocaleDateString('zh-CN')}
          </div>
        )}
        {actions && <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>{actions}</div>}
      </div>
    </div>
  );
};

export default InstrumentCard;
