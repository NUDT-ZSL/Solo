import React, { useState, useEffect } from 'react';
import { eventBus, EVENTS } from '../utils/EventBus';
import { dataProcessor } from '../DataProcessor';
import { POLLUTANT_COLORS, POLLUTANT_LABELS, PollutantData } from '../data/mockData';

interface StationInfo {
  id: string;
  name: string;
  value: number;
}

export const LegendPanel: React.FC = () => {
  const [hoveredStation, setHoveredStation] = useState<string | null>(null);
  const [top3, setTop3] = useState<StationInfo[]>([]);
  const [bottom3, setBottom3] = useState<StationInfo[]>([]);
  const [averages, setAverages] = useState<PollutantData>({ pm25: 0, pm10: 0, o3: 0, no2: 0 });
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const updateData = () => {
      const ranking = dataProcessor.getStationRanking('pm25');
      setTop3(ranking.slice(0, 3));
      setBottom3(ranking.slice(-3).reverse());
      setAverages(dataProcessor.getAveragePollutants());
    };

    updateData();

    const handleDataUpdate = () => {
      updateData();
    };

    eventBus.on(EVENTS.DATA_UPDATED, handleDataUpdate);
    eventBus.on(EVENTS.TIME_CHANGED, updateData);

    return () => {
      eventBus.off(EVENTS.DATA_UPDATED, handleDataUpdate);
      eventBus.off(EVENTS.TIME_CHANGED, updateData);
    };
  }, []);

  useEffect(() => {
    const handleStationHover = (stationId: string | null) => {
      setHoveredStation(stationId);
    };

    eventBus.on(EVENTS.STATION_HOVER, handleStationHover);
    return () => {
      eventBus.off(EVENTS.STATION_HOVER, handleStationHover);
    };
  }, []);

  const handleStationHover = (stationId: string | null) => {
    setHoveredStation(stationId);
    eventBus.emit(EVENTS.STATION_HOVER, stationId);
  };

  const pollutantKeys: (keyof PollutantData)[] = ['pm25', 'pm10', 'o3', 'no2'];

  const content = (
    <>
      <div className="legend-section">
        <div className="legend-section-title">污染物类型</div>
        {pollutantKeys.map((key) => (
          <div key={key} className="legend-item">
            <div
              className="legend-color"
              style={{ backgroundColor: POLLUTANT_COLORS[key] }}
            />
            <span className="legend-label">{POLLUTANT_LABELS[key]}</span>
            <span className="legend-value">{averages[key].toFixed(1)}</span>
          </div>
        ))}
      </div>

      <div className="legend-section">
        <div className="legend-section-title">PM2.5 浓度排名</div>
        <div className="legend-section-title" style={{ fontSize: '11px', marginTop: '8px' }}>
          最高前三名
        </div>
        {top3.map((station, idx) => (
          <div
            key={station.id}
            className={`legend-item ${hoveredStation === station.id ? 'highlighted' : ''}`}
            onMouseEnter={() => handleStationHover(station.id)}
            onMouseLeave={() => handleStationHover(null)}
          >
            <div
              className="legend-color"
              style={{ backgroundColor: `rgba(231, 76, 60, ${0.9 - idx * 0.2})` }}
            />
            <span className="legend-label" style={{ fontSize: '12px' }}>
              {station.name}
            </span>
            <span className="legend-value">{station.value.toFixed(1)}</span>
          </div>
        ))}

        <div
          className="legend-section-title"
          style={{ fontSize: '11px', marginTop: '12px' }}
        >
          最低后三名
        </div>
        {bottom3.map((station, idx) => (
          <div
            key={station.id}
            className={`legend-item ${hoveredStation === station.id ? 'highlighted' : ''}`}
            onMouseEnter={() => handleStationHover(station.id)}
            onMouseLeave={() => handleStationHover(null)}
          >
            <div
              className="legend-color"
              style={{ backgroundColor: `rgba(52, 152, 219, ${0.9 - idx * 0.2})` }}
            />
            <span className="legend-label" style={{ fontSize: '12px' }}>
              {station.name}
            </span>
            <span className="legend-value">{station.value.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </>
  );

  if (isMobile) {
    return (
      <div className={`legend-panel mobile ${isMobileExpanded ? 'expanded' : ''}`}>
        <button
          className="legend-toggle-btn"
          onClick={() => setIsMobileExpanded(!isMobileExpanded)}
        >
          <span>空气质量图例</span>
          <span style={{ transform: isMobileExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>
            ▼
          </span>
        </button>
        {isMobileExpanded && content}
      </div>
    );
  }

  return (
    <div className="legend-panel">
      <h3>空气质量图例</h3>
      {content}
    </div>
  );
};
