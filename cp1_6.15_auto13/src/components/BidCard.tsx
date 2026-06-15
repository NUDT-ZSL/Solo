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
  const animRef = useRef<number>(0);
  const prevLengthRef = useRef(0);
  const transitionStartRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    const validBids = bids.filter((b) => b.valid);
    if (validBids.length < 2) {
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.font = '11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('等待出价...', w / 2, h / 2 + 4);
      return;
    }

    const amounts = validBids.map((b) => b.amount);
    const minAmt = Math.min(...amounts, startingPrice) * 0.95;
    const maxAmt = Math.max(...amounts) * 1.05;
    const range = maxAmt - minAmt || 1;

    const elapsed = Date.now() - transitionStartRef.current;
    const progress = Math.min(1, elapsed / 300);
    const ease = 1 - Math.pow(1 - progress, 3);

    const lastIdx = validBids.length - 1;
    const drawCount = prevLengthRef.current > 0 && lastIdx >= prevLengthRef.current
      ? prevLengthRef.current + Math.ceil((lastIdx - prevLengthRef.current) * ease) + 1
      : validBids.length;

    const stepX = w / (validBids.length + 1);

    ctx.beginPath();
    ctx.lineWidth = 2;

    for (let i = 0; i < Math.min(drawCount, validBids.length); i++) {
      const x = stepX * (i + 1);
      const y = h - ((validBids[i].amount - minAmt) / range) * (h - 10) - 5;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, '#3b82f6');
    gradient.addColorStop(0.5, '#8b5cf6');
    gradient.addColorStop(1, '#ef4444');
    ctx.strokeStyle = gradient;
    ctx.stroke();

    for (let i = 0; i < Math.min(drawCount, validBids.length); i++) {
      const x = stepX * (i + 1);
      const y = h - ((validBids[i].amount - minAmt) / range) * (h - 10) - 5;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = i === validBids.length - 1 ? '#ef4444' : '#60a5fa';
      ctx.fill();
    }

    if (progress < 1) {
      animRef.current = requestAnimationFrame(draw);
    }
  }, [bids, startingPrice]);

  useEffect(() => {
    const validCount = bids.filter((b) => b.valid).length;
    if (validCount !== prevLengthRef.current) {
      transitionStartRef.current = Date.now();
      prevLengthRef.current = validCount;
    }
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [bids, draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: 80, borderRadius: 6, background: 'rgba(0,0,0,0.25)' }}
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
  const bidder = users.find((u) => u.id === item.currentHighestBidder);

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
          <div style={styles.countdownBadge}>{countdownStr}</div>
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
    color: '#fbbf24',
    padding: '4px 10px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 700,
    fontFamily: 'monospace',
    border: '1px solid rgba(251,191,36,0.3)',
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
    animation: 'stampIn 0.5s ease',
    border: '3px solid #fff',
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
    animation: 'stampIn 0.5s ease',
    border: '3px solid #fff',
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
  },
};
