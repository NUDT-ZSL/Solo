import { Card, EffectType } from './card';
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

interface AttackAnim {
  attacker: Card;
  target: Card;
  phase: 'lunge' | 'return' | 'impact';
  time: number;
  attackerOriginX: number;
  attackerOriginY: number;
  targetX: number;
  targetY: number;
  onComplete: () => void;
}

interface PulseAnim {
  card: Card;
  time: number;
  duration: number;
}

interface ShakeAnim {
  card: Card;
  time: number;
  duration: number;
}

interface FlashAnim {
  card: Card;
  time: number;
  duration: number;
}

type TurnTransitionState = 'idle' | 'flipOut' | 'flipIn';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private layout: Layout;
  private offscreen: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D;
  private bgCacheValid: boolean;
  private gameOver: boolean;
  private winner: number;
  private winnerRotation: number;
  private pulsePhase: number;
  private attackAnims: AttackAnim[];
  private pulseAnims: PulseAnim[];
  private shakeAnims: ShakeAnim[];
  private flashAnims: FlashAnim[];
  private transitionState: TurnTransitionState;
  private transitionTime: number;
  private transitionNextPlayer: number;
  private dirtyRects: { x: number; y: number; width: number; height: number }[];
  private frameCount: number;
  private fps: number;
  private fpsUpdateTime: number;
  private static readonly FLIP_DURATION = 0.25;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.offscreen = document.createElement('canvas');
    const offCtx = this.offscreen.getContext('2d');
    if (!offCtx) throw new Error('Failed to create offscreen context');
    this.offCtx = offCtx;
    this.layout = this.calculateLayout();
    this.bgCacheValid = false;
    this.gameOver = false;
    this.winner = -1;
    this.winnerRotation = 0;
    this.pulsePhase = 0;
    this.attackAnims = [];
    this.pulseAnims = [];
    this.shakeAnims = [];
    this.flashAnims = [];
    this.transitionState = 'idle';
    this.transitionTime = 0;
    this.transitionNextPlayer = 0;
    this.dirtyRects = [];
    this.frameCount = 0;
    this.fps = 60;
    this.fpsUpdateTime = 0;
    this.resize();
    window.addEventListener('resize', () => {
      this.resize();
      this.bgCacheValid = false;
    });
  }

  resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.offscreen.width = this.canvas.width;
    this.offscreen.height = this.canvas.height;
    this.layout = this.calculateLayout();
    this.bgCacheValid = false;
  }

  private calculateLayout(): Layout {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const scale = Math.min(w / 1024, h / 768, 1);
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
      width: w, height: h,
      player1Area: { x: 0, y: 0, width: playerAreaWidth, height: h },
      player2Area: { x: w - playerAreaWidth, y: 0, width: playerAreaWidth, height: h },
      battlefieldArea: { x: battlefieldX, y: battlefieldY, width: battlefieldTotalWidth, height: battlefieldTotalHeight },
      battlefieldCells,
      player1HandArea: { x: 0, y: h * 0.7, width: playerAreaWidth, height: h * 0.25 },
      player2HandArea: { x: w - playerAreaWidth, y: h * 0.7, width: playerAreaWidth, height: h * 0.25 },
      player1HeroPos: { x: playerAreaWidth / 2, y: h * 0.15 },
      player2HeroPos: { x: w - playerAreaWidth / 2, y: h * 0.15 },
      healthBarWidth, healthBarHeight,
      turnButtonPos: { x: w - 80, y: h - 80, radius: 50 * scale },
    };
  }

  getLayout(): Layout { return this.layout; }

  startAttackAnimation(
    attacker: Card, target: Card,
    attackerOriginX: number, attackerOriginY: number,
    targetX: number, targetY: number,
    onComplete: () => void
  ): void {
    this.attackAnims.push({
      attacker, target,
      phase: 'lunge', time: 0,
      attackerOriginX, attackerOriginY,
      targetX, targetY,
      onComplete,
    });
  }

  startPulseAnimation(card: Card): void {
    this.pulseAnims.push({ card, time: 0, duration: 0.3 });
  }

  startShakeAnimation(card: Card): void {
    this.shakeAnims.push({ card, time: 0, duration: 0.1 });
  }

  startFlashAnimation(card: Card): void {
    this.flashAnims.push({ card, time: 0, duration: 0.15 });
  }

  startTurnTransition(nextPlayer: number): void {
    this.transitionState = 'flipOut';
    this.transitionTime = 0;
    this.transitionNextPlayer = nextPlayer;
  }

  isTransitioning(): boolean {
    return this.transitionState !== 'idle';
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
    this.frameCount++;
    this.fpsUpdateTime += deltaTime;
    if (this.fpsUpdateTime >= 1) {
      this.fps = this.frameCount / this.fpsUpdateTime;
      this.frameCount = 0;
      this.fpsUpdateTime = 0;
    }

    for (let i = this.attackAnims.length - 1; i >= 0; i--) {
      const anim = this.attackAnims[i];
      anim.time += deltaTime;
      if (anim.phase === 'lunge') {
        if (anim.time >= 0.2) {
          anim.phase = 'impact';
          anim.time = 0;
          this.startShakeAnimation(anim.target);
          this.startFlashAnimation(anim.target);
        }
      } else if (anim.phase === 'impact') {
        if (anim.time >= 0.05) {
          anim.phase = 'return';
          anim.time = 0;
        }
      } else if (anim.phase === 'return') {
        if (anim.time >= 0.2) {
          const cb = anim.onComplete;
          this.attackAnims.splice(i, 1);
          cb();
        }
      }
    }

    for (let i = this.pulseAnims.length - 1; i >= 0; i--) {
      this.pulseAnims[i].time += deltaTime;
      if (this.pulseAnims[i].time >= this.pulseAnims[i].duration) {
        this.pulseAnims.splice(i, 1);
      }
    }

    for (let i = this.shakeAnims.length - 1; i >= 0; i--) {
      this.shakeAnims[i].time += deltaTime;
      if (this.shakeAnims[i].time >= this.shakeAnims[i].duration) {
        this.shakeAnims.splice(i, 1);
      }
    }

    for (let i = this.flashAnims.length - 1; i >= 0; i--) {
      this.flashAnims[i].time += deltaTime;
      if (this.flashAnims[i].time >= this.flashAnims[i].duration) {
        this.flashAnims.splice(i, 1);
      }
    }

    if (this.transitionState !== 'idle') {
      this.transitionTime += deltaTime;
      if (this.transitionState === 'flipOut' && this.transitionTime >= Renderer.FLIP_DURATION) {
        this.transitionState = 'flipIn';
        this.transitionTime = 0;
      } else if (this.transitionState === 'flipIn' && this.transitionTime >= Renderer.FLIP_DURATION) {
        this.transitionState = 'idle';
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
    dragState: { card: Card; offsetX: number; offsetY: number; mouseX: number; mouseY: number } | null
  ): void {
    const ctx = this.ctx;
    const layout = this.layout;

    const hasActiveAnimations = this.needsFullRedraw();

    if (hasActiveAnimations || this.dirtyRects.length === 0) {
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.drawBackground();
      this.drawBattlefieldGrid();
      this.drawPlayerArea(players[0], 0);
      this.drawPlayerArea(players[1], 1);
      this.drawPlayerHand(players[0], 0, dragState);
      this.drawPlayerHand(players[1], 1, dragState);
      this.drawBattlefieldCards(players[0]);
      this.drawBattlefieldCards(players[1]);

      if (selectedCard) {
        this.drawSelectionHighlight(selectedCard);
      }

      if (dragState) {
        this.drawDraggingCard(dragState);
      }

      this.drawTurnButton(currentTurn, turnNumber, players[currentTurn].turnTimer);
      this.drawTurnIndicator(currentTurn);

      if (this.transitionState !== 'idle') {
        this.drawTurnTransition();
      }

      if (this.gameOver) {
        this.drawGameOver(players);
      }
    } else {
      ctx.save();
      for (const rect of this.dirtyRects) {
        ctx.beginPath();
        ctx.rect(rect.x, rect.y, rect.width, rect.height);
        ctx.clip();

        ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
        this.drawBackground();
        this.drawBattlefieldGrid();
        
        if (this.intersectsRect(rect, layout.player1Area)) {
          this.drawPlayerArea(players[0], 0);
          this.drawPlayerHand(players[0], 0, dragState);
        }
        if (this.intersectsRect(rect, layout.player2Area)) {
          this.drawPlayerArea(players[1], 1);
          this.drawPlayerHand(players[1], 1, dragState);
        }
        if (this.intersectsRect(rect, layout.battlefieldArea)) {
          this.drawBattlefieldCards(players[0]);
          this.drawBattlefieldCards(players[1]);
          if (selectedCard && this.intersectsRect(rect, selectedCard.position)) {
            this.drawSelectionHighlight(selectedCard);
          }
        }
        if (this.intersectsRect(rect, { x: layout.turnButtonPos.x - layout.turnButtonPos.radius, y: layout.turnButtonPos.y - layout.turnButtonPos.radius, width: layout.turnButtonPos.radius * 2, height: layout.turnButtonPos.radius * 2 })) {
          this.drawTurnButton(currentTurn, turnNumber, players[currentTurn].turnTimer);
        }
      }
      ctx.restore();

      if (dragState) {
        this.drawDraggingCard(dragState);
      }
    }

    this.drawFPSCounter();
    this.clearDirtyRects();
  }

  private drawBackground(): void {
    if (this.offscreen.width <= 0 || this.offscreen.height <= 0) return;
    
    if (!this.bgCacheValid) {
      const ctx = this.offCtx;
      const gradient = ctx.createLinearGradient(0, 0, 0, this.offscreen.height);
      gradient.addColorStop(0, '#0f0f1a');
      gradient.addColorStop(0.5, '#1a1a2e');
      gradient.addColorStop(1, '#0f0f1a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.offscreen.width, this.offscreen.height);

      ctx.strokeStyle = 'rgba(212, 175, 55, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i < this.offscreen.width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, this.offscreen.height);
        ctx.stroke();
      }
      for (let i = 0; i < this.offscreen.height; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(this.offscreen.width, i);
        ctx.stroke();
      }
      this.bgCacheValid = true;
    }
    this.ctx.drawImage(this.offscreen, 0, 0);
  }

  private drawBattlefieldGrid(): void {
    const ctx = this.ctx;
    const { battlefieldArea, battlefieldCells } = this.layout;
    ctx.save();
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(battlefieldArea.x, battlefieldArea.y, battlefieldArea.width, battlefieldArea.height);
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
    ctx.lineWidth = 1;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const cell = battlefieldCells[row][col];
        ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);
      }
    }
    ctx.restore();
  }

  private drawPlayerArea(player: Player, playerIndex: number): void {
    const ctx = this.ctx;
    const layout = this.layout;
    const heroPos = playerIndex === 0 ? layout.player1HeroPos : layout.player2HeroPos;

    if (player.isCurrentTurn) {
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
      layout.healthBarWidth, layout.healthBarHeight,
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
    const displayPercent = player.displayHealth / player.maxHealth;

    ctx.save();
    ctx.fillStyle = '#1a1a2e';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    this.roundRect(ctx, x, y, width, height, 8);
    ctx.fill();
    ctx.stroke();

    const healthColor = this.healthColorGradient(displayPercent);
    const gradient = ctx.createLinearGradient(x, y, x + width, y);
    gradient.addColorStop(0, healthColor);
    gradient.addColorStop(1, this.darkenColor(healthColor, 0.7));

    ctx.fillStyle = gradient;
    const fillWidth = width * displayPercent;
    if (fillWidth > 0) {
      this.roundRect(ctx, x + 2, y + 2, fillWidth - 4, height - 4, 6);
      ctx.fill();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `${Math.ceil(player.displayHealth)} / ${player.maxHealth}`,
      x + width / 2, y + height / 2
    );
    ctx.restore();
  }

  private healthColorGradient(percent: number): string {
    const hue = percent * 120;
    return `hsl(${hue}, 80%, 50%)`;
  }

  private darkenColor(color: string, factor: number): string {
    const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      return `rgb(${Math.floor(parseInt(rgbMatch[1]) * factor)}, ${Math.floor(parseInt(rgbMatch[2]) * factor)}, ${Math.floor(parseInt(rgbMatch[3]) * factor)})`;
    }
    const hslMatch = color.match(/hsl\(([.\d]+),\s*([.\d]+)%,\s*([.\d]+)%\)/);
    if (hslMatch) {
      const h = parseFloat(hslMatch[1]);
      const s = parseFloat(hslMatch[2]);
      const l = parseFloat(hslMatch[3]) * factor;
      return `hsl(${h}, ${s}%, ${l}%)`;
    }
    return color;
  }

  private drawPlayerHand(player: Player, playerIndex: number, dragState: { card: Card; offsetX: number; offsetY: number; mouseX: number; mouseY: number } | null): void {
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

      const isDragging = dragState && dragState.card === card;
      if (isDragging) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        this.drawCardSprite(ctx, card, cardX, cardY, cardWidth, cardHeight);
        ctx.restore();
      } else {
        this.drawCardSprite(ctx, card, cardX, cardY, cardWidth, cardHeight);
      }
    });
  }

  private drawCardSprite(
    ctx: CanvasRenderingContext2D,
    card: Card,
    x: number, y: number,
    width: number, height: number,
    scale: number = 1
  ): void {
    ctx.save();

    let offsetX = 0, offsetY = 0;
    const shake = this.shakeAnims.find(s => s.card === card);
    if (shake) {
      const intensity = 1 - shake.time / shake.duration;
      offsetX = (Math.random() - 0.5) * 10 * intensity;
      offsetY = (Math.random() - 0.5) * 10 * intensity;
    }

    const drawX = x + offsetX;
    const drawY = y + offsetY;
    const drawW = width * scale;
    const drawH = height * scale;

    let pulseScale = 1;
    const pulse = this.pulseAnims.find(p => p.card === card);
    if (pulse) {
      const progress = pulse.time / pulse.duration;
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

    const rarityColor = Card.getRarityColor(card.data.rarity);
    ctx.shadowColor = rarityColor;
    ctx.shadowBlur = 15;
    ctx.strokeStyle = rarityColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.shadowBlur = 0;
    this.drawCardCost(ctx, drawX, drawY, card.data.cost);
    this.drawCardEmoji(ctx, drawX, drawY, drawW, drawH, card.data.emoji);
    this.drawCardName(ctx, drawX, drawY, drawW, drawH, card.data.name);
    this.drawCardEffect(ctx, drawX, drawY, drawW, drawH, card.data.effect);
    this.drawCardAttack(ctx, drawX, drawY, drawH, card.currentAttack);
    this.drawCardHealth(ctx, drawX, drawY, drawW, drawH, card.currentHealth);

    const flash = this.flashAnims.find(f => f.card === card);
    if (flash) {
      const alpha = (1 - flash.time / flash.duration) * 0.7;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ef4444';
      this.roundRect(ctx, drawX, drawY, drawW, drawH, 10);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (card.hasAttacked && card.state === 'inBattle') {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#000000';
      this.roundRect(ctx, drawX, drawY, drawW, drawH, 10);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawCardCost(ctx: CanvasRenderingContext2D, x: number, y: number, cost: number): void {
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.arc(x + 15, y + 15, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cost.toString(), x + 15, y + 15);
  }

  private drawCardEmoji(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, emoji: string): void {
    ctx.font = '36px serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, x + w / 2, y + h * 0.35);
  }

  private drawCardName(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, name: string): void {
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#d4af37';
    ctx.textAlign = 'center';
    ctx.fillText(name, x + w / 2, y + h * 0.58);
  }

  private drawCardEffect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, effect: EffectType): void {
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.fillText(Card.getEffectIcon(effect), x + w / 2, y + h * 0.72);
  }

  private drawCardAttack(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, attack: number): void {
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(x + 15, y + h - 15, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(attack.toString(), x + 15, y + h - 15);
  }

  private drawCardHealth(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, health: number): void {
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(x + w - 15, y + h - 15, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(health.toString(), x + w - 15, y + h - 15);
  }

  private drawBattlefieldCards(player: Player): void {
    const ctx = this.ctx;
    const { battlefieldCells } = this.layout;

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const card = player.battlefield[row][col];
        if (!card) continue;

        const cell = battlefieldCells[row][col];
        const cardWidth = cell.width * 0.9;
        const cardHeight = cell.height * 0.9;
        const cardX = cell.x + (cell.width - cardWidth) / 2;
        const cardY = cell.y + (cell.height - cardHeight) / 2;

        let renderX = cardX;
        let renderY = cardY;

        const anim = this.attackAnims.find(a => a.attacker === card);
        if (anim) {
          if (anim.phase === 'lunge') {
            const t = this.easeInOutQuad(anim.time / 0.2);
            renderX = anim.attackerOriginX + (anim.targetX - anim.attackerOriginX) * t;
            renderY = anim.attackerOriginY + (anim.targetY - anim.attackerOriginY) * t;
          } else if (anim.phase === 'return') {
            const t = this.easeInOutQuad(anim.time / 0.2);
            renderX = anim.targetX + (anim.attackerOriginX - anim.targetX) * t;
            renderY = anim.targetY + (anim.attackerOriginY - anim.targetY) * t;
          } else {
            renderX = anim.targetX;
            renderY = anim.targetY;
          }
        }

        card.position = { x: cardX, y: cardY, width: cardWidth, height: cardHeight };
        this.drawCardSprite(ctx, card, renderX, renderY, cardWidth, cardHeight);
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

  private drawDraggingCard(dragState: { card: Card; offsetX: number; offsetY: number; mouseX: number; mouseY: number }): void {
    const ctx = this.ctx;
    const { card, offsetX, offsetY, mouseX, mouseY } = dragState;
    const width = card.position.width;
    const height = card.position.height;
    const x = mouseX - width / 2 + offsetX;
    const y = mouseY - height / 2 + offsetY;
    ctx.save();
    ctx.globalAlpha = 0.8;
    this.drawCardSprite(ctx, card, x, y, width, height, 1.1);
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
    ctx.fillText(`${Math.ceil(Math.max(timer, 0))}s`, x, y + 10);
    ctx.font = '12px sans-serif';
    ctx.fillText(`P${currentTurn + 1}`, x, y + 30);

    ctx.restore();
  }

  private drawTurnIndicator(currentTurn: number): void {
    const ctx = this.ctx;
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
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    ctx.save();

    if (this.transitionState === 'flipOut') {
      const t = this.transitionTime / Renderer.FLIP_DURATION;
      const scaleX = Math.abs(Math.cos(t * Math.PI / 2));
      const alpha = 1 - t;

      ctx.globalAlpha = alpha;
      ctx.translate(centerX, centerY);
      ctx.scale(scaleX, 1);
      ctx.translate(-centerX, -centerY);

      ctx.font = 'bold 36px sans-serif';
      ctx.fillStyle = '#d4af37';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`玩家 ${this.transitionNextPlayer + 1} 的回合`, centerX, centerY);
    } else if (this.transitionState === 'flipIn') {
      const t = this.transitionTime / Renderer.FLIP_DURATION;
      const scaleX = Math.abs(Math.cos((1 - t) * Math.PI / 2));
      const alpha = t;

      ctx.globalAlpha = alpha;
      ctx.translate(centerX, centerY);
      ctx.scale(scaleX, 1);
      ctx.translate(-centerX, -centerY);

      ctx.font = 'bold 36px sans-serif';
      ctx.fillStyle = '#d4af37';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`玩家 ${this.transitionNextPlayer + 1} 的回合`, centerX, centerY);
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
      this.drawCardSprite(ctx, card, cardX, cardY, cardWidth, cardHeight, 1.2);
      ctx.restore();
    });

    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#a0a0a0';
    ctx.fillText('点击任意位置重新开始', centerX, centerY + 180);

    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, width: number, height: number, radius: number
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

  markDirtyRect(x: number, y: number, width: number, height: number): void {
    const margin = 10;
    this.dirtyRects.push({
      x: Math.max(0, x - margin),
      y: Math.max(0, y - margin),
      width: width + margin * 2,
      height: height + margin * 2,
    });
  }

  markAllDirty(): void {
    this.dirtyRects.push({
      x: 0,
      y: 0,
      width: this.canvas.width,
      height: this.canvas.height,
    });
  }

  private clearDirtyRects(): void {
    this.dirtyRects = [];
  }

  private needsFullRedraw(): boolean {
    return (
      this.transitionState !== 'idle' ||
      this.gameOver ||
      this.attackAnims.length > 0 ||
      this.pulseAnims.length > 0 ||
      this.shakeAnims.length > 0 ||
      this.flashAnims.length > 0 ||
      this.dirtyRects.length === 0
    );
  }

  private intersectsRect(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  private drawFPSCounter(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 80, 30);
    ctx.fillStyle = this.fps >= 45 ? '#22c55e' : '#ef4444';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${this.fps.toFixed(0)} FPS`, 50, 25);
    ctx.restore();
  }
}
