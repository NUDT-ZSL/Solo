import { useState, useEffect, useCallback } from 'react';
import type { Task, TaskStatus } from '../utils/types';
import { getTasks, updateTaskStatus, claimTask } from '../api/tasks';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const data = await getTasks(signal);
      setTasks(data);
      setError(null);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchTasks(controller.signal);
    return () => controller.abort();
  }, [fetchTasks]);

  const handleUpdateStatus = useCallback(async (id: string, status: TaskStatus) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const prevStatus = task.status;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));

    try {
      const controller = new AbortController();
      await updateTaskStatus(id, status, controller.signal);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: prevStatus } : t)));
      }
    }
  }, [tasks]);

  const handleClaim = useCallback(async (id: string, assigneeId: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const prevState = { status: task.status, assigneeId: task.assigneeId };
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: 'in_progress' as TaskStatus, assigneeId } : t
      )
    );

    try {
      const controller = new AbortController();
      await claimTask(id, assigneeId, controller.signal);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, status: prevState.status, assigneeId: prevState.assigneeId } : t
          )
        );
      }
    }
  }, [tasks]);

  return { tasks, loading, error, fetchTasks, handleUpdateStatus, handleClaim };
}
