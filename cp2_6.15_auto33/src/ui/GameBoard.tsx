import { useEffect, useRef, useState, useCallback } from 'react';
import type { GameState, HexCoord, Unit, Tower, PlayerId, UnitType } from '../shared/types';
import { hexToPixel, pixelToHex } from '../game/UnitFactory';

const HEX_SIZE = 40;

interface GameBoardProps {
  gameState: GameState | null;
  playerId: PlayerId | null;
  playerName: string;
  onBuild: (unitType: UnitType) => void;
}

export default function GameBoard({ gameState, playerId, playerName, onBuild }: GameBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredHex, setHoveredHex] = useState<HexCoord | null>(null);
  const [showBuildMenu, setShowBuildMenu] = useState<PlayerId | null>(null);
  const [buildMenuPos, setBuildMenuPos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);

  const drawHex = useCallback((ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, fill?: string, stroke?: string, lineWidth: number = 1) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const x = cx + size * Math.cos(angle);
      const y = cy + size * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameState) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2 + offset.x, height / 2 + offset.y);
    ctx.scale(scale, scale);

    const gridSize = gameState.gridSize;
    const centerOffset = -hexToPixel(Math.floor(gridSize / 2), Math.floor(gridSize / 2));

    ctx.save();
    ctx.translate(centerOffset.x, centerOffset.y);

    for (let q = 0; q < gridSize; q++) {
      for (let r = 0; r < gridSize; r++) {
        const pixel = hexToPixel(q, r);
        const isHovered = hoveredHex && hoveredHex.q === q && hoveredHex.r === r;

        drawHex(
          ctx, pixel.x, pixel.y, HEX_SIZE,
          undefined,
          'rgba(42, 90, 42, 0.5)',
          1
        );

        if (isHovered) {
          drawHex(
            ctx, pixel.x, pixel.y, HEX_SIZE - 2,
            'rgba(255, 221, 68, 0.3)',
            undefined
          );
        }
      }
    }

    const crystal = gameState.crystal;
    const crystalPixel = hexToPixel(crystal.position.q, crystal.position.r);
    const pulseScale = 1 + Math.sin(timeRef.current * Math.PI) * 0.1;
    const crystalSize = HEX_SIZE * 0.8 * pulseScale;

    const crystalGradient = ctx.createRadialGradient(
      crystalPixel.x, crystalPixel.y, 0,
      crystalPixel.x, crystalPixel.y, crystalSize
    );
    crystalGradient.addColorStop(0, '#66aaff');
    crystalGradient.addColorStop(0.5, '#4488ff');
    crystalGradient.addColorStop(1, '#2266cc');

    drawHex(ctx, crystalPixel.x, crystalPixel.y, crystalSize, crystalGradient as unknown as string, '#66aaff', 2);

    ctx.save();
    ctx.globalAlpha = 0.3;
    drawHex(ctx, crystalPixel.x, crystalPixel.y, crystalSize * 1.3, '#4488ff');
    ctx.restore();

    if (crystal.capturingPlayer && crystal.captureProgress > 0) {
      const captureColor = crystal.capturingPlayer === 'red' ? '#ff4444' : '#4488ff';
      ctx.strokeStyle = captureColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(crystalPixel.x, crystalPixel.y, crystalSize + 10, -Math.PI / 2, -Math.PI / 2 + crystal.captureProgress * Math.PI * 2);
      ctx.stroke();
    }

    const bases = gameState.bases;
    for (const baseId of ['red', 'blue'] as PlayerId[]) {
      const base = bases[baseId];
      const basePixel = hexToPixel(base.position.q, base.position.r);
      const baseColor = baseId === 'red' ? '#ff4444' : '#4444ff';

      const baseGradient = ctx.createRadialGradient(
        basePixel.x, basePixel.y, 0,
        basePixel.x, basePixel.y, HEX_SIZE * 1.2
      );
      baseGradient.addColorStop(0, baseColor);
      baseGradient.addColorStop(1, baseId === 'red' ? '#aa2222' : '#2222aa');

      drawHex(ctx, basePixel.x, basePixel.y, HEX_SIZE * 1.2, baseGradient as unknown as string, baseColor, 3);

      const hpRatio = base.hp / base.maxHp;
      const barWidth = HEX_SIZE * 1.5;
      const barHeight = 6;
      const barX = basePixel.x - barWidth / 2;
      const barY = basePixel.y - HEX_SIZE * 1.5 - 10;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      const hpColor = hpRatio > 0.5 ? '#44ff44' : hpRatio > 0.25 ? '#ffaa00' : '#ff4444';
      ctx.fillStyle = hpColor;
      ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${base.hp}/${base.maxHp}`, basePixel.x, barY - 2);
    }

    for (const tower of gameState.towers) {
      const towerPixel = hexToPixel(tower.position.q, tower.position.r);
      const towerColor = tower.owner === 'red' ? '#ff6644' : '#4488ff';
      const scale = tower.spawnAnimTimer > 0 ? 1 - tower.spawnAnimTimer / 0.3 : 1;

      ctx.save();
      ctx.translate(towerPixel.x, towerPixel.y);
      ctx.scale(scale, scale);

      if (tower.type === 'attack_tower') {
        ctx.fillStyle = towerColor;
        ctx.beginPath();
        ctx.arc(0, 0, HEX_SIZE * 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = towerColor === '#ff6644' ? '#ffaa88' : '#88bbff';
        ctx.beginPath();
        ctx.arc(0, -HEX_SIZE * 0.2, HEX_SIZE * 0.25, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#88ddff';
        drawHex(ctx, 0, 0, HEX_SIZE * 0.45, '#88ddff', '#4488ff', 2);

        ctx.fillStyle = '#aaeeff';
        drawHex(ctx, 0, 0, HEX_SIZE * 0.25, '#aaeeff');
      }

      if (tower.attackFlashTimer > 0) {
        ctx.globalAlpha = tower.attackFlashTimer / 0.1;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, HEX_SIZE * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      const hpRatio = tower.hp / tower.maxHp;
      const barWidth = HEX_SIZE * 0.8;
      const barHeight = 3;
      const barX = towerPixel.x - barWidth / 2;
      const barY = towerPixel.y - HEX_SIZE * 0.6 - 8;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      ctx.fillStyle = hpRatio > 0.5 ? '#44ff44' : '#ff4444';
      ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);
    }

    for (const unit of gameState.units) {
      const unitColor = unit.owner === 'red' ? '#ff4444' : '#4488ff';
      const scale = unit.spawnAnimTimer > 0 ? 1 - unit.spawnAnimTimer / 0.3 : 1;

      ctx.save();
      ctx.translate(unit.pixelX, unit.pixelY);
      ctx.scale(scale, scale);

      if (unit.type === 'fast_unit') {
        ctx.fillStyle = unitColor;
        ctx.beginPath();
        ctx.moveTo(0, -HEX_SIZE * 0.35);
        ctx.lineTo(HEX_SIZE * 0.3, HEX_SIZE * 0.3);
        ctx.lineTo(-HEX_SIZE * 0.3, HEX_SIZE * 0.3);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = unitColor;
        ctx.fillRect(-HEX_SIZE * 0.3, -HEX_SIZE * 0.3, HEX_SIZE * 0.6, HEX_SIZE * 0.6);

        ctx.strokeStyle = unit.owner === 'red' ? '#cc2222' : '#2266cc';
        ctx.lineWidth = 2;
        ctx.strokeRect(-HEX_SIZE * 0.3, -HEX_SIZE * 0.3, HEX_SIZE * 0.6, HEX_SIZE * 0.6);
      }

      if (unit.slowTimer > 0) {
        ctx.strokeStyle = '#88ddff';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(0, 0, HEX_SIZE * 0.4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (unit.attackFlashTimer > 0) {
        ctx.globalAlpha = unit.attackFlashTimer / 0.1;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, HEX_SIZE * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      const hpRatio = unit.hp / unit.maxHp;
      const barWidth = 20;
      const barHeight = 4;
      const barX = unit.pixelX - barWidth / 2;
      const barY = unit.pixelY - HEX_SIZE * 0.5 - 10;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      const hpGradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
      hpGradient.addColorStop(0, '#44ff44');
      hpGradient.addColorStop(1, '#ff4444');
      ctx.fillStyle = hpGradient as unknown as string;
      ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

      ctx.fillStyle = '#ffffff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(Math.ceil(unit.hp).toString(), unit.pixelX, barY - 2);
    }

    for (const particle of gameState.particles) {
      const alpha = particle.life / particle.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();
    ctx.restore();
  }, [gameState, hoveredHex, offset, scale, drawHex]);

  useEffect(() => {
    const animate = () => {
      timeRef.current = (Date.now() % 2000) / 1000;
      render();
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationRef.current);
  }, [render]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gameState || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2 - offset.x) / scale;
    const y = (e.clientY - rect.top - rect.height / 2 - offset.y) / scale;

    const gridSize = gameState.gridSize;
    const centerOffset = hexToPixel(Math.floor(gridSize / 2), Math.floor(gridSize / 2));
    const worldX = x - centerOffset.x;
    const worldY = y - centerOffset.y;

    const hex = pixelToHex(worldX, worldY);

    const bases = gameState.bases;
    for (const baseId of ['red', 'blue'] as PlayerId[]) {
      if (baseId === playerId && hex.q === bases[baseId].position.q && hex.r === bases[baseId].position.r) {
        setShowBuildMenu(baseId);
        setBuildMenuPos({ x: e.clientX, y: e.clientY });
        return;
      }
    }

    setShowBuildMenu(null);
  }, [gameState, offset, scale, playerId]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gameState || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2 - offset.x) / scale;
    const y = (e.clientY - rect.top - rect.height / 2 - offset.y) / scale;

    const gridSize = gameState.gridSize;
    const centerOffset = hexToPixel(Math.floor(gridSize / 2), Math.floor(gridSize / 2));
    const worldX = x - centerOffset.x;
    const worldY = y - centerOffset.y;

    const hex = pixelToHex(worldX, worldY);
    if (hex.q >= 0 && hex.q < gridSize && hex.r >= 0 && hex.r < gridSize) {
      setHoveredHex(hex);
    } else {
      setHoveredHex(null);
    }
  }, [gameState, offset, scale]);

  const handleBuild = (unitType: UnitType) => {
    if (playerId) {
      onBuild(unitType);
    }
    setShowBuildMenu(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredHex(null)}
      />

      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-8 bg-black/60 px-8 py-3 rounded-xl backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-red-500"></div>
          <span className="text-white font-bold text-lg">{gameState?.scores.red || 0}</span>
          <div className="w-24 h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300"
              style={{ height: `${Math.max(10, ((gameState?.timeRemaining || 0) / 900) * 100)}%` }}
            />
          </div>
        </div>

        <div className="text-white font-mono text-xl font-bold">
          {formatTime(gameState?.timeRemaining || 900)}
        </div>

        <div className="flex items-center gap-3">
          <div className="w-24 h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300 ml-auto"
              style={{ height: `${Math.max(10, ((gameState?.timeRemaining || 0) / 900) * 100)}%` }}
            />
          </div>
          <span className="text-white font-bold text-lg">{gameState?.scores.blue || 0}</span>
          <div className="w-4 h-4 rounded-full bg-blue-500"></div>
        </div>
      </div>

      <div className="absolute top-4 left-4 text-white/60 text-sm">
        玩家: {playerName} ({playerId === 'red' ? '红方' : '蓝方'})
      </div>

      {showBuildMenu && (
        <div
          className="fixed z-50 bg-gray-900/95 backdrop-blur-sm rounded-xl p-3 shadow-2xl border border-gray-700"
          style={{
            left: buildMenuPos.x,
            top: buildMenuPos.y + 10,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div className="text-white text-sm font-bold mb-2 px-2">建造菜单</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="px-3 py-2 bg-red-600/80 hover:bg-red-500 text-white text-xs rounded-lg transition-all hover:scale-105"
              onClick={() => handleBuild('attack_tower')}
            >
              <div className="font-bold">攻击塔</div>
              <div className="text-red-200 text-[10px]">攻击20 射程3</div>
            </button>
            <button
              className="px-3 py-2 bg-cyan-600/80 hover:bg-cyan-500 text-white text-xs rounded-lg transition-all hover:scale-105"
              onClick={() => handleBuild('ice_tower')}
            >
              <div className="font-bold">冰塔</div>
              <div className="text-cyan-200 text-[10px]">减速50%</div>
            </button>
            <button
              className="px-3 py-2 bg-orange-600/80 hover:bg-orange-500 text-white text-xs rounded-lg transition-all hover:scale-105"
              onClick={() => handleBuild('fast_unit')}
            >
              <div className="font-bold">快速兵</div>
              <div className="text-orange-200 text-[10px]">速度2 攻击10</div>
            </button>
            <button
              className="px-3 py-2 bg-purple-600/80 hover:bg-purple-500 text-white text-xs rounded-lg transition-all hover:scale-105"
              onClick={() => handleBuild('heavy_unit')}
            >
              <div className="font-bold">重型兵</div>
              <div className="text-purple-200 text-[10px]">攻击30 血150</div>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
