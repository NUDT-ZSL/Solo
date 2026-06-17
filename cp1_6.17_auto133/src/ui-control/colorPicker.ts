export class ColorPicker {
  private container: HTMLDivElement;
  private hueCanvas: HTMLCanvasElement;
  private hueCtx: CanvasRenderingContext2D;
  private svCanvas: HTMLCanvasElement;
  private svCtx: CanvasRenderingContext2D;
  private preview: HTMLDivElement;
  private hexLabel: HTMLSpanElement;
  private currentColor: { h: number; s: number; l: number } = { h: 30, s: 0.5, l: 0.65 };
  private onChangeCallback: (hex: string) => void = () => {};
  private svDragging: boolean = false;
  private hueDragging: boolean = false;

  constructor() {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      width: 100%;
      margin-bottom: 16px;
    `;

    const label = document.createElement('span');
    label.textContent = '家具颜色';
    label.style.cssText = `
      color: #fff;
      font-size: 13px;
      font-weight: 500;
      display: block;
      margin-bottom: 8px;
    `;
    this.container.appendChild(label);

    this.svCanvas = document.createElement('canvas');
    this.svCanvas.width = 260;
    this.svCanvas.height = 160;
    this.svCanvas.style.cssText = `
      width: 260px;
      height: 160px;
      border-radius: 8px;
      cursor: crosshair;
      display: block;
      margin-bottom: 8px;
      border: 1px solid rgba(255,255,255,0.1);
    `;
    this.svCtx = this.svCanvas.getContext('2d')!;

    this.hueCanvas = document.createElement('canvas');
    this.hueCanvas.width = 260;
    this.hueCanvas.height = 14;
    this.hueCanvas.style.cssText = `
      width: 260px;
      height: 14px;
      border-radius: 7px;
      cursor: pointer;
      display: block;
      margin-bottom: 10px;
    `;
    this.hueCtx = this.hueCanvas.getContext('2d')!;

    const infoRow = document.createElement('div');
    infoRow.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
    `;

    this.preview = document.createElement('div');
    this.preview.style.cssText = `
      width: 32px;
      height: 32px;
      border-radius: 6px;
      border: 2px solid #fff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    `;

    this.hexLabel = document.createElement('span');
    this.hexLabel.style.cssText = `
      color: #fff;
      font-size: 14px;
      font-family: 'Courier New', monospace;
      font-weight: 600;
      text-transform: uppercase;
    `;

    infoRow.appendChild(this.preview);
    infoRow.appendChild(this.hexLabel);

    this.container.appendChild(this.svCanvas);
    this.container.appendChild(this.hueCanvas);
    this.container.appendChild(infoRow);

    this.drawHueBar();
    this.drawSVArea();
    this.updatePreview();
    this.bindEvents();
  }

  private drawHueBar(): void {
    const gradient = this.hueCtx.createLinearGradient(0, 0, 260, 0);
    const hueStops = [0, 60, 120, 180, 240, 300, 360];
    hueStops.forEach((hue, i) => {
      gradient.addColorStop(i / (hueStops.length - 1), `hsl(${hue}, 100%, 50%)`);
    });
    this.hueCtx.fillStyle = gradient;
    this.hueCtx.fillRect(0, 0, 260, 14);
  }

  private drawSVArea(): void {
    const { h } = this.currentColor;
    const width = this.svCanvas.width;
    const height = this.svCanvas.height;
    this.svCtx.fillStyle = `hsl(${h}, 100%, 50%)`;
    this.svCtx.fillRect(0, 0, width, height);
    const whiteGradient = this.svCtx.createLinearGradient(0, 0, width, 0);
    whiteGradient.addColorStop(0, 'rgba(255,255,255,1)');
    whiteGradient.addColorStop(1, 'rgba(255,255,255,0)');
    this.svCtx.fillStyle = whiteGradient;
    this.svCtx.fillRect(0, 0, width, height);
    const blackGradient = this.svCtx.createLinearGradient(0, 0, 0, height);
    blackGradient.addColorStop(0, 'rgba(0,0,0,0)');
    blackGradient.addColorStop(1, 'rgba(0,0,0,1)');
    this.svCtx.fillStyle = blackGradient;
    this.svCtx.fillRect(0, 0, width, height);

    const px = this.currentColor.s * width;
    const py = (1 - this.currentColor.l) * height;
    this.svCtx.strokeStyle = 'rgba(255,255,255,0.8)';
    this.svCtx.lineWidth = 2;
    this.svCtx.beginPath();
    this.svCtx.arc(px, py, 7, 0, Math.PI * 2);
    this.svCtx.stroke();
    this.svCtx.strokeStyle = 'rgba(0,0,0,0.6)';
    this.svCtx.lineWidth = 1;
    this.svCtx.beginPath();
    this.svCtx.arc(px, py, 9, 0, Math.PI * 2);
    this.svCtx.stroke();
  }

  private hslToHex(h: number, s: number, l: number): string {
    let r: number, g: number, b: number;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h / 360 + 1 / 3);
      g = hue2rgb(p, q, h / 360);
      b = hue2rgb(p, q, h / 360 - 1 / 3);
    }
    const toHex = (x: number) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  private updatePreview(): void {
    const hex = this.hslToHex(this.currentColor.h, this.currentColor.s, this.currentColor.l);
    this.preview.style.backgroundColor = hex;
    this.hexLabel.textContent = hex;
  }

  private bindEvents(): void {
    this.svCanvas.addEventListener('mousedown', (e) => {
      this.svDragging = true;
      this.handleSVMouseMove(e);
    });
    window.addEventListener('mouseup', () => {
      this.svDragging = false;
      this.hueDragging = false;
    });
    window.addEventListener('mousemove', (e) => {
      if (this.svDragging) this.handleSVMouseMove(e);
      if (this.hueDragging) this.handleHueMouseMove(e);
    });

    this.hueCanvas.addEventListener('mousedown', (e) => {
      this.hueDragging = true;
      this.handleHueMouseMove(e);
    });

    this.svCanvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.svDragging = true;
      const touch = e.touches[0];
      this.handleSVTouchMove(touch);
    });
    window.addEventListener('touchend', () => {
      this.svDragging = false;
      this.hueDragging = false;
    });
    window.addEventListener('touchmove', (e) => {
      if (this.svDragging && e.touches.length > 0) {
        e.preventDefault();
        this.handleSVTouchMove(e.touches[0]);
      }
      if (this.hueDragging && e.touches.length > 0) {
        e.preventDefault();
        this.handleHueTouchMove(e.touches[0]);
      }
    });
    this.hueCanvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.hueDragging = true;
      const touch = e.touches[0];
      this.handleHueTouchMove(touch);
    });
  }

  private handleSVMouseMove(e: MouseEvent): void {
    const rect = this.svCanvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    this.currentColor.s = x / rect.width;
    this.currentColor.l = 1 - y / rect.height;
    this.drawSVArea();
    this.updatePreview();
    this.onChangeCallback(this.hslToHex(this.currentColor.h, this.currentColor.s, this.currentColor.l));
  }

  private handleSVTouchMove(touch: Touch): void {
    const rect = this.svCanvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, touch.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, touch.clientY - rect.top));
    this.currentColor.s = x / rect.width;
    this.currentColor.l = 1 - y / rect.height;
    this.drawSVArea();
    this.updatePreview();
    this.onChangeCallback(this.hslToHex(this.currentColor.h, this.currentColor.s, this.currentColor.l));
  }

  private handleHueMouseMove(e: MouseEvent): void {
    const rect = this.hueCanvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    this.currentColor.h = (x / rect.width) * 360;
    this.drawSVArea();
    this.updatePreview();
    this.onChangeCallback(this.hslToHex(this.currentColor.h, this.currentColor.s, this.currentColor.l));
  }

  private handleHueTouchMove(touch: Touch): void {
    const rect = this.hueCanvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, touch.clientX - rect.left));
    this.currentColor.h = (x / rect.width) * 360;
    this.drawSVArea();
    this.updatePreview();
    this.onChangeCallback(this.hslToHex(this.currentColor.h, this.currentColor.s, this.currentColor.l));
  }

  public onChange(callback: (hex: string) => void): void {
    this.onChangeCallback = callback;
  }

  public getElement(): HTMLElement {
    return this.container;
  }

  public getColor(): string {
    return this.hslToHex(this.currentColor.h, this.currentColor.s, this.currentColor.l);
  }
}

export default ColorPicker;
