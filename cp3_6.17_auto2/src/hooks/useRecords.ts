import { useState, useEffect, useCallback } from 'react';
import { BorrowRecord } from '../types';
import { getAllRecords } from '../api/borrowApi';

interface UseRecordsState {
  loading: boolean;
  error: string | null;
  data: BorrowRecord[] | null;
}

export function useRecords() {
  const [state, setState] = useState<UseRecordsState>({
    loading: false,
    error: null,
    data: null,
  });

  const fetchRecords = useCallback(async () => {
    setState({ loading: true, error: null, data: null });
    try {
      const records = await getAllRecords();
      setState({ loading: false, error: null, data: records });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取借用记录失败';
      setState({ loading: false, error: errorMessage, data: null });
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return {
    ...state,
    refetch: fetchRecords,
  };
}
