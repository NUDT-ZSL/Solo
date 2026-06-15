import React from 'react';
import type {
  FractalParams,
  Julia3DParams,
  SphereHole,
  SliceConfig,
} from '../types';
import {
  Sparkles,
  Sliders,
  Sphere,
  Grid3X3,
  Trash2,
  Plus,
  X,
  Camera,
  Box,
  CircleDot,
} from 'lucide-react';

interface ControlPanelProps {
  fractalParams: FractalParams;
  juliaParams: Julia3DParams;
  onParamsChange: (key: keyof FractalParams, value: number | string) => void;
  onAlgorithmChange: (algorithm: FractalParams['algorithm']) => void;
  onJuliaParamsChange: (key: keyof Julia3DParams, value: number) => void;
  sphereHoles: SphereHole[];
  holeRadius: number;
  onHoleRadiusChange: (r: number) => void;
  onAddHole: () => void;
  onRemoveHole: (id: string) => void;
  onClearHoles: () => void;
  sliceConfig: SliceConfig | null;
  onSliceChange: (config: Partial<SliceConfig>) => void;
  onExportScreenshot: () => void;
  onExportOBJ: () => void;
  isComputing: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  fractalParams,
  juliaParams,
  onParamsChange,
  onAlgorithmChange,
  onJuliaParamsChange,
  sphereHoles,
  holeRadius,
  onHoleRadiusChange,
  onAddHole,
  onRemoveHole,
  onClearHoles,
  sliceConfig,
  onSliceChange,
  onExportScreenshot,
  onExportOBJ,
  isComputing,
}) => {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Sparkles size={20} style={styles.headerIcon} />
        <div>
          <div style={styles.headerTitle}>三维分形控制台</div>
          <div style={styles.headerSubtitle}>3D Fractal Explorer</div>
        </div>
      </div>

      <Section title="分形算法" icon={<Sparkles size={14} />} defaultOpen>
        <div style={styles.algorithmTabs}>
          <button
            style={{
              ...styles.tabBtn,
              ...(fractalParams.algorithm === 'mandelbulb' ? styles.tabBtnActive : {}),
            }}
            onClick={() => onAlgorithmChange('mandelbulb')}
            disabled={isComputing}
          >
            Mandelbulb
          </button>
          <button
            style={{
              ...styles.tabBtn,
              ...(fractalParams.algorithm === 'julia3d' ? styles.tabBtnActive : {}),
            }}
            onClick={() => onAlgorithmChange('julia3d')}
            disabled={isComputing}
          >
            Julia 3D
          </button>
        </div>
      </Section>

      <Section title="核心参数" icon={<Sliders size={14} />} defaultOpen>
        <Slider
          label="迭代次数"
          value={fractalParams.iterations}
          min={5}
          max={30}
          step={1}
          unit="次"
          onChange={(v) => onParamsChange('iterations', v)}
          disabled={isComputing}
        />
        <Slider
          label="幂次 Power"
          value={fractalParams.power}
          min={2}
          max={8}
          step={1}
          onChange={(v) => onParamsChange('power', v)}
          disabled={isComputing}
        />
        <Slider
          label="逃逸半径"
          value={fractalParams.escapeRadius}
          min={1}
          max={4}
          step={0.1}
          unit="R"
          onChange={(v) => onParamsChange('escapeRadius', v)}
          disabled={isComputing}
          fixed={1}
        />
        <Slider
          label="网格分辨率"
          value={fractalParams.resolution}
          min={40}
          max={120}
          step={5}
          unit="³"
          onChange={(v) => onParamsChange('resolution', v)}
          disabled={isComputing}
        />
      </Section>

      {fractalParams.algorithm === 'julia3d' && (
        <Section title="Julia 参数" icon={<CircleDot size={14} />}>
          <Slider
            label="Cx"
            value={juliaParams.cX}
            min={-1}
            max={1}
            step={0.01}
            onChange={(v) => onJuliaParamsChange('cX', v)}
            disabled={isComputing}
            fixed={2}
          />
          <Slider
            label="Cy"
            value={juliaParams.cY}
            min={-1}
            max={1}
            step={0.01}
            onChange={(v) => onJuliaParamsChange('cY', v)}
            disabled={isComputing}
            fixed={2}
          />
          <Slider
            label="Cz"
            value={juliaParams.cZ}
            min={-1}
            max={1}
            step={0.01}
            onChange={(v) => onJuliaParamsChange('cZ', v)}
            disabled={isComputing}
            fixed={2}
          />
          <Slider
            label="Cw"
            value={juliaParams.cW}
            min={-1}
            max={1}
            step={0.01}
            onChange={(v) => onJuliaParamsChange('cW', v)}
            disabled={isComputing}
            fixed={2}
          />
        </Section>
      )}

      <Section title="球体空洞" icon={<Sphere size={14} />}>
        <Slider
          label="空洞半径"
          value={holeRadius}
          min={0.05}
          max={0.6}
          step={0.01}
          unit="R"
          onChange={onHoleRadiusChange}
          disabled={isComputing}
          fixed={2}
        />
        <div style={styles.holeRow}>
          <button style={{ ...styles.btn, ...styles.btnPrimary, flex: 1 }} onClick={onAddHole}>
            <Plus size={14} />
            <span>中心添加空洞</span>
          </button>
          <button
            style={{ ...styles.btn, ...styles.btnDanger, opacity: sphereHoles.length ? 1 : 0.5 }}
            onClick={onClearHoles}
            disabled={!sphereHoles.length}
          >
            <Trash2 size={14} />
          </button>
        </div>
        <div style={styles.hintText}>
          提示：在三维视口中单击任意位置也可添加球体空洞
        </div>
        {sphereHoles.length > 0 && (
          <div style={styles.holeList}>
            {sphereHoles.map((hole, idx) => (
              <div key={hole.id} style={styles.holeItem}>
                <span style={styles.holeIndex}>#{idx + 1}</span>
                <span style={styles.holeInfo}>
                  ({hole.center.x.toFixed(2)}, {hole.center.y.toFixed(2)},{' '}
                  {hole.center.z.toFixed(2)}) r={hole.radius.toFixed(2)}
                </span>
                <button style={styles.holeRemove} onClick={() => onRemoveHole(hole.id)}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="平面切片" icon={<Grid3X3 size={14} />}>
        <div style={styles.sliceRow}>
          {(['x', 'y', 'z'] as const).map((axis) => {
            const active = sliceConfig?.axis === axis && sliceConfig?.enabled;
            return (
              <button
                key={axis}
                style={{
                  ...styles.axisBtn,
                  ...(active ? styles.axisBtnActive : {}),
                }}
                onClick={() => {
                  if (active) {
                    onSliceChange({ enabled: false });
                  } else {
                    onSliceChange({
                      axis,
                      enabled: true,
                      position: sliceConfig?.axis !== axis ? 0 : sliceConfig.position,
                    });
                  }
                }}
              >
                {axis.toUpperCase()}轴
              </button>
            );
          })}
        </div>
        {sliceConfig?.enabled && (
          <Slider
            label={`${sliceConfig.axis.toUpperCase()}轴 切片位置`}
            value={sliceConfig.position}
            min={-1}
            max={1}
            step={0.01}
            onChange={(v) => onSliceChange({ position: v })}
            fixed={2}
          />
        )}
        <div style={styles.hintText}>
          切片平面以彩色编码密度分布（蓝→绿→黄→红）
        </div>
      </Section>

      <Section title="导出" icon={<Box size={14} />}>
        <div style={styles.exportRow}>
          <button style={{ ...styles.btn, ...styles.btnExport }} onClick={onExportScreenshot}>
            <Camera size={15} />
            <div style={styles.btnContent}>
              <div style={styles.btnMain}>截图 PNG</div>
              <div style={styles.btnSub}>1920 × 1080</div>
            </div>
          </button>
          <button style={{ ...styles.btn, ...styles.btnExport }} onClick={onExportOBJ}>
            <Box size={15} />
            <div style={styles.btnContent}>
              <div style={styles.btnMain}>模型 OBJ</div>
              <div style={styles.btnSub}>体素网格</div>
            </div>
          </button>
        </div>
      </Section>
    </div>
  );
};

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const Section: React.FC<SectionProps> = ({ title, icon, children, defaultOpen = false }) => {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader} onClick={() => setOpen((o) => !o)}>
        <div style={styles.sectionTitle}>
          <span style={{ color: '#e94560' }}>{icon}</span>
          <span>{title}</span>
        </div>
        <span style={{ ...styles.caret, transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
      </div>
      <div
        style={{
          ...styles.sectionBody,
          maxHeight: open ? 1200 : 0,
          opacity: open ? 1 : 0,
          paddingTop: open ? 12 : 0,
          paddingBottom: open ? 16 : 0,
        }}
      >
        {children}
      </div>
    </div>
  );
};

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  fixed?: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}

const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step,
  unit,
  fixed,
  disabled,
  onChange,
}) => {
  return (
    <div style={{ ...styles.sliderWrap, opacity: disabled ? 0.5 : 1 }}>
      <div style={styles.sliderLabelRow}>
        <span style={styles.sliderLabel}>{label}</span>
        <span style={styles.sliderValue}>
          {fixed !== undefined ? value.toFixed(fixed) : value}
          {unit || ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={styles.slider}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    userSelect: 'none',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '4px 4px 16px 4px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    marginBottom: 8,
  },
  headerIcon: {
    color: '#e94560',
    filter: 'drop-shadow(0 0 6px rgba(233,69,96,0.5))',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#fff',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    fontFamily: "'JetBrains Mono', monospace",
    marginTop: 2,
  },
  section: {
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  caret: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.4)',
    transition: 'transform 0.25s ease',
  },
  sectionBody: {
    overflow: 'hidden',
    transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    paddingLeft: 4,
    paddingRight: 4,
  },
  algorithmTabs: {
    display: 'flex',
    background: 'rgba(0,0,0,0.25)',
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    padding: '10px 12px',
    borderRadius: 7,
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: "'JetBrains Mono', monospace",
  },
  tabBtnActive: {
    background: 'linear-gradient(135deg, rgba(233,69,96,0.85), rgba(233,69,96,0.6))',
    color: '#fff',
    boxShadow: '0 2px 16px rgba(233,69,96,0.35)',
    transform: 'scale(1.02)',
  },
  sliderWrap: {
    transition: 'opacity 0.2s ease',
  },
  sliderLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  sliderLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: 500,
  },
  sliderValue: {
    fontSize: 11,
    color: '#e94560',
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 600,
    background: 'rgba(233,69,96,0.1)',
    padding: '2px 8px',
    borderRadius: 5,
    minWidth: 50,
    textAlign: 'center',
  },
  slider: {
    width: '100%',
  },
  holeRow: {
    display: 'flex',
    gap: 8,
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    fontSize: 12,
    fontWeight: 500,
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: 'rgba(255,255,255,0.04)',
    fontFamily: 'inherit',
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, rgba(233,69,96,0.8), rgba(233,69,96,0.6))',
    border: 'none',
    boxShadow: '0 2px 14px rgba(233,69,96,0.3)',
  },
  btnDanger: {
    background: 'rgba(255,80,80,0.12)',
    border: '1px solid rgba(255,80,80,0.2)',
    color: '#ff9090',
  },
  btnExport: {
    flex: 1,
    justifyContent: 'flex-start',
    gap: 10,
    padding: '12px 14px',
    background: 'linear-gradient(135deg, rgba(15,52,96,0.7), rgba(15,52,96,0.4))',
    border: '1px solid rgba(99,102,241,0.25)',
  },
  btnContent: {
    textAlign: 'left',
  },
  btnMain: {
    fontSize: 12,
    fontWeight: 600,
    color: '#fff',
  },
  btnSub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
    fontFamily: "'JetBrains Mono', monospace",
  },
  hintText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    fontStyle: 'italic',
    marginTop: 6,
    paddingLeft: 4,
    lineHeight: 1.5,
  },
  holeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    marginTop: 8,
    maxHeight: 130,
    overflowY: 'auto',
    paddingRight: 2,
  },
  holeItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 10px',
    background: 'rgba(233,69,96,0.08)',
    border: '1px solid rgba(233,69,96,0.15)',
    borderRadius: 7,
  },
  holeIndex: {
    fontSize: 10,
    fontWeight: 700,
    color: '#e94560',
    fontFamily: "'JetBrains Mono', monospace",
    minWidth: 22,
  },
  holeInfo: {
    flex: 1,
    fontSize: 10,
    color: 'rgba(255,255,255,0.65)',
    fontFamily: "'JetBrains Mono', monospace",
  },
  holeRemove: {
    width: 22,
    height: 22,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,80,80,0.15)',
    border: 'none',
    color: '#ff9090',
    borderRadius: 5,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  sliceRow: {
    display: 'flex',
    gap: 6,
    marginBottom: 12,
  },
  axisBtn: {
    flex: 1,
    padding: '9px 8px',
    borderRadius: 7,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: "'JetBrains Mono', monospace",
  },
  axisBtnActive: {
    background: 'linear-gradient(135deg, rgba(99,102,241,0.75), rgba(99,102,241,0.5))',
    border: '1px solid rgba(99,102,241,0.4)',
    color: '#fff',
    boxShadow: '0 2px 14px rgba(99,102,241,0.3)',
    transform: 'scale(1.03)',
  },
  exportRow: {
    display: 'flex',
    gap: 10,
  },
};

export default ControlPanel;
