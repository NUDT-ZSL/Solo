import { BRUSH_PRESETS, BrushPreset, TextureParams } from '../utils/textureEngine';

export interface BrushSelectorProps {
  selected: BrushPreset;
  customParams: Partial<TextureParams>;
  onSelectPreset: (preset: BrushPreset) => void;
  onParamChange: (key: keyof TextureParams, value: number) => void;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}

function Slider({ label, value, min, max, step, unit = '', onChange }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="slider-block">
      <div className="slider-label-row">
        <span className="slider-label">{label}</span>
        <span className="slider-value">{typeof value === 'number' ? value.toFixed(step < 1 ? 1 : 0) : value}{unit}</span>
      </div>
      <div className="slider-track-wrapper">
        <div className="slider-track" style={{ width: `${pct}%` }} />
        <input
          type="range"
          className="slider-input"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
      </div>
    </div>
  );
}

const presetIcons: Record<string, string> = {
  ink: '🌑',
  watercolor: '🎨',
  sand: '⏳',
  pencil: '✏️'
};

export default function BrushSelector({
  selected,
  customParams,
  onSelectPreset,
  onParamChange
}: BrushSelectorProps) {
  const density = customParams.density ?? selected.particleDensity;
  const radius = customParams.radius ?? selected.diffusionRadius;
  const opacityMax = customParams.opacityMax ?? selected.opacityRange[1];

  return (
    <div className="control-section">
      <div className="section-header">
        <span className="section-title">笔触风格</span>
      </div>
      <div className="brush-grid">
        {BRUSH_PRESETS.map(p => (
          <button
            key={p.id}
            className={`brush-card ${selected.id === p.id ? 'active' : ''}`}
            onClick={() => onSelectPreset(p)}
          >
            <div className="brush-icon" style={{
              background: `linear-gradient(135deg, ${p.colorPalette[0]}22, ${p.colorPalette[p.colorPalette.length - 1]}44)`
            }}>
              {presetIcons[p.id] || '🎨'}
            </div>
            <div className="brush-name">{p.name}</div>
            <div className="brush-dot" style={{
              background: `linear-gradient(90deg, ${p.colorPalette.slice(0, 4).join(', ')})`
            }} />
          </button>
        ))}
      </div>

      <div className="section-header margin-top">
        <span className="section-title">纹理参数</span>
        <button
          className="reset-btn"
          onClick={() => {
            onParamChange('density', selected.particleDensity);
            onParamChange('radius', selected.diffusionRadius);
            onParamChange('opacityMax', selected.opacityRange[1]);
          }}
        >
          重置
        </button>
      </div>

      <Slider
        label="粒子密度"
        value={density}
        min={20}
        max={100}
        step={1}
        unit="%"
        onChange={(v) => onParamChange('density', v)}
      />
      <Slider
        label="扩散半径"
        value={radius}
        min={2}
        max={12}
        step={0.5}
        unit="px"
        onChange={(v) => onParamChange('radius', v)}
      />
      <Slider
        label="最大透明度"
        value={opacityMax}
        min={0.3}
        max={1.0}
        step={0.05}
        onChange={(v) => onParamChange('opacityMax', v)}
      />
    </div>
  );
}
