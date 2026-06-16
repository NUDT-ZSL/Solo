import React, { useState, useCallback } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import type { ClothingItem } from '../types';
import { useLazyImage } from '../hooks/useLazyLoad';

interface DetailPageProps {
  item: ClothingItem;
  allItems: ClothingItem[];
  onBack: () => void;
  onGenerateRecommend: (item: ClothingItem) => void;
}

interface TagProps {
  label: string;
  type: 'style' | 'season' | 'occasion';
}

const InteractiveTag: React.FC<TagProps> = ({ label, type }) => {
  const [clicked, setClicked] = useState(false);

  const handleClick = useCallback(() => {
    setClicked(true);
    setTimeout(() => setClicked(false), 150);
  }, []);

  const className = [
    'tag',
    type === 'style' ? 'tag-style' : '',
    type === 'season' ? 'tag-season' : '',
    type === 'occasion' ? 'tag-occasion' : '',
    clicked ? 'clicked' : '',
  ].filter(Boolean).join(' ');

  return (
    <span className={className} onClick={handleClick}>
      {label}
    </span>
  );
};

interface ColorTagProps {
  color: string;
  colorName: string;
}

const ColorTag: React.FC<ColorTagProps> = ({ color, colorName }) => {
  const [clicked, setClicked] = useState(false);

  const handleClick = useCallback(() => {
    setClicked(true);
    setTimeout(() => setClicked(false), 150);
  }, []);

  const className = [
    'color-tag',
    clicked ? 'clicked' : '',
  ].filter(Boolean).join(' ');

  return (
    <span className={className} onClick={handleClick}>
      <span className="color-swatch" style={{ backgroundColor: color }} />
      {colorName}
    </span>
  );
};

interface LazyDetailImageProps {
  src: string;
  alt: string;
}

const LazyDetailImage: React.FC<LazyDetailImageProps> = ({ src, alt }) => {
  const [imgRef, imageSrc, isLoaded] = useLazyImage(src);

  return (
    <div className="detail-image">
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        style={{
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.5s ease',
        }}
        loading="lazy"
      />
    </div>
  );
};

export const DetailPage: React.FC<DetailPageProps> = ({
  item,
  onBack,
  onGenerateRecommend,
}) => {
  const handleGenerateClick = useCallback(() => {
    onGenerateRecommend(item);
  }, [item, onGenerateRecommend]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px' }}>
      <button className="back-btn" onClick={onBack}>
        <ArrowLeft size={16} />
        返回
      </button>

      <div className="detail-page">
        <LazyDetailImage src={item.imageUrl} alt={item.name} />

        <div className="detail-panel">
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, marginBottom: 8 }}>
              {item.name}
            </h2>
            <p style={{ color: 'var(--color-text-light)', fontSize: 14 }}>
              ID: {item.id}
            </p>
          </div>

          <div>
            <h4 className="section-title">款式</h4>
            <div className="tag-group">
              <InteractiveTag label={item.style} type="style" />
            </div>
          </div>

          <div>
            <h4 className="section-title">颜色</h4>
            <div className="tag-group">
              <ColorTag color={item.color} colorName={item.colorName} />
            </div>
          </div>

          <div>
            <h4 className="section-title">适合季节</h4>
            <div className="tag-group">
              {item.season.map((s) => (
                <InteractiveTag key={s} label={s} type="season" />
              ))}
            </div>
          </div>

          <div>
            <h4 className="section-title">适合场合</h4>
            <div className="tag-group">
              {item.occasion.map((o) => (
                <InteractiveTag key={o} label={o} type="occasion" />
              ))}
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <button className="btn-generate" onClick={handleGenerateClick}>
              <Sparkles size={20} />
              生成穿搭推荐
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
