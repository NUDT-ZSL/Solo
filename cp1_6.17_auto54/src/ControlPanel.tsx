import { useEffect, useRef, useState } from 'react';
import { ecoSimulator, EnvironmentParams, Achievement, GREEN_ZONE } from './EcoSimulator';

const SPECIES_COLORS = {
  algae: '#4CAF50',
  daphnia: '#FF9800',
  snail: '#8D6E63',
};

const RESOURCE_COLORS = {
  dissolvedOxygen: '#64B5F6',
  nutrients: '#FFD54F',
};

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}

function Slider({ label, value, min, max, step, unit = '', onChange }: SliderProps) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '6px',
          color: '#B0BEC5',
          fontSize: '13px',
        }}
      >
        <span>{label}</span>
        <span style={{ color: '#FFD54F', fontWeight: 'bold' }}>
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          height: '6px',
          borderRadius: '3px',
          background: '#37474F',
          outline: 'none',
          appearance: 'none',
          cursor: 'pointer',
        }}
        onMouseDown={(e) => {
          (e.target as HTMLInputElement).style.accentColor = '#FFD54F';
        }}
      />
    </div>
  );
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const renderIcon = (icon: string) => {
    switch (icon) {
      case 'master':
        return (
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" fill="#2D4A3E" />
            <path
              d="M20 8 L24 16 L32 17 L26 23 L28 31 L20 27 L12 31 L14 23 L8 17 L16 16 Z"
              fill="#FFD54F"
            />
            <circle cx="20" cy="20" r="6" fill="#FFF8E1" />
          </svg>
        );
      case 'first':
        return (
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" fill="#2D4A3E" />
            <text x="20" y="26" textAnchor="middle" fill="#FFD54F" fontSize="20" fontWeight="bold">
              1
            </text>
          </svg>
        );
      case 'survivor':
        return (
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" fill="#2D4A3E" />
            <path
              d="M20 10 L20 30 M15 15 L20 10 L25 15 M13 25 L20 30 L27 25"
              stroke="#66BB6A"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        );
      default:
        return (
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" fill="#2D4A3E" />
          </svg>
        );
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '12px',
        transition: 'transform 0.25s ease',
        cursor: 'pointer',
      }}
      className="achievement-card"
      onMouseEnter={(e) => {
        const card = e.currentTarget;
        card.style.transform = 'scale(1.05) rotate(15deg)';
      }}
      onMouseLeave={(e) => {
        const card = e.currentTarget;
        card.style.transform = 'scale(1) rotate(0deg)';
      }}
    >
      <div
        style={{
          borderRadius: '16px',
          overflow: 'hidden',
          background: '#2D4A3E',
          flexShrink: 0,
        }}
      >
        {renderIcon(achievement.icon)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: '#FFD54F',
            fontWeight: 'bold',
            fontSize: '14px',
            marginBottom: '2px',
          }}
        >
          {achievement.name}
        </div>
        <div style={{ color: '#90A4AE', fontSize: '11px' }}>{achievement.description}</div>
        <div style={{ color: '#607D8B', fontSize: '10px', marginTop: '4px' }}>
          第 {achievement.unlockedAt} 时间步达成
        </div>
      </div>
    </div>
  );
}

export default function ControlPanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [env, setEnv] = useState<EnvironmentParams>(ecoSimulator.getEnvironment());
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showAchievements, setShowAchievements] = useState(false);
  const [timeStep, setTimeStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [species, setSpecies] = useState(ecoSimulator.getSpecies());
  const [resources, setResources] = useState(ecoSimulator.getResources());
  const [isSteady, setIsSteady] = useState(false);
  const [steadyCounter, setSteadyCounter] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const updateState = () => {
      setSpecies(ecoSimulator.getSpecies());
      setResources(ecoSimulator.getResources());
      setEnv(ecoSimulator.getEnvironment());
      setAchievements(ecoSimulator.getAchievements());
      setTimeStep(ecoSimulator.getTimeStep());
      setIsSteady(ecoSimulator.isSteadyState());
      setSteadyCounter(ecoSimulator.getSteadyStateCounter());
    };

    updateState();
    const unsubscribe = ecoSimulator.subscribe(updateState);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        ecoSimulator.step();
      }, 500);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = 180;

      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      const history = ecoSimulator.getHistory();
      if (history.length < 2) {
        ctx.fillStyle = '#1E1E2E';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#607D8B';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('启动模拟后显示数据', width / 2, height / 2);
        return;
      }

      ctx.fillStyle = '#1E1E2E';
      ctx.fillRect(0, 0, width, height);

      const padding = { top: 10, right: 10, bottom: 20, left: 35 };
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

      const allValues = history.flatMap((h) => [h.species.algae, h.species.daphnia, h.species.snail]);
      const maxVal = Math.max(...allValues, 10) * 1.1;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        const val = Math.round(maxVal - (maxVal / 4) * i);
        ctx.fillStyle = '#607D8B';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(val.toString(), padding.left - 4, y + 3);
      }

      const drawLine = (key: 'algae' | 'daphnia' | 'snail', color: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        history.forEach((h, i) => {
          const x = padding.left + (i / (history.length - 1)) * chartWidth;
          const y = padding.top + chartHeight - (h.species[key] / maxVal) * chartHeight;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
      };

      drawLine('algae', SPECIES_COLORS.algae);
      drawLine('daphnia', SPECIES_COLORS.daphnia);
      drawLine('snail', SPECIES_COLORS.snail);

      ctx.fillStyle = '#4CAF50';
      ctx.beginPath();
      ctx.arc(padding.left + chartWidth, padding.top + chartHeight - (species.algae / maxVal) * chartHeight, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FF9800';
      ctx.beginPath();
      ctx.arc(padding.left + chartWidth, padding.top + chartHeight - (species.daphnia / maxVal) * chartHeight, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#8D6E63';
      ctx.beginPath();
      ctx.arc(padding.left + chartWidth, padding.top + chartHeight - (species.snail / maxVal) * chartHeight, 4, 0, Math.PI * 2);
      ctx.fill();
    };

    draw();

    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);

    const unsubscribe = ecoSimulator.subscribe(draw);

    return () => {
      window.removeEventListener('resize', handleResize);
      unsubscribe();
    };
  }, [species.algae, species.daphnia, species.snail]);

  const handleSliderChange = (key: keyof EnvironmentParams, value: number) => {
    ecoSimulator.setEnvironment({ [key]: value });
  };

  const handleStep = () => {
    ecoSimulator.step();
  };

  const handleReset = () => {
    setIsRunning(false);
    ecoSimulator.reset();
  };

  const getResourceStatus = (value: number, zone: { min: number; max: number }) => {
    if (value < zone.min) return 'low';
    if (value > zone.max) return 'high';
    return 'good';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return '#66BB6A';
      case 'low':
        return '#FF5252';
      case 'high':
        return '#FFD54F';
      default:
        return '#B0BEC5';
    }
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#263238',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.3)',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h2 style={{ color: '#FFD54F', fontSize: '18px', margin: 0 }}>控制面板</h2>
        <div style={{ color: '#90A4AE', fontSize: '12px' }}>时间步: {timeStep}</div>
      </div>

      {isSteady && (
        <div
          style={{
            background: 'rgba(76, 175, 80, 0.2)',
            border: '1px solid #66BB6A',
            borderRadius: '8px',
            padding: '8px 12px',
            marginBottom: '16px',
            color: '#66BB6A',
            fontSize: '13px',
            textAlign: 'center',
          }}
        >
          ✨ 生态稳态中（连续 {steadyCounter} 步）
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <div style={{ color: '#B0BEC5', fontSize: '13px', marginBottom: '8px' }}>模拟控制</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setIsRunning(!isRunning)}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '6px',
              background: isRunning ? '#FF5252' : '#66BB6A',
              color: 'white',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            {isRunning ? '暂停' : '开始'}
          </button>
          <button
            onClick={handleStep}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '6px',
              background: '#37474F',
              color: 'white',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            单步
          </button>
          <button
            onClick={handleReset}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '6px',
              background: '#546E7A',
              color: 'white',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            重置
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ color: '#B0BEC5', fontSize: '13px', marginBottom: '10px' }}>环境参数</div>
        <Slider
          label="光照强度"
          value={env.lightIntensity}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={(v) => handleSliderChange('lightIntensity', v)}
        />
        <Slider
          label="水交换率"
          value={env.waterExchangeRate}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={(v) => handleSliderChange('waterExchangeRate', v)}
        />
        <Slider
          label="投喂量"
          value={env.feedingAmount}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={(v) => handleSliderChange('feedingAmount', v)}
        />
        <Slider
          label="清洁频率"
          value={env.cleaningFrequency}
          min={0}
          max={5}
          step={1}
          unit="次/周期"
          onChange={(v) => handleSliderChange('cleaningFrequency', v)}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ color: '#B0BEC5', fontSize: '13px', marginBottom: '10px' }}>种群数量</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '6px 10px',
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '6px',
            }}
          >
            <span style={{ color: SPECIES_COLORS.algae, fontSize: '13px' }}>● 绿藻</span>
            <span style={{ color: '#ECEFF1', fontSize: '13px', fontWeight: 'bold' }}>
              {Math.round(species.algae)}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '6px 10px',
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '6px',
            }}
          >
            <span style={{ color: SPECIES_COLORS.daphnia, fontSize: '13px' }}>● 水蚤</span>
            <span style={{ color: '#ECEFF1', fontSize: '13px', fontWeight: 'bold' }}>
              {Math.round(species.daphnia)}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '6px 10px',
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '6px',
            }}
          >
            <span style={{ color: SPECIES_COLORS.snail, fontSize: '13px' }}>● 蜗牛</span>
            <span style={{ color: '#ECEFF1', fontSize: '13px', fontWeight: 'bold' }}>
              {Math.round(species.snail)}
            </span>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ color: '#B0BEC5', fontSize: '13px', marginBottom: '10px' }}>资源状态</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '6px 10px',
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '6px',
            }}
          >
            <span style={{ color: RESOURCE_COLORS.dissolvedOxygen, fontSize: '13px' }}>💧 溶氧</span>
            <span
              style={{
                color: getStatusColor(getResourceStatus(resources.dissolvedOxygen, GREEN_ZONE.dissolvedOxygen)),
                fontSize: '13px',
                fontWeight: 'bold',
              }}
            >
              {resources.dissolvedOxygen.toFixed(1)} mg/L
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '6px 10px',
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '6px',
            }}
          >
            <span style={{ color: RESOURCE_COLORS.nutrients, fontSize: '13px' }}>🌱 养分</span>
            <span
              style={{
                color: getStatusColor(getResourceStatus(resources.nutrients, GREEN_ZONE.nutrients)),
                fontSize: '13px',
                fontWeight: 'bold',
              }}
            >
              {resources.nutrients.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ color: '#B0BEC5', fontSize: '13px', marginBottom: '10px' }}>
          种群变化趋势（近50步）
        </div>
        <div ref={containerRef} style={{ width: '100%' }}>
          <canvas ref={canvasRef} style={{ display: 'block', borderRadius: '8px' }} />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
            marginTop: '8px',
            fontSize: '11px',
          }}
        >
          <span style={{ color: SPECIES_COLORS.algae }}>● 绿藻</span>
          <span style={{ color: SPECIES_COLORS.daphnia }}>● 水蚤</span>
          <span style={{ color: SPECIES_COLORS.snail }}>● 蜗牛</span>
        </div>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <button
          onClick={() => setShowAchievements(!showAchievements)}
          style={{
            width: '100%',
            padding: '10px',
            border: 'none',
            borderRadius: '6px',
            background: '#2D4A3E',
            color: '#FFD54F',
            fontSize: '13px',
            cursor: 'pointer',
            marginBottom: showAchievements ? '12px' : '0',
            fontWeight: 'bold',
          }}
        >
          🏆 成就列表 ({achievements.length}/3)
        </button>

        {showAchievements && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {achievements.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  color: '#607D8B',
                  fontSize: '12px',
                  padding: '16px',
                }}
              >
                暂无成就，开始模拟吧！
              </div>
            ) : (
              achievements.map((a) => <AchievementCard key={a.id} achievement={a} />)
            )}
          </div>
        )}
      </div>

      <style>{`
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #FFD54F;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          transition: transform 0.15s;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        input[type="range"]::-webkit-slider-thumb:active {
          transform: scale(1.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #FFD54F;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }
        .achievement-card:hover {
          transform: scale(1.05) rotate(15deg);
        }
      `}</style>
    </div>
  );
}
