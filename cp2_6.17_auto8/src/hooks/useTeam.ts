import { useState, useEffect, useCallback } from 'react';
import type { TeamMember } from '../utils/types';
import { getTeam, likeMember } from '../api/tasks';

export function useTeam() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeam = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const data = await getTeam(signal);
      setTeam(data);
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
    fetchTeam(controller.signal);
    return () => controller.abort();
  }, [fetchTeam]);

  const handleLike = useCallback(async (id: string) => {
    const member = team.find((m) => m.id === id);
    if (!member) return;

    setTeam((prev) =>
      prev.map((m) => (m.id === id ? { ...m, likes: m.likes + 1 } : m))
    );

    try {
      const controller = new AbortController();
      const result = await likeMember(id, controller.signal);
      setTeam((prev) =>
        prev.map((m) => (m.id === id ? { ...m, likes: result.likes } : m))
      );
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setTeam((prev) =>
          prev.map((m) => (m.id === id ? { ...m, likes: m.likes - 1 } : m))
        );
      }
    }
  }, [team]);

  return { team, loading, error, fetchTeam, handleLike };
}
