import { Feather } from './feather';

type PatternType = 'heart' | 'spiral' | 'circle' | 'random';

export class Flock {
  feathers: Feather[];
  count: number;
  canvasWidth: number;
  canvasHeight: number;
  mouseX: number | null;
  mouseY: number;
  prevMouseX: number | null;
  prevMouseY: number | null;
  mouseVx: number;
  mouseVy: number;
  isDragging: boolean;
  dragEndTime: number;
  patternMode: PatternType;
  patternCenterX: number;
  patternCenterY: number;
  patternTime: number;
  inPattern: boolean;

  constructor(count: number, canvasWidth: number, canvasHeight: number) {
    this.count = count;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.feathers = [];
    this.mouseX = null;
    this.mouseY = 0;
    this.prevMouseX = null;
    this.prevMouseY = null;
    this.mouseVx = 0;
    this.mouseVy = 0;
    this.isDragging = false;
    this.dragEndTime = 0;
    this.patternMode = 'random';
    this.patternCenterX = canvasWidth / 2;
    this.patternCenterY = canvasHeight / 2;
    this.patternTime = 0;
    this.inPattern = false;
    this.initFeathers();
  }

  initFeathers() {
    this.feathers = [];
    for (let i = 0; i < this.count; i++) {
      this.feathers.push(new Feather(this.canvasWidth, this.canvasHeight));
    }
  }

  setCount(count: number) {
    const diff = count - this.feathers.length;
    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        this.feathers.push(new Feather(this.canvasWidth, this.canvasHeight));
      }
    } else if (diff < 0) {
      this.feathers.splice(0, -diff);
    }
    this.count = count;
  }

  resize(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  onMouseMove(x: number, y: number) {
    if (this.prevMouseX !== null && this.prevMouseY !== null) {
      this.mouseVx = x - this.prevMouseX;
      this.mouseVy = y - this.prevMouseY;
    }
    this.prevMouseX = this.mouseX;
    this.prevMouseY = this.mouseY;
    this.mouseX = x;
    this.mouseY = y;
  }

  onMouseDown(x: number, y: number) {
    this.isDragging = true;
    this.mouseX = x;
    this.mouseY = y;
    this.clearPattern();
  }

  onMouseUp(x: number, y: number) {
    this.isDragging = false;
    this.dragEndTime = performance.now();
  }

  onMouseLeave() {
    this.isDragging = false;
    this.mouseX = null;
    this.prevMouseX = null;
    this.prevMouseY = null;
    this.dragEndTime = performance.now();
  }

  onClick(x: number, y: number): { burstX: number; burstY: number } {
    this.patternCenterX = x;
    this.patternCenterY = y;
    this.patternTime = performance.now();
    this.inPattern = true;

    const patterns: PatternType[] = ['heart', 'spiral', 'circle'];
    this.patternMode = patterns[Math.floor(Math.random() * patterns.length)];

    for (const feather of this.feathers) {
      feather.scatter(x, y, 8);
    }

    this.applyPattern();

    return { burstX: x, burstY: y };
  }

  private applyPattern() {
    const cx = this.patternCenterX;
    const cy = this.patternCenterY;
    const n = this.feathers.length;

    setTimeout(() => {
      for (let i = 0; i < n; i++) {
        const feather = this.feathers[i];
        let tx: number, ty: number;
        const t = i / n;

        switch (this.patternMode) {
          case 'heart': {
            const a = t * Math.PI * 2;
            const scale = Math.min(this.canvasWidth, this.canvasHeight) * 0.18;
            const hx = 16 * Math.pow(Math.sin(a), 3);
            const hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
            tx = cx + hx * scale / 16;
            ty = cy + hy * scale / 16;
            break;
          }
          case 'spiral': {
            const turns = 3.5;
            const maxRadius = Math.min(this.canvasWidth, this.canvasHeight) * 0.35;
            const a = t * Math.PI * 2 * turns;
            const r = t * maxRadius;
            tx = cx + Math.cos(a) * r;
            ty = cy + Math.sin(a) * r;
            break;
          }
          case 'circle':
          default: {
            const a = t * Math.PI * 2;
            const r = Math.min(this.canvasWidth, this.canvasHeight) * 0.3;
            tx = cx + Math.cos(a) * r;
            ty = cy + Math.sin(a) * r;
            break;
          }
        }

        tx += (Math.random() - 0.5) * 20;
        ty += (Math.random() - 0.5) * 20;
        feather.setTarget(tx, ty);
      }
    }, 600);

    setTimeout(() => {
      this.clearPattern();
    }, 6000);
  }

  clearPattern() {
    this.inPattern = false;
    for (const feather of this.feathers) {
      feather.setTarget(null, null);
    }
  }

  resetArrangement() {
    for (const feather of this.feathers) {
      feather.x = Math.random() * this.canvasWidth;
      feather.y = Math.random() * this.canvasHeight;
      feather.vx = (Math.random() - 0.5) * 2;
      feather.vy = (Math.random() - 0.5) * 2;
      feather.setTarget(null, null);
    }
    this.clearPattern();
  }

  update(speedMultiplier: number, time: number) {
    for (const feather of this.feathers) {
      feather.update(
        speedMultiplier,
        this.mouseX,
        this.mouseY,
        this.isDragging,
        this.mouseVx,
        this.mouseVy,
        this.canvasWidth,
        this.canvasHeight,
        time
      );
    }

    this.applyFlockingRules();

    this.mouseVx *= 0.9;
    this.mouseVy *= 0.9;
  }

  private applyFlockingRules() {
    const separationDist = 35;
    const alignmentDist = 70;
    const cohesionDist = 100;
    const maxForce = 0.15;

    for (let i = 0; i < this.feathers.length; i++) {
      const f1 = this.feathers[i];
      let sepX = 0, sepY = 0, sepCount = 0;
      let aliVx = 0, aliVy = 0, aliCount = 0;
      let cohX = 0, cohY = 0, cohCount = 0;

      for (let j = 0; j < this.feathers.length; j++) {
        if (i === j) continue;
        const f2 = this.feathers[j];
        const dx = f2.x - f1.x;
        const dy = f2.y - f1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < separationDist && dist > 0) {
          sepX -= dx / dist / dist;
          sepY -= dy / dist / dist;
          sepCount++;
        }
        if (dist < alignmentDist) {
          aliVx += f2.vx;
          aliVy += f2.vy;
          aliCount++;
        }
        if (dist < cohesionDist) {
          cohX += f2.x;
          cohY += f2.y;
          cohCount++;
        }
      }

      if (sepCount > 0) {
        sepX /= sepCount;
        sepY /= sepCount;
        const sepMag = Math.sqrt(sepX * sepX + sepY * sepY);
        if (sepMag > 0) {
          sepX = (sepX / sepMag) * maxForce * 1.8;
          sepY = (sepY / sepMag) * maxForce * 1.8;
        }
        f1.vx += sepX;
        f1.vy += sepY;
      }

      if (aliCount > 0) {
        aliVx /= aliCount;
        aliVy /= aliCount;
        const aliMag = Math.sqrt(aliVx * aliVx + aliVy * aliVy);
        if (aliMag > 0) {
          aliVx = (aliVx / aliMag) * maxForce * 0.8;
          aliVy = (aliVy / aliMag) * maxForce * 0.8;
        }
        f1.vx += aliVx;
        f1.vy += aliVy;
      }

      if (cohCount > 0) {
        cohX = cohX / cohCount - f1.x;
        cohY = cohY / cohCount - f1.y;
        const cohMag = Math.sqrt(cohX * cohX + cohY * cohY);
        if (cohMag > 0) {
          cohX = (cohX / cohMag) * maxForce * 0.5;
          cohY = (cohY / cohMag) * maxForce * 0.5;
        }
        f1.vx += cohX;
        f1.vy += cohY;
      }
    }
  }

  getConnections(): { x1: number; y1: number; x2: number; y2: number; alpha: number }[] {
    const connections: { x1: number; y1: number; x2: number; y2: number; alpha: number }[] = [];
    const maxDist = 90;
    const step = Math.max(1, Math.floor(this.feathers.length / 120));

    for (let i = 0; i < this.feathers.length; i += step) {
      for (let j = i + step; j < this.feathers.length; j += step) {
        const f1 = this.feathers[i];
        const f2 = this.feathers[j];
        const dx = f2.x - f1.x;
        const dy = f2.y - f1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.35 * (0.6 + 0.4 * Math.sin(performance.now() * 0.003 + i * 0.1));
          connections.push({ x1: f1.x, y1: f1.y, x2: f2.x, y2: f2.y, alpha });
        }
      }
    }
    return connections;
  }
}
