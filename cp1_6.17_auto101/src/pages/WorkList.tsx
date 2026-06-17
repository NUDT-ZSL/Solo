import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, WorkItem } from '../api';
import BuyModal from '../components/BuyModal';

const STYLES = ['all', '海报', '插画', 'Logo', 'UI设计', '摄影', '其他'];
const SORTS = [
  { value: 'newest', label: '最新上传' },
  { value: 'price_asc', label: '价格从低到高' },
  { value: 'price_desc', label: '价格从高到低' },
];
const MIN_COLUMN_WIDTH = 280;
const COLUMN_GAP = 16;
const PAGE_PADDING = 16;
const PAGE_SIZE = 20;
const PRELOAD_THRESHOLD = 300;

export default function WorkList() {
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [style, setStyle] = useState('all');
  const [sort, setSort] = useState('newest');
  const [selectedWork, setSelectedWork] = useState<WorkItem | null>(null);
  const [columns, setColumns] = useState(4);
  const navigate = useNavigate();
  const loadingRef = useRef(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const lastScrollTopRef = useRef(0);
  const gridRef = useRef<HTMLDivElement>(null);

  const calculateColumns = useCallback(() => {
    const maxWidth = Math.min(window.innerWidth, 1400) - PAGE_PADDING * 2;
    const availableWidth = maxWidth - COLUMN_GAP;
    const colCount = Math.max(1, Math.floor(availableWidth / (MIN_COLUMN_WIDTH + COLUMN_GAP)));
    setColumns(colCount);
  }, []);

  useEffect(() => {
    calculateColumns();
    window.addEventListener('resize', calculateColumns);
    return () => window.removeEventListener('resize', calculateColumns);
  }, [calculateColumns]);

  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.style.columnCount = String(columns);
    }
  }, [columns]);

  const fetchWorks = useCallback(async (pageNum: number, reset: boolean = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const data = await api.works.list({
        page: pageNum,
        limit: PAGE_SIZE,
        style: style === 'all' ? undefined : style,
        sort,
      });
      setWorks(reset ? data.works : (prev) => [...prev, ...data.works]);
      hasMoreRef.current = data.hasMore;
      setHasMore(data.hasMore);
      pageRef.current = pageNum;
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to fetch works:', err);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [style, sort]);

  useEffect(() => {
    loadingRef.current = false;
    pageRef.current = 1;
    hasMoreRef.current = true;
    lastScrollTopRef.current = 0;
    setWorks([]);
    setHasMore(true);
    setPage(1);
    fetchWorks(1, true);
  }, [style, sort, fetchWorks]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const isScrollingDown = scrollTop > lastScrollTopRef.current;
      lastScrollTopRef.current = scrollTop;

      if (!isScrollingDown) return;

      const viewportHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      const distanceToBottom = docHeight - scrollTop - viewportHeight;

      if (
        distanceToBottom < PRELOAD_THRESHOLD &&
        hasMoreRef.current &&
        !loadingRef.current
      ) {
        fetchWorks(pageRef.current + 1, false);
      }
    };

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [fetchWorks]);

  const handleBuySuccess = () => {
    setSelectedWork(null);
    navigate('/profile');
  };

  return (
    <div className="page-container">
      <div className="filter-bar">
        <select value={style} onChange={(e) => setStyle(e.target.value)}>
          {STYLES.map((s) => (
            <option key={s} value={s}>{s === 'all' ? '全部风格' : s}</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="masonry-grid" ref={gridRef}>
        {works.map((work) => (
          <div
            key={work.id}
            className="work-card"
            onClick={() => navigate(`/works/${work.id}`)}
          >
            <img
              src={work.watermarkedPath}
              alt={work.title}
              loading="lazy"
            />
            <div className="work-card-info">
              <div className="work-card-title">{work.title}</div>
              <div className="work-card-bottom">
                <span className="work-card-price">¥{work.price.toFixed(2)}</span>
                <button
                  className="work-card-buy"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedWork(work);
                  }}
                >
                  购买
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {loading && <div className="loading-indicator">加载中...</div>}
      {!hasMore && works.length > 0 && (
        <div className="loading-indicator">没有更多作品了</div>
      )}
      {!loading && works.length === 0 && (
        <div className="empty-state">
          <p>暂无作品</p>
        </div>
      )}

      {selectedWork && (
        <BuyModal
          work={selectedWork}
          onClose={() => setSelectedWork(null)}
          onSuccess={handleBuySuccess}
        />
      )}
    </div>
  );
}
