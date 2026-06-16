import { useState, useEffect, useCallback } from 'react';
import type { Task } from '../data/db';

interface UseTasksReturn {
  data: Task[];
  loading: boolean;
  error: string | null;
  fetchTasks: (params?: { building?: string; status?: string; userId?: string }) => Promise<void>;
  acceptTask: (taskId: string, acceptorId: string) => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  cancelTask: (taskId: string) => Promise<void>;
}

export function useTasks(initialParams?: { building?: string; status?: string; userId?: string }): UseTasksReturn {
  const [data, setData] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async (params?: { building?: string; status?: string; userId?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (params?.building) queryParams.set('building', params.building);
      if (params?.status) queryParams.set('status', params.status);
      if (params?.userId) queryParams.set('userId', params.userId);
      const queryStr = queryParams.toString();
      const url = `/api/tasks${queryStr ? `?${queryStr}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('获取任务列表失败');
      const tasks = (await res.json()) as Task[];
      setData(tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }, []);

  const acceptTask = useCallback(async (taskId: string, acceptorId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/accept`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptorId })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '接单失败');
      }
      await fetchTasks(initialParams);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTasks, initialParams]);

  const completeTask = useCallback(async (taskId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '完成任务失败');
      }
      await fetchTasks(initialParams);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTasks, initialParams]);

  const cancelTask = useCallback(async (taskId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '取消任务失败');
      }
      await fetchTasks(initialParams);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTasks, initialParams]);

  useEffect(() => {
    fetchTasks(initialParams);
  }, []);

  return { data, loading, error, fetchTasks, acceptTask, completeTask, cancelTask };
}
