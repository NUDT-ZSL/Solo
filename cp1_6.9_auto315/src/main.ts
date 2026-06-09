import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { generateTree, GeneratedTree, TreeParams } from './treeGenerator';
import { FlowerAnimationSystem } from './flowerAnimation';

const DEFAULT_PARAMS: TreeParams = {
  depth: 6,
  lengthRatio: 0.65,
  angle: 30,
  startHue: 30,
};

const TRANSITION_DURATION = 0.3;

class FractalTreeApp {
  private appEl: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private clock: THREE.Clock;
  private elapsedTime: number = 0;

  private currentParams: TreeParams;
  private targetParams: TreeParams;
  private transitioning: boolean = false;
  private transitionProgress: number = 0;
  private transitionStartParams: TreeParams;

  private currentTree: GeneratedTree | null = null;
  private previousTree: GeneratedTree | null = null;
  private treeGroup: THREE.Group;
  private treeSwayGroup: THREE.Group;

  private flowerSystem: FlowerAnimationSystem;

  private rootGlow: THREE.Mesh;
  private stars: THREE.Points;

  private fpsCounter: HTMLElement;
  private frameCount: number = 0;
  private fpsTimer: number = 0;

  private rebuildPending: boolean = false;
  private rebuildCooldown: number = 0;

  constructor() {
    this.appEl = document.getElementById('app')!;

    this.currentParams = { ...DEFAULT_PARAMS };
    this.targetParams = { ...DEFAULT_PARAMS };
    this.transitionStartParams = { ...DEFAULT_PARAMS };

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.018);

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.camera.position.set(4.5, 3.5, 6);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    this.appEl.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 20;
    this.controls.target.set(0, 1.5, 0);

    this.treeGroup = new THREE.Group();
    this.treeSwayGroup = new THREE.Group();
    this.treeSwayGroup.add(this.treeGroup);
    this.scene.add(this.treeSwayGroup);

    this.flowerSystem = new FlowerAnimationSystem(this.scene);

    this.rootGlow = this.createRootGlow();
    this.scene.add(this.rootGlow);

    this.stars = this.createStars();
    this.scene.add(this.stars);

    this.clock = new THREE.Clock();

    this.fpsCounter = document.getElementById('fps-counter')!;

    this.setupUI();
    this.setupPanelDrag();
    this.setupResize();
    this.rebuildTree();
  }

  private createRootGlow(): THREE.Mesh {
    const geo = new THREE.CircleGeometry(0.5, 48);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffd98a,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -0.195;

    const glow2 = new THREE.Mesh(
      new THREE.CircleGeometry(0.85, 48),
      new THREE.MeshBasicMaterial({
        color: 0xffc96a,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    glow2.rotation.x = -Math.PI / 2;
    glow2.position.y = -0.19;
    mesh.add(glow2);

    return mesh;
  }

  private createStars(): THREE.Points {
    const count = 600;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const r = 40 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.5 + 10;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const hueChoice = Math.random();
      const c = new THREE.Color();
      if (hueChoice < 0.35) {
        c.setHSL(0.68, 0.7, 0.7 + Math.random() * 0.25);
      } else if (hueChoice < 0.65) {
        c.setHSL(0.82, 0.5, 0.65 + Math.random() * 0.25);
      } else if (hueChoice < 0.85) {
        c.setHSL(0.12, 0.8, 0.75 + Math.random() * 0.2);
      } else {
        c.setHSL(0, 0, 0.8 + Math.random() * 0.2);
      }
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      sizes[i] = 0.08 + Math.random() * 0.22;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      size: 0.15,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return new THREE.Points(geo, mat);
  }

  private clearTreeGroup() {
    const dispose = (obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material?.dispose();
        }
      } else if (obj instanceof THREE.Line) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material?.dispose();
        }
      } else if (obj instanceof THREE.Points) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          const mat = obj.material as THREE.PointsMaterial;
          mat?.dispose();
          if (mat?.map) mat.map.dispose();
        }
      }
    };

    for (let i = this.treeGroup.children.length - 1; i >= 0; i--) {
      const obj = this.treeGroup.children[i];
      obj.traverse(dispose);
      this.treeGroup.remove(obj);
    }
  }

  private rebuildTree() {
    this.clearTreeGroup();

    if (this.previousTree) {
      this.previousTree = null;
    }

    const tree = generateTree(this.currentParams);

    for (const b of tree.branches) this.treeGroup.add(b);
    for (const f of tree.flowers) this.treeGroup.add(f);
    for (const l of tree.branchLines) this.treeGroup.add(l);
    for (const s of tree.flowerSprites) this.treeGroup.add(s);

    this.currentTree = tree;
  }

  private scheduleRebuild() {
    this.rebuildPending = true;
    this.rebuildCooldown = 0.01;
  }

  private performRebuildIfNeeded(delta: number) {
    if (!this.rebuildPending) return;
    this.rebuildCooldown -= delta;
    if (this.rebuildCooldown > 0) return;

    this.rebuildPending = false;
    const t0 = performance.now();
    this.rebuildTree();
    const dt = performance.now() - t0;
    if (dt > 45) {
      console.warn(`树重建用时 ${dt.toFixed(0)}ms`);
    }
  }

  private updateTransition(delta: number) {
    if (!this.transitioning) return;

    this.transitionProgress += delta / TRANSITION_DURATION;
    const t = Math.min(this.transitionProgress, 1);
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    this.currentParams.depth = Math.round(
      lerp(this.transitionStartParams.depth, this.targetParams.depth, ease)
    );
    this.currentParams.lengthRatio = lerp(
      this.transitionStartParams.lengthRatio,
      this.targetParams.lengthRatio,
      ease
    );
    this.currentParams.angle = lerp(
      this.transitionStartParams.angle,
      this.targetParams.angle,
      ease
    );
    this.currentParams.startHue = lerp(
      this.transitionStartParams.startHue,
      this.targetParams.startHue,
      ease
    );

    this.syncUIFromParams(false);

    if (t >= 1) {
      this.transitioning = false;
      this.currentParams = { ...this.targetParams };
      this.syncUIFromParams(false);
    }

    this.scheduleRebuild();
  }

  private animate(delta: number) {
    this.elapsedTime += delta;

    this.updateTransition(delta);
    this.performRebuildIfNeeded(delta);

    const swayAmp = 0.018;
    const swayX = Math.sin(this.elapsedTime * 0.7) * swayAmp;
    const swayZ = Math.cos(this.elapsedTime * 0.5) * swayAmp;
    this.treeSwayGroup.rotation.x = swayX * 0.5;
    this.treeSwayGroup.rotation.z = swayZ * 0.5;
    this.treeSwayGroup.position.y = Math.sin(this.elapsedTime * 1.3) * 0.008;

    const glowMat = this.rootGlow.material as THREE.MeshBasicMaterial;
    glowMat.opacity = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(this.elapsedTime * 1.8));
    const glowPulse = 1 + 0.15 * Math.sin(this.elapsedTime * 1.2);
    this.rootGlow.scale.setScalar(glowPulse);

    const childGlow = this.rootGlow.children[0] as THREE.Mesh;
    if (childGlow) {
      const cm = childGlow.material as THREE.MeshBasicMaterial;
      cm.opacity = 0.1 + 0.12 * (0.5 + 0.5 * Math.sin(this.elapsedTime * 2.3));
      childGlow.scale.setScalar(1 + 0.08 * Math.sin(this.elapsedTime * 0.9 + 0.5));
    }

    this.stars.rotation.y += delta * 0.004;

    if (this.currentTree) {
      this.flowerSystem.update(this.currentTree.flowers, this.elapsedTime, delta);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    this.frameCount++;
    this.fpsTimer += delta;
    if (this.fpsTimer >= 0.5) {
      const fps = Math.round(this.frameCount / this.fpsTimer);
      this.fpsCounter.textContent = `FPS: ${fps}`;
      this.frameCount = 0;
      this.fpsTimer = 0;
    }
  }

  private syncUIFromParams(updateTargets: boolean) {
    const params = updateTargets ? this.targetParams : this.currentParams;

    const depthEl = document.getElementById('depth-value')!;
    const ratioEl = document.getElementById('ratio-value')!;
    const angleEl = document.getElementById('angle-value')!;
    const hueEl = document.getElementById('hue-value')!;
    const huePreview = document.getElementById('hue-preview') as HTMLSpanElement;

    if (updateTargets) {
      (document.getElementById('depth-slider') as HTMLInputElement).value = String(params.depth);
      (document.getElementById('ratio-slider') as HTMLInputElement).value = String(params.lengthRatio);
      (document.getElementById('angle-slider') as HTMLInputElement).value = String(params.angle);
      (document.getElementById('hue-slider') as HTMLInputElement).value = String(params.startHue);
    }

    depthEl.textContent = String(Math.round(params.depth));
    ratioEl.textContent = params.lengthRatio.toFixed(2);
    angleEl.textContent = `${Math.round(params.angle)}°`;
    hueEl.textContent = String(Math.round(params.startHue));

    const c = new THREE.Color().setHSL(params.startHue / 360, 0.85, 0.5);
    huePreview.style.background = `#${c.getHexString()}`;
    huePreview.style.color = `#${c.getHexString()}`;
  }

  private beginTransitionTo(newParams: Partial<TreeParams>) {
    this.transitionStartParams = { ...this.currentParams };
    this.targetParams = { ...this.targetParams, ...newParams };
    this.transitioning = true;
    this.transitionProgress = 0;
  }

  private setupUI() {
    const depthSlider = document.getElementById('depth-slider') as HTMLInputElement;
    const ratioSlider = document.getElementById('ratio-slider') as HTMLInputElement;
    const angleSlider = document.getElementById('angle-slider') as HTMLInputElement;
    const hueSlider = document.getElementById('hue-slider') as HTMLInputElement;

    const depthValue = document.getElementById('depth-value')!;
    const ratioValue = document.getElementById('ratio-value')!;
    const angleValue = document.getElementById('angle-value')!;
    const hueValue = document.getElementById('hue-value')!;
    const huePreview = document.getElementById('hue-preview') as HTMLSpanElement;

    depthSlider.addEventListener('input', () => {
      const v = parseInt(depthSlider.value);
      depthValue.textContent = String(v);
      this.beginTransitionTo({ depth: v });
    });

    ratioSlider.addEventListener('input', () => {
      const v = parseFloat(ratioSlider.value);
      ratioValue.textContent = v.toFixed(2);
      this.beginTransitionTo({ lengthRatio: v });
    });

    angleSlider.addEventListener('input', () => {
      const v = parseInt(angleSlider.value);
      angleValue.textContent = `${v}°`;
      this.beginTransitionTo({ angle: v });
    });

    hueSlider.addEventListener('input', () => {
      const v = parseInt(hueSlider.value);
      hueValue.textContent = String(v);
      const c = new THREE.Color().setHSL(v / 360, 0.85, 0.5);
      huePreview.style.background = `#${c.getHexString()}`;
      huePreview.style.color = `#${c.getHexString()}`;
      this.beginTransitionTo({ startHue: v });
    });

    (document.getElementById('depth-reset') as HTMLButtonElement).addEventListener('click', () => {
      this.beginTransitionTo({ depth: DEFAULT_PARAMS.depth });
      this.syncUIFromParams(true);
    });
    (document.getElementById('ratio-reset') as HTMLButtonElement).addEventListener('click', () => {
      this.beginTransitionTo({ lengthRatio: DEFAULT_PARAMS.lengthRatio });
      this.syncUIFromParams(true);
    });
    (document.getElementById('angle-reset') as HTMLButtonElement).addEventListener('click', () => {
      this.beginTransitionTo({ angle: DEFAULT_PARAMS.angle });
      this.syncUIFromParams(true);
    });
    (document.getElementById('hue-reset') as HTMLButtonElement).addEventListener('click', () => {
      this.beginTransitionTo({ startHue: DEFAULT_PARAMS.startHue });
      this.syncUIFromParams(true);
    });

    this.syncUIFromParams(true);
  }

  private setupPanelDrag() {
    const panel = document.getElementById('control-panel')!;
    const header = document.getElementById('panel-header')!;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let origX = 0;
    let origY = 0;

    header.addEventListener('mousedown', (e: MouseEvent) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = panel.getBoundingClientRect();
      origX = rect.left;
      origY = rect.top;
      panel.style.transition = 'none';
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let nx = origX + dx;
      let ny = origY + dy;
      nx = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, nx));
      ny = Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, ny));
      panel.style.left = `${nx}px`;
      panel.style.top = `${ny}px`;
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        panel.style.transition = '';
      }
    });
  }

  private setupResize() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  start() {
    const tick = () => {
      const delta = Math.min(this.clock.getDelta(), 0.05);
      this.animate(delta);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  dispose() {
    this.flowerSystem.dispose();
    this.clearTreeGroup();
    this.renderer.dispose();
    this.controls.dispose();
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

const app = new FractalTreeApp();
app.start();
