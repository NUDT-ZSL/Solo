import { useState, useCallback } from 'react';

export function useRecommendPath() {
  const [reviewPath, setReviewPath] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const generatePath = useCallback(async (userId: string, courseId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/review-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, courseId })
      });
      const data = await res.json();
      setReviewPath(data.path || data || []);
    } catch (e) {
      console.error(e);
      setReviewPath([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearPath = useCallback(() => {
    setReviewPath([]);
  }, []);

  return { reviewPath, loading, generatePath, clearPath };
}
