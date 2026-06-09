import * as THREE from 'three';
import { StageManager } from './stage';
import { TimelineManager, Keyframe } from './timeline';
import { ParticleSystem, UIParticleSystem } from './effects';

const LIGHT_COLORS = [
  '#FF3B30',
  '#FF9500',
  '#FFCC00',
  '#34C759',
  '#5AC8FA',
  '#007AFF',
  '#AF52DE',
  '#FF2D55'
];

enum CameraMode {
  FREE = 'free',
  TOP = 'top',
  FIRST_PERSON = 'first_person'
}

class App {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  container: HTMLElement;
  stage: StageManager;
  timeline: TimelineManager;
  particles3D: ParticleSystem;
  particlesUI: UIParticleSystem;

  private isDragging: boolean = false;
  private prevMouse: { x: number; y: number } = { x: 0, y: 0 };
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 3, 0);
  private spherical: { radius: number; theta: number; phi: number } = {
    radius: 20,
    theta: Math.PI / 4,
    phi: Math.PI / 3
  };
  private cameraMode: CameraMode = CameraMode.FREE;
  private targetSpherical = { ...this.spherical };
  private targetPosition: THREE.Vector3 = new THREE.Vector3();
  private cameraTweenActive: boolean = false;
  private cameraTweenProgress: number = 0;

  private dragColor: string | null = null;
  private dragColorHex: number = 0;
  private dragIcon: HTMLElement | null = null;
  private dragGhost: HTMLElement | null = null;

  private selectedLightId: number | null = null;
  private editingKeyframe: Keyframe | null = null;

  private clock: THREE.Clock;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0f);
    this.scene.fog = new THREE.Fog(0x0a0a0f, 25, 60);

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      200
    );
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.stage = new StageManager(this.scene);
    this.timeline = new TimelineManager(
      this.stage,
      document.getElementById('timeline-track')!,
      document.getElementById('timeline-scanline')!
    );
    this.particles3D = new ParticleSystem(this.scene);
    this.particlesUI = new UIParticleSystem();

    this.clock = new THREE.Clock();

    this.setupLightIcons();
    this.setupEventListeners();
    this.animate();
  }

  private updateCameraPosition(): void {
    const x = this.spherical.radius * Math.sin(this.spherical.phi) * Math.cos(this.spherical.theta);
    const y = this.spherical.radius * Math.cos(this.spherical.phi);
    const z = this.spherical.radius * Math.sin(this.spherical.phi) * Math.sin(this.spherical.theta);

    if (this.cameraMode === CameraMode.FIRST_PERSON) {
      this.camera.position.set(0, 3, 0);
      this.camera.lookAt(
        Math.cos(this.spherical.theta) * 5,
        5 + Math.sin(this.spherical.phi) * 3,
        Math.sin(this.spherical.theta) * 5
      );
    } else {
      this.camera.position.set(
        this.cameraTarget.x + x,
        this.cameraTarget.y + y,
        this.cameraTarget.z + z
      );
      this.camera.lookAt(this.cameraTarget);
    }
  }

  private setupLightIcons(): void {
    const row1 = document.getElementById('light-icons-row-1')!;
    const row2 = document.getElementById('light-icons-row-2')!;

    LIGHT_COLORS.forEach((color, i) => {
      const icon = document.createElement('div');
      icon.className = 'light-icon';
      icon.style.background = color;
      icon.style.color = color;
      icon.dataset.color = color;
      icon.draggable = true;

      icon.addEventListener('dragstart', (e) => {
        this.dragColor = color;
        this.dragColorHex = parseInt(color.replace('#', ''), 16);
        this.dragIcon = icon;
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'copy';
          e.dataTransfer.setData('text/plain', color);
          const dragImg = icon.cloneNode(true) as HTMLElement;
          dragImg.style.opacity = '0';
          document.body.appendChild(dragImg);
          e.dataTransfer.setDragImage(dragImg, 30, 30);
          setTimeout(() => dragImg.remove(), 0);
        }
        this.showDragGhost(color, e.clientX, e.clientY);
      });

      icon.addEventListener('click', (e) => {
        this.particlesUI.spawn(
          (e as MouseEvent).clientX,
          (e as MouseEvent).clientY,
          color,
          12
        );
      });

      (i < 4 ? row1 : row2).appendChild(icon);
    });
  }

  private showDragGhost(color: string, x: number, y: number): void {
    this.hideDragGhost();
    this.dragGhost = document.createElement('div');
    this.dragGhost.style.position = 'fixed';
    this.dragGhost.style.width = '60px';
    this.dragGhost.style.height = '60px';
    this.dragGhost.style.borderRadius = '12px';
    this.dragGhost.style.background = color;
    this.dragGhost.style.pointerEvents = 'none';
    this.dragGhost.style.zIndex = '9999';
    this.dragGhost.style.opacity = '0.8';
    this.dragGhost.style.boxShadow = `0 0 30px ${color}`;
    this.dragGhost.style.transform = 'translate(-50%, -50%)';
    this.dragGhost.style.left = x + 'px';
    this.dragGhost.style.top = y + 'px';
    document.body.appendChild(this.dragGhost);
  }

  private hideDragGhost(): void {
    if (this.dragGhost) {
      this.dragGhost.remove();
      this.dragGhost = null;
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onResize());

    this.container.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.container.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

    this.container.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    });

    this.container.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!this.dragColor) return;

      const anchor = this.stage.findAnchorAtScreenPosition(
        e.clientX,
        e.clientY,
        this.camera,
        this.container
      );

      if (anchor && !anchor.occupied) {
        const light = this.stage.createLight(anchor.index, this.dragColorHex);
        if (light) {
          this.particles3D.spawn(anchor.position.clone().setY(0.5), this.dragColorHex, 20, 0.12);
          this.selectedLightId = light.id;
          this.showHeightSlider(light.height);
        }
      }

      this.particlesUI.spawn(e.clientX, e.clientY, this.dragColor, 15);
      this.dragColor = null;
      this.dragIcon = null;
      this.hideDragGhost();
    });

    window.addEventListener('dragover', (e) => {
      if (this.dragGhost) {
        this.dragGhost.style.left = e.clientX + 'px';
        this.dragGhost.style.top = e.clientY + 'px';
      }
    });

    window.addEventListener('dragend', () => {
      this.dragColor = null;
      this.dragIcon = null;
      this.hideDragGhost();
    });

    const timelineContainer = document.getElementById('timeline-container')!;
    timelineContainer.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('keyframe')) return;

      const clickedKf = this.timeline.findKeyframeAtPosition(e.clientX, e.clientY);
      if (clickedKf) {
        this.openKeyframeEditor(clickedKf, e.clientX, e.clientY);
        return;
      }

      const lightId = this.timeline.getActiveLightId();
      if (lightId === null) return;

      const time = this.timeline.getTimeAtPosition(e.clientX);
      const color = LIGHT_COLORS[0];

      const light = this.stage.lights.get(lightId);
      const defaultColor = light ? '#' + light.color.getHexString() : color;

      const kf = this.timeline.addKeyframe(lightId, time, defaultColor, 0, 80, 0.5);
      this.particlesUI.spawn(e.clientX, e.clientY, kf.color, 10);
    });

    const track = document.getElementById('timeline-track')!;
    track.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('keyframe')) {
        const id = parseInt(target.dataset.id!);
        const kf = this.timeline.getKeyframe(id);
        if (kf) {
          this.openKeyframeEditor(kf, e.clientX, e.clientY);
        }
      }
    });

    const playBtn = document.getElementById('play-button')!;
    const playIcon = document.getElementById('play-icon')!;
    const pauseIcon = document.getElementById('pause-icon')!;

    playBtn.addEventListener('click', () => {
      const playing = this.timeline.toggle();
      if (playing) {
        playBtn.classList.add('playing');
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
      } else {
        playBtn.classList.remove('playing');
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
      }
      const rect = playBtn.getBoundingClientRect();
      this.particlesUI.spawn(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
        playing ? '#FF3B30' : '#34C759',
        12
      );
    });

    document.getElementById('editor-close')!.addEventListener('click', () => {
      this.closeKeyframeEditor();
    });

    const editorTime = document.getElementById('editor-time') as HTMLInputElement;
    const editorTimeVal = document.getElementById('editor-time-value')!;
    editorTime.addEventListener('input', () => {
      const val = parseInt(editorTime.value);
      editorTimeVal.textContent = val + 'ms';
      if (this.editingKeyframe) {
        this.timeline.updateKeyframe(this.editingKeyframe.id, { time: val });
      }
    });

    const editorColor = document.getElementById('editor-color') as HTMLInputElement;
    editorColor.addEventListener('input', () => {
      if (this.editingKeyframe) {
        this.timeline.updateKeyframe(this.editingKeyframe.id, { color: editorColor.value });
      }
    });

    const editorRotation = document.getElementById('editor-rotation') as HTMLInputElement;
    const editorRotationVal = document.getElementById('editor-rotation-value')!;
    editorRotation.addEventListener('input', () => {
      const val = parseInt(editorRotation.value);
      editorRotationVal.textContent = val + '°';
      if (this.editingKeyframe) {
        this.timeline.updateKeyframe(this.editingKeyframe.id, { rotation: val });
      }
    });

    const editorBrightness = document.getElementById('editor-brightness') as HTMLInputElement;
    const editorBrightnessVal = document.getElementById('editor-brightness-value')!;
    editorBrightness.addEventListener('input', () => {
      const val = parseInt(editorBrightness.value);
      editorBrightnessVal.textContent = val + '%';
      if (this.editingKeyframe) {
        this.timeline.updateKeyframe(this.editingKeyframe.id, { brightness: val });
      }
    });

    const editorDuration = document.getElementById('editor-duration') as HTMLInputElement;
    const editorDurationVal = document.getElementById('editor-duration-value')!;
    editorDuration.addEventListener('input', () => {
      const val = parseFloat(editorDuration.value);
      editorDurationVal.textContent = val.toFixed(1) + 's';
      if (this.editingKeyframe) {
        this.timeline.updateKeyframe(this.editingKeyframe.id, { duration: val });
      }
    });

    document.getElementById('editor-delete')!.addEventListener('click', () => {
      if (this.editingKeyframe) {
        this.timeline.removeKeyframe(this.editingKeyframe.id);
        this.closeKeyframeEditor();
      }
    });

    const heightSlider = document.getElementById('height-slider') as HTMLInputElement;
    const heightValue = document.getElementById('height-value')!;
    heightSlider.addEventListener('input', () => {
      const val = parseFloat(heightSlider.value);
      heightValue.textContent = val.toString();
      if (this.selectedLightId !== null) {
        this.stage.setLightHeight(this.selectedLightId, val);
      }
    });

    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      if (e.code === 'KeyR') {
        this.stage.resetAll();
        this.timeline.reset();
        this.particlesUI.spawn(window.innerWidth / 2, window.innerHeight / 2, '#888888', 30);
      }
      if (e.code === 'Space') {
        e.preventDefault();
        playBtn.click();
      }
      if (e.code === 'KeyC') {
        this.cycleCameraMode();
      }
      if (e.code === 'KeyF') {
        this.toggleFullscreen();
      }
    });
  }

  private openKeyframeEditor(kf: Keyframe, x: number, y: number): void {
    const editor = document.getElementById('keyframe-editor')!;
    this.editingKeyframe = kf;

    const editorTime = document.getElementById('editor-time') as HTMLInputElement;
    const editorTimeVal = document.getElementById('editor-time-value')!;
    const editorColor = document.getElementById('editor-color') as HTMLInputElement;
    const editorRotation = document.getElementById('editor-rotation') as HTMLInputElement;
    const editorRotationVal = document.getElementById('editor-rotation-value')!;
    const editorBrightness = document.getElementById('editor-brightness') as HTMLInputElement;
    const editorBrightnessVal = document.getElementById('editor-brightness-value')!;
    const editorDuration = document.getElementById('editor-duration') as HTMLInputElement;
    const editorDurationVal = document.getElementById('editor-duration-value')!;

    editorTime.value = String(kf.time);
    editorTimeVal.textContent = kf.time + 'ms';
    editorColor.value = kf.color;
    editorRotation.value = String(kf.rotation);
    editorRotationVal.textContent = kf.rotation + '°';
    editorBrightness.value = String(kf.brightness);
    editorBrightnessVal.textContent = kf.brightness + '%';
    editorDuration.value = String(kf.duration);
    editorDurationVal.textContent = kf.duration.toFixed(1) + 's';

    let posX = x + 20;
    let posY = y - 160;
    if (posX + 280 > window.innerWidth) posX = x - 300;
    if (posY < 20) posY = 20;
    if (posY + 320 > window.innerHeight) posY = window.innerHeight - 340;

    editor.style.left = posX + 'px';
    editor.style.top = posY + 'px';
    editor.classList.add('active');
  }

  private closeKeyframeEditor(): void {
    document.getElementById('keyframe-editor')!.classList.remove('active');
    this.editingKeyframe = null;
  }

  private showHeightSlider(currentHeight: number): void {
    const container = document.getElementById('height-slider-container')!;
    const slider = document.getElementById('height-slider') as HTMLInputElement;
    const value = document.getElementById('height-value')!;
    slider.value = String(currentHeight);
    value.textContent = String(currentHeight);
    container.classList.add('active');
  }

  private cycleCameraMode(): void {
    this.cameraTweenActive = true;
    this.cameraTweenProgress = 0;

    if (this.cameraMode === CameraMode.FREE) {
      this.cameraMode = CameraMode.TOP;
      this.targetSpherical = { radius: 22, theta: 0, phi: Math.PI / 4.5 };
    } else if (this.cameraMode === CameraMode.TOP) {
      this.cameraMode = CameraMode.FIRST_PERSON;
      this.targetSpherical = { radius: 0, theta: 0, phi: Math.PI / 2.5 };
    } else {
      this.cameraMode = CameraMode.FREE;
      this.targetSpherical = { radius: 20, theta: Math.PI / 4, phi: Math.PI / 3 };
    }
  }

  private toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  private onResize(): void {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    this.isDragging = true;
    this.prevMouse = { x: e.clientX, y: e.clientY };
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    const dx = e.clientX - this.prevMouse.x;
    const dy = e.clientY - this.prevMouse.y;
    this.prevMouse = { x: e.clientX, y: e.clientY };

    this.spherical.theta -= dx * 0.005;
    this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi - dy * 0.005));

    if (this.cameraTweenActive) {
      this.cameraTweenActive = false;
    }
    this.targetSpherical = { ...this.spherical };
  }

  private onMouseUp(e: MouseEvent): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1.1 : 0.9;
    this.spherical.radius = Math.max(5, Math.min(50, this.spherical.radius * delta));
    if (!this.cameraTweenActive) {
      this.targetSpherical.radius = this.spherical.radius;
    }
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();

    if (this.cameraTweenActive) {
      this.cameraTweenProgress += delta * 2;
      if (this.cameraTweenProgress >= 1) {
        this.cameraTweenProgress = 1;
        this.cameraTweenActive = false;
        this.spherical = { ...this.targetSpherical };
      } else {
        const t = this.cameraTweenProgress;
        const easeT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * easeT * 0.1 + delta * 5;
        this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * easeT * 0.1 + delta * 2;
        this.spherical.phi += (this.targetSpherical.phi - this.spherical.phi) * easeT * 0.1 + delta * 2;
      }
    }

    this.updateCameraPosition();
    this.stage.update(delta);
    this.particles3D.update(delta);
    this.particlesUI.update(delta);
    this.timeline.update();
    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
