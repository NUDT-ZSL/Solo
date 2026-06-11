import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AudioAnalyzer } from './audioAnalyzer';
import { ParticleRingSystem } from './particleRing';
import { ControlPanel } from './controls';

const CAMERA_INITIAL_POS = new THREE.Vector3(0, 50, 200);
const CAMERA_LOOK_AT = new THREE.Vector3(0, 0, 0);
const CAMERA_RESET_DURATION = 0.5;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

class CameraAnimator {
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private startPos = new THREE.Vector3();
  private endPos = new THREE.Vector3();
  private startTarget = new THREE.Vector3();
  private endTarget = new THREE.Vector3();
  private duration: number = 0;
  private elapsed: number = 0;
  private active: boolean = false;

  constructor(camera: THREE.PerspectiveCamera, controls: OrbitControls) {
    this.camera = camera;
    this.controls = controls;
  }

  animateTo(position: THREE.Vector3, target: THREE.Vector3, duration: number): void {
    this.startPos.copy(this.camera.position);
    this.endPos.copy(position);
    this.startTarget.copy(this.controls.target);
    this.endTarget.copy(target);
    this.duration = duration;
    this.elapsed = 0;
    this.active = true;
  }

  update(deltaTime: number): void {
    if (!this.active) return;

    this.elapsed += deltaTime;
    const t = Math.min(this.elapsed / this.duration, 1);
    const eased = easeOutCubic(t);

    this.camera.position.lerpVectors(this.startPos, this.endPos, eased);
    this.controls.target.lerpVectors(this.startTarget, this.endTarget, eased);
    this.controls.update();

    if (t >= 1) {
      this.active = false;
    }
  }

  isActive(): boolean {
    return this.active;
  }
}

class SpectrumRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private visible: boolean = false;
  private bars: number[] = [];
  private amplitude: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  show(): void {
    this.visible = true;
    this.canvas.classList.remove('hidden');
  }

  hide(): void {
    this.visible = false;
    this.canvas.classList.add('hidden');
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  update(bars: number[], amplitude: number): void {
    this.bars = bars;
    this.amplitude = amplitude;
  }

  render(): void {
    if (!this.visible) return;

    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    if (this.canvas.width !== w * dpr || this.canvas.height !== h * dpr) {
      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
    }

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.clearRect(0, 0, w, h);

    const barCount = this.bars.length;
    if (barCount === 0) return;

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(cx, cy) * 0.85;
    const maxBarHeight = Math.min(cx, cy) * 0.12;

    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
      const barHeight = this.bars[i] * maxBarHeight;

      const innerR = radius;
      const outerR = radius + barHeight;

      const x1 = cx + Math.cos(angle) * innerR;
      const y1 = cy + Math.sin(angle) * innerR;
      const x2 = cx + Math.cos(angle) * outerR;
      const y2 = cy + Math.sin(angle) * outerR;

      const hue = (i / barCount) * 60 + 200;
      this.ctx.strokeStyle = `hsla(${hue}, 80%, 60%, 0.8)`;
      this.ctx.lineWidth = Math.max(2, (2 * Math.PI * radius) / barCount * 0.6);
      this.ctx.lineCap = 'round';
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }
  }
}

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private cameraAnimator: CameraAnimator;
  private particleSystem: ParticleRingSystem;
  private audioAnalyzer: AudioAnalyzer;
  private controlPanel: ControlPanel;
  private spectrumRenderer: SpectrumRenderer;

  private isRecording: boolean = false;
  private hasRecording: boolean = false;
  private currentAmplitudes: number[] = [];
  private clock: THREE.Clock;

  constructor() {
    const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
    const spectrumCanvas = document.getElementById('spectrum-canvas') as HTMLCanvasElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);

    this.camera = new THREE.PerspectiveCamera(
      60,
      canvas.clientWidth / canvas.clientHeight,
      1,
      2000
    );
    this.camera.position.copy(CAMERA_INITIAL_POS);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.copy(CAMERA_LOOK_AT);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.update();

    this.cameraAnimator = new CameraAnimator(this.camera, this.controls);

    const params = { particleCount: 150, ringCount: 5 };
    this.particleSystem = new ParticleRingSystem(this.scene);
    this.particleSystem.build(params.particleCount, params.ringCount, new Array(params.ringCount).fill(0));

    this.audioAnalyzer = new AudioAnalyzer(params.ringCount);
    this.audioAnalyzer.onSpectrumUpdate((data) => {
      this.spectrumRenderer.update(data.bars, data.amplitude);
    });

    this.spectrumRenderer = new SpectrumRenderer(spectrumCanvas);

    this.controlPanel = new ControlPanel(document.getElementById('control-panel')!);
    this.controlPanel.onParamsChange((p) => this.onParamsChange(p));
    this.controlPanel.onRecordClick(() => this.onRecordClick());
    this.controlPanel.onResetView(() => this.onResetView());

    this.clock = new THREE.Clock();

    window.addEventListener('resize', () => this.onResize());
  }

  private onParamsChange(params: { particleCount: number; ringCount: number }): void {
    this.particleSystem.updateParticlesPerRing(params.particleCount);
    this.particleSystem.updateRingCount(params.ringCount);
    this.audioAnalyzer.setRingCount(params.ringCount);

    if (this.hasRecording && this.currentAmplitudes.length > 0) {
      const amplitudes = this.currentAmplitudes.slice();
      while (amplitudes.length < params.ringCount) {
        amplitudes.push(0);
      }
      amplitudes.length = params.ringCount;
      this.currentAmplitudes = amplitudes;
    }
  }

  private async onRecordClick(): Promise<void> {
    const state = this.audioAnalyzer.getState();

    if (state === 'idle') {
      try {
        this.isRecording = true;
        this.particleSystem.setRecordingState(true);
        this.controlPanel.setRecordingState('recording');
        this.controlPanel.showStatus('录制中...');
        this.spectrumRenderer.show();

        await this.audioAnalyzer.startRecording(5);
      } catch (err) {
        console.error('[App] 录制启动失败:', err);
        this.isRecording = false;
        this.particleSystem.setRecordingState(false);
        this.controlPanel.setRecordingState('idle');
        this.controlPanel.showStatus('麦克风权限被拒绝');
        this.spectrumRenderer.hide();
        setTimeout(() => this.controlPanel.hideStatus(), 3000);
      }
    } else if (state === 'recording') {
      this.stopRecording();
    } else if (state === 'done') {
      this.audioAnalyzer.dispose();
      this.isRecording = false;
      this.particleSystem.setRecordingState(false);
      this.currentAmplitudes = new Array(this.controlPanel.getRingCount()).fill(0);
      this.controlPanel.setRecordingState('idle');
      this.controlPanel.hideStatus();

      try {
        this.isRecording = true;
        this.particleSystem.setRecordingState(true);
        this.controlPanel.setRecordingState('recording');
        this.controlPanel.showStatus('录制中...');
        this.spectrumRenderer.show();

        await this.audioAnalyzer.startRecording(5);
      } catch (err) {
        console.error('[App] 重录启动失败:', err);
        this.isRecording = false;
        this.particleSystem.setRecordingState(false);
        this.controlPanel.setRecordingState('idle');
        this.controlPanel.showStatus('麦克风权限被拒绝');
        this.spectrumRenderer.hide();
        setTimeout(() => this.controlPanel.hideStatus(), 3000);
      }
    }
  }

  private async stopRecording(): Promise<void> {
    const t0 = performance.now();
    const result = await this.audioAnalyzer.stopRecording();
    const t1 = performance.now();

    console.log(`[App] 停止录制→获取分析结果耗时: ${(t1 - t0).toFixed(1)}ms`);
    console.log(`[App] 音频分析器报告的分析延迟: ${this.audioAnalyzer.getLastAnalysisTime().toFixed(1)}ms`);

    const totalLatency = t1 - t0;
    if (totalLatency > 200) {
      console.warn(`[App] ⚠️ 音频处理延迟超过200ms阈值: ${totalLatency.toFixed(1)}ms`);
    } else {
      console.log(`[App] ✅ 音频处理延迟在200ms阈值内: ${totalLatency.toFixed(1)}ms`);
    }

    this.isRecording = false;
    this.particleSystem.setRecordingState(false);
    this.hasRecording = true;
    this.currentAmplitudes = result.normalizedAmplitudes;

    const ringCount = parseInt((document.getElementById('ring-count') as HTMLInputElement).value, 10);
    const particleCount = parseInt((document.getElementById('particle-count') as HTMLInputElement).value, 10);

    this.particleSystem.build(particleCount, ringCount, this.currentAmplitudes);

    this.spectrumRenderer.hide();
    this.controlPanel.setRecordingState('done');
    this.controlPanel.showStatus(`声纹已生成 (${result.normalizedAmplitudes.map((a) => a.toFixed(2)).join(', ')})`);
  }

  private onResetView(): void {
    this.cameraAnimator.animateTo(CAMERA_INITIAL_POS, CAMERA_LOOK_AT, CAMERA_RESET_DURATION);
  }

  private onResize(): void {
    const container = document.getElementById('viewport-container')!;
    const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
    const w = container.clientWidth;
    const h = container.clientHeight;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  run(): void {
    this.onResize();

    const animate = () => {
      requestAnimationFrame(animate);

      const delta = this.clock.getDelta();

      this.cameraAnimator.update(delta);
      this.controls.update();

      if (!this.isRecording && this.hasRecording && this.currentAmplitudes.length > 0) {
        this.particleSystem.update(this.currentAmplitudes, delta);
      }

      this.spectrumRenderer.render();

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }
}

const app = new App();
app.run();
