import { CardParams } from './types';
import { getComplementaryColor } from './utils';
import './ControlPanel.css';

type LayoutMode = 'desktop' | 'tablet' | 'mobile';

interface ControlPanelProps {
  params: CardParams;
  onParamChange: <K extends keyof CardParams>(key: K, value: CardParams[K]) => void;
  layout: LayoutMode;
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

interface SliderConfig {
  key: keyof CardParams;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

const sliders: SliderConfig[] = [
  { key: 'gradientAngle', label: '渐变角度', min: 0, max: 360, step: 1, unit: '°' },
  { key: 'glowRadius', label: '光晕半径', min: 0, max: 100, step: 1, unit: 'px' },
  { key: 'glowOpacity', label: '光晕透明度', min: 0, max: 1, step: 0.01, unit: '' },
  { key: 'borderRadius', label: '卡片圆角', min: 0, max: 50, step: 1, unit: 'px' },
  { key: 'backdropBlur', label: '背景模糊', min: 0, max: 20, step: 1, unit: 'px' }
];

function ControlPanel({
  params,
  onParamChange,
  layout,
  collapsed,
  mobileOpen,
  onMobileClose
}: ControlPanelProps) {
  const complementaryColor = getComplementaryColor(params.baseColor);

  const panelClasses = [
    'control-panel',
    `layout-${layout}`,
    collapsed ? 'collapsed' : '',
    layout === 'mobile' && mobileOpen ? 'mobile-open' : ''
  ].filter(Boolean).join(' ');

  return (
    <aside className={panelClasses}>
      {layout === 'mobile' && (
        <div className="panel-header-mobile">
          <h2>参数调节</h2>
          <button className="close-btn" onClick={onMobileClose}>✕</button>
        </div>
      )}

      {layout !== 'mobile' && layout !== 'tablet' && (
        <div className="panel-title">
          <h2>参数调节</h2>
          <p className="panel-subtitle">调整以下参数实时预览效果</p>
        </div>
      )}

      <div className="panel-content">
        <div className="color-picker-group">
          <label className="control-label">
            <span className="label-text">基础色</span>
            <span className="label-value" style={{ color: params.baseColor }}>{params.baseColor}</span>
          </label>
          <div className="color-picker-wrapper">
            <input
              type="color"
              value={params.baseColor}
              onChange={(e) => onParamChange('baseColor', e.target.value)}
              className="color-picker"
            />
            <input
              type="text"
              value={params.baseColor}
              onChange={(e) => onParamChange('baseColor', e.target.value)}
              className="color-input"
              maxLength={7}
            />
          </div>
        </div>

        {sliders.map(({ key, label, min, max, step, unit }) => (
          <div key={key} className="slider-group">
            <label className="control-label">
              <span className="label-text">{label}</span>
              <span className="label-value">
                {typeof params[key] === 'number'
                  ? `${Number(params[key]).toFixed(key === 'glowOpacity' ? 2 : 0)}${unit}`
                  : params[key]}
              </span>
            </label>
            <div className="slider-wrapper">
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={params[key] as number}
                onChange={(e) => onParamChange(key, parseFloat(e.target.value) as CardParams[typeof key])}
                className="custom-slider"
                style={{
                  ['--track-color' as string]: complementaryColor,
                  ['--thumb-color' as string]: params.baseColor
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

export default ControlPanel;
