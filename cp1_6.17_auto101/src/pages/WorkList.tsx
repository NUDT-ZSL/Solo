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

export default function WorkList() {
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [style, setStyle] = useState('all');
  const [sort, setSort] = useState('newest');
  const [selectedWork, setSelectedWork] = useState<WorkItem | null>(null);
  const navigate = useNavigate();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchWorks = useCallback(async (pageNum: number, reset: boolean = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const data = await api.works.list({ page: pageNum, limit: 20, style: style === 'all' ? undefined : style, sort });
      setWorks(reset ? data.works : (prev) => [...prev, ...data.works]);
      setHasMore(data.hasMore);
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to fetch works:', err);
    } finally {
      setLoading(false);
    }
  }, [style, sort, loading]);

  useEffect(() => {
    setWorks([]);
    setHasMore(true);
    setPage(1);
    fetchWorks(1, true);
  }, [style, sort]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchWorks(page + 1);
        }
      },
      { rootMargin: '300px' }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [hasMore, loading, page, fetchWorks]);

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

      <div className="masonry-grid">
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

      <div ref={sentinelRef} style={{ height: 1 }} />

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
