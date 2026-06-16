import { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import Scene3D from './Scene3D';
import SpectrumPanel from './SpectrumPanel';
import { SoundSource, calculateSoundPressureLevel, constants } from './utils/soundPhysics';

let sourceIdCounter = 2;
const generateSourceId = () => `source-${++sourceIdCounter}`;

export default function App() {
  const [sources, setSources] = useState<SoundSource[]>([
    {
      id: 'source-1',
      x: -2,
      z: 0,
      frequency: 330,
      amplitude: 75,
      phase: 0
    },
    {
      id: 'source-2',
      x: 2,
      z: 0,
      frequency: 550,
      amplitude: 65,
      phase: 0
    }
  ]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [hoveredSourceId, setHoveredSourceId] = useState<string | null>(null);
  const [deletingSourceIds, setDeletingSourceIds] = useState<Set<string>>(new Set());
  const [timeData, setTimeData] = useState<number[]>(Array(128).fill(0));
  const animationRef = useRef<number>();

  const selectedSource = sources.find((s) => s.id === selectedSourceId) || null;

  useEffect(() => {
    let lastTime = 0;
    const animate = (time: number) => {
      if (time - lastTime > 16) {
        const currentTime = time / 1000;
        const splData = calculateSoundPressureLevel(sources, currentTime);
        setTimeData(splData);
        lastTime = time;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [sources]);

  const handleGridClick = useCallback((x: number, z: number) => {
    if (sources.length >= constants.MAX_SOURCES) {
      return;
    }

    const newSource: SoundSource = {
      id: generateSourceId(),
      x,
      z,
      frequency: 440,
      amplitude: 50,
      phase: 0
    };

    setSources((prev) => [...prev, newSource]);
    setSelectedSourceId(newSource.id);
  }, [sources.length]);

  const handleSourceClick = useCallback((id: string) => {
    setSelectedSourceId(id);
  }, []);

  const handleSourceDoubleClick = useCallback((id: string) => {
    if (sources.length <= 1) {
      return;
    }

    setDeletingSourceIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    setTimeout(() => {
      setSources((prev) => prev.filter((s) => s.id !== id));
      setSelectedSourceId((prev) => (prev === id ? null : prev));
      setDeletingSourceIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300);
  }, [sources.length]);

  const handleSourceHover = useCallback((id: string | null) => {
    setHoveredSourceId(id);
  }, []);

  const handleFrequencyChange = useCallback(
    (value: number) => {
      if (!selectedSourceId) return;
      setSources((prev) =>
        prev.map((s) =>
          s.id === selectedSourceId ? { ...s, frequency: value } : s
        )
      );
    },
    [selectedSourceId]
  );

  const handleAmplitudeChange = useCallback(
    (value: number) => {
      if (!selectedSourceId) return;
      setSources((prev) =>
        prev.map((s) =>
          s.id === selectedSourceId ? { ...s, amplitude: value } : s
        )
      );
    },
    [selectedSourceId]
  );

  const handlePhaseChange = useCallback(
    (value: number) => {
      if (!selectedSourceId) return;
      setSources((prev) =>
        prev.map((s) =>
          s.id === selectedSourceId ? { ...s, phase: value } : s
        )
      );
    },
    [selectedSourceId]
  );

  const handleClearAll = useCallback(() => {
    if (sources.length <= 1) return;

    sources.forEach((source, index) => {
      setTimeout(() => {
        setDeletingSourceIds((prev) => {
          const next = new Set(prev);
          next.add(source.id);
          return next;
        });

        setTimeout(() => {
          setSources((prev) => prev.filter((s) => s.id !== source.id));
          setDeletingSourceIds((prev) => {
            const next = new Set(prev);
            next.delete(source.id);
            return next;
          });
        }, 300);
      }, index * 500);
    });

    setSelectedSourceId(null);
  }, [sources]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'c') {
        handleClearAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClearAll]);

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: '#0a0e17',
        color: '#dfe6e9',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      <div
        style={{
          flex: 1,
          position: 'relative',
          minWidth: 0
        }}
      >
        <Canvas
          camera={{ position: [0, 8, 8], fov: 60 }}
          style={{ width: '100%', height: '100%' }}
        >
          <color attach="background" args={['#0a0e17']} />
          <fog attach="fog" args={['#0a0e17', 15, 30]} />
          <Scene3D
            sources={sources}
            selectedSourceId={selectedSourceId}
            onGridClick={handleGridClick}
            onSourceClick={handleSourceClick}
            onSourceDoubleClick={handleSourceDoubleClick}
            onSourceHover={handleSourceHover}
            deletingSourceIds={deletingSourceIds}
          />
        </Canvas>

        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            fontSize: '12px',
            color: '#dfe6e9',
            opacity: 0.6,
            lineHeight: 1.6,
            pointerEvents: 'none'
          }}
        >
          <div>点击网格放置声源</div>
          <div>拖拽旋转视角 · 滚轮缩放</div>
          <div>双击声源删除 · 按 C 清空</div>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            fontSize: '11px',
            color: '#dfe6e9',
            opacity: 0.5,
            pointerEvents: 'none'
          }}
        >
          声源数量: {sources.length} / {constants.MAX_SOURCES}
        </div>
      </div>

      <div
        style={{
          width: '1px',
          background: 'linear-gradient(to bottom, transparent, #0984e3, transparent)',
          opacity: 0.3
        }}
      />

      <div
        style={{
          width: '340px',
          minWidth: '340px',
          height: '100%',
          backgroundColor: '#0a0e17',
          borderLeft: '1px solid rgba(72, 84, 96, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
      >
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid rgba(72, 84, 96, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <h1
            style={{
              fontSize: '18px',
              fontWeight: 600,
              margin: 0,
              color: '#dfe6e9'
            }}
          >
            声场实验室
          </h1>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#00b894',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            {sources.length}
          </div>
        </div>

        <div style={{ padding: '20px', flex: 1 }}>
          <div style={{ marginBottom: '24px' }}>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 500,
                marginBottom: '12px',
                color: '#dfe6e9'
              }}
            >
              {selectedSource ? '声源参数' : '未选择声源'}
            </div>

            {selectedSource ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                      fontSize: '12px',
                      opacity: 0.7
                    }}
                  >
                    <span>频率</span>
                    <span>{Math.round(selectedSource.frequency)} Hz</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={20000}
                    value={selectedSource.frequency}
                    onChange={(e) => handleFrequencyChange(Number(e.target.value))}
                    style={sliderStyle}
                  />
                </div>

                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                      fontSize: '12px',
                      opacity: 0.7
                    }}
                  >
                    <span>振幅</span>
                    <span>{Math.round(selectedSource.amplitude)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={selectedSource.amplitude}
                    onChange={(e) => handleAmplitudeChange(Number(e.target.value))}
                    style={sliderStyle}
                  />
                </div>

                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                      fontSize: '12px',
                      opacity: 0.7
                    }}
                  >
                    <span>相位角</span>
                    <span>{Math.round(selectedSource.phase)}°</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={selectedSource.phase}
                    onChange={(e) => handlePhaseChange(Number(e.target.value))}
                    style={sliderStyle}
                  />
                </div>

                <button
                  onClick={() => handleSourceDoubleClick(selectedSource.id)}
                  disabled={sources.length <= 1}
                  style={{
                    ...buttonStyle,
                    backgroundColor: sources.length <= 1 ? '#2d3436' : '#d63031',
                    cursor: sources.length <= 1 ? 'not-allowed' : 'pointer',
                    opacity: sources.length <= 1 ? 0.5 : 1,
                    marginTop: '8px'
                  }}
                  onMouseEnter={(e) => {
                    if (sources.length > 1) {
                      e.currentTarget.style.backgroundColor = '#e74c3c';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (sources.length > 1) {
                      e.currentTarget.style.backgroundColor = '#d63031';
                    }
                  }}
                >
                  删除声源
                </button>

                {sources.length <= 1 && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#fdcb6e',
                      marginTop: '-8px',
                      textAlign: 'center'
                    }}
                  >
                    至少保留一个声源
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  fontSize: '12px',
                  opacity: 0.5,
                  padding: '16px',
                  textAlign: 'center',
                  border: '1px dashed #485460',
                  borderRadius: '6px'
                }}
              >
                点击场景中的声源球体进行选择
              </div>
            )}
          </div>

          <SpectrumPanel sources={sources} timeData={timeData} />

          <div
            style={{
              marginTop: '24px',
              padding: '12px',
              backgroundColor: 'rgba(45, 52, 54, 0.3)',
              borderRadius: '6px',
              fontSize: '12px',
              lineHeight: 1.8,
              opacity: 0.7
            }}
          >
            <div style={{ fontWeight: 500, marginBottom: '8px', opacity: 1 }}>操作提示</div>
            <div>• 点击网格放置声源</div>
            <div>• 拖拽旋转视角</div>
            <div>• 滚轮缩放视图</div>
            <div>• 双击声源删除</div>
            <div>• 按 C 键清空所有声源</div>
            <div>• 金色区域为相长干涉</div>
            <div>• 灰色区域为相消干涉</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: '6px',
  borderRadius: '3px',
  backgroundColor: '#2d3436',
  outline: 'none',
  WebkitAppearance: 'none',
  appearance: 'none',
  cursor: 'pointer'
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 16px',
  borderRadius: '6px',
  border: 'none',
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: 500,
  transition: 'background-color 0.2s'
};
