import { Simulation } from './simulation';

interface SliderConfig {
  key: string;
  label: string;
  min: number;
  max: number;
  value: number;
  step: number;
  unit: string;
  angle: number;
}

export class UI {
  simulation: Simulation;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  controlPanelX: number;
  controlPanelY: number;
  controlPanelRadius: number;

  sliders: SliderConfig[];
  activeSlider: number | null;
  isDragging: boolean;

  constructor(canvas: HTMLCanvasElement, simulation: Simulation) {
    this.simulation = simulation;
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas 2D上下文');
    this.ctx = ctx;

    this.controlPanelRadius = 60;
    this.controlPanelX = 0;
    this.controlPanelY = 0;

    const params = simulation.getParams();
    this.sliders = [
      {
        key: 'brightness',
        label: '亮度',
        min: 0.3,
        max: 1.5,
        value: params.brightness,
        step: 0.01,
        unit: '',
        angle: -135,
      },
      {
        key: 'attractRadius',
        label: '吸引范围',
        min: 60,
        max: 200,
        value: params.attractRadius,
        step: 1,
        unit: 'px',
        angle: 0,
      },
      {
        key: 'fireflyCount',
        label: '数量',
        min: 100,
        max: 300,
        value: params.fireflyCount,
        step: 1,
        unit: '',
        angle: 135,
      },
    ];

    this.activeSlider = null;
    this.isDragging = false;

    this.updatePosition();
    this.bindEvents();
  }

  updatePosition(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.controlPanelX = rect.width - this.controlPanelRadius - 30;
    this.controlPanelY = rect.height - this.controlPanelRadius - 30;
  }

  bindEvents(): void {
    const onMouseDown = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.handlePointerDown(x, y);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isDragging) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.handlePointerMove(x, y);
    };

    const onMouseUp = () => {
      this.handlePointerUp();
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const t = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        this.handlePointerDown(t.clientX - rect.left, t.clientY - rect.top);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!this.isDragging || e.touches.length === 0) return;
      const t = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.handlePointerMove(t.clientX - rect.left, t.clientY - rect.top);
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      this.handlePointerUp();
    };

    this.canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    this.canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', onTouchEnd, { passive: false });

    window.addEventListener('resize', () => this.updatePosition());
  }

  private handlePointerDown(x: number, y: number): void {
    for (let i = 0; i < this.sliders.length; i++) {
      const handlePos = this.getSliderHandlePosition(i);
      const dx = x - handlePos.x;
      const dy = y - handlePos.y;
      if (Math.sqrt(dx * dx + dy * dy) < 12) {
        this.activeSlider = i;
        this.isDragging = true;
        return;
      }
    }

    const dx = x - this.controlPanelX;
    const dy = y - this.controlPanelY;
    if (Math.sqrt(dx * dx + dy * dy) <= this.controlPanelRadius + 10) {
      for (let i = 0; i < this.sliders.length; i++) {
        const slider = this.sliders[i];
        const angleRad = (slider.angle * Math.PI) / 180;
        const trackStartX = this.controlPanelX + Math.cos(angleRad) * (this.controlPanelRadius - 35);
        const trackStartY = this.controlPanelY + Math.sin(angleRad) * (this.controlPanelRadius - 35);
        const trackEndX = this.controlPanelX + Math.cos(angleRad) * (this.controlPanelRadius - 8);
        const trackEndY = this.controlPanelY + Math.sin(angleRad) * (this.controlPanelRadius - 8);

        const distToLine = this.pointToLineDistance(x, y, trackStartX, trackStartY, trackEndX, trackEndY);
        if (distToLine < 10) {
          this.activeSlider = i;
          this.isDragging = true;
          this.updateSliderValueFromPosition(i, x, y);
          return;
        }
      }
    }
  }

  private handlePointerMove(x: number, y: number): void {
    if (this.activeSlider === null) return;
    this.updateSliderValueFromPosition(this.activeSlider, x, y);
  }

  private handlePointerUp(): void {
    this.activeSlider = null;
    this.isDragging = false;
  }

  private pointToLineDistance(
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number
  ): number {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx: number, yy: number;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private updateSliderValueFromPosition(index: number, x: number, y: number): void {
    const slider = this.sliders[index];
    const angleRad = (slider.angle * Math.PI) / 180;

    const dirX = Math.cos(angleRad);
    const dirY = Math.sin(angleRad);

    const trackStartX = this.controlPanelX + dirX * (this.controlPanelRadius - 35);
    const trackStartY = this.controlPanelY + dirY * (this.controlPanelRadius - 35);
    const trackEndX = this.controlPanelX + dirX * (this.controlPanelRadius - 8);
    const trackEndY = this.controlPanelY + dirY * (this.controlPanelRadius - 8);

    const trackVecX = trackEndX - trackStartX;
    const trackVecY = trackEndY - trackStartY;
    const trackLen = Math.sqrt(trackVecX * trackVecX + trackVecY * trackVecY);

    const pointVecX = x - trackStartX;
    const pointVecY = y - trackStartY;

    const dot = (pointVecX * trackVecX + pointVecY * trackVecY) / trackLen;
    let t = Math.max(0, Math.min(1, dot / trackLen));

    const newValue = slider.min + (slider.max - slider.min) * t;
    const steppedValue = Math.round(newValue / slider.step) * slider.step;
    slider.value = steppedValue;

    this.applySliderChange(slider);
  }

  private applySliderChange(slider: SliderConfig): void {
    switch (slider.key) {
      case 'brightness':
        this.simulation.setBrightness(slider.value);
        break;
      case 'attractRadius':
        this.simulation.setAttractRadius(slider.value);
        break;
      case 'fireflyCount':
        this.simulation.addFireflies(Math.round(slider.value));
        break;
    }
  }

  private getSliderHandlePosition(index: number): { x: number; y: number } {
    const slider = this.sliders[index];
    const angleRad = (slider.angle * Math.PI) / 180;
    const t = (slider.value - slider.min) / (slider.max - slider.min);
    const distance = (this.controlPanelRadius - 35) + t * 27;
    return {
      x: this.controlPanelX + Math.cos(angleRad) * distance,
      y: this.controlPanelY + Math.sin(angleRad) * distance,
    };
  }

  update(): void {
    for (const slider of this.sliders) {
      if (slider.key === 'fireflyCount') {
        slider.value = this.simulation.getCount();
      }
    }
  }

  render(): void {
    this.renderStatusText();
    this.renderControlPanel();
  }

  private renderStatusText(): void {
    this.ctx.save();

    const count = this.simulation.getCount();
    const avgBrightness = this.simulation.getAverageBrightness();
    const fps = this.simulation.getFPS();

    this.ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    this.ctx.textBaseline = 'top';

    const lines = [
      `萤火虫数量: ${count}`,
      `平均亮度: ${(avgBrightness * 100).toFixed(0)}%`,
      `FPS: ${fps}`,
    ];

    const x = 20;
    let y = 20;
    const lineHeight = 20;
    const padding = 10;
    const maxWidth = 140;
    const bgHeight = lines.length * lineHeight + padding * 2;

    this.ctx.fillStyle = 'rgba(26, 42, 74, 0.5)';
    this.ctx.beginPath();
    this.roundRect(x - padding, y - padding, maxWidth + padding, bgHeight, 8);
    this.ctx.fill();

    for (const line of lines) {
      this.ctx.fillStyle = 'rgba(200, 255, 112, 0.8)';
      this.ctx.fillText(line, x, y);
      y += lineHeight;
    }

    this.ctx.restore();
  }

  private renderControlPanel(): void {
    this.ctx.save();

    const cx = this.controlPanelX;
    const cy = this.controlPanelY;
    const r = this.controlPanelRadius;

    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(26, 42, 74, 0.7)';
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
    this.ctx.strokeStyle = 'rgba(200, 255, 112, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    for (let i = 0; i < this.sliders.length; i++) {
      this.renderSlider(i);
    }

    this.ctx.fillStyle = 'rgba(200, 255, 112, 0.9)';
    this.ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('控制', cx, cy);

    this.ctx.restore();
  }

  private renderSlider(index: number): void {
    const slider = this.sliders[index];
    const angleRad = (slider.angle * Math.PI) / 180;
    const cx = this.controlPanelX;
    const cy = this.controlPanelY;

    const trackStartDist = this.controlPanelRadius - 35;
    const trackEndDist = this.controlPanelRadius - 8;

    const trackStartX = cx + Math.cos(angleRad) * trackStartDist;
    const trackStartY = cy + Math.sin(angleRad) * trackStartDist;
    const trackEndX = cx + Math.cos(angleRad) * trackEndDist;
    const trackEndY = cy + Math.sin(angleRad) * trackEndDist;

    this.ctx.beginPath();
    this.ctx.moveTo(trackStartX, trackStartY);
    this.ctx.lineTo(trackEndX, trackEndY);
    this.ctx.strokeStyle = 'rgba(200, 255, 112, 0.3)';
    this.ctx.lineWidth = 4;
    this.ctx.lineCap = 'round';
    this.ctx.stroke();

    const t = (slider.value - slider.min) / (slider.max - slider.min);
    const filledDist = trackStartDist + t * (trackEndDist - trackStartDist);
    const filledEndX = cx + Math.cos(angleRad) * filledDist;
    const filledEndY = cy + Math.sin(angleRad) * filledDist;

    this.ctx.beginPath();
    this.ctx.moveTo(trackStartX, trackStartY);
    this.ctx.lineTo(filledEndX, filledEndY);
    this.ctx.strokeStyle = 'rgba(200, 255, 112, 0.8)';
    this.ctx.lineWidth = 4;
    this.ctx.lineCap = 'round';
    this.ctx.stroke();

    const handlePos = this.getSliderHandlePosition(index);

    const glowGrad = this.ctx.createRadialGradient(
      handlePos.x, handlePos.y, 0,
      handlePos.x, handlePos.y, 12
    );
    glowGrad.addColorStop(0, 'rgba(200, 255, 112, 0.4)');
    glowGrad.addColorStop(1, 'rgba(200, 255, 112, 0)');
    this.ctx.fillStyle = glowGrad;
    this.ctx.beginPath();
    this.ctx.arc(handlePos.x, handlePos.y, 12, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(handlePos.x, handlePos.y, 5, 0, Math.PI * 2);
    this.ctx.fillStyle = this.activeSlider === index ? '#FFFFFF' : '#C8FF70';
    this.ctx.fill();

    const labelAngleRad = angleRad;
    const labelDist = this.controlPanelRadius + 18;
    const labelX = cx + Math.cos(labelAngleRad) * labelDist;
    const labelY = cy + Math.sin(labelAngleRad) * labelDist;

    this.ctx.save();
    this.ctx.translate(labelX, labelY);
    this.ctx.rotate(angleRad + Math.PI / 2);

    this.ctx.font = '9px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = 'rgba(200, 255, 112, 0.8)';

    let displayValue = slider.value.toFixed(slider.step < 1 ? 2 : 0);
    if (slider.unit) {
      displayValue += slider.unit;
    }
    this.ctx.fillText(`${slider.label} ${displayValue}`, 0, 0);

    this.ctx.restore();
  }

  private roundRect(
    x: number, y: number,
    w: number, h: number,
    r: number
  ): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }
}
