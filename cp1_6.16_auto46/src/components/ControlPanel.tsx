import React, { useState } from 'react';
import type { CometData } from '../App';

interface ControlPanelProps {
  comets: CometData[];
  selectedCometId: string;
  speed: number;
  isPlaying: boolean;
  selectedYears: number[];
  simulationTime: Date;
  cometName: string;
  onCometSelect: (cometId: string) => void;
  onSpeedChange: (speed: number) => void;
  onPlayPause: () => void;
  onYearToggle: (year: number) => void;
  onAddComet: (cometData: Omit<CometData, 'id' | 'perihelionEpoch' | 'color' | 'isCustom'>) => Promise<boolean>;
}

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const ControlPanel: React.FC<ControlPanelProps> = ({
  comets,
  selectedCometId,
  speed,
  isPlaying,
  selectedYears,
  simulationTime,
  cometName,
  onCometSelect,
  onSpeedChange,
  onPlayPause,
  onYearToggle,
  onAddComet
}) => {
  const [formData, setFormData] = useState({
    name: '',
    semiMajorAxis: '2.5',
    eccentricity: '0.5',
    inclination: '30',
    perihelionLongitude: '180'
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [shakeField, setShakeField] = useState<string | null>(null);
  const [yearInput, setYearInput] = useState<number>(2025);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = '请输入彗星名称';
    }

    const semiMajorAxis = parseFloat(formData.semiMajorAxis);
    if (isNaN(semiMajorAxis) || semiMajorAxis < 0.5 || semiMajorAxis > 5) {
      errors.semiMajorAxis = '半长轴必须在0.5-5 AU之间';
    }

    const eccentricity = parseFloat(formData.eccentricity);
    if (isNaN(eccentricity) || eccentricity < 0.1 || eccentricity > 0.9) {
      errors.eccentricity = '离心率必须在0.1-0.9之间';
    }

    const inclination = parseFloat(formData.inclination);
    if (isNaN(inclination) || inclination < 0 || inclination > 90) {
      errors.inclination = '倾角必须在0-90度之间';
    }

    const perihelionLongitude = parseFloat(formData.perihelionLongitude);
    if (isNaN(perihelionLongitude) || perihelionLongitude < 0 || perihelionLongitude > 360) {
      errors.perihelionLongitude = '近日点经度必须在0-360度之间';
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      const firstErrorField = Object.keys(errors)[0];
      setShakeField(firstErrorField);
      setTimeout(() => setShakeField(null), 300);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const success = await onAddComet({
      name: formData.name,
      semiMajorAxis: parseFloat(formData.semiMajorAxis),
      eccentricity: parseFloat(formData.eccentricity),
      inclination: parseFloat(formData.inclination),
      perihelionLongitude: parseFloat(formData.perihelionLongitude)
    });

    if (success) {
      setFormData({
        name: '',
        semiMajorAxis: '2.5',
        eccentricity: '0.5',
        inclination: '30',
        perihelionLongitude: '180'
      });
      setFormErrors({});
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="control-panel">
      <div className="panel-header">
        <h2 className="comet-name">{cometName}</h2>
        <div className="simulation-time pulse-animation">
          {formatDate(simulationTime)}
        </div>
      </div>

      <div className="panel-section">
        <h3 className="section-title">彗星选择</h3>
        <div className="comet-selector">
          <select
            value={selectedCometId}
            onChange={(e) => onCometSelect(e.target.value)}
            className="comet-select"
          >
            {comets.map((comet) => (
              <option key={comet.id} value={comet.id}>
                {comet.name} {comet.isCustom && '(自定义)'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="panel-section">
        <h3 className="section-title">运行控制</h3>
        <div className="playback-controls">
          <button
            className={`play-pause-btn ${isPlaying ? 'playing' : 'paused'}`}
            onClick={onPlayPause}
          >
            <span className="play-icon">{isPlaying ? '⏸' : '▶'}</span>
          </button>
          <div className="speed-control">
            <label className="speed-label">速度: {speed.toFixed(1)}x</label>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={speed}
              onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
              className="speed-slider"
            />
            <div className="speed-labels">
              <span>0.1x</span>
              <span>5x</span>
            </div>
          </div>
        </div>
      </div>

      <div className="panel-section">
        <h3 className="section-title">历史轨迹</h3>
        <div className="year-selector">
          <div className="year-input-row">
            <input
              type="number"
              min="1900"
              max="2100"
              step="1"
              value={yearInput}
              onChange={(e) => setYearInput(parseInt(e.target.value) || 2025)}
              className="year-input"
            />
            <button
              className="add-year-btn"
              onClick={() => {
                if (yearInput >= 1900 && yearInput <= 2100) {
                  onYearToggle(yearInput);
                }
              }}
              disabled={selectedYears.length >= 5 && !selectedYears.includes(yearInput)}
            >
              {selectedYears.includes(yearInput) ? '移除' : '添加'}
            </button>
          </div>
          <div className="selected-years">
            {selectedYears.length === 0 ? (
              <p className="no-years-text">暂无选中年份（最多5条）</p>
            ) : (
              selectedYears.map((year) => (
                <span
                  key={year}
                  className="year-tag"
                  onClick={() => onYearToggle(year)}
                >
                  {year}
                  <span className="remove-icon">×</span>
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="panel-section">
        <h3 className="section-title">添加自定义彗星</h3>
        <form className="add-comet-form" onSubmit={handleSubmit}>
          <div className={`form-field ${shakeField === 'name' ? 'shake' : ''}`}>
            <label>名称</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="输入彗星名称"
            />
            {formErrors.name && <span className="error-text">{formErrors.name}</span>}
          </div>

          <div className={`form-field ${shakeField === 'semiMajorAxis' ? 'shake' : ''}`}>
            <label>半长轴 (0.5-5 AU)</label>
            <input
              type="number"
              step="0.1"
              value={formData.semiMajorAxis}
              onChange={(e) => handleInputChange('semiMajorAxis', e.target.value)}
            />
            {formErrors.semiMajorAxis && <span className="error-text">{formErrors.semiMajorAxis}</span>}
          </div>

          <div className={`form-field ${shakeField === 'eccentricity' ? 'shake' : ''}`}>
            <label>离心率 (0.1-0.9)</label>
            <input
              type="number"
              step="0.01"
              value={formData.eccentricity}
              onChange={(e) => handleInputChange('eccentricity', e.target.value)}
            />
            {formErrors.eccentricity && <span className="error-text">{formErrors.eccentricity}</span>}
          </div>

          <div className={`form-field ${shakeField === 'inclination' ? 'shake' : ''}`}>
            <label>倾角 (0-90°)</label>
            <input
              type="number"
              step="1"
              value={formData.inclination}
              onChange={(e) => handleInputChange('inclination', e.target.value)}
            />
            {formErrors.inclination && <span className="error-text">{formErrors.inclination}</span>}
          </div>

          <div className={`form-field ${shakeField === 'perihelionLongitude' ? 'shake' : ''}`}>
            <label>近日点经度 (0-360°)</label>
            <input
              type="number"
              step="1"
              value={formData.perihelionLongitude}
              onChange={(e) => handleInputChange('perihelionLongitude', e.target.value)}
            />
            {formErrors.perihelionLongitude && <span className="error-text">{formErrors.perihelionLongitude}</span>}
          </div>

          <button type="submit" className="submit-btn">
            添加彗星
          </button>
        </form>
      </div>
    </div>
  );
};

export default ControlPanel;
