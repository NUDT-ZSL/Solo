import { Play, Pause, Gauge, RotateCw } from 'lucide-react';
import { useGlobalStore } from '../store/useGlobalStore';

export function RotationControls() {
  const autoRotate = useGlobalStore(s => s.autoRotate);
  const rotateSpeed = useGlobalStore(s => s.rotateSpeed);
  const toggleAutoRotate = useGlobalStore(s => s.toggleAutoRotate);
  const setRotateSpeed = useGlobalStore(s => s.setRotateSpeed);

  const speedPercent = Math.round((rotateSpeed / 0.5) * 100);
  const speedLabel = rotateSpeed === 0 ? '静止' : rotateSpeed < 0.05 ? '极慢' : rotateSpeed < 0.12 ? '慢' : rotateSpeed < 0.25 ? '标准' : rotateSpeed < 0.4 ? '快' : '极快';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 120,
        right: 20,
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '12px 14px',
        background: 'rgba(13, 17, 23, 0.75)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        backdropFilter: 'blur(8px)',
        fontFamily: "'SF Mono', Menlo, Consolas, monospace",
        fontSize: 12,
        color: '#8b949e',
        minWidth: 200
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <RotateCw size={13} color={autoRotate ? '#4ecdc4' : '#8b949e'} />
        <span style={{ color: '#c9d1d9', fontWeight: 600, fontSize: 12 }}>地球自转</span>
        <span
          style={{
            marginLeft: 'auto',
            padding: '2px 8px',
            borderRadius: 4,
            fontSize: 10,
            background: autoRotate ? 'rgba(78, 205, 196, 0.15)' : 'rgba(139, 148, 158, 0.15)',
            color: autoRotate ? '#4ecdc4' : '#8b949e',
            fontWeight: 600
          }}
        >
          {autoRotate ? '开启' : '暂停'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={toggleAutoRotate}
          style={{
            width: 36,
            height: 36,
            minWidth: 36,
            minHeight: 36,
            borderRadius: 6,
            border: `1px solid ${autoRotate ? 'rgba(78, 205, 196, 0.4)' : 'rgba(139, 148, 158, 0.3)'}`,
            background: autoRotate ? 'rgba(78, 205, 196, 0.12)' : 'rgba(139, 148, 158, 0.1)',
            color: autoRotate ? '#4ecdc4' : '#8b949e',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
            flexShrink: 0,
            padding: 0
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = autoRotate ? 'rgba(78, 205, 196, 0.25)' : 'rgba(139, 148, 158, 0.2)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = autoRotate ? 'rgba(78, 205, 196, 0.12)' : 'rgba(139, 148, 158, 0.1)';
          }}
          title={autoRotate ? '暂停自转' : '开启自转'}
        >
          {autoRotate ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Gauge size={11} color="#ffdd55" />
            <span style={{ fontSize: 10 }}>速度</span>
            <span
              style={{
                marginLeft: 'auto',
                fontFamily: "'SF Mono', monospace",
                fontSize: 10,
                fontWeight: 600,
                color: rotateSpeed === 0 ? '#8b949e' : rotateSpeed > 0.3 ? '#ff6b6b' : '#ffdd55'
              }}
            >
              {speedLabel} {speedPercent}%
            </span>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type="range"
              min={0}
              max={0.5}
              step={0.005}
              value={rotateSpeed}
              onChange={e => setRotateSpeed(parseFloat(e.target.value))}
              style={{
                width: '100%',
                height: 4,
                appearance: 'none',
                WebkitAppearance: 'none',
                background: `linear-gradient(to right, 
                  #4ecdc4 0%, 
                  #ffdd55 ${(0.12 / 0.5) * 100}%, 
                  #ff6b6b 100%)`,
                borderRadius: 2,
                outline: 'none',
                cursor: 'pointer',
                padding: 0,
                margin: 0,
                touchAction: 'none'
              }}
            />
            <style>{`
              input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background: #ffffff;
                border: 2px solid #4ecdc4;
                cursor: pointer;
                box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                touch-action: none;
              }
              input[type="range"]::-moz-range-thumb {
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background: #ffffff;
                border: 2px solid #4ecdc4;
                cursor: pointer;
                box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                touch-action: none;
              }
            `}</style>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
        {[
          { label: '停', value: 0 },
          { label: '慢', value: 0.04 },
          { label: '标准', value: 0.08 },
          { label: '快', value: 0.2 },
          { label: '极快', value: 0.4 }
        ].map(preset => {
          const active = Math.abs(rotateSpeed - preset.value) < 0.005;
          return (
            <button
              key={preset.label}
              onClick={() => {
                setRotateSpeed(preset.value);
                if (preset.value > 0 && !autoRotate) toggleAutoRotate();
              }}
              style={{
                flex: 1,
                height: 26,
                minHeight: 26,
                padding: 0,
                borderRadius: 4,
                border: `1px solid ${active ? 'rgba(78, 205, 196, 0.5)' : 'rgba(139, 148, 158, 0.2)'}`,
                background: active ? 'rgba(78, 205, 196, 0.2)' : 'rgba(139, 148, 158, 0.08)',
                color: active ? '#4ecdc4' : '#8b949e',
                fontFamily: "'SF Mono', monospace",
                fontSize: 10,
                fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                touchAction: 'none'
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.background = 'rgba(139, 148, 158, 0.18)';
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.background = 'rgba(139, 148, 158, 0.08)';
                }
              }}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
