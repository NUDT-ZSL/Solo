import { useState, useCallback, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import Scene from './Scene';
import InfoCard from './InfoCard';
import { Fish, ControlData, generateInitialFish, pauseFish } from './FishSimulation';

export default function App() {
  const [fishData, setFishData] = useState<Fish[]>(() => generateInitialFish(30));
  const [controlData, setControlData] = useState<ControlData>({
    globalSpeed: 1.0,
    boostedFishId: null
  });
  const [selectedFish, setSelectedFish] = useState<Fish | null>(null);
  const [isTankExpanded, setIsTankExpanded] = useState(false);
  const [isBoostAnimating, setIsBoostAnimating] = useState(false);
  const elapsedTimeRef = useRef(0);

  useEffect(() => {
    setTimeout(() => setIsTankExpanded(true), 100);
    const timer = setInterval(() => {
      elapsedTimeRef.current += 0.1;
    }, 100);
    return () => clearInterval(timer);
  }, []);

  const handleFishClick = useCallback((fishId: number) => {
    const fish = fishData.find(f => f.id === fishId);
    if (fish) {
      setFishData(prev => prev.map(f => 
        f.id === fishId ? pauseFish(f, elapsedTimeRef.current, 0.5) : f
      ));
      setSelectedFish(fish);
    }
  }, [fishData]);

  const handleFishUpdate = useCallback((updatedFish: Fish[]) => {
    setFishData(updatedFish);
  }, []);

  const handleCloseInfoCard = useCallback(() => {
    setSelectedFish(null);
  }, []);

  const handleGlobalSpeedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const speed = parseFloat(e.target.value);
    setControlData(prev => ({ ...prev, globalSpeed: speed }));
  }, []);

  const handleBoostSingleFish = useCallback(() => {
    if (selectedFish) {
      setIsBoostAnimating(true);
      setControlData(prev => ({ ...prev, boostedFishId: selectedFish.id }));
      
      setTimeout(() => {
        setControlData(prev => ({ ...prev, boostedFishId: null }));
        setIsBoostAnimating(false);
      }, 5000);
    }
  }, [selectedFish]);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      minWidth: '800px',
      background: 'linear-gradient(135deg, #0B3D91 0%, #6B4EAD 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(ellipse at center top, rgba(135, 206, 235, 0.1) 0%, transparent 60%)',
        pointerEvents: 'none'
      }} />
      
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        textAlign: 'center'
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '28px',
          fontWeight: 'bold',
          color: '#ffffff',
          textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          letterSpacing: '2px'
        }}>
          数字水族箱
        </h1>
        <p style={{
          margin: '8px 0 0 0',
          fontSize: '14px',
          color: 'rgba(255, 255, 255, 0.7)',
          letterSpacing: '1px'
        }}>
          点击鱼身获取科普信息
        </p>
      </div>

      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          transform: isTankExpanded ? 'scale(1)' : 'scale(0)',
          transformOrigin: 'center center',
          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          opacity: isTankExpanded ? 1 : 0,
          transitionDelay: '0.1s'
        }}
        onClick={selectedFish ? handleCloseInfoCard : undefined}
      >
        <Canvas
          camera={{ position: [0, 3, 12], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: 'transparent' }}
        >
          <color attach="background" args={['#0a1628']} />
          <Scene
            controlData={controlData}
            fishData={fishData}
            onFishClick={handleFishClick}
            onFishUpdate={handleFishUpdate}
          />
        </Canvas>
      </div>

      {selectedFish && (
        <InfoCard
          fish={selectedFish}
          onClose={handleCloseInfoCard}
        />
      )}

      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        padding: '20px',
        background: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(16px)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
        zIndex: 50,
        minWidth: '280px'
      }}>
        <div style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#ffffff',
          marginBottom: '16px',
          letterSpacing: '0.5px'
        }}>
          控制面板
        </div>

        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={handleBoostSingleFish}
            disabled={!selectedFish || isBoostAnimating}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              borderRadius: '8px',
              background: selectedFish && !isBoostAnimating
                ? 'linear-gradient(135deg, #FFD93D 0%, #FF6B6B 100%)'
                : 'rgba(255, 255, 255, 0.1)',
              color: selectedFish && !isBoostAnimating ? '#1a1a2e' : 'rgba(255, 255, 255, 0.5)',
              fontSize: '14px',
              fontWeight: '600',
              cursor: selectedFish && !isBoostAnimating ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              boxShadow: selectedFish && !isBoostAnimating
                ? '0 4px 12px rgba(255, 107, 107, 0.4)'
                : 'none',
              animation: isBoostAnimating ? 'flash 0.3s ease-in-out infinite' : 'none'
            }}
            onMouseEnter={(e) => {
              if (selectedFish && !isBoostAnimating) {
                e.currentTarget.style.transform = 'scale(0.98)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {isBoostAnimating ? '⚡ 加速中...' : selectedFish ? `⚡ 单鱼加速 (${selectedFish.name})` : '⚡ 单鱼加速 (请先选择鱼)'}
          </button>
        </div>

        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.8)'
            }}>
              全群速度
            </span>
            <span style={{
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#FFD93D',
              minWidth: '40px',
              textAlign: 'right'
            }}>
              {controlData.globalSpeed.toFixed(1)}x
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="3.0"
            step="0.1"
            value={controlData.globalSpeed}
            onChange={handleGlobalSpeedChange}
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              background: 'linear-gradient(to right, #FFD93D 0%, #FF6B6B 100%)',
              outline: 'none',
              WebkitAppearance: 'none',
              appearance: 'none',
              cursor: 'pointer'
            }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '4px',
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.5)'
          }}>
            <span>0.5x</span>
            <span>3.0x</span>
          </div>
        </div>
      </div>

      <div style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        padding: '12px 16px',
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(8px)',
        borderRadius: '8px',
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '12px',
        zIndex: 50
      }}>
        <div style={{ marginBottom: '4px' }}>🖱️ 拖拽旋转 · 滚轮缩放 · 右键平移</div>
        <div>🐠 点击鱼查看科普信息</div>
      </div>

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          border: 2px solid #FFD93D;
          transition: transform 0.1s ease;
        }
        
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }
        
        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          border: 2px solid #FFD93D;
        }
        
        @keyframes flash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        #root {
          width: 100%;
          height: 100%;
        }
      `}</style>
    </div>
  );
}
