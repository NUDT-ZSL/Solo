import { SonarDisplayData, MapMarker } from './sonar';
import { PlayerDisplayData } from './player';

export interface MissionData {
  discovered: number;
  total: number;
  complete: boolean;
}

const SONAR_DISPLAY_SIZE = 240;
const MINIMAP_SIZE = 180;
const PANEL_STYLE = 'position:absolute;background:rgba(4,18,37,0.80);border-radius:8px;border:1px solid rgba(0,170,255,0.35);color:#b0e0f0;font-family:Consolas,monospace;font-size:13px;padding:10px;pointer-events:none;';

export class UIManager {
  private container: HTMLElement;
  private sonarCanvas: HTMLCanvasElement;
  private sonarCtx: CanvasRenderingContext2D;
  private minimapCanvas: HTMLCanvasElement;
  private minimapCtx: CanvasRenderingContext2D;
  private depthPanel: HTMLDivElement;
  private depthBar: HTMLDivElement;
  private depthValue: HTMLSpanElement;
  private cooldownRing: HTMLCanvasElement;
  private cooldownCtx: CanvasRenderingContext2D;
  private missionPanel: HTMLDivElement;
  private missionText: HTMLSpanElement;
  private victoryOverlay: HTMLDivElement | null = null;
  private victoryShown: boolean = false;

  private worldSize: number = 100;

  constructor() {
    this.container = document.getElementById('ui-overlay')!;

    this.sonarCanvas = document.createElement('canvas');
    this.sonarCanvas.width = SONAR_DISPLAY_SIZE;
    this.sonarCanvas.height = SONAR_DISPLAY_SIZE;
    this.sonarCanvas.style.cssText = `position:absolute;top:12px;left:12px;border-radius:8px;border:1px solid rgba(0,170,255,0.3);`;
    this.container.appendChild(this.sonarCanvas);
    this.sonarCtx = this.sonarCanvas.getContext('2d')!;

    this.minimapCanvas = document.createElement('canvas');
    this.minimapCanvas.width = MINIMAP_SIZE;
    this.minimapCanvas.height = MINIMAP_SIZE;
    this.minimapCanvas.style.cssText = `position:absolute;top:12px;right:12px;border-radius:50%;border:2px solid rgba(0,170,255,0.4);overflow:hidden;`;
    this.container.appendChild(this.minimapCanvas);
    this.minimapCtx = this.minimapCanvas.getContext('2d')!;

    this.depthPanel = document.createElement('div');
    this.depthPanel.style.cssText = `${PANEL_STYLE}bottom:12px;left:12px;width:180px;height:100px;display:flex;flex-direction:column;gap:6px;`;

    const depthRow = document.createElement('div');
    depthRow.style.cssText = 'display:flex;align-items:center;gap:8px;';
    this.depthValue = document.createElement('span');
    this.depthValue.style.cssText = 'font-size:14px;min-width:80px;';
    this.depthValue.textContent = '深度: 0.0m';
    depthRow.appendChild(this.depthValue);

    const barContainer = document.createElement('div');
    barContainer.style.cssText = 'flex:1;height:60px;background:rgba(0,40,80,0.5);border-radius:4px;position:relative;overflow:hidden;border:1px solid rgba(0,170,255,0.2);';
    this.depthBar = document.createElement('div');
    this.depthBar.style.cssText = 'position:absolute;bottom:0;width:100%;background:linear-gradient(to top,#0055aa,#00bbff);border-radius:4px;transition:height 0.2s;';
    barContainer.appendChild(this.depthBar);
    depthRow.appendChild(barContainer);
    this.depthPanel.appendChild(depthRow);

    const cooldownRow = document.createElement('div');
    cooldownRow.style.cssText = 'display:flex;align-items:center;gap:8px;';
    const cooldownLabel = document.createElement('span');
    cooldownLabel.textContent = '声纳冷却';
    cooldownLabel.style.cssText = 'font-size:12px;';
    cooldownRow.appendChild(cooldownLabel);

    this.cooldownRing = document.createElement('canvas');
    this.cooldownRing.width = 36;
    this.cooldownRing.height = 36;
    this.cooldownRing.style.cssText = 'width:36px;height:36px;';
    cooldownRow.appendChild(this.cooldownRing);
    this.cooldownCtx = this.cooldownRing.getContext('2d')!;

    this.depthPanel.appendChild(cooldownRow);
    this.container.appendChild(this.depthPanel);

    this.missionPanel = document.createElement('div');
    this.missionPanel.style.cssText = `${PANEL_STYLE}bottom:12px;right:12px;width:180px;text-align:center;`;
    this.missionText = document.createElement('span');
    this.missionText.style.cssText = 'font-size:15px;font-weight:bold;';
    this.missionText.textContent = '已发现沉船: 0/0';
    this.missionPanel.appendChild(this.missionText);
    this.container.appendChild(this.missionPanel);
  }

  setWorldSize(size: number): void {
    this.worldSize = size;
  }

  updateSonarDisplay(data: SonarDisplayData): void {
    const ctx = this.sonarCtx;
    const w = this.sonarCanvas.width;
    const h = this.sonarCanvas.height;
    const cx = w / 2;
    const cy = h - 10;
    const maxR = h - 20;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(0,255,100,0.08)';
    ctx.lineWidth = 0.5;
    for (let r = maxR / 5; r <= maxR; r += maxR / 5) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI * 2 / 3, -Math.PI / 3);
      ctx.stroke();
    }

    for (let i = 0; i <= 4; i++) {
      const angle = -Math.PI * 2 / 3 + (Math.PI / 3) * i;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR);
      ctx.stroke();
    }

    const sweepAngle = -Math.PI * 2 / 3 + data.pulseProgress * Math.PI / 3;
    ctx.strokeStyle = 'rgba(0,255,100,0.6)';
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

      const alpha = echo.strength;
      if (echo.type === 'shipwreck') {
        ctx.fillStyle = `rgba(255,215,0,${alpha})`;
        ctx.beginPath();
        ctx.arc(ex, ey, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (echo.type === 'reef') {
        ctx.fillStyle = `rgba(100,255,100,${alpha * 0.7})`;
        ctx.beginPath();
        ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const yellowAlpha = alpha * 0.5;
        ctx.strokeStyle = `rgba(255,255,100,${yellowAlpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(ex, ey, 1.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.strokeStyle = 'rgba(0,255,100,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, maxR, -Math.PI * 2 / 3, -Math.PI / 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(-Math.PI * 2 / 3) * maxR, cy + Math.sin(-Math.PI * 2 / 3) * maxR);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + Math.cos(-Math.PI / 3) * maxR, cy + Math.sin(-Math.PI / 3) * maxR);
    ctx.stroke();
  }

  updateMinimap(playerData: PlayerDisplayData, markers: MapMarker[]): void {
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = w / 2 - 4;

    ctx.fillStyle = '#041225';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    ctx.strokeStyle = 'rgba(0,100,180,0.15)';
    ctx.lineWidth = 0.5;
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, (r * i) / 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    const scale = (r * 2) / this.worldSize;
    const px = cx + playerData.position.x * scale;
    const py = cy + playerData.position.z * scale;

    const now = performance.now() / 1000;
    for (const marker of markers) {
      const mx = cx + marker.position.x * scale;
      const my = cy + marker.position.z * scale;
      const age = now - marker.timestamp;
      const alpha = Math.max(0, 1 - age / 5) * 0.8;

      if (marker.type === 'shipwreck') {
        ctx.fillStyle = `rgba(255,215,0,${alpha})`;
        ctx.beginPath();
        ctx.arc(mx, my, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (marker.type === 'reef') {
        ctx.fillStyle = `rgba(100,200,100,${alpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(mx, my, 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(0,200,255,${alpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(mx, my, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = '#00ffcc';
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();

    const dirLen = 8;
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.sin(playerData.direction) * dirLen, py + Math.cos(playerData.direction) * dirLen);
    ctx.stroke();

    ctx.restore();

    ctx.strokeStyle = 'rgba(0,170,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  updateStatus(playerData: PlayerDisplayData): void {
    const depth = playerData.depth;
    this.depthValue.textContent = `深度: ${depth.toFixed(1)}m`;
    const maxDepth = 15;
    const barHeight = Math.min(100, (depth / maxDepth) * 100);
    this.depthBar.style.height = `${barHeight}%`;

    const ctx = this.cooldownCtx;
    const size = 36;
    const center = size / 2;
    const radius = 14;

    ctx.clearRect(0, 0, size, size);

    ctx.strokeStyle = 'rgba(0,100,180,0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.stroke();

    if (playerData.cooldown > 0) {
      const progress = 1 - playerData.cooldown / playerData.cooldownMax;
      ctx.strokeStyle = '#00ccff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(center, center, radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#00ffcc';
      ctx.font = '10px Consolas';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('OK', center, center);
    }
  }

  updateMission(data: MissionData): void {
    this.missionText.textContent = `已发现沉船: ${data.discovered}/${data.total}`;

    if (data.complete && !this.victoryShown) {
      this.victoryShown = true;
      this.showVictory();
    }
  }

  private showVictory(): void {
    this.victoryOverlay = document.createElement('div');
    this.victoryOverlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:100;';

    const text = document.createElement('div');
    text.textContent = '探索完成';
    text.style.cssText = 'color:#ffd700;font-size:48px;font-weight:bold;font-family:Consolas,monospace;text-shadow:0 0 20px rgba(255,215,0,0.8),0 0 40px rgba(255,215,0,0.4);animation:victoryAnim 3s forwards;';

    const style = document.createElement('style');
    style.textContent = `
      @keyframes victoryAnim {
        0% { transform: scale(0.3); opacity: 0; }
        30% { transform: scale(1.2); opacity: 1; }
        70% { transform: scale(1.0); opacity: 1; }
        100% { transform: scale(2.0); opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    this.victoryOverlay.appendChild(text);
    this.container.appendChild(this.victoryOverlay);

    setTimeout(() => {
      if (this.victoryOverlay && this.victoryOverlay.parentNode) {
        this.victoryOverlay.parentNode.removeChild(this.victoryOverlay);
      }
    }, 3500);
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
