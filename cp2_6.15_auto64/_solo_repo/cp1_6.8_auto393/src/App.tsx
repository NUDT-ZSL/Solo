import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './GameEngine';

const LOTUS_PATH = 'M0,8 C-4,4 -6,-2 -3,-8 C-1,-4 0,0 0,2 C0,0 1,-4 3,-8 C6,-2 4,4 0,8 Z';

const skillKeys = [
  { key: 'J', label: '轻击', color: 'rgba(200,220,255,0.7)' },
  { key: 'K', label: '重击', color: 'rgba(100,160,255,0.7)' },
  { key: 'L', label: '格挡', color: 'rgba(255,215,0,0.7)' },
  { key: 'U', label: '大招', color: 'rgba(255,100,100,0.7)' },
];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [combo, setCombo] = useState(0);
  const [health, setHealth] = useState(3);
  const [swordEnergy, setSwordEnergy] = useState(0);

  const handleComboChange = useCallback((c: number) => setCombo(c), []);
  const handlePlayerHurt = useCallback((h: number) => setHealth(h), []);
  const handleSwordEnergyChange = useCallback((e: number) => setSwordEnergy(e), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const engine = new GameEngine(canvas);
    engineRef.current = engine;

    engine.setCallbacks({
      onComboChange: handleComboChange,
      onPlayerHurt: handlePlayerHurt,
      onSwordEnergyChange: handleSwordEnergyChange,
      onScreenShake: () => {},
    });

    engine.start();

    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      engine.resize(canvas.width, canvas.height);
    };
    window.addEventListener('resize', onResize);

    return () => {
      engine.stop();
      window.removeEventListener('resize', onResize);
    };
  }, [handleComboChange, handlePlayerHurt, handleSwordEnergyChange]);

  const energyPct = swordEnergy / 100;
  const isUltReady = swordEnergy >= 100;

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: '#000',
    }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />

      {/* 左上角：连击数 + 生命 + 剑气槽 */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        userSelect: 'none',
        pointerEvents: 'none',
      }}>
        {/* 连击数 */}
        <div style={{
          color: combo >= 10 ? '#ffd700' : combo >= 5 ? '#ffaa33' : 'rgba(255,255,255,0.8)',
          fontSize: combo >= 10 ? 42 : combo >= 5 ? 34 : 24,
          fontWeight: 'bold',
          fontFamily: 'serif',
          textShadow: combo >= 5
            ? '0 0 15px rgba(255,200,50,0.6)'
            : '0 0 8px rgba(200,220,255,0.4)',
          transition: 'all 0.15s ease',
          opacity: combo > 0 ? 1 : 0.3,
        }}>
          {combo > 0 ? `${combo} 连击` : '无极剑境'}
        </div>

        {/* 三朵水墨莲花 - 生命值 */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {[0, 1, 2].map(i => (
            <svg key={i} width="28" height="28" viewBox="-8 -10 16 20"
              style={{
                filter: i < health
                  ? 'drop-shadow(0 0 6px rgba(180,210,255,0.6))'
                  : 'drop-shadow(0 0 2px rgba(100,100,100,0.3))',
                transition: 'all 0.3s ease',
              }}
            >
              <path
                d={LOTUS_PATH}
                fill={i < health ? 'rgba(180,210,255,0.8)' : 'rgba(60,60,60,0.4)'}
                stroke={i < health ? 'rgba(200,220,255,0.9)' : 'rgba(80,80,80,0.3)'}
                strokeWidth="0.5"
              />
            </svg>
          ))}
        </div>

        {/* 剑气槽 */}
        <div style={{
          width: 160,
          height: 12,
          borderRadius: 6,
          background: 'rgba(20,20,20,0.6)',
          border: '1px solid rgba(80,140,255,0.3)',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <div style={{
            width: `${energyPct * 100}%`,
            height: '100%',
            borderRadius: 6,
            background: isUltReady
              ? 'linear-gradient(90deg, rgba(255,100,100,0.9), rgba(255,200,50,0.9))'
              : 'linear-gradient(90deg, rgba(60,100,200,0.7), rgba(100,160,255,0.9))',
            boxShadow: isUltReady
              ? '0 0 12px rgba(255,150,50,0.6)'
              : '0 0 6px rgba(80,140,255,0.4)',
            transition: 'width 0.1s ease, background 0.3s ease',
          }} />
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.7)',
            fontSize: 9,
            fontFamily: 'serif',
            letterSpacing: 2,
          }}>
            剑气
          </div>
        </div>
      </div>

      {/* 右下角：技能快捷键 */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        display: 'flex',
        gap: 10,
        userSelect: 'none',
        pointerEvents: 'none',
      }}>
        {skillKeys.map(sk => {
          const isReady = sk.key === 'U' ? isUltReady : true;
          return (
            <div key={sk.key} style={{
              width: 56,
              height: 56,
              borderRadius: 10,
              background: isReady
                ? 'rgba(30,30,40,0.55)'
                : 'rgba(30,30,40,0.3)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: `1px solid ${isReady ? sk.color : 'rgba(60,60,60,0.3)'}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isReady ? 1 : 0.5,
              transition: 'all 0.2s ease',
            }}>
              <div style={{
                color: isReady ? sk.color : 'rgba(100,100,100,0.5)',
                fontSize: 18,
                fontWeight: 'bold',
                fontFamily: 'monospace',
                textShadow: isReady ? `0 0 8px ${sk.color}` : 'none',
              }}>
                {sk.key}
              </div>
              <div style={{
                color: isReady ? 'rgba(255,255,255,0.5)' : 'rgba(100,100,100,0.3)',
                fontSize: 9,
                fontFamily: 'serif',
                marginTop: 2,
              }}>
                {sk.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* 左下角：操作提示 */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        userSelect: 'none',
        pointerEvents: 'none',
        color: 'rgba(255,255,255,0.3)',
        fontSize: 11,
        fontFamily: 'serif',
      }}>
        <span>A/D 移动 · W/空格 跳跃</span>
        <span>J 轻击 · K 重击 · L 格挡</span>
        <span>I 蓄力 · U 释放大招(满剑气)</span>
      </div>

      {/* 右上角：关卡地图 */}
      <div style={{
        position: 'absolute',
        top: 20,
        right: 20,
        width: 120,
        height: 60,
        borderRadius: 8,
        background: 'rgba(30,30,40,0.45)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(100,140,200,0.2)',
        userSelect: 'none',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <svg width="100" height="40" viewBox="0 0 100 40">
          <line x1="10" y1="20" x2="90" y2="20" stroke="rgba(100,140,200,0.3)" strokeWidth="2" />
          <circle cx="25" cy="20" r="3" fill="rgba(80,140,255,0.8)" />
          <text x="25" y="14" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="6" fontFamily="serif">剑客</text>
          <circle cx="60" cy="20" r="2" fill="rgba(255,60,60,0.6)" />
          <circle cx="75" cy="22" r="2" fill="rgba(255,60,60,0.6)" />
          <text x="70" y="14" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="6" fontFamily="serif">敌</text>
          <text x="50" y="36" textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="7" fontFamily="serif">第一境</text>
        </svg>
      </div>

      {/* 连击高时屏幕边缘金色光晕 */}
      {combo >= 5 && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          boxShadow: combo >= 10
            ? 'inset 0 0 80px rgba(255,200,50,0.25), inset 0 0 150px rgba(255,150,0,0.1)'
            : 'inset 0 0 50px rgba(255,200,50,0.15), inset 0 0 100px rgba(255,150,0,0.05)',
          transition: 'box-shadow 0.3s ease',
        }} />
      )}
    </div>
  );
}
