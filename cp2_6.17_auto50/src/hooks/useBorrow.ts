import { useState, useCallback } from 'react';
import { submitBorrow, confirmReturn, type submitBorrow as submitBorrowType } from '../api/borrowApi';
import type { BorrowRecord, Device } from '../types';

interface UseBorrowState {
  loading: boolean;
  error: string | null;
  data: {
    record?: BorrowRecord;
    device?: Device;
    creditScore?: number;
  } | null;
}

interface UseBorrowReturn extends UseBorrowState {
  borrow: (deviceId: string, userId: string) => Promise<BorrowRecord | null>;
  returnDevice: (recordId: string) => Promise<boolean>;
  reset: () => void;
}

export function useBorrow(): UseBorrowReturn {
  const [state, setState] = useState<UseBorrowState>({
    loading: false,
    error: null,
    data: null,
  });

  const borrow = useCallback(async (deviceId: string, userId: string): Promise<BorrowRecord | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await submitBorrow(deviceId, userId);
      setState({
        loading: false,
        error: null,
        data: {
          record: result.record,
          device: result.device,
        },
      });
      return result.record;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '借用失败';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return null;
    }
  }, []);

  const returnDevice = useCallback(async (recordId: string): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await confirmReturn(recordId);
      setState({
        loading: false,
        error: null,
        data: {
          record: result.record,
          creditScore: result.creditScore,
        },
      });
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '归还失败';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      data: null,
    });
  }, []);

  return {
    ...state,
    borrow,
    returnDevice,
    reset,
  };
}
