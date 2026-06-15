import * as THREE from 'three';

export enum IngredientType {
  GLOWING_BERRY = 'glowing_berry',
  STARDUST_FLOUR = 'stardust_flour',
  MOONLIGHT_CREAM = 'moonlight_cream',
  COMET_FROSTING = 'comet_frosting'
}

export interface ParticleConfig {
  color: string;
  glowColor: string;
  size: number;
  count: number;
  speed: number;
  spread: number;
}

export interface Ingredient {
  type: IngredientType;
  name: string;
  color: string;
  glowColor: string;
  particleConfig: ParticleConfig;
  tasteContribution: number;
  fluffContribution: number;
  glowContribution: number;
}

export interface DessertProperties {
  sweetness: number;
  fluffiness: number;
  glowIntensity: number;
  ingredients: Record<IngredientType, number>;
  totalIngredients: number;
}

interface BowlParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  angle: number;
  angularSpeed: number;
  radius: number;
}

export const INGREDIENTS: Record<IngredientType, Ingredient> = {
  [IngredientType.GLOWING_BERRY]: {
    type: IngredientType.GLOWING_BERRY,
    name: '发光莓果',
    color: '#FF6B6B',
    glowColor: '#FF4444',
    particleConfig: {
      color: '#FF6B6B',
      glowColor: '#FF4444',
      size: 3,
      count: 15,
      speed: 1.5,
      spread: 40
    },
    tasteContribution: 35,
    fluffContribution: 10,
    glowContribution: 25
  },
  [IngredientType.STARDUST_FLOUR]: {
    type: IngredientType.STARDUST_FLOUR,
    name: '星屑面粉',
    color: '#E8E8E8',
    glowColor: '#FFFFFF',
    particleConfig: {
      color: '#E8E8E8',
      glowColor: '#FFFFFF',
      size: 2,
      count: 20,
      speed: 1,
      spread: 50
    },
    tasteContribution: 10,
    fluffContribution: 40,
    glowContribution: 15
  },
  [IngredientType.MOONLIGHT_CREAM]: {
    type: IngredientType.MOONLIGHT_CREAM,
    name: '月光奶油',
    color: '#C0C0FF',
    glowColor: '#A0A0FF',
    particleConfig: {
      color: '#C0C0FF',
      glowColor: '#A0A0FF',
      size: 4,
      count: 12,
      speed: 0.8,
      spread: 35
    },
    tasteContribution: 20,
    fluffContribution: 35,
    glowContribution: 20
  },
  [IngredientType.COMET_FROSTING]: {
    type: IngredientType.COMET_FROSTING,
    name: '彗星糖霜',
    color: '#9B59B6',
    glowColor: '#8E44AD',
    particleConfig: {
      color: '#9B59B6',
      glowColor: '#8E44AD',
      size: 3,
      count: 18,
      speed: 1.2,
      spread: 45
    },
    tasteContribution: 30,
    fluffContribution: 15,
    glowContribution: 40
  }
};

const INGREDIENT_COLORS: Record<IngredientType, string> = {
  [IngredientType.GLOWING_BERRY]: '#FF6B6B',
  [IngredientType.STARDUST_FLOUR]: '#E8E8E8',
  [IngredientType.MOONLIGHT_CREAM]: '#C0C0FF',
  [IngredientType.COMET_FROSTING]: '#9B59B6'
};

const INGREDIENT_ORDER: IngredientType[] = [
  IngredientType.GLOWING_BERRY,
  IngredientType.STARDUST_FLOUR,
  IngredientType.MOONLIGHT_CREAM,
  IngredientType.COMET_FROSTING
];

export class IngredientSystem {
  private properties: DessertProperties;
  private bowlParticles: BowlParticle[] = [];
  private maxBowlParticles = 150;
  private ingredientCanvases: Map<string, HTMLCanvasElement> = new Map();
  private ingredientCtxs: Map<string, CanvasRenderingContext2D> = new Map();
  private ingredientParticles: Map<string, { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[]> = new Map();
  private bowlCanvas: HTMLCanvasElement | null = null;
  private bowlCtx: CanvasRenderingContext2D | null = null;
  private ratioCanvas: HTMLCanvasElement | null = null;
  private ratioCtx: CanvasRenderingContext2D | null = null;
  private onPropertiesChange: ((props: DessertProperties) => void) | null = null;
  private animationFrameId: number | null = null;

  constructor() {
    this.properties = {
      sweetness: 0,
      fluffiness: 0,
      glowIntensity: 0,
      ingredients: {
        [IngredientType.GLOWING_BERRY]: 0,
        [IngredientType.STARDUST_FLOUR]: 0,
        [IngredientType.MOONLIGHT_CREAM]: 0,
        [IngredientType.COMET_FROSTING]: 0
      },
      totalIngredients: 0
    };
  }

  public init(
    ingredientCanvases: NodeListOf<HTMLCanvasElement>,
    bowlCanvas: HTMLCanvasElement,
    ratioCanvas: HTMLCanvasElement,
    onPropertiesChange: (props: DessertProperties) => void
  ): void {
    this.onPropertiesChange = onPropertiesChange;
    this.bowlCanvas = bowlCanvas;
    this.bowlCtx = bowlCanvas.getContext('2d');
    this.ratioCanvas = ratioCanvas;
    this.ratioCtx = ratioCanvas.getContext('2d');

    this.setupCanvases();
    this.setupIngredientParticles(ingredientCanvases);
    this.setupDragAndDrop();
    this.startAnimation();
  }

  private setupCanvases(): void {
    if (this.bowlCanvas) {
      const rect = this.bowlCanvas.getBoundingClientRect();
      this.bowlCanvas.width = rect.width * window.devicePixelRatio;
      this.bowlCanvas.height = rect.height * window.devicePixelRatio;
      if (this.bowlCtx) {
        this.bowlCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    }
    if (this.ratioCanvas) {
      const rect = this.ratioCanvas.getBoundingClientRect();
      this.ratioCanvas.width = rect.width * window.devicePixelRatio;
      this.ratioCanvas.height = rect.height * window.devicePixelRatio;
      if (this.ratioCtx) {
        this.ratioCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    }
  }

  private setupIngredientParticles(canvases: NodeListOf<HTMLCanvasElement>): void {
    canvases.forEach((canvas, index) => {
      const types = Object.keys(INGREDIENTS);
      const type = types[index] as IngredientType;
      const ingredient = INGREDIENTS[type];
      
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
      
      this.ingredientCanvases.set(type, canvas);
      this.ingredientCtxs.set(type, ctx!);
      
      const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];
      const config = ingredient.particleConfig;
      
      for (let i = 0; i < config.count; i++) {
        particles.push({
          x: Math.random() * rect.width,
          y: Math.random() * rect.height,
          vx: (Math.random() - 0.5) * config.speed,
          vy: (Math.random() - 0.5) * config.speed,
          size: config.size * (0.5 + Math.random() * 0.5),
          alpha: 0.3 + Math.random() * 0.7
        });
      }
      
      this.ingredientParticles.set(type, particles);
    });
  }

  private setupDragAndDrop(): void {
    const ingredientItems = document.querySelectorAll('.ingredient-item');
    const mixingBowl = document.getElementById('mixing-bowl');

    ingredientItems.forEach((item) => {
      item.addEventListener('dragstart', (e) => {
        const type = (item as HTMLElement).dataset.ingredient as IngredientType;
        if (e.dataTransfer) {
          e.dataTransfer.setData('text/plain', type);
          e.dataTransfer.effectAllowed = 'copy';
        }
        item.classList.add('dragging');
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
      });
    });

    if (mixingBowl) {
      mixingBowl.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'copy';
        }
        mixingBowl.classList.add('drag-over');
      });

      mixingBowl.addEventListener('dragleave', () => {
        mixingBowl.classList.remove('drag-over');
      });

      mixingBowl.addEventListener('drop', (e) => {
        e.preventDefault();
        mixingBowl.classList.remove('drag-over');
        
        const type = e.dataTransfer?.getData('text/plain') as IngredientType;
        if (type && INGREDIENTS[type]) {
          this.addIngredient(type);
        }
      });

      mixingBowl.addEventListener('click', () => {
        if (this.properties.totalIngredients > 0) {
          this.spawnSwirlEffect();
        }
      });
    }
  }

  private addIngredient(type: IngredientType): void {
    const ingredient = INGREDIENTS[type];
    this.properties.ingredients[type]++;
    this.properties.totalIngredients++;
    this.calculateProperties();
    this.spawnIngredientParticles(type);
    this.notifyChange();
    this.updateBakeButton();
  }

  private calculateProperties(): void {
    if (this.properties.totalIngredients === 0) {
      this.properties.sweetness = 0;
      this.properties.fluffiness = 0;
      this.properties.glowIntensity = 0;
      return;
    }

    let totalSweetness = 0;
    let totalFluff = 0;
    let totalGlow = 0;

    for (const type of Object.keys(this.properties.ingredients) as IngredientType[]) {
      const count = this.properties.ingredients[type];
      const ingredient = INGREDIENTS[type];
      totalSweetness += count * ingredient.tasteContribution;
      totalFluff += count * ingredient.fluffContribution;
      totalGlow += count * ingredient.glowContribution;
    }

    this.properties.sweetness = Math.min(100, Math.round(totalSweetness / this.properties.totalIngredients));
    this.properties.fluffiness = Math.min(100, Math.round(totalFluff / this.properties.totalIngredients));
    this.properties.glowIntensity = Math.min(100, Math.round(totalGlow / this.properties.totalIngredients));
  }

  private spawnIngredientParticles(type: IngredientType): void {
    if (!this.bowlCanvas || !this.bowlCtx) return;

    const ingredient = INGREDIENTS[type];
    const config = ingredient.particleConfig;
    const width = this.bowlCanvas.width / window.devicePixelRatio;
    const height = this.bowlCanvas.height / window.devicePixelRatio;
    const centerX = width / 2;
    const centerY = height / 2;

    for (let i = 0; i < config.count; i++) {
      if (this.bowlParticles.length >= this.maxBowlParticles) {
        this.bowlParticles.shift();
      }

      const angle = Math.random() * Math.PI * 2;
      const startRadius = Math.random() * 30 + 20;
      
      this.bowlParticles.push({
        x: centerX + Math.cos(angle) * startRadius,
        y: centerY + Math.sin(angle) * startRadius,
        vx: 0,
        vy: 0,
        size: config.size * (0.5 + Math.random() * 0.5),
        color: config.color,
        alpha: 1,
        life: 1,
        maxLife: 3 + Math.random() * 2,
        angle: angle,
        angularSpeed: (Math.random() - 0.5) * 0.05,
        radius: startRadius
      });
    }
  }

  private spawnSwirlEffect(): void {
    if (!this.bowlCanvas || !this.bowlCtx) return;

    const width = this.bowlCanvas.width / window.devicePixelRatio;
    const height = this.bowlCanvas.height / window.devicePixelRatio;
    const centerX = width / 2;
    const centerY = height / 2;

    const types = Object.keys(this.properties.ingredients) as IngredientType[];
    const activeTypes = types.filter(t => this.properties.ingredients[t] > 0);
    
    if (activeTypes.length === 0) return;

    for (let i = 0; i < 30; i++) {
      if (this.bowlParticles.length >= this.maxBowlParticles) {
        this.bowlParticles.shift();
      }

      const type = activeTypes[Math.floor(Math.random() * activeTypes.length)];
      const ingredient = INGREDIENTS[type];
      const angle = Math.random() * Math.PI * 2;
      const startRadius = 10;
      
      this.bowlParticles.push({
        x: centerX,
        y: centerY,
        vx: 0,
        vy: 0,
        size: 4 * (0.5 + Math.random() * 0.5),
        color: ingredient.particleConfig.color,
        alpha: 1,
        life: 1,
        maxLife: 2 + Math.random() * 1,
        angle: angle,
        angularSpeed: 0.1 + Math.random() * 0.05,
        radius: startRadius
      });
    }
  }

  private notifyChange(): void {
    if (this.onPropertiesChange) {
      this.onPropertiesChange({ ...this.properties });
    }
  }

  private updateBakeButton(): void {
    const bakeButton = document.getElementById('bake-button') as HTMLButtonElement;
    if (bakeButton) {
      bakeButton.disabled = this.properties.totalIngredients === 0;
    }
  }

  private startAnimation(): void {
    const animate = () => {
      this.updateIngredientParticles();
      this.updateBowlParticles();
      this.drawRatioRing();
      this.animationFrameId = requestAnimationFrame(animate);
    };
    animate();
  }

  private updateIngredientParticles(): void {
    this.ingredientCanvases.forEach((canvas, type) => {
      const ctx = this.ingredientCtxs.get(type);
      const particles = this.ingredientParticles.get(type);
      const ingredient = INGREDIENTS[type as IngredientType];
      
      if (!ctx || !particles) return;

      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;

      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
        gradient.addColorStop(0, ingredient.particleConfig.glowColor + Math.floor(p.alpha * 200).toString(16).padStart(2, '0'));
        gradient.addColorStop(0.5, ingredient.particleConfig.color + Math.floor(p.alpha * 150).toString(16).padStart(2, '0'));
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }

  private updateBowlParticles(): void {
    if (!this.bowlCanvas || !this.bowlCtx) return;

    const width = this.bowlCanvas.width / window.devicePixelRatio;
    const height = this.bowlCanvas.height / window.devicePixelRatio;
    const centerX = width / 2;
    const centerY = height / 2;

    this.bowlCtx.clearRect(0, 0, width, height);

    this.bowlParticles = this.bowlParticles.filter((p) => {
      p.angle += p.angularSpeed;
      p.radius += 0.5;
      p.life -= 1 / (p.maxLife * 60);
      p.alpha = Math.max(0, p.life);

      p.x = centerX + Math.cos(p.angle) * p.radius;
      p.y = centerY + Math.sin(p.angle) * p.radius * 0.8;

      if (p.life <= 0) return false;

      const gradient = this.bowlCtx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
      gradient.addColorStop(0, p.color + Math.floor(p.alpha * 255).toString(16).padStart(2, '0'));
      gradient.addColorStop(0.5, p.color + Math.floor(p.alpha * 180).toString(16).padStart(2, '0'));
      gradient.addColorStop(1, 'transparent');

      this.bowlCtx!.fillStyle = gradient;
      this.bowlCtx!.beginPath();
      this.bowlCtx!.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      this.bowlCtx!.fill();

      return true;
    });

    if (this.properties.totalIngredients > 0) {
      this.drawMixingVortex(centerX, centerY);
    }
  }

  private drawMixingVortex(centerX: number, centerY: number): void {
    if (!this.bowlCtx) return;

    const types = Object.keys(this.properties.ingredients) as IngredientType[];
    const activeTypes = types.filter(t => this.properties.ingredients[t] > 0);
    
    if (activeTypes.length === 0) return;

    const time = Date.now() * 0.001;
    
    for (let ring = 0; ring < 3; ring++) {
      const type = activeTypes[ring % activeTypes.length];
      const color = INGREDIENT_COLORS[type];
      const radius = 40 + ring * 25 + Math.sin(time * 2 + ring) * 5;
      
      this.bowlCtx.strokeStyle = color + '60';
      this.bowlCtx.lineWidth = 8 - ring * 2;
      this.bowlCtx.beginPath();
      
      for (let i = 0; i <= 360; i += 10) {
        const angle = (i * Math.PI) / 180 + time * (1 + ring * 0.3);
        const wobble = Math.sin(angle * 3 + time) * 5;
        const x = centerX + Math.cos(angle) * (radius + wobble);
        const y = centerY + Math.sin(angle) * (radius + wobble) * 0.8;
        
        if (i === 0) {
          this.bowlCtx.moveTo(x, y);
        } else {
          this.bowlCtx.lineTo(x, y);
        }
      }
      
      this.bowlCtx.closePath();
      this.bowlCtx.stroke();
    }
  }

  private drawRatioRing(): void {
    if (!this.ratioCanvas || !this.ratioCtx) return;

    const width = this.ratioCanvas.width / window.devicePixelRatio;
    const height = this.ratioCanvas.height / window.devicePixelRatio;
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = Math.min(width, height) / 2 - 4;
    const innerRadius = outerRadius - 8;

    this.ratioCtx.clearRect(0, 0, width, height);

    this.ratioCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ratioCtx.beginPath();
    this.ratioCtx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
    this.ratioCtx.fill();

    if (this.properties.totalIngredients === 0) {
      this.ratioCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      this.ratioCtx.lineWidth = 6;
      this.ratioCtx.beginPath();
      this.ratioCtx.arc(centerX, centerY, (outerRadius + innerRadius) / 2, 0, Math.PI * 2);
      this.ratioCtx.stroke();
      return;
    }

    let startAngle = -Math.PI / 2;

    INGREDIENT_ORDER.forEach((type) => {
      const count = this.properties.ingredients[type];
      if (count === 0) return;

      const ratio = count / this.properties.totalIngredients;
      const endAngle = startAngle + ratio * Math.PI * 2;
      const color = INGREDIENT_COLORS[type];

      this.ratioCtx.fillStyle = color;
      this.ratioCtx.strokeStyle = color;
      this.ratioCtx.lineWidth = 1;
      
      this.ratioCtx.beginPath();
      this.ratioCtx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
      this.ratioCtx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      this.ratioCtx.closePath();
      this.ratioCtx.fill();

      const glowGradient = this.ratioCtx.createRadialGradient(
        centerX, centerY, innerRadius,
        centerX, centerY, outerRadius + 5
      );
      glowGradient.addColorStop(0, 'transparent');
      glowGradient.addColorStop(0.5, color + '40');
      glowGradient.addColorStop(1, 'transparent');

      this.ratioCtx.strokeStyle = glowGradient;
      this.ratioCtx.lineWidth = 4;
      this.ratioCtx.beginPath();
      this.ratioCtx.arc(centerX, centerY, (outerRadius + innerRadius) / 2, startAngle, endAngle);
      this.ratioCtx.stroke();

      startAngle = endAngle;
    });
  }

  public getProperties(): DessertProperties {
    return { ...this.properties };
  }

  public getMixedColor(): THREE.Color {
    if (this.properties.totalIngredients === 0) {
      return new THREE.Color(0xcccccc);
    }

    let r = 0, g = 0, b = 0;
    
    for (const type of INGREDIENT_ORDER) {
      const count = this.properties.ingredients[type];
      if (count === 0) continue;
      
      const color = new THREE.Color(INGREDIENT_COLORS[type]);
      const weight = count / this.properties.totalIngredients;
      r += color.r * weight;
      g += color.g * weight;
      b += color.b * weight;
    }

    return new THREE.Color(r, g, b);
  }

  public reset(): void {
    this.properties = {
      sweetness: 0,
      fluffiness: 0,
      glowIntensity: 0,
      ingredients: {
        [IngredientType.GLOWING_BERRY]: 0,
        [IngredientType.STARDUST_FLOUR]: 0,
        [IngredientType.MOONLIGHT_CREAM]: 0,
        [IngredientType.COMET_FROSTING]: 0
      },
      totalIngredients: 0
    };
    this.bowlParticles = [];
    this.notifyChange();
    this.updateBakeButton();
  }

  public destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
