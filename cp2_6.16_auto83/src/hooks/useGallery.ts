import { useState, useEffect, useCallback } from 'react';
import type { Painting } from '../types';

interface UseGalleryReturn {
  paintings: Painting[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  deletePainting: (id: string) => Promise<boolean>;
  uploadPainting: (data: Omit<Painting, 'id' | 'createdAt'>) => Promise<Painting | null>;
}

export const useGallery = (): UseGalleryReturn => {
  const [paintings, setPaintings] = useState<Painting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPaintings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/paintings');
      if (!res.ok) throw new Error('获取作品列表失败');
      const data = await res.json();
      setPaintings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }, []);

  const deletePainting = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/paintings/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('删除失败');
      setPaintings(prev => prev.filter(p => p.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
      return false;
    }
  }, []);

  const uploadPainting = useCallback(async (data: Omit<Painting, 'id' | 'createdAt'>): Promise<Painting | null> => {
    try {
      const res = await fetch('/api/paintings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('上传失败');
      const newPainting = await res.json();
      setPaintings(prev => [newPainting, ...prev]);
      return newPainting;
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
      return null;
    }
  }, []);

  useEffect(() => {
    fetchPaintings();
  }, [fetchPaintings]);

  return {
    paintings,
    loading,
    error,
    refresh: fetchPaintings,
    deletePainting,
    uploadPainting,
  };
};
