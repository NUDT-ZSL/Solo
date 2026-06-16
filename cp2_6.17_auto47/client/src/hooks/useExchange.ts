import { useState, useCallback } from 'react';
import type { ExchangeRecord, ExchangeRequest, TransferNode, AdminStats } from '../types';
import { exchangesApi } from '../api';

export function useExchange() {
  const [data, setData] = useState<ExchangeRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getRecent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const records = await exchangesApi.recent();
      setData(records);
      return records;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserRequests = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const records = await exchangesApi.list(userId);
      setData(records);
      return records;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const getPendingRequests = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      return await exchangesApi.getRequests(userId);
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const createRequest = useCallback(
    async (params: { bookId: string; requesterId: string; ownerId: string }) => {
      setLoading(true);
      setError(null);
      try {
        return await exchangesApi.createRequest(params);
      } catch (e: any) {
        setError(e.message);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const respondRequest = useCallback(async (id: string, accept: boolean) => {
    setLoading(true);
    setError(null);
    try {
      return await exchangesApi.respondRequest(id, accept);
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const getHistory = useCallback(async (id: string): Promise<TransferNode[]> => {
    setLoading(true);
    setError(null);
    try {
      return await exchangesApi.getHistory(id);
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAdminStats = useCallback(async (): Promise<AdminStats> => {
    setLoading(true);
    setError(null);
    try {
      return await exchangesApi.adminStats();
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAdminRecords = useCallback(async (): Promise<ExchangeRecord[]> => {
    setLoading(true);
    setError(null);
    try {
      return await exchangesApi.adminRecords();
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const closeRecord = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      return await exchangesApi.close(id);
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    data,
    error,
    loading,
    getRecent,
    getUserRequests,
    getPendingRequests,
    createRequest,
    respondRequest,
    getHistory,
    getAdminStats,
    getAdminRecords,
    closeRecord,
  };
}
