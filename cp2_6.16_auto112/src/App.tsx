import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Heatmap from './Heatmap';
import TimeSelector from './TimeSelector';
import { generateTrafficData } from './dataGenerator';
import type { DayType, IntersectionData } from './types';

const HEATMAP_HEIGHT = 500;
const CONTAINER_HEIGHT = 800;

const App: React.FC = () => {
  const [dayType, setDayType] = useState<DayType>('weekday');
  const [hour, setHour] = useState(8);
  const [containerWidth, setContainerWidth] = useState(800);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = Math.min(entry.contentRect.width, 1200);
        setContainerWidth(Math.max(320, Math.floor(width)));
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  const trafficData: IntersectionData[] = useMemo(
    () => generateTrafficData(dayType, hour, containerWidth, HEATMAP_HEIGHT),
    [dayType, hour, containerWidth]
  );

  const handleDayTypeChange = useCallback((newDayType: DayType) => {
    setDayType(newDayType);
    if (newDayType === 'weekday') {
      setHour(8);
    } else {
      setHour(15);
    }
  }, []);

  useEffect(() => {
    document.title = '城市交通流量热力图';
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#111827',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        boxSizing: 'border-box'
      }}
    >
      <h1
        style={{
          fontSize: 24,
          fontWeight: 600,
          color: '#f3f4f6',
          margin: '0 0 24px 0',
          textAlign: 'center'
        }}
      >
        城市交通流量热力图
      </h1>

      <div
        ref={containerRef}
        style={{
          width: '100%',
          maxWidth: 1200,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <Heatmap
          data={trafficData}
          width={containerWidth}
          height={HEATMAP_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
        />

        <div style={{ height: 40 }} />

        <TimeSelector
          dayType={dayType}
          hour={hour}
          onDayTypeChange={handleDayTypeChange}
          onHourChange={setHour}
          width={containerWidth}
        />
      </div>
    </div>
  );
};

export default App;
