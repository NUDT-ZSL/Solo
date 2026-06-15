import React, { useEffect, useRef, useState } from 'react';
import { LegendPanel } from './components/LegendPanel';
import { TimeSlider } from './components/TimeSlider';
import { InfoPanel } from './components/InfoPanel';
import { sceneManager } from './SceneManager';
import { dataProcessor } from './DataProcessor';
import { mapLayer } from './MapLayer';
import { eventBus, EVENTS } from './utils/EventBus';
import { ProcessedStationData } from './DataProcessor';
import './styles.css';

function App() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [selectedStation, setSelectedStation] = useState<ProcessedStationData | null>(null);

  useEffect(() => {
    if (!sceneRef.current) return;

    mapLayer.init(30, 30);
    dataProcessor.init();
    sceneManager.init(sceneRef.current);

    const handleStationClick = (station: ProcessedStationData | null) => {
      setSelectedStation(station);
    };

    eventBus.on(EVENTS.STATION_CLICK, handleStationClick);

    const handleResize = () => {
      sceneManager.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      eventBus.off(EVENTS.STATION_CLICK, handleStationClick);
      sceneManager.dispose();
    };
  }, []);

  const handleCloseInfoPanel = () => {
    setSelectedStation(null);
  };

  return (
    <div className="app-container">
      <div className="main-content">
        <LegendPanel />
        <div className="scene-container" ref={sceneRef}>
          <InfoPanel station={selectedStation} onClose={handleCloseInfoPanel} />
        </div>
      </div>
      <TimeSlider />
    </div>
  );
}

export default App;
