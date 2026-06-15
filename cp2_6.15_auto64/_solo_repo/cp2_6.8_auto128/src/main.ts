import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Cube3D, Face, RotationStep } from './cube';
import { CubeAnimator } from './animator';

type AppState = 'ready' | 'shuffling' | 'shuffled' | 'solving' | 'solved' | 'replaying';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private cube: Cube3D;
  private animator: CubeAnimator;
  private clock: THREE.Clock;

  private appState: AppState = 'ready';
  private autoRotate: boolean = true;
  private shuffleSteps: RotationStep[] = [];
  private solveSteps: RotationStep[] = [];
  private historySteps: RotationStep[] = [];
  private currentStepIndex: number = 0;

  private elStatusText: HTMLElement;
  private elStatusSteps: HTMLElement;
  private elStatusFormula: HTMLElement;
  private elProgressLabel: HTMLElement;
  private elProgressFill: HTMLElement;
  private elProgressSlider: HTMLInputElement;
  private elLayerSlider: HTMLInputElement;
  private btnShuffle: HTMLButtonElement;
  private btnSolve: HTMLButtonElement;
  private btnPrev: HTMLButtonElement;
  private btnNext: HTMLButtonElement;
  private btnCw: HTMLButtonElement;
  private btnCcw: HTMLButtonElement;

  private readonly LAYER_ORDER: Face[] = ['U', 'D', 'F', 'B', 'L', 'R'];

  constructor() {
    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();

    const canvasContainer = document.getElementById('canvas-container')!;
    const width = canvasContainer.clientWidth;
    const height = canvasContainer.clientHeight;

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(6, 5, 8);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    canvasContainer.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 20;
    this.controls.enablePan = false;

    this.setupLights();
    this.setupBackground();

    this.cube = new Cube3D();
    this.scene.add(this.cube.group);

    this.animator = new CubeAnimator(this.cube);
    this.animator.onStepStart = (idx, step) => this.onStepStart(idx, step);
    this.animator.onStepComplete = (idx, step) => this.onStepComplete(idx, step);
    this.animator.onComplete = () => this.onSequenceComplete();

    this.elStatusText = document.getElementById('status-text')!;
    this.elStatusSteps = document.getElementById('status-steps')!;
    this.elStatusFormula = document.getElementById('status-formula')!;
    this.elProgressLabel = document.getElementById('progress-label')!;
    this.elProgressFill = document.getElementById('progress-fill')!;
    this.elProgressSlider = document.getElementById('progress-slider') as HTMLInputElement;
    this.elLayerSlider = document.getElementById('layer-slider') as HTMLInputElement;
    this.btnShuffle = document.getElementById('btn-shuffle') as HTMLButtonElement;
    this.btnSolve = document.getElementById('btn-solve') as HTMLButtonElement;
    this.btnPrev = document.getElementById('btn-prev') as HTMLButtonElement;
    this.btnNext = document.getElementById('btn-next') as HTMLButtonElement;
    this.btnCw = document.getElementById('btn-cw') as HTMLButtonElement;
    this.btnCcw = document.getElementById('btn-ccw') as HTMLButtonElement;

    this.bindEvents();
    this.updateUI();
    window.addEventListener('resize', () => this.onResize());
    this.animate();
  }

  private setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);

    const dir1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dir1.position.set(5, 8, 6);
    dir1.castShadow = true;
    this.scene.add(dir1);

    const dir2 = new THREE.DirectionalLight(0x88aaff, 0.35);
    dir2.position.set(-6, 3, -4);
    this.scene.add(dir2);

    const hemi = new THREE.HemisphereLight(0x6688cc, 0x223344, 0.25);
    this.scene.add(hemi);
  }

  private setupBackground() {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#0B0E17');
    grad.addColorStop(1, '#1A1F36');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2, 512);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = tex;
  }

  private bindEvents() {
    this.btnShuffle.addEventListener('click', () => this.onShuffleClick());
    this.btnSolve.addEventListener('click', () => this.onSolveClick());
    this.btnPrev.addEventListener('click', () => this.onPrevClick());
    this.btnNext.addEventListener('click', () => this.onNextClick());
    this.btnCw.addEventListener('click', () => this.onManualRotate('cw'));
    this.btnCcw.addEventListener('click', () => this.onManualRotate('ccw'));
    this.elProgressSlider.addEventListener('input', (e) => this.onProgressInput(e));
    this.elProgressSlider.addEventListener('change', (e) => this.onProgressChange(e));
  }

  private onResize() {
    const canvasContainer = document.getElementById('canvas-container')!;
    const w = canvasContainer.clientWidth;
    const h = canvasContainer.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private onShuffleClick() {
    if (this.animator.isBusy()) return;
    this.animator.stop();
    this.shuffleSteps = this.cube.generateShuffleSteps(20);
    this.solveSteps = [];
    this.historySteps = [];
    this.currentStepIndex = 0;
    this.appState = 'shuffling';
    this.autoRotate = false;
    this.updateUI();
    this.animator.playSequence(this.shuffleSteps, 500, 0, 0);
  }

  private onSolveClick() {
    if (this.animator.isBusy()) return;
    this.animator.stop();
    if (this.shuffleSteps.length === 0) return;
    this.solveSteps = this.cube.generateSolveSteps(this.shuffleSteps);
    this.historySteps = [...this.solveSteps];
    this.currentStepIndex = 0;
    this.appState = 'solving';
    this.autoRotate = false;
    this.updateUI();
    this.animator.playSequence(this.solveSteps, 800, 0, 0);
  }

  private onPrevClick() {
    if (this.animator.isBusy()) return;
    if (this.historySteps.length === 0) return;
    if (this.currentStepIndex <= 0) return;
    this.currentStepIndex--;
    this.appState = 'replaying';
    this.autoRotate = false;
    const step = this.cube.invertStep(this.historySteps[this.currentStepIndex]);
    this.updateUI();
    this.animator.animateStep(step, 300).then(() => {
      this.updateUI();
      if (this.currentStepIndex === 0) {
        this.appState = 'shuffled';
      }
    });
  }

  private onNextClick() {
    if (this.animator.isBusy()) return;
    if (this.historySteps.length === 0) return;
    if (this.currentStepIndex >= this.historySteps.length) return;
    this.appState = 'replaying';
    this.autoRotate = false;
    const step = this.historySteps[this.currentStepIndex];
    this.currentStepIndex++;
    this.updateUI();
    this.animator.animateStep(step, 300).then(() => {
      this.updateUI();
      if (this.currentStepIndex >= this.historySteps.length) {
        this.appState = 'solved';
      }
    });
  }

  private onManualRotate(dir: 'cw' | 'ccw') {
    if (this.animator.isBusy()) return;
    const face = this.LAYER_ORDER[parseInt(this.elLayerSlider.value)];
    const step: RotationStep = { face, direction: dir };
    this.appState = 'ready';
    this.autoRotate = false;
    this.historySteps = [];
    this.shuffleSteps = [];
    this.solveSteps = [];
    this.currentStepIndex = 0;
    this.updateUI();
    this.animator.animateStep(step, 400);
  }

  private onProgressInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const idx = parseInt(target.value);
    this.elProgressLabel.textContent = `${idx} / ${this.historySteps.length}`;
    const pct = this.historySteps.length > 0 ? (idx / this.historySteps.length) * 100 : 0;
    this.elProgressFill.style.width = `${pct}%`;
  }

  private onProgressChange(e: Event) {
    if (this.animator.isBusy()) return;
    if (this.historySteps.length === 0) return;
    const target = e.target as HTMLInputElement;
    const targetIdx = parseInt(target.value);
    if (targetIdx === this.currentStepIndex) return;

    this.appState = 'replaying';
    this.autoRotate = false;
    this.jumpToStep(targetIdx);
  }

  private async jumpToStep(targetIdx: number) {
    const start = this.currentStepIndex;
    if (targetIdx > start) {
      for (let i = start; i < targetIdx; i++) {
        const step = this.historySteps[i];
        this.currentStepIndex = i + 1;
        this.updateUI();
        await this.animator.animateStep(step, 200);
      }
    } else if (targetIdx < start) {
      for (let i = start - 1; i >= targetIdx; i--) {
        const step = this.cube.invertStep(this.historySteps[i]);
        this.currentStepIndex = i;
        this.updateUI();
        await this.animator.animateStep(step, 200);
      }
    }
    this.updateUI();
    if (this.currentStepIndex >= this.historySteps.length && this.historySteps.length > 0) {
      this.appState = 'solved';
    } else if (this.currentStepIndex === 0 && this.historySteps.length > 0) {
      this.appState = 'shuffled';
    }
  }

  private onStepStart(idx: number, step: RotationStep) {
    if (this.appState === 'shuffling') {
      this.currentStepIndex = idx + 1;
    } else if (this.appState === 'solving') {
      this.currentStepIndex = idx + 1;
    }
    this.updateUI(step);
  }

  private onStepComplete(idx: number, step: RotationStep) {
    if (this.appState === 'shuffling') {
      this.historySteps = this.shuffleSteps.slice(0, idx + 1);
    }
    this.updateUI();
  }

  private onSequenceComplete() {
    if (this.appState === 'shuffling') {
      this.appState = 'shuffled';
      this.historySteps = [...this.shuffleSteps];
      this.currentStepIndex = this.shuffleSteps.length;
    } else if (this.appState === 'solving') {
      this.appState = 'solved';
      this.currentStepIndex = this.solveSteps.length;
    }
    this.updateUI();
  }

  private updateUI(currentStep?: RotationStep) {
    let statusText = '';
    switch (this.appState) {
      case 'ready': statusText = '就绪'; break;
      case 'shuffling': statusText = '打乱中'; break;
      case 'shuffled': statusText = '已打乱'; break;
      case 'solving': statusText = '解算中'; break;
      case 'solved': statusText = '已完成'; break;
      case 'replaying': statusText = '回放中'; break;
    }
    this.elStatusText.textContent = statusText;

    let totalSteps = 0;
    let curStep = this.currentStepIndex;
    if (this.appState === 'shuffling') {
      totalSteps = this.shuffleSteps.length;
    } else if (this.appState === 'solving') {
      totalSteps = this.solveSteps.length;
      curStep = this.currentStepIndex;
    } else if (this.historySteps.length > 0) {
      totalSteps = this.historySteps.length;
    } else if (this.shuffleSteps.length > 0) {
      totalSteps = this.shuffleSteps.length;
    }
    this.elStatusSteps.textContent = `步数: ${curStep} / ${totalSteps}`;

    if (currentStep) {
      this.elStatusFormula.textContent = Cube3D.stepToFormula(currentStep);
    } else if (this.historySteps.length > 0 && this.currentStepIndex > 0) {
      this.elStatusFormula.textContent = Cube3D.stepToFormula(this.historySteps[this.currentStepIndex - 1]);
    } else {
      this.elStatusFormula.textContent = '';
    }

    let progTotal = 0;
    let progCur = 0;
    if (this.appState === 'shuffling') {
      progTotal = this.shuffleSteps.length;
      progCur = this.currentStepIndex;
    } else if (this.appState === 'solving') {
      progTotal = this.solveSteps.length;
      progCur = this.currentStepIndex;
    } else {
      progTotal = this.historySteps.length;
      progCur = this.currentStepIndex;
    }
    this.elProgressLabel.textContent = `${progCur} / ${progTotal}`;
    const pct = progTotal > 0 ? (progCur / progTotal) * 100 : 0;
    this.elProgressFill.style.width = `${pct}%`;
    this.elProgressSlider.max = String(progTotal);
    this.elProgressSlider.value = String(progCur);

    const canShuffle = !this.animator.isBusy();
    this.btnShuffle.disabled = !canShuffle;
    this.btnSolve.disabled = !(this.appState === 'shuffled' && !this.animator.isBusy());
    this.btnPrev.disabled = this.historySteps.length === 0 || this.currentStepIndex <= 0 || this.animator.isBusy();
    this.btnNext.disabled = this.historySteps.length === 0 || this.currentStepIndex >= this.historySteps.length || this.animator.isBusy();
    this.btnCw.disabled = this.animator.isBusy();
    this.btnCcw.disabled = this.animator.isBusy();
    this.elProgressSlider.disabled = this.historySteps.length === 0 || this.animator.isBusy();
  }

  private animate = () => {
    requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();

    if (this.autoRotate && !this.animator.isBusy()) {
      this.cube.group.rotation.y += delta * (Math.PI * 2 / 20);
    }

    this.animator.update(delta);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
