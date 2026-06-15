interface Building {
  x: number;
  width: number;
  height: number;
  layer: number;
  windows: { x: number; y: number; lit: boolean }[];
}

export class SceneManager {
  private canvasWidth: number;
  private canvasHeight: number;
  private groundY: number;
  private gridOffset: number = 0;
  private buildings: Building[] = [];
  private farBuildings: Building[] = [];
  private stars: { x: number; y: number; size: number; twinkle: number }[] = [];

  constructor(canvasWidth: number, canvasHeight: number, groundY: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.groundY = groundY;
    this.generateStars();
    this.generateInitialBuildings();
  }

  private generateStars(): void {
    this.stars = [];
    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random() * this.canvasWidth,
        y: Math.random() * (this.groundY - 100),
        size: Math.random() * 2 + 1,
        twinkle: Math.random() * Math.PI * 2,
      });
    }
  }

  private generateInitialBuildings(): void {
    let x = 0;
    while (x < this.canvasWidth + 200) {
      const b = this.createBuilding(x, 1);
      this.buildings.push(b);
      x += b.width + Math.random() * 40 + 10;
    }

    x = 0;
    while (x < this.canvasWidth + 200) {
      const b = this.createBuilding(x, 2);
      this.farBuildings.push(b);
      x += b.width + Math.random() * 30 + 5;
    }
  }

  private createBuilding(x: number, layer: number): Building {
    const scale = layer === 1 ? 1 : 0.6;
    const width = (Math.random() * 80 + 60) * scale;
    const height = (Math.random() * 150 + 80) * scale;
    const windows: { x: number; y: number; lit: boolean }[] = [];

    const winGap = layer === 1 ? 12 : 8;

    for (let wy = winGap; wy < height - winGap; wy += winGap) {
      for (let wx = winGap; wx < width - winGap; wx += winGap) {
        if (Math.random() > 0.4) {
          windows.push({ x: wx, y: wy, lit: Math.random() > 0.3 });
        }
      }
    }

    return { x, width, height, layer, windows };
  }

  resize(canvasWidth: number, canvasHeight: number, groundY: number): void {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.groundY = groundY;
    this.buildings = [];
    this.farBuildings = [];
    this.stars = [];
    this.generateStars();
    this.generateInitialBuildings();
  }

  update(scrollSpeed: number, deltaTime: number): void {
    const moveAmount = scrollSpeed * deltaTime * 0.001;

    this.gridOffset += moveAmount;
    if (this.gridOffset > 40) {
      this.gridOffset -= 40;
    }

    for (const b of this.buildings) {
      b.x -= moveAmount;
    }
    this.buildings = this.buildings.filter((b) => b.x + b.width > -50);
    const lastBuilding = this.buildings[this.buildings.length - 1];
    if (!lastBuilding || lastBuilding.x + lastBuilding.width < this.canvasWidth + 100) {
      const startX = lastBuilding
        ? lastBuilding.x + lastBuilding.width + Math.random() * 40 + 10
        : this.canvasWidth;
      this.buildings.push(this.createBuilding(startX, 1));
    }

    const farMoveAmount = moveAmount * 0.4;
    for (const b of this.farBuildings) {
      b.x -= farMoveAmount;
    }
    this.farBuildings = this.farBuildings.filter((b) => b.x + b.width > -50);
    const lastFar = this.farBuildings[this.farBuildings.length - 1];
    if (!lastFar || lastFar.x + lastFar.width < this.canvasWidth + 100) {
      const startX = lastFar
        ? lastFar.x + lastFar.width + Math.random() * 30 + 5
        : this.canvasWidth;
      this.farBuildings.push(this.createBuilding(startX, 2));
    }

    for (const star of this.stars) {
      star.twinkle += deltaTime * 0.003;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.renderBackground(ctx);
    this.renderStars(ctx);
    this.renderFarBuildings(ctx);
    this.renderBuildings(ctx);
    this.renderGround(ctx);
  }

  private renderBackground(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
    gradient.addColorStop(0, '#0a0015');
    gradient.addColorStop(0.4, '#1a0a2e');
    gradient.addColorStop(0.7, '#2d1050');
    gradient.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    const horizonGlow = ctx.createRadialGradient(
      this.canvasWidth * 0.7,
      this.groundY - 50,
      0,
      this.canvasWidth * 0.7,
      this.groundY - 50,
      300
    );
    horizonGlow.addColorStop(0, 'rgba(255, 0, 255, 0.15)');
    horizonGlow.addColorStop(0.5, 'rgba(0, 255, 247, 0.08)');
    horizonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = horizonGlow;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  private renderStars(ctx: CanvasRenderingContext2D): void {
    for (const star of this.stars) {
      const alpha = 0.5 + Math.sin(star.twinkle) * 0.5;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00fff7';
      ctx.shadowBlur = 4;
      ctx.fillRect(star.x, star.y, star.size, star.size);
      ctx.restore();
    }
  }

  private renderFarBuildings(ctx: CanvasRenderingContext2D): void {
    for (const b of this.farBuildings) {
      const by = this.groundY - b.height;

      ctx.fillStyle = '#150825';
      ctx.fillRect(b.x, by, b.width, b.height);

      ctx.strokeStyle = '#3d1a6e';
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x, by, b.width, b.height);

      for (const win of b.windows) {
        if (win.lit) {
          ctx.fillStyle = Math.random() > 0.5 ? '#ff00ff40' : '#00fff740';
          ctx.fillRect(b.x + win.x, by + win.y, 3, 3);
        }
      }
    }
  }

  private renderBuildings(ctx: CanvasRenderingContext2D): void {
    for (const b of this.buildings) {
      const by = this.groundY - b.height;

      const buildingGrad = ctx.createLinearGradient(b.x, by, b.x, by + b.height);
      buildingGrad.addColorStop(0, '#1a0a2e');
      buildingGrad.addColorStop(1, '#0f0520');
      ctx.fillStyle = buildingGrad;
      ctx.fillRect(b.x, by, b.width, b.height);

      ctx.save();
      ctx.strokeStyle = '#00fff7';
      ctx.shadowColor = '#00fff7';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x, by, b.width, b.height);
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = '#ff00ff';
      ctx.shadowColor = '#ff00ff';
      ctx.shadowBlur = 6;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(b.x, by);
      ctx.lineTo(b.x + b.width, by);
      ctx.stroke();
      ctx.restore();

      for (const win of b.windows) {
        if (win.lit) {
          const color = Math.random() > 0.5 ? '#00fff7' : '#ff00ff';
          ctx.save();
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 5;
          ctx.fillRect(b.x + win.x, by + win.y, 4, 6);
          ctx.restore();
        } else {
          ctx.fillStyle = '#1a0a2e';
          ctx.fillRect(b.x + win.x, by + win.y, 4, 6);
        }
      }
    }
  }

  private renderGround(ctx: CanvasRenderingContext2D): void {
    const groundGrad = ctx.createLinearGradient(0, this.groundY, 0, this.canvasHeight);
    groundGrad.addColorStop(0, '#1a0a2e');
    groundGrad.addColorStop(0.3, '#2d1050');
    groundGrad.addColorStop(1, '#0a0015');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, this.groundY, this.canvasWidth, this.canvasHeight - this.groundY);

    ctx.save();
    ctx.strokeStyle = '#00fff7';
    ctx.shadowColor = '#00fff7';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(this.canvasWidth, this.groundY);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = '#00fff760';
    ctx.lineWidth = 1;

    const gridSize = 40;
    const perspectiveLines = 12;

    for (let i = 0; i < perspectiveLines; i++) {
      const yStart = this.groundY + i * 15;
      const spread = i * 80;
      ctx.beginPath();
      ctx.moveTo(this.canvasWidth / 2 - spread, yStart);
      ctx.lineTo(this.canvasWidth / 2 + spread, yStart);
      ctx.stroke();
    }

    ctx.strokeStyle = '#00fff740';
    for (let i = -1; i < perspectiveLines; i++) {
      const xOffset = -this.gridOffset + i * gridSize;
      ctx.beginPath();
      ctx.moveTo(this.canvasWidth / 2 + xOffset, this.groundY);
      ctx.lineTo(this.canvasWidth / 2 + xOffset - 400, this.canvasHeight);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(this.canvasWidth / 2 - xOffset, this.groundY);
      ctx.lineTo(this.canvasWidth / 2 - xOffset + 400, this.canvasHeight);
      ctx.stroke();
    }

    ctx.restore();

    ctx.save();
    ctx.strokeStyle = '#ff00ff80';
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 5;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY + 3);
    ctx.lineTo(this.canvasWidth, this.groundY + 3);
    ctx.stroke();
    ctx.restore();
  }
}
