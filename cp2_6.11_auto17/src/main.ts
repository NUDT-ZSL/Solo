import * as THREE from 'three';
import { SceneManager } from './sceneManager';
import { EffectController, AppState } from './effectController';

class App {
  private scene!: SceneManager;
  private effects!: EffectController;
  private clock: THREE.Clock | null = null;
  private rafId: number | null = null;

  private panelEl!: HTMLElement;
  private countEl!: HTMLElement;
  private statusEl!: HTMLElement;
  private resonanceEl!: HTMLElement;
  private loadingEl!: HTMLElement;
  private lastResonanceAt: Date | null = null;

  public async start(): Promise<void> {
    this.cacheDom();
    await this.init();
    this.animate();
    this.hideLoading();
  }

  private cacheDom(): void {
    this.panelEl = document.getElementById('info-panel')!;
    this.countEl = document.getElementById('activated-count')!;
    this.statusEl = document.getElementById('current-status')!;
    this.resonanceEl = document.getElementById('last-resonance')!;
    this.loadingEl = document.getElementById('loading')!;
  }

  private async init(): Promise<void> {
    const canvas = document.getElementById('app') as HTMLCanvasElement;
    this.scene = new SceneManager(canvas);
    this.effects = new EffectController(this.scene);
    this.clock = new THREE.Clock();

    this.effects.setCallbacks(
      (state) => this.updateStateUI(state),
      (count) => this.updateCountUI(count),
      (time) => this.updateResonanceUI(time)
    );

    document.addEventListener('click', async () => {
      try {
        await this.effects.initAudio();
      } catch (e) {
        console.warn('Audio init failed:', e);
      }
    }, { once: true });

    this.updateCountUI(0);
    this.updateStateUI('prelude');
    this.updateResonanceUI(null);
  }

  private hideLoading(): void {
    setTimeout(() => {
      this.loadingEl.classList.add('hidden');
      setTimeout(() => {
        this.loadingEl.style.display = 'none';
      }, 800);
    }, 500);
  }

  private updateStateUI(state: AppState): void {
    if (state === 'resonance') {
      this.panelEl.classList.add('resonance');
      this.statusEl.innerHTML = '<span class="status-dot status-resonance"></span>共鸣';
    } else {
      this.panelEl.classList.remove('resonance');
      this.statusEl.innerHTML = '<span class="status-dot status-prelude"></span>序曲';
    }
  }

  private updateCountUI(count: number): void {
    this.countEl.textContent = `${count} / 12`;
  }

  private updateResonanceUI(time: Date | null): void {
    this.lastResonanceAt = time;
    this.refreshResonanceDisplay();
  }

  private refreshResonanceDisplay(): void {
    if (!this.lastResonanceAt) {
      this.resonanceEl.textContent = '--:--';
      return;
    }
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - this.lastResonanceAt.getTime()) / 1000);
    const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    this.resonanceEl.textContent = `${m}:${s}`;
  }

  private animate = (): void => {
    this.rafId = requestAnimationFrame(this.animate);

    if (!this.clock) return;
    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.getElapsedTime();

    this.refreshResonanceDisplay();
    this.scene.update(delta, elapsed);
  };

  public dispose(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
  }
}

const app = new App();
app.start().catch((err) => console.error('App failed to start:', err));
