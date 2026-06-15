import React from 'react';
import type { BlockMaterial, SimulationState } from '../types';
import { MATERIAL_CONFIGS } from '../types';

interface ToolbarProps {
  selectedMaterial: BlockMaterial;
  onSelectMaterial: (material: BlockMaterial) => void;
  simulationState: SimulationState;
  onStartSimulation: () => void;
  onPauseSimulation: () => void;
  onClear: () => void;
  onUndo: () => void;
  canUndo: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  selectedMaterial,
  onSelectMaterial,
  simulationState,
  onStartSimulation,
  onPauseSimulation,
  onClear,
  onUndo,
  canUndo,
}) => {
  const isSimulating = simulationState === 'simulating';
  const isDisabled = isSimulating;

  const materials: BlockMaterial[] = ['wood', 'stone', 'iron'];

  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <h3 className="toolbar-title">材质选择</h3>
        <div className="material-buttons">
          {materials.map((material) => {
            const config = MATERIAL_CONFIGS[material];
            const isSelected = selectedMaterial === material;
            return (
              <button
                key={material}
                className={`material-btn ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectMaterial(material)}
                disabled={isDisabled}
                title={config.label}
              >
                <span
                  className="material-preview"
                  style={{ backgroundColor: config.color }}
                />
                <span className="material-label">{config.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="toolbar-section">
        <h3 className="toolbar-title">编辑操作</h3>
        <div className="control-buttons">
          <button
            className="control-btn undo-btn"
            onClick={onUndo}
            disabled={isDisabled || !canUndo}
          >
            撤销
          </button>
          <button
            className="control-btn clear-btn"
            onClick={onClear}
            disabled={isDisabled}
          >
            清除全部
          </button>
        </div>
      </div>

      <div className="toolbar-section simulation-section">
        <button
          className={`control-btn simulation-btn ${isSimulating ? 'pause' : 'start'}`}
          onClick={isSimulating ? onPauseSimulation : onStartSimulation}
        >
          {isSimulating ? '暂停模拟' : '开始模拟'}
        </button>
        {simulationState === 'stable' && (
          <div className="stable-indicator">已稳定</div>
        )}
      </div>
    </div>
  );
};

export default Toolbar;
