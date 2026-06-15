import React, { useRef, useEffect, useState, useCallback } from 'react';
import { AuctionItem, User } from '../types';

interface BidCardProps {
  item: AuctionItem;
  isActive: boolean;
  users: User[];
  onManualBid: (itemId: string, amount: number) => void;
}

function WaveformChart({ bids, startingPrice }: { bids: { amount: number; valid: boolean }[]; startingPrice: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const prevSnapshotRef = useRef<{ x: number; y: number }[]>([]);
  const transitionStartRef = useRef(0);
  const transitionDuration = 300;
  const bidsRef = useRef(bids);
  bidsRef.current = bids;
  const startingPriceRef = useRef(startingPrice);
  startingPriceRef.current = startingPrice;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const currentBids = bidsRef.current;
    const currentStartingPrice = startingPriceRef.current;
    const validBids = currentBids.filter((b) => b.valid);
    if (validBids.length === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('等待出价...', w / 2, h / 2 + 4);
      return;
    }

    const amounts = validBids.map((b) => b.amount);
    const minAmt = Math.min(...amounts, currentStartingPrice) * 0.95;
    const maxAmt = Math.max(...amounts) * 1.05;
    const range = maxAmt - minAmt || 1;

    const stepX = validBids.length <= 1 ? w / 2 : w / (validBids.length - 1);

    const targetPoints = validBids.map((b, i) => ({
      x: validBids.length <= 1 ? w / 2 : stepX * i,
      y: h - ((b.amount - minAmt) / range) * (h - 18) - 9,
      ratio: (b.amount - minAmt) / range,
    }));

    const elapsed = Date.now() - transitionStartRef.current;
    const progress = Math.min(1, elapsed / transitionDuration);
    const ease = progress < 1 ? 1 - Math.pow(1 - progress, 3) : 1;

    const prev = prevSnapshotRef.current;
    const displayPoints = targetPoints.map((tp, i) => {
      const pp = prev[i];
      if (!pp) return { x: tp.x, y: tp.y, ratio: tp.ratio };
      return {
        x: pp.x + (tp.x - pp.x) * ease,
        y: pp.y + (tp.y - pp.y) * ease,
        ratio: tp.ratio,
      };
    });

    // --- Smooth horizontal gradient across the entire polyline (blue -> purple -> red) ---
    const lineGradient = ctx.createLinearGradient(0, 0, w, 0);
    lineGradient.addColorStop(0, '#3b82f6');
    lineGradient.addColorStop(0.35, '#6366f1');
    lineGradient.addColorStop(0.7, '#a855f7');
    lineGradient.addColorStop(1, '#ef4444');

    if (displayPoints.length === 1) {
      const p = displayPoints[0];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = lineGradient;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(239,68,68,0.35)';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      // Draw the single continuous path with shared gradient stroke
      ctx.beginPath();
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      displayPoints.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.strokeStyle = lineGradient;
      ctx.stroke();

      // Subtle area fill under the line
      const last = displayPoints[displayPoints.length - 1];
      const first = displayPoints[0];
      ctx.beginPath();
      ctx.moveTo(first.x, h - 4);
      displayPoints.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.lineTo(last.x, h - 4);
      ctx.closePath();
      const areaGradient = ctx.createLinearGradient(0, 0, 0, h);
      areaGradient.addColorStop(0, 'rgba(139,92,246,0.25)');
      areaGradient.addColorStop(1, 'rgba(139,92,246,0)');
      ctx.fillStyle = areaGradient;
      ctx.fill();

      // Points colored by individual price level
      displayPoints.forEach((p, i) => {
        const r = Math.round(59 + (239 - 59) * p.ratio);
        const g = Math.round(130 + (68 - 130) * p.ratio);
        const b = Math.round(246 + (68 - 246) * p.ratio);
        const isLast = i === displayPoints.length - 1;

        if (isLast) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${r},${g},${b},0.35)`;
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, isLast ? 4.5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fill();
      });
    }

    if (progress < 1) {
      rafRef.current = requestAnimationFrame(draw);
    } else {
      // Commit final positions as the new baseline for next transition
      prevSnapshotRef.current = targetPoints.map((tp) => ({ x: tp.x, y: tp.y }));
    }
  }, []);

  useEffect(() => {
    transitionStartRef.current = Date.now();
    // Don't overwrite prevSnapshot yet — draw() reads it and will update it when the anim finishes
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);

    const handleResize = () => {
      prevSnapshotRef.current = [];
      transitionStartRef.current = Date.now();
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [bids, draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: 80, borderRadius: 6, background: 'rgba(0,0,0,0.25)', display: 'block' }}
    />
  );
}

function AnimatedPrice({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    if (start === end) return;
    const duration = 500;
    const startTime = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round((start + (end - start) * eased) * 100) / 100);
      if (t < 1) animRef.current = requestAnimationFrame(step);
      else prevRef.current = end;
    };

    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [value]);

  return <span>${display.toFixed(2)}</span>;
}

export default function BidCard({ item, isActive, users, onManualBid }: BidCardProps) {
  const [imgError, setImgError] = useState(false);
  const bidder = item.currentHighestBidder === 'manual'
    ? { name: 'You', avatarColor: '#f59e0b', id: 'manual' }
    : users.find((u) => u.id === item.currentHighestBidder);

  const handleBid = () => {
    const amount = Math.round(item.currentHighestBid * 1.1 * 100) / 100;
    onManualBid(item.id, amount);
  };

  const statusLabel = () => {
    if (item.status === 'sold') return <div style={styles.soldStamp}>成交</div>;
    if (item.status === 'passed') return <div style={styles.passedStamp}>流拍</div>;
    return null;
  };

  const cardStyle: React.CSSProperties = {
    ...styles.card,
    ...(isActive ? styles.activeCard : {}),
    ...(item.status === 'pending' ? styles.pendingCard : {}),
    ...(item.status === 'sold' ? styles.soldCard : {}),
    ...(item.status === 'passed' ? styles.passedCard : {}),
  };

  const minutes = Math.floor(item.countdown / 60);
  const seconds = Math.floor(item.countdown % 60);
  const countdownStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div style={cardStyle} className={isActive ? 'glow-card' : ''}>
      <div style={styles.imageWrap}>
        {!imgError ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            style={styles.image}
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div style={styles.imagePlaceholder}>{item.name[0]}</div>
        )}
        {isActive && item.status === 'active' && (
          <div style={{
            ...styles.countdownBadge,
            color: item.countdown <= 10 ? '#ef4444' : '#fbbf24',
          }}>{countdownStr}</div>
        )}
        {statusLabel()}
      </div>

      <div style={styles.info}>
        <h3 style={styles.name}>{item.name}</h3>
        <p style={styles.desc}>{item.description}</p>

        <div style={styles.priceRow}>
          <span style={styles.priceLabel}>当前最高价</span>
          <span style={styles.priceValue}>
            <AnimatedPrice value={item.currentHighestBid} />
          </span>
        </div>

        {bidder && (
          <div style={styles.bidderRow}>
            <div style={{ ...styles.avatar, backgroundColor: bidder.avatarColor }}>
              {bidder.name[0]}
            </div>
            <span style={styles.bidderName}>{bidder.name}</span>
          </div>
        )}

        <WaveformChart bids={item.bidHistory} startingPrice={item.startingPrice} />

        {isActive && item.status === 'active' && (
          <button style={styles.bidBtn} onClick={handleBid} className="bid-btn">
            加价 (1.1x)
          </button>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    minWidth: 260,
    maxWidth: 300,
    borderRadius: 16,
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.12)',
    overflow: 'hidden',
    flexShrink: 0,
    transition: 'all 0.3s ease',
  },
  activeCard: {
    border: '2px solid #fbbf24',
    boxShadow: '0 0 20px rgba(251,191,36,0.4), 0 0 40px rgba(251,191,36,0.15)',
  },
  pendingCard: {
    opacity: 0.5,
    filter: 'grayscale(0.3)',
  },
  soldCard: {
    borderColor: '#22c55e',
    boxShadow: '0 0 12px rgba(34,197,94,0.3)',
  },
  passedCard: {
    borderColor: '#ef4444',
    boxShadow: '0 0 12px rgba(239,68,68,0.3)',
  },
  imageWrap: {
    position: 'relative',
    width: '100%',
    height: 160,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #374151, #1f2937)',
    color: '#9ca3af',
    fontSize: 48,
    fontWeight: 700,
  },
  countdownBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    background: 'rgba(0,0,0,0.7)',
    padding: '4px 10px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 700,
    fontFamily: 'monospace',
    border: '1px solid rgba(251,191,36,0.3)',
    transition: 'color 0.3s ease',
  },
  soldStamp: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%,-50%) rotate(-15deg)',
    background: 'rgba(34,197,94,0.85)',
    color: '#fff',
    padding: '8px 24px',
    borderRadius: 8,
    fontSize: 22,
    fontWeight: 900,
    letterSpacing: 4,
    animation: 'stampIn 0.5s cubic-bezier(0.34,1.56,0.64,1)',
    border: '3px solid #fff',
    zIndex: 10,
  },
  passedStamp: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%,-50%) rotate(-15deg)',
    background: 'rgba(239,68,68,0.85)',
    color: '#fff',
    padding: '8px 24px',
    borderRadius: 8,
    fontSize: 22,
    fontWeight: 900,
    letterSpacing: 4,
    animation: 'stampIn 0.5s cubic-bezier(0.34,1.56,0.64,1)',
    border: '3px solid #fff',
    zIndex: 10,
  },
  info: {
    padding: 14,
  },
  name: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 4,
  },
  desc: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 1.4,
  },
  priceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  priceLabel: {
    color: '#64748b',
    fontSize: 12,
  },
  priceValue: {
    color: '#fbbf24',
    fontSize: 18,
    fontWeight: 800,
    fontFamily: 'monospace',
  },
  bidderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
  },
  bidderName: {
    color: '#cbd5e1',
    fontSize: 13,
  },
  bidBtn: {
    width: '100%',
    padding: '10px 0',
    border: 'none',
    borderRadius: 10,
    background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'transform 0.15s ease, box-shadow 0.2s ease',
    marginTop: 10,
  },
};
