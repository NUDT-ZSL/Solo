import React, { useState, useCallback } from 'react';
import { DropletScene } from '@/scene/DropletScene';
import { ControlPanel, CHEMICAL_COLORS } from '@/ui/ControlPanel';
import { PhysicsParams } from '@/hooks/useDropletPhysics';

const App: React.FC = () => {
  const [selectedColor, setSelectedColor] = useState<string>(CHEMICAL_COLORS[0].color);
  const [temperature, setTemperature] = useState<number>(25);
  const [humidity, setHumidity] = useState<number>(60);
  const [mergeCount, setMergeCount] = useState<number>(0);
  const [maxRadius, setMaxRadius] = useState<number>(0);

  const handleStatsUpdate = useCallback((count: number, radius: number) => {
    setMergeCount(count);
    setMaxRadius(radius);
  }, []);

  const physicsParams: PhysicsParams = {
    temperature,
    humidity,
  };

  return (
    <div className="app-container">
      <div className="scene-container">
        <DropletScene
          selectedColor={selectedColor}
          physicsParams={physicsParams}
          onStatsUpdate={handleStatsUpdate}
        />
      </div>
      <div className="panel-divider" />
      <ControlPanel
        selectedColor={selectedColor}
        onColorChange={setSelectedColor}
        temperature={temperature}
        onTemperatureChange={setTemperature}
        humidity={humidity}
        onHumidityChange={setHumidity}
        mergeCount={mergeCount}
        maxRadius={maxRadius}
      />
    </div>
  );
};

export default App;
