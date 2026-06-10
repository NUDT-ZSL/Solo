import * as THREE from 'three';
import * as Tone from 'tone';
import { SceneManager, GlyphSymbol } from './sceneManager';
import { SYMBOL_SEQUENCE, TONE_FREQUENCIES, SYMBOL_COUNT } from './config';

export type AppState = 'prelude' | 'resonance';

export class EffectController {
  private scene: SceneManager;
  private activatedSymbols: GlyphSymbol[] = [];
  private sequenceProgress = 0;
  private state: AppState = 'prelude';
  private lastResonanceTime: Date | null = null;
  private isDragging = false;
  private lastMouseX = 0;
  private hoveredSymbol: GlyphSymbol | null = null;
  private audioReady = false;

  private onStateChange?: (state: AppState) => void;
  private onActivatedChange?: (count: number) => void;
  private onResonance?: (time: Date) => void;

  constructor(scene: SceneManager) {
    this.scene = scene;
    this.bindEvents();
  }

  public setCallbacks(
    onStateChange: (state: AppState) => void,
    onActivatedChange: (count: number) => void,
    onResonance: (time: Date) => void
  ): void {
    this.onStateChange = onStateChange;
    this.onActivatedChange = onActivatedChange;
    this.onResonance = onResonance;
  }

  private bindEvents(): void {
    const canvas = this.scene.renderer.domElement;

    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    canvas.addEventListener('mouseup', () => this.onMouseUp());
    canvas.addEventListener('mouseleave', () => this.onMouseUp());
    canvas.addEventListener('click', (e) => this.onClick(e));
    canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  public async initAudio(): Promise<void> {
    await Tone.start();
    this.audioReady = true;
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.isDragging) {
      const delta = (e.clientX - this.lastMouseX) * 0.005;
      this.scene.addRotation(delta);
      this.lastMouseX = e.clientX;
      this.scene.setHoveredSymbol(null);
      this.hoveredSymbol = null;
      return;
    }

    const symbol = this.scene.pickSymbol(e.clientX, e.clientY);
    if (symbol !== this.hoveredSymbol) {
      if (symbol && !symbol.hovered) {
        this.playHoverSound();
      }
      this.hoveredSymbol = symbol;
      this.scene.setHoveredSymbol(symbol);
      document.body.style.cursor = symbol ? 'pointer' : 'default';
    }
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0 && !this.hoveredSymbol) {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
    }
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    this.scene.addScale(delta);
  }

  private onClick(e: MouseEvent): void {
    if (this.isDragging) return;

    const symbol = this.scene.pickSymbol(e.clientX, e.clientY);
    if (symbol && !symbol.active) {
      this.activateSymbol(symbol);
    }
  }

  private activateSymbol(symbol: GlyphSymbol): void {
    symbol.active = true;
    this.scene.createBeam(symbol);
    this.playActivateSound(symbol.id);

    this.activatedSymbols.push(symbol);
    this.onActivatedChange?.(this.activatedSymbols.length);

    const expectedId = SYMBOL_SEQUENCE[this.sequenceProgress];

    if (symbol.id === expectedId) {
      this.sequenceProgress++;

      if (this.sequenceProgress >= 3) {
        this.triggerResonance();
      }
    } else {
      this.sequenceProgress = 0;
      this.setState('prelude');
      this.deactivateAll();
    }
  }

  private deactivateAll(): void {
    for (const sym of this.activatedSymbols) {
      sym.active = false;
      if (sym.beam) {
        this.scene.symbolsContainer.remove(sym.beam);
        sym.beam.geometry.dispose();
        (sym.beam.material as THREE.Material).dispose();
        sym.beam = undefined;
      }
      sym.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshBasicMaterial;
          mat.color.setHex(0x6FA3D9);
          child.scale.setScalar(1);
        }
      });
    }
    this.activatedSymbols = [];
    this.onActivatedChange?.(0);
  }

  private triggerResonance(): void {
    this.setState('resonance');
    this.lastResonanceTime = new Date();
    this.onResonance?.(this.lastResonanceTime);

    if (this.activatedSymbols.length >= 2) {
      this.scene.createArc(this.activatedSymbols);
    }

    this.scene.triggerShake();
    this.scene.spawnResonanceParticles();
    this.playResonanceSound();

    if (this.sequenceProgress >= SYMBOL_COUNT) {
      this.sequenceProgress = 0;
      setTimeout(() => {
        this.deactivateAll();
        this.setState('prelude');
      }, 2500);
    }
  }

  private setState(state: AppState): void {
    if (this.state !== state) {
      this.state = state;
      this.onStateChange?.(state);
    }
  }

  private playHoverSound(): void {
    if (!this.audioReady) return;

    const osc = new Tone.Oscillator(1200, 'sine').toDestination();

    const gain = new Tone.Gain({
      gain: 0,
    }).toDestination();

    osc.connect(gain);
    gain.toDestination();

    const now = Tone.now();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(1800, now + 0.1);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  private playActivateSound(symbolId: number): void {
    if (!this.audioReady) return;

    const config = TONE_FREQUENCIES[symbolId % 12];
    const now = Tone.now();

    const osc1 = new Tone.Oscillator(
      config.freq,
      config.type as Tone.ToneOscillatorType
    ).toDestination();

    const osc2 = new Tone.Oscillator(config.freq * 1.5, 'sine').toDestination();

    const gain = new Tone.Gain({ gain: 0 }).toDestination();
    osc1.connect(gain);
    osc2.connect(gain);
    gain.toDestination();

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.6);
    osc2.stop(now + 1.6);
  }

  private playResonanceSound(): void {
    if (!this.audioReady) return;

    const now = Tone.now();
    const freqs = [261.63, 329.63, 392.0, 523.25];

    for (let i = 0; i < freqs.length; i++) {
      const osc = new Tone.Oscillator(
        freqs[i],
        i % 2 === 0 ? 'sine' : 'triangle'
      ).toDestination();

      const gain = new Tone.Gain({ gain: 0 }).toDestination();
      osc.connect(gain);
      gain.toDestination();

      const start = now + i * 0.08;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.1, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 2);

      osc.start(start);
      osc.stop(start + 2.1);
    }

    const noise = new Tone.Noise({ type: 'pink' });
    const noiseGain = new Tone.Gain({ gain: 0 });
    const filter = new Tone.Filter({ type: 'bandpass', frequency: 800, Q: 2 });
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.toDestination();

    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.08, now + 0.05);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    noise.start(now);
    noise.stop(now + 0.5);
  }

  public getState(): AppState {
    return this.state;
  }

  public getActivatedCount(): number {
    return this.activatedSymbols.length;
  }

  public getLastResonanceTime(): Date | null {
    return this.lastResonanceTime;
  }
}
