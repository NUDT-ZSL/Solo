import { useState, useEffect, useCallback } from 'react';
import { Diary, Comment } from '../types';

const API_BASE = '/api';

export function useDiaries(plantId: string | null) {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDiaries = useCallback(async () => {
    if (!plantId) return;
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/plants/${plantId}/diaries`);
      if (!response.ok) throw new Error('Failed to fetch diaries');
      const data = await response.json();
      setDiaries(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [plantId]);

  const addDiary = useCallback(async (content: string, imageFile?: File) => {
    if (!plantId) throw new Error('No plant selected');
    try {
      const formData = new FormData();
      formData.append('content', content);
      formData.append('userId', 'user_001');
      formData.append('userName', '绿植爱好者');
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const response = await fetch(`${API_BASE}/plants/${plantId}/diaries`, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('Failed to add diary');
      const data = await response.json();
      setDiaries(prev => [data.diary, ...prev]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, [plantId]);

  const likeDiary = useCallback(async (diaryId: string) => {
    try {
      const response = await fetch(`${API_BASE}/diaries/${diaryId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user_001' })
      });
      if (!response.ok) throw new Error('Failed to like diary');
      const updatedDiary = await response.json();
      setDiaries(prev => prev.map(d => d.id === diaryId ? updatedDiary : d));
      return updatedDiary;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, []);

  const addComment = useCallback(async (diaryId: string, content: string) => {
    try {
      const response = await fetch(`${API_BASE}/diaries/${diaryId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          userId: 'user_001',
          userName: '绿植爱好者'
        })
      });
      if (!response.ok) throw new Error('Failed to add comment');
      const newComment: Comment = await response.json();
      setDiaries(prev => prev.map(d => {
        if (d.id === diaryId) {
          return { ...d, comments: [...d.comments, newComment] };
        }
        return d;
      }));
      return newComment;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchDiaries();
  }, [fetchDiaries]);

  return { diaries, loading, error, refetch: fetchDiaries, addDiary, likeDiary, addComment };
}
