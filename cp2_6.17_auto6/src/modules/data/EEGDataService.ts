import { useCallback, useRef } from 'react';
import type { EEGData } from '../../types';

const API_BASE_URL = 'http://localhost:4000/api';

export async function fetchEEGData(
  signal?: AbortSignal
): Promise<EEGData> {
  const response = await fetch(`${API_BASE_URL}/eeg`, {
    method: 'GET',
    signal,
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch EEG data: ${response.status}`);
  }
  
  return response.json();
}

export async function fetchEEGHistory(
  offset: number,
  signal?: AbortSignal
): Promise<EEGData> {
  const response = await fetch(`${API_BASE_URL}/eeg/history?offset=${offset}`, {
    method: 'GET',
    signal,
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch EEG history: ${response.status}`);
  }
  
  return response.json();
}

export function useEEGDataService() {
  const abortControllerRef = useRef<AbortController | null>(null);

  const getEEGData = useCallback(async (): Promise<EEGData> => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    try {
      const data = await fetchEEGData(abortControllerRef.current.signal);
      return data;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw error;
      }
      throw error;
    }
  }, []);

  const getEEGHistory = useCallback(async (offset: number): Promise<EEGData> => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    try {
      const data = await fetchEEGHistory(offset, abortControllerRef.current.signal);
      return data;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw error;
      }
      throw error;
    }
  }, []);

  return { getEEGData, getEEGHistory };
}
