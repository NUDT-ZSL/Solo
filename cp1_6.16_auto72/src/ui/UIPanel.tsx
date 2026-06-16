import React, { useEffect, useState } from 'react';
import { GameEngine } from '../game/GameEngine';
import { RenderData, PlayerStatus } from '../game/types';

interface UIPanelProps {
  engine: GameEngine;
}

export default function UIPanel({ engine }: UIPanelProps) {
  const [renderData, setRenderData] = useState<RenderData | null>(null);
  const [status, setStatus] = useState<PlayerStatus | null>(null);
  const [shaking, setShaking] = useState(false);
  const prevHealthRef = useState<number>(-1);

  useEffect(() => {
    const unsubscribe = engine.onChange((data: RenderData) => {
      setRenderData(data);
      const s = engine.getPlayerStatus();
      setStatus(s);

      if (prevHealthRef.current > 0 && s.health < prevHealthRef.current) {
        setShaking(true);
        const timer = setTimeout(() => setShaking(false), 300);
        return () => clearTimeout(timer);
      }
      prevHealthRef.current = s.health;
    });
    return unsubscribe;
  }, [engine]);

  if (!renderData || !status) return null;

  const { player, status: gameStatus } = renderData;

  return (
    <div className="ui-panel">
      <div className="panel-section">
        <h3 className="panel-title">层数</h3>
        <span className="panel-value">{engine.getLevel()}</span>
      </div>

      <div className="panel-section">
        <h3 className="panel-title">步数</h3>
        <span className="panel-value">{player.steps}</span>
      </div>

      <div className="panel-section">
        <h3 className="panel-title">生命</h3>
        <div className={`health-bar-container ${shaking ? 'shake' : ''}`}>
          <div className="health-bar">
            <div
              className="health-fill"
              style={{ width: `${(status.health / status.maxHealth) * 100}%` }}
            />
          </div>
          <span className="health-text">{status.health}/{status.maxHealth}</span>
        </div>
      </div>

      <div className="panel-section">
        <h3 className="panel-title">闪光弹</h3>
        <div className="skill-display">
          <span className="skill-icon flash-icon">⚡</span>
          <span className="skill-count">{status.flashbangs}</span>
          {status.flashCooldown > 0 && (
            <span className="cooldown-text">
              {(status.flashCooldown / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      </div>

      <div className="panel-section">
        <h3 className="panel-title">回声探测</h3>
        <div className="skill-display">
          <span className="skill-icon echo-icon">👂</span>
          <span className="skill-count">{status.echoScans}</span>
          {status.echoCooldown > 0 && (
            <span className="cooldown-text">
              {(status.echoCooldown / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      </div>

      <div className="panel-controls">
        <h3 className="panel-title">操作</h3>
        <div className="control-row"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 移动</div>
        <div className="control-row"><kbd>F</kbd> 闪光弹</div>
        <div className="control-row"><kbd>E</kbd> 回声探测</div>
      </div>

      {gameStatus === 'lost' && (
        <div className="status-overlay death">
          <span>魂已消散</span>
        </div>
      )}
      {gameStatus === 'won' && (
        <div className="status-overlay victory">
          <span>通关成功</span>
        </div>
      )}
    </div>
  );
}
