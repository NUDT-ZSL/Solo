import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { generateReport, formatReportForDisplay } from '../modules/report';
import { estimatePrice } from '../modules/analysis';
import './Detail.css';

interface Instrument {
  id: string;
  name: string;
  brand: string;
  model: string;
  price: number;
  condition: string;
  conditionScore: number;
  description: string;
  images: string[];
  sellerId: string;
  sellerName: string;
  createdAt: string;
  flaws: Array<{ x: number; y: number; w: number; h: number; description: string }>;
}

interface SimilarInstrument {
  id: string;
  name: string;
  brand: string;
  condition: string;
  price: number;
  soldDate: string;
  image: string;
}

function getConditionClass(condition: string): string {
  switch (condition) {
    case '全新': return 'condition-new';
    case '几乎全新': return 'condition-like-new';
    case '有明显使用痕迹': return 'condition-used';
    case '有瑕疵': return 'condition-damaged';
    default: return 'condition-used';
  }
}

function getRatingLabel(score: number): { label: string; color: string } {
  if (score >= 95) return { label: '完美', color: '#2ECC71' };
  if (score >= 90) return { label: '优秀', color: '#2ECC71' };
  if (score >= 80) return { label: '良好', color: '#3498DB' };
  if (score >= 70) return { label: '中等', color: '#E67E22' };
  if (score >= 60) return { label: '一般', color: '#E67E22' };
  return { label: '较差', color: '#E74C3C' };
}

function CircleProgress({ score, size = 160 }: { score: number; size?: number }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (animatedScore / 100) * circumference;
  
  const getColor = (score: number) => {
    if (score >= 90) return '#2ECC71';
    if (score >= 75) return '#3498DB';
    if (score >= 60) return '#E67E22';
    return '#E74C3C';
  };

  useEffect(() => {
    const duration = 800;
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(score * easeOut));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [score]);

  return (
    <div className="circle-progress" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E74C3C" />
            <stop offset="50%" stopColor="#E67E22" />
            <stop offset="100%" stopColor="#2ECC71" />
          </linearGradient>
        </defs>
        <circle
          className="progress-bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className="progress-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          stroke={getColor(animatedScore)}
        />
      </svg>
      <div className="progress-content">
        <span className="score-number">{animatedScore}</span>
        <span className="score-label">/ 100</span>
      </div>
    </div>
  );
}

function ImageGallery({ images, flaws }: { images: string[]; flaws: Instrument['flaws'] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set([0]));
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;
  const imagesToShow = images.slice(0, 6);

  const goToSlide = useCallback((index: number) => {
    if (index === currentIndex) return;
    setIsFading(true);
    setTimeout(() => {
      setCurrentIndex(index);
      setLoadedImages(prev => new Set(prev).add(index));
      setTimeout(() => setIsFading(false), 50);
    }, 300);
  }, [currentIndex]);

  const nextSlide = useCallback(() => {
    const next = (currentIndex + 1) % imagesToShow.length;
    goToSlide(next);
  }, [currentIndex, imagesToShow.length, goToSlide]);

  const prevSlide = useCallback(() => {
    const prev = (currentIndex - 1 + imagesToShow.length) % imagesToShow.length;
    goToSlide(prev);
  }, [currentIndex, imagesToShow.length, goToSlide]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevSlide, nextSlide]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
  };

  const currentFlaws = currentIndex === 0 ? flaws : [];

  return (
    <div 
      className="image-gallery"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="gallery-main">
        {imagesToShow.map((img, idx) => (
          <div
            key={idx}
            className={`gallery-image-wrapper ${idx === currentIndex ? 'active' : ''} ${isFading ? 'fading' : ''}`}
          >
            {(idx === currentIndex || loadedImages.has(idx)) && (
              <img 
                src={img} 
                alt={`乐器图片 ${idx + 1}`}
                className="gallery-image"
              />
            )}
            {idx === currentIndex && currentFlaws.map((flaw, flawIdx) => (
              <div
                key={flawIdx}
                className="flaw-marker"
                style={{
                  left: `${flaw.x * 100}%`,
                  top: `${flaw.y * 100}%`,
                  width: `${flaw.w * 100}%`,
                  height: `${flaw.h * 100}%`
                }}
                title={flaw.description}
              >
                <span className="flaw-badge">{flawIdx + 1}</span>
                <span className="flaw-tooltip">{flaw.description}</span>
              </div>
            ))}
          </div>
        ))}
        
        <div className="gallery-counter">
          {currentIndex + 1} / {imagesToShow.length}
        </div>
        
        {imagesToShow.length > 1 && (
          <>
            <button 
              className="gallery-btn gallery-prev" 
              onClick={prevSlide}
              aria-label="上一张"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button 
              className="gallery-btn gallery-next" 
              onClick={nextSlide}
              aria-label="下一张"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </>
        )}
      </div>
      
      {imagesToShow.length > 1 && (
        <div className="gallery-thumbnails">
          {imagesToShow.map((img, idx) => (
            <button
              key={idx}
              className={`gallery-thumb ${idx === currentIndex ? 'active' : ''}`}
              onClick={() => goToSlide(idx)}
            >
              <img src={img} alt={`缩略图 ${idx + 1}`} loading="lazy" />
              <div className="thumb-overlay">
                <span className="thumb-index">{idx + 1}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SimilarInstruments({ brand, model, currentId }: { brand: string; model: string; currentId: string }) {
  const { data: instruments, isLoading } = useQuery<Instrument[]>({
    queryKey: ['instruments'],
    queryFn: async () => {
      const res = await fetch('/api/instruments');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  if (isLoading || !instruments) {
    return (
      <div className="similar-section">
        <h4 className="similar-title">相似乐器参考</h4>
        <div className="similar-loading">加载中...</div>
      </div>
    );
  }

  const mockSoldData: SimilarInstrument[] = [
    ...instruments
      .filter(i => i.id !== currentId && (i.brand === brand || i.model.includes(model.split(' ')[0])))
      .slice(0, 2)
      .map(i => ({
        id: i.id,
        name: i.name,
        brand: i.brand,
        condition: i.condition,
        price: Math.round(i.price * (0.85 + Math.random() * 0.2)),
        soldDate: '2024-0' + (Math.floor(Math.random() * 5) + 1) + '-' + (10 + Math.floor(Math.random() * 18)),
        image: i.images[0]
      })),
    {
      id: 'mock-1',
      name: `${brand} ${model}（已售）`,
      brand,
      condition: Math.random() > 0.5 ? '几乎全新' : '有明显使用痕迹',
      price: Math.round(8000 + Math.random() * 15000),
      soldDate: '2024-03-' + (15 + Math.floor(Math.random() * 10)),
      image: instruments[0]?.images[0] || ''
    }
  ].slice(0, 3);

  if (mockSoldData.length === 0) {
    return null;
  }

  return (
    <div className="similar-section">
      <h4 className="similar-title">相似乐器参考</h4>
      <p className="similar-subtitle">同品牌/型号近期成交价参考</p>
      
      <div className="similar-list">
        {mockSoldData.map((item, idx) => (
          <div key={item.id} className={`similar-item ${idx < mockSoldData.length - 1 ? 'has-divider' : ''}`}>
            <div className="similar-image">
              <img src={item.image} alt={item.name} />
              <span className="sold-badge">已成交</span>
            </div>
            <div className="similar-info">
              <Link to={`/instrument/${item.id}`} className="similar-name">
                {item.name}
              </Link>
              <div className="similar-meta">
                <span className={`condition-tag-small ${getConditionClass(item.condition)}`}>
                  {item.condition}
                </span>
                <span className="similar-date">{item.soldDate}</span>
              </div>
              <span className="similar-price">¥{item.price.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', phone: '', message: '' });
  const [showContactSuccess, setShowContactSuccess] = useState(false);
  const [pageVisible, setPageVisible] = useState(false);

  const { data: instrument, isLoading, error } = useQuery<Instrument>({
    queryKey: ['instrument', id],
    queryFn: async () => {
      const res = await fetch(`/api/instruments/${id}`);
      if (!res.ok) throw new Error('Failed to fetch instrument');
      return res.json();
    }
  });

  useEffect(() => {
    setTimeout(() => setPageVisible(true), 50);
    
    const userId = localStorage.getItem('userId');
    if (userId && id) {
      fetch(`/api/favorites/${userId}`)
        .then(res => res.json())
        .then(favorites => {
          setIsFavorite(favorites.some((f: Instrument) => f.id === id));
        })
        .catch(() => {});
    }
  }, [id]);

  const report = instrument ? formatReportForDisplay(generateReport(instrument.conditionScore, instrument.flaws)) : null;
  const priceRange = instrument ? estimatePrice(instrument.brand, instrument.model, instrument.conditionScore) : null;
  const rating = report ? getRatingLabel(report.score) : { label: '', color: '' };

  const toggleFavorite = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/login');
      return;
    }

    try {
      if (isFavorite) {
        await fetch(`/api/favorites/${userId}/${id}`, { method: 'DELETE' });
      } else {
        await fetch(`/api/favorites/${userId}/${id}`, { method: 'POST' });
      }
      setIsFavorite(!isFavorite);
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowContactSuccess(true);
    setTimeout(() => setShowContactSuccess(false), 3000);
  };

  if (isLoading) {
    return (
      <div className="detail-page">
        <div className="container">
          <div className="loading">
            <div className="loading-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !instrument) {
    return (
      <div className="detail-page">
        <div className="container">
          <div className="error-message">加载失败或商品不存在</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`detail-page ${pageVisible ? 'visible' : ''}`}>
      <div className="container">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          返回
        </button>

        <div className="detail-layout">
          <div className="detail-left">
            <ImageGallery images={instrument.images} flaws={instrument.flaws} />
            
            <div className="detail-info-card">
              <h1 className="detail-title">{instrument.name}</h1>
              <div className="detail-meta">
                <span className={`condition-tag ${getConditionClass(instrument.condition)}`}>
                  {instrument.condition}
                </span>
                <span className="detail-brand">{instrument.brand}</span>
                <span className="detail-model">{instrument.model}</span>
                <span className="detail-date">上架于 {instrument.createdAt}</span>
              </div>
              <div className="detail-price">¥{instrument.price.toLocaleString()}</div>
              <p className="detail-description">{instrument.description}</p>
            </div>
          </div>

          <div className="detail-right">
            <div className="report-card">
              <h3 className="report-title">
                <span className="report-icon">📊</span>
                成色鉴定报告
              </h3>
              
              <div className="report-score-section">
                <div className="score-main">
                  <CircleProgress score={report?.score || 0} size={140} />
                </div>
                <div className="score-info">
                  <div className="rating-row">
                    <span className="rating-label">成色评级</span>
                    <span className="rating-value" style={{ color: rating.color }}>
                      {rating.label}
                    </span>
                  </div>
                  <div className="grade-row">
                    <span className="grade-label">成色等级</span>
                    <span className="grade-tag" style={{ color: report?.gradeColor }}>
                      {report?.grade}
                    </span>
                  </div>
                  <div className="score-bar">
                    <div 
                      className="score-bar-fill" 
                      style={{ 
                        width: `${report?.score || 0}%`,
                        background: `linear-gradient(90deg, ${rating.color}, var(--classical-copper))`
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="report-summary">
                <span className="summary-icon">💡</span>
                {report?.summary}
              </div>

              {report && report.flaws.length > 0 && (
                <div className="flaws-section">
                  <h4 className="flaws-title">
                    <span className="flaws-icon">⚠️</span>
                    检测到的瑕疵
                    <span className="flaws-count">{report.flaws.length}</span>
                  </h4>
                  <ul className="flaws-list">
                    {report.flaws.map((flaw, idx) => (
                      <li key={idx} className="flaw-item">
                        <span className="flaw-index">{idx + 1}</span>
                        <span className="flaw-desc">{flaw.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="price-suggestion">
                <h4 className="price-title">
                  <span className="price-icon">💰</span>
                  推荐售价区间
                </h4>
                <div className="price-range">
                  ¥{priceRange?.min.toLocaleString()}
                  <span className="price-sep">—</span>
                  ¥{priceRange?.max.toLocaleString()}
                </div>
                <p className="price-note">基于品牌、型号、成色及平台历史数据估算</p>
              </div>

              <SimilarInstruments 
                brand={instrument.brand} 
                model={instrument.model}
                currentId={instrument.id}
              />

              <button 
                className={`favorite-btn ${isFavorite ? 'active' : ''}`}
                onClick={toggleFavorite}
              >
                <svg viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                {isFavorite ? '已收藏' : '收藏'}
              </button>
            </div>

            <div className="seller-card">
              <h3 className="seller-title">
                <span className="seller-icon">👤</span>
                卖家信息
              </h3>
              <div className="seller-info">
                <div className="seller-avatar">{instrument.sellerName.charAt(0)}</div>
                <div className="seller-details">
                  <div className="seller-name">{instrument.sellerName}</div>
                  <div className="seller-date">上架于 {instrument.createdAt}</div>
                </div>
              </div>
              
              {showContactSuccess ? (
                <div className="contact-success">✓ 消息已发送，卖家将尽快回复</div>
              ) : (
                <form className="contact-form" onSubmit={handleContactSubmit}>
                  <div className="form-group">
                    <label className="form-label">您的称呼</label>
                    <input
                      type="text"
                      className="form-input"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      placeholder="请输入您的称呼"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">联系电话</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                      placeholder="请输入联系电话"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">留言</label>
                    <textarea
                      className="form-input form-textarea"
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      placeholder="想了解更多信息..."
                      rows={3}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary contact-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    联系卖家
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
