import { ParticleSystem, Star } from './particleSystem';
import { ControlPanel } from './controlPanel';
import { Particle } from './particle';

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
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragDistance: number = 0;

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

    this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd);
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.dragDistance = 0;
    this.camera.velocityYaw = 0;
    this.camera.velocityPitch = 0;
  };

  private onMouseMove = (e: MouseEvent): void => {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;

    if (!this.isDragging) return;

    const dx = e.clientX - this.lastMouseX;
    const dy = e.clientY - this.lastMouseY;
    this.dragDistance += Math.abs(dx) + Math.abs(dy);

    this.camera.velocityYaw = dx * this.rotationSpeed;
    this.camera.velocityPitch = dy * this.rotationSpeed;

    this.camera.targetYaw += dx * this.rotationSpeed;
    this.camera.targetPitch += dy * this.rotationSpeed;

    this.camera.targetPitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.camera.targetPitch));

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (this.isDragging && this.dragDistance < 6) {
      this.handleParticleClick(e.clientX, e.clientY);
    }
    this.isDragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    this.camera.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.camera.targetZoom * (1 + delta)));
  };

  private onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    this.isDragging = true;
    this.lastMouseX = touch.clientX;
    this.lastMouseY = touch.clientY;
    this.dragStartX = touch.clientX;
    this.dragStartY = touch.clientY;
    this.dragDistance = 0;
    this.camera.velocityYaw = 0;
    this.camera.velocityPitch = 0;
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (!this.isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];

    const dx = touch.clientX - this.lastMouseX;
    const dy = touch.clientY - this.lastMouseY;
    this.dragDistance += Math.abs(dx) + Math.abs(dy);

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

  private onTouchEnd = (e: TouchEvent): void => {
    if (this.isDragging && this.dragDistance < 15) {
      this.handleParticleClick(this.lastMouseX, this.lastMouseY);
    }
    this.isDragging = false;
  };

  private handleParticleClick(screenX: number, screenY: number): void {
    const particle = this.particleSystem.pickParticle(screenX, screenY, (p) => {
      const proj = this.project(p.x, p.y, p.z);
      return { x: proj.x, y: proj.y, scale: proj.scale };
    });

    if (particle) {
      this.selectedParticle = particle;
      this.mouseX = screenX;
      this.mouseY = screenY;
      this.showTooltip(particle);
    } else {
      this.selectedParticle = null;
      this.hideTooltip();
    }
  }

  private showTooltip(particle: Particle): void {
    const velocity = (particle.getVelocity() * this.particleSystem.getSpeed()).toFixed(2);
    const remainingLife = particle.getRemainingLife().toFixed(1);
    this.tooltip.innerHTML =
      '<div style="font-size:12px;line-height:1.6;color:#1a1a3e;">' +
      '<div><b>速度:</b> ' + velocity + ' u/s</div>' +
      '<div><b>剩余生命:</b> ' + remainingLife + 's</div>' +
      '</div>';
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

  private projectVelocityDir(vx: number, vy: number, vz: number): { dx: number; dy: number } {
    const x1 = vx * this.cosYaw - vz * this.sinYaw;
    const z1 = vx * this.sinYaw + vz * this.cosYaw;

    const y2 = vy * this.cosPitch - z1 * this.sinPitch;

    const len = Math.sqrt(x1 * x1 + y2 * y2);
    if (len < 0.0001) return { dx: 0, dy: -1 };
    return { dx: x1 / len, dy: -y2 / len };
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
      this.drawParticleTail(entry.particle, entry.proj);
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

  private drawParticleTail(particle: Particle, proj: ProjectedPoint): void {
    const ctx = this.ctx;
    const tailLen = particle.tailLength * proj.scale;
    if (tailLen < 2) return;

    const dir = this.projectVelocityDir(particle.vx, particle.vy, particle.vz);

    const tailEndX = proj.x - dir.dx * tailLen;
    const tailEndY = proj.y - dir.dy * tailLen;

    const gradient = ctx.createLinearGradient(proj.x, proj.y, tailEndX, tailEndY);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${particle.opacity * 0.8})`);
    gradient.addColorStop(0.4, `rgba(255, 255, 255, ${particle.opacity * 0.4})`);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    const r = Math.max(1, particle.radius * proj.scale);

    ctx.beginPath();
    ctx.moveTo(proj.x + dir.dy * r * 0.5, proj.y - dir.dx * r * 0.5);
    ctx.lineTo(tailEndX, tailEndY);
    ctx.lineTo(proj.x - dir.dy * r * 0.5, proj.y + dir.dx * r * 0.5);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(proj.x, proj.y);
    ctx.lineTo(tailEndX, tailEndY);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = Math.max(1, r * 0.6);
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  private drawParticleHead(particle: Particle, proj: ProjectedPoint): void {
    const ctx = this.ctx;
    const r = Math.max(1, particle.radius * proj.scale);

    const gradient = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, r * 2.5);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${particle.opacity})`);
    gradient.addColorStop(0.3, `rgba(220, 230, 255, ${particle.opacity * 0.6})`);
    gradient.addColorStop(0.7, `rgba(200, 220, 255, ${particle.opacity * 0.2})`);
    gradient.addColorStop(1, 'rgba(200, 220, 255, 0)');

    ctx.beginPath();
    ctx.arc(proj.x, proj.y, r * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(proj.x, proj.y, r * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
    ctx.fill();
  }

  private updateTooltipIfNeeded(): void {
    if (this.selectedParticle && this.selectedParticle.active) {
      const velocity = (this.selectedParticle.getVelocity() * this.particleSystem.getSpeed()).toFixed(2);
      const remainingLife = this.selectedParticle.getRemainingLife().toFixed(1);
      this.tooltip.innerHTML =
        '<div style="font-size:12px;line-height:1.6;color:#1a1a3e;">' +
        '<div><b>速度:</b> ' + velocity + ' u/s</div>' +
        '<div><b>剩余生命:</b> ' + remainingLife + 's</div>' +
        '</div>';
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
