import { useState, useEffect, useCallback } from 'react';
import type { Device, User, BorrowRecord, ApiResponse } from '@/types';
import { getDevices, getDeviceById, submitBorrow, confirmReturn, getUserById, getRecords } from '@/api/borrowApi';

interface UseBorrowState<T> {
  loading: boolean;
  error: string | null;
  data: T | null;
}

export const useBorrow = () => {
  const [devicesState, setDevicesState] = useState<UseBorrowState<Device[]>>({
    loading: false,
    error: null,
    data: null,
  });

  const [deviceState, setDeviceState] = useState<UseBorrowState<Device>>({
    loading: false,
    error: null,
    data: null,
  });

  const [userState, setUserState] = useState<UseBorrowState<User>>({
    loading: false,
    error: null,
    data: null,
  });

  const [recordsState, setRecordsState] = useState<UseBorrowState<BorrowRecord[]>>({
    loading: false,
    error: null,
    data: null,
  });

  const [borrowState, setBorrowState] = useState<UseBorrowState<BorrowRecord>>({
    loading: false,
    error: null,
    data: null,
  });

  const fetchDevices = useCallback(async () => {
    setDevicesState({ loading: true, error: null, data: null });
    try {
      const response = await getDevices();
      if (response.success && response.data) {
        setDevicesState({ loading: false, error: null, data: response.data });
      } else {
        setDevicesState({ loading: false, error: response.error || '获取设备列表失败', data: null });
      }
    } catch (err) {
      setDevicesState({ loading: false, error: '网络错误', data: null });
    }
  }, []);

  const fetchDevice = useCallback(async (id: string) => {
    setDeviceState({ loading: true, error: null, data: null });
    try {
      const response = await getDeviceById(id);
      if (response.success && response.data) {
        setDeviceState({ loading: false, error: null, data: response.data });
      } else {
        setDeviceState({ loading: false, error: response.error || '获取设备详情失败', data: null });
      }
    } catch (err) {
      setDeviceState({ loading: false, error: '网络错误', data: null });
    }
  }, []);

  const fetchUser = useCallback(async (id: string) => {
    setUserState({ loading: true, error: null, data: null });
    try {
      const response = await getUserById(id);
      if (response.success && response.data) {
        setUserState({ loading: false, error: null, data: response.data });
      } else {
        setUserState({ loading: false, error: response.error || '获取用户信息失败', data: null });
      }
    } catch (err) {
      setUserState({ loading: false, error: '网络错误', data: null });
    }
  }, []);

  const fetchRecords = useCallback(async (userId?: string) => {
    setRecordsState({ loading: true, error: null, data: null });
    try {
      const response = await getRecords(userId);
      if (response.success && response.data) {
        setRecordsState({ loading: false, error: null, data: response.data });
      } else {
        setRecordsState({ loading: false, error: response.error || '获取记录失败', data: null });
      }
    } catch (err) {
      setRecordsState({ loading: false, error: '网络错误', data: null });
    }
  }, []);

  const borrow = useCallback(async (deviceId: string, userId: string): Promise<ApiResponse<BorrowRecord>> => {
    setBorrowState({ loading: true, error: null, data: null });
    try {
      const response = await submitBorrow(deviceId, userId);
      if (response.success && response.data) {
        setBorrowState({ loading: false, error: null, data: response.data });
        await fetchDevices();
      } else {
        setBorrowState({ loading: false, error: response.error || '借用失败', data: null });
      }
      return response;
    } catch (err) {
      setBorrowState({ loading: false, error: '网络错误', data: null });
      return { success: false, error: '网络错误' };
    }
  }, [fetchDevices]);

  const returnDevice = useCallback(async (recordId: string): Promise<ApiResponse<BorrowRecord>> => {
    try {
      const response = await confirmReturn(recordId);
      if (response.success) {
        await fetchDevices();
        await fetchRecords();
      }
      return response;
    } catch (err) {
      return { success: false, error: '网络错误' };
    }
  }, [fetchDevices, fetchRecords]);

  const resetBorrowState = useCallback(() => {
    setBorrowState({ loading: false, error: null, data: null });
  }, []);

  return {
    devices: devicesState,
    device: deviceState,
    user: userState,
    records: recordsState,
    borrowResult: borrowState,
    fetchDevices,
    fetchDevice,
    fetchUser,
    fetchRecords,
    borrow,
    returnDevice,
    resetBorrowState,
  };
};
