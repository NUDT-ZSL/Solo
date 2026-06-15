import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import type { Plant, Garden } from '@/types';

const API_BASE = '/api';

const axiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

export function useGarden() {
  const [gardens, setGardens] = useState<Garden[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [myGarden, setMyGarden] = useState<Garden | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const myGardenIdRef = useRef<number | null>(null);

  const refreshMyGardenPlants = useCallback(async () => {
    if (myGardenIdRef.current === null) return;
    try {
      const res = await axiosInstance.get(`/gardens/${myGardenIdRef.current}/plants`);
      setPlants(res.data);
    } catch (err: any) {
      // silent failure
    }
  }, []);

  const fetchGardens = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/gardens');
      setGardens(res.data);
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGardenDetail = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/gardens/${id}`);
      return res.data as Garden;
    } catch (err: any) {
      setError(err.message || '加载失败');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createGarden = useCallback(async (name?: string) => {
    try {
      const res = await axiosInstance.post('/gardens', { name, userId: 'user_local' });
      setMyGarden(res.data);
      setPlants([]);
      localStorage.setItem('myGardenId', String(res.data.id));
      myGardenIdRef.current = res.data.id;
      return res.data;
    } catch (err: any) {
      setError(err.message || '创建失败');
      return null;
    }
  }, []);

  const fetchMyGarden = useCallback(async () => {
    const savedId = localStorage.getItem('myGardenId');
    if (!savedId) {
      const newGarden = await createGarden('我的植物园');
      return newGarden;
    }
    try {
      const res = await axiosInstance.get(`/gardens/${savedId}`);
      setMyGarden(res.data);
      setPlants(res.data.plants || []);
      myGardenIdRef.current = res.data.id;
      return res.data;
    } catch {
      const newGarden = await createGarden('我的植物园');
      return newGarden;
    }
  }, [createGarden]);

  const plantSeed = useCallback(async (gardenId: number, plantType: string, gridIndex: number) => {
    try {
      const res = await axiosInstance.post(`/gardens/${gardenId}/plants`, { plantType, gridIndex });
      setPlants(prev => [...prev, res.data]);
      return res.data;
    } catch (err: any) {
      setError(err.message || '种植失败');
      return null;
    }
  }, []);

  const waterPlant = useCallback(async (plantId: number) => {
    try {
      const res = await axiosInstance.post(`/plants/${plantId}/water`);
      setPlants(prev => prev.map(p => p.id === plantId ? res.data : p));
      return res.data;
    } catch (err: any) {
      setError(err.message || '浇水失败');
      return null;
    }
  }, []);

  const fertilizePlant = useCallback(async (plantId: number) => {
    try {
      const res = await axiosInstance.post(`/plants/${plantId}/fertilize`);
      setPlants(prev => prev.map(p => p.id === plantId ? res.data : p));
      return res.data;
    } catch (err: any) {
      setError(err.message || '施肥失败');
      return null;
    }
  }, []);

  const harvestPlant = useCallback(async (plantId: number) => {
    try {
      await axiosInstance.delete(`/plants/${plantId}`);
      setPlants(prev => prev.filter(p => p.id !== plantId));
      return true;
    } catch (err: any) {
      setError(err.message || '收获失败');
      return false;
    }
  }, []);

  const likeGarden = useCallback(async (gardenId: number) => {
    try {
      const res = await axiosInstance.post(`/gardens/${gardenId}/like`);
      setGardens(prev => prev.map(g => g.id === gardenId ? { ...g, likes: res.data.likes } : g));
      return res.data.likes;
    } catch (err: any) {
      setError(err.message || '点赞失败');
      return null;
    }
  }, []);

  const fetchMessages = useCallback(async (gardenId: number) => {
    try {
      const res = await axiosInstance.get(`/gardens/${gardenId}/messages`);
      return res.data;
    } catch (err: any) {
      setError(err.message || '加载留言失败');
      return [];
    }
  }, []);

  const sendMessage = useCallback(async (gardenId: number, userName: string, content: string) => {
    try {
      const res = await axiosInstance.post(`/gardens/${gardenId}/messages`, { userName, content });
      return res.data;
    } catch (err: any) {
      setError(err.message || '留言失败');
      return null;
    }
  }, []);

  const startGrowthTimer = useCallback(() => {
    if (refreshTimerRef.current) return;
    refreshTimerRef.current = window.setInterval(() => {
      refreshMyGardenPlants();
    }, 2000);
  }, [refreshMyGardenPlants]);

  const stopGrowthTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopGrowthTimer();
  }, [stopGrowthTimer]);

  return {
    gardens,
    plants,
    myGarden,
    loading,
    error,
    fetchGardens,
    fetchGardenDetail,
    fetchMyGarden,
    createGarden,
    plantSeed,
    waterPlant,
    fertilizePlant,
    harvestPlant,
    likeGarden,
    fetchMessages,
    sendMessage,
    startGrowthTimer,
    stopGrowthTimer,
    setPlants,
  };
}
