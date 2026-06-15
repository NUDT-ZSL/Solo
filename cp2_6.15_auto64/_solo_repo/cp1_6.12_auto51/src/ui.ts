import { SonarDisplayData, MapMarker } from './sonar';
import { PlayerDisplayData } from './player';

export interface MissionData {
  discovered: number;
  total: number;
  complete: boolean;
}

const SONAR_DISPLAY_SIZE = 260;
const MINIMAP_SIZE = 200;

const PANEL_BG = 'rgba(4, 18, 37, 0.80)';
const PANEL_BORDER = '1px solid rgba(0, 170, 255, 0.35)';
const TEXT_COLOR = '#b0e0f0';
const TEXT_GLOW = '0 0 8px rgba(0, 200, 255, 0.4)';
const FONT_FAMILY = 'Consolas, "Microsoft YaHei", monospace';

export class UIManager {
  private container: HTMLElement;

  private sonarPanel: HTMLDivElement;
  private sonarCanvas: HTMLCanvasElement;
  private sonarCtx: CanvasRenderingContext2D;
  private sonarLabel: HTMLDivElement;

  private minimapPanel: HTMLDivElement;
  private minimapCanvas: HTMLCanvasElement;
  private minimapCtx: CanvasRenderingContext2D;
  private minimapLabel: HTMLDivElement;

  private statusPanel: HTMLDivElement;
  private depthLabel: HTMLSpanElement;
  private depthValue: HTMLSpanElement;
  private depthBarContainer: HTMLDivElement;
  private depthBar: HTMLDivElement;
  private cooldownLabel: HTMLSpanElement;
  private cooldownCanvas: HTMLCanvasElement;
  private cooldownCtx: CanvasRenderingContext2D;

  private missionPanel: HTMLDivElement;
  private missionText: HTMLSpanElement;
  private missionSubText: HTMLSpanElement;

  private victoryOverlay: HTMLDivElement | null = null;
  private victoryShown: boolean = false;

  private worldSize: number = 100;
  private exploredPositions: Set<string> = new Set();

  constructor() {
    this.container = document.getElementById('ui-overlay')!;

    this.sonarPanel = this.createPanel('sonar-panel', 'absolute', { top: '16px', left: '16px' });
    this.sonarLabel = this.createLabel('SONAR 声纳扫描');
    this.sonarPanel.appendChild(this.sonarLabel);

    this.sonarCanvas = document.createElement('canvas');
    this.sonarCanvas.width = SONAR_DISPLAY_SIZE;
    this.sonarCanvas.height = SONAR_DISPLAY_SIZE;
    this.sonarCanvas.style.cssText = `
      display: block;
      border-radius: 4px;
      background: #000;
      border: 1px solid rgba(0, 150, 200, 0.3);
    `;
    this.sonarPanel.appendChild(this.sonarCanvas);
    this.sonarCtx = this.sonarCanvas.getContext('2d')!;

    this.minimapPanel = this.createPanel('minimap-panel', 'absolute', { top: '16px', right: '16px' });
    this.minimapLabel = this.createLabel('MAP 区域地图');
    this.minimapPanel.appendChild(this.minimapLabel);

    this.minimapCanvas = document.createElement('canvas');
    this.minimapCanvas.width = MINIMAP_SIZE;
    this.minimapCanvas.height = MINIMAP_SIZE;
    this.minimapCanvas.style.cssText = `
      display: block;
      border-radius: 50%;
      border: 2px solid rgba(0, 170, 255, 0.5);
      box-shadow: 0 0 15px rgba(0, 170, 255, 0.2), inset 0 0 20px rgba(0, 50, 100, 0.3);
    `;
    this.minimapPanel.appendChild(this.minimapCanvas);
    this.minimapCtx = this.minimapCanvas.getContext('2d')!;

    this.statusPanel = this.createPanel('status-panel', 'absolute', { bottom: '16px', left: '16px' });
    this.statusPanel.style.width = '200px';

    const depthRow = document.createElement('div');
    depthRow.style.cssText = 'margin-bottom: 10px;';

    this.depthLabel = document.createElement('span');
    this.depthLabel.textContent = '深度';
    this.depthLabel.style.cssText = `
      font-size: 12px;
      color: ${TEXT_COLOR};
      opacity: 0.7;
      margin-right: 8px;
    `;
    depthRow.appendChild(this.depthLabel);

    this.depthValue = document.createElement('span');
    this.depthValue.textContent = '0.0m';
    this.depthValue.style.cssText = `
      font-size: 16px;
      color: ${TEXT_COLOR};
      font-weight: bold;
      text-shadow: ${TEXT_GLOW};
    `;
    depthRow.appendChild(this.depthValue);
    this.statusPanel.appendChild(depthRow);

    this.depthBarContainer = document.createElement('div');
    this.depthBarContainer.style.cssText = `
      width: 100%;
      height: 8px;
      background: rgba(0, 40, 80, 0.6);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 14px;
      border: 1px solid rgba(0, 150, 200, 0.2);
    `;
    this.depthBar = document.createElement('div');
    this.depthBar.style.cssText = `
      height: 100%;
      width: 0%;
      background: linear-gradient(to right, #0066aa, #00ccff);
      border-radius: 4px;
      transition: width 0.2s ease;
      box-shadow: 0 0 8px rgba(0, 200, 255, 0.6);
    `;
    this.depthBarContainer.appendChild(this.depthBar);
    this.statusPanel.appendChild(this.depthBarContainer);

    const cooldownRow = document.createElement('div');
    cooldownRow.style.cssText = 'display: flex; align-items: center; gap: 12px;';

    this.cooldownLabel = document.createElement('span');
    this.cooldownLabel.textContent = '声纳冷却';
    this.cooldownLabel.style.cssText = `
      font-size: 12px;
      color: ${TEXT_COLOR};
      opacity: 0.7;
    `;
    cooldownRow.appendChild(this.cooldownLabel);

    this.cooldownCanvas = document.createElement('canvas');
    this.cooldownCanvas.width = 40;
    this.cooldownCanvas.height = 40;
    this.cooldownCanvas.style.cssText = 'width: 40px; height: 40px;';
    cooldownRow.appendChild(this.cooldownCanvas);
    this.cooldownCtx = this.cooldownCanvas.getContext('2d')!;

    this.statusPanel.appendChild(cooldownRow);

    this.missionPanel = this.createPanel('mission-panel', 'absolute', { bottom: '16px', right: '16px' });
    this.missionPanel.style.width = '200px';
    this.missionPanel.style.textAlign = 'center';

    this.missionText = document.createElement('div');
    this.missionText.textContent = '已发现沉船: 0/0';
    this.missionText.style.cssText = `
      font-size: 16px;
      color: ${TEXT_COLOR};
      font-weight: bold;
      text-shadow: ${TEXT_GLOW};
      margin-bottom: 4px;
    `;
    this.missionPanel.appendChild(this.missionText);

    this.missionSubText = document.createElement('div');
    this.missionSubText.textContent = '空格键发射声纳标记沉船';
    this.missionSubText.style.cssText = `
      font-size: 11px;
      color: ${TEXT_COLOR};
      opacity: 0.6;
    `;
    this.missionPanel.appendChild(this.missionSubText);

    this.addInstructions();
  }

  private createPanel(id: string, position: string, posStyles: Record<string, string>): HTMLDivElement {
    const panel = document.createElement('div');
    panel.id = id;
    panel.style.cssText = `
      position: ${position};
      background: ${PANEL_BG};
      border: ${PANEL_BORDER};
      border-radius: 8px;
      padding: 12px;
      color: ${TEXT_COLOR};
      font-family: ${FONT_FAMILY};
      box-shadow: 0 4px 20px rgba(0, 20, 40, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(4px);
      pointer-events: none;
    `;
    for (const [key, value] of Object.entries(posStyles)) {
      (panel.style as any)[key] = value;
    }
    this.container.appendChild(panel);
    return panel;
  }

  private createLabel(text: string): HTMLDivElement {
    const label = document.createElement('div');
    label.textContent = text;
    label.style.cssText = `
      font-size: 11px;
      color: ${TEXT_COLOR};
      opacity: 0.6;
      margin-bottom: 8px;
      letter-spacing: 1px;
    `;
    return label;
  }

  private addInstructions(): void {
    const instructions = document.createElement('div');
    instructions.style.cssText = `
      position: absolute;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      background: ${PANEL_BG};
      border: ${PANEL_BORDER};
      border-radius: 8px;
      padding: 8px 16px;
      color: ${TEXT_COLOR};
      font-family: ${FONT_FAMILY};
      font-size: 12px;
      text-align: center;
      opacity: 0.7;
      pointer-events: none;
    `;
    instructions.innerHTML = '鼠标移动控制方向 &nbsp;|&nbsp; 按住左键前进 &nbsp;|&nbsp; 空格键发射声纳脉冲';
    this.container.appendChild(instructions);
  }

  setWorldSize(size: number): void {
    this.worldSize = size;
  }

  updateSonarDisplay(data: SonarDisplayData): void {
    const ctx = this.sonarCtx;
    const w = this.sonarCanvas.width;
    const h = this.sonarCanvas.height;
    const cx = w / 2;
    const cy = h - 15;
    const maxR = h - 25;

    ctx.fillStyle = '#000508';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(0, 255, 100, 0.12)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 5; i++) {
      const r = (maxR * i) / 5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI * 2 / 3, -Math.PI / 3);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(0, 255, 100, 0.15)';
    const angleLines = 5;
    for (let i = 0; i <= angleLines; i++) {
      const angle = -Math.PI * 2 / 3 + (Math.PI / 3) * (i / angleLines);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR);
      ctx.stroke();
    }

    for (const ring of data.pulseRings) {
      const r = (ring.radius / 15) * maxR;
      if (r <= maxR) {
        ctx.strokeStyle = `rgba(0, 255, 120, ${ring.opacity * 0.6})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, -Math.PI * 2 / 3, -Math.PI / 3);
        ctx.stroke();
      }
    }

    const sweepAngle = -Math.PI / 2 + data.sweepAngle;
    const sweepGrad = ctx.createLinearGradient(
      cx, cy,
      cx + Math.cos(sweepAngle) * maxR,
      cy + Math.sin(sweepAngle) * maxR
    );
    sweepGrad.addColorStop(0, 'rgba(0, 255, 100, 0.8)');
    sweepGrad.addColorStop(1, 'rgba(0, 255, 100, 0)');
    ctx.strokeStyle = sweepGrad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweepAngle) * maxR, cy + Math.sin(sweepAngle) * maxR);
    ctx.stroke();

    for (const echo of data.echoes) {
      const dist = (echo.distance / 15) * maxR;
      const angle = -Math.PI / 2 + echo.angle;
      const ex = cx + Math.cos(angle) * dist;
      const ey = cy + Math.sin(angle) * dist;

      if (echo.type === 'shipwreck') {
        const alpha = echo.strength * 0.9;
        ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
        ctx.beginPath();
        ctx.arc(ex, ey, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 255, 150, ${alpha * 0.5})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (echo.type === 'reef') {
        const alpha = echo.strength * 0.7;
        ctx.fillStyle = `rgba(100, 255, 120, ${alpha})`;
        ctx.beginPath();
        ctx.arc(ex, ey, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const alpha = echo.strength * 0.5;
        ctx.fillStyle = `rgba(255, 255, 120, ${alpha})`;
        ctx.beginPath();
        ctx.arc(ex, ey, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.strokeStyle = 'rgba(0, 255, 100, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, maxR, -Math.PI * 2 / 3, -Math.PI / 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(-Math.PI * 2 / 3) * maxR, cy + Math.sin(-Math.PI * 2 / 3) * maxR);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + Math.cos(-Math.PI / 3) * maxR, cy + Math.sin(-Math.PI / 3) * maxR);
    ctx.stroke();

    const distanceLabels = ['3', '6', '9', '12', '15'];
    ctx.fillStyle = 'rgba(0, 255, 100, 0.4)';
    ctx.font = '9px Consolas';
    for (let i = 0; i < distanceLabels.length; i++) {
      const r = (maxR * (i + 1)) / 5;
      ctx.fillText(distanceLabels[i], cx + 4, cy - r + 3);
    }
  }

  updateMinimap(playerData: PlayerDisplayData, markers: MapMarker[]): void {
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = w / 2 - 4;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    bgGrad.addColorStop(0, '#051a2e');
    bgGrad.addColorStop(1, '#02101e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(0, 100, 180, 0.15)';
    ctx.lineWidth = 0.5;
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, (r * i) / 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.stroke();

    const scale = (r * 2) / this.worldSize;
    const now = performance.now() / 1000;

    for (const marker of markers) {
      const mx = cx + marker.position.x * scale;
      const my = cy + marker.position.z * scale;
      const age = now - marker.timestamp;
      const alpha = Math.max(0, 1 - age / 5);

      if (marker.type === 'shipwreck') {
        ctx.fillStyle = `rgba(255, 215, 0, ${alpha * 0.9})`;
        ctx.beginPath();
        ctx.arc(mx, my, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 255, 200, ${alpha * 0.5})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (marker.type === 'reef') {
        ctx.fillStyle = `rgba(100, 200, 100, ${alpha * 0.7})`;
        ctx.beginPath();
        ctx.arc(mx, my, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(0, 180, 255, ${alpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(mx, my, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const px = cx + playerData.position.x * scale;
    const py = cy + playerData.position.z * scale;

    const viewAngle = (120 * Math.PI) / 180;
    const viewDist = (15 / this.worldSize) * (r * 2);
    const viewGrad = ctx.createRadialGradient(px, py, 0, px, py, viewDist);
    viewGrad.addColorStop(0, 'rgba(0, 200, 255, 0.15)');
    viewGrad.addColorStop(1, 'rgba(0, 200, 255, 0)');
    ctx.fillStyle = viewGrad;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(
      px, py, viewDist,
      -Math.PI / 2 + playerData.direction - viewAngle / 2,
      -Math.PI / 2 + playerData.direction + viewAngle / 2
    );
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(playerData.direction - Math.PI / 2);
    ctx.fillStyle = '#00ffcc';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(-4, 5);
    ctx.lineTo(0, 2);
    ctx.lineTo(4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 255, 200, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    ctx.restore();

    ctx.strokeStyle = 'rgba(0, 170, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  updateStatus(playerData: PlayerDisplayData): void {
    const depth = playerData.depth;
    this.depthValue.textContent = `${depth.toFixed(1)}m`;
    const maxDepth = 20;
    const depthPercent = Math.min(100, (depth / maxDepth) * 100);
    this.depthBar.style.width = `${depthPercent}%`;

    const ctx = this.cooldownCtx;
    const size = 40;
    const center = size / 2;
    const radius = 15;

    ctx.clearRect(0, 0, size, size);

    ctx.strokeStyle = 'rgba(0, 80, 140, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.stroke();

    if (playerData.cooldown > 0) {
      const progress = 1 - playerData.cooldown / playerData.cooldownMax;
      ctx.strokeStyle = '#00aacc';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(center, center, radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(0, 180, 255, 0.1)';
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.strokeStyle = '#00ffaa';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#00ffaa';
      ctx.font = 'bold 11px Consolas';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('OK', center, center);

      const glowGrad = ctx.createRadialGradient(center, center, radius - 2, center, center, radius + 3);
      glowGrad.addColorStop(0, 'rgba(0, 255, 170, 0)');
      glowGrad.addColorStop(0.5, 'rgba(0, 255, 170, 0.3)');
      glowGrad.addColorStop(1, 'rgba(0, 255, 170, 0)');
      ctx.strokeStyle = glowGrad;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(center, center, radius + 1, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  updateMission(data: MissionData): void {
    this.missionText.textContent = `已发现沉船: ${data.discovered}/${data.total}`;

    if (data.discovered > 0) {
      const progress = data.discovered / data.total;
      this.missionText.style.color = progress >= 1 ? '#ffd700' : '#b0e0f0';
    }

    if (data.complete && !this.victoryShown) {
      this.victoryShown = true;
      this.showVictory();
    }
  }

  private showVictory(): void {
    this.victoryOverlay = document.createElement('div');
    this.victoryOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 100;
      background: radial-gradient(ellipse at center, rgba(0, 40, 80, 0.3) 0%, transparent 70%);
    `;

    const text = document.createElement('div');
    text.textContent = '探索完成';
    text.style.cssText = `
      color: #ffd700;
      font-size: 72px;
      font-weight: bold;
      font-family: ${FONT_FAMILY};
      text-shadow:
        0 0 20px rgba(255, 215, 0, 0.8),
        0 0 40px rgba(255, 215, 0, 0.5),
        0 0 80px rgba(255, 215, 0, 0.3);
      animation: victoryAnim 3.5s forwards;
      letter-spacing: 8px;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes victoryAnim {
        0% {
          transform: scale(0.2);
          opacity: 0;
        }
        20% {
          transform: scale(1.15);
          opacity: 1;
        }
        35% {
          transform: scale(0.95);
        }
        50% {
          transform: scale(1.05);
        }
        65% {
          transform: scale(1.0);
          opacity: 1;
        }
        100% {
          transform: scale(2.5);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);

    this.victoryOverlay.appendChild(text);
    this.container.appendChild(this.victoryOverlay);

    setTimeout(() => {
      if (this.victoryOverlay && this.victoryOverlay.parentNode) {
        this.victoryOverlay.parentNode.removeChild(this.victoryOverlay);
        this.victoryOverlay = null;
      }
    }, 4000);
  }

  update(
    sonarData: SonarDisplayData,
    playerData: PlayerDisplayData,
    missionData: MissionData,
    markers: MapMarker[]
  ): void {
    this.updateSonarDisplay(sonarData);
    this.updateMinimap(playerData, markers);
    this.updateStatus(playerData);
    this.updateMission(missionData);
  }
}
