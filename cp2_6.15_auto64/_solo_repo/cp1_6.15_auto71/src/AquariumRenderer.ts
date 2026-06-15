import { Fish, Food, Ripple, Bubble, Seaweed, Tooltip, FishManagerState, FoodManagerState, FISH_COLORS } from './types';

const BUBBLE_SPAWN_INTERVAL = 0.8;

export class AquariumRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvasWidth: number;
  private canvasHeight: number;
  private bubbles: Bubble[] = [];
  private seaweeds: Seaweed[] = [];
  private tooltip: Tooltip | null = null;
  private lastBubbleSpawn: number = 0;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.initSeaweeds();
  }

  private initSeaweeds(): void {
    this.seaweeds = [];
    const spacing = 30;
    for (let x = spacing; x < this.canvasWidth - spacing; x += spacing) {
      const baseHeight = 60 + Math.random() * 40;
      const segments: { angle: number; length: number }[] = [];
      const segmentCount = 3 + Math.floor(Math.random() * 2);
      for (let i = 0; i < segmentCount; i++) {
        segments.push({
          angle: 0,
          length: baseHeight / segmentCount
        });
      }
      this.seaweeds.push({
        x,
        baseHeight,
        segments,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.5 + Math.random() * 0.5
      });
    }
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.initSeaweeds();
  }

  public setTooltip(x: number, y: number, text: string): void {
    this.tooltip = {
      x,
      y,
      text,
      alpha: 0,
      duration: 0.5,
      elapsed: 0
    };
  }

  public clearTooltip(): void {
    this.tooltip = null;
  }

  private updateBubbles(deltaTime: number, currentTime: number): void {
    if (currentTime - this.lastBubbleSpawn > BUBBLE_SPAWN_INTERVAL) {
      this.lastBubbleSpawn = currentTime;
      this.bubbles.push({
        x: Math.random() * this.canvasWidth,
        y: this.canvasHeight + 10,
        radius: 2 + Math.random() * 4,
        speed: 30 + Math.random() * 40,
        alpha: 0.3 + Math.random() * 0.4,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleAmplitude: 10 + Math.random() * 15
      });
    }

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const bubble = this.bubbles[i];
      bubble.wobblePhase += deltaTime * 2;
      bubble.y -= bubble.speed * deltaTime;
      bubble.x += Math.sin(bubble.wobblePhase) * bubble.wobbleAmplitude * deltaTime * 0.5;
      bubble.alpha = Math.max(0, bubble.alpha - deltaTime * 0.1);

      if (bubble.y < -10 || bubble.alpha <= 0) {
        this.bubbles.splice(i, 1);
      }
    }
  }

  private updateSeaweeds(deltaTime: number): void {
    for (const seaweed of this.seaweeds) {
      seaweed.swayPhase += deltaTime * seaweed.swaySpeed;
      let cumulativeAngle = 0;
      for (let i = 0; i < seaweed.segments.length; i++) {
        const swayAmount = Math.sin(seaweed.swayPhase + i * 0.5) * 0.15 * (i + 1);
        seaweed.segments[i].angle = swayAmount;
        cumulativeAngle += swayAmount;
      }
    }
  }

  private updateTooltip(deltaTime: number): void {
    if (this.tooltip) {
      this.tooltip.elapsed += deltaTime;
      if (this.tooltip.elapsed < this.tooltip.duration) {
        this.tooltip.alpha = Math.min(1, this.tooltip.alpha + deltaTime * 4);
      } else {
        this.tooltip.alpha = Math.max(0, this.tooltip.alpha - deltaTime * 4);
        if (this.tooltip.alpha <= 0) {
          this.tooltip = null;
        }
      }
    }
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
    gradient.addColorStop(0, '#0B1A2E');
    gradient.addColorStop(1, '#0D2B45');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  private drawSeaweeds(): void {
    for (const seaweed of this.seaweeds) {
      this.ctx.save();
      this.ctx.translate(seaweed.x, this.canvasHeight - 30);

      const colors = ['#2E8B57', '#3CB371', '#228B22'];
      let currentX = 0;
      let currentY = 0;

      for (let i = 0; i < seaweed.segments.length; i++) {
        const segment = seaweed.segments[i];
        const nextX = currentX + Math.sin(segment.angle) * segment.length;
        const nextY = currentY - Math.cos(segment.angle) * segment.length;

        this.ctx.beginPath();
        this.ctx.moveTo(currentX, currentY);
        this.ctx.quadraticCurveTo(
          (currentX + nextX) / 2 + Math.sin(segment.angle) * 5,
          (currentY + nextY) / 2,
          nextX,
          nextY
        );
        this.ctx.strokeStyle = colors[i % colors.length];
        this.ctx.lineWidth = 6 - i;
        this.ctx.lineCap = 'round';
        this.ctx.stroke();

        currentX = nextX;
        currentY = nextY;
      }

      this.ctx.restore();
    }
  }

  private drawBubbles(): void {
    for (const bubble of this.bubbles) {
      this.ctx.beginPath();
      this.ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${bubble.alpha * 0.3})`;
      this.ctx.fill();
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${bubble.alpha * 0.6})`;
      this.ctx.lineWidth = 1;
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.arc(bubble.x - bubble.radius * 0.3, bubble.y - bubble.radius * 0.3, bubble.radius * 0.2, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${bubble.alpha})`;
      this.ctx.fill();
    }
  }

  private drawFish(fish: Fish): void {
    const colors = FISH_COLORS[fish.species];
    const lowHealth = fish.health < 20 && !fish.isDying;
    const alpha = fish.isDying ? Math.max(0.3, 1 - fish.deathProgress) : (lowHealth ? 0.5 : 1);
    let scale = 1;

    if (fish.isEating) {
      const t = fish.eatProgress;
      scale = 1 + 0.1 * Math.sin(t * Math.PI);
    }

    this.ctx.save();
    this.ctx.translate(fish.x, fish.y);
    this.ctx.rotate(fish.direction);
    this.ctx.scale(scale, scale);
    this.ctx.globalAlpha = alpha;

    const bodyColor = fish.isDying ? '#808080' : colors.primary;
    const stripeColor = fish.isDying ? '#A0A0A0' : colors.secondary;

    if (fish.species === 'clownfish') {
      this.drawClownfish(bodyColor, stripeColor);
    } else if (fish.species === 'angelfish') {
      this.drawAngelfish(bodyColor, stripeColor);
    } else {
      this.drawPufferfish(bodyColor, stripeColor);
    }

    this.ctx.restore();
  }

  private drawClownfish(bodyColor: string, stripeColor: string): void {
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, 25, 12, 0, 0, Math.PI * 2);
    this.ctx.fillStyle = bodyColor;
    this.ctx.fill();

    for (let i = -1; i <= 1; i++) {
      this.ctx.fillStyle = stripeColor;
      this.ctx.fillRect(i * 10 - 3, -12, 6, 24);
    }

    this.ctx.beginPath();
    this.ctx.moveTo(-25, 0);
    this.ctx.lineTo(-35, -10);
    this.ctx.lineTo(-35, 10);
    this.ctx.closePath();
    this.ctx.fillStyle = bodyColor;
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(15, -3, 3, 0, Math.PI * 2);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(16, -3, 1.5, 0, Math.PI * 2);
    this.ctx.fillStyle = '#000000';
    this.ctx.fill();
  }

  private drawAngelfish(bodyColor: string, stripeColor: string): void {
    const gradient = this.ctx.createLinearGradient(0, -20, 0, 20);
    gradient.addColorStop(0, bodyColor);
    gradient.addColorStop(1, stripeColor);

    this.ctx.beginPath();
    this.ctx.moveTo(-20, 0);
    this.ctx.quadraticCurveTo(-5, -20, 15, -15);
    this.ctx.quadraticCurveTo(25, 0, 15, 15);
    this.ctx.quadraticCurveTo(-5, 20, -20, 0);
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.moveTo(-20, 0);
    this.ctx.lineTo(-32, -8);
    this.ctx.lineTo(-32, 8);
    this.ctx.closePath();
    this.ctx.fillStyle = stripeColor;
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.moveTo(0, -18);
    this.ctx.lineTo(-5, -30);
    this.ctx.lineTo(5, -30);
    this.ctx.closePath();
    this.ctx.fillStyle = stripeColor;
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(10, -3, 3, 0, Math.PI * 2);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(11, -3, 1.5, 0, Math.PI * 2);
    this.ctx.fillStyle = '#000000';
    this.ctx.fill();
  }

  private drawPufferfish(bodyColor: string, stripeColor: string): void {
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 20, 0, Math.PI * 2);
    this.ctx.fillStyle = bodyColor;
    this.ctx.fill();

    const dotPositions = [
      [-10, -10], [0, -12], [10, -8],
      [-8, 0], [8, 2],
      [-10, 10], [0, 12], [10, 8]
    ];
    for (const [dx, dy] of dotPositions) {
      this.ctx.beginPath();
      this.ctx.arc(dx, dy, 3, 0, Math.PI * 2);
      this.ctx.fillStyle = stripeColor;
      this.ctx.fill();
    }

    this.ctx.beginPath();
    this.ctx.moveTo(-20, 0);
    this.ctx.lineTo(-30, -6);
    this.ctx.lineTo(-30, 6);
    this.ctx.closePath();
    this.ctx.fillStyle = bodyColor;
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(12, -4, 3, 0, Math.PI * 2);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(13, -4, 1.5, 0, Math.PI * 2);
    this.ctx.fillStyle = '#000000';
    this.ctx.fill();
  }

  private drawFood(food: Food): void {
    this.ctx.beginPath();
    this.ctx.arc(food.x, food.y, 3, 0, Math.PI * 2);
    this.ctx.fillStyle = food.color;
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(food.x - 1, food.y - 1, 1, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.fill();
  }

  private drawRipple(ripple: Ripple): void {
    this.ctx.beginPath();
    this.ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
    this.ctx.strokeStyle = `rgba(255, 255, 255, ${ripple.alpha})`;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  private drawUI(fishCount: number, feedCount: number): void {
    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillText(`鱼数: ${fishCount}`, 15, 25);

    this.ctx.textAlign = 'right';
    this.ctx.fillStyle = '#FFE66D';
    this.ctx.fillText(`喂食: ${feedCount}`, this.canvasWidth - 15, 25);
  }

  private drawTooltip(): void {
    if (!this.tooltip || this.tooltip.alpha <= 0) return;

    const padding = 8;
    const lineHeight = 18;
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'left';

    const lines = this.tooltip.text.split('\n');
    let maxWidth = 0;
    for (const line of lines) {
      const metrics = this.ctx.measureText(line);
      maxWidth = Math.max(maxWidth, metrics.width);
    }

    const boxWidth = maxWidth + padding * 2;
    const boxHeight = lines.length * lineHeight + padding * 2;
    let boxX = this.tooltip.x + 15;
    let boxY = this.tooltip.y - boxHeight / 2;

    if (boxX + boxWidth > this.canvasWidth - 10) {
      boxX = this.tooltip.x - boxWidth - 15;
    }
    if (boxY < 10) boxY = 10;
    if (boxY + boxHeight > this.canvasHeight - 10) boxY = this.canvasHeight - boxHeight - 10;

    const radius = 6;
    this.ctx.beginPath();
    this.ctx.moveTo(boxX + radius, boxY);
    this.ctx.lineTo(boxX + boxWidth - radius, boxY);
    this.ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + radius);
    this.ctx.lineTo(boxX + boxWidth, boxY + boxHeight - radius);
    this.ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - radius, boxY + boxHeight);
    this.ctx.lineTo(boxX + radius, boxY + boxHeight);
    this.ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - radius);
    this.ctx.lineTo(boxX, boxY + radius);
    this.ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
    this.ctx.closePath();
    this.ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * this.tooltip.alpha})`;
    this.ctx.fill();

    this.ctx.fillStyle = `rgba(0, 0, 0, ${this.tooltip.alpha})`;
    for (let i = 0; i < lines.length; i++) {
      this.ctx.fillText(lines[i], boxX + padding, boxY + padding + (i + 0.8) * lineHeight);
    }
  }

  public update(deltaTime: number, currentTime: number): void {
    this.updateBubbles(deltaTime, currentTime);
    this.updateSeaweeds(deltaTime);
    this.updateTooltip(deltaTime);
  }

  public draw(fishState: FishManagerState, foodState: FoodManagerState): void {
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    this.drawBackground();
    this.drawSeaweeds();
    this.drawBubbles();

    for (const ripple of fishState.ripples) {
      this.drawRipple(ripple);
    }

    for (const food of foodState.foods) {
      if (!food.eaten) {
        this.drawFood(food);
      }
    }

    for (const fish of fishState.fishes) {
      this.drawFish(fish);
    }

    this.drawUI(fishState.fishes.filter(f => !f.isDying).length, fishState.feedCount);
    this.drawTooltip();
  }
}
