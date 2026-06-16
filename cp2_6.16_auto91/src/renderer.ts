import {
  GameState,
  IPlant,
  ISprite,
  IParticle,
  IRipple,
  ElementType,
  ELEMENT_COLORS,
  ELEMENT_NAMES,
  ALL_ELEMENTS,
  Sprite
} from './entity';

const SPRITE_PIXEL_WIDTH = 16;
const SPRITE_PIXEL_HEIGHT = 24;
const PIXEL_SCALE = 1.5;

const SPRITE_PIXEL_DATA: number[][] = [
  [0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,0,1,1,2,2,1,1,2,2,1,0,0,0],
  [0,0,0,1,1,2,2,1,1,2,2,1,1,1,0,0],
  [0,0,1,1,2,2,1,1,1,1,2,2,1,1,1,0],
  [0,1,1,2,2,1,1,2,2,1,1,2,2,1,1,1],
  [0,1,1,2,2,1,1,2,2,1,1,2,2,1,1,1],
  [0,0,1,1,2,2,1,1,1,1,2,2,1,1,1,0],
  [0,0,0,1,1,2,2,1,1,2,2,1,1,1,0,0],
  [0,0,0,0,1,1,2,2,1,1,2,2,1,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0],
  [0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0],
  [0,0,0,0,3,0,0,0,0,0,0,0,3,0,0,0],
  [0,0,0,3,0,0,0,0,0,0,0,0,0,3,0,0],
  [0,0,3,0,0,0,0,0,0,0,0,0,0,0,3,0],
  [0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [0,0,3,0,0,0,0,0,0,0,0,0,0,0,3,0],
  [0,0,0,3,3,3,3,3,3,3,3,3,3,3,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private panelWidth: number = 220;
  private gardenOffsetX: number = 0;
  private gardenOffsetY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.gardenOffsetX = (this.canvas.width - 800 - this.panelWidth) / 2;
    this.gardenOffsetY = (this.canvas.height - 800) / 2;
  }

  clear(): void {
    this.ctx.fillStyle = '#0f0e17';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  render(state: GameState, ecoHealth: number, levelDistribution: Record<ElementType, number>): void {
    this.clear();

    if (ecoHealth < 40 && Math.floor(Date.now() / 200) % 2 === 0) {
      this.ctx.fillStyle = 'rgba(229, 49, 112, 0.15)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    if (ecoHealth < 40 && Math.floor(Date.now() / 300) % 2 === 0) {
      this.ctx.fillStyle = 'rgba(229, 49, 112, 0.1)';
      this.ctx.fillRect(this.gardenOffsetX, this.gardenOffsetY, 800, 800);
    }

    this.drawGrid(state);
    this.drawRipples(state.ripples);
    this.drawPlants(state.plants);
    this.drawParticles(state.particles);
    this.drawSprites(state);
    this.drawRepelEffects(state);
    this.drawPanel(state, ecoHealth, levelDistribution);
    this.drawDragPreview(state);
  }

  private drawGrid(state: GameState): void {
    const { gridSize, cellSize } = state;

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const px = this.gardenOffsetX + x * cellSize;
        const py = this.gardenOffsetY + y * cellSize;

        const baseColor = (x + y) % 2 === 0 ? '#2d2a35' : '#35323e';
        this.ctx.fillStyle = baseColor;
        this.ctx.fillRect(px, py, cellSize, cellSize);

        this.ctx.fillStyle = 'rgba(255, 137, 6, 0.03)';
        for (let i = 0; i < 3; i++) {
          const dotX = px + Math.random() * cellSize;
          const dotY = py + Math.random() * cellSize;
          this.ctx.beginPath();
          this.ctx.arc(dotX, dotY, 1 + Math.random(), 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }

    this.ctx.strokeStyle = 'rgba(255, 137, 6, 0.18)';
    this.ctx.lineWidth = 1;
    for (let i = 0; i <= gridSize; i++) {
      const px = this.gardenOffsetX + i * cellSize;
      const py = this.gardenOffsetY + i * cellSize;

      this.ctx.beginPath();
      this.ctx.moveTo(px, this.gardenOffsetY);
      this.ctx.lineTo(px, this.gardenOffsetY + gridSize * cellSize);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(this.gardenOffsetX, py);
      this.ctx.lineTo(this.gardenOffsetX + gridSize * cellSize, py);
      this.ctx.stroke();
    }

    this.ctx.strokeStyle = 'rgba(255, 137, 6, 0.4)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(this.gardenOffsetX, this.gardenOffsetY, gridSize * cellSize, gridSize * cellSize);
  }

  private drawRipples(ripples: IRipple[]): void {
    for (const ripple of ripples) {
      const alpha = ripple.getAlpha();
      this.ctx.strokeStyle = ripple.color;
      this.ctx.globalAlpha = alpha;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(
        this.gardenOffsetX + ripple.x,
        this.gardenOffsetY + ripple.y,
        ripple.radius,
        0,
        Math.PI * 2
      );
      this.ctx.stroke();
      this.ctx.globalAlpha = 1;
    }
  }

  private drawPlants(plants: IPlant[]): void {
    for (const plant of plants) {
      const px = this.gardenOffsetX + plant.x;
      const py = this.gardenOffsetY + plant.y;

      if (plant.isFullyGrown()) {
        const pulse = 1 + Math.sin(Date.now() / 500) * 0.1;
        const gradient = this.ctx.createRadialGradient(px, py, 0, px, py, plant.manaRadius * pulse);
        gradient.addColorStop(0, plant.color + '40');
        gradient.addColorStop(0.5, plant.color + '15');
        gradient.addColorStop(1, plant.color + '00');
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(px, py, plant.manaRadius * pulse, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.save();
      this.ctx.translate(px, py);
      this.ctx.scale(plant.scale, plant.scale);

      const growthY = -20 * plant.growthProgress;

      this.ctx.fillStyle = '#2d5016';
      this.ctx.fillRect(-2, 0, 4, 10 + growthY * 0.3);

      const leafOffset = 8 + growthY * 0.2;
      this.ctx.fillStyle = '#3d6b1e';
      this.ctx.beginPath();
      this.ctx.ellipse(-8, leafOffset, 6, 3, -0.5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.ellipse(8, leafOffset - 5, 6, 3, 0.5, 0, Math.PI * 2);
      this.ctx.fill();

      const glowSize = 12 + plant.growthProgress * 8;
      const glowGradient = this.ctx.createRadialGradient(0, growthY, 0, 0, growthY, glowSize);
      glowGradient.addColorStop(0, plant.color);
      glowGradient.addColorStop(0.4, plant.color + 'aa');
      glowGradient.addColorStop(1, plant.color + '00');
      this.ctx.fillStyle = glowGradient;
      this.ctx.beginPath();
      this.ctx.arc(0, growthY, glowSize, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = plant.color;
      if (plant.element === 'fire') {
        this.ctx.beginPath();
        this.ctx.moveTo(0, growthY - 15);
        this.ctx.quadraticCurveTo(8, growthY - 8, 6, growthY);
        this.ctx.quadraticCurveTo(0, growthY + 5, -6, growthY);
        this.ctx.quadraticCurveTo(-8, growthY - 8, 0, growthY - 15);
        this.ctx.fill();
      } else if (plant.element === 'ice') {
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          this.ctx.save();
          this.ctx.rotate(angle);
          this.ctx.fillRect(-1.5, -12, 3, 12);
          this.ctx.restore();
        }
        this.ctx.beginPath();
        this.ctx.arc(0, growthY, 5, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        for (let i = 0; i < 3; i++) {
          const angle = (i / 3) * Math.PI * 2 + Date.now() / 1000;
          this.ctx.save();
          this.ctx.translate(0, growthY);
          this.ctx.rotate(angle);
          this.ctx.beginPath();
          this.ctx.moveTo(0, -8);
          this.ctx.lineTo(3, -2);
          this.ctx.lineTo(0, 0);
          this.ctx.lineTo(-3, -2);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.restore();
        }
      }

      this.ctx.restore();
    }
  }

  private drawParticles(particles: IParticle[]): void {
    for (const particle of particles) {
      const alpha = particle.getAlpha();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = particle.color;

      if (particle.type === 'spark') {
        this.ctx.shadowColor = particle.color;
        this.ctx.shadowBlur = 8;
        this.ctx.beginPath();
        this.ctx.arc(
          this.gardenOffsetX + particle.x,
          this.gardenOffsetY + particle.y,
          particle.size,
          0,
          Math.PI * 2
        );
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
      } else {
        this.ctx.strokeStyle = '#e53170';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(
          this.gardenOffsetX + particle.x,
          this.gardenOffsetY + particle.y,
          particle.size * (1 + (1 - alpha) * 5),
          0,
          Math.PI * 2
        );
        this.ctx.stroke();
      }

      this.ctx.globalAlpha = 1;
    }
  }

  private drawSprites(state: GameState): void {
    for (const sprite of state.sprites) {
      if (state.isDragging && state.selectedSprite?.id === sprite.id) continue;

      this.drawSprite(sprite);
    }
  }

  private drawSprite(sprite: ISprite, isDragging: boolean = false): void {
    const px = this.gardenOffsetX + sprite.x;
    const py = this.gardenOffsetY + sprite.y;

    this.ctx.save();
    this.ctx.translate(px, py);
    this.ctx.scale(sprite.scale * PIXEL_SCALE, sprite.scale * PIXEL_SCALE);

    if (isDragging) {
      this.ctx.shadowColor = sprite.color;
      this.ctx.shadowBlur = 15;
      this.ctx.strokeStyle = sprite.color;
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(
        -SPRITE_PIXEL_WIDTH / 2 - 2,
        -SPRITE_PIXEL_HEIGHT / 2 - 2,
        SPRITE_PIXEL_WIDTH + 4,
        SPRITE_PIXEL_HEIGHT + 4
      );
      this.ctx.shadowBlur = 0;
    }

    if (sprite.isMutated) {
      this.ctx.strokeStyle = '#e53170';
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([2, 2]);
      this.ctx.strokeRect(
        -SPRITE_PIXEL_WIDTH / 2 - 3,
        -SPRITE_PIXEL_HEIGHT / 2 - 3,
        SPRITE_PIXEL_WIDTH + 6,
        SPRITE_PIXEL_HEIGHT + 6
      );
      this.ctx.setLineDash([]);
    }

    const baseColor = sprite.isFlashing() ? '#ffffff' : sprite.color;
    const lightColor = this.lightenColor(baseColor, 30);
    const darkColor = this.darkenColor(baseColor, 20);
    const eyeColor = '#0f0e17';
    const eyeHighlight = '#ffffff';

    const wingFlap = Math.sin(Date.now() / 80) * 0.3;

    for (let row = 0; row < SPRITE_PIXEL_HEIGHT; row++) {
      for (let col = 0; col < SPRITE_PIXEL_WIDTH; col++) {
        const pixelType = SPRITE_PIXEL_DATA[row][col];
        if (pixelType === 0) continue;

        let color: string;
        switch (pixelType) {
          case 1:
            color = baseColor;
            break;
          case 2:
            color = lightColor;
            break;
          case 3:
            color = darkColor;
            break;
          default:
            color = baseColor;
        }

        let drawX = col - SPRITE_PIXEL_WIDTH / 2;
        let drawY = row - SPRITE_PIXEL_HEIGHT / 2;

        if (pixelType === 3 && row < 22) {
          const wingRow = row - 15;
          if (col < 8) {
            drawX -= wingFlap * (1 + wingRow * 0.1);
          } else {
            drawX += wingFlap * (1 + wingRow * 0.1);
          }
        }

        this.ctx.fillStyle = color;
        this.ctx.fillRect(drawX, drawY, 1, 1);
      }
    }

    this.ctx.fillStyle = eyeColor;
    this.ctx.fillRect(-4, -8, 2, 2);
    this.ctx.fillRect(2, -8, 2, 2);

    this.ctx.fillStyle = eyeHighlight;
    this.ctx.fillRect(-3, -8, 1, 1);
    this.ctx.fillRect(3, -8, 1, 1);

    if (sprite.isFlashing()) {
      this.ctx.shadowColor = '#ffffff';
      this.ctx.shadowBlur = 25;
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      this.ctx.fillRect(
        -SPRITE_PIXEL_WIDTH / 2,
        -SPRITE_PIXEL_HEIGHT / 2,
        SPRITE_PIXEL_WIDTH,
        SPRITE_PIXEL_HEIGHT
      );
      this.ctx.shadowBlur = 0;
    }

    if (sprite.level > 1) {
      this.ctx.fillStyle = '#ff8906';
      this.ctx.font = 'bold 5px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`Lv${sprite.level}`, 0, -SPRITE_PIXEL_HEIGHT / 2 - 3);
    }

    this.ctx.restore();
  }

  private drawRepelEffects(state: GameState): void {
    const evolvedSprites = state.sprites.filter(s => s.isEvolved);

    for (let i = 0; i < evolvedSprites.length; i++) {
      for (let j = i + 1; j < evolvedSprites.length; j++) {
        const s1 = evolvedSprites[i];
        const s2 = evolvedSprites[j];

        if (s1.element !== s2.element) {
          const dx = s2.x - s1.x;
          const dy = s2.y - s1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 60) {
            this.ctx.strokeStyle = '#e53170';
            this.ctx.lineWidth = 2;
            this.ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 100) * 0.3;

            this.ctx.beginPath();
            this.ctx.arc(this.gardenOffsetX + s1.x, this.gardenOffsetY + s1.y, 20, 0, Math.PI * 2);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.arc(this.gardenOffsetX + s2.x, this.gardenOffsetY + s2.y, 20, 0, Math.PI * 2);
            this.ctx.stroke();

            this.ctx.globalAlpha = 1;
          }
        }
      }
    }
  }

  private drawPanel(state: GameState, ecoHealth: number, levelDistribution: Record<ElementType, number>): void {
    const panelX = this.gardenOffsetX + 800 + 20;
    const panelY = this.gardenOffsetY;
    const padding = 16;

    this.ctx.fillStyle = 'rgba(26, 26, 46, 0.5)';
    this.ctx.beginPath();
    this.roundRect(panelX, panelY, this.panelWidth, 800, 8);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(255, 137, 6, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    let currentY = panelY + padding;

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '300 16px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('🌿 生态面板', panelX + padding, currentY);
    currentY += 28;

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.font = '300 14px "Segoe UI", sans-serif';
    this.ctx.fillText(`精灵总数`, panelX + padding, currentY);
    currentY += 20;

    this.ctx.fillStyle = '#ff8906';
    this.ctx.font = 'bold 28px "Segoe UI", sans-serif';
    this.ctx.fillText(`${state.sprites.length}`, panelX + padding, currentY);
    currentY += 32;

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.font = '300 14px "Segoe UI", sans-serif';
    this.ctx.fillText(`生态健康值`, panelX + padding, currentY);
    currentY += 12;

    const barWidth = this.panelWidth - padding * 2;
    const barHeight = 12;
    const healthColor = ecoHealth >= 60 ? '#00b894' : ecoHealth >= 40 ? '#feca57' : '#e53170';

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.beginPath();
    this.roundRect(panelX + padding, currentY, barWidth, barHeight, 4);
    this.ctx.fill();

    this.ctx.fillStyle = healthColor;
    this.ctx.beginPath();
    this.roundRect(panelX + padding, currentY, barWidth * (ecoHealth / 100), barHeight, 4);
    this.ctx.fill();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 12px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`${ecoHealth.toFixed(0)}%`, panelX + this.panelWidth - padding, currentY + 10);
    this.ctx.textAlign = 'left';

    currentY += 28;

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.font = '300 14px "Segoe UI", sans-serif';
    this.ctx.fillText(`元素分布`, panelX + padding, currentY);
    currentY += 16;

    const maxCount = Math.max(...Object.values(levelDistribution), 1);
    const barMaxWidth = this.panelWidth - padding * 2 - 50;

    for (const element of ALL_ELEMENTS) {
      const count = levelDistribution[element] || 0;
      if (count === 0) continue;

      const color = ELEMENT_COLORS[element];
      const name = ELEMENT_NAMES[element];
      const barWidth2 = (count / maxCount) * barMaxWidth;

      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      this.ctx.font = '300 11px "Segoe UI", sans-serif';
      this.ctx.fillText(name, panelX + padding, currentY + 10);

      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      this.ctx.beginPath();
      this.roundRect(panelX + padding + 42, currentY, barMaxWidth, 14, 3);
      this.ctx.fill();

      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.roundRect(panelX + padding + 42, currentY, barWidth2, 14, 3);
      this.ctx.fill();

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 10px "Segoe UI", sans-serif';
      this.ctx.textAlign = 'right';
      this.ctx.fillText(`${count}`, panelX + this.panelWidth - padding, currentY + 11);
      this.ctx.textAlign = 'left';

      currentY += 20;
    }

    currentY += 10;

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.font = '300 14px "Segoe UI", sans-serif';
    this.ctx.fillText(`植物数量`, panelX + padding, currentY);
    currentY += 20;

    this.ctx.fillStyle = '#48dbfb';
    this.ctx.font = 'bold 18px "Segoe UI", sans-serif';
    this.ctx.fillText(`${state.plants.length} / ${state.gridSize * state.gridSize}`, panelX + padding, currentY);
    currentY += 32;

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.font = '300 11px "Segoe UI", sans-serif';
    this.ctx.fillText(`粒子数: ${state.particles.length} / 300`, panelX + padding, currentY);
  }

  private drawDragPreview(state: GameState): void {
    if (state.isDragging && state.selectedSprite) {
      const sprite = state.selectedSprite;
      const tempSprite = new Sprite(
        state.mouseX - this.gardenOffsetX,
        state.mouseY - this.gardenOffsetY,
        sprite.element
      );
      tempSprite.scale = sprite.scale;
      tempSprite.size = sprite.size;
      tempSprite.color = sprite.color;
      tempSprite.level = sprite.level;
      tempSprite.isMutated = sprite.isMutated;

      this.ctx.globalAlpha = 0.8;
      this.drawSprite(tempSprite, true);
      this.ctx.globalAlpha = 1;

      const hoverPlant = this.getHoveredPlant(state);
      if (hoverPlant) {
        this.ctx.strokeStyle = '#ff8906';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(
          this.gardenOffsetX + hoverPlant.gridX * state.cellSize,
          this.gardenOffsetY + hoverPlant.gridY * state.cellSize,
          state.cellSize,
          state.cellSize
        );
        this.ctx.setLineDash([]);
      }
    }
  }

  getHoveredPlant(state: GameState): IPlant | null {
    const gardenX = state.mouseX - this.gardenOffsetX;
    const gardenY = state.mouseY - this.gardenOffsetY;

    for (const plant of state.plants) {
      const dx = gardenX - plant.x;
      const dy = gardenY - plant.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < state.cellSize / 2) {
        return plant;
      }
    }
    return null;
  }

  getHoveredSprite(state: GameState): ISprite | null {
    const gardenX = state.mouseX - this.gardenOffsetX;
    const gardenY = state.mouseY - this.gardenOffsetY;

    for (let i = state.sprites.length - 1; i >= 0; i--) {
      const sprite = state.sprites[i];
      const dx = gardenX - sprite.x;
      const dy = gardenY - sprite.y;
      const hitRadius = Math.max(SPRITE_PIXEL_WIDTH, SPRITE_PIXEL_HEIGHT) * PIXEL_SCALE * sprite.scale / 2 + 5;
      if (dx * dx + dy * dy < hitRadius * hitRadius) {
        return sprite;
      }
    }
    return null;
  }

  getGridPosition(state: GameState): { gridX: number; gridY: number } | null {
    const gardenX = state.mouseX - this.gardenOffsetX;
    const gardenY = state.mouseY - this.gardenOffsetY;

    if (gardenX < 0 || gardenX >= state.gardenWidth || gardenY < 0 || gardenY >= state.gardenHeight) {
      return null;
    }

    return {
      gridX: Math.floor(gardenX / state.cellSize),
      gridY: Math.floor(gardenY / state.cellSize)
    };
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
    const B = Math.min(255, (num & 0x0000ff) + amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  private darkenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
    const B = Math.max(0, (num & 0x0000ff) - amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }

  getGardenOffset(): { x: number; y: number } {
    return { x: this.gardenOffsetX, y: this.gardenOffsetY };
  }
}
