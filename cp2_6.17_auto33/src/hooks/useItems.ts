import { useState, useEffect, useCallback } from 'react';
import type { Item, PaginatedResponse } from '../types';

export function useItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchItems = useCallback(
    async (category: string = 'all', search: string = '', searchMode: string = 'all', pageNum: number = 1, reset: boolean = false) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          category,
          search,
          searchMode,
          page: String(pageNum),
          limit: '20',
        });
        const res = await fetch(`/api/items?${params}`);
        if (!res.ok) throw new Error('获取物品列表失败');
        const data: PaginatedResponse<Item> = await res.json();
        setItems((prev) => (reset ? data.items : [...prev, ...data.items]));
        setTotal(data.total);
        setPage(data.page);
        setHasMore(data.page * data.limit < data.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const loadMore = useCallback(
    (category: string, search: string, searchMode: string) => {
      if (!loading && hasMore) {
        fetchItems(category, search, searchMode, page + 1, false);
      }
    },
    [loading, hasMore, page, fetchItems]
  );

  return { items, loading, error, total, page, hasMore, fetchItems, loadMore };
}

export function useItemDetail(id: string | undefined) {
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchItem = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/items/${id}`);
        if (!res.ok) throw new Error('获取物品详情失败');
        const data: Item = await res.json();
        setItem(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [id]);

  const exchangeItem = async (userId: string, message: string = '') => {
    if (!id) throw new Error('物品ID不存在');
    const res = await fetch(`/api/items/${id}/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, message }),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || '交换失败');
    }
    return res.json();
  };

  return { item, loading, error, exchangeItem };
}

export function useHeatmapItems() {
  const [items, setItems] = useState<Array<{ id: string; name: string; points: number; location: { lat: number; lng: number } }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchHeatmap = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/items/heatmap');
        const data = await res.json();
        setItems(data);
      } finally {
        setLoading(false);
      }
    };
    fetchHeatmap();
  }, []);

  return { items, loading };
}
