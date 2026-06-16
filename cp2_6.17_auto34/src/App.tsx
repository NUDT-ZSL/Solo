import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SimulationEngine } from './SimulationEngine';
import {
  JAR_WIDTH,
  JAR_HEIGHT,
  SOIL_HEIGHT,
  PANEL_WIDTH,
  SPECIES_COLORS,
  SPECIES_NAMES,
  SPECIES_SIZES,
  DEFAULT_ENVIRONMENT
} from './config';
import { Organism, Particle, SpeciesType, EcosystemConfig, EnvironmentParams } from './types';

const App: React.FC = () => {
  const [organisms, setOrganisms] = useState<Organism[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<EnvironmentParams>(DEFAULT_ENVIRONMENT);
  const [isPaused, setIsPaused] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [configText, setConfigText] = useState('');
  const [dragSpecies, setDragSpecies] = useState<SpeciesType | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [draggingOrganism, setDraggingOrganism] = useState<string | null>(null);
  const jarRef = useRef<SVGSVGElement>(null);
  const engineRef = useRef<SimulationEngine | null>(null);
  const [configError, setConfigError] = useState<string>('');

  useEffect(() => {
    const engine = new SimulationEngine(DEFAULT_ENVIRONMENT);
    engineRef.current = engine;

    const unsubscribe = engine.subscribe((state) => {
      setOrganisms(state.organisms);
      setParticles(state.particles);
    });

    engine.start();

    return () => {
      unsubscribe();
      engine.stop();
    };
  }, []);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setEnvironment(environment);
    }
  }, [environment]);

  const handleSliderChange = (key: keyof EnvironmentParams, value: number) => {
    setEnvironment(prev => ({ ...prev, [key]: value }));
  };

  const getJarCoordinates = (clientX: number, clientY: number): { x: number; y: number } | null => {
    if (!jarRef.current) return null;
    const rect = jarRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * JAR_WIDTH;
    const y = ((clientY - rect.top) / rect.height) * JAR_HEIGHT;
    if (x < 0 || x > JAR_WIDTH || y < 0 || y > JAR_HEIGHT) return null;
    return { x, y };
  };

  const handleSpeciesDragStart = (species: SpeciesType, e: React.MouseEvent) => {
    setDragSpecies(species);
    setSelectedId(null);
    const coords = getJarCoordinates(e.clientX, e.clientY);
    if (coords) {
      setDragPosition(coords);
    } else {
      setDragPosition({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragSpecies) {
      const coords = getJarCoordinates(e.clientX, e.clientY);
      if (coords) {
        setDragPosition(coords);
      } else {
        if (jarRef.current) {
          const rect = jarRef.current.getBoundingClientRect();
          setDragPosition({
            x: Math.max(0, Math.min(JAR_WIDTH, ((e.clientX - rect.left) / rect.width) * JAR_WIDTH)),
            y: Math.max(0, Math.min(JAR_HEIGHT, ((e.clientY - rect.top) / rect.height) * JAR_HEIGHT))
          });
        }
      }
    }
    if (draggingOrganism && engineRef.current && jarRef.current) {
      const coords = getJarCoordinates(e.clientX, e.clientY);
      if (coords) {
        const size = SPECIES_SIZES[organisms.find(o => o.id === draggingOrganism)?.species || 'plant'] / 2;
        const clampedX = Math.max(size, Math.min(JAR_WIDTH - size, coords.x));
        const clampedY = Math.max(size, Math.min(JAR_HEIGHT - size, coords.y));
        engineRef.current.moveOrganism(draggingOrganism, clampedX, clampedY);
      }
    }
  }, [dragSpecies, draggingOrganism, organisms]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (dragSpecies && engineRef.current) {
      const coords = getJarCoordinates(e.clientX, e.clientY);
      if (coords) {
        const size = SPECIES_SIZES[dragSpecies] / 2;
        const clampedX = Math.max(size, Math.min(JAR_WIDTH - size, coords.x));
        const clampedY = Math.max(size, Math.min(JAR_HEIGHT - size, coords.y));
        engineRef.current.addOrganism(dragSpecies, clampedX, clampedY);
      }
    }
    setDragSpecies(null);
    setDragPosition(null);
    setDraggingOrganism(null);
  }, [dragSpecies]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleOrganismClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedId(prev => prev === id ? null : id);
  };

  const handleOrganismMouseDown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggingOrganism(id);
    setSelectedId(id);
  };

  const handleJarClick = () => {
    setSelectedId(null);
  };

  const removeSelectedOrganism = () => {
    if (selectedId && engineRef.current) {
      engineRef.current.removeOrganism(selectedId);
      setSelectedId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
      removeSelectedOrganism();
    }
  };

  const togglePause = () => {
    if (engineRef.current) {
      if (isPaused) {
        engineRef.current.resume();
      } else {
        engineRef.current.pause();
      }
      setIsPaused(!isPaused);
    }
  };

  const openConfig = () => {
    if (engineRef.current) {
      setConfigText(JSON.stringify(engineRef.current.getConfig(), null, 2));
      setConfigError('');
      setShowConfig(true);
    }
  };

  const saveConfig = () => {
    try {
      const parsed = JSON.parse(configText) as EcosystemConfig;
      if (engineRef.current) {
        engineRef.current.setConfig(parsed);
        setConfigError('');
        setShowConfig(false);
      }
    } catch (err) {
      setConfigError('JSON 格式错误: ' + (err as Error).message);
    }
  };

  const renderOrganism = (org: Organism) => {
    const size = SPECIES_SIZES[org.species];
    const halfSize = size / 2;
    const isLowHealth = org.health < 20;
    const isSelected = selectedId === org.id;
    const color = SPECIES_COLORS[org.species];

    return (
      <g
        key={org.id}
        transform={`translate(${org.x}, ${org.y})`}
        style={{
          cursor: draggingOrganism === org.id ? 'grabbing' : 'grab',
          animation: org.isNew ? 'bounce 0.3s ease-out' : undefined
        }}
        onClick={(e) => handleOrganismClick(org.id, e)}
        onMouseDown={(e) => handleOrganismMouseDown(org.id, e)}
      >
        {isSelected && (
          <circle
            r={halfSize + 4}
            fill="none"
            stroke="#ffd54f"
            strokeWidth="2"
            style={{ filter: 'drop-shadow(0 0 4px #ffd54f)' }}
          />
        )}
        <rect
          x={-halfSize}
          y={-halfSize}
          width={size}
          height={size}
          rx={size * 0.25}
          fill={color}
          style={{
            filter: isLowHealth ? 'drop-shadow(0 0 6px #ff0000)' : `drop-shadow(0 2px 4px rgba(0,0,0,0.3))`,
            animation: isLowHealth ? 'blink 0.5s infinite' : undefined
          }}
        />
        {org.species === 'plant' && (
          <line x1="0" y1={-halfSize + 3} x2="0" y2={halfSize - 3} stroke="#2e7d32" strokeWidth="2" />
        )}
        {org.species === 'fungus' && (
          <>
            <ellipse cx="0" cy={-size * 0.15} rx={size * 0.3} ry={size * 0.2} fill="#8d6e63" />
            <line x1="0" y1={-size * 0.15} x2="0" y2={halfSize - 3} stroke="#8d6e63" strokeWidth="2" />
          </>
        )}
        {org.species === 'decomposer' && (
          <>
            <circle cx={-size * 0.2} cy={-size * 0.1} r={size * 0.1} fill="#bf360c" />
            <circle cx={size * 0.15} cy={size * 0.05} r={size * 0.08} fill="#bf360c" />
          </>
        )}
        <rect
          x={-halfSize}
          y={halfSize + 3}
          width={size}
          height={3}
          fill="#e0e0e0"
          rx={1.5}
        />
        <rect
          x={-halfSize}
          y={halfSize + 3}
          width={size * (org.health / 100)}
          height={3}
          fill={org.health < 20 ? '#f44336' : org.health < 50 ? '#ff9800' : '#4caf50'}
          rx={1.5}
        />
      </g>
    );
  };

  const renderParticle = (p: Particle) => {
    const opacity = 1 - p.life / p.maxLife;
    return (
      <circle
        key={p.id}
        cx={p.x}
        cy={p.y}
        r={p.size * opacity}
        fill={p.color}
        opacity={opacity}
      />
    );
  };

  const renderSpeciesPanelItem = (species: SpeciesType) => {
    const size = 28;
    const color = SPECIES_COLORS[species];
    return (
      <div
        key={species}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '10px 4px',
          cursor: 'grab',
          userSelect: 'none',
          borderRadius: 8,
          transition: 'background 0.2s',
          background: dragSpecies === species ? 'rgba(255,213,79,0.3)' : 'transparent'
        }}
        onMouseDown={(e) => handleSpeciesDragStart(species, e)}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <rect
            x={0}
            y={0}
            width={size}
            height={size}
            rx={size * 0.25}
            fill={color}
            style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }}
          />
        </svg>
        <span style={{ fontSize: 12, color: '#333', marginTop: 4 }}>{SPECIES_NAMES[species]}</span>
      </div>
    );
  };

  const sliderStyle = {
    width: '100%',
    cursor: 'pointer'
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f0f0f0',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 20
      }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <style>{`
        @keyframes bounce {
          0% { transform: translate(var(--bx), var(--by)) scale(1.3); }
          50% { transform: translate(var(--bx), var(--by)) scale(0.9); }
          100% { transform: translate(var(--bx), var(--by)) scale(1); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          background: #ddd;
          border-radius: 3px;
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          background: #2e7d32;
          border-radius: 50%;
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #2e7d32;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
      `}</style>

      <div style={{
        width: JAR_WIDTH + PANEL_WIDTH + 40,
        background: '#2e7d32',
        color: 'white',
        padding: '12px 20px',
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>🌱 地下生态循环模拟器</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={togglePause}
            style={{
              padding: '6px 14px',
              border: 'none',
              borderRadius: 6,
              background: isPaused ? '#4caf50' : '#ff9800',
              color: 'white',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500
            }}
          >
            {isPaused ? '▶ 继续' : '⏸ 暂停'}
          </button>
          <button
            onClick={openConfig}
            style={{
              padding: '6px 14px',
              border: 'none',
              borderRadius: 6,
              background: '#1976d2',
              color: 'white',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500
            }}
          >
            ⚙ 配置
          </button>
          <button
            onClick={removeSelectedOrganism}
            disabled={!selectedId}
            style={{
              padding: '6px 14px',
              border: 'none',
              borderRadius: 6,
              background: selectedId ? '#d32f2f' : '#888',
              color: 'white',
              cursor: selectedId ? 'pointer' : 'not-allowed',
              fontSize: 13,
              fontWeight: 500
            }}
          >
            🗑 移除
          </button>
        </div>
      </div>

      <div style={{
        display: 'flex',
        position: 'relative',
        background: '#fafafa',
        padding: 20,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <div style={{ position: 'relative' }}>
          <svg
            ref={jarRef}
            width={JAR_WIDTH}
            height={JAR_HEIGHT}
            style={{
              borderRadius: 12,
              border: '3px solid #8d6e63',
              boxShadow: 'inset 0 0 30px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.15)',
              display: 'block',
              cursor: dragSpecies ? 'copy' : 'default'
            }}
            onClick={handleJarClick}
          >
            <defs>
              <linearGradient id="jarBg" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#b3e5fc" />
                <stop offset="100%" stopColor="#6d4c41" />
              </linearGradient>
              <linearGradient id="soilBg" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#795548" />
                <stop offset="100%" stopColor="#4e342e" />
              </linearGradient>
              <filter id="glassEffect">
                <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="1" result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="1" />
              </filter>
            </defs>

            <rect x={0} y={0} width={JAR_WIDTH} height={JAR_HEIGHT} fill="url(#jarBg)" />

            <rect
              x={0}
              y={JAR_HEIGHT - SOIL_HEIGHT}
              width={JAR_WIDTH}
              height={SOIL_HEIGHT}
              fill="url(#soilBg)"
            />
            
            {Array.from({ length: 20 }).map((_, i) => (
              <circle
                key={i}
                cx={Math.random() * JAR_WIDTH}
                cy={JAR_HEIGHT - SOIL_HEIGHT + 10 + Math.random() * 35}
                r={1 + Math.random() * 2}
                fill="#3e2723"
                opacity={0.5}
              />
            ))}

            {particles.map(renderParticle)}
            {organisms.map(renderOrganism)}

            {dragSpecies && dragPosition && (
              <g transform={`translate(${dragPosition.x}, ${dragPosition.y})`} opacity={0.5}>
                <rect
                  x={-SPECIES_SIZES[dragSpecies] / 2}
                  y={-SPECIES_SIZES[dragSpecies] / 2}
                  width={SPECIES_SIZES[dragSpecies]}
                  height={SPECIES_SIZES[dragSpecies]}
                  rx={SPECIES_SIZES[dragSpecies] * 0.25}
                  fill={SPECIES_COLORS[dragSpecies]}
                />
              </g>
            )}
          </svg>

          <div style={{
            position: 'absolute',
            top: 10,
            left: 10,
            fontSize: 11,
            color: organisms.length >= 60 ? '#f44336' : 'rgba(255,255,255,0.8)',
            background: 'rgba(0,0,0,0.3)',
            padding: '4px 8px',
            borderRadius: 4
          }}>
            生物: {organisms.length} / 60
          </div>
        </div>

        <div style={{
          width: PANEL_WIDTH,
          marginLeft: 16,
          background: 'rgba(255,255,255,0.5)',
          backdropFilter: 'blur(10px)',
          borderRadius: 12,
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 4, textAlign: 'center' }}>
            物种面板
          </div>
          {(['plant', 'fungus', 'decomposer'] as SpeciesType[]).map(renderSpeciesPanelItem)}
          <div style={{ fontSize: 10, color: '#666', marginTop: 8, textAlign: 'center', lineHeight: 1.4 }}>
            拖拽到罐子中<br />点击选中后可删除
          </div>
        </div>
      </div>

      <div style={{
        width: JAR_WIDTH + PANEL_WIDTH + 40,
        marginTop: 20,
        background: '#fff',
        padding: 20,
        borderRadius: 12,
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
      }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>☀ 光照强度</label>
            <span style={{ fontSize: 13, color: '#666' }}>{environment.light} lux</span>
          </div>
          <input
            type="range"
            min={0}
            max={1000}
            value={environment.light}
            onChange={(e) => handleSliderChange('light', parseInt(e.target.value))}
            style={sliderStyle}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>🌡 温度</label>
            <span style={{ fontSize: 13, color: '#666' }}>{environment.temperature}°C</span>
          </div>
          <input
            type="range"
            min={15}
            max={35}
            value={environment.temperature}
            onChange={(e) => handleSliderChange('temperature', parseInt(e.target.value))}
            style={sliderStyle}
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>💧 湿度</label>
            <span style={{ fontSize: 13, color: '#666' }}>{environment.humidity}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={environment.humidity}
            onChange={(e) => handleSliderChange('humidity', parseInt(e.target.value))}
            style={sliderStyle}
          />
        </div>
      </div>

      {showConfig && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowConfig(false)}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 24,
            width: 500,
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: 0, color: '#2e7d32' }}>生态关系参数配置</h3>
            <p style={{ fontSize: 12, color: '#666', margin: 0 }}>
              修改各物种的最佳环境参数和物种间影响系数。暂停时修改更安全。
            </p>
            <textarea
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              style={{
                width: '100%',
                height: 350,
                fontFamily: 'monospace',
                fontSize: 12,
                padding: 12,
                borderRadius: 8,
                border: '1px solid #ddd',
                resize: 'none',
                boxSizing: 'border-box'
              }}
            />
            {configError && (
              <div style={{ color: '#d32f2f', fontSize: 12 }}>{configError}</div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowConfig(false)}
                style={{
                  padding: '8px 20px',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: 14
                }}
              >
                取消
              </button>
              <button
                onClick={saveConfig}
                style={{
                  padding: '8px 20px',
                  border: 'none',
                  borderRadius: 6,
                  background: '#2e7d32',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 14
                }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
