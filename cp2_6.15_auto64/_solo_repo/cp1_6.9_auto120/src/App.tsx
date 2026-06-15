import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { generateForest, type DayData, type ForestResult } from './ForestGenerator';
import { ForestRenderer } from './ForestRenderer';

interface DayValues {
  steps: number;
  heartRate: number;
  screenHours: number;
}

const DEFAULT_VALUES: DayValues = {
  steps: 5000,
  heartRate: 70,
  screenHours: 4
};

const DAY_LABELS = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'];
const DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

function createDefaultData(): DayValues[] {
  return Array(7)
    .fill(null)
    .map(() => ({ ...DEFAULT_VALUES }));
}

export default function App() {
  const [data, setData] = useState<DayValues[]>(createDefaultData());
  const [paused, setPaused] = useState(false);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<ForestRenderer | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const forestData: DayData[] = useMemo(() => {
    return data.map((d, i) => ({
      dayIndex: i,
      steps: d.steps,
      heartRate: d.heartRate,
      screenHours: d.screenHours
    }));
  }, [data]);

  const updateSize = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setCanvasSize({
      width: Math.max(100, rect.width),
      height: Math.max(500, rect.height)
    });
  }, []);

  useEffect(() => {
    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [updateSize]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const result: ForestResult = generateForest(
      forestData,
      canvasSize.width,
      canvasSize.height
    );

    if (!rendererRef.current) {
      rendererRef.current = new ForestRenderer(
        canvasRef.current,
        result,
        idx => setHoveredDay(idx)
      );
      rendererRef.current.start();
    } else {
      rendererRef.current.updateForest(result);
      rendererRef.current.resize();
    }
  }, [forestData, canvasSize.width, canvasSize.height]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setPaused(paused);
    }
  }, [paused]);

  useEffect(() => {
    return () => {
      if (rendererRef.current) {
        rendererRef.current.stop();
        rendererRef.current = null;
      }
    };
  }, []);

  const handleChange = useCallback(
    (dayIndex: number, field: keyof DayValues, value: number) => {
      setData(prev => {
        const next = [...prev];
        next[dayIndex] = { ...next[dayIndex], [field]: value };
        return next;
      });
    },
    []
  );

  const handleReset = useCallback(() => {
    setData(createDefaultData());
    setPaused(false);
  }, []);

  return (
    <div className="lf-root">
      <div className="lf-header">
        <h1 className="lf-title">🌳 光之森林·生活数据活点地图</h1>
        <p className="lf-subtitle">
          每棵树代表一天 · 树干=步数 · 树冠=屏幕时长 · 波纹=心率
        </p>
      </div>

      <div className="lf-layout">
        <aside className="lf-panel">
          <div className="lf-panel-header">
            <h2 className="lf-panel-title">📊 7日生活数据</h2>
            {hoveredDay !== null && (
              <span className="lf-hover-badge">
                悬停: {DAY_NAMES[hoveredDay]} ({DAY_LABELS[hoveredDay]})
              </span>
            )}
          </div>

          <div className="lf-day-list">
            {data.map((day, i) => (
              <DayCard
                key={i}
                index={i}
                values={day}
                highlighted={hoveredDay === i}
                onChange={(field, value) => handleChange(i, field, value)}
              />
            ))}
          </div>

          <div className="lf-button-row">
            <button className="lf-btn lf-btn-primary" onClick={handleReset}>
              🔄 重置数据
            </button>
            <button
              className={'lf-btn lf-btn-secondary' + (paused ? ' lf-btn-active' : '')}
              onClick={() => setPaused(p => !p)}
            >
              {paused ? '▶️ 恢复动画' : '⏸️ 暂停动画'}
            </button>
          </div>

          <div className="lf-legend">
            <h3 className="lf-legend-title">🎨 图例说明</h3>
            <ul className="lf-legend-list">
              <li className="lf-legend-item">
                <span className="lf-legend-swatch" style={{ background: '#7CFC00' }} />
                D1 春季嫩绿
              </li>
              <li className="lf-legend-item">
                <span className="lf-legend-swatch" style={{ background: '#FFA500' }} />
                D7 冬季暖橙
              </li>
              <li className="lf-legend-item">
                <span className="lf-legend-trunk" />
                树干高↔步数
              </li>
              <li className="lf-legend-item">
                <span className="lf-legend-crown" />
                树冠大↔屏幕时长
              </li>
              <li className="lf-legend-item">
                <span className="lf-legend-ripple" />
                波纹快↔心率高
              </li>
            </ul>
          </div>
        </aside>

        <main className="lf-canvas-container" ref={containerRef}>
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              borderRadius: 12
            }}
          />
        </main>
      </div>
    </div>
  );
}

interface DayCardProps {
  index: number;
  values: DayValues;
  highlighted: boolean;
  onChange: (field: keyof DayValues, value: number) => void;
}

function DayCard({ index, values, highlighted, onChange }: DayCardProps) {
  return (
    <div
      className={'lf-day-card' + (highlighted ? ' lf-day-card-highlighted' : '')}
    >
      <div className="lf-day-card-header">
        <span className="lf-day-label">{DAY_LABELS[index]}</span>
        <span className="lf-day-name">{DAY_NAMES[index]}</span>
      </div>

      <SliderInput
        label="步数"
        unit="步"
        min={1000}
        max={20000}
        step={100}
        value={values.steps}
        onChange={v => onChange('steps', v)}
      />
      <SliderInput
        label="心率"
        unit="bpm"
        min={50}
        max={150}
        step={1}
        value={values.heartRate}
        onChange={v => onChange('heartRate', v)}
      />
      <SliderInput
        label="屏幕时长"
        unit="小时"
        min={1}
        max={12}
        step={0.5}
        value={values.screenHours}
        onChange={v => onChange('screenHours', v)}
      />
    </div>
  );
}

interface SliderInputProps {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}

function SliderInput({ label, unit, min, max, step, value, onChange }: SliderInputProps) {
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <div className="lf-slider-row">
      <div className="lf-slider-label-row">
        <span className="lf-slider-label">{label}</span>
        <span className="lf-slider-value">
          {Number.isInteger(value) ? value : value.toFixed(1)} {unit}
        </span>
      </div>
      <div className="lf-slider-track-wrap">
        <div
          className="lf-slider-track"
          style={{
            width: percent + '%'
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="lf-slider-input"
        />
      </div>
    </div>
  );
}
