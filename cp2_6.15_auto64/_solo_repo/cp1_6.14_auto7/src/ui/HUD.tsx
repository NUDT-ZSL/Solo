import { useEffect, useState, useCallback } from 'react';
import { GameState, MINERAL_COLORS, MINERAL_NAMES } from '../types/gameTypes';

interface HUDProps {
  state: GameState;
  onUpgrade: (type: 'speed' | 'sonarRange' | 'energyEfficiency') => boolean;
  onNextLevel: () => void;
  onCloseUpgrade: () => void;
}

export function HUD({ state, onUpgrade, onNextLevel, onCloseUpgrade }: HUDProps) {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [displayOxygen, setDisplayOxygen] = useState(state.submarine.oxygen);
  const [displayEnergy, setDisplayEnergy] = useState(state.submarine.energy);
  const [displayMinerals, setDisplayMinerals] = useState({ ...state.minerals });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayOxygen(state.submarine.oxygen);
      setDisplayEnergy(state.submarine.energy);
    }, 50);
    return () => clearTimeout(timer);
  }, [state.submarine.oxygen, state.submarine.energy]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayMinerals({ ...state.minerals });
    }, 150);
    return () => clearTimeout(timer);
  }, [state.minerals]);

  const getOxygenFlashColor = useCallback(() => {
    if (!state.oxygenFlash.active) return null;
    const elapsed = (performance.now() / 1000) - state.oxygenFlash.startTime;
    const cycle = Math.floor(elapsed / (state.oxygenFlash.duration / 2)) % 2;
    return cycle === 0 ? '#ff3333' : null;
  }, [state.oxygenFlash]);

  const oxygenFlashColor = getOxygenFlashColor();

  const renderBar = (label: string, value: number, max: number, startColor: string, endColor: string, flashColor: string | null) => {
    const percent = Math.max(0, Math.min(100, (value / max) * 100));
    const bgColor = flashColor
      ? flashColor
      : `linear-gradient(90deg, ${startColor} 0%, ${endColor} 100%)`;

    return (
      <div style={{ marginBottom: '10px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '4px',
          fontSize: '12px',
          color: '#94a3b8',
          fontWeight: 500
        }}>
          <span>{label}</span>
          <span>{Math.round(value)}/{max}</span>
        </div>
        <div style={{
          height: '16px',
          backgroundColor: '#1e293b',
          borderRadius: '8px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            height: '100%',
            width: `${percent}%`,
            background: bgColor,
            transition: 'width 0.3s ease',
            borderRadius: '8px'
          }} />
        </div>
      </div>
    );
  };

  const renderMineralIcon = (type: 'sphalerite' | 'kyanite' | 'emerald', count: number) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 10px',
      backgroundColor: 'rgba(30, 41, 59, 0.6)',
      borderRadius: '20px',
      transition: 'transform 0.15s ease'
    }} key={type}>
      <div style={{
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        backgroundColor: '#1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `2px solid ${MINERAL_COLORS[type]}`,
        boxShadow: `0 0 8px ${MINERAL_COLORS[type]}55`
      }}>
        <span style={{
          width: '12px',
          height: '12px',
          borderRadius: '3px',
          backgroundColor: MINERAL_COLORS[type],
          transform: 'rotate(45deg)'
        }} />
      </div>
      <span style={{
        fontSize: '16px',
        fontWeight: 600,
        color: MINERAL_COLORS[type],
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSmooth: 'grayscale',
        WebkitFontSmoothing: 'grayscale',
        MozOsxFontSmoothing: 'grayscale',
        minWidth: '24px',
        textAlign: 'left'
      }}>
        {displayMinerals[type]}
      </span>
    </div>
  );

  const renderUpgradeButton = (
    type: 'speed' | 'sonarRange' | 'energyEfficiency',
    label: string,
    description: string,
    cost: { sphalerite: number; kyanite: number; emerald: number },
    currentLevel: number
  ) => {
    const canAfford = state.minerals.sphalerite >= cost.sphalerite &&
                      state.minerals.kyanite >= cost.kyanite &&
                      state.minerals.emerald >= cost.emerald;
    const maxed = currentLevel >= 3;

    return (
      <button
        onClick={() => !maxed && onUpgrade(type)}
        disabled={maxed || !canAfford}
        style={{
          width: '100%',
          padding: '16px',
          marginBottom: '12px',
          backgroundColor: maxed ? '#1e293b' : (canAfford ? '#1e3a5f' : '#1e293b'),
          border: '1px solid #334155',
          borderRadius: '12px',
          color: maxed ? '#64748b' : (canAfford ? '#e2e8f0' : '#64748b'),
          textAlign: 'left',
          cursor: maxed || !canAfford ? 'not-allowed' : 'pointer',
          transition: 'transform 0.15s ease, background-color 0.15s ease',
          opacity: maxed || !canAfford ? 0.5 : 1
        }}
        onMouseEnter={(e) => {
          if (!maxed && canAfford) {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.backgroundColor = '#1e3a5f';
          }
        }}
        onMouseLeave={(e) => {
          if (!maxed && canAfford) {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.backgroundColor = '#1e3a5f';
          }
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px'
        }}>
          <span style={{ fontSize: '16px', fontWeight: 600 }}>{label}</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: '14px',
                height: '14px',
                borderRadius: '3px',
                backgroundColor: i < currentLevel ? '#facc15' : '#334155',
                transform: 'rotate(45deg)'
              }} />
            ))}
          </div>
        </div>
        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
          {description}
        </div>
        {!maxed && (
          <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
            {cost.sphalerite > 0 && (
              <span style={{ color: MINERAL_COLORS.sphalerite }}>
                闪锌矿 x{cost.sphalerite}
              </span>
            )}
            {cost.kyanite > 0 && (
              <span style={{ color: MINERAL_COLORS.kyanite }}>
                蓝晶石 x{cost.kyanite}
              </span>
            )}
            {cost.emerald > 0 && (
              <span style={{ color: MINERAL_COLORS.emerald }}>
                祖母绿 x{cost.emerald}
              </span>
            )}
          </div>
        )}
        {maxed && (
          <div style={{ fontSize: '12px', color: '#facc15' }}>已达最高等级</div>
        )}
      </button>
    );
  };

  const isMobile = windowWidth < 640;
  const panelWidth = isMobile ? (windowWidth / 2 - 20) : 220;

  const handleCopyId = async () => {
    const response = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        oxygen: state.submarine.oxygen,
        energy: state.submarine.energy,
        minerals: state.minerals,
        upgrades: state.upgrades,
        level: state.level,
        completionTime: 0
      })
    });
    if (response.ok) {
      const data = await response.json();
      await navigator.clipboard.writeText(data.saveId);
      setCopiedId(data.saveId);
      setTimeout(() => setCopiedId(null), 3000);
    }
  };

  const hudPanel = (
    <div style={{
      width: `${panelWidth}px`,
      padding: '16px',
      backgroundColor: 'rgba(10, 11, 26, 0.85)',
      backdropFilter: 'blur(10px)',
      border: '1px solid #334155',
      borderRadius: '12px',
      color: '#e2e8f0',
      userSelect: 'none'
    }}>
      <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#60a5fa' }}>
        第 {state.level} 层
      </div>

      {renderBar('氧气', displayOxygen, state.submarine.maxOxygen, '#22c55e', '#ef4444', oxygenFlashColor)}
      {renderBar('能量', displayEnergy, state.submarine.maxEnergy, '#3b82f6', '#f97316', null)}

      <div style={{
        display: 'flex',
        gap: '6px',
        flexWrap: 'wrap',
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid #334155'
      }}>
        {renderMineralIcon('sphalerite', state.minerals.sphalerite)}
        {renderMineralIcon('kyanite', state.minerals.kyanite)}
        {renderMineralIcon('emerald', state.minerals.emerald)}
      </div>

      {state.sonarCooldown > 0 && (
        <div style={{
          marginTop: '12px',
          fontSize: '12px',
          color: '#64748b',
          textAlign: 'center'
        }}>
          声纳冷却: {state.sonarCooldown.toFixed(1)}s
        </div>
      )}

      {state.atExit && !state.showUpgrade && (
        <div style={{
          marginTop: '12px',
          padding: '10px',
          backgroundColor: 'rgba(250, 204, 21, 0.15)',
          border: '1px solid #facc15',
          borderRadius: '8px',
          fontSize: '12px',
          textAlign: 'center',
          color: '#facc15',
          animation: 'pulse 1.5s infinite'
        }}>
          按 E 键进入升级
        </div>
      )}
    </div>
  );

  const upgradePanel = state.showUpgrade && (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(10, 11, 26, 0.95)',
      backdropFilter: 'blur(8px)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '500px',
        backgroundColor: '#0a0b1a',
        border: '1px solid #334155',
        borderRadius: '16px',
        padding: '32px',
        color: '#e2e8f0'
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: 700,
          marginBottom: '8px',
          textAlign: 'center',
          color: '#60a5fa'
        }}>
          潜水器升级
        </h2>
        <p style={{
          textAlign: 'center',
          color: '#94a3b8',
          marginBottom: '24px',
          fontSize: '14px'
        }}>
          使用收集的矿物提升潜水器性能
        </p>

        <div style={{ marginBottom: '16px' }}>
          {renderUpgradeButton(
            'speed',
            '速度升级',
            `速度 +${state.upgrades.speed * 20}%`,
            { sphalerite: 3, kyanite: 0, emerald: 0 },
            state.upgrades.speed
          )}
          {renderUpgradeButton(
            'sonarRange',
            '声纳范围升级',
            `声纳范围 +${state.upgrades.sonarRange > 0 ? (state.upgrades.sonarRange === 1 ? 2 : (state.upgrades.sonarRange === 2 ? 4 : 7)) : 0}格`,
            { sphalerite: 0, kyanite: 2, emerald: 0 },
            state.upgrades.sonarRange
          )}
          {renderUpgradeButton(
            'energyEfficiency',
            '能量效率升级',
            `推进消耗 -${state.upgrades.energyEfficiency * 30}%`,
            { sphalerite: 0, kyanite: 0, emerald: 2 },
            state.upgrades.energyEfficiency
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onCloseUpgrade}
            style={{
              flex: 1,
              padding: '14px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '10px',
              color: '#e2e8f0',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            关闭
          </button>
          <button
            onClick={onNextLevel}
            style={{
              flex: 1,
              padding: '14px',
              backgroundColor: '#1e3a5f',
              border: '1px solid #60a5fa',
              borderRadius: '10px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            进入下一层
          </button>
        </div>

        <button
          onClick={handleCopyId}
          style={{
            width: '100%',
            marginTop: '12px',
            padding: '10px',
            backgroundColor: 'transparent',
            border: '1px dashed #334155',
            borderRadius: '8px',
            color: '#94a3b8',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          {copiedId ? `存档ID已复制: ${copiedId}` : '复制存档ID'}
        </button>
      </div>
    </div>
  );

  const pauseMenu = state.paused && !state.showUpgrade && (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(10, 11, 26, 0.9)',
      zIndex: 90,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        padding: '40px',
        backgroundColor: '#0a0b1a',
        border: '1px solid #334155',
        borderRadius: '16px',
        textAlign: 'center'
      }}>
        <h2 style={{ fontSize: '32px', color: '#60a5fa', marginBottom: '20px' }}>游戏暂停</h2>
        <p style={{ color: '#94a3b8', marginBottom: '24px' }}>按 ESC 继续游戏</p>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          WASD 移动 | 方向键旋转 | 空格 声纳 | E 升级
        </p>
      </div>
    </div>
  );

  const gameOverMenu = state.gameOver && (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(10, 11, 26, 0.95)',
      zIndex: 110,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        padding: '48px',
        backgroundColor: '#0a0b1a',
        border: '1px solid #ef4444',
        borderRadius: '16px',
        textAlign: 'center'
      }}>
        <h2 style={{ fontSize: '36px', color: '#ef4444', marginBottom: '16px' }}>氧气耗尽</h2>
        <p style={{ color: '#94a3b8', fontSize: '18px', marginBottom: '8px' }}>
          到达层数: 第 {state.level} 层
        </p>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>
          刷新页面重新开始
        </p>
        <button
          onClick={handleCopyId}
          style={{
            padding: '12px 24px',
            backgroundColor: '#1e3a5f',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            cursor: 'pointer'
          }}
        >
          {copiedId ? '存档ID已复制!' : '保存进度'}
        </button>
      </div>
    </div>
  );

  const mobileMenuIcon = isMobile && !showMobileMenu && (
    <button
      onClick={() => setShowMobileMenu(true)}
      style={{
        position: 'fixed',
        left: '12px',
        bottom: '12px',
        width: '40px',
        height: '40px',
        backgroundColor: 'rgba(10, 11, 26, 0.9)',
        border: '1px solid #334155',
        borderRadius: '8px',
        color: '#e2e8f0',
        fontSize: '20px',
        cursor: 'pointer',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      ⚙
    </button>
  );

  const mobileDrawer = isMobile && showMobileMenu && (
    <div style={{
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      width: '50%',
      backgroundColor: 'rgba(10, 11, 26, 0.98)',
      zIndex: 60,
      padding: '12px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <button
        onClick={() => setShowMobileMenu(false)}
        style={{
          alignSelf: 'flex-end',
          backgroundColor: 'transparent',
          border: 'none',
          color: '#e2e8f0',
          fontSize: '24px',
          cursor: 'pointer'
        }}
      >
        ×
      </button>
      {hudPanel}
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
      {!isMobile && (
        <div style={{
          position: 'fixed',
          left: '16px',
          bottom: '16px',
          zIndex: 20
        }}>
          {hudPanel}
        </div>
      )}
      {mobileMenuIcon}
      {mobileDrawer}
      {upgradePanel}
      {pauseMenu}
      {gameOverMenu}
    </>
  );
}
