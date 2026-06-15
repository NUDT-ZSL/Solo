import { GameData, Piece, CELL_SIZE, BOARD_SIZE, getLightPieces, getShadowPieces } from './game';

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  boardOffset: { x: number; y: number };
  cellSize: number;
  time: number;
}

const COLORS = {
  boardWood: '#3E2723',
  boardWoodLight: '#5D4037',
  boardWoodDark: '#2C1810',
  goldLine: '#D4AF37',
  player1Light: '#FFD700',
  player1Glow: 'rgba(255, 215, 0, 0.6)',
  player2Light: '#00FFFF',
  player2Glow: 'rgba(0, 255, 255, 0.6)',
  shadowVisible: '#2a2a5e',
  uiBg: '#2E2E2E',
  uiBorder: '#D4AF37',
  text: '#D4AF37',
  bgStart: '#1a1a2e',
  bgEnd: '#16213e'
};

export function createRenderContext(canvas: HTMLCanvasElement): RenderContext {
  const ctx = canvas.getContext('2d')!;
  return {
    ctx,
    canvas,
    boardOffset: { x: 0, y: 0 },
    cellSize: CELL_SIZE,
    time: 0
  };
}

export function resizeCanvas(renderCtx: RenderContext, width: number, height: number): void {
  renderCtx.canvas.width = width;
  renderCtx.canvas.height = height;
  
  const boardPixelSize = Math.min(width * 0.75, height * 0.72);
  renderCtx.cellSize = Math.floor(boardPixelSize / BOARD_SIZE);
  renderCtx.boardOffset.x = (width - renderCtx.cellSize * BOARD_SIZE) / 2;
  renderCtx.boardOffset.y = (height - renderCtx.cellSize * BOARD_SIZE) / 2 + 40;
}

export function render(renderCtx: RenderContext, gameData: GameData): void {
  const { ctx, canvas } = renderCtx;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  drawBackground(renderCtx, gameData);
  drawStars(renderCtx, gameData);
  drawBoard(renderCtx, gameData);
  drawRipples(renderCtx, gameData);
  drawTrails(renderCtx, gameData);
  drawPieces(renderCtx, gameData);
  drawParticles(renderCtx, gameData);
  drawUI(renderCtx, gameData);
  
  if (gameData.gameState === 'title') {
    drawTitleScreen(renderCtx, gameData);
  } else if (gameData.gameState === 'paused') {
    drawPauseScreen(renderCtx, gameData);
  } else if (gameData.gameState === 'gameover') {
    drawGameOverScreen(renderCtx, gameData);
  } else if (gameData.gameState === 'restart-confirm') {
    drawRestartConfirm(renderCtx, gameData);
  }
}

function drawBackground(renderCtx: RenderContext, _gameData: GameData): void {
  const { ctx, canvas, time } = renderCtx;
  
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, COLORS.bgStart);
  gradient.addColorStop(0.5 + Math.sin(time * 0.1) * 0.1, '#1e1e3a');
  gradient.addColorStop(1, COLORS.bgEnd);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawStars(renderCtx: RenderContext, gameData: GameData): void {
  const { ctx, canvas, time } = renderCtx;
  
  for (const star of gameData.stars) {
    const x = (star.x / 100) * canvas.width;
    const y = (star.y / 100) * canvas.height;
    const brightness = star.brightness * (0.5 + Math.sin(time * 2 + star.twinkle) * 0.5);
    
    ctx.beginPath();
    ctx.arc(x, y, star.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.fill();
    
    if (star.size > 1.5) {
      ctx.beginPath();
      ctx.arc(x, y, star.size * 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 200, 255, ${brightness * 0.15})`;
      ctx.fill();
    }
  }
}

function drawBoard(renderCtx: RenderContext, gameData: GameData): void {
  const { ctx, boardOffset, cellSize, time } = renderCtx;
  
  ctx.save();
  ctx.translate(boardOffset.x, boardOffset.y);
  
  ctx.shadowColor = 'rgba(212, 175, 55, 0.3)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = COLORS.boardWood;
  ctx.fillRect(-6, -6, cellSize * BOARD_SIZE + 12, cellSize * BOARD_SIZE + 12);
  ctx.shadowBlur = 0;
  
  const borderGradient = ctx.createLinearGradient(-6, -6, cellSize * BOARD_SIZE + 6, cellSize * BOARD_SIZE + 6);
  borderGradient.addColorStop(0, COLORS.goldLine);
  borderGradient.addColorStop(0.5, '#F0E68C');
  borderGradient.addColorStop(1, COLORS.goldLine);
  
  ctx.strokeStyle = borderGradient;
  ctx.lineWidth = 3;
  ctx.strokeRect(-6, -6, cellSize * BOARD_SIZE + 12, cellSize * BOARD_SIZE + 12);
  
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const isLight = (x + y) % 2 === 0;
      
      const cellGradient = ctx.createLinearGradient(
        x * cellSize, y * cellSize,
        x * cellSize + cellSize, y * cellSize + cellSize
      );
      
      if (isLight) {
        cellGradient.addColorStop(0, COLORS.boardWoodLight);
        cellGradient.addColorStop(1, '#4E342E');
      } else {
        cellGradient.addColorStop(0, COLORS.boardWoodDark);
        cellGradient.addColorStop(1, '#1B0F0A');
      }
      
      ctx.fillStyle = cellGradient;
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      
      if (gameData.selectedPiece && gameData.gameState === 'playing') {
        const dx = x - gameData.selectedPiece.position.x;
        const dy = y - gameData.selectedPiece.position.y;
        if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && (dx !== 0 || dy !== 0)) {
          const highlightColor = gameData.currentPlayer === 1 ? COLORS.player1Light : COLORS.player2Light;
          const pulse = 0.3 + Math.sin(time * 4) * 0.15;
          ctx.fillStyle = hexToRgba(highlightColor, pulse);
          ctx.fillRect(x * cellSize + 2, y * cellSize + 2, cellSize - 4, cellSize - 4);
        }
      }
      
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x * cellSize + 0.5, y * cellSize + 0.5, cellSize - 1, cellSize - 1);
    }
  }
  
  ctx.restore();
}

function drawRipples(renderCtx: RenderContext, gameData: GameData): void {
  const { ctx, boardOffset } = renderCtx;
  
  ctx.save();
  ctx.translate(boardOffset.x, boardOffset.y);
  
  for (const r of gameData.ripples) {
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.strokeStyle = hexToRgba(r.color, r.alpha);
    ctx.lineWidth = 2;
    ctx.stroke();
    
    if (r.radius > 15) {
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius * 0.6, 0, Math.PI * 2);
      ctx.strokeStyle = hexToRgba(r.color, r.alpha * 0.5);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  
  ctx.restore();
}

function drawTrails(renderCtx: RenderContext, gameData: GameData): void {
  const { ctx, boardOffset, cellSize } = renderCtx;
  
  ctx.save();
  ctx.translate(boardOffset.x, boardOffset.y);
  ctx.globalCompositeOperation = 'lighter';
  
  for (const [pieceId, trail] of gameData.trails) {
    const piece = gameData.pieces.find(p => p.id === pieceId);
    if (!piece || trail.length < 2) continue;
    
    const color = piece.player === 1 ? COLORS.player1Light : COLORS.player2Light;
    
    for (let i = 1; i < trail.length; i++) {
      const prev = trail[i - 1];
      const curr = trail[i];
      
      const alpha = curr.alpha * 0.95;
      const lineWidth = cellSize * 0.35 * curr.alpha;
      
      const x1 = prev.x * cellSize + cellSize / 2;
      const y1 = prev.y * cellSize + cellSize / 2;
      const x2 = curr.x * cellSize + cellSize / 2;
      const y2 = curr.y * cellSize + cellSize / 2;
      
      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, hexToRgba(color, alpha * 0.3));
      gradient.addColorStop(0.5, hexToRgba(color, alpha));
      gradient.addColorStop(1, hexToRgba(color, alpha * 0.3));
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.stroke();
      
      const glowGradient = ctx.createRadialGradient(x2, y2, 0, x2, y2, lineWidth * 2);
      glowGradient.addColorStop(0, hexToRgba(color, alpha));
      glowGradient.addColorStop(1, hexToRgba(color, 0));
      
      ctx.beginPath();
      ctx.arc(x2, y2, lineWidth * 2, 0, Math.PI * 2);
      ctx.fillStyle = glowGradient;
      ctx.fill();
    }
    
    for (let i = 0; i < trail.length; i++) {
      const point = trail[i];
      const alpha = point.alpha * 0.85;
      const size = cellSize * 0.3 * point.alpha;
      
      const gradient = ctx.createRadialGradient(
        point.x * cellSize + cellSize / 2,
        point.y * cellSize + cellSize / 2,
        0,
        point.x * cellSize + cellSize / 2,
        point.y * cellSize + cellSize / 2,
        size * 2.5
      );
      gradient.addColorStop(0, hexToRgba(color, alpha));
      gradient.addColorStop(0.4, hexToRgba(color, alpha * 0.7));
      gradient.addColorStop(1, hexToRgba(color, 0));
      
      ctx.beginPath();
      ctx.arc(
        point.x * cellSize + cellSize / 2,
        point.y * cellSize + cellSize / 2,
        size * 2.5,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = gradient;
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(
        point.x * cellSize + cellSize / 2,
        point.y * cellSize + cellSize / 2,
        size * 0.6,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = hexToRgba('#FFFFFF', alpha * 0.9);
      ctx.fill();
    }
  }
  
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

function drawPieces(renderCtx: RenderContext, gameData: GameData): void {
  const { ctx, boardOffset, cellSize } = renderCtx;
  
  ctx.save();
  ctx.translate(boardOffset.x, boardOffset.y);
  
  const shadowPieces = gameData.pieces.filter(p => p.alive && p.type === 'shadow');
  const lightPieces = gameData.pieces.filter(p => p.alive && p.type === 'light');
  
  for (const piece of shadowPieces) {
    drawShadowPiece(ctx, piece, cellSize, gameData, renderCtx);
  }
  
  for (const piece of lightPieces) {
    drawLightPiece(ctx, piece, cellSize, gameData, renderCtx);
  }
  
  ctx.restore();
}

function drawLightPiece(
  ctx: CanvasRenderingContext2D,
  piece: Piece,
  cellSize: number,
  gameData: GameData,
  renderCtx: RenderContext
): void {
  const x = piece.position.x * cellSize + cellSize / 2;
  const y = piece.position.y * cellSize + cellSize / 2;
  const radius = cellSize * 0.38;
  
  const color = piece.player === 1 ? COLORS.player1Light : COLORS.player2Light;
  const glowColor = piece.player === 1 ? COLORS.player1Glow : COLORS.player2Glow;
  
  const relMouseX = gameData.mousePosition.x - piece.position.x - 0.5;
  const relMouseY = gameData.mousePosition.y - piece.position.y - 0.5;
  const shadowOffsetX = Math.max(-8, Math.min(8, relMouseX * 4));
  const shadowOffsetY = Math.max(-8, Math.min(8, relMouseY * 4));
  
  ctx.save();
  
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = shadowOffsetX;
  ctx.shadowOffsetY = shadowOffsetY;
  
  ctx.beginPath();
  ctx.ellipse(x + shadowOffsetX * 0.5, y + radius + shadowOffsetY * 0.3, radius * 0.7, radius * 0.25, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fill();
  
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  
  const outerGlow = ctx.createRadialGradient(x, y, radius * 0.5, x, y, radius * 2.5);
  outerGlow.addColorStop(0, glowColor);
  outerGlow.addColorStop(1, hexToRgba(color, 0));
  ctx.beginPath();
  ctx.arc(x, y, radius * 2.5, 0, Math.PI * 2);
  ctx.fillStyle = outerGlow;
  ctx.fill();
  
  const bodyGradient = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
  bodyGradient.addColorStop(0, hexToRgba('#FFFFFF', 0.9));
  bodyGradient.addColorStop(0.3, hexToRgba(color, 0.95));
  bodyGradient.addColorStop(0.7, hexToRgba(color, 0.7));
  bodyGradient.addColorStop(1, hexToRgba(color, 0.4));
  
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = bodyGradient;
  ctx.fill();
  
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.shadowBlur = 0;
  
  ctx.beginPath();
  ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fill();
  
  if (gameData.selectedPiece?.id === piece.id) {
    const pulse = Math.sin(renderCtx.time * 5) * 0.15 + 1;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.3 * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = hexToRgba(color, 0.6);
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.5 * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = hexToRgba(color, 0.3);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  
  ctx.fillStyle = hexToRgba('#000000', 0.8);
  ctx.font = `bold ${cellSize * 0.3}px 'Press Start 2P', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
  ctx.shadowBlur = 5;
  ctx.fillText('★', x, y + 2);
  ctx.shadowBlur = 0;
  
  ctx.restore();
}

function drawShadowPiece(
  ctx: CanvasRenderingContext2D,
  piece: Piece,
  cellSize: number,
  gameData: GameData,
  renderCtx: RenderContext
): void {
  const x = piece.position.x * cellSize + cellSize / 2;
  const y = piece.position.y * cellSize + cellSize / 2;
  const radius = cellSize * 0.36;
  
  const playerColor = piece.player === 1 ? COLORS.player1Light : COLORS.player2Light;
  
  if (piece.isRevealed) {
    const pulse = Math.sin(renderCtx.time * 8) * 0.1 + 1;
    const alpha = 0.7 + piece.revealPulse * 0.3;
    
    const rippleRadius = radius * (1.8 + (1 - piece.revealPulse) * 0.5) * pulse;
    ctx.beginPath();
    ctx.arc(x, y, rippleRadius, 0, Math.PI * 2);
    ctx.strokeStyle = hexToRgba(playerColor, 0.4 * alpha);
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(x, y, rippleRadius * 0.7, 0, Math.PI * 2);
    ctx.strokeStyle = hexToRgba(playerColor, 0.6 * alpha);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    const outerGlow = ctx.createRadialGradient(x, y, radius * 0.5, x, y, radius * 2);
    outerGlow.addColorStop(0, hexToRgba(playerColor, 0.3 * alpha));
    outerGlow.addColorStop(1, hexToRgba(playerColor, 0));
    ctx.beginPath();
    ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
    ctx.fillStyle = outerGlow;
    ctx.fill();
    
    const bodyGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    bodyGradient.addColorStop(0, hexToRgba(COLORS.shadowVisible, alpha));
    bodyGradient.addColorStop(0.8, hexToRgba('#1a1a3e', alpha * 0.9));
    bodyGradient.addColorStop(1, hexToRgba('#0a0a1e', alpha * 0.7));
    
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = bodyGradient;
    ctx.fill();
    
    ctx.strokeStyle = hexToRgba(playerColor, alpha);
    ctx.lineWidth = 2;
    ctx.shadowColor = playerColor;
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = hexToRgba(playerColor, alpha * 0.9);
    ctx.font = `bold ${cellSize * 0.28}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('◆', x, y + 1);
  } else {
    const hintAlpha = 0.08 + Math.sin(renderCtx.time * 1.5 + piece.id) * 0.03;
    
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.9, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(10, 10, 30, ${hintAlpha + 0.05})`;
    ctx.fill();
    
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 3, radius * 0.8, radius * 0.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 0, 0, ${hintAlpha})`;
    ctx.fill();
    
    if (gameData.mousePosition.x >= piece.position.x && 
        gameData.mousePosition.x < piece.position.x + 1 &&
        gameData.mousePosition.y >= piece.position.y && 
        gameData.mousePosition.y < piece.position.y + 1) {
      ctx.beginPath();
      ctx.arc(x, y, radius * 1.2, 0, Math.PI * 2);
      ctx.strokeStyle = hexToRgba(playerColor, 0.25);
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

function drawParticles(renderCtx: RenderContext, gameData: GameData): void {
  const { ctx, boardOffset } = renderCtx;
  
  ctx.save();
  ctx.translate(boardOffset.x, boardOffset.y);
  ctx.globalCompositeOperation = 'lighter';
  
  for (const p of gameData.particles) {
    if (!p.active) continue;
    
    const alpha = p.life / p.maxLife;
    const currentSize = p.size * alpha;
    
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentSize * 1.5);
    if (p.color.startsWith('#')) {
      gradient.addColorStop(0, hexToRgba(p.color, alpha));
      gradient.addColorStop(1, hexToRgba(p.color, 0));
    } else {
      gradient.addColorStop(0, `rgba(30, 30, 60, ${alpha})`);
      gradient.addColorStop(1, 'rgba(30, 30, 60, 0)');
    }
    
    ctx.beginPath();
    ctx.arc(p.x, p.y, currentSize * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(p.x, p.y, currentSize * 0.5, 0, Math.PI * 2);
    if (p.color.startsWith('#')) {
      ctx.fillStyle = hexToRgba(p.color, Math.min(1, alpha * 1.5));
    } else {
      ctx.fillStyle = `rgba(50, 50, 80, ${alpha})`;
    }
    ctx.fill();
  }
  
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

function drawUI(renderCtx: RenderContext, gameData: GameData): void {
  const { ctx, canvas } = renderCtx;
  
  if (gameData.gameState !== 'playing' && gameData.gameState !== 'paused') return;
  
  const player1Lights = getLightPieces(gameData, 1).length;
  const player1Shadows = getShadowPieces(gameData, 1).length;
  const player2Lights = getLightPieces(gameData, 2).length;
  const player2Shadows = getShadowPieces(gameData, 2).length;
  
  ctx.font = '14px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  
  const turnText = `回合 ${gameData.turn}`;
  ctx.fillStyle = COLORS.text;
  ctx.shadowColor = 'rgba(212, 175, 55, 0.5)';
  ctx.shadowBlur = 10;
  ctx.fillText(turnText, canvas.width / 2, 45);
  ctx.shadowBlur = 0;
  
  const currentPlayerText = `玩家 ${gameData.currentPlayer} 的回合`;
  const currentColor = gameData.currentPlayer === 1 ? COLORS.player1Light : COLORS.player2Light;
  ctx.fillStyle = currentColor;
  ctx.shadowColor = currentColor;
  ctx.shadowBlur = 8;
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillText(currentPlayerText, canvas.width / 2, 72);
  ctx.shadowBlur = 0;
  
  ctx.textAlign = 'left';
  ctx.font = '10px "Press Start 2P", monospace';
  
  ctx.fillStyle = COLORS.player1Light;
  ctx.shadowColor = COLORS.player1Light;
  ctx.shadowBlur = 5;
  ctx.fillText('玩家1', 25, 45);
  ctx.shadowBlur = 0;
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillStyle = '#CCC';
  ctx.fillText(`明棋: ${player1Lights}`, 25, 68);
  ctx.fillStyle = '#888';
  ctx.fillText(`暗棋: ${player1Shadows}`, 25, 85);
  
  const p1Cooldown = gameData.shadowCooldown.get(1) || 0;
  if (p1Cooldown > 0) {
    ctx.fillStyle = '#666';
    ctx.fillText(`CD: ${(p1Cooldown / 1000).toFixed(1)}s`, 25, 102);
  } else {
    ctx.fillStyle = COLORS.player1Light;
    ctx.fillText('暗棋就绪', 25, 102);
  }
  
  ctx.textAlign = 'right';
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillStyle = COLORS.player2Light;
  ctx.shadowColor = COLORS.player2Light;
  ctx.shadowBlur = 5;
  ctx.fillText('玩家2', canvas.width - 25, 45);
  ctx.shadowBlur = 0;
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillStyle = '#CCC';
  ctx.fillText(`明棋: ${player2Lights}`, canvas.width - 25, 68);
  ctx.fillStyle = '#888';
  ctx.fillText(`暗棋: ${player2Shadows}`, canvas.width - 25, 85);
  
  const p2Cooldown = gameData.shadowCooldown.get(2) || 0;
  if (p2Cooldown > 0) {
    ctx.fillStyle = '#666';
    ctx.fillText(`CD: ${(p2Cooldown / 1000).toFixed(1)}s`, canvas.width - 25, 102);
  } else {
    ctx.fillStyle = COLORS.player2Light;
    ctx.fillText('暗棋就绪', canvas.width - 25, 102);
  }
  
  const revealProgress = gameData.shadowRevealTimer / gameData.shadowRevealInterval;
  const barWidth = 120;
  const barHeight = 8;
  const barX = canvas.width / 2 - barWidth / 2;
  const barY = 95;
  
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(barX, barY, barWidth, barHeight);
  
  const barGradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
  barGradient.addColorStop(0, COLORS.goldLine);
  barGradient.addColorStop(1, '#F0E68C');
  ctx.fillStyle = barGradient;
  ctx.fillRect(barX, barY, barWidth * revealProgress, barHeight);
  
  ctx.strokeStyle = COLORS.goldLine;
  ctx.lineWidth = 1;
  ctx.strokeRect(barX + 0.5, barY + 0.5, barWidth - 1, barHeight - 1);
  
  ctx.font = '7px "Press Start 2P", monospace';
  ctx.fillStyle = '#888';
  ctx.textAlign = 'center';
  ctx.fillText('暗棋显现倒计时', canvas.width / 2, barY + barHeight + 14);
}

function drawTitleScreen(renderCtx: RenderContext, _gameData: GameData): void {
  const { ctx, canvas, time } = renderCtx;
  
  ctx.fillStyle = 'rgba(26, 26, 46, 0.92)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.font = '36px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.goldLine;
  ctx.shadowColor = COLORS.goldLine;
  ctx.shadowBlur = 30;
  const titleY = canvas.height / 2 - 140 + Math.sin(time * 2) * 5;
  ctx.fillText('影子棋局', canvas.width / 2, titleY);
  ctx.shadowBlur = 0;
  
  ctx.font = '14px "Press Start 2P", monospace';
  ctx.fillStyle = '#888';
  ctx.fillText('SHADOW CHESS', canvas.width / 2, titleY + 40);
  
  const avatarY = canvas.height / 2 - 20;
  const avatarSize = 70;
  
  const p1Glow = ctx.createRadialGradient(
    canvas.width / 2 - 120, avatarY, 0,
    canvas.width / 2 - 120, avatarY, avatarSize * 1.5
  );
  p1Glow.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
  p1Glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
  ctx.fillStyle = p1Glow;
  ctx.beginPath();
  ctx.arc(canvas.width / 2 - 120, avatarY, avatarSize * 1.5, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
  ctx.beginPath();
  ctx.arc(canvas.width / 2 - 120, avatarY, avatarSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.player1Light;
  ctx.lineWidth = 3;
  ctx.shadowColor = COLORS.player1Light;
  ctx.shadowBlur = 15;
  ctx.stroke();
  ctx.shadowBlur = 0;
  
  ctx.fillStyle = COLORS.player1Light;
  ctx.font = '14px "Press Start 2P", monospace';
  ctx.fillText('P1', canvas.width / 2 - 120, avatarY + 5);
  
  const p2Glow = ctx.createRadialGradient(
    canvas.width / 2 + 120, avatarY, 0,
    canvas.width / 2 + 120, avatarY, avatarSize * 1.5
  );
  p2Glow.addColorStop(0, 'rgba(0, 255, 255, 0.3)');
  p2Glow.addColorStop(1, 'rgba(0, 255, 255, 0)');
  ctx.fillStyle = p2Glow;
  ctx.beginPath();
  ctx.arc(canvas.width / 2 + 120, avatarY, avatarSize * 1.5, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = 'rgba(0, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.arc(canvas.width / 2 + 120, avatarY, avatarSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.player2Light;
  ctx.lineWidth = 3;
  ctx.shadowColor = COLORS.player2Light;
  ctx.shadowBlur = 15;
  ctx.stroke();
  ctx.shadowBlur = 0;
  
  ctx.fillStyle = COLORS.player2Light;
  ctx.fillText('P2', canvas.width / 2 + 120, avatarY + 5);
  
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillStyle = '#aaa';
  
  const controlsY = canvas.height / 2 + 80;
  
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.player1Light;
  ctx.fillText('玩家1 控制:', canvas.width / 2 - 200, controlsY);
  ctx.fillStyle = '#bbb';
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillText('WASD - 移动明棋', canvas.width / 2 - 200, controlsY + 28);
  ctx.fillText('空格 - 暗棋能力', canvas.width / 2 - 200, controlsY + 48);
  ctx.fillText('Q - 切换棋子', canvas.width / 2 - 200, controlsY + 68);
  
  ctx.textAlign = 'right';
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillStyle = COLORS.player2Light;
  ctx.fillText('玩家2 控制:', canvas.width / 2 + 200, controlsY);
  ctx.fillStyle = '#bbb';
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillText('方向键 - 移动明棋', canvas.width / 2 + 200, controlsY + 28);
  ctx.fillText('回车 - 暗棋能力', canvas.width / 2 + 200, controlsY + 48);
  ctx.fillText('Shift - 切换棋子', canvas.width / 2 + 200, controlsY + 68);
  
  ctx.textAlign = 'center';
  const pulse = Math.sin(time * 3) * 0.3 + 0.7;
  ctx.fillStyle = `rgba(212, 175, 55, ${pulse})`;
  ctx.shadowColor = COLORS.goldLine;
  ctx.shadowBlur = 15;
  ctx.font = '12px "Press Start 2P", monospace';
  ctx.fillText('按 空格键 开始游戏', canvas.width / 2, canvas.height - 90);
  ctx.shadowBlur = 0;
  
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillStyle = '#666';
  ctx.fillText('P - 暂停  |  R - 重新开始', canvas.width / 2, canvas.height - 55);
}

function drawPauseScreen(renderCtx: RenderContext, _gameData: GameData): void {
  const { ctx, canvas, time } = renderCtx;
  
  const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bgGradient.addColorStop(0, 'rgba(10, 10, 20, 0.92)');
  bgGradient.addColorStop(0.5, 'rgba(15, 15, 35, 0.95)');
  bgGradient.addColorStop(1, 'rgba(10, 10, 20, 0.92)');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.font = '32px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.goldLine;
  ctx.shadowColor = COLORS.goldLine;
  ctx.shadowBlur = 25;
  const titleY = canvas.height / 2 - 60 + Math.sin(time * 2) * 3;
  ctx.fillText('游戏暂停', canvas.width / 2, titleY);
  ctx.shadowBlur = 0;
  
  const buttonY = canvas.height / 2 + 10;
  const buttonWidth = 200;
  const buttonHeight = 55;
  const buttonX = canvas.width / 2 - buttonWidth / 2;
  
  const hoverPulse = Math.sin(time * 4) * 0.1 + 0.9;
  
  const btnGradient = ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + buttonHeight);
  btnGradient.addColorStop(0, '#2a2a4e');
  btnGradient.addColorStop(1, '#1a1a3e');
  ctx.fillStyle = btnGradient;
  ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
  
  ctx.strokeStyle = COLORS.uiBorder;
  ctx.lineWidth = 2 * hoverPulse;
  ctx.shadowColor = COLORS.uiBorder;
  ctx.shadowBlur = 15 * hoverPulse;
  ctx.strokeRect(buttonX + 0.5, buttonY + 0.5, buttonWidth - 1, buttonHeight - 1);
  ctx.shadowBlur = 0;
  
  ctx.fillStyle = COLORS.text;
  ctx.shadowColor = COLORS.text;
  ctx.shadowBlur = 5;
  ctx.font = '12px "Press Start 2P", monospace';
  ctx.fillText('继续游戏', canvas.width / 2, buttonY + buttonHeight / 2 + 4);
  ctx.shadowBlur = 0;
  
  ctx.font = '9px "Press Start 2P", monospace';
  ctx.fillStyle = '#888';
  ctx.fillText('按 P 键继续游戏', canvas.width / 2, buttonY + buttonHeight + 35);
  ctx.fillText('按 R 键重新开始', canvas.width / 2, buttonY + buttonHeight + 55);
}

function drawGameOverScreen(renderCtx: RenderContext, gameData: GameData): void {
  const { ctx, canvas, time } = renderCtx;
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  const winnerColor = gameData.winner === 1 ? COLORS.player1Light : COLORS.player2Light;
  
  for (let i = 0; i < 5; i++) {
    const radius = 50 + i * 40 + Math.sin(time * 2 + i) * 10;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2 - 60, radius, 0, Math.PI * 2);
    ctx.strokeStyle = hexToRgba(winnerColor, 0.15 - i * 0.025);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  
  ctx.font = '32px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = winnerColor;
  ctx.shadowColor = winnerColor;
  ctx.shadowBlur = 30;
  const titleY = canvas.height / 2 - 80 + Math.sin(time * 3) * 3;
  ctx.fillText(`玩家 ${gameData.winner} 获胜!`, canvas.width / 2, titleY);
  ctx.shadowBlur = 0;
  
  ctx.font = '12px "Press Start 2P", monospace';
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`总回合数: ${gameData.turn}`, canvas.width / 2, canvas.height / 2 - 10);
  
  const buttonY = canvas.height / 2 + 50;
  const buttonWidth = 200;
  const buttonHeight = 55;
  const buttonX = canvas.width / 2 - buttonWidth / 2;
  
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
  
  ctx.strokeStyle = COLORS.uiBorder;
  ctx.lineWidth = 2;
  ctx.shadowColor = COLORS.uiBorder;
  ctx.shadowBlur = 10;
  ctx.strokeRect(buttonX + 0.5, buttonY + 0.5, buttonWidth - 1, buttonHeight - 1);
  ctx.shadowBlur = 0;
  
  ctx.fillStyle = COLORS.text;
  ctx.font = '11px "Press Start 2P", monospace';
  ctx.fillText('再来一局', canvas.width / 2, buttonY + buttonHeight / 2 + 4);
  
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillStyle = '#666';
  ctx.fillText('按 R 键重新开始', canvas.width / 2, buttonY + buttonHeight + 30);
}

function drawRestartConfirm(renderCtx: RenderContext, _gameData: GameData): void {
  const { ctx, canvas } = renderCtx;
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  const dialogWidth = 360;
  const dialogHeight = 180;
  const dialogX = canvas.width / 2 - dialogWidth / 2;
  const dialogY = canvas.height / 2 - dialogHeight / 2;
  
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(dialogX, dialogY, dialogWidth, dialogHeight);
  
  ctx.strokeStyle = COLORS.uiBorder;
  ctx.lineWidth = 3;
  ctx.shadowColor = COLORS.uiBorder;
  ctx.shadowBlur = 15;
  ctx.strokeRect(dialogX + 0.5, dialogY + 0.5, dialogWidth - 1, dialogHeight - 1);
  ctx.shadowBlur = 0;
  
  ctx.font = '14px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.text;
  ctx.fillText('确认重新开始?', canvas.width / 2, dialogY + 55);
  
  const btnWidth = 110;
  const btnHeight = 40;
  const btnY = dialogY + 95;
  
  ctx.fillStyle = COLORS.player1Light;
  ctx.fillRect(dialogX + 45, btnY, btnWidth, btnHeight);
  ctx.strokeStyle = COLORS.uiBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(dialogX + 45.5, btnY + 0.5, btnWidth - 1, btnHeight - 1);
  
  ctx.fillStyle = '#000';
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillText('确认', dialogX + 45 + btnWidth / 2, btnY + btnHeight / 2 + 4);
  
  ctx.fillStyle = '#2a2a3e';
  ctx.fillRect(dialogX + dialogWidth - 155, btnY, btnWidth, btnHeight);
  ctx.strokeStyle = '#555';
  ctx.strokeRect(dialogX + dialogWidth - 154.5, btnY + 0.5, btnWidth - 1, btnHeight - 1);
  
  ctx.fillStyle = '#aaa';
  ctx.fillText('取消', dialogX + dialogWidth - 155 + btnWidth / 2, btnY + btnHeight / 2 + 4);
  
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillStyle = '#666';
  ctx.fillText('Y - 确认  |  N - 取消', canvas.width / 2, dialogY + dialogHeight - 22);
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
