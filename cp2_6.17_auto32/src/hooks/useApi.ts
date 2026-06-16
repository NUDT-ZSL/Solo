import { useState, useEffect, useCallback } from 'react';

export interface Play {
  id: string;
  name: string;
  type: string;
  duration: number;
  cast: string[];
  posterUrl: string;
  description: string;
}

export interface TourStop {
  id: string;
  city: string;
  lat: number;
  lng: number;
  playId: string;
  playName: string;
  date: string;
  venue: string;
  boxOffice: number;
  status: string;
}

export interface Order {
  id: string;
  playId: string;
  stopId: string;
  seatNumber: string;
  seatArea: string;
  customerName: string;
  orderDate: string;
  price: number;
  playName?: string;
  city?: string;
  venue?: string;
  date?: string;
}

export interface BoxOfficeData {
  date: string;
  ticketsSold: number;
  revenue: number;
}

const API_BASE = '/api';

function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async (url: string, options?: RequestInit) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}${url}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setLoading(false);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败');
      setLoading(false);
      throw err;
    }
  }, []);

  const getPlays = useCallback((type?: string, keyword?: string) => {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (keyword) params.append('keyword', keyword);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request(`/plays${query}`) as Promise<Play[]>;
  }, [request]);

  const getPlay = useCallback((id: string) => {
    return request(`/plays/${id}`) as Promise<Play>;
  }, [request]);

  const createPlay = useCallback((play: Omit<Play, 'id'>) => {
    return request('/plays', {
      method: 'POST',
      body: JSON.stringify(play),
    }) as Promise<Play>;
  }, [request]);

  const updatePlay = useCallback((id: string, play: Partial<Play>) => {
    return request(`/plays/${id}`, {
      method: 'PUT',
      body: JSON.stringify(play),
    }) as Promise<Play>;
  }, [request]);

  const deletePlay = useCallback((id: string) => {
    return request(`/plays/${id}`, {
      method: 'DELETE',
    }) as Promise<{ success: boolean }>;
  }, [request]);

  const getStops = useCallback(() => {
    return request('/stops') as Promise<TourStop[]>;
  }, [request]);

  const getStop = useCallback((id: string) => {
    return request(`/stops/${id}`) as Promise<TourStop>;
  }, [request]);

  const getOrders = useCallback((stopId?: string) => {
    const query = stopId ? `?stopId=${stopId}` : '';
    return request(`/orders${query}`) as Promise<Order[]>;
  }, [request]);

  const getOrder = useCallback((id: string) => {
    return request(`/orders/${id}`) as Promise<Order>;
  }, [request]);

  const createOrder = useCallback((order: Omit<Order, 'id' | 'orderDate'>) => {
    return request('/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    }) as Promise<Order>;
  }, [request]);

  const getBoxOffice = useCallback((playId?: string, range: string = 'week') => {
    const params = new URLSearchParams();
    if (playId) params.append('playId', playId);
    params.append('range', range);
    return request(`/boxoffice?${params.toString()}`) as Promise<BoxOfficeData[]>;
  }, [request]);

  return {
    loading,
    error,
    getPlays,
    getPlay,
    createPlay,
    updatePlay,
    deletePlay,
    getStops,
    getStop,
    getOrders,
    getOrder,
    createOrder,
    getBoxOffice,
  };
}

export default useApi;
