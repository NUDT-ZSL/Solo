import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { EEGData, BrainRegion, EEGContextType } from '../types';
import { SIGNAL_THRESHOLD } from '../types';
import { useEEGDataService } from '../modules/data/EEGDataService';

const EEGContext = createContext<EEGContextType | undefined>(undefined);

export function EEGProvider({ children }: { children: React.ReactNode }) {
  const [eegData, setEegData] = useState<EEGData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeOffset, setTimeOffset] = useState(0);
  const [flowSpeed, setFlowSpeed] = useState(1);
  const [hoveredRegion, setHoveredRegion] = useState<BrainRegion | null>(null);
  const [historyData, setHistoryData] = useState<EEGData[]>([]);
  const [alertRegions, setAlertRegions] = useState<BrainRegion[]>([]);

  const { getEEGData } = useEEGDataService();
  const isFetchingRef = useRef(false);
  const historyBufferRef = useRef<EEGData[]>([]);

  const checkAlertRegions = useCallback((data: EEGData) => {
    const regions: BrainRegion[] = ['frontal', 'parietal', 'temporal', 'occipital'];
    const alerts: BrainRegion[] = [];

    for (const region of regions) {
      const values = data.data[region];
      const maxVal = Math.max(...values.map(Math.abs));
      if (maxVal >= SIGNAL_THRESHOLD) {
        alerts.push(region);
      }
    }

    setAlertRegions(alerts);
  }, []);

  useEffect(() => {
    let isMounted = true;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const fetchData = async () => {
      if (isFetchingRef.current || timeOffset > 0) return;
      isFetchingRef.current = true;

      try {
        const data = await getEEGData();
        if (isMounted) {
          setEegData(data);
          setError(null);
          setIsLoading(false);
          checkAlertRegions(data);

          historyBufferRef.current.push(data);
          if (historyBufferRef.current.length > 300) {
            historyBufferRef.current.shift();
          }
          setHistoryData([...historyBufferRef.current]);
        }
      } catch (err) {
        if (isMounted && (err as Error).name !== 'AbortError') {
          setError((err as Error).message);
          setIsLoading(false);
        }
      } finally {
        isFetchingRef.current = false;
      }
    };

    fetchData();
    pollInterval = setInterval(fetchData, 200);

    return () => {
      isMounted = false;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [getEEGData, checkAlertRegions, timeOffset]);

  useEffect(() => {
    if (timeOffset > 0 && historyData.length > 0) {
      const index = Math.max(0, Math.min(historyData.length - 1, Math.floor(timeOffset / 0.2)));
      const historicalData = historyData[historyData.length - 1 - index];
      if (historicalData) {
        setEegData(historicalData);
        checkAlertRegions(historicalData);
      }
    }
  }, [timeOffset, historyData, checkAlertRegions]);

  const handleSetTimeOffset = useCallback((offset: number) => {
    setTimeOffset(Math.max(0, Math.min(60, offset)));
  }, []);

  const handleSetFlowSpeed = useCallback((speed: number) => {
    setFlowSpeed(Math.max(0.5, Math.min(3, speed)));
  }, []);

  const value = useMemo<EEGContextType>(() => ({
    eegData,
    isLoading,
    error,
    timeOffset,
    setTimeOffset: handleSetTimeOffset,
    flowSpeed,
    setFlowSpeed: handleSetFlowSpeed,
    hoveredRegion,
    setHoveredRegion,
    alertRegions,
    historyData
  }), [
    eegData,
    isLoading,
    error,
    timeOffset,
    handleSetTimeOffset,
    flowSpeed,
    handleSetFlowSpeed,
    hoveredRegion,
    alertRegions,
    historyData
  ]);

  return (
    <EEGContext.Provider value={value}>
      {children}
    </EEGContext.Provider>
  );
}

export function useEEGContext() {
  const context = useContext(EEGContext);
  if (context === undefined) {
    throw new Error('useEEGContext must be used within an EEGProvider');
  }
  return context;
}
