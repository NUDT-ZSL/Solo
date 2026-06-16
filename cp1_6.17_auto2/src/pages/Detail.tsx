import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

function getConditionClass(condition: string): string {
  switch (condition) {
    case '全新': return 'condition-new';
    case '几乎全新': return 'condition-like-new';
    case '有明显使用痕迹': return 'condition-used';
    case '有瑕疵': return 'condition-damaged';
    default: return 'condition-used';
  }
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

function ImageCarousel({ images, flaws }: { images: string[]; flaws: Instrument['flaws'] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

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
      className="image-carousel"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="carousel-main">
        <img 
          src={images[currentIndex]} 
          alt="乐器图片" 
          className="carousel-image"
        />
        {currentFlaws.map((flaw, idx) => (
          <div
            key={idx}
            className="flaw-marker"
            style={{
              left: `${flaw.x * 100}%`,
              top: `${flaw.y * 100}%`,
              width: `${flaw.w * 100}%`,
              height: `${flaw.h * 100}%`
            }}
            title={flaw.description}
          >
            <span className="flaw-tooltip">{flaw.description}</span>
          </div>
        ))}
        
        {images.length > 1 && (
          <>
            <button className="carousel-btn prev-btn" onClick={prevSlide}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
              </svg>
            </button>
            <button className="carousel-btn next-btn" onClick={nextSlide}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
              </svg>
            </button>
          </>
        )}
      </div>
      
      {images.length > 1 && (
        <div className="carousel-thumbnails">
          {images.map((img, idx) => (
            <button
              key={idx}
              className={`thumbnail ${idx === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(idx)}
            >
              <img src={img} alt={`缩略图 ${idx + 1}`} />
            </button>
          ))}
        </div>
      )}
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
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          返回
        </button>

        <div className="detail-layout">
          <div className="detail-left">
            <ImageCarousel images={instrument.images} flaws={instrument.flaws} />
            
            <div className="detail-info-card">
              <h1 className="detail-title">{instrument.name}</h1>
              <div className="detail-meta">
                <span className={`condition-tag ${getConditionClass(instrument.condition)}`}>
                  {instrument.condition}
                </span>
                <span className="detail-brand">{instrument.brand}</span>
                <span className="detail-model">{instrument.model}</span>
              </div>
              <div className="detail-price">¥{instrument.price.toLocaleString()}</div>
              <p className="detail-description">{instrument.description}</p>
            </div>
          </div>

          <div className="detail-right">
            <div className="report-card">
              <h3 className="report-title">成色鉴定报告</h3>
              
              <div className="report-score-section">
                <CircleProgress score={report?.score || 0} />
                <div className="score-label-large">
                  <span className="grade-text" style={{ color: report?.gradeColor }}>
                    {report?.grade}
                  </span>
                </div>
              </div>

              <div className="report-summary">
                {report?.summary}
              </div>

              {report && report.flaws.length > 0 && (
                <div className="flaws-section">
                  <h4 className="flaws-title">检测到的瑕疵</h4>
                  <ul className="flaws-list">
                    {report.flaws.map((flaw, idx) => (
                      <li key={idx} className="flaw-item">
                        <span className="flaw-dot"></span>
                        {flaw.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="price-suggestion">
                <h4 className="price-title">推荐售价区间</h4>
                <div className="price-range">
                  ¥{priceRange?.min.toLocaleString()} - ¥{priceRange?.max.toLocaleString()}
                </div>
                <p className="price-note">基于品牌、型号、成色及平台历史数据估算</p>
              </div>

              <button 
                className={`favorite-btn ${isFavorite ? 'active' : ''}`}
                onClick={toggleFavorite}
              >
                <svg viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                {isFavorite ? '已收藏' : '收藏'}
              </button>
            </div>

            <div className="seller-card">
              <h3 className="seller-title">卖家信息</h3>
              <div className="seller-info">
                <div className="seller-avatar">{instrument.sellerName.charAt(0)}</div>
                <div>
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
