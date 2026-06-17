import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Star, Coffee } from 'lucide-react';

interface Brew {
  id: string;
  origin: string;
  grindLevel: number;
  waterTemp: number;
  ratio: string;
  pourTime: number;
  flavorTags: string[];
  rating: number;
  createdAt: string;
}

const GRIND_LABELS = ['粗', '偏粗', '中', '偏细', '细'];
const FLAVOR_COLORS: Record<string, string> = {
  酸: '#EF4444',
  甜: '#F59E0B',
  苦: '#8B5CF6',
  醇: '#10B981',
};

export default function History() {
  const [brews, setBrews] = useState<Brew[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchBrews = useCallback(async (p: number) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/brews?page=${p}&limit=12`);
      const data = await res.json();
      if (p === 1) {
        setBrews(data.data);
      } else {
        setBrews((prev) => [...prev, ...data.data]);
      }
      setTotalPages(data.totalPages);
    } catch {
      console.error('获取记录失败');
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    fetchBrews(1);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && page < totalPages && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchBrews(nextPage);
        }
      },
      { rootMargin: '300px' }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [page, totalPages, loading, fetchBrews]);

  return (
    <div className="history-page">
      <h2 className="page-title">冲煮历史</h2>

      {brews.length === 0 && !loading && (
        <div className="empty-state">
          <Coffee size={48} color="#6B4226" strokeWidth={1.5} />
          <p>还没有冲煮记录，快去记录一杯吧！</p>
        </div>
      )}

      <div className="waterfall-grid">
        {brews.map((brew) => (
          <div key={brew.id} className="brew-card">
            <div className="card-header">
              <div className="card-avatar">
                <Coffee size={24} color="#6B4226" />
              </div>
              <h3 className="card-origin">{brew.origin}</h3>
            </div>

            <div className="card-params">
              <span>研磨度：{GRIND_LABELS[brew.grindLevel - 1]}</span>
              <span>水温：{brew.waterTemp}℃</span>
              <span>粉水比：{brew.ratio}</span>
              <span>注水：{brew.pourTime}秒</span>
            </div>

            <div className="card-flavors">
              {brew.flavorTags.map((tag) => (
                <span
                  key={tag}
                  className="flavor-badge"
                  style={{
                    backgroundColor: FLAVOR_COLORS[tag] || '#9CA3AF',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="card-footer">
              <div className="card-stars">
                {Array.from({ length: 10 }, (_, i) => (
                  <Star
                    key={i}
                    size={12}
                    fill={i < brew.rating ? '#FFD700' : 'none'}
                    stroke={i < brew.rating ? '#FFD700' : '#ccc'}
                  />
                ))}
              </div>
              <span className="card-date">
                {new Date(brew.createdAt).toLocaleDateString('zh-CN')}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div ref={sentinelRef} className="scroll-sentinel">
        {loading && <span className="loading-text">加载中...</span>}
      </div>
    </div>
  );
}
