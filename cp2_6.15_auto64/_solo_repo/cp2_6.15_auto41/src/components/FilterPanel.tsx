import React from 'react';
import { FilterParams, filterConfigs } from '../utils/filterEngine';

interface FilterPanelProps {
  onApplyFilter: (filterType: keyof FilterParams, value: number) => void;
  disabled: boolean;
}

interface SingleFilterPanelProps {
  type: keyof FilterParams;
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onApply: (type: keyof FilterParams, value: number) => void;
  disabled: boolean;
}

const SingleFilterPanel: React.FC<SingleFilterPanelProps> = ({
  type,
  name,
  value,
  min,
  max,
  step,
  unit,
  onApply,
  disabled
}) => {
  const [sliderValue, setSliderValue] = React.useState(value);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderValue(parseFloat(e.target.value));
  };

  const handleApply = () => {
    onApply(type, sliderValue);
  };

  const displayValue = step < 1 ? sliderValue.toFixed(1) : sliderValue.toString();

  return (
    <div className="filter-panel">
      <div className="filter-header">
        <span className="filter-name">{name}</span>
        <span className="filter-value">
          {displayValue}{unit}
        </span>
      </div>
      <input
        type="range"
        className="filter-slider"
        min={min}
        max={max}
        step={step}
        value={sliderValue}
        onChange={handleSliderChange}
        disabled={disabled}
      />
      <button
        className="btn-apply"
        onClick={handleApply}
        disabled={disabled}
      >
        应用
      </button>
    </div>
  );
};

const FilterPanel: React.FC<FilterPanelProps> = ({ onApplyFilter, disabled }) => {
  const filters: (keyof FilterParams)[] = ['oilPaint', 'watercolor', 'sketch', 'mosaic', 'filmGrain'];

  return (
    <div className="filter-section">
      <div className="filter-panels">
        {filters.map((filterType) => {
          const config = filterConfigs[filterType];
          return (
            <SingleFilterPanel
              key={filterType}
              type={filterType}
              name={config.name}
              value={config.value}
              min={config.min}
              max={config.max}
              step={config.step}
              unit={config.unit}
              onApply={onApplyFilter}
              disabled={disabled}
            />
          );
        })}
      </div>
    </div>
  );
};

export default FilterPanel;
