import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import api, { BeanDetail, Review, BeanSummary, FlavorProfile } from './api';

const RADAR_LABELS = ['酸度', '甜感', '醇厚度', '香气', '余韵', '平衡'];
const RADAR_KEYS: (keyof FlavorProfile)[] = [
  'acidity',
  'sweetness',
  'body',
  'aroma',
  'aftertaste',
  'balance',
];

const RadarChart = memo(function RadarChart({
  profile,
  size = 300,
}: {
  profile: FlavorProfile;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const center = size / 2;
    const radius = size / 2 - 40;
    const levels = 5;
    const sides = 6;
    const angleStep = (Math.PI * 2) / sides;
    const startAngle = -Math.PI / 2;

    ctx.clearRect(0, 0, size, size);

    for (let level = levels; level >= 1; level--) {
      const r = (radius * level) / levels;
      ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        const angle = startAngle + i * angleStep;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      const alpha = 0.05 + (levels - level) * 0.03;
      ctx.fillStyle = `rgba(111, 78, 55, ${alpha})`;
      ctx.fill();
      ctx.strokeStyle = 'rgba(111, 78, 55, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    for (let i = 0; i < sides; i++) {
      const angle = startAngle + i * angleStep;
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(x, y);
      ctx.strokeStyle = 'rgba(111, 78, 55, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const key = RADAR_KEYS[i];
      const value = Math.max(0, Math.min(5, profile[key] || 0));
      const r = (radius * value) / 5;
      const angle = startAngle + i * angleStep;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(111, 78, 55, 0.35)';
    ctx.fill();
    ctx.strokeStyle = '#6f4e37';
    ctx.lineWidth = 2;
    ctx.stroke();

    for (let i = 0; i < sides; i++) {
      const key = RADAR_KEYS[i];
      const value = Math.max(0, Math.min(5, profile[key] || 0));
      const r = (radius * value) / 5;
      const angle = startAngle + i * angleStep;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#6f4e37';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    for (let i = 0; i < sides; i++) {
      const angle = startAngle + i * angleStep;
      const labelRadius = radius + 22;
      const x = center + labelRadius * Math.cos(angle);
      const y = center + labelRadius * Math.sin(angle);
      ctx.fillStyle = '#4a3520';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(RADAR_LABELS[i], x, y);
    }
  }, [profile, size]);

  return (
    <canvas
      ref={canvasRef}
      className="radar-chart"
      style={{ width: size, height: size }}
    />
  );
});

const StarsDisplay = memo(function StarsDisplay({
  value,
  size = 16,
}: {
  value: number;
  size?: number;
}) {
  const stars = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 5; i++) {
      let cls = 'star';
      if (i < Math.floor(value)) {
        cls += ' filled';
      } else if (i < value) {
        cls += ' half';
      }
      arr.push(
        <span
          key={i}
          className={cls}
          style={{ fontSize: `${size}px`, lineHeight: 1 }}
        >
          ★
        </span>
      );
    }
    return arr;
  }, [value, size]);

  return <span className="stars">{stars}</span>;
});

const StarRatingInput = memo(function StarRatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hoverValue, setHoverValue] = useState(0);
  const [animatingIndex, setAnimatingIndex] = useState<number | null>(null);

  const handleClick = useCallback(
    (i: number) => {
      const newValue = i + 1;
      onChange(newValue);
      setAnimatingIndex(i);
      setTimeout(() => setAnimatingIndex(null), 350);
    },
    [onChange]
  );

  const displayValue = hoverValue || value;

  return (
    <div className="stars clickable">
      {[0, 1, 2, 3, 4].map((i) => {
        const filled = i < displayValue;
        const classes = ['star'];
        if (filled) classes.push('filled');
        if (animatingIndex === i) classes.push('animating');
        return (
          <span
            key={i}
            className={classes.join(' ')}
            onMouseEnter={() => setHoverValue(i + 1)}
            onMouseLeave={() => setHoverValue(0)}
            onClick={() => handleClick(i)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleClick(i)}
          >
            ★
          </span>
        );
      })}
    </div>
  );
});

const ReviewItem = memo(function ReviewItem({ review }: { review: Review }) {
  return (
    <div className="review-item">
      <div className="review-item-header">
        <span className="review-user">{review.user}</span>
        <span className="review-date">{review.date}</span>
      </div>
      <StarsDisplay value={review.rating} size={14} />
      {review.comment && <p className="review-comment">{review.comment}</p>}
    </div>
  );
});

const TemperatureBar = memo(function TemperatureBar({
  min,
  max,
}: {
  min: number;
  max: number;
}) {
  const overallMin = 80;
  const overallMax = 100;
  const leftPercent = useMemo(
    () => ((min - overallMin) / (overallMax - overallMin)) * 100,
    [min]
  );
  const widthPercent = useMemo(
    () => ((max - min) / (overallMax - overallMin)) * 100,
    [min, max]
  );

  return (
    <div>
      <div
        className="progress-track"
        style={{ position: 'relative', marginTop: 4 }}
      >
        <div
          className="progress-fill"
          style={{
            position: 'absolute',
            left: `${leftPercent}%`,
            width: `${widthPercent}%`,
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          color: '#8b7355',
          marginTop: 6,
        }}
      >
        <span>{overallMin}°C</span>
        <span>{overallMax}°C</span>
      </div>
    </div>
  );
});

const Toast = memo(function Toast({
  message,
  visible,
}: {
  message: string;
  visible: boolean;
}) {
  return <div className={`toast${visible ? ' show' : ''}`}>{message}</div>;
});

interface DetailPageProps {
  beanSummary: BeanSummary | null;
  onBack: () => void;
}

function DetailPage({ beanSummary, onBack }: DetailPageProps) {
  const [bean, setBean] = useState<BeanDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [toastVisible, setToastVisible] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
  }, []);

  useEffect(() => {
    if (!beanSummary) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.getBeanDetail(beanSummary.id);
        if (!cancelled) {
          setBean(res.data || null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || '加载详情失败');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [beanSummary]);

  const remainingChars = useMemo(() => 140 - comment.length, [comment]);

  const canSubmit = useMemo(
    () => rating >= 1 && !submitting,
    [rating, submitting]
  );

  const handleCommentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      if (value.length <= 140) {
        setComment(value);
      } else {
        setComment(value.slice(0, 140));
      }
    },
    []
  );

  const handleSubmitReview = useCallback(async () => {
    if (!canSubmit || !bean) return;
    setSubmitting(true);
    try {
      const res = await api.submitTasteFeedback({
        beanId: bean.id,
        rating,
        comment: comment.trim() || undefined,
      });
      if (res.data?.success) {
        const newReview: Review = {
          user: '我',
          rating,
          comment: comment.trim(),
          date: new Date().toISOString().split('T')[0],
        };
        setBean((prev) => {
          if (!prev) return prev;
          const updatedReviews = [newReview, ...prev.reviews];
          const totalRating = updatedReviews.reduce(
            (sum, r) => sum + r.rating,
            0
          );
          const newAvg = Number((totalRating / updatedReviews.length).toFixed(1));
          return {
            ...prev,
            reviews: updatedReviews,
            reviewCount: updatedReviews.length,
            avgRating: res.data?.newAvgRating ?? newAvg,
          };
        });
        setRating(0);
        setComment('');
        showToast('感谢分享');
      }
    } catch (err: any) {
      showToast(err.message || '提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  }, [bean, rating, comment, canSubmit, showToast]);

  if (!beanSummary) {
    return (
      <div className="empty-state">
        <div className="empty-icon">☕️</div>
        <div className="empty-title">未选择咖啡豆</div>
        <button className="btn-primary" style={{ maxWidth: 240 }} onClick={onBack}>
          返回推荐
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        <div className="loading-text">正在加载咖啡豆详情...</div>
      </div>
    );
  }

  if (error || !bean) {
    return (
      <div className="empty-state">
        <div className="empty-icon">⚠️</div>
        <div className="empty-title">{error || '加载失败'}</div>
        <button className="btn-primary" style={{ maxWidth: 240 }} onClick={onBack}>
          返回推荐
        </button>
      </div>
    );
  }

  return (
    <>
      <button className="btn-back" onClick={onBack}>
        ← 返回推荐列表
      </button>

      <div className="detail-header">
        <div className="detail-title-block">
          <h1 className="detail-name">{bean.name}</h1>
          <div className="detail-origin">{bean.origin}</div>
          <div className="detail-meta">
            <div className="detail-price">
              ¥{bean.price}
              <span className="detail-price-unit"> /100g</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <StarsDisplay value={bean.avgRating} size={16} />
              <span style={{ fontSize: 14, color: '#8b7355' }}>
                {bean.avgRating.toFixed(1)} · {bean.reviewCount} 条评价
              </span>
            </div>
          </div>
        </div>
        <div className="detail-rating-block">
          <div className="detail-rating-score">{bean.avgRating.toFixed(1)}</div>
          <StarsDisplay value={bean.avgRating} size={14} />
          <div className="detail-rating-count">{bean.reviewCount} 人评分</div>
        </div>
      </div>

      <img
        src={bean.image}
        alt={bean.name}
        className="bean-hero-image"
        loading="lazy"
      />

      <div className="detail-layout">
        <div className="panel">
          <div className="panel-title">风味雷达</div>
          <RadarChart profile={bean.flavorProfile} size={300} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 16 }}>
            {bean.flavors.map((tag) => (
              <span key={tag} className="bean-tag">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">冲煮参数建议</div>
          <div className="brew-params">
            <div className="brew-param-item">
              <div className="brew-param-label">水温</div>
              <div className="brew-param-value">
                {bean.brewParams.temperature.min}
                {'–'}
                {bean.brewParams.temperature.max}°C
              </div>
              <TemperatureBar
                min={bean.brewParams.temperature.min}
                max={bean.brewParams.temperature.max}
              />
              <div className="brew-param-note">
                浅烘豆子可稍低水温，深烘豆子建议更高水温萃取
              </div>
            </div>

            <div className="brew-param-item">
              <div className="brew-param-label">研磨度</div>
              <div className="brew-param-value">{bean.brewParams.grindSize}</div>
              <div className="brew-param-note">
                {bean.brewParams.grindSize === '细' &&
                  '类似细砂糖颗粒，适合意式浓缩'}
                {bean.brewParams.grindSize === '中' &&
                  '类似粗砂糖颗粒，适合大部分手冲'}
                {bean.brewParams.grindSize === '中粗' &&
                  '类似海盐颗粒，适合手冲和法压'}
                {bean.brewParams.grindSize === '粗' &&
                  '类似粗盐颗粒，适合法压壶长时间浸泡'}
              </div>
            </div>

            <div className="brew-param-item">
              <div className="brew-param-label">萃取时间</div>
              <div className="brew-param-value">
                {bean.brewParams.time.min} – {bean.brewParams.time.max}
              </div>
              <div className="brew-param-note">
                根据个人口味浓淡偏好适当调整 ±15 秒
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="reviews-section">
        <div className="panel-title">分享你的品鉴感受</div>
        <div className="review-form">
          <div className="review-stars-label">你的评分</div>
          <div style={{ marginBottom: 16 }}>
            <StarRatingInput value={rating} onChange={setRating} />
          </div>
          <div className="review-stars-label">短评（可选）</div>
          <textarea
            className="review-textarea"
            placeholder="这款豆子给你带来了怎样的风味体验？"
            value={comment}
            onChange={handleCommentChange}
            maxLength={140}
          />
          <div className="review-footer">
            <span
              className={`review-char-count${
                remainingChars < 20 ? ' warning' : ''
              }`}
            >
              剩余 {remainingChars} / 140 字
            </span>
            <button
              className="review-submit-btn"
              onClick={handleSubmitReview}
              disabled={!canSubmit}
            >
              {submitting ? '提交中...' : '提交评价'}
            </button>
          </div>
        </div>

        <div className="panel-title" style={{ marginBottom: 16 }}>
          全部评价 ({bean.reviews.length})
        </div>
        {bean.reviews.length > 0 ? (
          <div className="review-list">
            {bean.reviews.map((review, idx) => (
              <ReviewItem key={`${review.user}-${idx}`} review={review} />
            ))}
          </div>
        ) : (
          <div className="reviews-empty">暂无评价，成为第一位分享的人吧！</div>
        )}
      </div>

      <Toast message={toastMessage} visible={toastVisible} />
    </>
  );
}

export default memo(DetailPage);
