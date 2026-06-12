import { ParticleSystem, Star } from './particleSystem';
import { ControlPanel } from './controlPanel';
import { Particle, Vector3 } from './particle';

interface Camera {
  yaw: number;
  pitch: number;
  zoom: number;
  targetYaw: number;
  targetPitch: number;
  targetZoom: number;
  velocityYaw: number;
  velocityPitch: number;
}

interface ProjectedPoint {
  x: number;
  y: number;
  scale: number;
  z: number;
}

class ParticleCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;

  private particleSystem: ParticleSystem;
  private controlPanel: ControlPanel;

  private camera: Camera = {
    yaw: 0,
    pitch: 0.3,
    zoom: 1.0,
    targetYaw: 0,
    targetPitch: 0.3,
    targetZoom: 1.0,
    velocityYaw: 0,
    velocityPitch: 0
  };

  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  private rotationSpeed: number = 0.005;
  private damping: number = 0.95;
  private minZoom: number = 0.5;
  private maxZoom: number = 5.0;

  private lastTime: number = 0;
  private animationId: number = 0;
  private time: number = 0;

  private tooltip: HTMLDivElement;
  private selectedParticle: Particle | null = null;
  private mouseX: number = 0;
  private mouseY: number = 0;

  private projectedParticles: Array<{ particle: Particle; proj: ProjectedPoint }> = [];
  private projectedStars: Array<{ star: Star; proj: ProjectedPoint }> = [];
  private projectedTail: ProjectedPoint[] = [];

  private sinYaw: number = 0;
  private cosYaw: number = 1;
  private sinPitch: number = 0;
  private cosPitch: number = 1;

  private focalLength: number = 800;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    document.body.appendChild(this.canvas);

    const tooltipEl = document.getElementById('tooltip');
    this.tooltip = tooltipEl as HTMLDivElement;

    this.particleSystem = new ParticleSystem();

    this.controlPanel = new ControlPanel(
      {
        density: 3000,
        tailLength: 60,
        speed: 1.0
      },
      {
        onDensityChange: (v) => this.particleSystem.setDensity(v),
        onTailLengthChange: (v) => this.particleSystem.setTailLength(v),
        onSpeedChange: (v) => this.particleSystem.setSpeed(v)
      }
    );

    this.initProjectionArrays();
    this.resize();
    this.bindEvents();
    this.start();
  }

  private initProjectionArrays(): void {
    for (let i = 0; i < 6000; i++) {
      this.projectedParticles.push({
        particle: null as any,
        proj: { x: 0, y: 0, scale: 0, z: 0 }
      });
    }
    for (let i = 0; i < 200; i++) {
      this.projectedStars.push({
        star: null as any,
        proj: { x: 0, y: 0, scale: 0, z: 0 }
      });
    }
    for (let i = 0; i < 20; i++) {
      this.projectedTail.push({ x: 0, y: 0, scale: 0, z: 0 });
    }
  }

  private resize = (): void => {
    const dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.scale(dpr, dpr);
    this.focalLength = Math.max(500, this.width * 0.6);
  };

  private bindEvents(): void {
    window.addEventListener('resize', this.resize);

    this.canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);

    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });

    this.canvas.addEventListener('click', this.onClick);

    this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd);
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.camera.velocityYaw = 0;
    this.camera.velocityPitch = 0;
  };

  private onMouseMove = (e: MouseEvent): void => {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;

    if (!this.isDragging) return;

    const dx = e.clientX - this.lastMouseX;
    const dy = e.clientY - this.lastMouseY;

    this.camera.velocityYaw = dx * this.rotationSpeed;
    this.camera.velocityPitch = dy * this.rotationSpeed;

    this.camera.targetYaw += dx * this.rotationSpeed;
    this.camera.targetPitch += dy * this.rotationSpeed;

    this.camera.targetPitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.camera.targetPitch));

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    this.camera.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.camera.targetZoom * (1 + delta)));
  };

  private onClick = (e: MouseEvent): void => {
    if (Math.abs(this.camera.velocityYaw) > 0.001 || Math.abs(this.camera.velocityPitch) > 0.001) {
      return;
    }

    const particle = this.particleSystem.pickParticle(e.clientX, e.clientY, (p) => {
      const proj = this.project(p.x, p.y, p.z);
      return { x: proj.x, y: proj.y, scale: proj.scale };
    });

    if (particle) {
      this.selectedParticle = particle;
      this.showTooltip(particle);
    } else {
      this.selectedParticle = null;
      this.hideTooltip();
    }
  };

  private onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    this.isDragging = true;
    this.lastMouseX = touch.clientX;
    this.lastMouseY = touch.clientY;
    this.camera.velocityYaw = 0;
    this.camera.velocityPitch = 0;
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (!this.isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];

    const dx = touch.clientX - this.lastMouseX;
    const dy = touch.clientY - this.lastMouseY;

    this.camera.velocityYaw = dx * this.rotationSpeed;
    this.camera.velocityPitch = dy * this.rotationSpeed;

    this.camera.targetYaw += dx * this.rotationSpeed;
    this.camera.targetPitch += dy * this.rotationSpeed;
    this.camera.targetPitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.camera.targetPitch));

    this.lastMouseX = touch.clientX;
    this.lastMouseY = touch.clientY;
    this.mouseX = touch.clientX;
    this.mouseY = touch.clientY;
  };

  private onTouchEnd = (): void => {
    this.isDragging = false;
  };

  private showTooltip(particle: Particle): void {
    const velocity = particle.getVelocity().toFixed(2);
    const remainingLife = particle.getRemainingLife().toFixed(2);
    this.tooltip.innerHTML = `
      <div><strong>速度:</strong> ${velocity} u/s</div>
      <div><strong>剩余生命:</strong> ${remainingLife}s</div>
    `;
    this.tooltip.style.display = 'block';
    this.updateTooltipPosition();
  }

  private hideTooltip(): void {
    this.tooltip.style.display = 'none';
  }

  private updateTooltipPosition(): void {
    let left = this.mouseX + 15;
    let top = this.mouseY + 15;

    if (left + 140 > this.width) {
      left = this.mouseX - 155;
    }
    if (top + 60 > this.height) {
      top = this.mouseY - 70;
    }

    this.tooltip.style.left = left + 'px';
    this.tooltip.style.top = top + 'px';
  }

  private project(x: number, y: number, z: number): ProjectedPoint {
    const x1 = x * this.cosYaw - z * this.sinYaw;
    const z1 = x * this.sinYaw + z * this.cosYaw;

    const y2 = y * this.cosPitch - z1 * this.sinPitch;
    const z2 = y * this.sinPitch + z1 * this.cosPitch;

    const zCam = z2 + 600;

    if (zCam <= 0) {
      return { x: 0, y: 0, scale: 0, z: zCam };
    }

    const scale = (this.focalLength * this.camera.zoom) / zCam;
    const screenX = this.width / 2 + x1 * scale;
    const screenY = this.height / 2 - y2 * scale;

    return { x: screenX, y: screenY, scale, z: zCam };
  }

  private updateCamera(deltaTime: number): void {
    if (!this.isDragging) {
      this.camera.velocityYaw *= this.damping;
      this.camera.velocityPitch *= this.damping;
      this.camera.targetYaw += this.camera.velocityYaw;
      this.camera.targetPitch += this.camera.velocityPitch;
      this.camera.targetPitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.camera.targetPitch));
    }

    this.camera.yaw += (this.camera.targetYaw - this.camera.yaw) * Math.min(1, deltaTime * 10);
    this.camera.pitch += (this.camera.targetPitch - this.camera.pitch) * Math.min(1, deltaTime * 10);
    this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * Math.min(1, deltaTime * 8);

    this.sinYaw = Math.sin(this.camera.yaw);
    this.cosYaw = Math.cos(this.camera.yaw);
    this.sinPitch = Math.sin(this.camera.pitch);
    this.cosPitch = Math.cos(this.camera.pitch);
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#0b0b1e');
    gradient.addColorStop(1, '#1a1a3e');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawStars(stars: Star[]): void {
    const ctx = this.ctx;
    const projStars = this.projectedStars;

    let count = 0;
    for (let i = 0; i < stars.length; i++) {
      const star = stars[i];
      const proj = this.project(star.x, star.y, star.z);
      if (proj.scale <= 0 || proj.z < 0) continue;

      const entry = projStars[count];
      entry.star = star;
      entry.proj.x = proj.x;
      entry.proj.y = proj.y;
      entry.proj.scale = proj.scale;
      entry.proj.z = proj.z;
      count++;
    }

    for (let i = 0; i < count; i++) {
      const entry = projStars[i];
      const star = entry.star;
      const p = entry.proj;

      const twinkle = (Math.sin(star.twinklePhase) + 1) / 2;
      const opacity = star.baseOpacity * (0.5 + twinkle * 0.5);
      const r = Math.max(0.5, star.radius * p.scale * 0.5);

      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.fill();
    }
  }

  private drawParticles(particles: Particle[]): void {
    const ctx = this.ctx;
    const projArr = this.projectedParticles;

    let visibleCount = 0;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (!p.active) continue;

      const proj = this.project(p.x, p.y, p.z);
      if (proj.scale <= 0 || proj.z <= 0) continue;

      const entry = projArr[visibleCount];
      entry.particle = p;
      entry.proj.x = proj.x;
      entry.proj.y = proj.y;
      entry.proj.scale = proj.scale;
      entry.proj.z = proj.z;
      visibleCount++;
    }

    this.sortByZ(projArr, visibleCount);

    for (let i = 0; i < visibleCount; i++) {
      const entry = projArr[i];
      this.drawParticleTail(entry.particle);
    }

    for (let i = 0; i < visibleCount; i++) {
      const entry = projArr[i];
      this.drawParticleHead(entry.particle, entry.proj);
    }
  }

  private sortByZ(arr: Array<{ proj: ProjectedPoint }>, count: number): void {
    for (let i = 1; i < count; i++) {
      let j = i;
      while (j > 0 && arr[j].proj.z > arr[j - 1].proj.z) {
        const temp = arr[j];
        arr[j] = arr[j - 1];
        arr[j - 1] = temp;
        j--;
      }
    }
  }

  private drawParticleTail(particle: Particle): void {
    const ctx = this.ctx;
    const tailPoints = particle.tailPoints;
    const tailCount = particle.getTailPointCount();

    if (tailCount < 2) return;

    const projTail = this.projectedTail;
    let validCount = 0;

    for (let i = 0; i < tailCount; i++) {
      const point = tailPoints[i];
      const proj = this.project(point.x, point.y, point.z);
      projTail[i].x = proj.x;
      projTail[i].y = proj.y;
      projTail[i].scale = proj.scale;
      projTail[i].z = proj.z;
      if (proj.scale > 0 && proj.z > 0) {
        validCount++;
      }
    }

    if (validCount < 2) return;

    for (let i = 0; i < tailCount - 1; i++) {
      const p1 = projTail[i];
      const p2 = projTail[i + 1];

      if (p1.scale <= 0 || p2.scale <= 0) continue;

      const t = i / (tailCount - 1);
      const opacity = particle.opacity * (1 - t) * 0.6;
      const width = Math.max(1, particle.radius * p1.scale * 0.8 * (1 - t * 0.5));

      const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
      gradient.addColorStop(1, `rgba(136, 170, 255, ${opacity * 0.3})`);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  private drawParticleHead(particle: Particle, proj: ProjectedPoint): void {
    const ctx = this.ctx;
    const r = Math.max(1, particle.radius * proj.scale);

    const gradient = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, r * 2.5);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${particle.opacity})`);
    gradient.addColorStop(0.3, `rgba(200, 220, 255, ${particle.opacity * 0.7})`);
    gradient.addColorStop(0.6, `rgba(136, 170, 255, ${particle.opacity * 0.3})`);
    gradient.addColorStop(1, 'rgba(136, 170, 255, 0)');

    ctx.beginPath();
    ctx.arc(proj.x, proj.y, r * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(proj.x, proj.y, r * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
    ctx.fill();
  }

  private updateTooltipIfNeeded(): void {
    if (this.selectedParticle && this.selectedParticle.active) {
      const velocity = this.selectedParticle.getVelocity().toFixed(2);
      const remainingLife = this.selectedParticle.getRemainingLife().toFixed(2);
      this.tooltip.innerHTML = `
        <div><strong>速度:</strong> ${velocity} u/s</div>
        <div><strong>剩余生命:</strong> ${remainingLife}s</div>
      `;
      this.updateTooltipPosition();
    } else if (this.selectedParticle && !this.selectedParticle.active) {
      this.selectedParticle = null;
      this.hideTooltip();
    }
  }

  private animate = (timestamp: number): void => {
    const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;
    this.time += deltaTime;

    this.updateCamera(deltaTime);
    this.particleSystem.update(deltaTime, this.time);

    this.drawBackground();
    this.drawStars(this.particleSystem.getStars());
    this.drawParticles(this.particleSystem.getActiveParticles());

    this.updateTooltipIfNeeded();

    this.animationId = requestAnimationFrame(this.animate);
  };

  private start(): void {
    this.lastTime = performance.now();
    this.animationId = requestAnimationFrame(this.animate);
  }

  public destroy(): void {
    cancelAnimationFrame(this.animationId);
    this.controlPanel.destroy();
    this.canvas.remove();
    window.removeEventListener('resize', this.resize);
  }
}

const app = new ParticleCanvas();
(window as any).app = app;
