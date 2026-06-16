import { useState, useEffect, useCallback } from 'react';
import type { Activity } from '../types';
import { getActivities, registerActivity } from '../api';

export function useActivityData() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getActivities();
      setActivities(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取活动列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleRegister = useCallback(
    async (activityId: string, userId: string) => {
      try {
        await registerActivity(activityId, userId);
        await fetchActivities();
        return { success: true };
      } catch (err) {
        return {
          success: false,
          message: err instanceof Error ? err.message : '报名失败'
        };
      }
    },
    [fetchActivities]
  );

  return {
    activities,
    loading,
    error,
    refetch: fetchActivities,
    register: handleRegister
  };
}
