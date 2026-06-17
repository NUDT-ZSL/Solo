import { useState, useCallback } from 'react';
import { submitBorrow, confirmReturn } from '../api/borrowApi';
import type { BorrowResponse, ReturnResponse } from '../types';

export interface BorrowState {
  loading: boolean;
  error: string | null;
  data: BorrowResponse | null;
  borrow: (deviceId: string, userId: string) => Promise<BorrowResponse | null>;
  resetBorrowState: () => void;
}

export interface ReturnState {
  returnLoading: boolean;
  returnError: string | null;
  returnData: ReturnResponse | null;
  returnDevice: (recordId: string) => Promise<ReturnResponse | null>;
  resetReturnState: () => void;
}

export function useBorrow(): BorrowState & ReturnState {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BorrowResponse | null>(null);

  const [returnLoading, setReturnLoading] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);
  const [returnData, setReturnData] = useState<ReturnResponse | null>(null);

  const borrow = useCallback(async (deviceId: string, userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await submitBorrow(deviceId, userId);
      setData(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : '借用失败，请稍后重试';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetBorrowState = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  const returnDevice = useCallback(async (recordId: string) => {
    setReturnLoading(true);
    setReturnError(null);
    try {
      const result = await confirmReturn(recordId);
      setReturnData(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : '归还失败，请稍后重试';
      setReturnError(message);
      return null;
    } finally {
      setReturnLoading(false);
    }
  }, []);

  const resetReturnState = useCallback(() => {
    setReturnLoading(false);
    setReturnError(null);
    setReturnData(null);
  }, []);

  return {
    loading,
    error,
    data,
    borrow,
    resetBorrowState,
    returnLoading,
    returnError,
    returnData,
    returnDevice,
    resetReturnState
  };
}
