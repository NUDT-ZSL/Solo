import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import './Home.css';

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
}

function getConditionClass(condition: string): string {
  switch (condition) {
    case '全新':
      return 'condition-new';
    case '几乎全新':
      return 'condition-like-new';
    case '有明显使用痕迹':
      return 'condition-used';
    case '有瑕疵':
      return 'condition-damaged';
    default:
      return 'condition-used';
  }
}

function InstrumentCard({ instrument, index }: { instrument: Instrument; index: number }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <Link
      to={`/instrument/${instrument.id}`}
      className="instrument-card-wrapper"
      style={{
        animationDelay: `${index * 0.05}s`
      }}
    >
      <div
        ref={cardRef}
        className={`instrument-card ${isVisible ? 'visible' : ''}`}
      >
        <div className="card-image-container">
          {!isLoaded && <div className="image-placeholder" />}
          <img
            src={instrument.images[0]}
            alt={instrument.name}
            className={`card-image ${isLoaded ? 'loaded' : ''}`}
            onLoad={() => setIsLoaded(true)}
            loading="lazy"
          />
          <div className="card-overlay">
            <span className="view-detail">查看详情</span>
          </div>
          <span className={`condition-tag ${getConditionClass(instrument.condition)}`}>
            {instrument.condition}
          </span>
        </div>
        <div className="card-content">
          <h3 className="card-title">{instrument.name}</h3>
          <p className="card-brand">{instrument.brand} · {instrument.model}</p>
          <div className="card-footer">
            <span className="card-price">¥{instrument.price.toLocaleString()}</span>
            <span className="card-seller">{instrument.sellerName}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const { data: instruments, isLoading, error } = useQuery<Instrument[]>({
    queryKey: ['instruments'],
    queryFn: async () => {
      const res = await fetch('/api/instruments');
      if (!res.ok) throw new Error('Failed to fetch instruments');
      return res.json();
    }
  });

  if (isLoading) {
    return (
      <div className="home-page">
        <div className="container">
          <div className="loading">
            <div className="loading-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home-page">
        <div className="container">
          <div className="error-message">加载失败，请稍后重试</div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="hero-section">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">
              <span className="hero-highlight">琴韵</span>
              <br />
              二手乐器交易平台
            </h1>
            <p className="hero-subtitle">
              专业成色鉴定 · 诚信交易保障 · 让每一件乐器找到新的主人
            </p>
            <div className="hero-actions">
              <Link to="/upload" className="btn btn-primary hero-btn">
                上传鉴定
              </Link>
              <Link to="#browse" className="btn btn-outline hero-btn">
                浏览乐器
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container" id="browse">
        <h2 className="section-title">精选乐器</h2>
        
        <div className="instrument-grid">
          {instruments?.map((instrument, index) => (
            <InstrumentCard
              key={instrument.id}
              instrument={instrument}
              index={index}
            />
          ))}
        </div>
      </div>

      <div className="features-section">
        <div className="container">
          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-icon">🔍</div>
              <h3 className="feature-title">AI成色鉴定</h3>
              <p className="feature-desc">智能图像分析，专业评估每一件乐器的成色状态</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🛡️</div>
              <h3 className="feature-title">诚信保障</h3>
              <p className="feature-desc">实名认证 + 平台担保，交易更安心</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🎵</div>
              <h3 className="feature-title">专业服务</h3>
              <p className="feature-desc">资深乐器鉴定师，提供专业咨询与评估服务</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
