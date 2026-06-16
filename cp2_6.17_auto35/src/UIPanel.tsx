import React, { useEffect, useRef } from 'react';
import { UIState, CANVAS_WIDTH, CANVAS_HEIGHT, RADAR_SIZE } from './entities';

interface UIPanelProps {
  uiState: UIState;
  onRestart: () => void;
}

export const UIPanel: React.FC<UIPanelProps> = ({ uiState, onRestart }) => {
  const radarCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = RADAR_SIZE * dpr;
    canvas.height = RADAR_SIZE * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, RADAR_SIZE, RADAR_SIZE);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, RADAR_SIZE, RADAR_SIZE);

    ctx.strokeStyle = 'rgba(0, 230, 118, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(RADAR_SIZE / 2, RADAR_SIZE / 2, RADAR_SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(RADAR_SIZE / 2, RADAR_SIZE / 2, RADAR_SIZE / 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(RADAR_SIZE / 2, 2);
    ctx.lineTo(RADAR_SIZE / 2, RADAR_SIZE - 2);
    ctx.moveTo(2, RADAR_SIZE / 2);
    ctx.lineTo(RADAR_SIZE - 2, RADAR_SIZE / 2);
    ctx.stroke();

    const scaleX = RADAR_SIZE / CANVAS_WIDTH;
    const scaleY = RADAR_SIZE / CANVAS_HEIGHT;

    const { radarData } = uiState;

    radarData.minerals.forEach(m => {
      const x = m.x * scaleX;
      const y = m.y * scaleY;
      ctx.fillStyle = '#ffd54f';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    radarData.mines.forEach(m => {
      const x = m.x * scaleX;
      const y = m.y * scaleY;
      ctx.fillStyle = '#8e24aa';
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    const stationX = radarData.station.x * scaleX;
    const stationY = radarData.station.y * scaleY;
    ctx.fillStyle = '#00e676';
    ctx.beginPath();
    ctx.arc(stationX, stationY, 4, 0, Math.PI * 2);
    ctx.fill();

    const shipX = radarData.ship.x * scaleX;
    const shipY = radarData.ship.y * scaleY;
    ctx.save();
    ctx.translate(shipX, shipY);
    ctx.rotate(0);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(-3, -3);
    ctx.lineTo(-3, 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    const scanGradient = ctx.createConicGradient
      ? ctx.createConicGradient(radarData.scanAngle, RADAR_SIZE / 2, RADAR_SIZE / 2)
      : null;

    if (scanGradient) {
      scanGradient.addColorStop(0, 'rgba(0, 230, 118, 0.4)');
      scanGradient.addColorStop(0.1, 'rgba(0, 230, 118, 0)');
      scanGradient.addColorStop(1, 'rgba(0, 230, 118, 0)');
      ctx.fillStyle = scanGradient;
      ctx.beginPath();
      ctx.arc(RADAR_SIZE / 2, RADAR_SIZE / 2, RADAR_SIZE / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(0, 230, 118, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(RADAR_SIZE / 2, RADAR_SIZE / 2);
    ctx.lineTo(
      RADAR_SIZE / 2 + Math.cos(radarData.scanAngle) * (RADAR_SIZE / 2 - 2),
      RADAR_SIZE / 2 + Math.sin(radarData.scanAngle) * (RADAR_SIZE / 2 - 2)
    );
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 230, 118, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, RADAR_SIZE, RADAR_SIZE);
  }, [uiState.radarData]);

  const healthPercent = uiState.health;
  const energyPercent = uiState.energy;

  return (
    <div className="ui-panel">
      <div className="panel-section">
        <div className="label">生命值</div>
        <div className="bar-container">
          <div
            className="bar health-bar"
            style={{ width: `${healthPercent}%` }}
          />
        </div>
        <div className="value">{Math.floor(uiState.health)}/100</div>
      </div>

      <div className="panel-section">
        <div className="label">矿物</div>
        <div className="mineral-count">{uiState.minerals}</div>
      </div>

      <div className="panel-section">
        <div className="label">能量</div>
        <div className="bar-container">
          <div
            className="bar energy-bar"
            style={{ width: `${energyPercent}%` }}
          />
        </div>
        <div className="value">{Math.floor(uiState.energy)}/100</div>
      </div>

      <div className="panel-section">
        <div className="label">得分</div>
        <div className="score">{uiState.score}</div>
      </div>

      <div className="panel-section radar-section">
        <div className="label">雷达</div>
        <canvas
          ref={radarCanvasRef}
          style={{ width: RADAR_SIZE, height: RADAR_SIZE }}
          className="radar-canvas"
        />
      </div>

      <div className="panel-section instructions">
        <div className="label">操作说明</div>
        <div className="instruction-item">↑↓←→ / WASD: 移动</div>
        <div className="instruction-item">E: 采集矿物</div>
        <div className="instruction-item">返回空间站补充能量</div>
      </div>

      {uiState.showLowEnergyWarning && (
        <div className="low-energy-warning">
          ⚠ 能量不足
        </div>
      )}

      {uiState.gameOver && (
        <div className="game-over-overlay">
          <div className="game-over-content">
            <h2>游戏结束</h2>
            <p>最终得分: {uiState.score}</p>
            <button onClick={onRestart} className="restart-button">
              重新开始
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
