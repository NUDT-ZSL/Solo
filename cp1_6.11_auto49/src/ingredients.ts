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
    particleColor: 'rgba(255, 107, 107, 0.8)',
    sweetness: 3,
    fluffiness: 1,
    glow: 2,
    icon: '🍓'
  },
  flour: {
    id: 'flour',
    name: '星屑面粉',
    color: '#FFE66D',
    particleColor: 'rgba(255, 230, 109, 0.8)',
    sweetness: 1,
    fluffiness: 3,
    glow: 1,
    icon: '✨'
  },
  cream: {
    id: 'cream',
    name: '月光奶油',
    color: '#C9B8FF',
    particleColor: 'rgba(201, 184, 255, 0.8)',
    sweetness: 2,
    fluffiness: 2,
    glow: 2,
    icon: '🌙'
  },
  sugar: {
    id: 'sugar',
    name: '彗星糖霜',
    color: '#7DD3FC',
    particleColor: 'rgba(125, 211, 252, 0.8)',
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
  private dragIngredient: string | null = null;

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
    const items = document.querySelectorAll('.ingredient-item');
    items.forEach((item) => {
      const id = item.getAttribute('data-ingredient');
      if (!id) return;
      const canvas = item.querySelector('.ingredient-particles') as HTMLCanvasElement;
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

    const count = 15;
    for (let i = 0; i < count; i++) {
      particles.push(this.createIngredientParticle(id, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1)));
    }
  }

  private createIngredientParticle(id: string, width: number, height: number): IngredientParticle {
    const ingredient = ingredients[id];
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8 - 0.3,
      size: Math.random() * 3 + 1,
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
    this.bowlRadius = Math.min(rect.width, rect.height) * 0.32;
  }

  private initDragAndDrop() {
    const items = document.querySelectorAll('.ingredient-item');
    const bowlContainer = document.querySelector('.mixing-bowl-container');

    items.forEach((item) => {
      const id = item.getAttribute('data-ingredient');
      if (!id) return;

      item.addEventListener('dragstart', (e) => {
        this.dragIngredient = id;
        item.classList.add('dragging');
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'copy';
          e.dataTransfer.setData('text/plain', id);
        }
      });

      item.addEventListener('dragend', () => {
        this.dragIngredient = null;
        item.classList.remove('dragging');
      });
    });

    if (bowlContainer) {
      bowlContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'copy';
        }
      });

      bowlContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        const id = e.dataTransfer?.getData('text/plain') || this.dragIngredient;
        if (id && ingredients[id]) {
          this.addIngredient(id);
        }
      });

      bowlContainer.addEventListener('click', () => {
        if (this.dragIngredient) {
          this.addIngredient(this.dragIngredient);
        }
      });
    }

    items.forEach((item) => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-ingredient');
        if (id && ingredients[id]) {
          this.addIngredient(id);
        }
      });
    });
  }

  addIngredient(id: string) {
    if (!ingredients[id]) return;
    if (this.getTotalAmount() >= 20) return;

    this.mixAmounts[id] += 1;
    this.spawnMixParticles(id, 12);
    this.updateRingProgress();
    this.notifyMixChange();
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
      const distance = this.bowlRadius * (0.3 + Math.random() * 0.5);
      this.mixParticles.push({
        x: this.bowlCenterX + Math.cos(angle) * distance,
        y: this.bowlCenterY + Math.sin(angle) * distance,
        vx: 0,
        vy: 0,
        size: Math.random() * 4 + 2,
        color: ingredient.particleColor,
        life: 120,
        maxLife: 120,
        angle: angle,
        distance: distance,
        speed: 0.02 + Math.random() * 0.03
      });
    }

    if (this.mixParticles.length > 200) {
      this.mixParticles = this.mixParticles.slice(-200);
    }
  }

  private updateRingProgress() {
    const total = this.getTotalAmount();
    const circumference = 2 * Math.PI * 90;
    let offset = 0;

    const ids = ['berry', 'flour', 'cream', 'sugar'];
    ids.forEach((id) => {
      const ring = document.getElementById(`ring-${id}`) as SVGPathElement | null;
      if (!ring) return;
      const amount = this.mixAmounts[id];
      const ratio = total > 0 ? amount / total : 0;
      const dashLength = ratio * circumference;
      ring.setAttribute('stroke-dasharray', `${dashLength} ${circumference}`);
      ring.setAttribute('stroke-dashoffset', `${-offset}`);
      offset += dashLength;
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

        const alpha = Math.min(1, p.life / 50);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace(/[\d.]+\)$/, `${alpha})`);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
        gradient.addColorStop(0, p.color.replace(/[\d.]+\)$/, `${alpha * 0.3})`));
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
      p.distance += (this.bowlRadius * 0.6 - p.distance) * 0.02;
      p.x = this.bowlCenterX + Math.cos(p.angle) * p.distance;
      p.y = this.bowlCenterY + Math.sin(p.angle) * p.distance * 0.7;
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
      ctx.ellipse(this.bowlCenterX, this.bowlCenterY, this.bowlRadius * 0.85, this.bowlRadius * 0.55, 0, 0, Math.PI * 2);
      ctx.clip();

      const ids = ['berry', 'flour', 'cream', 'sugar'];
      const colors = ids.map((id) => ingredients[id].color);
      const ratios = ids.map((id) => this.mixAmounts[id] / Math.max(1, total));

      const gradient = ctx.createConicGradient
        ? ctx.createConicGradient(0, this.bowlCenterX, this.bowlCenterY)
        : ctx.createLinearGradient(0, 0, width, height);

      if ('createConicGradient' in CanvasRenderingContext2D.prototype) {
        let offset = 0;
        ids.forEach((id, i) => {
          (gradient as ConicGradient).addColorStop(offset, colors[i]);
          offset += ratios[i];
          (gradient as ConicGradient).addColorStop(Math.min(1, offset), colors[i]);
        });
      } else {
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(0.33, colors[1]);
        gradient.addColorStop(0.66, colors[2]);
        gradient.addColorStop(1, colors[3]);
      }

      ctx.fillStyle = gradient;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(this.bowlCenterX - this.bowlRadius, this.bowlCenterY - this.bowlRadius, this.bowlRadius * 2, this.bowlRadius * 2);
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
      ctx.arc(p.x, p.y, p.size * 1.8, 0, Math.PI * 2);
      const glowGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 1.8);
      glowGradient.addColorStop(0, p.color.replace(/[\d.]+\)$/, `${alpha * 0.4})`));
      glowGradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glowGradient;
      ctx.fill();
    });

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(this.bowlCenterX, this.bowlCenterY, this.bowlRadius, this.bowlRadius * 0.65, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 3;
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
