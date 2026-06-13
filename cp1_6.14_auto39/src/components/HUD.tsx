import { useEffect, useState } from 'react';
import { GameData } from '../game/core';

interface HUDProps {
  gameData: GameData;
}

export default function HUD({ gameData }: HUDProps) {
  const [scale, setScale] = useState(1);
  const [lowHpFlash, setLowHpFlash] = useState(false);

  const { player, stats } = gameData;
  const hpPercent = Math.max(0, (player.hp / player.maxHp) * 100);
  const isLowHp = hpPercent < 30;

  useEffect(() => {
    const handleResize = () => {
      setScale(window.innerWidth < 768 ? 0.7 : 1);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isLowHp) {
      setLowHpFlash(false);
      return;
    }
    const interval = setInterval(() => {
      setLowHpFlash((prev) => !prev);
    }, 300);
    return () => clearInterval(interval);
  }, [isLowHp]);

  const displayUpgrades = player.permanentUpgrades.slice(0, 3);

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${16 * scale}px`,
    left: `${16 * scale}px`,
    zIndex: 10,
    pointerEvents: 'none',
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
  };

  const hpBarStyle: React.CSSProperties = {
    width: `${200 * scale}px`,
    height: `${20 * scale}px`,
    backgroundColor: '#2a2a2a',
    borderRadius: `${4 * scale}px`,
    overflow: 'hidden',
    position: 'relative',
    border: '1px solid #3b3b4e',
  };

  const hpFillStyle: React.CSSProperties = {
    height: '100%',
    backgroundColor: isLowHp && lowHpFlash ? '#ff0000' : '#ef4444',
    width: `${hpPercent}%`,
    borderRadius: `${4 * scale}px`,
    transition: 'width 0.2s ease, background-color 0.1s ease',
  };

  const hpTextStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#ffffff',
    fontSize: `${12 * scale}px`,
    fontWeight: 'bold',
    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
    margin: 0,
  };

  const goldStyle: React.CSSProperties = {
    color: '#fbbf24',
    fontSize: `${18 * scale}px`,
    fontWeight: 'bold',
    margin: `${8 * scale}px 0 0 0`,
    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    gap: `${4 * scale}px`,
  };

  const floorStyle: React.CSSProperties = {
    color: '#ffffff',
    fontSize: `${16 * scale}px`,
    margin: `${4 * scale}px 0 0 0`,
    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
  };

  const upgradesContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: `${6 * scale}px`,
    marginTop: `${12 * scale}px`,
  };

  const upgradeIconStyle: React.CSSProperties = {
    width: `${32 * scale}px`,
    height: `${32 * scale}px`,
    backgroundColor: '#2a2a3a',
    borderRadius: `${6 * scale}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontSize: `${12 * scale}px`,
    fontWeight: 'bold',
    border: '1px solid #3b3b4e',
  };

  return (
    <div style={containerStyle}>
      <div style={hpBarStyle}>
        <div style={hpFillStyle} />
        <p style={hpTextStyle}>{Math.ceil(hpPercent)}%</p>
      </div>

      <p style={goldStyle}>
        <span>💰</span>
        <span>{player.gold}</span>
      </p>

      <p style={floorStyle}>Floor {stats.floor}</p>

      <div style={upgradesContainerStyle}>
        {displayUpgrades.map((upgrade, index) => (
          <div key={upgrade.id} style={upgradeIconStyle} title={upgrade.name}>
            {upgrade.icon}
          </div>
        ))}
        {displayUpgrades.length === 0 && (
          <div
            style={{
              ...upgradeIconStyle,
              opacity: 0.3,
            }}
          >
            -
          </div>
        )}
      </div>
    </div>
  );
}
