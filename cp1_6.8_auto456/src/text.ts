export interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  char: string;
  hue: number;
  alpha: number;
  size: number;
  scattered: boolean;
  reformProgress: number;
  reformDelay: number;
  fontSize: number;
}

export interface TextParticleSystem {
  particles: Particle[];
  state: 'idle' | 'scattering' | 'reforming' | 'formed';
  reformTimer: number;
}

export function createTextParticles(
  text: string,
  centerX: number,
  centerY: number,
  particleCount: number,
  canvasWidth: number,
  canvasHeight: number
): TextParticleSystem {
  const particles: Particle[] = [];
  const chars = text.split('');
  const totalParticles = particleCount;
  const particlesPerChar = Math.max(1, Math.floor(totalParticles / chars.length));
  const fontSize = Math.min(32, canvasWidth / (chars.length * 1.2 + 2));

  const totalWidth = chars.length * fontSize;
  const startX = centerX - totalWidth / 2 + fontSize / 2;

  chars.forEach((char, ci) => {
    const charX = startX + ci * fontSize;
    const charY = centerY;
    for (let i = 0; i < particlesPerChar; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 200 + 80;
      const offsetX = (Math.random() - 0.5) * fontSize * 0.6;
      const offsetY = (Math.random() - 0.5) * fontSize * 0.6;
      particles.push({
        x: centerX + (Math.random() - 0.5) * 30,
        y: centerY + (Math.random() - 0.5) * 30,
        targetX: charX + offsetX,
        targetY: charY + offsetY,
        originX: centerX,
        originY: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        char: i === 0 ? char : '',
        hue: 45 + Math.random() * 30,
        alpha: 1,
        size: i === 0 ? 2 : Math.random() * 2 + 0.5,
        scattered: true,
        reformProgress: 0,
        reformDelay: ci * 0.15 + Math.random() * 0.3,
        fontSize,
      });
    }
  });

  return {
    particles,
    state: 'scattering',
    reformTimer: 0,
  };
}

export function updateTextParticles(system: TextParticleSystem, dt: number): boolean {
  if (system.state === 'idle') return false;

  if (system.state === 'scattering') {
    system.reformTimer += dt;
    let allScattered = true;
    for (const p of system.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.vy += 15 * dt;
      p.x += (Math.random() - 0.5) * 20 * dt;
      p.y += (Math.random() - 0.5) * 20 * dt;
      if (Math.abs(p.vx) > 2 || Math.abs(p.vy) > 2) allScattered = false;
    }
    if (system.reformTimer > 1.5) {
      system.state = 'reforming';
      system.reformTimer = 0;
    }
  }

  if (system.state === 'reforming') {
    system.reformTimer += dt;
    let allReformed = true;
    for (const p of system.particles) {
      if (system.reformTimer < p.reformDelay) {
        p.x += (Math.random() - 0.5) * 15 * dt;
        p.y += (Math.random() - 0.5) * 15 * dt;
        allReformed = false;
        continue;
      }
      p.reformProgress = Math.min(1, p.reformProgress + dt * 1.8);
      const t = easeOutBack(p.reformProgress);
      p.x = p.originX + (p.targetX - p.originX) * t;
      p.y = p.originY + (p.targetY - p.originY) * t;
      p.vx *= 0.9;
      p.vy *= 0.9;
      p.hue = 45 + (210 - 45) * t;
      if (p.reformProgress < 1) allReformed = false;
    }
    if (allReformed) {
      system.state = 'formed';
      return true;
    }
  }

  if (system.state === 'formed') {
    for (const p of system.particles) {
      p.x += Math.sin(Date.now() * 0.001 + p.targetX * 0.1) * 0.15;
      p.y += Math.cos(Date.now() * 0.001 + p.targetY * 0.1) * 0.15;
    }
    return true;
  }

  return false;
}

export function scatterParticles(system: TextParticleSystem, centerX: number, centerY: number): void {
  for (const p of system.particles) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 250 + 100;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.originX = p.x;
    p.originY = p.y;
    p.reformProgress = 0;
    p.reformDelay = Math.random() * 0.4;
    p.scattered = true;
  }
  system.state = 'scattering';
  system.reformTimer = 0;
}

export function drawTextParticles(ctx: CanvasRenderingContext2D, system: TextParticleSystem, time: number) {
  ctx.save();
  for (const p of system.particles) {
    const glowAlpha = 0.3 + Math.sin(time * 2 + p.targetX * 0.05) * 0.1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.3, p.size), 0, Math.PI * 2);
    const r = Math.round(255 * (1 - p.reformProgress * 0.2));
    const g = Math.round(215 - p.reformProgress * 25);
    const b = Math.round(50 + p.reformProgress * 200);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.alpha * 0.8})`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${glowAlpha * 0.12})`;
    ctx.fill();
  }

  if (system.state === 'formed' || system.state === 'reforming') {
    ctx.shadowColor = 'rgba(255, 215, 100, 0.6)';
    ctx.shadowBlur = 8;
    ctx.font = `${system.particles.find(p => p.char)?.fontSize || 28}px Georgia, 'SimSun', serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of system.particles) {
      if (!p.char) continue;
      const t = p.reformProgress;
      if (t < 0.5) continue;
      const charAlpha = Math.min(1, (t - 0.5) * 2);
      const r = Math.round(255 * (1 - t * 0.1));
      const g = Math.round(215 - t * 20);
      const b = Math.round(80 + t * 175);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${charAlpha * 0.9})`;
      ctx.fillText(p.char, p.targetX, p.targetY);
    }
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

export function hitTestParticles(system: TextParticleSystem, mx: number, my: number): boolean {
  if (system.state !== 'formed') return false;
  for (const p of system.particles) {
    if (!p.char) continue;
    const dx = mx - p.targetX;
    const dy = my - p.targetY;
    if (Math.abs(dx) < p.fontSize && Math.abs(dy) < p.fontSize) return true;
  }
  return false;
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
