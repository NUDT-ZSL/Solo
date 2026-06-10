export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type: 'stardust' | 'explosion' | 'victory' | 'sparkle';
  angle?: number;
  angularSpeed?: number;
  orbitRadius?: number;
  orbitSpeed?: number;
  orbitCenter?: { x: number; y: number };
}

export interface Vortex {
  x: number;
  y: number;
  startTime: number;
  duration: number;
  particles: Particle[];
}

export interface VictoryAnimation {
  startTime: number;
  duration: number;
  winner: 1 | 2;
  cellLightUpOrder: { row: number; col: number }[];
  textScale: number;
  particles: Particle[];
}

export class EffectSystem {
  private maxParticles = 500;
  particles: Particle[] = [];
  stardustParticles: Particle[] = [];
  vortices: Vortex[] = [];
  victoryAnimation: VictoryAnimation | null = null;
  private stardustRotationAngle = 0;
  private boardSize = 8;

  constructor() {
    this.initStardustRing();
  }

  initStardustRing(): void {
    this.stardustParticles = [];
    const count = 200;
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 320 + Math.random() * 60;
      const t = Math.random();
      const r = Math.round(224 + (212 - 224) * t);
      const g = Math.round(224 + (175 - 224) * t);
      const b = Math.round(224 + (55 - 224) * t);
      
      this.stardustParticles.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 1 + Math.random() * 2,
        color: `rgb(${r}, ${g}, ${b})`,
        alpha: 0.3 + Math.random() * 0.7,
        life: Infinity,
        maxLife: Infinity,
        type: 'stardust',
        angle: angle,
        orbitRadius: radius,
        orbitSpeed: (0.2 + Math.random() * 0.3) * (Math.random() > 0.5 ? 1 : -1),
        orbitCenter: { x: 0, y: 0 },
      });
    }
  }

  createStardustRing(centerX: number, centerY: number): void {
    for (const p of this.stardustParticles) {
      if (p.orbitCenter) {
        p.orbitCenter.x = centerX;
        p.orbitCenter.y = centerY;
      }
    }
  }

  createExplosion(x: number, y: number): void {
    const particleCount = 30;
    const explosionParticles: Particle[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 50 + Math.random() * 100;
      const hue = Math.random() * 360;
      
      explosionParticles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        color: `hsl(${hue}, 100%, 60%)`,
        alpha: 1,
        life: 1000,
        maxLife: 1000,
        type: 'explosion',
        angle: angle,
        angularSpeed: (Math.random() - 0.5) * 8,
      });
    }
    
    this.vortices.push({
      x,
      y,
      startTime: Date.now(),
      duration: 1000,
      particles: explosionParticles,
    });
    
    this.particles.push(...explosionParticles);
    this.trimParticles();
  }

  createVictoryParticles(winner: 1 | 2): void {
    const particles: Particle[] = [];
    const count = 500;
    
    for (let i = 0; i < count; i++) {
      const t = Math.random();
      const r = Math.round(224 + (212 - 224) * t);
      const g = Math.round(224 + (175 - 224) * t);
      const b = Math.round(224 + (55 - 224) * t);
      
      particles.push({
        x: Math.random() * window.innerWidth,
        y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 20,
        vy: 50 + Math.random() * 70,
        size: 1 + Math.random() * 3,
        color: `rgb(${r}, ${g}, ${b})`,
        alpha: 0.6 + Math.random() * 0.4,
        life: 3000 + Math.random() * 1000,
        maxLife: 4000,
        type: 'victory',
      });
    }
    
    const order: { row: number; col: number }[] = [];
    const centerRow = Math.floor(this.boardSize / 2);
    const centerCol = Math.floor(this.boardSize / 2);
    
    for (let distance = 0; distance < this.boardSize; distance++) {
      for (let r = 0; r < this.boardSize; r++) {
        for (let c = 0; c < this.boardSize; c++) {
          const dist = Math.max(Math.abs(r - centerRow), Math.abs(c - centerCol));
          if (dist === distance) {
            order.push({ row: r, col: c });
          }
        }
      }
    }
    
    this.victoryAnimation = {
      startTime: Date.now(),
      duration: 3000,
      winner,
      cellLightUpOrder: order,
      textScale: 0,
      particles,
    };
    
    this.particles.push(...particles);
    this.trimParticles();
  }

  private trimParticles(): void {
    if (this.particles.length > this.maxParticles) {
      const toRemove = this.particles.length - this.maxParticles;
      this.particles.splice(0, toRemove);
    }
  }

  update(deltaTime: number): void {
    const dt = deltaTime / 1000;
    const now = Date.now();
    
    this.stardustRotationAngle += 0.0003 * deltaTime;
    
    for (const p of this.stardustParticles) {
      if (p.orbitCenter && p.orbitRadius !== undefined && p.orbitSpeed !== undefined && p.angle !== undefined) {
        p.angle += p.orbitSpeed * dt;
        p.x = p.orbitCenter.x + Math.cos(p.angle + this.stardustRotationAngle) * p.orbitRadius;
        p.y = p.orbitCenter.y + Math.sin(p.angle + this.stardustRotationAngle) * p.orbitRadius;
        p.alpha = 0.3 + Math.sin(now * 0.002 + p.angle * 2) * 0.3;
      }
    }
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;
      
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      
      if (p.type === 'explosion' && p.angularSpeed && p.angle !== undefined) {
        p.angle += p.angularSpeed * dt;
        p.alpha = p.life / p.maxLife;
        p.vx *= 0.98;
        p.vy *= 0.98;
      }
      
      if (p.type === 'victory') {
        p.alpha = Math.min(1, p.life / 1000);
      }
    }
    
    for (let i = this.vortices.length - 1; i >= 0; i--) {
      if (now - this.vortices[i].startTime > this.vortices[i].duration) {
        this.vortices.splice(i, 1);
      }
    }
    
    if (this.victoryAnimation) {
      const elapsed = now - this.victoryAnimation.startTime;
      
      if (elapsed > 2200) {
        const textProgress = Math.min(1, (elapsed - 2200) / 800);
        this.victoryAnimation.textScale = this.easeOutBack(textProgress) * 1.2;
      }
      
      if (elapsed > this.victoryAnimation.duration + 2000) {
        this.victoryAnimation = null;
      }
    }
  }

  easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  renderStardust(ctx: CanvasRenderingContext2D): void {
    for (const p of this.stardustParticles) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.restore();
    }
  }

  renderVortices(ctx: CanvasRenderingContext2D): void {
    const now = Date.now();
    
    for (const vortex of this.vortices) {
      const elapsed = now - vortex.startTime;
      const progress = elapsed / vortex.duration;
      
      ctx.save();
      const gradient = ctx.createRadialGradient(vortex.x, vortex.y, 0, vortex.x, vortex.y, 30 * (1 + progress));
      gradient.addColorStop(0, `rgba(255, 255, 255, ${0.8 * (1 - progress)})`);
      gradient.addColorStop(0.3, `rgba(255, 200, 100, ${0.5 * (1 - progress)})`);
      gradient.addColorStop(0.6, `rgba(255, 100, 200, ${0.3 * (1 - progress)})`);
      gradient.addColorStop(1, 'rgba(100, 100, 255, 0)');
      
      ctx.beginPath();
      ctx.arc(vortex.x, vortex.y, 30 * (1 + progress), 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.restore();
      
      ctx.save();
      ctx.translate(vortex.x, vortex.y);
      ctx.rotate(progress * Math.PI * 4);
      
      for (let i = 0; i < 6; i++) {
        const armAngle = (i / 6) * Math.PI * 2;
        ctx.save();
        ctx.rotate(armAngle);
        
        const armGradient = ctx.createLinearGradient(0, 0, 40 * (1 + progress), 0);
        armGradient.addColorStop(0, `rgba(255, 255, 255, ${0.7 * (1 - progress)})`);
        armGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(40 * (1 + progress), -5 * (1 - progress));
        ctx.lineTo(50 * (1 + progress), 0);
        ctx.lineTo(40 * (1 + progress), 5 * (1 - progress));
        ctx.closePath();
        ctx.fillStyle = armGradient;
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      
      for (const p of vortex.particles) {
        if (p.life <= 0) continue;
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();
      }
    }
  }

  renderVictory(ctx: CanvasRenderingContext2D, board: any): void {
    if (!this.victoryAnimation) return;
    
    const now = Date.now();
    const elapsed = now - this.victoryAnimation.startTime;
    const winner = this.victoryAnimation.winner;
    const color = winner === 1 ? '#00D4FF' : '#FF6B35';
    
    const lightProgress = Math.min(1, elapsed / 2000);
    const cellsToLight = Math.floor(this.victoryAnimation.cellLightUpOrder.length * lightProgress);
    
    for (let i = 0; i < cellsToLight; i++) {
      const { row, col } = this.victoryAnimation.cellLightUpOrder[i];
      const corners = board.getDiamondCorners(row, col);
      const cellProgress = (i / this.victoryAnimation.cellLightUpOrder.length);
      const alpha = 0.3 + 0.4 * (1 - Math.abs(cellProgress - lightProgress) * 5);
      
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      for (let j = 1; j < corners.length; j++) {
        ctx.lineTo(corners[j].x, corners[j].y);
      }
      ctx.closePath();
      ctx.fillStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.restore();
    }
    
    for (const p of this.victoryAnimation.particles) {
      if (p.life <= 0) continue;
      
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.restore();
    }
    
    if (this.victoryAnimation.textScale > 0) {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const scale = this.victoryAnimation.textScale;
      
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(scale, scale);
      
      ctx.font = '900 120px "Noto Serif SC", "Playfair Display", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#D4AF37';
      ctx.shadowBlur = 20;
      ctx.strokeText('胜利', 0, 0);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = color;
      ctx.shadowBlur = 30;
      ctx.fillText('胜利', 0, 0);
      
      ctx.restore();
    }
  }

  render(ctx: CanvasRenderingContext2D, board?: any): void {
    this.renderStardust(ctx);
    this.renderVortices(ctx);
    
    if (board && this.victoryAnimation) {
      this.renderVictory(ctx, board);
    } else {
      for (const p of this.particles) {
        if (p.type === 'victory' || p.life <= 0) continue;
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.restore();
      }
    }
  }
}
