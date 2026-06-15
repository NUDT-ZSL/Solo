import { useEffect, useRef, useState } from 'react';
import { BubbleManager } from './bubble-manager';
import { processRawData, formatNumber, getEmissionLevel } from './data-processor';
import type { FilterConfig, ProcessedCountry } from './data-processor';
import { DetailPanel } from './DetailPanel';
import './styles.css';

export function App() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const bubbleManagerRef = useRef<BubbleManager | null>(null);
  const allDataRef = useRef<ProcessedCountry[]>([]);
  const throttleTimerRef = useRef<number | null>(null);
  const throttleLastTimeRef = useRef<number>(0);
  const throttlePendingRef = useRef<FilterConfig | null>(null);

  const [statusInfo, setStatusInfo] = useState<{
    name: string;
    level: string;
    emission: number;
  } | null>(null);

  const [filters, setFilters] = useState<FilterConfig>({
    minEmission: 0,
    minGdpPerCapita: 0,
    yearStart: 2000,
    yearEnd: 2023,
  });

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  useEffect(() => {
    if (!canvasRef.current) return;

    const allData = processRawData();
    allDataRef.current = allData;

    const manager = new BubbleManager(canvasRef.current, (info) => {
      setStatusInfo(info);
    });
    manager.loadCountries(allData);
    bubbleManagerRef.current = manager;

    return () => {
      manager.dispose();
      bubbleManagerRef.current = null;
      if (throttleTimerRef.current !== null) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
    };
  }, []);

  const THROTTLE_DELAY = 100;

  const applyFiltersThrottled = (nextFilters: FilterConfig) => {
    const now = Date.now();
    const elapsed = now - throttleLastTimeRef.current;
    throttlePendingRef.current = nextFilters;

    const execute = () => {
      if (throttlePendingRef.current) {
        bubbleManagerRef.current?.applyFilters(throttlePendingRef.current);
        throttleLastTimeRef.current = Date.now();
        throttlePendingRef.current = null;
      }
      throttleTimerRef.current = null;
    };

    if (elapsed >= THROTTLE_DELAY) {
      execute();
    } else if (!throttleTimerRef.current) {
      const remaining = THROTTLE_DELAY - elapsed;
      throttleTimerRef.current = window.setTimeout(execute, remaining);
    }
  };

  const handleFilterChange = <K extends keyof FilterConfig>(key: K, value: FilterConfig[K]) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      applyFiltersThrottled(next);
      return next;
    });
  };

  const handleResetView = () => {
    bubbleManagerRef.current?.resetView();
  };

  return (
    <div className="app">
      <div className="scene-wrapper">
        <div ref={canvasRef} className="scene-canvas" />

        <div className="filter-panel">
          <div className="filter-panel__title">数据筛选</div>

          <div className="filter-item">
            <div className="filter-label">
              <span>最小排放量</span>
              <span className="filter-value">{filters.minEmission} 万吨</span>
            </div>
            <input
              type="range"
              min={0}
              max={5000}
              step={100}
              value={filters.minEmission}
              onChange={(e) => handleFilterChange('minEmission', Number(e.target.value))}
              className="custom-slider"
            />
          </div>

          <div className="filter-item">
            <div className="filter-label">
              <span>人均 GDP 下限</span>
              <span className="filter-value">${formatNumber(filters.minGdpPerCapita)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100000}
              step={500}
              value={filters.minGdpPerCapita}
              onChange={(e) => handleFilterChange('minGdpPerCapita', Number(e.target.value))}
              className="custom-slider"
            />
          </div>

          <div className="filter-item">
            <div className="filter-label">
              <span>年份范围</span>
              <span className="filter-value">{filters.yearStart} - {filters.yearEnd}</span>
            </div>
            <div className="dual-slider">
              <input
                type="range"
                min={2000}
                max={2023}
                step={1}
                value={filters.yearStart}
                onChange={(e) => {
                  const v = Math.min(Number(e.target.value), filters.yearEnd);
                  handleFilterChange('yearStart', v);
                }}
                className="custom-slider custom-slider--dual"
              />
              <input
                type="range"
                min={2000}
                max={2023}
                step={1}
                value={filters.yearEnd}
                onChange={(e) => {
                  const v = Math.max(Number(e.target.value), filters.yearStart);
                  handleFilterChange('yearEnd', v);
                }}
                className="custom-slider custom-slider--dual"
              />
            </div>
          </div>

          <div className="color-legend">
            <div className="legend-title">人均 GDP 色阶</div>
            <div className="legend-gradient">
              <div className="legend-gradient__bar" />
              <div className="legend-labels">
                <span>$3K</span>
                <span>$8K</span>
                <span>$20K</span>
                <span>$40K</span>
                <span>$70K+</span>
              </div>
            </div>
          </div>
        </div>

        {statusInfo && (
          <div className="status-bar">
            <span className="status-bar__name">{statusInfo.name}</span>
            <span className="status-bar__divider">·</span>
            <span className="status-bar__level">{statusInfo.level}</span>
            <span className="status-bar__divider">·</span>
            <span className="status-bar__emission">{formatNumber(statusInfo.emission)} 万吨</span>
          </div>
        )}

        <button className="reset-btn" onClick={handleResetView}>
          重置视角
        </button>
      </div>

      <div className="detail-wrapper">
        <DetailPanel allCountries={allDataRef.current} />
      </div>
    </div>
  );
}
