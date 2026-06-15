import { Network, Trajectory, Connection, Node } from './network';

export interface ControlPanelState {
  speedMultiplier: number;
  colorMode: 'gradient' | 'random';
  clearButtonHover: boolean;
  panelHover: boolean;
  colorModeTransition: number;
}

function hsvToRgb(h: number, s: number, v: number): string {
  const sNorm = s / 100;
  const vNorm = v / 100;
  const c = vNorm * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vNorm - c;
  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }

  return `rgb(${Math.round((r + m) * 255)}, ${Math.round((g + m) * 255)}, ${Math.round((b + m) * 255)})`;
}

function hsvToRgba(h: number, s: number, v: number, a: number): string {
  const sNorm = s / 100;
  const vNorm = v / 100;
  const c = vNorm * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vNorm - c;
  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }

  return `rgba(${Math.round((r + m) * 255)}, ${Math.round((g + m) * 255)}, ${Math.round((b + m) * 255)}, ${a})`;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  public width: number;
  public height: number;
  public globalHueOffset: number;
  private colorCycleStartTime: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.globalHueOffset = 0;
    this.colorCycleStartTime = performance.now();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  clearBackground(): void {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    const cycleTime = (performance.now() - this.colorCycleStartTime) / 6000;
    this.globalHueOffset = (cycleTime % 1) * 360;
  }

  private getCycledHue(baseHue: number): number {
    return (baseHue + this.globalHueOffset) % 360;
  }

  drawTrajectory(trajectory: Trajectory): void {
    if (trajectory.points.length < 2) return;

    const ctx = this.ctx;
    const points = trajectory.points;

    ctx.save();
    ctx.globalAlpha = trajectory.opacity;

    ctx.shadowBlur = 15;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dist1 = i > 0 ? trajectory.segmentLengths.slice(0, i).reduce((a, b) => a + b, 0) : 0;
      const hue1 = this.getCycledHue(trajectory.getHueAtDistance(dist1));
      const dist2 = dist1 + trajectory.segmentLengths[i];
      const hue2 = this.getCycledHue(trajectory.getHueAtDistance(dist2));

      const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
      gradient.addColorStop(0, hsvToRgb(hue1, 80, 100));
      gradient.addColorStop(1, hsvToRgb(hue2, 80, 100));

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = hsvToRgba(hue1, 80, 100, 0.5);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
    this.drawTrajectoryLightPoints(trajectory);

    ctx.restore();
  }

  private drawTrajectoryLightPoints(trajectory: Trajectory): void {
    if (trajectory.totalLength === 0) return;
    const ctx = this.ctx;

    for (const lp of trajectory.lightPoints) {
      const distance = lp.progress * trajectory.totalLength;
      const point = trajectory.getPointAtDistance(distance);
      const hue = this.getCycledHue(trajectory.getHueAtDistance(distance));
      const size = lp.getCurrentSize();

      const glowGradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, size * 3);
      glowGradient.addColorStop(0, hsvToRgba(hue, 90, 100, 0.8));
      glowGradient.addColorStop(0.5, hsvToRgba(hue, 80, 100, 0.3));
      glowGradient.addColorStop(1, hsvToRgba(hue, 70, 100, 0));

      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(point.x, point.y, size * 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = hsvToRgb(hue, 100, 100);
      ctx.beginPath();
      ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawConnection(connection: Connection): void {
    const ctx = this.ctx;
    const nodeA = connection.nodeA;
    const nodeB = connection.nodeB;

    const progress = connection.growthProgress;
    const growT = progress;
    const endX = nodeA.x + (nodeB.x - nodeA.x) * growT;
    const endY = nodeA.y + (nodeB.y - nodeA.y) * growT;

    const hueA = this.getCycledHue(nodeA.color.h);
    const hueB = this.getCycledHue(nodeB.color.h);
    const mixedHue = this.getCycledHue(connection.color.h);

    const highlightBoost = connection.highlightIntensity;

    ctx.save();

    const baseAlpha = 0.5 + highlightBoost * 0.4;
    ctx.globalAlpha = baseAlpha;

    ctx.shadowBlur = 8 + highlightBoost * 10;
    const gradient = ctx.createLinearGradient(nodeA.x, nodeA.y, endX, endY);
    gradient.addColorStop(0, hsvToRgba(hueA, 70, 90, 1));
    gradient.addColorStop(1, hsvToRgba(hueB, 70, 90, 1));

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1 + highlightBoost * 1.5;
    ctx.lineCap = 'round';
    ctx.shadowColor = hsvToRgba(mixedHue, 80, 100, 0.6);

    ctx.beginPath();
    ctx.moveTo(nodeA.x, nodeA.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.shadowBlur = 0;

    if (progress >= 0.5) {
      this.drawConnectionLightPoints(connection, growT);
    }

    ctx.restore();
  }

  private drawConnectionLightPoints(connection: Connection, growT: number): void {
    const ctx = this.ctx;

    for (const lp of connection.lightPoints) {
      const effectiveProgress = connection.bidirectional
        ? (lp.speed > 0 ? lp.progress : 1 - lp.progress)
        : (lp.speed > 0 ? lp.progress : 1 - lp.progress);

      if (effectiveProgress > growT) continue;

      const point = connection.getPointAtProgress(effectiveProgress);
      const t = effectiveProgress;
      const hue = this.getCycledHue(connection.nodeA.color.h + (connection.nodeB.color.h - connection.nodeA.color.h) * t);
      const size = lp.getCurrentSize();

      const glowGradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, size * 2.5);
      glowGradient.addColorStop(0, hsvToRgba(hue, 90, 100, 0.7));
      glowGradient.addColorStop(1, hsvToRgba(hue, 70, 100, 0));

      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(point.x, point.y, size * 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = hsvToRgb(hue, 100, 100);
      ctx.beginPath();
      ctx.arc(point.x, point.y, size * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawNode(node: Node, hovered: boolean = false): void {
    const ctx = this.ctx;
    const hue = this.getCycledHue(node.color.h);
    const scale = hovered ? Math.max(node.hoverScale, 1.8) : node.hoverScale;
    const baseSize = node.isEndpoint ? 5 : 3;
    const size = baseSize * scale;

    if (hovered && node.hoverScale < 2) {
      node.hoverScale = Math.min(2, node.hoverScale + 0.1);
    }

    const glowGradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, size * 4);
    glowGradient.addColorStop(0, hsvToRgba(hue, 90, 100, 0.6));
    glowGradient.addColorStop(1, hsvToRgba(hue, 70, 100, 0));

    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(node.x, node.y, size * 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = hsvToRgb(hue, 100, 100);
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
    ctx.fill();

    if (node.isEndpoint) {
      ctx.strokeStyle = hsvToRgba(hue, 80, 100, 0.4);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(node.x, node.y, size * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawRipple(node: Node): void {
    if (node.ripplePhase === null) return;

    const ctx = this.ctx;
    const t = node.ripplePhase;
    const hue = this.getCycledHue(node.color.h);
    const maxRadius = 120;
    const radius = maxRadius * t;
    const alpha = 1 - t;

    const colors = [hue, (hue + 60) % 360, (hue + 120) % 360, (hue + 180) % 360];

    for (let i = 0; i < 3; i++) {
      const ringRadius = radius - i * 15;
      if (ringRadius < 0) continue;
      const ringAlpha = alpha * (1 - i * 0.3);
      const ringHue = colors[i];

      ctx.strokeStyle = hsvToRgba(ringHue, 80, 100, ringAlpha * 0.6);
      ctx.lineWidth = 3 - i;
      ctx.beginPath();
      ctx.arc(node.x, node.y, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    const innerGlow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius);
    innerGlow.addColorStop(0, hsvToRgba(hue, 90, 100, alpha * 0.15));
    innerGlow.addColorStop(1, hsvToRgba(hue, 70, 100, 0));

    ctx.fillStyle = innerGlow;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  drawFadeAnimation(network: Network): void {
    if (!network.isFading || !network.fadeCenter) return;

    const ctx = this.ctx;
    const center = network.fadeCenter;
    const radius = network.fadeRadius;

    const gradient = ctx.createRadialGradient(center.x, center.y, Math.max(0, radius - 100), center.x, center.y, radius);
    gradient.addColorStop(0, 'rgba(10, 10, 26, 0)');
    gradient.addColorStop(0.7, 'rgba(10, 10, 26, 0.8)');
    gradient.addColorStop(1, 'rgba(26, 26, 46, 1)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    const waveHue = this.getCycledHue(200);
    ctx.strokeStyle = hsvToRgba(waveHue, 80, 100, 0.6);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawControlPanel(state: ControlPanelState): void {
    const ctx = this.ctx;
    const panelX = 24;
    const panelY = this.height - 180;
    const panelW = 260;
    const panelH = 156;
    const radius = 18;

    ctx.save();

    this.drawGlassPanel(panelX, panelY, panelW, panelH, radius);

    const hue1 = this.getCycledHue(190);
    const hue2 = this.getCycledHue(280);

    this.drawClearButton(panelX + 24, panelY + 26, 48, hue1, state.clearButtonHover);
    this.drawSpeedSlider(panelX + 90, panelY + 40, 146, panelW, state.speedMultiplier, hue1, hue2);
    this.drawColorModeToggle(panelX + 24, panelY + 100, panelW - 48, state.colorMode, hue1, hue2, state.colorModeTransition);

    ctx.restore();
  }

  private drawGlassPanel(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;

    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    for (let i = 0; i < h; i += 4) {
      ctx.fillRect(x, y + i, w, 2);
    }
    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const hue = this.getCycledHue(220);
    ctx.shadowBlur = 20;
    ctx.shadowColor = hsvToRgba(hue, 60, 80, 0.15);
    ctx.strokeStyle = hsvToRgba(hue, 40, 70, 0.2);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  private drawClearButton(x: number, y: number, size: number, hue: number, hover: boolean): void {
    const ctx = this.ctx;
    const cx = x + size / 2;
    const cy = y + size / 2;
    const r = size / 2;
    const scale = hover ? 1.1 : 1;

    const glowR = r * scale * 1.8;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
    glow.addColorStop(0, hsvToRgba(hue, 80, 100, hover ? 0.4 : 0.2));
    glow.addColorStop(1, hsvToRgba(hue, 70, 100, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
    ctx.fillStyle = hover ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.06)';
    ctx.fill();
    ctx.strokeStyle = hsvToRgba(hue, 70, 90, 0.7);
    ctx.lineWidth = 2;
    ctx.stroke();

    const iconR = r * 0.4 * scale;
    ctx.strokeStyle = hsvToRgb(hue, 80, 100);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - iconR, cy - iconR);
    ctx.lineTo(cx + iconR, cy + iconR);
    ctx.moveTo(cx + iconR, cy - iconR);
    ctx.lineTo(cx - iconR, cy + iconR);
    ctx.stroke();
  }

  private drawSpeedSlider(x: number, y: number, w: number, _panelW: number, value: number, hue1: number, hue2: number): void {
    const ctx = this.ctx;
    const trackH = 4;
    const trackY = y + 14;

    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillStyle = hsvToRgba(hue1, 50, 90, 0.8);
    ctx.fillText('光点速度', x, y);

    const displayVal = value.toFixed(1) + 'x';
    ctx.textAlign = 'right';
    ctx.fillStyle = hsvToRgb(hue2, 70, 100);
    ctx.fillText(displayVal, x + w, y);
    ctx.textAlign = 'left';

    const trackGrad = ctx.createLinearGradient(x, trackY, x + w, trackY);
    trackGrad.addColorStop(0, hsvToRgba(hue1, 60, 80, 0.3));
    trackGrad.addColorStop(1, hsvToRgba(hue2, 60, 80, 0.3));
    ctx.fillStyle = trackGrad;
    ctx.beginPath();
    ctx.roundRect(x, trackY, w, trackH, trackH / 2);
    ctx.fill();

    const t = (value - 0.5) / 2.5;
    const fillW = w * t;
    const fillGrad = ctx.createLinearGradient(x, trackY, x + fillW, trackY);
    fillGrad.addColorStop(0, hsvToRgb(hue1, 70, 100));
    fillGrad.addColorStop(1, hsvToRgb(hue2, 70, 100));
    ctx.fillStyle = fillGrad;
    ctx.beginPath();
    ctx.roundRect(x, trackY, fillW, trackH, trackH / 2);
    ctx.fill();

    const handleX = x + fillW;
    const handleR = 9;

    const handleGlow = ctx.createRadialGradient(handleX, trackY + trackH / 2, 0, handleX, trackY + trackH / 2, handleR * 2);
    handleGlow.addColorStop(0, hsvToRgba(hue2, 80, 100, 0.5));
    handleGlow.addColorStop(1, hsvToRgba(hue2, 70, 100, 0));
    ctx.fillStyle = handleGlow;
    ctx.beginPath();
    ctx.arc(handleX, trackY + trackH / 2, handleR * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = hsvToRgb(hue2, 90, 100);
    ctx.beginPath();
    ctx.arc(handleX, trackY + trackH / 2, handleR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(handleX - 2, trackY + trackH / 2 - 2, handleR * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawColorModeToggle(
    x: number, y: number, w: number,
    mode: 'gradient' | 'random',
    hue1: number, hue2: number,
    transition: number
  ): void {
    const ctx = this.ctx;
    const toggleW = 52;
    const toggleH = 26;
    const toggleX = x + w - toggleW;
    const toggleY = y + 2;

    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillStyle = hsvToRgba(hue1, 50, 90, 0.8);
    ctx.fillText('颜色模式', x, y + 20);

    const modeLabel = mode === 'gradient' ? '渐变色' : '随机色';
    ctx.fillStyle = hsvToRgb(hue2, 70, 100);
    ctx.textAlign = 'right';
    ctx.fillText(modeLabel, toggleX - 10, y + 20);
    ctx.textAlign = 'left';

    const t = transition;
    const bgGrad = ctx.createLinearGradient(toggleX, toggleY, toggleX + toggleW, toggleY);
    bgGrad.addColorStop(0, hsvToRgba(hue1, 50, 80, 0.2 + t * 0.2));
    bgGrad.addColorStop(1, hsvToRgba(hue2, 50, 80, 0.2 + t * 0.2));
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.roundRect(toggleX, toggleY, toggleW, toggleH, toggleH / 2);
    ctx.fill();

    ctx.strokeStyle = hsvToRgba(mode === 'gradient' ? hue1 : hue2, 60, 90, 0.6);
    ctx.lineWidth = 1;
    ctx.stroke();

    const knobR = toggleH * 0.38;
    const knobMinX = toggleX + knobR + 3;
    const knobMaxX = toggleX + toggleW - knobR - 3;
    const knobX = mode === 'gradient' ? knobMinX + (knobMaxX - knobMinX) * t : knobMaxX - (knobMaxX - knobMinX) * (1 - t);
    const knobY = toggleY + toggleH / 2;

    const knobGlow = ctx.createRadialGradient(knobX, knobY, 0, knobX, knobY, knobR * 2);
    const knobHue = mode === 'gradient' ? hue1 + (hue2 - hue1) * t : hue2 - (hue2 - hue1) * (1 - t);
    knobGlow.addColorStop(0, hsvToRgba(knobHue, 80, 100, 0.6));
    knobGlow.addColorStop(1, hsvToRgba(knobHue, 70, 100, 0));
    ctx.fillStyle = knobGlow;
    ctx.beginPath();
    ctx.arc(knobX, knobY, knobR * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = hsvToRgb(knobHue, 90, 100);
    ctx.beginPath();
    ctx.arc(knobX, knobY, knobR, 0, Math.PI * 2);
    ctx.fill();
  }

  isPointInClearButton(px: number, py: number): boolean {
    const panelY = this.height - 180;
    const cx = 24 + 24;
    const cy = panelY + 26 + 24;
    const r = 28;
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy <= r * r;
  }

  isPointInSpeedSlider(px: number, py: number): { hit: boolean; x: number; width: number } {
    const panelY = this.height - 180;
    const x = 90 + 24;
    const y = panelY + 40 + 14 - 10;
    const w = 146;
    const h = 24;
    return {
      hit: px >= x && px <= x + w && py >= y && py <= y + h,
      x,
      width: w,
    };
  }

  isPointInColorToggle(px: number, py: number): boolean {
    const panelY = this.height - 180;
    const x = 24 + 260 - 52 - 24;
    const y = panelY + 100 + 2 - 5;
    const w = 52 + 24;
    const h = 36;
    return px >= x - 24 && px <= x + w && py >= y && py <= y + h;
  }

  isPointInPanel(px: number, py: number): boolean {
    const panelX = 24;
    const panelY = this.height - 180;
    const panelW = 260;
    const panelH = 156;
    return px >= panelX && px <= panelX + panelW && py >= panelY && py <= panelY + panelH;
  }

  render(network: Network, hoveredNode: Node | null, controlState: ControlPanelState): void {
    this.clearBackground();

    for (const connection of network.connections) {
      this.drawConnection(connection);
    }

    for (const trajectory of network.trajectories) {
      this.drawTrajectory(trajectory);
    }

    for (const node of network.nodes) {
      this.drawRipple(node);
    }

    for (const node of network.nodes) {
      this.drawNode(node, hoveredNode?.id === node.id);
    }

    this.drawFadeAnimation(network);
    this.drawControlPanel(controlState);
  }
}
