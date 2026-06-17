import { useState, useCallback } from 'react';
import { BorrowRecord } from '../types';
import { submitBorrow, confirmReturn } from '../api/borrowApi';

interface UseBorrowState {
  loading: boolean;
  error: string | null;
  data: BorrowRecord | null;
}

export function useBorrow() {
  const [state, setState] = useState<UseBorrowState>({
    loading: false,
    error: null,
    data: null,
  });

  const borrow = useCallback(async (deviceId: string, userId: string) => {
    setState({ loading: true, error: null, data: null });
    try {
      const record = await submitBorrow(deviceId, userId);
      setState({ loading: false, error: null, data: record });
      return record;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '借用失败';
      setState({ loading: false, error: errorMessage, data: null });
      throw err;
    }
  }, []);

  const returnDevice = useCallback(async (recordId: string) => {
    setState({ loading: true, error: null, data: null });
    try {
      const record = await confirmReturn(recordId);
      setState({ loading: false, error: null, data: record });
      return record;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '归还失败';
      setState({ loading: false, error: errorMessage, data: null });
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, data: null });
  }, []);

  return {
    ...state,
    borrow,
    returnDevice,
    reset,
  };
}
