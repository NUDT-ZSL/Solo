import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { PortfolioItem, AuthorizationType, AuthorizationRecord, PricingSuggestion } from '../api/dataService';
import { authorizationLabels, createPortfolioItem, updatePortfolioItem, calculatePricingRange } from '../api/dataService';

interface PortfolioProps {
  portfolio: PortfolioItem[];
  onPortfolioUpdate: (items: PortfolioItem[]) => void;
}

const authTypeColors: Record<AuthorizationType, string> = {
  exclusive: '#E74C3C',
  'non-exclusive': '#3498DB',
  buyout: '#2ECC71',
};

const LazyImage: React.FC<{ src: string; alt: string; style?: React.CSSProperties; onClick?: () => void }> = ({
  src,
  alt,
  style,
  onClick,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} style={{ ...style, position: 'relative', overflow: 'hidden' }} onClick={onClick}>
      {inView && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.3s ease-out',
            display: 'block',
          }}
        />
      )}
      {!loaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, var(--bg-card) 25%, var(--bg-secondary) 50%, var(--bg-card) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }}
        />
      )}
    </div>
  );
};

const PricingTooltip: React.FC<{
  pricing: PricingSuggestion;
  visible: boolean;
}> = ({ pricing, visible }) => {
  return (
    <div
      className={`pricing-tooltip ${visible ? 'pricing-tooltip-visible' : ''}`}
    >
      <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
        定价计算明细
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
        基于 {pricing.sampleCount} 条历史授权记录计算
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px' }}>
        <span style={{ color: 'var(--text-secondary)' }}>中位数</span>
        <span style={{ color: 'var(--gold)', fontWeight: '600' }}>¥{pricing.median.toLocaleString()}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px' }}>
        <span style={{ color: 'var(--text-secondary)' }}>建议区间</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
          ¥{pricing.min.toLocaleString()} - ¥{pricing.max.toLocaleString()}
        </span>
      </div>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          各授权类型参考中位数
        </div>
        {pricing.breakdown.map((item) => (
          <div key={item.type} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
            <span style={{ color: authTypeColors[item.type], fontWeight: '500' }}>
              {authorizationLabels[item.type]}
            </span>
            <span style={{ color: 'var(--text-primary)' }}>
              ¥{item.medianFee.toLocaleString()} <span style={{ color: 'var(--text-secondary)' }}>({item.count}笔)</span>
            </span>
          </div>
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          border: '8px solid transparent',
          borderTopColor: 'var(--bg-secondary)',
        }}
      />
    </div>
  );
};

const Lightbox: React.FC<{
  images: PortfolioItem[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}> = ({ images, currentIndex, onClose, onPrev, onNext }) => {
  const current = images[currentIndex];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose, onPrev, onNext]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'lightboxFade 0.3s ease-out',
      }}
      onClick={onClose}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
        style={{
          position: 'absolute',
          left: '32px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.15)',
          border: 'none',
          color: 'white',
          fontSize: '28px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.25s ease-out',
          backdropFilter: 'blur(8px)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
        }}
      >
        ‹
      </button>

      <div
        style={{ maxWidth: '90vw', maxHeight: '85vh', animation: 'imageFade 0.3s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={current.imageUrl}
          alt={current.title}
          style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: '8px' }}
        />
        <div style={{ textAlign: 'center', marginTop: '16px', color: 'white' }}>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>{current.title}</div>
          <div style={{ fontSize: '14px', opacity: 0.7 }}>
            {current.shotDate} · {authorizationLabels[current.authorizationType]}
          </div>
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
        style={{
          position: 'absolute',
          right: '32px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.15)',
          border: 'none',
          color: 'white',
          fontSize: '28px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.25s ease-out',
          backdropFilter: 'blur(8px)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
        }}
      >
        ›
      </button>

      <div style={{ position: 'absolute', top: '24px', right: '24px', color: 'white', fontSize: '14px', opacity: 0.7 }}>
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  );
};

const EditModal: React.FC<{
  item: PortfolioItem;
  onClose: () => void;
  onSave: (updated: PortfolioItem) => void;
  allPortfolio: PortfolioItem[];
}> = ({ item, onClose, onSave, allPortfolio }) => {
  const [title, setTitle] = useState(item.title);
  const [shotDate, setShotDate] = useState(item.shotDate);
  const [authType, setAuthType] = useState<AuthorizationType>(item.authorizationType);
  const [authorizations, setAuthorizations] = useState<AuthorizationRecord[]>(item.authorizations);
  const [newAuth, setNewAuth] = useState({ licensee: '', date: '', fee: '' });

  const handleAddAuth = () => {
    if (!newAuth.licensee || !newAuth.date || !newAuth.fee) return;
    const auth: AuthorizationRecord = {
      id: `auth-${Date.now()}`,
      licensee: newAuth.licensee,
      date: newAuth.date,
      fee: parseInt(newAuth.fee),
    };
    setAuthorizations([...authorizations, auth]);
    setNewAuth({ licensee: '', date: '', fee: '' });
  };

  const handleRemoveAuth = (id: string) => {
    setAuthorizations(authorizations.filter(a => a.id !== id));
  };

  const handleSave = async () => {
    const updatedItem = {
      ...item,
      title,
      shotDate,
      authorizationType: authType,
      authorizations,
    };
    const updatedFromServer = await updatePortfolioItem(item.id, updatedItem);
    const pricing = calculatePricingRange(updatedFromServer.id, allPortfolio.map(p => p.id === item.id ? updatedFromServer : p));
    onSave({ ...updatedFromServer, pricingSuggestion: pricing });
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        zIndex: 1001,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'lightboxFade 0.3s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
          animation: 'imageFade 0.3s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', color: 'var(--text-primary)' }}>
          编辑作品信息
        </h2>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            作品标题
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'var(--bg-secondary)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              transition: 'all 0.25s ease-out',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            拍摄日期
          </label>
          <input
            type="date"
            value={shotDate}
            onChange={(e) => setShotDate(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'var(--bg-secondary)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              transition: 'all 0.25s ease-out',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            授权类型
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            {(['exclusive', 'non-exclusive', 'buyout'] as AuthorizationType[]).map((type) => (
              <button
                key={type}
                onClick={() => setAuthType(type)}
                className={`auth-tag ${authType === type ? 'auth-tag-animated' : ''}`}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: authType === type ? authTypeColors[type] : 'var(--bg-secondary)',
                  border: `2px solid ${authType === type ? authTypeColors[type] : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {authorizationLabels[type]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            授权记录
          </label>
          {authorizations.map((auth) => (
            <div
              key={auth.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                background: 'var(--bg-secondary)',
                borderRadius: '8px',
                marginBottom: '8px',
              }}
            >
              <div>
                <div style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{auth.licensee}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                  {auth.date} · ¥{auth.fee.toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => handleRemoveAuth(auth.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: '4px 8px',
                }}
              >
                ×
              </button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <input
              type="text"
              placeholder="授权方"
              value={newAuth.licensee}
              onChange={(e) => setNewAuth({ ...newAuth, licensee: e.target.value })}
              style={{
                flex: 1,
                padding: '10px 12px',
                background: 'var(--bg-secondary)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            />
            <input
              type="date"
              value={newAuth.date}
              onChange={(e) => setNewAuth({ ...newAuth, date: e.target.value })}
              style={{
                padding: '10px 12px',
                background: 'var(--bg-secondary)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            />
            <input
              type="number"
              placeholder="费用"
              value={newAuth.fee}
              onChange={(e) => setNewAuth({ ...newAuth, fee: e.target.value })}
              style={{
                width: '100px',
                padding: '10px 12px',
                background: 'var(--bg-secondary)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            />
            <button
              onClick={handleAddAuth}
              style={{
                padding: '10px 16px',
                background: 'var(--accent)',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.25s ease-out',
              }}
            >
              添加
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.25s ease-out',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '12px 24px',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.25s ease-out',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

const Portfolio: React.FC<PortfolioProps> = ({ portfolio, onPortfolioUpdate }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [hoveredPricingId, setHoveredPricingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  const handleFiles = async (files: FileList) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const validFiles = Array.from(files).filter(f => validTypes.includes(f.type));

    for (const file of validFiles) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageUrl = e.target?.result as string;
        const newItem = await createPortfolioItem({
          title: file.name.replace(/\.[^/.]+$/, ''),
          imageUrl,
          shotDate: new Date().toISOString().split('T')[0],
          authorizationType: 'non-exclusive',
        });
        const pricing = calculatePricingRange(newItem.id, [...portfolio, newItem]);
        onPortfolioUpdate([...portfolio, { ...newItem, pricingSuggestion: pricing }]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleUpdateItem = (updated: PortfolioItem) => {
    onPortfolioUpdate(portfolio.map(p => (p.id === updated.id ? updated : p)));
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>作品集管理</h1>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: '12px 24px',
            background: 'var(--accent)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.25s ease-out',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <span>+</span> 上传作品
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`upload-zone ${isDragging ? 'upload-zone-dragging' : ''}`}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📷</div>
        <div style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '8px' }}>
          {isDragging ? '释放以上传图片' : '拖拽图片到此处，或点击选择文件'}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          支持 JPG、PNG、WebP 格式
        </div>
      </div>

      <div
        className="portfolio-grid"
        style={{
          columnCount: 4,
          columnGap: '16px',
        }}
      >
        {portfolio.map((item, index) => (
          <div
            key={item.id}
            style={{
              breakInside: 'avoid',
              marginBottom: '16px',
              background: 'var(--bg-card)',
              borderRadius: '12px',
              overflow: 'hidden',
              transition: 'all 0.25s ease-out',
              animation: `fadeIn 0.5s ease-out ${index * 0.05}s both`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 16px 32px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ position: 'relative' }}>
              <LazyImage
                src={item.imageUrl}
                alt={item.title}
                style={{ aspectRatio: 'auto', cursor: 'pointer' }}
                onClick={() => setLightboxIndex(index)}
              />
              <div
                className={`auth-tag auth-tag-${item.authorizationType} auth-tag-transition`}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: 'white',
                  background: authTypeColors[item.authorizationType],
                  boxShadow: `0 2px 8px ${authTypeColors[item.authorizationType]}40`,
                }}
              >
                {authorizationLabels[item.authorizationType]}
              </div>
            </div>

            <div style={{ padding: '16px' }}>
              <div style={{ fontWeight: '500', color: 'var(--text-primary)', marginBottom: '6px', fontSize: '14px' }}>
                {item.title}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                {item.shotDate}
              </div>

              {item.pricingSuggestion && (
                <div
                  style={{ position: 'relative', display: 'inline-block', marginBottom: '12px' }}
                  onMouseEnter={() => setHoveredPricingId(item.id)}
                  onMouseLeave={() => setHoveredPricingId(null)}
                >
                  <div className="pricing-tag">
                    💰 ¥{item.pricingSuggestion.min.toLocaleString()} - ¥{item.pricingSuggestion.max.toLocaleString()}
                  </div>
                  <PricingTooltip
                    pricing={item.pricingSuggestion}
                    visible={hoveredPricingId === item.id}
                  />
                </div>
              )}

              {item.authorizations.length > 0 && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  已授权 {item.authorizations.length} 次
                </div>
              )}

              <button
                onClick={() => setEditingItem(item)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease-out',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--accent)';
                  e.currentTarget.style.borderColor = 'var(--accent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
              >
                编辑信息
              </button>
            </div>
          </div>
        ))}
      </div>

      {portfolio.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📁</div>
          <div style={{ fontSize: '18px', marginBottom: '8px' }}>暂无作品</div>
          <div>上传您的第一张照片开始吧</div>
        </div>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          images={portfolio}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex(Math.max(0, lightboxIndex - 1))}
          onNext={() => setLightboxIndex(Math.min(portfolio.length - 1, lightboxIndex + 1))}
        />
      )}

      {editingItem && (
        <EditModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleUpdateItem}
          allPortfolio={portfolio}
        />
      )}
    </div>
  );
};

export default Portfolio;
