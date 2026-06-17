import React from 'react';
import { getMoleculeNames, getMolecule, DisplayMode } from './MoleculeData';
import { useMoleculeStore, AtomInfo, VisualQuality } from './store';

const MODE_LABELS: Record<DisplayMode, string> = {
  ballStick: '球棍',
  spaceFill: '空间填充',
  wireframe: '线框',
};

const MODES: DisplayMode[] = ['ballStick', 'spaceFill', 'wireframe'];

const QUALITY_LABELS: Record<VisualQuality, string> = {
  basic: '基础',
  enhanced: '增强',
};

const QUALITIES: VisualQuality[] = ['basic', 'enhanced'];

const AtomInfoCard: React.FC<{ info: AtomInfo }> = ({ info }) => {
  return (
    <div style={{
      background: 'rgba(30, 30, 50, 0.8)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      borderRadius: '12px',
      width: '240px',
      padding: '16px',
      animation: 'atomCardIn 0.2s ease-out',
      border: '1px solid rgba(99, 102, 241, 0.3)',
      color: '#E0E0FF',
      fontFamily: 'Inter, -apple-system, sans-serif',
      fontSize: '14px',
      lineHeight: '1.6',
    }}>
      <div style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px', textAlign: 'center' }}>
        {info.element}
      </div>
      <div style={{ textAlign: 'center', marginBottom: '12px', color: '#A0A0B0', fontSize: '13px' }}>
        {info.name}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ color: '#A0A0B0' }}>原子序号</span>
        <span>{info.atomicNumber}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ color: '#A0A0B0' }}>X</span>
        <span>{info.x.toFixed(2)} Å</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ color: '#A0A0B0' }}>Y</span>
        <span>{info.y.toFixed(2)} Å</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#A0A0B0' }}>Z</span>
        <span>{info.z.toFixed(2)} Å</span>
      </div>
    </div>
  );
};

const Controls: React.FC = () => {
  const { currentMolecule, displayMode, selectedAtom, isLoading, visualQuality, setMolecule, setDisplayMode, setVisualQuality } = useMoleculeStore();
  const moleculeNames = getMoleculeNames();

  return (
    <div style={{
      width: '20%',
      minWidth: '260px',
      height: '100vh',
      background: 'rgba(30, 30, 46, 0.9)',
      borderLeft: '1px solid #4A4A5E',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, -apple-system, sans-serif',
      color: '#E0E0FF',
      overflow: 'auto',
    }}>
      <div style={{
        padding: '24px 20px',
        fontSize: '22px',
        fontWeight: 700,
        fontFamily: 'Inter, -apple-system, sans-serif',
        color: '#E0E0FF',
        borderBottom: '1px solid #2A2A3E',
      }}>
        分子结构浏览器
      </div>

      <div style={{ padding: '20px', flex: 1 }}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#A0A0B0', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            选择分子
          </label>
          <select
            value={currentMolecule}
            onChange={(e) => setMolecule(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: '#2A2A3E',
              border: '1px solid #3A3A5E',
              borderRadius: '8px',
              color: '#FFFFFF',
              fontSize: '14px',
              cursor: 'pointer',
              outline: 'none',
              appearance: 'none',
              fontFamily: 'Inter, -apple-system, sans-serif',
            }}
          >
            {moleculeNames.map((name) => {
              const mol = getMolecule(name);
              return (
                <option key={name} value={name} style={{ background: '#2A2A3E', color: '#FFFFFF' }}>
                  {mol?.formula} - {mol?.name}
                </option>
              );
            })}
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#A0A0B0', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            显示模式
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            {MODES.map((mode) => (
              <button
                key={mode}
                onClick={() => setDisplayMode(mode)}
                style={{
                  width: '80px',
                  height: '40px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontFamily: 'Inter, -apple-system, sans-serif',
                  transition: 'all 0.2s ease',
                  background: displayMode === mode
                    ? 'linear-gradient(135deg, #6366F1, #8B5CF6)'
                    : '#2A2A3E',
                  color: displayMode === mode ? '#FFFFFF' : '#A0A0B0',
                  fontWeight: displayMode === mode ? 600 : 400,
                }}
                onMouseEnter={(e) => {
                  if (displayMode !== mode) {
                    (e.target as HTMLButtonElement).style.background = '#3A3A5E';
                  }
                }}
                onMouseLeave={(e) => {
                  if (displayMode !== mode) {
                    (e.target as HTMLButtonElement).style.background = '#2A2A3E';
                  }
                }}
              >
                {MODE_LABELS[mode]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#A0A0B0', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            视觉效果
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            {QUALITIES.map((quality) => (
              <button
                key={quality}
                onClick={() => setVisualQuality(quality)}
                style={{
                  flex: 1,
                  height: '40px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontFamily: 'Inter, -apple-system, sans-serif',
                  transition: 'all 0.2s ease',
                  background: visualQuality === quality
                    ? 'linear-gradient(135deg, #6366F1, #8B5CF6)'
                    : '#2A2A3E',
                  color: visualQuality === quality ? '#FFFFFF' : '#A0A0B0',
                  fontWeight: visualQuality === quality ? 600 : 400,
                }}
                onMouseEnter={(e) => {
                  if (visualQuality !== quality) {
                    (e.target as HTMLButtonElement).style.background = '#3A3A5E';
                  }
                }}
                onMouseLeave={(e) => {
                  if (visualQuality !== quality) {
                    (e.target as HTMLButtonElement).style.background = '#2A2A3E';
                  }
                }}
              >
                {QUALITY_LABELS[quality]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#A0A0B0', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            原子信息
          </label>
          {selectedAtom ? (
            <AtomInfoCard info={selectedAtom} />
          ) : (
            <div style={{
              color: '#606080',
              fontSize: '13px',
              textAlign: 'center',
              padding: '24px 0',
            }}>
              点击原子查看信息
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div style={{
          height: '2px',
          background: '#1E1E2E',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: '100%',
            background: '#6366F1',
            animation: 'loadingBar 1s ease-in-out',
          }} />
        </div>
      )}
    </div>
  );
};

export default Controls;
