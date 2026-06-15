import * as THREE from 'three';
import { ReliefScene } from './reliefScene';
import { UIControls, DEFAULT_PARAMS } from './uiControls';
import { loadPreset, parseUploadedJSON } from './starData';

class App {
  private reliefScene: ReliefScene;
  private uiControls: UIControls;
  private canvasWrap: HTMLElement;
  private clock: THREE.Clock;
  private mouseNDC = new THREE.Vector2(-999, -999);
  private currentPreset = 'orion';
  private hoveredIndex: number | null = null;
  private animationId = 0;

  private scratchVec3 = new THREE.Vector3();
  private projScreen = { x: 0, y: 0 };

  constructor() {
    const canvasWrap = document.getElementById('canvas-wrap')!;
    this.canvasWrap = canvasWrap;
    this.clock = new THREE.Clock();

    this.reliefScene = new ReliefScene(canvasWrap);

    this.uiControls = new UIControls(
      (params) => this.onParamChange(params),
      (presetName) => this.onPresetChange(presetName),
      (data) => this.onFileUpload(data),
      () => this.onSavePreset(),
    );

    this.loadInitialData();
    this.bindEvents();
    this.hideLoadingScreen();
    this.animate();
  }

  private loadInitialData() {
    const stars = loadPreset(this.currentPreset);
    this.reliefScene.loadStars(stars);
  }

  private hideLoadingScreen() {
    setTimeout(() => {
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
        setTimeout(() => loadingScreen.remove(), 800);
      }
    }, 800);
  }

  private bindEvents() {
    window.addEventListener('resize', () => {
      const w = this.canvasWrap.clientWidth;
      const h = this.canvasWrap.clientHeight;
      this.reliefScene.resize(w, h);
    });

    this.canvasWrap.addEventListener('mousemove', (e) => {
      const rect = this.canvasWrap.getBoundingClientRect();
      this.mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });

    this.canvasWrap.addEventListener('mouseleave', () => {
      this.mouseNDC.set(-999, -999);
      this.clearHover();
    });

    this.canvasWrap.addEventListener('dblclick', (e) => {
      const rect = this.canvasWrap.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      const hit = this.reliefScene.raycast(ndc);
      if (hit) {
        const worldPos = this.reliefScene.getStarWorldPosition(hit.index);
        this.smoothZoomTo(worldPos);
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.smoothZoomReset();
    });
  }

  private smoothZoomTo(target: THREE.Vector3) {
    const startTarget = this.reliefScene.controls.target.clone();
    const startPos = this.reliefScene.camera.position.clone();
    const endTarget = target.clone();
    const direction = new THREE.Vector3().subVectors(endTarget, startPos).normalize();
    const endPos = endTarget.clone().sub(direction.multiplyScalar(6));
    endPos.y = Math.max(endPos.y, 3);

    const duration = 800;
    const startTime = performance.now();

    const tick = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      this.reliefScene.controls.target.lerpVectors(startTarget, endTarget, eased);
      this.reliefScene.camera.position.lerpVectors(startPos, endPos, eased);
      if (t < 1) requestAnimationFrame(tick);
    };
    tick();
  }

  private smoothZoomReset() {
    const defaultPos = new THREE.Vector3(0, 14, 22);
    const defaultTarget = new THREE.Vector3(0, 0, 0);
    const startPos = this.reliefScene.camera.position.clone();
    const startTarget = this.reliefScene.controls.target.clone();
    const duration = 800;
    const startTime = performance.now();

    const tick = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      this.reliefScene.controls.target.lerpVectors(startTarget, defaultTarget, eased);
      this.reliefScene.camera.position.lerpVectors(startPos, defaultPos, eased);
      if (t < 1) requestAnimationFrame(tick);
    };
    tick();
  }

  private onParamChange(params: Record<string, unknown>) {
    this.reliefScene.updateParams(params as any);
  }

  private onPresetChange(presetName: string) {
    this.currentPreset = presetName;
    const stars = loadPreset(presetName);
    this.reliefScene.loadStars(stars);
  }

  private onFileUpload(data: unknown) {
    try {
      const stars = parseUploadedJSON(data);
      this.reliefScene.loadStars(stars);
    } catch (err: any) {
      alert(`星图数据错误：${err?.message || err}`);
    }
  }

  private onSavePreset() {
    const params = this.reliefScene.getParams();
    const preset = {
      params,
      preset: this.currentPreset,
      starCount: this.reliefScene.getStarCount(),
      savedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stardust-relief-preset-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private updateHover() {
    const hit = this.reliefScene.raycast(this.mouseNDC);

    if (hit) {
      if (this.hoveredIndex !== hit.index) {
        this.reliefScene.highlightStar(hit.index);
        this.hoveredIndex = hit.index;
      }
      const starWorld = this.reliefScene.getStarWorldPosition(hit.index);
      this.projectWorldToScreen(starWorld);
      const starData = this.reliefScene.getStarData(hit.index);
      if (starData) {
        this.uiControls.showTooltipAt(starData, this.projScreen.x, this.projScreen.y);
      }
    } else if (this.hoveredIndex !== null) {
      this.clearHover();
    }
  }

  private projectWorldToScreen(world: THREE.Vector3) {
    this.scratchVec3.copy(world);
    this.scratchVec3.project(this.reliefScene.camera);
    const rect = this.canvasWrap.getBoundingClientRect();
    this.projScreen.x = ((this.scratchVec3.x + 1) / 2) * rect.width + rect.left;
    this.projScreen.y = ((-this.scratchVec3.y + 1) / 2) * rect.height + rect.top;
  }

  private clearHover() {
    this.reliefScene.highlightStar(null);
    this.hoveredIndex = null;
    this.uiControls.hideTooltip();
  }

  private animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();
    this.reliefScene.update(delta);
    this.updateHover();
  }
}

new App();
