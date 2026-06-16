import { useState, useMemo, useCallback } from 'react';
import { BuildingStyle, generateBuildings, Building } from './CityGenerator';
import CityScene from './CityScene';
import UIPanel from './UIPanel';

export default function App() {
  const [style, setStyle] = useState<BuildingStyle>('modern');
  const [density, setDensity] = useState(20);
  const [rotationSpeed, setRotationSpeed] = useState(0.5);
  const [zoningEnabled, setZoningEnabled] = useState(true);
  const [gridSize, setGridSize] = useState(20);

  const buildings = useMemo<Building[]>(() => {
    return generateBuildings({
      gridSize,
      density,
      style,
      zoningEnabled,
    });
  }, [gridSize, density, style, zoningEnabled]);

  const handleStyleChange = useCallback((newStyle: BuildingStyle) => {
    setStyle(newStyle);
  }, []);

  const handleDensityChange = useCallback((newDensity: number) => {
    setDensity(newDensity);
    setGridSize(Math.floor(newDensity * 1.2) + 5);
  }, []);

  const handleRotationSpeedChange = useCallback((speed: number) => {
    setRotationSpeed(speed);
  }, []);

  const handleZoningChange = useCallback((enabled: boolean) => {
    setZoningEnabled(enabled);
  }, []);

  return (
    <div style={appStyle}>
      <div style={sceneContainerStyle}>
        <CityScene
          buildings={buildings}
          rotationSpeed={rotationSpeed}
          style={style}
        />
      </div>
      <UIPanel
        style={style}
        onStyleChange={handleStyleChange}
        density={density}
        onDensityChange={handleDensityChange}
        rotationSpeed={rotationSpeed}
        onRotationSpeedChange={handleRotationSpeedChange}
        zoningEnabled={zoningEnabled}
        onZoningChange={handleZoningChange}
        buildings={buildings}
      />
    </div>
  );
}

const appStyle: React.CSSProperties = {
  display: 'flex',
  width: '100vw',
  height: '100vh',
  overflow: 'hidden',
  backgroundColor: '#0D1218',
  margin: 0,
  padding: 0,
};

const sceneContainerStyle: React.CSSProperties = {
  width: '70%',
  height: '100vh',
  position: 'relative',
};
