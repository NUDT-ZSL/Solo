import { useEffect, useState } from 'react';
import type { Bridge } from '../Bridge';
import type { UIState, BuildingType } from '../types';

interface BuildingPaletteProps {
  bridge: Bridge;
}

export function BuildingPalette({ bridge }: BuildingPaletteProps) {
  const [state, setState] = useState<UIState | null>(null);

  useEffect(() => {
    const unsubscribe = bridge.subscribe((s) => setState(s));
    return unsubscribe;
  }, [bridge]);

  if (!state) return null;

  const buildingTypes: BuildingType[] = ['solarPanel', 'miner', 'greenhouse'];

  const handleSelect = (type: BuildingType) => {
    if (state.selectedBuildingType === type) {
      bridge.selectBuildingType(null);
    } else {
      bridge.selectBuildingType(type);
    }
  };

  return (
    <div className="building-palette">
      <div className="palette-title">建筑</div>
      {buildingTypes.map((type) => {
        const config = state.buildingConfigs[type];
        const isSelected = state.selectedBuildingType === type;

        return (
          <div
            key={type}
            className={`building-card ${isSelected ? 'selected' : ''}`}
            onClick={() => handleSelect(type)}
            title={`${config.name}\n建造消耗: ${Object.entries(config.baseCost)
              .map(([k, v]) => `${state.resources[k as keyof typeof state.resources]?.label} ${v}`)
              .join(', ')}`}
          >
            <div className="building-icon">{config.icon}</div>
            <div className="building-name">{config.name}</div>
          </div>
        );
      })}
    </div>
  );
}
