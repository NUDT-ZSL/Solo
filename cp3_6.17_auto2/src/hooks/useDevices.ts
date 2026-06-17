import { useState, useEffect, useCallback } from 'react';
import { Device } from '../types';
import { getDevices, getDevice } from '../api/borrowApi';

interface UseDevicesState {
  loading: boolean;
  error: string | null;
  data: Device[] | null;
}

interface UseDeviceState {
  loading: boolean;
  error: string | null;
  data: Device | null;
}

export function useDevices() {
  const [state, setState] = useState<UseDevicesState>({
    loading: false,
    error: null,
    data: null,
  });

  const fetchDevices = useCallback(async () => {
    setState({ loading: true, error: null, data: null });
    try {
      const devices = await getDevices();
      setState({ loading: false, error: null, data: devices });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取设备列表失败';
      setState({ loading: false, error: errorMessage, data: null });
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  return {
    ...state,
    refetch: fetchDevices,
  };
}

export function useDevice(id: string | null) {
  const [state, setState] = useState<UseDeviceState>({
    loading: false,
    error: null,
    data: null,
  });

  const fetchDevice = useCallback(async (deviceId: string) => {
    setState({ loading: true, error: null, data: null });
    try {
      const device = await getDevice(deviceId);
      setState({ loading: false, error: null, data: device });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取设备详情失败';
      setState({ loading: false, error: errorMessage, data: null });
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchDevice(id);
    }
  }, [id, fetchDevice]);

  return {
    ...state,
    refetch: () => id && fetchDevice(id),
  };
}
