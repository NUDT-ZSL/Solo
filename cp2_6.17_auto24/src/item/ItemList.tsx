import { useState, useEffect, useRef, useCallback } from 'react';
import ItemCard from './ItemCard';
import { useApi } from '../hooks/useApi';
import type { Item } from '../types';

interface ItemListProps {
  stationId?: string;
  type?: 'lost' | 'found';
}

interface ItemsResponse {
  items: Item[];
  total: number;
  hasMore: boolean;
}

export default function ItemList({ stationId, type }: ItemListProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<HTMLDivElement>(null);
  const { get, loading } = useApi<ItemsResponse>();

  const loadItems = useCallback(async (pageNum: number, reset = false) => {
    const params = new URLSearchParams({
      page: String(pageNum),
      pageSize: '10',
    });
    if (stationId) params.append('stationId', stationId);
    if (type) params.append('type', type);

    const result = await get(`/api/items?${params.toString()}`);
    if (result) {
      setItems(prev => reset ? result.items : [...prev, ...result.items]);
      setHasMore(result.hasMore);
    }
  }, [get, stationId, type]);

  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    loadItems(1, true);
  }, [stationId, type, loadItems]);

  useEffect(() => {
    if (page === 1) return;
    loadItems(page);
  }, [page, loadItems]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading]);

  if (items.length === 0 && !loading) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📦</div>
        <p className="empty-text">暂无物品信息</p>
        <style>{`
          .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 20px;
            color: #9ca3af;
          }
          .empty-icon {
            font-size: 48px;
            margin-bottom: 16px;
          }
          .empty-text {
            font-size: 14px;
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="item-list-wrapper">
      <div className="item-list">
        {items.map(item => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
      
      <div ref={observerRef} className="load-more">
        {loading && (
          <div className="loading-spinner">
            <div className="spinner" />
            <span>加载中...</span>
          </div>
        )}
        {!hasMore && items.length > 0 && (
          <span className="no-more">— 已经到底了 —</span>
        )}
      </div>
      
      <style>{`
        .item-list-wrapper {
          width: 100%;
          max-width: 100%;
        }
        
        .item-list {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 16px;
          padding: 16px;
          grid-auto-flow: dense;
        }
        
        .item-list > * {
          grid-column: span 12;
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          flex: 1 1 auto;
        }
        
        @media (min-width: 768px) {
          .item-list > * {
            grid-column: span 6;
          }
        }
        
        @media (min-width: 1024px) {
          .item-list > * {
            grid-column: span 4;
          }
        }
        
        @media (min-width: 1280px) {
          .item-list > * {
            grid-column: span 3;
          }
        }
        
        .item-list > div {
          justify-self: center;
        }
        
        .load-more {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          min-height: 40px;
        }
        
        .loading-spinner {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #6366f1;
          font-size: 14px;
        }
        
        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #e0e7ff;
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .no-more {
          color: #9ca3af;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}
