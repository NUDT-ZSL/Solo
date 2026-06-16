import React, { useRef, useEffect, useCallback } from 'react';
import { GameState, Player, Mineral, Pirate, Star, PickupEffect, MAP_WIDTH, MAP_HEIGHT, WIN_MINERALS, MAX_SPEED, MAX_SPEED_BONUS_MULTIPLIER } from '../game/GameEngine';

interface GameCanvasProps {
  gameState: GameState | null;
  onMouseMove: (x: number, y: number) => void;
  onMouseLeave: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, onMouseMove, onMouseLeave) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const drawShip = useCallback((
    ctx: CanvasRenderingContext2D, player: Player, currentTime: number) => {
    const { x, y, vx, vy, color, flashUntil } = player;
    const isFlashing = currentTime < flashUntil;

    ctx.save();
    ctx.translate(x, y);

    const angle = Math.atan2(vy, vx);
    ctx.rotate(angle);

    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-15, -12);
    ctx.lineTo(-10, 0);
    ctx.lineTo(-15, 12);
    ctx.closePath();

    if (isFlashing) {
      ctx.fillStyle = '#E74C3C';
    } else {
      ctx.fillStyle = color;
    }
    ctx.fill();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (Math.abs(vx) > 0.5 || Math.abs(vy) > 0.5) {
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(-20 - Math.random() * 5, -5);
      ctx.lineTo(-25 - Math.random() * 5, 0);
      ctx.lineTo(-20 - Math.random() * 5, 5);
      ctx.closePath();
      const engineGlow = ctx.createRadialGradient(-20, 0, 0, -20, 0, 15);
      engineGlow.addColorStop(0, '#FFA500');
      engineGlow.addColorStop(1, 'rgba(255, 165, 0, 0)');
      ctx.fillStyle = engineGlow;
      ctx.fill();
    }

    ctx.restore();
  }, []);

  const drawMineral = useCallback((
    ctx: CanvasRenderingContext2D, mineral: Mineral) => {
    const { x, y, opacity } = mineral;
    
    ctx.save();
    ctx.globalAlpha = opacity;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 12);
    gradient.addColorStop(0, '#FFD700');
    gradient.addColorStop(0.7, '#FFA500');
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');

    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#FFD700';
    ctx.fill();

    ctx.restore();
  }, []);

  const drawPirate = useCallback((ctx: CanvasRenderingContext2D, pirate: Pirate) => {
    const { x, y, angle } = pirate;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-10, -17);
    ctx.lineTo(-10, 17);
    ctx.closePath();

    ctx.fillStyle = '#E74C3C';
    ctx.fill();

    ctx.strokeStyle = '#2C3E50';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('☠', 0, 4);

    ctx.restore();
  }, []);

  const drawStars = useCallback((ctx: CanvasRenderingContext2D, stars: Star[], currentTime: number) => {
    stars.forEach(star => {
      const twinkle = Math.sin(currentTime / 500 + star.twinkleOffset) * 0.3 + 0.7;
      const opacity = star.baseOpacity * twinkle;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.fill();
    });
  }, []);

  const drawPickupEffects = useCallback((ctx: CanvasRenderingContext2D, effects: PickupEffect[], currentTime: number) => {
    effects.forEach(effect => {
      const elapsed = currentTime - effect.startTime;
      const progress = elapsed / 200;
      const radius = 20 * progress;
      const opacity = 1 - progress;

      const gradient = ctx.createRadialGradient(
        effect.x, effect.y, 0,
        effect.x, effect.y, radius
      );
      gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.beginPath();
      ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    });
  }, []);

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0B0C10');
    gradient.addColorStop(1, '#1F2833');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const centerX = width * 0.7;
    const centerY = height * 0.3;
    const maxRadius = Math.min(width, height) * 0.4;

    const blackHole = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, maxRadius
    );
    blackHole.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
    blackHole.addColorStop(0.3, 'rgba(0, 0, 0, 0.4)');
    blackHole.addColorStop(0.6, 'rgba(0, 0, 0, 0.1)');
    blackHole.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = blackHole;
    ctx.fillRect(0, 0, width, height);
  }, []);

  const drawHUD = useCallback((ctx: CanvasRenderingContext2D, players: Player[]) => {
    if (players.length === 0) return;
    
    const player1 = players[0];
    const speedPercent = Math.min(100, 
      (Math.sqrt(player1.vx ** 2 + player1.vy ** 2) / (MAX_SPEED * MAX_SPEED_BONUS_MULTIPLIER) * 100);
    const mineralPercent = (player1.mineralCount / WIN_MINERALS) * 100;

    ctx.save();
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.roundRect(20, 20, 160, 200, 12);
    ctx.fill();

    ctx.fillStyle = '#C5C6C7';
    ctx.font = '14px Orbitron, sans-serif';
    ctx.fillText('玩家1', 35, 45);

    const barX = 35;
    const barWidth = 130;
    const barHeight = 12;
    const barY = 55;

    const mineralGradient = ctx.createLinearGradient(barX, barY, barX, barY + 130);
    mineralGradient.addColorStop(0, '#2C3E50');
    mineralGradient.addColorStop(1, '#F1C40F');

    ctx.fillStyle = 'rgba(44, 62, 80, 0.5)';
    ctx.fillRect(barX, barY, barWidth, 130);

    const mineralFillHeight = (mineralPercent / 100) * 130;
    ctx.fillStyle = mineralGradient;
    ctx.fillRect(barX, barY + 130 - mineralFillHeight, barWidth, mineralFillHeight);

    ctx.strokeStyle = '#66FCF1';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, 130);

    ctx.fillStyle = '#C5C6C7';
    ctx.font = '12px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${player1.mineralCount}/${WIN_MINERALS}`, barX + barWidth / 2, barY + 150);

    const speedBarY = 180;
    ctx.fillStyle = '#C5C6C7';
    ctx.font = '12px Orbitron, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`速度: ${speedPercent.toFixed(0)}%`, barX, speedBarY);

    ctx.fillStyle = 'rgba(44, 62, 80, 0.5)';
    ctx.fillRect(barX, speedBarY + 5, barWidth, barHeight);

    const speedGradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    speedGradient.addColorStop(0, '#45A29E');
    speedGradient.addColorStop(1, '#66FCF1');

    ctx.fillStyle = speedGradient;
    ctx.fillRect(barX, speedBarY + 5, (speedPercent / 100) * barWidth, barHeight);

    ctx.strokeStyle = '#66FCF1';
    ctx.strokeRect(barX, speedBarY + 5, barWidth, barHeight);

    ctx.restore();
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameState) return;

    const ctx = canvas.getContext