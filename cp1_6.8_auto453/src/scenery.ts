export interface SceneryElement {
  type: 'mountain' | 'waterfall' | 'pine' | 'cloud';
  x: number;
  y: number;
  scale: number;
  opacity: number;
  inkSpreadProgress: number;
  layer: number;
}

const LAYER_SPEEDS = [0.2, 0.5, 1.0];
const LAYER_OPACITIES = [0.15, 0.3, 0.5];
const MOUNTAIN_COLORS = ['#3a3a3a', '#4a4a4a', '#2c2c2c'];
const PINE_COLOR = '#3a3a3a';
const CLOUD_COLOR = '#b0a890';
const WATERFALL_COLOR = '#8a8a8a';

export class Scenery {
  private layers: SceneryElement[][] = [[], [], []];
  private scrollOffset: number = 0;
  private canvasWidth: number;
  private canvasHeight: number;
  private groundY: number;
  private offscreenCanvases: HTMLCanvasElement[] = [];
  private offscreenCtxs: CanvasRenderingContext2D[] = [];
  private needRedraw: boolean[] = [true, true, true];

  constructor(canvasWidth: number, canvasHeight: number, groundY: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.groundY = groundY;
    this.initLayers();
    this.createOffscreenCanvases();
  }

  private initLayers() {
    for (let layer = 0; layer < 3; layer++) {
      this.layers[layer] = [];
      this.generateLayerElements(layer, this.canvasWidth * 2);
    }
  }

  private createOffscreenCanvases() {
    for (let i = 0; i < 3; i++) {
      const oc = document.createElement('canvas');
      oc.width = this.canvasWidth * 2;
      oc.height = this.canvasHeight;
      this.offscreenCanvases.push(oc);
      this.offscreenCtxs.push(oc.getContext('2d')!);
    }
  }

  private generateLayerElements(layer: number, targetWidth: number) {
    const elements = this.layers[layer];
    const lastX = elements.length > 0 ? Math.max(...elements.map(e => e.x)) : 0;
    let x = lastX;

    while (x < targetWidth) {
      const type = this.randomElementType(layer);
      const element = this.createElement(type, x, layer);
      elements.push(element);
      x += this.getElementSpacing(type, layer);
    }
  }

  private randomElementType(layer: number): SceneryElement['type'] {
    if (layer === 0) return 'mountain';
    if (layer === 1) {
      const r = Math.random();
      if (r < 0.4) return 'mountain';
      if (r < 0.65) return 'pine';
      if (r < 0.85) return 'cloud';
      return 'waterfall';
    }
    const r = Math.random();
    if (r < 0.4) return 'pine';
    if (r < 0.7) return 'cloud';
    return 'pine';
  }

  private getElementSpacing(type: SceneryElement['type'], layer: number): number {
    const base = type === 'mountain' ? 300 : type === 'pine' ? 150 : type === 'cloud' ? 250 : 200;
    return base * (1 + layer * 0.5) * (0.8 + Math.random() * 0.4);
  }

  private createElement(type: SceneryElement['type'], x: number, layer: number): SceneryElement {
    const scale = (0.5 + Math.random() * 1.0) * (1 + layer * 0.3);
    let y = this.groundY;

    if (type === 'mountain') {
      y = this.groundY - 50 * scale * (1 + (2 - layer) * 0.5);
    } else if (type === 'cloud') {
      y = 50 + Math.random() * (this.groundY * 0.3);
    } else if (type === 'pine') {
      y = this.groundY - 10;
    } else if (type === 'waterfall') {
      y = this.groundY - 80 * scale;
    }

    return {
      type,
      x,
      y,
      scale,
      opacity: LAYER_OPACITIES[layer],
      inkSpreadProgress: 0,
      layer,
    };
  }

  update(dt: number, scrollSpeed: number, progress: number) {
    this.scrollOffset += scrollSpeed * dt;

    for (let layer = 0; layer < 3; layer++) {
      const speed = LAYER_SPEEDS[layer];
      const elements = this.layers[layer];

      for (let i = elements.length - 1; i >= 0; i--) {
        elements[i].x -= scrollSpeed * speed * dt;
        if (elements[i].inkSpreadProgress < 1) {
          elements[i].inkSpreadProgress = Math.min(1, elements[i].inkSpreadProgress + dt * 0.5);
        }
      }

      while (elements.length > 0 && elements[0].x < -400) {
        elements.shift();
      }

      const lastEl = elements[elements.length - 1];
      if (!lastEl || lastEl.x < this.canvasWidth + 200) {
        const newX = lastEl ? lastEl.x + this.getElementSpacing(lastEl.type, layer) : this.canvasWidth + 100;
        const type = this.randomElementType(layer);
        elements.push(this.createElement(type, newX, layer));
      }

      this.needRedraw[layer] = true;
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    this.renderBackground(ctx);

    for (let layer = 0; layer < 3; layer++) {
      if (this.needRedraw[layer]) {
        this.renderLayerToOffscreen(layer);
        this.needRedraw[layer] = false;
      }
      const offsetX = -(this.scrollOffset * LAYER_SPEEDS[layer]) % this.canvasWidth;
      ctx.drawImage(this.offscreenCanvases[layer], offsetX, 0);
      ctx.drawImage(this.offscreenCanvases[layer], offsetX + this.offscreenCanvases[layer].width, 0);
    }
  }

  private renderBackground(ctx: CanvasRenderingContext2D) {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
    gradient.addColorStop(0, '#F5F0E8');
    gradient.addColorStop(0.7, '#EDE6D8');
    gradient.addColorStop(1, '#D8D0C4');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  private renderLayerToOffscreen(layer: number) {
    const octx = this.offscreenCtxs[layer];
    const ow = this.offscreenCanvases[layer].width;
    const oh = this.offscreenCanvases[layer].height;
    octx.clearRect(0, 0, ow, oh);

    for (const el of this.layers[layer]) {
      octx.save();
      octx.globalAlpha = el.opacity * el.inkSpreadProgress;
      octx.translate(el.x, el.y);
      octx.scale(el.scale, el.scale);

      switch (el.type) {
        case 'mountain':
          this.drawMountain(octx, layer);
          break;
        case 'pine':
          this.drawPine(octx, layer);
          break;
        case 'cloud':
          this.drawCloud(octx, layer);
          break;
        case 'waterfall':
          this.drawWaterfall(octx, layer);
          break;
      }

      octx.restore();
    }
  }

  private drawMountain(ctx: CanvasRenderingContext2D, layer: number) {
    ctx.fillStyle = MOUNTAIN_COLORS[layer];
    ctx.beginPath();
    ctx.moveTo(-120, 0);
    ctx.bezierCurveTo(-80, -60, -30, -120, 0, -140);
    ctx.bezierCurveTo(30, -120, 80, -60, 120, 0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = `rgba(44, 44, 44, ${0.2 + layer * 0.1})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-50, -40);
    ctx.bezierCurveTo(-20, -70, 10, -100, 0, -130);
    ctx.stroke();
  }

  private drawPine(ctx: CanvasRenderingContext2D, layer: number) {
    ctx.strokeStyle = PINE_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -60);
    ctx.stroke();

    const branches = [
      { y: -50, w: 25 },
      { y: -40, w: 30 },
      { y: -28, w: 22 },
    ];

    ctx.fillStyle = `rgba(58, 58, 58, ${0.4 + layer * 0.15})`;
    for (const b of branches) {
      ctx.beginPath();
      ctx.moveTo(-b.w, b.y);
      ctx.lineTo(0, b.y - 15);
      ctx.lineTo(b.w, b.y);
      ctx.lineTo(0, b.y + 5);
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawCloud(ctx: CanvasRenderingContext2D, _layer: number) {
    ctx.fillStyle = CLOUD_COLOR;
    ctx.globalAlpha *= 0.4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 60, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-25, -8, 35, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(20, -5, 40, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawWaterfall(ctx: CanvasRenderingContext2D, _layer: number) {
    ctx.strokeStyle = WATERFALL_COLOR;
    ctx.lineWidth = 3;
    ctx.globalAlpha *= 0.6;
    ctx.beginPath();
    ctx.moveTo(-5, -80);
    ctx.bezierCurveTo(-8, -40, -3, 0, -6, 60);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(5, -75);
    ctx.bezierCurveTo(8, -35, 3, 5, 6, 55);
    ctx.stroke();

    ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.beginPath();
    ctx.ellipse(-2, 60, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  resize(canvasWidth: number, canvasHeight: number, groundY: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.groundY = groundY;
    for (let i = 0; i < 3; i++) {
      this.offscreenCanvases[i].width = canvasWidth * 2;
      this.offscreenCanvases[i].height = canvasHeight;
      this.needRedraw[i] = true;
    }
  }
}
