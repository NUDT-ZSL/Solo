import { useState, useEffect, useCallback } from 'react';
import type { Device, BorrowRecord } from '../types';
import { getDevices, submitBorrow } from '../api/borrowApi';

interface UseBorrowState {
  loading: boolean;
  error: string | null;
  data: Device[];
  borrowResult: BorrowRecord | null;
}

interface UseBorrowReturn extends UseBorrowState {
  borrow: (deviceId: string, userId: string) => Promise<BorrowRecord | null>;
  refresh: () => Promise<void>;
}

export function useBorrow(): UseBorrowReturn {
  const [state, setState] = useState<UseBorrowState>({
    loading: true,
    error: null,
    data: [],
    borrowResult: null
  });

  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const devices = await getDevices();
      setState(prev => ({ ...prev, loading: false, data: devices }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : '加载失败'
      }));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const borrow = useCallback(async (deviceId: string, userId: string): Promise<BorrowRecord | null> => {
    setState(prev => ({ ...prev, error: null }));
    try {
      const record = await submitBorrow(deviceId, userId);
      setState(prev => ({ ...prev, borrowResult: record }));
      await refresh();
      return record;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '借用失败';
      setState(prev => ({ ...prev, error: msg }));
      return null;
    }
  }, [refresh]);

  return { ...state, borrow, refresh };
}
