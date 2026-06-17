import { useCallback, useEffect, useState } from 'react';
import type { BorrowResult } from '../types';
import { submitBorrow } from '../api/borrowApi';

/* useBorrow.ts - 自定义 Hook，管理借用状态
   调用关系：被 src/components/DeviceCard.tsx 与 src/pages/DeviceDetail.tsx 调用
   数据流向：调用 borrowApi.submitBorrow → 返回 {loading, error, data, borrow}
   状态：loading 借用中 / data 借用成功 / error 借用失败
*/

interface UseBorrowReturn {
  loading: boolean;
  error: string | null;
  data: BorrowResult | null;
  borrow: (deviceId: string, userId: string) => Promise<BorrowResult | null>;
  reset: () => void;
}

export function useBorrow(): UseBorrowReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BorrowResult | null>(null);

  const borrow = useCallback(async (deviceId: string, userId: string): Promise<BorrowResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await submitBorrow(deviceId, userId);
      setData(result);
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : '借用失败';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      setLoading(false);
      setError(null);
    };
  }, []);

  return { loading, error, data, borrow, reset };
}
