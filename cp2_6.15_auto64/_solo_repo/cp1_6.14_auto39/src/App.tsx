import { useState, useCallback, useMemo, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import { GameCore } from './game/core';
import type { IGameData, IItem, IPermanentUpgrade } from './game/types';

export default function App() {
  const gameCore = useMemo(() => new GameCore(), []);
  const [gameData, setGameData] = useState<IGameData>(gameCore.getData());
  const [canvasScale, setCanvasScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      setCanvasScale(window.innerWidth < 768 ? 0.7 : 1);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleGameUpdate = useCallback((data: IGameData) => {
    setGameData(data);
  }, []);

  const handleSelectItem = useCallback(
    (index: number) => {
      gameCore.selectItem(index);
    },
    [gameCore]
  );

  const handleSelectUpgrade = useCallback(
    (index: number) => {
      gameCore.selectUpgrade(index);
    },
    [gameCore]
  );

  const handleRestart = useCallback(() => {
    gameCore.restart();
  }, [gameCore]);

  const containerStyle: React.CSSProperties = {
    width: '100vw',
    height: '100vh',
    backgroundColor: '#09090b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    margin: 0,
    padding: 0,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  };

  const canvasWrapperStyle: React.CSSProperties = {
    position: 'relative',
    border: '4px solid #1e1e2e',
    borderRadius: '8px',
    boxShadow: '0 0 40px rgba(0, 0, 0, 0.8)',
    overflow: 'hidden',
    transform: `scale(${canvasScale})`,
    transformOrigin: 'center center',
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  };

  const itemPanelStyle: React.CSSProperties = {
    width: '280px',
    backgroundColor: '#1e1e2e',
    border: '2px solid #3b3b4e',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
  };

  const panelTitleStyle: React.CSSProperties = {
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: 'bold',
    textAlign: 'center',
    margin: '0 0 16px 0',
  };

  const itemRowStyle: React.CSSProperties = {
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 12px',
    marginBottom: '8px',
    backgroundColor: '#2a2a3a',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    border: '1px solid transparent',
  };

  const itemRowHoverStyle: React.CSSProperties = {
    ...itemRowStyle,
    backgroundColor: '#3a3a4a',
    borderColor: '#60a5fa',
  };

  const itemIconStyle: React.CSSProperties = {
    fontSize: '24px',
    width: '32px',
    textAlign: 'center',
  };

  const itemInfoStyle: React.CSSProperties = {
    flex: 1,
  };

  const itemNameStyle: React.CSSProperties = {
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 'bold',
    margin: 0,
  };

  const itemDescStyle: React.CSSProperties = {
    color: '#9ca3af',
    fontSize: '11px',
    margin: 0,
  };

  const gameOverPanelStyle: React.CSSProperties = {
    width: '400px',
    backgroundColor: '#1e1e2e',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 10px 60px rgba(0, 0, 0, 0.8)',
    border: '2px solid #3b3b4e',
  };

  const gameOverTitleStyle: React.CSSProperties = {
    color: '#ef4444',
    fontSize: '28px',
    fontWeight: 'bold',
    textAlign: 'center',
    margin: '0 0 20px 0',
    textShadow: '0 0 20px rgba(239, 68, 68, 0.5)',
  };

  const statRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 16px',
    backgroundColor: '#2a2a3a',
    borderRadius: '8px',
    marginBottom: '8px',
  };

  const statLabelStyle: React.CSSProperties = {
    color: '#9ca3af',
    fontSize: '14px',
  };

  const statValueStyle: React.CSSProperties = {
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 'bold',
  };

  const restartButtonStyle: React.CSSProperties = {
    width: '160px',
    height: '48px',
    backgroundColor: '#e94560',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'block',
    margin: '20px auto 0',
    transition: 'background-color 0.2s, transform 0.1s',
  };

  const upgradePanelStyle: React.CSSProperties = {
    width: '320px',
    backgroundColor: '#1e1e2e',
    border: '2px solid #fbbf24',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 10px 40px rgba(251, 191, 36, 0.2)',
  };

  const upgradeTitleStyle: React.CSSProperties = {
    color: '#fbbf24',
    fontSize: '20px',
    fontWeight: 'bold',
    textAlign: 'center',
    margin: '0 0 16px 0',
    textShadow: '0 0 15px rgba(251, 191, 36, 0.4)',
  };

  const upgradeRowStyle: React.CSSProperties = {
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 16px',
    marginBottom: '10px',
    backgroundColor: '#2a2a3a',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '1px solid transparent',
  };

  const upgradeRowHoverStyle: React.CSSProperties = {
    ...upgradeRowStyle,
    backgroundColor: '#3a3a4a',
    borderColor: '#fbbf24',
    transform: 'translateX(4px)',
  };

  const upgradeIconStyle: React.CSSProperties = {
    width: '36px',
    height: '36px',
    backgroundColor: '#fbbf24',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#1e1e2e',
    fontSize: '14px',
    fontWeight: 'bold',
  };

  const upgradeInfoStyle: React.CSSProperties = {
    flex: 1,
  };

  const upgradeNameStyle: React.CSSProperties = {
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 'bold',
    margin: 0,
  };

  const upgradeDescStyle: React.CSSProperties = {
    color: '#9ca3af',
    fontSize: '12px',
    margin: 0,
  };

  const renderItemPanel = () => {
    if (gameData.state !== 'item_select' || gameData.chestItems.length === 0) return null;

    return (
      <div style={overlayStyle}>
        <div style={itemPanelStyle}>
          <h3 style={panelTitleStyle}>发现了宝藏！</h3>
          <p style={{ color: '#9ca3af', fontSize: '12px', textAlign: 'center', margin: '0 0 16px 0' }}>
            选择一件道具
          </p>
          {gameData.chestItems.map((item: IItem, index: number) => (
            <div
              key={item.id}
              style={itemRowStyle}
              onClick={() => handleSelectItem(index)}
              onMouseEnter={(e) => {
                Object.assign(e.currentTarget.style, {
                  backgroundColor: '#3a3a4a',
                  borderColor: '#60a5fa',
                });
              }}
              onMouseLeave={(e) => {
                Object.assign(e.currentTarget.style, {
                  backgroundColor: '#2a2a3a',
                  borderColor: 'transparent',
                });
              }}
            >
              <span style={itemIconStyle}>{item.icon}</span>
              <div style={itemInfoStyle}>
                <p style={itemNameStyle}>{item.name}</p>
                <p style={itemDescStyle}>{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderUpgradePanel = () => {
    if (gameData.state !== 'upgrade_select' || gameData.upgradeOptions.length === 0) return null;

    return (
      <div style={overlayStyle}>
        <div style={upgradePanelStyle}>
          <h3 style={upgradeTitleStyle}>🎉 楼层通关！</h3>
          <p style={{ color: '#9ca3af', fontSize: '12px', textAlign: 'center', margin: '0 0 16px 0' }}>
            选择一项永久升级
          </p>
          {gameData.upgradeOptions.map((upgrade: IPermanentUpgrade, index: number) => (
            <div
              key={upgrade.id}
              style={upgradeRowStyle}
              onClick={() => handleSelectUpgrade(index)}
              onMouseEnter={(e) => {
                Object.assign(e.currentTarget.style, {
                  backgroundColor: '#3a3a4a',
                  borderColor: '#fbbf24',
                  transform: 'translateX(4px)',
                });
              }}
              onMouseLeave={(e) => {
                Object.assign(e.currentTarget.style, {
                  backgroundColor: '#2a2a3a',
                  borderColor: 'transparent',
                  transform: 'translateX(0)',
                });
              }}
            >
              <div style={upgradeIconStyle}>{upgrade.icon}</div>
              <div style={upgradeInfoStyle}>
                <p style={upgradeNameStyle}>{upgrade.name}</p>
                <p style={upgradeDescStyle}>永久生效</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderGameOverPanel = () => {
    if (gameData.state !== 'game_over') return null;

    return (
      <div style={overlayStyle}>
        <div style={gameOverPanelStyle}>
          <h2 style={gameOverTitleStyle}>💀 你已死亡</h2>

          <div style={statRowStyle}>
            <span style={statLabelStyle}>到达楼层</span>
            <span style={statValueStyle}>{gameData.stats.floor}</span>
          </div>
          <div style={statRowStyle}>
            <span style={statLabelStyle}>击败敌人</span>
            <span style={statValueStyle}>{gameData.stats.enemiesKilled}</span>
          </div>
          <div style={statRowStyle}>
            <span style={statLabelStyle}>拾取金币</span>
            <span style={statValueStyle}>{gameData.stats.goldCollected}</span>
          </div>
          <div
            style={{
              ...statRowStyle,
              border: '1px solid #fbbf24',
            }}
          >
            <span style={{ ...statLabelStyle, color: '#fbbf24' }}>
              ⭐ 无尽点数
            </span>
            <span style={{ ...statValueStyle, color: '#fbbf24' }}>
              +{gameData.stats.endlessPoints}
            </span>
          </div>

          <button
            style={restartButtonStyle}
            onClick={handleRestart}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f5657a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#e94560';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.98)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            重新开始
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={containerStyle}>
      <div style={canvasWrapperStyle}>
        <GameCanvas
          gameCore={gameCore}
          onGameUpdate={handleGameUpdate}
          width={800}
          height={600}
        />
        <HUD gameData={gameData} />
      </div>

      {renderItemPanel()}
      {renderUpgradePanel()}
      {renderGameOverPanel()}

      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#6b7280',
          fontSize: '12px',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: '4px 0' }}>
          <span style={{ color: '#9ca3af' }}>WASD</span> 移动 |{' '}
          <span style={{ color: '#9ca3af' }}>J</span> 攻击
        </p>
      </div>
    </div>
  );
}
