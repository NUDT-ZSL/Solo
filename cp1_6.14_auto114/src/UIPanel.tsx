import React, { useState, useCallback } from 'react';
import type { OrbitEngine } from './OrbitEngine';
import type { SceneManager } from './SceneManager';
import { planets } from './data/planets';
import './UIPanel.css';

interface UIPanelProps {
  orbitEngine: OrbitEngine;
  sceneManager: SceneManager;
}

export const UIPanel: React.FC<UIPanelProps> = ({ orbitEngine, sceneManager }) => {
  const [timeScale, setTimeScale] = useState(orbitEngine.getTimeScale());
  const [timeScaleInput, setTimeScaleInput] = useState(orbitEngine.getTimeScale().toFixed(1));
  const [isPaused, setIsPaused] = useState(orbitEngine.isPaused());
  const [selectedPlanet, setSelectedPlanet] = useState('');

  const updateTimeScale = useCallback((value: number) => {
    const clampedValue = Math.max(0.1, Math.min(100, value));
    setTimeScale(clampedValue);
    setTimeScaleInput(clampedValue.toFixed(1));
    orbitEngine.setTimeScale(clampedValue);
  }, [orbitEngine]);

  const handleTimeScaleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    updateTimeScale(value);
  }, [updateTimeScale]);

  const handleTimeScaleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTimeScaleInput(e.target.value);
  }, []);

  const handleTimeScaleInputBlur = useCallback(() => {
    const value = parseFloat(timeScaleInput);
    if (!isNaN(value)) {
      updateTimeScale(value);
    } else {
      setTimeScaleInput(timeScale.toFixed(1));
    }
  }, [timeScaleInput, timeScale, updateTimeScale]);

  const handleTimeScaleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTimeScaleInputBlur();
    }
  }, [handleTimeScaleInputBlur]);

  const handleTogglePause = useCallback(() => {
    const paused = orbitEngine.togglePause();
    setIsPaused(paused);
  }, [orbitEngine]);

  const handlePlanetChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const planetName = e.target.value;
    setSelectedPlanet(planetName);
    if (planetName) {
      sceneManager.focusPlanet(planetName);
    }
  }, [sceneManager]);

  const handleTopView = useCallback(() => {
    sceneManager.setCameraView('top');
    setSelectedPlanet('');
  }, [sceneManager]);

  const handleSideView = useCallback(() => {
    sceneManager.setCameraView('side');
    setSelectedPlanet('');
  }, [sceneManager]);

  return (
    <div className="ui-panel">
      <h1 className="panel-title">OrbitViz</h1>

      <div className="control-section">
        <label className="control-label">时间流速</label>
        <div className="slider-container">
          <input
            type="range"
            min="0.1"
            max="100"
            step="0.1"
            value={timeScale}
            onChange={handleTimeScaleChange}
            className="time-slider"
          />
          <div className="time-scale-input-wrapper">
            <input
              type="number"
              min="0.1"
              max="100"
              step="0.1"
              value={timeScaleInput}
              onChange={handleTimeScaleInputChange}
              onBlur={handleTimeScaleInputBlur}
              onKeyDown={handleTimeScaleInputKeyDown}
              className="time-scale-input"
            />
            <span className="time-scale-unit">x</span>
          </div>
        </div>
        <div className="slider-labels">
          <span>0.1x</span>
          <span>100x</span>
        </div>
      </div>

      <div className="control-section">
        <button
          className="control-button"
          onClick={handleTogglePause}
        >
          {isPaused ? '恢复' : '暂停'}
        </button>
      </div>

      <div className="control-section">
        <label className="control-label">选择行星</label>
        <select
          value={selectedPlanet}
          onChange={handlePlanetChange}
          className="planet-select"
        >
          <option value="">-- 选择行星 --</option>
          {planets.map((planet) => (
            <option key={planet.name} value={planet.name}>
              {planet.nameCn}
            </option>
          ))}
        </select>
      </div>

      <div className="control-section">
        <label className="control-label">预设视角</label>
        <div className="button-group">
          <button
            className="control-button"
            onClick={handleTopView}
          >
            俯瞰视角
          </button>
          <button
            className="control-button"
            onClick={handleSideView}
          >
            侧面视角
          </button>
        </div>
      </div>

      <div className="info-section">
        <p className="info-text">
          点击场景中的行星可聚焦观察
        </p>
        <p className="info-text">
          调节滑块可加速或减慢模拟速度
        </p>
      </div>
    </div>
  );
};
