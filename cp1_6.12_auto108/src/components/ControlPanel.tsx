import { useState, useEffect, useRef, useCallback } from 'react';
import type { LightFixture, LightingResult, TimePreset, AreaStat } from '../types';
import { LIGHT_PRESETS, TIME_PRESETS } from '../types';

interface ControlPanelProps {
  layoutId: string;
  availableLayouts: Array<{ id: string; name: string }>;
  onLayoutChange: (id: string) => void;
  lights: LightFixture[];
  onLightsChange: (lights: LightFixture[]) => void;
  timePreset: TimePreset;
  onTimePresetChange: (preset: TimePreset) => void;
  lightingResult: LightingResult | null;
  onDragLightType: (type: string | null) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

function IlluminanceBarChart({ areaStats }: { areaStats: AreaStat[] }) {
  const [flashState, setFlashState] = useState(true);

  useEffect(() => {
    const hasBelow = areaStats.some(s => s.is_below_recommended);
    if (!hasBelow) return;
    const interval = setInterval(() => {
      setFlashState(prev => !prev);
    }, 600);
    return () => clearInterval(interval);
  }, [areaStats]);

  if (areaStats.length === 0) {
    return <div className="chart-empty">暂无照度数据</div>;
  }

  const maxIllum = Math.max(...areaStats.map(s => Math.max(s.avg_illuminance, s.recommended)), 1);

  return (
    <div className="bar-chart">
      {areaStats.map((stat, idx) => {
        const barHeight = (stat.avg_illuminance / maxIllum) * 100;
        const recLinePos = (stat.recommended / maxIllum) * 100;
        const isBelow = stat.is_below_recommended;

        return (
          <div key={idx} className="bar-group">
            <div className="bar-value-label">
              {Math.round(stat.avg_illuminance)} lux
            </div>
            <div className="bar-track">
              <div
                className={`bar-fill ${isBelow ? 'bar-below' : 'bar-normal'} ${isBelow && !flashState ? 'bar-flash-off' : ''}`}
                style={{ height: `${barHeight}%` }}
              />
              <div
                className="bar-rec-line"
                style={{ bottom: `${recLinePos}%` }}
                title={`推荐: ${stat.recommended} lux`}
              />
            </div>
            <div className="bar-label">{stat.name}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function ControlPanel({
  layoutId,
  availableLayouts,
  onLayoutChange,
  lights,
  onLightsChange,
  timePreset,
  onTimePresetChange,
  lightingResult,
  onDragLightType,
  isCollapsed,
  onToggleCollapse
}: ControlPanelProps) {
  const [dragType, setDragType] = useState<string | null>(null);

  const handleDragStart = useCallback((type: string) => (e: React.DragEvent) => {
    setDragType(type);
    onDragLightType(type);
    e.dataTransfer.setData('text/plain', type);
    e.dataTransfer.effectAllowed = 'copy';
  }, [onDragLightType]);

  const handleDragEnd = useCallback(() => {
    setDragType(null);
    onDragLightType(null);
  }, [onDragLightType]);

  const handleToggleLight = useCallback((lightId: string) => {
    onLightsChange(
      lights.map(l =>
        l.id === lightId ? { ...l, is_on: !l.is_on } : l
      )
    );
  }, [lights, onLightsChange]);

  const handleDeleteLight = useCallback((lightId: string) => {
    onLightsChange(lights.filter(l => l.id !== lightId));
  }, [lights, onLightsChange]);

  return (
    <div className={`control-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="panel-drag-handle" onClick={onToggleCollapse}>
        <div className="drag-handle-line" />
        <div className="drag-handle-line" />
        <div className="drag-handle-line" />
      </div>

      <div className="panel-content">
        <div className="panel-card">
          <h3 className="card-title">户型选择</h3>
          <select
            className="layout-select"
            value={layoutId}
            onChange={(e) => onLayoutChange(e.target.value)}
          >
            {availableLayouts.map(layout => (
              <option key={layout.id} value={layout.id}>
                {layout.name}
              </option>
            ))}
          </select>
        </div>

        <div className="panel-card">
          <h3 className="card-title">灯具库</h3>
          <div className="light-grid">
            {LIGHT_PRESETS.map(preset => (
              <div
                key={preset.type}
                className={`light-item ${dragType === preset.type ? 'dragging' : ''}`}
                draggable
                onDragStart={handleDragStart(preset.type)}
                onDragEnd={handleDragEnd}
              >
                <span className="light-icon">{preset.icon}</span>
                <span className="light-name">{preset.name}</span>
              </div>
            ))}
          </div>
          {lights.length > 0 && (
            <div className="light-list">
              <h4 className="list-title">已放置灯具</h4>
              {lights.map(light => (
                <div key={light.id} className="light-list-item">
                  <span className="light-list-name">{light.name}</span>
                  <button
                    className={`toggle-btn ${light.is_on ? 'on' : 'off'}`}
                    onClick={() => handleToggleLight(light.id)}
                  >
                    {light.is_on ? 'ON' : 'OFF'}
                  </button>
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteLight(light.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel-card">
          <h3 className="card-title">时间模拟</h3>
          <div className="time-buttons">
            {TIME_PRESETS.map(preset => (
              <button
                key={preset.id}
                className={`time-btn ${timePreset === preset.id ? 'active' : ''}`}
                onClick={() => onTimePresetChange(preset.id)}
              >
                <span className="time-icon">{preset.icon}</span>
                <span className="time-name">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="panel-card">
          <h3 className="card-title">照度分析</h3>
          {lightingResult ? (
            <>
              <IlluminanceBarChart areaStats={lightingResult.area_stats} />
              <div className="stats-summary">
                <div className="stat-row">
                  <span>最小照度</span>
                  <span className="stat-value">{lightingResult.statistics.min} lux</span>
                </div>
                <div className="stat-row">
                  <span>最大照度</span>
                  <span className="stat-value">{lightingResult.statistics.max} lux</span>
                </div>
                <div className="stat-row">
                  <span>平均照度</span>
                  <span className="stat-value">{lightingResult.statistics.avg} lux</span>
                </div>
                <div className="stat-row">
                  <span>均匀度</span>
                  <span className={`stat-value ${lightingResult.uniformity >= 0.5 ? 'good' : 'bad'}`}>
                    {lightingResult.uniformity.toFixed(3)}
                  </span>
                </div>
              </div>
              <div className="evaluation-box">
                {lightingResult.evaluation}
              </div>
              {lightingResult.dark_areas.length > 0 && (
                <div className="warning-box dark-warning">
                  ⚠️ 发现 {lightingResult.dark_areas.length} 个过暗区域 (&lt;50 lux)
                </div>
              )}
              {lightingResult.glare_areas.length > 0 && (
                <div className="warning-box glare-warning">
                  ⚠️ 发现 {lightingResult.glare_areas.length} 个眩光区域 (&gt;1500 lux)
                </div>
              )}
            </>
          ) : (
            <div className="chart-empty">等待光照计算...</div>
          )}
        </div>
      </div>
    </div>
  );
}
