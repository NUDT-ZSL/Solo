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
  player1Shadow: '#1a1a2e',
  player2Light: '#00FFFF',
  player2Shadow: '#1a1a2e',
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
  
  const boardPixelSize = Math.min(width * 0.7, height * 0.7);
  renderCtx.cellSize = Math.floor(boardPixelSize / BOARD_SIZE);
  renderCtx.boardOffset.x = (width - renderCtx.cellSize * BOARD_SIZE) / 2;
  renderCtx.boardOffset.y = (height - renderCtx.cellSize * BOARD_SIZE) / 2 + 30;
}

export function render(renderCtx: RenderContext, gameData: GameData): void {
  const { ctx, canvas } = renderCtx;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  drawBackground(renderCtx, gameData);
  drawStars(renderCtx, gameData);
  drawBoard(renderCtx, gameData);
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
  const { ctx, canvas } = renderCtx;
  
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, COLORS.bgStart);
  gradient.addColorStop(1, COLORS.bgEnd);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawStars(renderCtx: RenderContext, gameData: GameData): void {
  const { ctx, canvas } = renderCtx;
  
  for (const star of gameData.stars) {
    const x = (star.x / 100) * canvas.width;
    const y = (star.y / 100) * canvas.height;
    
    ctx.beginPath();
    ctx.arc(x, y, star.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
    ctx.fill();
  }
}

function drawBoard(renderCtx: RenderContext, _gameData: GameData): void {
  const { ctx, boardOffset, cellSize } = renderCtx;
  
  ctx.save();
  ctx.translate(boardOffset.x, boardOffset.y);
  
  ctx.fillStyle = COLORS.boardWood;
  ctx.fillRect(-4, -4, cellSize * BOARD_SIZE + 8, cellSize * BOARD_SIZE + 8);
  
  ctx.strokeStyle = COLORS.goldLine;
  ctx.lineWidth = 2;
  ctx.strokeRect(-4, -4, cellSize * BOARD_SIZE + 8, cellSize * BOARD_SIZE + 8);
  
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const isLight = (x + y) % 2 === 0;
      
      ctx.fillStyle = isLight ? COLORS.boardWoodLight : COLORS.boardWoodDark;
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x * cellSize + 0.5, y * cellSize + 0.5, cellSize - 1, cellSize - 1);
    }
  }
  
  ctx.restore();
}

function drawTrails(renderCtx: RenderContext, gameData: GameData): void {
  const { ctx, boardOffset, cellSize } = renderCtx;
  
  ctx.save();
  ctx.translate(boardOffset.x, boardOffset.y);
  
  for (const [pieceId, trail] of gameData.trails) {
    const piece = gameData.pieces.find(p => p.id === pieceId);
    if (!piece) continue;
    
    const color = piece.player === 1 ? COLORS.player1Light : COLORS.player2Light;
    
    for (let i = 0; i < trail.length; i++) {
      const point = trail[i];
      const alpha = point.alpha * 0.5;
      const size = cellSize * 0.3 * point.alpha;
      
      ctx.beginPath();
      ctx.arc(
        point.x * cellSize + cellSize / 2,
        point.y * cellSize + cellSize / 2,
        size,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = hexToRgba(color, alpha);
      ctx.fill();
    }
  }
  
  ctx.restore();
}

function drawPieces(renderCtx: RenderContext, gameData: GameData): void {
  const { ctx, boardOffset, cellSize } = renderCtx;
  
  ctx.save();
  ctx.translate(boardOffset.x, boardOffset.y);
  
  const shadowPieces = gameData.pieces.filter(p => p.alive && p.type === 'shadow');
  const lightPieces = gameData.pieces.filter(p => p.alive && p.type === 'light');
  
  for (const piece of shadowPieces) {
    drawShadowPiece(ctx, piece, cellSize, gameData);
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
  const radius = cellSize * 0.35;
  
  const color = piece.player === 1 ? COLORS.player1Light : COLORS.player2Light;
  
  const shadowOffsetX = (gameData.mousePosition.x - piece.position.x - 0.5) * 3;
  const shadowOffsetY = (gameData.mousePosition.y - piece.position.y - 0.5) * 3;
  
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = shadowOffsetX;
  ctx.shadowOffsetY = shadowOffsetY;
  
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, hexToRgba(color, 0.9));
  gradient.addColorStop(0.7, hexToRgba(color, 0.6));
  gradient.addColorStop(1, hexToRgba(color, 0.3));
  
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.shadowColor = color;
  ctx.shadowBlur = 15;
  ctx.stroke();
  
  ctx.restore();
  
  if (gameData.selectedPiece?.id === piece.id) {
    const pulse = Math.sin(renderCtx.time * 4) * 0.1 + 0.9;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.2 * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = hexToRgba(color, 0.5);
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  
  ctx.fillStyle = '#000';
  ctx.font = `${cellSize * 0.25}px 'Press Start 2P', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★', x, y + 1);
}

function drawShadowPiece(
  ctx: CanvasRenderingContext2D,
  piece: Piece,
  cellSize: number,
  gameData: GameData
): void {
  const x = piece.position.x * cellSize + cellSize / 2;
  const y = piece.position.y * cellSize + cellSize / 2;
  const radius = cellSize * 0.35;
  
  const revealProgress = piece.isRevealed ? piece.revealTimer / gameData.shadowRevealDuration : 0;
  
  if (piece.isRevealed || revealProgress > 0) {
    const alpha = piece.isRevealed ? 0.8 : 0;
    const ringAlpha = piece.isRevealed ? 0.6 : revealProgress * 0.6;
    
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
    ctx.strokeStyle = hexToRgba('#4a4a6a', ringAlpha);
    ctx.lineWidth = 2;
    ctx.stroke();
    
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, hexToRgba('#2a2a4a', alpha));
    gradient.addColorStop(1, hexToRgba('#1a1a2e', alpha * 0.8));
    
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(26, 26, 46, 0.15)';
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(x + 1, y + 1, radius * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fill();
  }
}

function drawParticles(renderCtx: RenderContext, gameData: GameData): void {
  const { ctx, boardOffset } = renderCtx;
  
  ctx.save();
  ctx.translate(boardOffset.x, boardOffset.y);
  
  for (const p of gameData.particles) {
    const alpha = p.life / p.maxLife;
    
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    
    if (p.color.startsWith('#')) {
      ctx.fillStyle = hexToRgba(p.color, alpha);
    } else {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
    }
    
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  
  ctx.restore();
}

function drawUI(renderCtx: RenderContext, gameData: GameData): void {
  const { ctx, canvas } = renderCtx;
  
  if (gameData.gameState !== 'playing' && gameData.gameState !== 'paused') return;
  
  const player1Lights = getLightPieces(gameData, 1).length;
  const player1Shadows = getShadowPieces(gameData, 1).length;
  const player2Lights = getLightPieces(gameData, 2).length;
  const player2Shadows = getShadowPieces(gameData, 2).length;
  
  ctx.font = '12px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  
  const turnText = `回合 ${gameData.turn}`;
  ctx.fillStyle = COLORS.text;
  ctx.fillText(turnText, canvas.width / 2, 40);
  
  const currentPlayerText = `玩家 ${gameData.currentPlayer} 的回合`;
  ctx.fillStyle = gameData.currentPlayer === 1 ? COLORS.player1Light : COLORS.player2Light;
  ctx.fillText(currentPlayerText, canvas.width / 2, 65);
  
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.player1Light;
  ctx.fillText(`P1 明: ${player1Lights}`, 20, 40);
  ctx.fillStyle = '#888';
  ctx.fillText(`暗: ${player1Shadows}`, 20, 60);
  
  const p1Cooldown = gameData.shadowCooldown.get(1) || 0;
  if (p1Cooldown > 0) {
    ctx.fillStyle = '#666';
    ctx.fillText(`CD: ${(p1Cooldown / 1000).toFixed(1)}s`, 20, 80);
  }
  
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.player2Light;
  ctx.fillText(`P2 明: ${player2Lights}`, canvas.width - 20, 40);
  ctx.fillStyle = '#888';
  ctx.fillText(`暗: ${player2Shadows}`, canvas.width - 20, 60);
  
  const p2Cooldown = gameData.shadowCooldown.get(2) || 0;
  if (p2Cooldown > 0) {
    ctx.fillStyle = '#666';
    ctx.fillText(`CD: ${(p2Cooldown / 1000).toFixed(1)}s`, canvas.width - 20, 80);
  }
  
  const revealProgress = gameData.shadowRevealTimer / gameData.shadowRevealInterval;
  const barWidth = 100;
  const barHeight = 6;
  const barX = canvas.width / 2 - barWidth / 2;
  const barY = 80;
  
  ctx.fillStyle = '#2E2E2E';
  ctx.fillRect(barX, barY, barWidth, barHeight);
  
  ctx.fillStyle = COLORS.goldLine;
  ctx.fillRect(barX, barY, barWidth * revealProgress, barHeight);
  
  ctx.strokeStyle = COLORS.goldLine;
  ctx.lineWidth = 1;
  ctx.strokeRect(barX + 0.5, barY + 0.5, barWidth - 1, barHeight - 1);
  
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillStyle = '#666';
  ctx.textAlign = 'center';
  ctx.fillText('暗棋显现倒计时', canvas.width / 2, barY + barHeight + 12);
}

function drawTitleScreen(renderCtx: RenderContext, _gameData: GameData): void {
  const { ctx, canvas } = renderCtx;
  
  ctx.fillStyle = 'rgba(26, 26, 46, 0.9)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.font = '32px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.goldLine;
  ctx.shadowColor = COLORS.goldLine;
  ctx.shadowBlur = 20;
  ctx.fillText('影子棋局', canvas.width / 2, canvas.height / 2 - 120);
  ctx.shadowBlur = 0;
  
  ctx.font = '12px "Press Start 2P", monospace';
  ctx.fillStyle = '#888';
  ctx.fillText('SHADOW CHESS', canvas.width / 2, canvas.height / 2 - 90);
  
  const avatarY = canvas.height / 2 - 30;
  const avatarSize = 60;
  
  ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
  ctx.beginPath();
  ctx.arc(canvas.width / 2 - 100, avatarY, avatarSize, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.strokeStyle = COLORS.player1Light;
  ctx.lineWidth = 2;
  ctx.stroke();
  
  ctx.fillStyle = COLORS.player1Light;
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillText('P1', canvas.width / 2 - 100, avatarY + 4);
  
  ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
  ctx.beginPath();
  ctx.arc(canvas.width / 2 + 100, avatarY, avatarSize, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.strokeStyle = COLORS.player2Light;
  ctx.lineWidth = 2;
  ctx.stroke();
  
  ctx.fillStyle = COLORS.player2Light;
  ctx.fillText('P2', canvas.width / 2 + 100, avatarY + 4);
  
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillStyle = '#aaa';
  
  const controlsY = canvas.height / 2 + 60;
  
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.player1Light;
  ctx.fillText('玩家1 控制:', canvas.width / 2 - 180, controlsY);
  ctx.fillStyle = '#aaa';
  ctx.fillText('WASD - 移动', canvas.width / 2 - 180, controlsY + 25);
  ctx.fillText('空格 - 暗棋能力', canvas.width / 2 - 180, controlsY + 45);
  ctx.fillText('Q - 切换棋子', canvas.width / 2 - 180, controlsY + 65);
  
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.player2Light;
  ctx.fillText('玩家2 控制:', canvas.width / 2 + 180, controlsY);
  ctx.fillStyle = '#aaa';
  ctx.fillText('方向键 - 移动', canvas.width / 2 + 180, controlsY + 25);
  ctx.fillText('回车 - 暗棋能力', canvas.width / 2 + 180, controlsY + 45);
  ctx.fillText('Shift - 切换棋子', canvas.width / 2 + 180, controlsY + 65);
  
  ctx.textAlign = 'center';
  const pulse = Math.sin(Date.now() / 500) * 0.3 + 0.7;
  ctx.fillStyle = `rgba(212, 175, 55, ${pulse})`;
  ctx.font = '12px "Press Start 2P", monospace';
  ctx.fillText('按 空格键 开始游戏', canvas.width / 2, canvas.height - 80);
  
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillStyle = '#666';
  ctx.fillText('P - 暂停  |  R - 重新开始', canvas.width / 2, canvas.height - 50);
}

function drawPauseScreen(renderCtx: RenderContext, _gameData: GameData): void {
  const { ctx, canvas } = renderCtx;
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.font = '24px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.goldLine;
  ctx.fillText('游戏暂停', canvas.width / 2, canvas.height / 2 - 40);
  
  const buttonY = canvas.height / 2 + 20;
  const buttonWidth = 160;
  const buttonHeight = 40;
  const buttonX = canvas.width / 2 - buttonWidth / 2;
  
  ctx.fillStyle = COLORS.uiBg;
  ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
  
  ctx.strokeStyle = COLORS.uiBorder;
  ctx.lineWidth = 1;
  ctx.strokeRect(buttonX + 0.5, buttonY + 0.5, buttonWidth - 1, buttonHeight - 1);
  
  ctx.fillStyle = COLORS.text;
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillText('继续游戏', canvas.width / 2, buttonY + buttonHeight / 2 + 4);
  
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillStyle = '#666';
  ctx.fillText('按 P 键继续', canvas.width / 2, buttonY + buttonHeight + 25);
}

function drawGameOverScreen(renderCtx: RenderContext, gameData: GameData): void {
  const { ctx, canvas } = renderCtx;
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.font = '28px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  
  const winnerColor = gameData.winner === 1 ? COLORS.player1Light : COLORS.player2Light;
  ctx.fillStyle = winnerColor;
  ctx.shadowColor = winnerColor;
  ctx.shadowBlur = 20;
  ctx.fillText(`玩家 ${gameData.winner} 获胜!`, canvas.width / 2, canvas.height / 2 - 60);
  ctx.shadowBlur = 0;
  
  ctx.font = '12px "Press Start 2P", monospace';
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`总回合数: ${gameData.turn}`, canvas.width / 2, canvas.height / 2);
  
  const buttonY = canvas.height / 2 + 50;
  const buttonWidth = 180;
  const buttonHeight = 45;
  const buttonX = canvas.width / 2 - buttonWidth / 2;
  
  ctx.fillStyle = COLORS.uiBg;
  ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
  
  ctx.strokeStyle = COLORS.uiBorder;
  ctx.lineWidth = 1;
  ctx.strokeRect(buttonX + 0.5, buttonY + 0.5, buttonWidth - 1, buttonHeight - 1);
  
  ctx.fillStyle = COLORS.text;
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillText('再来一局', canvas.width / 2, buttonY + buttonHeight / 2 + 4);
  
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillStyle = '#666';
  ctx.fillText('按 R 键重新开始', canvas.width / 2, buttonY + buttonHeight + 25);
}

function drawRestartConfirm(renderCtx: RenderContext, _gameData: GameData): void {
  const { ctx, canvas } = renderCtx;
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  const dialogWidth = 320;
  const dialogHeight = 160;
  const dialogX = canvas.width / 2 - dialogWidth / 2;
  const dialogY = canvas.height / 2 - dialogHeight / 2;
  
  ctx.fillStyle = COLORS.uiBg;
  ctx.fillRect(dialogX, dialogY, dialogWidth, dialogHeight);
  
  ctx.strokeStyle = COLORS.uiBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(dialogX + 0.5, dialogY + 0.5, dialogWidth - 1, dialogHeight - 1);
  
  ctx.font = '12px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.text;
  ctx.fillText('确认重新开始?', canvas.width / 2, dialogY + 50);
  
  const btnWidth = 100;
  const btnHeight = 35;
  const btnY = dialogY + 90;
  
  ctx.fillStyle = COLORS.player1Light;
  ctx.fillRect(dialogX + 40, btnY, btnWidth, btnHeight);
  ctx.strokeStyle = COLORS.uiBorder;
  ctx.lineWidth = 1;
  ctx.strokeRect(dialogX + 40.5, btnY + 0.5, btnWidth - 1, btnHeight - 1);
  
  ctx.fillStyle = '#000';
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillText('确认', dialogX + 40 + btnWidth / 2, btnY + btnHeight / 2 + 4);
  
  ctx.fillStyle = '#444';
  ctx.fillRect(dialogX + dialogWidth - 140, btnY, btnWidth, btnHeight);
  ctx.strokeStyle = '#666';
  ctx.strokeRect(dialogX + dialogWidth - 139.5, btnY + 0.5, btnWidth - 1, btnHeight - 1);
  
  ctx.fillStyle = '#aaa';
  ctx.fillText('取消', dialogX + dialogWidth - 140 + btnWidth / 2, btnY + btnHeight / 2 + 4);
  
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillStyle = '#666';
  ctx.fillText('Y - 确认  |  N - 取消', canvas.width / 2, dialogY + dialogHeight - 20);
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
