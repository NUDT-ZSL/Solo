import { StringManager, HarpString } from './strings';
import { ParticleSystem } from './particles';
import { AudioEngine } from './audio';

export class InputManager {
  private canvas: HTMLCanvasElement;
  private stringManager: StringManager;
  private particleSystem: ParticleSystem;
  private audioEngine: AudioEngine;

  private draggingString: HarpString | null = null;
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private lastClickTime: number = 0;
  private lastClickX: number = 0;
  private lastClickY: number = 0;

  private onMicAuthorizedCallback: (() => void) | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    stringManager: StringManager,
    particleSystem: ParticleSystem,
    audioEngine: AudioEngine
  ) {
    this.canvas = canvas;
    this.stringManager = stringManager;
    this.particleSystem = particleSystem;
    this.audioEngine = audioEngine;

    this.bindEvents();
  }

  public setOnMicAuthorized(callback: () => void): void {
    this.onMicAuthorizedCallback = callback;
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));

    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });

    document.addEventListener('keydown', this.onKeyDown.bind(this));

    const micBtn = document.getElementById('mic-authorize');
    if (micBtn) {
      micBtn.addEventListener('click', this.onMicClick.bind(this));
    }
  }

  private async onMicClick(): Promise<void> {
    const micBtn = document.getElementById('mic-authorize') as HTMLButtonElement;
    const volumeBar = document.getElementById('volume-bar');
    const volumeFill = document.getElementById('volume-fill');

    if (micBtn) {
      micBtn.textContent = '授权中...';
      micBtn.style.opacity = '0.7';
    }

    const success = await this.audioEngine.authorizeMicrophone();
    if (success) {
      if (micBtn) {
        micBtn.style.display = 'none';
      }
      if (volumeBar) {
        volumeBar.classList.add('visible');
        volumeBar.classList.remove('error');
      }
      if (volumeFill) {
        volumeFill.classList.remove('error');
        volumeFill.style.background = 'linear-gradient(90deg, #4ECDC4, #FF6B6B)';
      }
      if (this.onMicAuthorizedCallback) {
        this.onMicAuthorizedCallback();
      }
    } else {
      if (micBtn) {
        micBtn.textContent = '麦克风授权失败，点击重试';
        micBtn.style.background = 'rgba(255, 68, 68, 0.3)';
        micBtn.style.borderColor = 'rgba(255, 68, 68, 0.6)';
        micBtn.style.opacity = '1';
      }
      if (volumeBar) {
        volumeBar.classList.add('visible', 'error');
      }
      if (volumeFill) {
        volumeFill.classList.add('error');
        volumeFill.style.background = '#FF4444';
        volumeFill.style.width = '100%';
      }
    }
  }

  private getCanvasPos(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  private onMouseDown(e: MouseEvent): void {
    this.audioEngine.resume();
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.handlePointerDown(pos.x, pos.y);
  }

  private onMouseMove(e: MouseEvent): void {
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.handlePointerMove(pos.x, pos.y);
  }

  private onMouseUp(e: MouseEvent): void {
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.handlePointerUp(pos.x, pos.y);
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    this.audioEngine.resume();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const pos = this.getCanvasPos(touch.clientX, touch.clientY);
      this.handlePointerDown(pos.x, pos.y);
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const pos = this.getCanvasPos(touch.clientX, touch.clientY);
      this.handlePointerMove(pos.x, pos.y);
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    if (e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      const pos = this.getCanvasPos(touch.clientX, touch.clientY);
      this.handlePointerUp(pos.x, pos.y);
    }
  }

  private handlePointerDown(x: number, y: number): void {
    const now = Date.now();
    const doubleClickDelay = 300;
    const doubleClickDistance = 30;

    if (now - this.lastClickTime < doubleClickDelay &&
        Math.abs(x - this.lastClickX) < doubleClickDistance &&
        Math.abs(y - this.lastClickY) < doubleClickDistance) {
      this.handleDoubleClick(x, y);
      this.lastClickTime = 0;
      return;
    }

    this.lastClickTime = now;
    this.lastClickX = x;
    this.lastClickY = y;

    const str = this.stringManager.getStringAt(x, y);
    if (str) {
      this.draggingString = str;
      this.isDragging = true;
      this.dragStartX = x;
      this.dragStartY = y;
      str.isDragging = true;
      str.pluck();
    }
  }

  private handlePointerMove(x: number, y: number): void {
    if (this.isDragging && this.draggingString) {
      this.draggingString.currentX = x;
    }
  }

  private handlePointerUp(x: number, y: number): void {
    if (this.isDragging && this.draggingString) {
      const str = this.draggingString;
      const inHarpArea = this.stringManager.isPointInHarpArea(x, y);

      if (!inHarpArea) {
        this.stringManager.removeString(str);
      } else {
        str.shiftPitch(2, 3);
        str.currentX = str.originalX;
        str.onPitchRecovered = () => {
          this.stringManager.onStringPitchRecovered(str);
        };
      }

      str.isDragging = false;
      this.draggingString = null;
      this.isDragging = false;
    }
  }

  private handleDoubleClick(x: number, y: number): void {
    if (this.stringManager.isPointInHarpArea(x, y)) {
      this.particleSystem.triggerBurst(x, y);
      this.stringManager.playArpeggio();
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      e.preventDefault();
      this.triggerStrongWind();
    }
  }

  private triggerStrongWind(): void {
    this.audioEngine.resume();
    this.particleSystem.triggerStrongWind();
    this.stringManager.triggerStrongWind();

    const freqs = this.stringManager.getAllFrequencies();
    this.audioEngine.playStrongWindChord(freqs, 1.2);

    const event = new CustomEvent('strongWind');
    this.canvas.dispatchEvent(event);
  }

  public update(): void {
    if (!this.audioEngine.isMicAuthorized) return;

    const volume = this.audioEngine.getVolume();
    const threshold = this.audioEngine.getVolumeThreshold();

    const volumeFill = document.getElementById('volume-fill');
    if (volumeFill) {
      volumeFill.style.width = `${Math.min(100, volume)}%`;
    }

    if (volume >= threshold) {
      this.particleSystem.setWindStrength(volume, threshold);
    }
  }
}
