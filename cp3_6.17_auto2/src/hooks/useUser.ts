import { useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { getUser } from '../api/borrowApi';

interface UseUserState {
  loading: boolean;
  error: string | null;
  data: User | null;
}

export function useUser(id: string | null) {
  const [state, setState] = useState<UseUserState>({
    loading: false,
    error: null,
    data: null,
  });

  const fetchUser = useCallback(async (userId: string) => {
    setState({ loading: true, error: null, data: null });
    try {
      const user = await getUser(userId);
      setState({ loading: false, error: null, data: user });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取用户信息失败';
      setState({ loading: false, error: errorMessage, data: null });
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchUser(id);
    }
  }, [id, fetchUser]);

  return {
    ...state,
    refetch: () => id && fetchUser(id),
  };
}
