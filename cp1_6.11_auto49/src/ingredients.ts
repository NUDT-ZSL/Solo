import * as THREE from 'three';

export interface Ingredient {
  id: string;
  name: string;
  color: string;
  particleColor: string;
  sweetness: number;
  fluffiness: number;
  glow: number;
  icon: string;
}

export interface IngredientParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface MixParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  angle: number;
  distance: number;
  speed: number;
}

export const ingredients: Record<string, Ingredient> = {
  berry: {
    id: 'berry',
    name: '发光莓果',
    color: '#FF6B6B',
    particleColor: 'rgba(255, 107, 107, 0.9)',
    sweetness: 3,
    fluffiness: 1,
    glow: 2,
    icon: '🍓'
  },
  flour: {
    id: 'flour',
    name: '星屑面粉',
    color: '#FFE66D',
    particleColor: 'rgba(255, 230, 109, 0.9)',
    sweetness: 1,
    fluffiness: 3,
    glow: 1,
    icon: '✨'
  },
  cream: {
    id: 'cream',
    name: '月光奶油',
    color: '#C9B8FF',
    particleColor: 'rgba(201, 184, 255, 0.9)',
    sweetness: 2,
    fluffiness: 2,
    glow: 2,
    icon: '🌙'
  },
  sugar: {
    id: 'sugar',
    name: '彗星糖霜',
    color: '#7DD3FC',
    particleColor: 'rgba(125, 211, 252, 0.9)',
    sweetness: 3,
    fluffiness: 1,
    glow: 3,
    icon: '💫'
  }
};

export class IngredientsSystem {
  private ingredientParticles: Map<string, IngredientParticle[]> = new Map();
  private mixParticles: MixParticle[] = [];
  private ingredientCanvases: Map<string, HTMLCanvasElement> = new Map();
  private mixingCanvas: HTMLCanvasElement | null = null;
  private mixCtx: CanvasRenderingContext2D | null = null;
  private bowlCenterX: number = 0;
  private bowlCenterY: number = 0;
  private bowlRadius: number = 0;
  private mixAmounts: Record<string, number> = {
    berry: 0,
    flour: 0,
    cream: 0,
    sugar: 0
  };
  private animationId: number = 0;
  private onMixChangeCallback: ((amounts: Record<string, number>) => void) | null = null;
  private isDragging: boolean = false;
  private dragIngredient: string | null = null;
  private dragGhost: HTMLElement | null = null;
  private bowlHover: boolean = false;

  constructor() {}

  setOnMixChange(callback: (amounts: Record<string, number>) => void) {
    this.onMixChangeCallback = callback;
  }

  getMixAmounts(): Record<string, number> {
    return { ...this.mixAmounts };
  }

  getTotalAmount(): number {
    return Object.values(this.mixAmounts).reduce((a, b) => a + b, 0);
  }

  init() {
    this.initIngredientParticles();
    this.initMixingCanvas();
    this.initDragAndDrop();
    this.animate();
  }

  private initIngredientParticles() {
    const items = document.querySelectorAll<HTMLDivElement>('.ingredient-item');
    items.forEach((item) => {
      const id = item.getAttribute('data-ingredient');
      if (!id) return;
      const canvas = item.querySelector<HTMLCanvasElement>('.ingredient-particles');
      if (!canvas) return;
      this.ingredientCanvases.set(id, canvas);
      this.ingredientParticles.set(id, []);
      this.resizeIngredientCanvas(id);
      this.spawnInitialParticles(id);
    });

    window.addEventListener('resize', () => {
      this.ingredientCanvases.forEach((_, id) => {
        this.resizeIngredientCanvas(id);
      });
    });
  }

  private resizeIngredientCanvas(id: string) {
    const canvas = this.ingredientCanvases.get(id);
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }

  private spawnInitialParticles(id: string) {
    const particles = this.ingredientParticles.get(id);
    const canvas = this.ingredientCanvases.get(id);
    const ingredient = ingredients[id];
    if (!particles || !canvas || !ingredient) return;

    const count = 20;
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
    for (let i = 0; i < count; i++) {
      particles.push(this.createIngredientParticle(id, width, height));
    }
  }

  private createIngredientParticle(id: string, width: number, height: number): IngredientParticle {
    const ingredient = ingredients[id];
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 1,
      vy: -0.3 - Math.random() * 0.8,
      size: Math.random() * 3 + 1.5,
      life: Math.random() * 100 + 50,
      maxLife: 150,
      color: ingredient.particleColor
    };
  }

  private initMixingCanvas() {
    this.mixingCanvas = document.getElementById('mixingCanvas') as HTMLCanvasElement;
    if (!this.mixingCanvas) return;
    this.mixCtx = this.mixingCanvas.getContext('2d');
    this.resizeMixingCanvas();
    window.addEventListener('resize', () => this.resizeMixingCanvas());
  }

  private resizeMixingCanvas() {
    if (!this.mixingCanvas) return;
    const rect = this.mixingCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.mixingCanvas.width = rect.width * dpr;
    this.mixingCanvas.height = rect.height * dpr;
    if (this.mixCtx) {
      this.mixCtx.scale(dpr, dpr);
    }
    this.bowlCenterX = rect.width / 2;
    this.bowlCenterY = rect.height / 2;
    this.bowlRadius = Math.min(rect.width, rect.height) * 0.35;
  }

  private initDragAndDrop() {
    const items = document.querySelectorAll<HTMLDivElement>('.ingredient-item');
    const bowlContainer = document.querySelector<HTMLDivElement>('.mixing-bowl-container');

    items.forEach((item) => {
      const id = item.getAttribute('data-ingredient');
      if (!id) return;

      item.setAttribute('draggable', 'true');

      item.addEventListener('dragstart', (e) => {
        this.isDragging = true;
        this.dragIngredient = id;
        item.classList.add('dragging');

        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'copy';
          e.dataTransfer.setData('text/plain', id);

          try {
            const ghost = item.cloneNode(true) as HTMLElement;
            ghost.style.position = 'absolute';
            ghost.style.top = '-1000px';
            ghost.style.opacity = '0.8';
            ghost.style.transform = 'scale(0.8)';
            ghost.style.pointerEvents = 'none';
            document.body.appendChild(ghost);
            e.dataTransfer.setDragImage(ghost, 50, 50);
            setTimeout(() => document.body.removeChild(ghost), 0);
          } catch (_) {
          }
        }
      });

      item.addEventListener('dragend', () => {
        this.isDragging = false;
        this.dragIngredient = null;
        item.classList.remove('dragging');
        this.removeDragGhost();
        if (bowlContainer) {
          bowlContainer.classList.remove('drag-over');
        }
        this.bowlHover = false;
      });

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const ingredientId = item.getAttribute('data-ingredient');
        if (ingredientId) {
          this.addIngredient(ingredientId);
        }
      });
    });

    if (bowlContainer) {
      bowlContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'copy';
        }
        if (!this.bowlHover) {
          this.bowlHover = true;
          bowlContainer.classList.add('drag-over');
        }
      });

      bowlContainer.addEventListener('dragenter', (e) => {
        e.preventDefault();
        this.bowlHover = true;
        bowlContainer.classList.add('drag-over');
      });

      bowlContainer.addEventListener('dragleave', (e) => {
        e.preventDefault();
        const rect = bowlContainer.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
          this.bowlHover = false;
          bowlContainer.classList.remove('drag-over');
        }
      });

      bowlContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.bowlHover = false;
        bowlContainer.classList.remove('drag-over');

        let id = '';
        if (e.dataTransfer) {
          id = e.dataTransfer.getData('text/plain');
        }
        if (!id) {
          id = this.dragIngredient || '';
        }

        if (id && ingredients[id]) {
          this.addIngredient(id);
        }
      });
    }
  }

  private removeDragGhost() {
    if (this.dragGhost) {
      this.dragGhost.remove();
      this.dragGhost = null;
    }
  }

  addIngredient(id: string) {
    if (!ingredients[id]) return false;
    if (this.getTotalAmount() >= 20) return false;

    this.mixAmounts[id] += 1;
    this.spawnMixParticles(id, 15);
    this.updateRingProgress();
    this.notifyMixChange();
    return true;
  }

  reset() {
    this.mixAmounts = {
      berry: 0,
      flour: 0,
      cream: 0,
      sugar: 0
    };
    this.mixParticles = [];
    this.updateRingProgress();
    this.notifyMixChange();
  }

  private spawnMixParticles(id: string, count: number) {
    const ingredient = ingredients[id];
    if (!ingredient) return;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = this.bowlRadius * (0.2 + Math.random() * 0.6);
      this.mixParticles.push({
        x: this.bowlCenterX + Math.cos(angle) * distance,
        y: this.bowlCenterY + Math.sin(angle) * distance,
        vx: 0,
        vy: 0,
        size: Math.random() * 5 + 2,
        color: ingredient.particleColor,
        life: 180,
        maxLife: 180,
        angle: angle,
        distance: distance,
        speed: 0.015 + Math.random() * 0.025
      });
    }

    if (this.mixParticles.length > 200) {
      this.mixParticles = this.mixParticles.slice(-200);
    }
  }

  private updateRingProgress() {
    const total = this.getTotalAmount();
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    let currentOffset = 0;

    const ids: Array<keyof typeof ingredients> = ['berry', 'flour', 'cream', 'sugar'];
    ids.forEach((id) => {
      const ring = document.getElementById(`ring-${id}`);
      if (!ring) return;
      const amount = this.mixAmounts[id];
      const ratio = total > 0 ? amount / total : 0;
      const dashLength = ratio * circumference;
      ring.setAttribute('r', String(radius));
      ring.setAttribute('stroke-dasharray', `${dashLength} ${circumference}`);
      ring.setAttribute('stroke-dashoffset', `${-currentOffset}`);
      ring.style.transition = 'stroke-dasharray 0.3s ease, stroke-dashoffset 0.3s ease';
      currentOffset += dashLength;
    });
  }

  private notifyMixChange() {
    if (this.onMixChangeCallback) {
      this.onMixChangeCallback({ ...this.mixAmounts });
    }
  }

  private animate = () => {
    this.updateIngredientParticles();
    this.updateMixParticles();
    this.drawMixingBowl();
    this.animationId = requestAnimationFrame(this.animate);
  };

  private updateIngredientParticles() {
    this.ingredientCanvases.forEach((canvas, id) => {
      const ctx = canvas.getContext('2d');
      const particles = this.ingredientParticles.get(id);
      if (!ctx || !particles) return;

      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      ctx.clearRect(0, 0, width, height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;

        if (p.life <= 0 || p.y < -10 || p.y > height + 10 || p.x < -10 || p.x > width + 10) {
          particles[i] = this.createIngredientParticle(id, width, height);
          continue;
        }

        const alpha = Math.min(1, p.life / 60);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace(/[\d.]+\)$/, `${alpha})`);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.5);
        gradient.addColorStop(0, p.color.replace(/[\d.]+\)$/, `${alpha * 0.4})`));
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    });
  }

  private updateMixParticles() {
    for (let i = this.mixParticles.length - 1; i >= 0; i--) {
      const p = this.mixParticles[i];
      p.angle += p.speed;
      p.distance += (this.bowlRadius * 0.55 - p.distance) * 0.02;
      p.x = this.bowlCenterX + Math.cos(p.angle) * p.distance;
      p.y = this.bowlCenterY + Math.sin(p.angle) * p.distance * 0.6;
      p.life--;

      if (p.life <= 0) {
        this.mixParticles.splice(i, 1);
      }
    }
  }

  private drawMixingBowl() {
    if (!this.mixCtx || !this.mixingCanvas) return;
    const ctx = this.mixCtx;
    const width = this.mixingCanvas.width / (window.devicePixelRatio || 1);
    const height = this.mixingCanvas.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, width, height);

    const total = this.getTotalAmount();
    if (total > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(this.bowlCenterX, this.bowlCenterY, this.bowlRadius * 0.82, this.bowlRadius * 0.52, 0, 0, Math.PI * 2);
      ctx.clip();

      const ids: Array<keyof typeof ingredients> = ['berry', 'flour', 'cream', 'sugar'];
      const colors = ids.map((id) => ingredients[id].color);

      const gradient = ctx.createConicGradient
        ? ctx.createConicGradient(Date.now() * 0.001, this.bowlCenterX, this.bowlCenterY)
        : ctx.createLinearGradient(0, 0, width, height);

      if ('createConicGradient' in CanvasRenderingContext2D.prototype) {
        let offset = 0;
        ids.forEach((id, i) => {
          const ratio = this.mixAmounts[id] / Math.max(1, total);
          (gradient as CanvasGradient).addColorStop(offset, colors[i]);
          offset += ratio;
          (gradient as CanvasGradient).addColorStop(Math.min(1, offset), colors[i]);
        });
      } else {
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(0.33, colors[1]);
        gradient.addColorStop(0.66, colors[2]);
        gradient.addColorStop(1, colors[3]);
      }

      ctx.fillStyle = gradient;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(
        this.bowlCenterX - this.bowlRadius * 1.2,
        this.bowlCenterY - this.bowlRadius * 1.2,
        this.bowlRadius * 2.4,
        this.bowlRadius * 2.4
      );
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    this.mixParticles.forEach((p) => {
      const alpha = Math.min(1, p.life / p.maxLife);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color.replace(/[\d.]+\)$/, `${alpha})`);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
      const glowGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
      glowGradient.addColorStop(0, p.color.replace(/[\d.]+\)$/, `${alpha * 0.5})`));
      glowGradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glowGradient;
      ctx.fill();
    });

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(this.bowlCenterX, this.bowlCenterY, this.bowlRadius, this.bowlRadius * 0.65, 0, 0, Math.PI * 2);
    ctx.strokeStyle = this.bowlHover ? 'rgba(159, 122, 234, 0.8)' : 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = this.bowlHover ? 4 : 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(this.bowlCenterX, this.bowlCenterY + this.bowlRadius * 0.1, this.bowlRadius * 0.92, this.bowlRadius * 0.58, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  destroy() {
    cancelAnimationFrame(this.animationId);
  }
}

export function mixColor(colors: string[], ratios: number[]): string {
  let r = 0, g = 0, b = 0;
  const total = ratios.reduce((a, b) => a + b, 0);
  if (total === 0) return '#888888';

  colors.forEach((color, i) => {
    const c = new THREE.Color(color);
    r += c.r * ratios[i];
    g += c.g * ratios[i];
    b += c.b * ratios[i];
  });

  const result = new THREE.Color(r / total, g / total, b / total);
  return `#${result.getHexString()}`;
}
