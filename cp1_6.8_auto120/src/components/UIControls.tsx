import { useReefStore } from '../store/useReefStore';
import type { CoralData } from '../store/useReefStore';
import { RotateCcw, Waves, Fish, Sun } from 'lucide-react';

const COLOR_MAP: Record<string, string> = {
  pink: '#ff6b9d',
  purple: '#b06bff',
  orange: '#ff8c42',
  green: '#4ecdc4',
};

const COLOR_LABEL: Record<string, string> = {
  pink: '粉色',
  purple: '紫色',
  orange: '橙色',
  green: '绿色',
};

export default function CoralInfoCard({ coral }: { coral: CoralData }) {
  return (
    <div className="coral-info-card">
      <div className="coral-info-header">
        <div
          className="coral-color-dot"
          style={{ backgroundColor: COLOR_MAP[coral.colorType] }}
        />
        <h3 className="coral-info-title">{coral.species}</h3>
      </div>
      <div className="coral-info-body">
        <div className="coral-info-row">
          <span className="coral-info-label">颜色</span>
          <span className="coral-info-value">{COLOR_LABEL[coral.colorType]}</span>
        </div>
        <div className="coral-info-row">
          <span className="coral-info-label">生长深度</span>
          <span className="coral-info-value">{coral.depth}m</span>
        </div>
        <div className="coral-info-row">
          <span className="coral-info-label">健康状况</span>
          <span className={`coral-health coral-health-${coral.health}`}>{coral.health}</span>
        </div>
      </div>
    </div>
  );
}

function SliderControl({
  icon: Icon,
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="slider-control">
      <div className="slider-header">
        <Icon size={14} />
        <span className="slider-label">{label}</span>
        <span className="slider-value">{value.toFixed(1)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="reef-slider"
      />
    </div>
  );
}

export function UIControls({ onResetView }: { onResetView: () => void }) {
  const currentSpeed = useReefStore((s) => s.currentSpeed);
  const fishDensity = useReefStore((s) => s.fishDensity);
  const lightIntensity = useReefStore((s) => s.lightIntensity);
  const setCurrentSpeed = useReefStore((s) => s.setCurrentSpeed);
  const setFishDensity = useReefStore((s) => s.setFishDensity);
  const setLightIntensity = useReefStore((s) => s.setLightIntensity);

  return (
    <div className="ui-controls">
      <h4 className="ui-controls-title">场景控制</h4>
      <SliderControl
        icon={Waves}
        label="洋流速度"
        value={currentSpeed}
        min={0.1}
        max={3.0}
        step={0.1}
        onChange={setCurrentSpeed}
      />
      <SliderControl
        icon={Fish}
        label="鱼群密度"
        value={fishDensity}
        min={0.1}
        max={1.0}
        step={0.05}
        onChange={setFishDensity}
      />
      <SliderControl
        icon={Sun}
        label="光照强度"
        value={lightIntensity}
        min={0.2}
        max={2.0}
        step={0.1}
        onChange={setLightIntensity}
      />
      <button className="reset-view-btn" onClick={onResetView}>
        <RotateCcw size={14} />
        <span>重置视角</span>
      </button>
    </div>
  );
}
