import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { VariableSizeGrid as Grid } from 'react-window';
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

const CARD_GAP = 20;
const BASE_CARD_HEIGHT = 240;
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

function estimateCardHeight(coupon: Coupon): number {
  const base = 200;
  const nameLines = Math.ceil(coupon.name.length / 18);
  return base + Math.max(0, (nameLines - 1) * 24);
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
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
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
      <div className="coupon-footer" style={{ marginTop: 'auto' }}>
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
  const gridRef = useRef<any>(null);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [containerHeight, setContainerHeight] = useState(600);
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());

  const columns = useMemo(() => getGridColumns(containerWidth), [containerWidth]);
  const totalRows = Math.ceil(coupons.length / columns);

  const rowHeights = useMemo(() => {
    const heights: number[] = [];
    for (let r = 0; r < totalRows; r++) {
      let maxH = BASE_CARD_HEIGHT;
      for (let c = 0; c < columns; c++) {
        const idx = r * columns + c;
        if (idx < coupons.length) {
          maxH = Math.max(maxH, estimateCardHeight(coupons[idx]));
        }
      }
      heights.push(maxH + CARD_GAP);
    }
    return heights;
  }, [coupons, columns, totalRows]);

  const columnWidths = useMemo(() => {
    const widths: number[] = [];
    for (let c = 0; c < columns; c++) {
      widths.push((containerWidth - (columns - 1) * CARD_GAP) / columns);
    }
    return widths;
  }, [containerWidth, columns]);

  const getRowHeight = useCallback((index: number) => rowHeights[index] || BASE_CARD_HEIGHT + CARD_GAP, [rowHeights]);
  const getColumnWidth = useCallback((index: number) => columnWidths[index] || 300, [columnWidths]);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        const h = Math.min(window.innerHeight - 240, 800);
        setContainerWidth(w);
        setContainerHeight(h);
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(containerRef.current);
    window.addEventListener('resize', updateSize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.resetAfterIndices({ columnIndex: 0, rowIndex: 0 });
    }
  }, [rowHeights, columnWidths]);

  const handleClaimed = useCallback((id: string) => {
    setClaimedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const Cell = ({ columnIndex, rowIndex, style }: { columnIndex: number; rowIndex: number; style: React.CSSProperties }) => {
    const idx = rowIndex * columns + columnIndex;
    if (idx >= coupons.length) return null;
    const coupon = coupons[idx];

    const adjustedStyle = {
      ...style,
      left: typeof style.left === 'number' ? style.left + columnIndex * CARD_GAP : style.left,
      top: typeof style.top === 'number' ? style.top + rowIndex * CARD_GAP : style.top,
      width: typeof style.width === 'number' ? style.width : style.width,
      height: typeof style.height === 'number' ? style.height - CARD_GAP : style.height,
    };

    return (
      <div style={adjustedStyle}>
        <CouponCardItem
          coupon={coupon}
          onSelect={() => onSelectCoupon(coupon.id)}
          onClaim={onClaim}
          claimed={claimedIds.has(coupon.id)}
          onClaimed={() => handleClaimed(coupon.id)}
        />
      </div>
    );
  };

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
          style={{
            width: '100%',
            maxHeight: 'calc(100vh - 220px)',
            minHeight: 400,
          }}
        >
          <Grid
            ref={gridRef}
            columnCount={columns}
            rowCount={totalRows}
            columnWidth={getColumnWidth}
            rowHeight={getRowHeight}
            width={containerWidth}
            height={containerHeight}
            overscanRowCount={BUFFER_ROWS}
            itemKey={({ rowIndex, columnIndex }) => {
              const idx = rowIndex * columns + columnIndex;
              return coupons[idx]?.id || `empty-${rowIndex}-${columnIndex}`;
            }}
          >
            {Cell}
          </Grid>
        </div>
      )}
    </div>
  );
}
