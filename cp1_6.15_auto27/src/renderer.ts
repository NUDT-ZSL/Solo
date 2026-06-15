import { Card } from './card';
import { Player } from './player';

export interface Layout {
  width: number;
  height: number;
  player1Area: { x: number; y: number; width: number; height: number };
  player2Area: { x: number; y: number; width: number; height: number };
  battlefieldArea: { x: number; y: number; width: number; height: number };
  battlefieldCells: { x: number; y: number; width: number; height: number }[][];
  player1HandArea: { x: number; y: number; width: number; height: number };
  player2HandArea: { x: number; y: number; width: number; height: number };
  player1HeroPos: { x: number; y: number };
  player2HeroPos: { x: number; y: number };
  healthBarWidth: number;
  healthBarHeight: number;
  turnButtonPos: { x: number; y: number; radius: number };
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private layout: Layout;
  private turnTransitionProgress: number;
  private isTransitioning: boolean;
  private gameOver: boolean;
  private winner: number;
  private winnerRotation: number;
  private pulsePhase: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.layout = this.calculateLayout();
    this.turnTransitionProgress = 0;
    this.isTransitioning = false;
    this.gameOver = false;
    this.winner = -1;
    this.winnerRotation = 0;
    this.pulsePhase = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.layout = this.calculateLayout();
  }

  private calculateLayout(): Layout {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const minWidth = 1024;
    const minHeight = 768;
    const scale = Math.min(w / minWidth, h / minHeight, 1);

    const playerAreaWidth = w * 0.25;
    const battlefieldWidth = w * 0.5;
    const healthBarWidth = 200 * scale;
    const healthBarHeight = 24 * scale;
    const cellSize = Math.min(battlefieldWidth / 3, h * 0.25) * 0.85;
    const battlefieldTotalWidth = cellSize * 3;
    const battlefieldTotalHeight = cellSize * 3;
    const battlefieldX = (w - battlefieldTotalWidth) / 2;
    const battlefieldY = (h - battlefieldTotalHeight) / 2;

    const battlefieldCells: { x: number; y: number; width: number; height: number }[][] = [];
    for (let row = 0; row < 3; row++) {
      battlefieldCells[row] = [];
      for (let col = 0; col < 3; col++) {
        battlefieldCells[row][col] = {
          x: battlefieldX + col * cellSize + cellSize * 0.05,
          y: battlefieldY + row * cellSize + cellSize * 0.05,
          width: cellSize * 0.9,
          height: cellSize * 0.9,
        };
      }
    }

    return {
      width: w,
      height: h,
      player1Area: { x: 0, y: 0, width: playerAreaWidth, height: h },
      player2Area: { x: w - playerAreaWidth, y: 0, width: playerAreaWidth, height: h },
      battlefieldArea: { x: battlefieldX, y: battlefieldY, width: battlefieldTotalWidth, height: battlefieldTotalHeight },
      battlefieldCells,
      player1HandArea: { x: 0, y: h * 0.7, width: playerAreaWidth, height: h * 0.25 },
      player2HandArea: { x: w - playerAreaWidth, y: h * 0.7, width: playerAreaWidth, height: h * 0.25 },
      player1HeroPos: { x: playerAreaWidth / 2, y: h * 0.15 },
      player2HeroPos: { x: w - playerAreaWidth / 2, y: h * 0.15 },
      healthBarWidth,
      healthBarHeight,
      turnButtonPos: { x: w - 80, y: h - 80, radius: 50 * scale },
    };
  }

  getLayout(): Layout {
    return this.layout;
  }

  startTurnTransition(_direction: number): void {
    this.isTransitioning = true;
    this.turnTransitionProgress = 0;
  }

  setGameOver(winner: number): void {
    this.gameOver = winner >= 0;
    this.winner = winner;
    this.winnerRotation = 0;
  }

  resetGameOver(): void {
    this.gameOver = false;
    this.winner = -1;
    this.winnerRotation = 0;
  }

  update(deltaTime: number): void {
    this.pulsePhase += deltaTime * Math.PI * 2;
    if (this.isTransitioning) {
      this.turnTransitionProgress = Math.min(this.turnTransitionProgress + deltaTime / 0.5, 1);
      if (this.turnTransitionProgress >= 1) {
        this.isTransitioning = false;
        this.turnTransitionProgress = 0;
      }
    }
    if (this.gameOver) {
      this.winnerRotation += deltaTime * 0.5;
    }
  }

  render(
    players: Player[],
    currentTurn: number,
    turnNumber: number,
    selectedCard: Card | null,
    draggingCard: Card | null,
    mousePos: { x: number; y: number }
  ): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawBackground();
    this.drawBattlefieldGrid();
    this.drawPlayerArea(players[0], 0);
    this.drawPlayerArea(players[1], 1);
    this.drawPlayerHand(players[0], 0);
    this.drawPlayerHand(players[1], 1);
    this.drawBattlefieldCards(players[0], 0);
    this.drawBattlefieldCards(players[1], 1);

    if (selectedCard) {
      this.drawSelectionHighlight(selectedCard);
    }

    if (draggingCard && draggingCard.isDragging) {
      this.drawDraggingCard(draggingCard, mousePos);
    }

    this.drawTurnButton(currentTurn, turnNumber, players[currentTurn].turnTimer);
    this.drawTurnIndicator(currentTurn);

    if (this.isTransitioning) {
      this.drawTurnTransition();
    }

    if (this.gameOver) {
      this.drawGameOver(players);
    }
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#0f0f1a');
    gradient.addColorStop(0.5, '#1a1a2e');
    gradient.addColorStop(1, '#0f0f1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < this.canvas.width; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, this.canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < this.canvas.height; i += 50) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(this.canvas.width, i);
      ctx.stroke();
    }
  }

  private drawBattlefieldGrid(): void {
    const ctx = this.ctx;
    const { battlefieldArea, battlefieldCells } = this.layout;

    ctx.save();
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(battlefieldArea.x, battlefieldArea.y, battlefieldArea.width, battlefieldArea.height);

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const cell = battlefieldCells[row][col];
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);
      }
    }
    ctx.restore();
  }

  private drawPlayerArea(player: Player, playerIndex: number): void {
    const ctx = this.ctx;
    const layout = this.layout;
    const heroPos = playerIndex === 0 ? layout.player1HeroPos : layout.player2HeroPos;
    const isCurrentTurn = player.isCurrentTurn;

    if (isCurrentTurn) {
      ctx.save();
      ctx.shadowColor = 'rgba(212, 175, 55, 0.5)';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(heroPos.x, heroPos.y, 65, 0, Math.PI * 2);
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(heroPos.x, heroPos.y, 55, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a2e';
    ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.font = '48px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.heroEmoji, heroPos.x, heroPos.y);
    ctx.restore();

    this.drawHealthBar(
      heroPos.x - layout.healthBarWidth / 2,
      heroPos.y + 70,
      layout.healthBarWidth,
      layout.healthBarHeight,
      player
    );

    ctx.save();
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#d4af37';
    ctx.textAlign = 'center';
    ctx.fillText(player.name, heroPos.x, heroPos.y - 75);
    ctx.restore();
  }

  private drawHealthBar(x: number, y: number, width: number, height: number, player: Player): void {
    const ctx = this.ctx;
    const healthPercent = player.currentHealth / player.maxHealth;
    const targetPercent = player.targetHealth / player.maxHealth;

    ctx.save();
    ctx.fillStyle = '#1a1a2e';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    this.roundRect(ctx, x, y, width, height, 8);
    ctx.fill();
    ctx.stroke();

    const gradient = ctx.createLinearGradient(x, y, x + width, y);
    const r = Math.floor(255 * (1 - targetPercent));
    const g = Math.floor(255 * targetPercent);
    gradient.addColorStop(0, `rgb(${r}, ${g}, 0)`);
    gradient.addColorStop(1, `rgb(${Math.floor(r * 0.7)}, ${Math.floor(g * 0.7)}, 0)`);

    ctx.fillStyle = gradient;
    const fillWidth = width * healthPercent;
    if (fillWidth > 0) {
      this.roundRect(ctx, x + 2, y + 2, fillWidth - 4, height - 4, 6);
      ctx.fill();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `${Math.ceil(player.currentHealth)} / ${player.maxHealth}`,
      x + width / 2,
      y + height / 2
    );
    ctx.restore();
  }

  private drawPlayerHand(player: Player, playerIndex: number): void {
    const ctx = this.ctx;
    const handArea = playerIndex === 0 ? this.layout.player1HandArea : this.layout.player2HandArea;
    const cardWidth = 90;
    const cardHeight = 126;
    const cards = player.hand;
    const totalCards = cards.length;

    if (totalCards === 0) return;

    const totalWidth = Math.min(totalCards * cardWidth * 0.7, handArea.width - 40);
    const startX = handArea.x + (handArea.width - totalWidth) / 2;
    const cardSpacing = totalWidth / Math.max(totalCards, 1);

    cards.forEach((card, index) => {
      const cardX = startX + index * cardSpacing;
      const cardY = handArea.y + 10;
      card.position = { x: cardX, y: cardY, width: cardWidth, height: cardHeight };

      if (card.isDragging) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        this.drawCard(ctx, card, cardX, cardY, cardWidth, cardHeight);
        ctx.restore();
      } else {
        this.drawCard(ctx, card, cardX, cardY, cardWidth, cardHeight);
      }
    });
  }

  private drawCard(
    ctx: CanvasRenderingContext2D,
    card: Card,
    x: number,
    y: number,
    width: number,
    height: number,
    scale: number = 1
  ): void {
    ctx.save();

    let offsetX = 0, offsetY = 0;
    if (card.shakeTime > 0) {
      offsetX = (Math.random() - 0.5) * 8;
      offsetY = (Math.random() - 0.5) * 8;
    }

    const drawX = x + offsetX;
    const drawY = y + offsetY;
    const drawW = width * scale;
    const drawH = height * scale;

    let pulseScale = 1;
    if (card.pulseTime > 0 && card.data.attack >= 5) {
      const progress = 1 - card.pulseTime / 0.3;
      pulseScale = 1 + Math.sin(progress * Math.PI) * 0.2;
    }

    const centerX = drawX + drawW / 2;
    const centerY = drawY + drawH / 2;
    ctx.translate(centerX, centerY);
    ctx.scale(scale * pulseScale, scale * pulseScale);
    ctx.translate(-centerX, -centerY);

    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;

    this.roundRect(ctx, drawX, drawY, drawW, drawH, 10);
    const bgGradient = ctx.createLinearGradient(drawX, drawY, drawX, drawY + drawH);
    bgGradient.addColorStop(0, '#2a2a3e');
    bgGradient.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = bgGradient;
    ctx.fill();

    const rarityColor = card.getRarityColor();
    ctx.shadowColor = rarityColor;
    ctx.shadowBlur = 15;
    ctx.strokeStyle = rarityColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.arc(drawX + 15, drawY + 15, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(card.data.cost.toString(), drawX + 15, drawY + 15);

    ctx.font = '36px serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(card.data.emoji, drawX + drawW / 2, drawY + drawH * 0.35);

    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#d4af37';
    ctx.fillText(card.data.name, drawX + drawW / 2, drawY + drawH * 0.58);

    ctx.font = '20px serif';
    ctx.fillText(card.getEffectIcon(), drawX + drawW / 2, drawY + drawH * 0.72);

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(drawX + 15, drawY + drawH - 15, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(card.currentAttack.toString(), drawX + 15, drawY + drawH - 15);

    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(drawX + drawW - 15, drawY + drawH - 15, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(card.currentHealth.toString(), drawX + drawW - 15, drawY + drawH - 15);

    if (card.flashTime > 0) {
      ctx.globalAlpha = card.flashTime / 0.2 * 0.7;
      ctx.fillStyle = '#ef4444';
      this.roundRect(ctx, drawX, drawY, drawW, drawH, 10);
      ctx.fill();
    }

    if (card.hasAttacked && card.state === 'inBattle') {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#000000';
      this.roundRect(ctx, drawX, drawY, drawW, drawH, 10);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawBattlefieldCards(player: Player, _playerIndex: number): void {
    const ctx = this.ctx;
    const { battlefieldCells } = this.layout;

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const card = player.battlefield[row][col];
        if (card) {
          const cell = battlefieldCells[row][col];
          const cardWidth = cell.width * 0.9;
          const cardHeight = cell.height * 0.9;
          const cardX = cell.x + (cell.width - cardWidth) / 2;
          const cardY = cell.y + (cell.height - cardHeight) / 2;

          let renderX = cardX;
          let renderY = cardY;

          if (card.state === 'attacking' && card.attackTarget) {
            const targetCard = card.attackTarget;
            const targetSlot = targetCard.battlefieldSlot;
            if (targetSlot) {
              const targetCell = battlefieldCells[targetSlot.row][targetSlot.col];
              const targetX = targetCell.x + (targetCell.width - cardWidth) / 2;
              const targetY = targetCell.y + (targetCell.height - cardHeight) / 2;

              let t = card.animationProgress;
              if (t < 0.5) {
                const progress = t * 2;
                const easeProgress = this.easeInOutQuad(progress);
                renderX = cardX + (targetX - cardX) * easeProgress;
                renderY = cardY + (targetY - cardY) * easeProgress;
              } else {
                const progress = (t - 0.5) * 2;
                const easeProgress = this.easeInOutQuad(progress);
                renderX = targetX + (cardX - targetX) * easeProgress;
                renderY = targetY + (cardY - targetY) * easeProgress;
              }
            }
          }

          card.position = { x: cardX, y: cardY, width: cardWidth, height: cardHeight };
          this.drawCard(ctx, card, renderX, renderY, cardWidth, cardHeight);
        }
      }
    }
  }

  private drawSelectionHighlight(card: Card): void {
    const ctx = this.ctx;
    const pos = card.position;
    ctx.save();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 20;
    this.roundRect(ctx, pos.x - 5, pos.y - 5, pos.width + 10, pos.height + 10, 12);
    ctx.stroke();
    ctx.restore();
  }

  private drawDraggingCard(card: Card, mousePos: { x: number; y: number }): void {
    const ctx = this.ctx;
    const width = card.position.width;
    const height = card.position.height;
    const x = mousePos.x - width / 2 + card.dragOffset.x;
    const y = mousePos.y - height / 2 + card.dragOffset.y;

    ctx.save();
    ctx.globalAlpha = 0.8;
    this.drawCard(ctx, card, x, y, width, height, 1.1);
    ctx.restore();
  }

  private drawTurnButton(currentTurn: number, turnNumber: number, timer: number): void {
    const ctx = this.ctx;
    const { x, y, radius } = this.layout.turnButtonPos;

    const isUrgent = timer <= 5;
    const pulseScale = isUrgent ? 1 + Math.sin(this.pulsePhase * 4) * 0.1 : 1;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulseScale, pulseScale);
    ctx.translate(-x, -y);

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    if (isUrgent) {
      gradient.addColorStop(0, '#ef4444');
      gradient.addColorStop(1, '#991b1b');
      ctx.shadowColor = '#ef4444';
    } else {
      gradient.addColorStop(0, '#d4af37');
      gradient.addColorStop(1, '#8b7355');
      ctx.shadowColor = '#d4af37';
    }
    ctx.shadowBlur = 20;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`回合 ${turnNumber}`, x, y - 15);

    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`${Math.ceil(timer)}s`, x, y + 10);

    ctx.font = '12px sans-serif';
    ctx.fillText(`P${currentTurn + 1}`, x, y + 30);

    ctx.restore();
  }

  private drawTurnIndicator(currentTurn: number): void {
    const ctx = this.ctx;
    this.layout;

    ctx.save();
    const gradient = ctx.createLinearGradient(0, 0, this.canvas.width, 0);
    if (currentTurn === 0) {
      gradient.addColorStop(0, 'rgba(212, 175, 55, 0.3)');
      gradient.addColorStop(0.3, 'rgba(212, 175, 55, 0)');
    } else {
      gradient.addColorStop(0.7, 'rgba(212, 175, 55, 0)');
      gradient.addColorStop(1, 'rgba(212, 175, 55, 0.3)');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();
  }

  private drawTurnTransition(): void {
    const ctx = this.ctx;
    const progress = this.turnTransitionProgress;

    ctx.save();
    ctx.globalAlpha = Math.sin(progress * Math.PI) * 0.7;

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + progress * Math.PI * 2;
      const distance = 100 + progress * 200;
      const cardX = centerX + Math.cos(angle) * distance;
      const cardY = centerY + Math.sin(angle) * distance;

      ctx.save();
      ctx.translate(cardX, cardY);
      ctx.rotate(angle + Math.PI / 2);
      ctx.scale(0.5, 0.5);

      ctx.fillStyle = '#1a1a2e';
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 3;
      this.roundRect(ctx, -50, -70, 100, 140, 10);
      ctx.fill();
      ctx.stroke();

      ctx.font = '40px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#d4af37';
      ctx.fillText('🎴', 0, 0);

      ctx.restore();
    }

    ctx.restore();
  }

  private drawGameOver(players: Player[]): void {
    const ctx = this.ctx;
    const winner = players[this.winner];

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    ctx.font = 'bold 48px sans-serif';
    ctx.fillStyle = '#d4af37';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#d4af37';
    ctx.shadowBlur = 20;
    ctx.fillText(`🎉 ${winner.name} 获胜！🎉`, centerX, centerY - 150);
    ctx.shadowBlur = 0;

    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('胜利阵容', centerX, centerY - 80);

    const winnerCards = winner.getAllBattlefieldCards();
    const cardWidth = 100;
    const cardHeight = 140;
    const startX = centerX - ((winnerCards.length - 1) * (cardWidth + 30)) / 2;

    winnerCards.forEach((card, index) => {
      const cardX = startX + index * (cardWidth + 30);
      const cardY = centerY;

      ctx.save();
      ctx.translate(cardX + cardWidth / 2, cardY + cardHeight / 2);
      ctx.rotate(Math.sin(this.winnerRotation + index * 0.5) * 0.2);
      ctx.translate(-(cardX + cardWidth / 2), -(cardY + cardHeight / 2));

      this.drawCard(ctx, card, cardX, cardY, cardWidth, cardHeight, 1.2);
      ctx.restore();
    });

    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#a0a0a0';
    ctx.fillText('点击任意位置重新开始', centerX, centerY + 180);

    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  getCanvasRect(): DOMRect {
    return this.canvas.getBoundingClientRect();
  }
}
