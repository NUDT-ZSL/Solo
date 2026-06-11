import {
  COLORS, CONFIG, Track, Marble, Particle, LaunchPad,
  Point, MarbleType, MARBLE_TYPES, TrackNode
} from './constants';

export interface RenderState {
  tracks: Track[];
  marbles: Marble[];
  particles: Particle[];
  launchPads: LaunchPad[];
  draggingNode: { trackId: string; nodeIndex: number } | null;
  draggingMarble: { type: MarbleType; position: Point } | null;
  activeMarbleTypes: Set<MarbleType>;
  dominantMarbleType: MarbleType | null;
  activityLevel: number;
  hoveredNode: { trackId: string; nodeIndex: number } | null;
  hoveredLaunchPad: MarbleType | null;
}

export class RenderEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bgColor1: [number, number, number] = [26, 26, 46];
  private bgColor2: [number, number, number] = [22, 33, 62];
  private targetBgColor1: [number, number, number] = [26, 26, 46];
  private targetBgColor2: [number, number, number] = [22, 33, 62];
  private time: number = 0;
  private particleIdCounter: number = 0;
  private particles: Particle[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas 2D上下文');
    this.ctx = ctx;

    this.canvas.width = CONFIG.CANVAS_WIDTH;
    this.canvas.height = CONFIG.CANVAS_HEIGHT;
  }

  public getParticles(): Particle[] {
    return this.particles;
  }

  public spawnParticles(
    position: Point,
    marbleType: MarbleType,
    count?: number
  ): void {
    const particleCount = count ?? (
      CONFIG.PARTICLE_COUNT_MIN +
      Math.floor(Math.random() * (CONFIG.PARTICLE_COUNT_MAX - CONFIG.PARTICLE_COUNT_MIN + 1))
    );

    const colorConfig = COLORS.MARBLE[marbleType];
    const colors = [colorConfig.start, colorConfig.end, colorConfig.glow];

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
      const speed = CONFIG.PARTICLE_SPREAD_SPEED * (0.6 + Math.random() * 0.8);

      this.particles.push({
        id: `p_${this.particleIdCounter++}`,
        position: { x: position.x, y: position.y },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed
        },
        color: colors[Math.floor(Math.random() * colors.length)],
        life: CONFIG.PARTICLE_LIFETIME * (0.7 + Math.random() * 0.6),
        maxLife: CONFIG.PARTICLE_LIFETIME,
        size: 2 + Math.random() * 3
      });
    }
  }

  public spawnCollisionParticles(position: Point): void {
    const colors = ['#FFFFFF', '#00D4FF', '#FF3366', '#FFD700'];
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 240 + Math.random() * 180;

      this.particles.push({
        id: `p_${this.particleIdCounter++}`,
        position: { x: position.x, y: position.y },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed
        },
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0.18 * (0.7 + Math.random() * 0.6),
        maxLife: 0.18,
        size: 2.5 + Math.random() * 3.5
      });
    }
  }

  public updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      const decay = Math.pow(p.life / p.maxLife, 1.5);
      p.position.x += p.velocity.x * deltaTime * decay;
      p.position.y += p.velocity.y * deltaTime * decay;
      p.velocity.x *= 0.96;
      p.velocity.y *= 0.96;
    }
  }

  public render(state: RenderState, deltaTime: number): void {
    this.time += deltaTime;
    this.updateBackgroundColors(state, deltaTime);

    this.renderBackground();
    this.renderLaunchAreaGuide();
    this.renderTracks(state.tracks, state.draggingNode, state.hoveredNode);
    this.renderNodes(state.tracks, state.draggingNode, state.hoveredNode);
    this.renderParticlesLayer();
    this.renderLaunchPads(state.launchPads, state.draggingMarble, state.hoveredLaunchPad);
    this.renderMarbles(state.marbles);

    if (state.draggingMarble) {
      this.renderDraggingMarble(state.draggingMarble);
    }

    this.renderVignetteOverlay();
  }

  private updateBackgroundColors(state: RenderState, deltaTime: number): void {
    let targetR = 26, targetG = 26, targetB = 46;
    let targetR2 = 22, targetG2 = 33, targetB2 = 62;

    const tintWeights: Record<MarbleType, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
    const activeCount = state.activeMarbleTypes.size;

    if (activeCount > 0) {
      for (const m of state.marbles) {
        if (!m.isMoving) continue;
        tintWeights[m.type] += 1;
      }
    }

    if (state.dominantMarbleType) {
      tintWeights[state.dominantMarbleType] += 2;
    }

    const totalWeight = Object.values(tintWeights).reduce((a, b) => a + b, 0);
    const intensity = Math.min(1, (state.activityLevel * 0.7) + (totalWeight > 0 ? 0.3 : 0));

    if (totalWeight > 0) {
      const contributions = [
        { type: 'red' as MarbleType, c: [180, 40, 90], c2: [120, 20, 60] },
        { type: 'blue' as MarbleType, c: [70, 40, 160], c2: [50, 25, 130] },
        { type: 'green' as MarbleType, c: [30, 130, 100], c2: [20, 90, 80] },
        { type: 'yellow' as MarbleType, c: [140, 110, 40], c2: [110, 80, 25] }
      ];

      for (const contrib of contributions) {
        const w = tintWeights[contrib.type] / totalWeight;
        if (w <= 0) continue;
        targetR += contrib.c[0] * w * intensity;
        targetG += contrib.c[1] * w * intensity;
        targetB += contrib.c[2] * w * intensity;
        targetR2 += contrib.c2[0] * w * intensity;
        targetG2 += contrib.c2[1] * w * intensity;
        targetB2 += contrib.c2[2] * w * intensity;
      }
    }

    this.targetBgColor1 = [targetR, targetG, targetB];
    this.targetBgColor2 = [targetR2, targetG2, targetB2];

    const lerpRate = 1 - Math.pow(0.001, deltaTime);
    this.bgColor1 = this.lerpColor(this.bgColor1, this.targetBgColor1, lerpRate);
    this.bgColor2 = this.lerpColor(this.bgColor2, this.targetBgColor2, lerpRate);
  }

  private lerpColor(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
    return [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t
    ];
  }

  private rgbToCss(rgb: [number, number, number]): string {
    return `rgb(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])})`;
  }

  private renderBackground(): void {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;

    const gradient = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, Math.max(w, h) * 0.8);
    gradient.addColorStop(0, this.rgbToCss(this.bgColor1));
    gradient.addColorStop(1, this.rgbToCss(this.bgColor2));

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    this.renderGridLines();
  }

  private renderGridLines(): void {
    const { ctx, canvas, time } = this;
    const w = canvas.width;
    const h = canvas.height;

    ctx.save();
    const gridSize = 60;
    const fade1 = CONFIG.TITLE_BAR_HEIGHT + 10;
    const fade2 = CONFIG.EDITOR_AREA_HEIGHT + CONFIG.TITLE_BAR_HEIGHT;

    const alpha1 = Math.max(0.015, 0.04 - this.time * 0.001 % 0.03);

    for (let x = 0; x <= w; x += gridSize) {
      const gradient = ctx.createLinearGradient(0, fade1, 0, h - CONFIG.INFO_BAR_HEIGHT);
      gradient.addColorStop(0, `rgba(0, 212, 255, 0)`);
      gradient.addColorStop(0.2, `rgba(0, 212, 255, ${alpha1})`);
      gradient.addColorStop(1, `rgba(0, 212, 255, 0.015)`);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, fade1);
      ctx.lineTo(x, h - CONFIG.INFO_BAR_HEIGHT);
      ctx.stroke();
    }

    for (let y = fade2; y <= h - CONFIG.INFO_BAR_HEIGHT; y += gridSize) {
      ctx.strokeStyle = `rgba(0, 212, 255, ${alpha1 * 0.6})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(w - 20, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(0, 212, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(20, fade2);
    ctx.lineTo(w - 20, fade2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }

  private renderLaunchAreaGuide(): void {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const editorTop = CONFIG.TITLE_BAR_HEIGHT;
    const editorBottom = CONFIG.TITLE_BAR_HEIGHT + CONFIG.EDITOR_AREA_HEIGHT;

    ctx.save();
    const areaGrad = ctx.createLinearGradient(0, editorTop, 0, editorBottom);
    areaGrad.addColorStop(0, 'rgba(0, 212, 255, 0.03)');
    areaGrad.addColorStop(0.5, 'rgba(0, 212, 255, 0.06)');
    areaGrad.addColorStop(1, 'rgba(0, 212, 255, 0.02)');
    ctx.fillStyle = areaGrad;
    ctx.fillRect(20, editorTop + 8, w - 40, CONFIG.EDITOR_AREA_HEIGHT - 8);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = 'bold 11px Orbitron, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('▸ 轨道编辑区 / 弹珠发射区', 32, editorTop + 28);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.font = '10px Noto Sans SC, sans-serif';
    ctx.fillText('点击下方节点可拖拽调整位置 · 从发射区拖弹珠到任意轨道起点', 32, editorTop + 46);

    ctx.restore();
  }

  private renderTracks(
    tracks: Track[],
    draggingNode: { trackId: string; nodeIndex: number } | null,
    _hoveredNode: { trackId: string; nodeIndex: number } | null
  ): void {
    const { ctx } = this;

    for (const track of tracks) {
      if (track.nodes.length < 2) continue;

      const isDraggingThis = draggingNode?.trackId === track.id;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let glow = 3; glow >= 1; glow--) {
        ctx.shadowColor = COLORS.TRACK_GLOW;
        ctx.shadowBlur = glow * 6;
        ctx.strokeStyle = `rgba(0, 212, 255, ${0.06 * glow})`;
        ctx.lineWidth = 0.5 + glow * 1.5;

        this.drawSmoothTrack(track);
      }

      ctx.shadowBlur = 8;
      ctx.shadowColor = COLORS.TRACK_GLOW;
      ctx.strokeStyle = COLORS.TRACK;
      ctx.lineWidth = 2;
      this.drawSmoothTrack(track);

      const firstNode = track.nodes[0];
      const lastNode = track.nodes[track.nodes.length - 1];

      ctx.fillStyle = 'rgba(0, 255, 170, 0.9)';
      ctx.shadowColor = 'rgba(0, 255, 170, 0.8)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(firstNode.position.x, firstNode.position.y - CONFIG.NODE_RADIUS - 8, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0, 255, 170, 0.5)';
      ctx.font = '9px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('START', firstNode.position.x, firstNode.position.y - CONFIG.NODE_RADIUS - 14);

      ctx.fillStyle = 'rgba(255, 80, 120, 0.9)';
      ctx.shadowColor = 'rgba(255, 80, 120, 0.8)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(lastNode.position.x, lastNode.position.y + CONFIG.NODE_RADIUS + 10, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private drawSmoothTrack(track: Track): void {
    const { ctx } = this;
    const nodes = track.nodes;
    if (nodes.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(nodes[0].position.x, nodes[0].position.y);

    for (let i = 0; i < nodes.length - 1; i++) {
      const p0 = nodes[i - 1]?.position ?? nodes[i].position;
      const p1 = nodes[i].position;
      const p2 = nodes[i + 1].position;
      const p3 = nodes[i + 2]?.position ?? p2;

      const cp1x = p1.x + (p2.x - p0.x) * 0.22;
      const cp1y = p1.y + (p2.y - p0.y) * 0.22;
      const cp2x = p2.x - (p3.x - p1.x) * 0.22;
      const cp2y = p2.y - (p3.y - p1.y) * 0.22;

      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }

    ctx.stroke();
  }

  private renderNodes(
    tracks: Track[],
    draggingNode: { trackId: string; nodeIndex: number } | null,
    hoveredNode: { trackId: string; nodeIndex: number } | null
  ): void {
    const { ctx, time } = this;

    for (const track of tracks) {
      for (let i = 0; i < track.nodes.length; i++) {
        const node = track.nodes[i];
        const isDragging = draggingNode?.trackId === track.id && draggingNode.nodeIndex === i;
        const isHovered = hoveredNode?.trackId === track.id && hoveredNode.nodeIndex === i;

        this.renderSingleNode(node, isDragging, isHovered, time);
      }
    }
  }

  private renderSingleNode(node: TrackNode, isDragging: boolean, isHovered: boolean, time: number): void {
    const { ctx } = this;
    const { x, y } = node.position;
    const pulse = Math.sin(time * 2.5 + x * 0.01) * 0.15 + 1;

    let scale = 1;
    if (node.highlighted && node.highlightTime > 0) {
      const t = 1 - (node.highlightTime / CONFIG.NODE_HIGHLIGHT_DURATION);
      scale = 1 + Math.sin(t * Math.PI) * 1.2;
    }
    if (isDragging) scale = 1.35;
    else if (isHovered) scale = 1.2;

    const r = CONFIG.NODE_RADIUS * scale;

    ctx.save();
    if (isDragging || isHovered) {
      ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
      ctx.shadowBlur = 16;
    }
    if (node.highlighted && node.highlightColor) {
      ctx.shadowColor = node.highlightColor;
      ctx.shadowBlur = 28;
    }

    ctx.strokeStyle = node.highlighted && node.highlightColor
      ? node.highlightColor
      : (isDragging || isHovered ? COLORS.NODE_RING_ACTIVE : COLORS.NODE_RING);
    ctx.lineWidth = node.highlighted ? 3.5 : (isDragging ? 3 : 2);

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();

    if (node.highlighted && node.highlightTime > 0) {
      const ringR = r * 1.6 * pulse;
      const alpha = (node.highlightTime / CONFIG.NODE_HIGHLIGHT_DURATION) * 0.5;
      ctx.strokeStyle = node.highlightColor.replace(')', `, ${alpha})`).replace('rgb', 'rgba').replace('#', '');
      const rgba = this.hexToRgba(node.highlightColor, alpha);
      ctx.strokeStyle = rgba;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, ringR, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = node.highlighted && node.highlightColor
        ? this.hexToRgba(node.highlightColor, 0.25)
        : 'rgba(255, 255, 255, 0.06)';
      ctx.beginPath();
      ctx.arc(x, y, r - 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = isHovered || isDragging
      ? 'rgba(255, 255, 255, 0.95)'
      : 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const clean = hex.replace('#', '');
    if (clean.startsWith('rgba') || clean.startsWith('rgb')) return hex;
    const bigint = parseInt(clean.length === 3
      ? clean.split('').map(c => c + c).join('')
      : clean, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private renderParticlesLayer(): void {
    const { ctx } = this;

    for (const p of this.particles) {
      const t = p.life / p.maxLife;
      const alpha = Math.max(0, Math.min(1, t));
      const size = p.size * (0.5 + t * 0.8);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = this.hexToRgba(p.color, alpha);
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderLaunchPads(
    launchPads: LaunchPad[],
    draggingMarble: { type: MarbleType; position: Point } | null,
    hoveredType: MarbleType | null
  ): void {
    const { ctx, time } = this;

    for (const pad of launchPads) {
      const isDragging = draggingMarble?.type === pad.type;
      const isHovered = hoveredType === pad.type && !isDragging;
      const marbleColors = COLORS.MARBLE[pad.type];
      const pulse = Math.sin(time * 3 + pad.position.x * 0.02) * 0.08 + 1;

      ctx.save();

      if (!isDragging) {
        const glowAlpha = isHovered ? 0.35 : 0.18;
        ctx.shadowColor = marbleColors.glow;
        ctx.shadowBlur = isHovered ? 30 : 18;

        ctx.fillStyle = this.hexToRgba(marbleColors.start, glowAlpha * 0.3);
        ctx.beginPath();
        ctx.arc(pad.position.x, pad.position.y, pad.radius * 1.6 * pulse, 0, Math.PI * 2);
        ctx.fill();

        this.drawMarbleBody(
          pad.position.x,
          pad.position.y,
          pad.radius * (isHovered ? 1.1 : 1),
          marbleColors.start,
          marbleColors.end,
          marbleColors.glow,
          time
        );

        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.font = 'bold 9px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(COLORS.MARBLE[pad.type].name, pad.position.x, pad.position.y + pad.radius + 14);
      }

      ctx.restore();
    }
  }

  private drawMarbleBody(
    x: number,
    y: number,
    r: number,
    colorStart: string,
    colorEnd: string,
    glow: string,
    time: number
  ): void {
    const { ctx } = this;

    const grad = ctx.createRadialGradient(
      x - r * 0.35, y - r * 0.4, r * 0.1,
      x, y, r
    );
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.12, colorStart);
    grad.addColorStop(0.6, colorEnd);
    grad.addColorStop(1, this.darkenColor(colorEnd, 0.5));

    ctx.shadowColor = glow;
    ctx.shadowBlur = 20;

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    const highlightAngle = -Math.PI / 4 + Math.sin(time * 2) * 0.1;
    const hx = x + Math.cos(highlightAngle) * r * 0.35;
    const hy = y + Math.sin(highlightAngle) * r * 0.35;
    const hr = r * 0.25;
    const hlGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr);
    hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = hlGrad;
    ctx.beginPath();
    ctx.arc(hx, hy, hr, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.15, y - r * 0.6, r * 0.08, r * 0.15, highlightAngle, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, r - 0.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  private darkenColor(hex: string, factor: number): string {
    const clean = hex.replace('#', '');
    const bigint = parseInt(clean.length === 3
      ? clean.split('').map(c => c + c).join('')
      : clean, 16);
    let r = Math.round(((bigint >> 16) & 255) * factor);
    let g = Math.round(((bigint >> 8) & 255) * factor);
    let b = Math.round((bigint & 255) * factor);
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return `rgb(${r}, ${g}, ${b})`;
  }

  private renderMarbles(marbles: Marble[]): void {
    const { ctx, time } = this;

    for (const marble of marbles) {
      const colors = COLORS.MARBLE[marble.type];

      ctx.save();
      if (marble.isMoving) {
        const angle = Math.atan2(marble.velocity.y, marble.velocity.x);
        const trailLength = 36;

        for (let i = 5; i >= 1; i--) {
          const t = i / 5;
          const tx = marble.position.x - Math.cos(angle) * trailLength * t;
          const ty = marble.position.y - Math.sin(angle) * trailLength * t;
          const tr = marble.radius * (1 - t * 0.7);
          ctx.globalAlpha = t * 0.35;
          ctx.fillStyle = this.hexToRgba(colors.start, 0.6 * t);
          ctx.beginPath();
          ctx.arc(tx, ty, tr, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      this.drawMarbleBody(
        marble.position.x,
        marble.position.y,
        marble.radius,
        colors.start,
        colors.end,
        colors.glow,
        time + marble.position.x * 0.01
      );

      ctx.restore();
    }
  }

  private renderDraggingMarble(dragging: { type: MarbleType; position: Point }): void {
    const { ctx, time } = this;
    const colors = COLORS.MARBLE[dragging.type];
    const r = CONFIG.MARBLE_RADIUS;

    ctx.save();
    ctx.globalAlpha = 0.85;

    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 40;

    this.drawMarbleBody(
      dragging.position.x,
      dragging.position.y,
      r,
      colors.start,
      colors.end,
      colors.glow,
      time
    );

    ctx.restore();

    ctx.save();
    ctx.strokeStyle = this.hexToRgba(colors.start, 0.6);
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(dragging.position.x, dragging.position.y, r + 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  private renderVignetteOverlay(): void {
    const { ctx, canvas, time } = this;
    const w = canvas.width;
    const h = canvas.height;

    ctx.save();
    const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.75);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(0.7, 'rgba(0, 0, 0, 0.18)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = `rgba(0, 212, 255, ${0.015 + Math.sin(time * 0.8) * 0.005})`;
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(0, ((time * 180 + i * 240) % h), w, 1);
    }

    ctx.restore();
  }

  public clear(): void {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  public clearAllParticles(): void {
    this.particles = [];
  }
}
