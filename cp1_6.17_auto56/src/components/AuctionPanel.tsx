import { useState, useEffect, useRef } from 'react';
import { Artwork } from '../db/Database';
import auctionEngine from '../db/AuctionEngine';
import db from '../db/Database';
import './AuctionPanel.css';

interface AuctionPanelProps {
  artwork: Artwork | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currentUserId: string;
}

export function AuctionPanel({ artwork, isOpen, onClose, onSuccess, currentUserId }: AuctionPanelProps) {
  const [bidAmount, setBidAmount] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen && artwork) {
      const minBid = artwork.currentBid + 10;
      setBidAmount(minBid.toString());
      setError('');
      setIsSubmitting(false);
      updateTimeLeft();
      
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 300);
    }
  }, [isOpen, artwork]);

  useEffect(() => {
    if (isOpen && artwork) {
      timerRef.current = window.setInterval(updateTimeLeft, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isOpen, artwork]);

  const updateTimeLeft = () => {
    if (!artwork) return;
    
    const time = auctionEngine.getTimeRemaining(artwork.id);
    if (time.ended) {
      setTimeLeft('竞拍已结束');
      return;
    }

    const parts = [];
    if (time.days > 0) parts.push(`${time.days}天`);
    if (time.hours > 0 || time.days > 0) parts.push(`${time.hours}时`);
    if (time.minutes > 0 || time.hours > 0 || time.days > 0) parts.push(`${time.minutes}分`);
    parts.push(`${time.seconds}秒`);
    
    setTimeLeft(parts.join(' '));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!artwork) return;

    const amount = parseFloat(bidAmount);
    
    if (isNaN(amount) || amount <= 0) {
      setError('请输入有效的出价金额');
      return;
    }

    if (amount <= artwork.currentBid) {
      setError(`出价必须高于当前最高价 ¥${artwork.currentBid}`);
      return;
    }

    setIsSubmitting(true);
    setError('');

    setTimeout(() => {
      const result = auctionEngine.placeBid(artwork.id, currentUserId, amount);
      
      setIsSubmitting(false);
      
      if (result.success) {
        onSuccess?.();
        onClose();
      } else {
        setError(result.message);
      }
    }, 150);
  };

  const handleQuickBid = (increment: number) => {
    if (!artwork) return;
    const newBid = artwork.currentBid + increment;
    setBidAmount(newBid.toString());
    setError('');
  };

  const bidder = artwork?.bidderId ? db.getUser(artwork.bidderId) : null;

  if (!isOpen || !artwork) return null;

  return (
    <div className="auction-overlay" onClick={onClose}>
      <div className="auction-panel" onClick={(e) => e.stopPropagation()}>
        <button className="auction-panel__close" onClick={onClose} aria-label="关闭">
          ×
        </button>

        <div className="auction-panel__artwork">
          <div
            className="auction-panel__artwork-image"
            style={{ backgroundColor: artwork.color }}
          >
            <span className="auction-panel__artwork-title">{artwork.title}</span>
          </div>
        </div>

        <div className="auction-panel__info">
          <h2 className="auction-panel__title">{artwork.title}</h2>
          
          <div className="auction-panel__timer">
            <span className="auction-panel__timer-label">剩余时间</span>
            <span className="auction-panel__timer-value">{timeLeft}</span>
          </div>

          <div className="auction-panel__bids">
            <div className="auction-panel__bid-row">
              <span className="auction-panel__bid-label">起拍价</span>
              <span className="auction-panel__bid-value">¥{artwork.startingPrice}</span>
            </div>
            <div className="auction-panel__bid-row auction-panel__bid-row--current">
              <span className="auction-panel__bid-label">当前最高价</span>
              <span className="auction-panel__bid-value auction-panel__bid-value--highlight">
                ¥{artwork.currentBid}
              </span>
            </div>
            {bidder && (
              <div className="auction-panel__bid-row">
                <span className="auction-panel__bid-label">当前领先</span>
                <span className="auction-panel__bidder">
                  <span
                    className="auction-panel__bidder-avatar"
                    style={{ backgroundColor: bidder.avatar }}
                  >
                    {bidder.name.charAt(0)}
                  </span>
                  {bidder.name}
                </span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="auction-panel__input-group">
              <label className="auction-panel__input-label">您的出价</label>
              <div className="auction-panel__input-wrapper">
                <span className="auction-panel__currency">¥</span>
                <input
                  ref={inputRef}
                  type="number"
                  value={bidAmount}
                  onChange={(e) => {
                    setBidAmount(e.target.value);
                    setError('');
                  }}
                  className={`auction-panel__input ${error ? 'has-error' : ''}`}
                  min={artwork.currentBid + 1}
                  step="10"
                />
              </div>
              {error && <span className="auction-panel__error">{error}</span>}
            </div>

            <div className="auction-panel__quick-bids">
              <button
                type="button"
                className="auction-panel__quick-btn"
                onClick={() => handleQuickBid(50)}
              >
                +50
              </button>
              <button
                type="button"
                className="auction-panel__quick-btn"
                onClick={() => handleQuickBid(100)}
              >
                +100
              </button>
              <button
                type="button"
                className="auction-panel__quick-btn"
                onClick={() => handleQuickBid(500)}
              >
                +500
              </button>
              <button
                type="button"
                className="auction-panel__quick-btn"
                onClick={() => handleQuickBid(1000)}
              >
                +1000
              </button>
            </div>

            <button
              type="submit"
              className="auction-panel__submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? '提交中...' : '确认出价'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AuctionPanel;
