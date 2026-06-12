import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import type { Coupon, FilterStatus } from '../types';

interface CouponListProps {
  coupons: Coupon[];
  loading: boolean;
  searchQuery: string;
  filterStatus: FilterStatus;
  onSearchChange: (q: string) => void;
  onFilterChange: (s: FilterStatus) => void;
  onSelectCoupon: (id: string) => void;
  onClaim: (id: string) => void;
}

const CARD_HEIGHT = 240;
const CARD_GAP = 20;
const BUFFER_ROWS = 2;

function getGridColumns(width: number): number {
  if (width <= 600) return 1;
  if (width <= 900) return 2;
  return 3;
}

function formatDateRange(start: string, end: string): string {
  return `${start} 至 ${end}`;
}

function getStatusText(status: string, todayRemaining: number): string {
  if (status === 'expired') return '已过期';
  if (status === 'sold_out') return '已用罄';
  if (todayRemaining <= 0) return '今日已领完';
  return '进行中';
}

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-line amount" />
      <div className="skeleton-line medium" />
      <div className="skeleton-line short" />
      <div className="skeleton-line" />
      <div className="skeleton-line medium" />
    </div>
  );
}

function CouponCardItem({
  coupon,
  onSelect,
  onClaim,
  claimed,
  onClaimed,
}: {
  coupon: Coupon;
  onSelect: () => void;
  onClaim: (id: string) => void;
  claimed: boolean;
  onClaimed: () => void;
}) {
  const isExpired = coupon.status === 'expired';
  const isSoldOut = coupon.status === 'sold_out';
  const todayLimitReached = coupon.today_remaining <= 0 && !isExpired && !isSoldOut;
  const statusText = getStatusText(coupon.status, coupon.today_remaining);

  const handleClaimClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (claimed || isExpired || isSoldOut || todayLimitReached) return;
    onClaimed();
    onClaim(coupon.id);
  };

  const statusClass =
    isExpired ? 'expired' :
    isSoldOut ? 'sold-out' :
    todayLimitReached ? 'today-limit' :
    'active';

  return (
    <div
      className={`coupon-card ${isExpired ? 'expired' : ''}`}
      onClick={() => !isExpired && onSelect()}
    >
      <div className="coupon-header">
        <div className="coupon-amount">
          <small>¥</small>{coupon.amount}
        </div>
        <span className={`status-tag ${statusClass}`}>{statusText}</span>
      </div>
      <div className="coupon-name">{coupon.name}</div>
      <div className="coupon-threshold">满 ¥{coupon.threshold} 可用</div>
      <div className="coupon-dates">
        有效期：{formatDateRange(coupon.start_date, coupon.end_date)}
      </div>
      <div className="coupon-footer">
        <div className="coupon-remaining">
          今日剩余 {coupon.today_remaining} / {coupon.daily_limit} 张
        </div>
        <button
          className="claim-btn"
          disabled={claimed || isExpired || isSoldOut || todayLimitReached}
          onClick={handleClaimClick}
        >
          {claimed ? '已领取' : todayLimitReached ? '今日已领完' : isExpired ? '已过期' : isSoldOut ? '已用罄' : '立即领取'}
        </button>
      </div>
    </div>
  );
}

export default function CouponList({
  coupons,
  loading,
  searchQuery,
  filterStatus,
  onSearchChange,
  onFilterChange,
  onSelectCoupon,
  onClaim,
}: CouponListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());

  const columns = useMemo(() => getGridColumns(containerWidth), [containerWidth]);
  const rowHeight = CARD_HEIGHT + CARD_GAP;
  const totalRows = Math.ceil(coupons.length / columns);
  const totalHeight = totalRows * rowHeight - CARD_GAP;

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current.parentElement || containerRef.current;
    const update = () => {
      const w = containerRef.current?.clientWidth || 1200;
      setContainerWidth(w);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const handleClaimed = useCallback((id: string) => {
    setClaimedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - BUFFER_ROWS);
  const visibleRows = Math.ceil((containerRef.current?.clientHeight || 600) / rowHeight) + BUFFER_ROWS * 2;
  const endRow = Math.min(totalRows, startRow + visibleRows);

  const visibleCoupons: { coupon: Coupon; index: number; row: number; col: number }[] = [];
  for (let r = startRow; r < endRow; r++) {
    for (let c = 0; c < columns; c++) {
      const idx = r * columns + c;
      if (idx < coupons.length) {
        visibleCoupons.push({ coupon: coupons[idx], index: idx, row: r, col: c });
      }
    }
  }

  const skeletonCount = loading ? 6 : 0;

  return (
    <div>
      <div className="search-filter-bar">
        <div className="search-input-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="搜索优惠券名称"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={filterStatus}
          onChange={e => onFilterChange(e.target.value as FilterStatus)}
        >
          <option value="all">全部</option>
          <option value="active">进行中</option>
          <option value="expired">已过期</option>
          <option value="sold_out">已用罄</option>
        </select>
      </div>

      {loading ? (
        <div className="coupon-grid">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : coupons.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/>
            <path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/>
            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
          </svg>
          <h3>暂无优惠券</h3>
          <p>试试调整搜索条件或筛选状态</p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="virtual-list-container"
          onScroll={handleScroll}
          style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}
        >
          <div className="virtual-list-padding" style={{ height: totalHeight, position: 'relative' }}>
            {visibleCoupons.map(({ coupon, row, col }) => {
              const cardWidth = columns === 1 ? '100%' : `calc((100% - ${(columns - 1) * CARD_GAP}px) / ${columns})`;
              const left = columns === 1 ? 0 : col * (`calc((100% - ${(columns - 1) * CARD_GAP}px) / ${columns})`);
              return (
                <div
                  key={coupon.id}
                  style={{
                    position: 'absolute',
                    top: row * rowHeight,
                    left: typeof left === 'number' ? `${left}px` : left,
                    width: cardWidth,
                    height: CARD_HEIGHT,
                  }}
                >
                  <CouponCardItem
                    coupon={coupon}
                    onSelect={() => onSelectCoupon(coupon.id)}
                    onClaim={onClaim}
                    claimed={claimedIds.has(coupon.id)}
                    onClaimed={() => handleClaimed(coupon.id)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
