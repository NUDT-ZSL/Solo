import { useEffect, useRef, useState, useCallback } from 'react';
import { eventBus, type EarthquakeParams, type PerformanceReport } from './eventBus';
import { WaveSimulator } from './waveSimulator';
import { Visualizer } from './visualizer';

const styles = {
  app: {
    width: '100%',
    height: '100%',
    position: 'relative' as const,
    background: '#0a0a12',
    overflow: 'hidden' as const,
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  canvasContainer: {
    width: '100%',
    height: '100%',
    position: 'absolute' as const,
    top: 0,
    left: 0
  },
  title: {
    position: 'absolute' as const,
    top: '24px',
    left: '24px',
    color: '#00d4ff',
    fontSize: '20px',
    fontWeight: 700,
    letterSpacing: '2px',
    textShadow: '0 0 20px rgba(0,212,255,0.5)',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  titleAccent: {
    color: '#ff6b35',
    textShadow: '0 0 20px rgba(255,107,53,0.5)'
  },
  perfPanel: {
    position: 'absolute' as const,
    top: '80px',
    left: '24px',
    background: 'rgba(0,0,0,0.5)',
    borderRadius: '6px',
    padding: '8px 12px',
    color: '#2ecc71',
    fontSize: '13px',
    fontFamily: 'monospace',
    zIndex: 10,
    backdropFilter: 'blur(8px)',
    lineHeight: '1.8',
    minWidth: '140px'
  },
  perfItem: {
    display: 'flex',
    justifyContent: 'space-between' as const,
    gap: '12px'
  },
  perfLabel: {
    color: 'rgba(46,204,113,0.7)'
  },
  perfValue: {
    fontWeight: 600
  },
  panel: {
    position: 'fixed' as const,
    top: '80px',
    right: '24px',
    width: '320px',
    background: 'rgba(20,20,30,0.9)',
    borderRadius: '12px',
    padding: '24px',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,107,53,0.2)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,212,255,0.05)',
    zIndex: 10,
    transition: 'all 0.3s ease'
  },
  panelTitle: {
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: 700,
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingBottom: '12px',
    borderBottom: '1px solid rgba(255,255,255,0.08)'
  },
  panelTitleDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#ff6b35',
    boxShadow: '0 0 10px #ff6b35',
    animation: 'pulse 2s infinite'
  },
  sliderGroup: {
    marginBottom: '18px'
  },
  sliderHeader: {
    display: 'flex',
    justifyContent: 'space-between' as const,
    alignItems: 'center',
    marginBottom: '8px'
  },
  sliderLabel: {
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 500
  },
  sliderValue: {
    color: '#00d4ff',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'monospace',
    background: 'rgba(0,212,255,0.08)',
    padding: '2px 8px',
    borderRadius: '4px'
  },
  slider: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    background: '#3a3a4a',
    outline: 'none',
    WebkitAppearance: 'none' as const,
    appearance: 'none' as const,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  button: {
    width: '100%',
    height: '44px',
    borderRadius: '8px',
    background: '#e74c3c',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 700,
    border: 'none',
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'all 0.2s ease',
    letterSpacing: '1px',
    textTransform: 'uppercase' as const,
    boxShadow: '0 4px 15px rgba(231,76,60,0.3)',
    position: 'relative' as const,
    overflow: 'hidden' as const
  },
  buttonHover: {
    background: '#c0392b',
    boxShadow: '0 4px 20px rgba(231,76,60,0.5), 0 0 30px rgba(231,76,60,0.2)'
  },
  buttonActive: {
    transform: 'scale(1.05)',
    transition: 'transform 0.1s ease'
  },
  buttonPulse: {
    animation: 'buttonPulse 0.3s ease'
  },
  mobilePanel: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    background: 'rgba(20,20,30,0.95)',
    borderRadius: '0 0 12px 12px',
    padding: '16px 20px',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(255,107,53,0.2)',
    zIndex: 10,
    maxHeight: '60vh',
    overflowY: 'auto' as const
  }
};

const sliderCss = `
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #f1c40f;
    cursor: pointer;
    border: 2px solid #fff;
    transition: all 0.2s ease;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  }
  input[type="range"]::-webkit-slider-thumb:hover {
    box-shadow: 0 0 8px rgba(241,196,15,0.6), 0 2px 6px rgba(0,0,0,0.3);
    transform: scale(1.1);
  }
  input[type="range"]::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #f1c40f;
    cursor: pointer;
    border: 2px solid #fff;
    transition: all 0.2s ease;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.2); }
  }
  @keyframes buttonPulse {
    0% { box-shadow: 0 0 0 0 rgba(231,76,60,0.6); }
    100% { box-shadow: 0 0 0 20px rgba(231,76,60,0); }
  }
  @media (max-width: 768px) {
    .desktop-panel { display: none !important; }
    .mobile-panel { display: block !important; }
    .perf-panel-mobile { top: auto !important; bottom: 16px !important; left: 16px !important; }
    .title-mobile { top: auto !important; bottom: 60px !important; left: 16px !important; font-size: 16px !important; }
  }
  @media (min-width: 769px) {
    .mobile-panel { display: none !important; }
  }
`;

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}

function Slider({ label, value, min, max, step, unit, onChange }: SliderProps) {
  return (
    <div style={styles.sliderGroup}>
      <div style={styles.sliderHeader}>
        <span style={styles.sliderLabel}>{label}</span>
        <span style={styles.sliderValue}>
          {value.toFixed(step < 1 ? 1 : 0)}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={styles.slider}
      />
    </div>
  );
}

function App() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const simulatorRef = useRef<WaveSimulator | null>(null);
  const visualizerRef = useRef<Visualizer | null>(null);
  const [longitude, setLongitude] = useState(0);
  const [latitude, setLatitude] = useState(0);
  const [magnitude, setMagnitude] = useState(5.0);
  const [depth, setDepth] = useState(10);
  const [fps, setFps] = useState(60);
  const [particleCount, setParticleCount] = useState(0);
  const [buttonHovered, setButtonHovered] = useState(false);
  const [buttonPressed, setButtonPressed] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 769);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.textContent = sliderCss;
    document.head.appendChild(styleTag);
    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    simulatorRef.current = new WaveSimulator();
    visualizerRef.current = new Visualizer(canvasRef.current);

    const handlePerformance = (data: PerformanceReport) => {
      setFps(data.fps);
      setParticleCount(data.particleCount);
    };
    eventBus.on('performance:report', handlePerformance);

    return () => {
      eventBus.off('performance:report', handlePerformance);
      simulatorRef.current?.destroy();
      visualizerRef.current?.destroy();
    };
  }, []);

  const handleTrigger = useCallback(() => {
    setButtonPressed(true);
    setShowPulse(true);
    setTimeout(() => setButtonPressed(false), 100);
    setTimeout(() => setShowPulse(false), 300);

    const params: EarthquakeParams = { longitude, latitude, magnitude, depth };
    eventBus.emit('earthquake:trigger', params);
  }, [longitude, latitude, magnitude, depth]);

  const buttonStyle = {
    ...styles.button,
    ...(buttonHovered ? styles.buttonHover : {}),
    ...(buttonPressed ? styles.buttonActive : {}),
    ...(showPulse ? styles.buttonPulse : {})
  };

  const PanelContent = () => (
    <>
      <div style={styles.panelTitle}>
        <span style={styles.panelTitleDot} />
        地震参数设置
      </div>
      <Slider
        label="经度 (Longitude)"
        value={longitude}
        min={-180}
        max={180}
        step={0.1}
        unit="°"
        onChange={setLongitude}
      />
      <Slider
        label="纬度 (Latitude)"
        value={latitude}
        min={-90}
        max={90}
        step={0.1}
        unit="°"
        onChange={setLatitude}
      />
      <Slider
        label="震级 (Magnitude)"
        value={magnitude}
        min={1.0}
        max={9.0}
        step={0.1}
        unit=""
        onChange={setMagnitude}
      />
      <Slider
        label="深度 (Depth)"
        value={depth}
        min={0}
        max={100}
        step={1}
        unit="km"
        onChange={setDepth}
      />
      <button
        style={buttonStyle}
        onClick={handleTrigger}
        onMouseEnter={() => setButtonHovered(true)}
        onMouseLeave={() => setButtonHovered(false)}
      >
        {buttonPressed ? '生成中...' : '生成震波'}
      </button>
    </>
  );

  return (
    <div style={styles.app}>
      <div ref={canvasRef} style={styles.canvasContainer} />

      <div className={isMobile ? 'title-mobile' : ''} style={styles.title}>
        Geo<span style={styles.titleAccent}>Wave</span>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 400, letterSpacing: '1px' }}>
          3D震波可视化
        </span>
      </div>

      <div className={isMobile ? 'perf-panel-mobile' : ''} style={styles.perfPanel}>
        <div style={styles.perfItem}>
          <span style={styles.perfLabel}>FPS</span>
          <span style={{
            ...styles.perfValue,
            color: fps >= 40 ? '#2ecc71' : fps >= 30 ? '#f1c40f' : '#e74c3c'
          }}>{fps}</span>
        </div>
        <div style={styles.perfItem}>
          <span style={styles.perfLabel}>PARTICLES</span>
          <span style={styles.perfValue}>{particleCount}</span>
        </div>
      </div>

      <div className="desktop-panel" style={styles.panel}>
        <PanelContent />
      </div>

      <div className="mobile-panel" style={styles.mobilePanel}>
        <PanelContent />
      </div>
    </div>
  );
}

export default App;
