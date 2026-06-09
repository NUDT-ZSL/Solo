import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Fragment, FragmentState, FragmentConfig } from './fragment';
import {
  easeInOutCubic,
  SpiralPath,
  StardustSystem,
  TrailParticleSystem,
  BurstParticleSystem,
  TotemFactory,
  Shockwave,
} from './effects';

const ANIMATION = {
  FLY_TO_CENTER_DURATION: 2000,
  BURST_DURATION: 1000,
  COALESCE_DURATION: 500,
  FLY_BACK_DURATION: 1000,
  SHOCKWAVE_DURATION: 600,
  SPIRAL_PITCH: 0.3,
  SPIRAL_TURNS: 2,
  TRAIL_PARTICLES_PER_FRAME: 30,
  BURST_PARTICLE_COUNT: 80,
  RING_BASE_ROTATION_SPEED: 0.02,
  RING_MAX_ROTATION_SPEED: 0.1,
  RING_SPEED_INCREMENT: 0.02,
} as const;

const RING = {
  FRAGMENT_COUNT: 5,
  INNER_RADIUS: 1.3,
  OUTER_RADIUS: 2.2,
  THICKNESS: 0.3,
  OUTER_HEIGHT: 1.5,
  INNER_HEIGHT: 0.8,
};

interface ActiveFragmentAnimation {
  fragment: Fragment;
  phase: 'flyTo' | 'burst' | 'coalesce' | 'flyBack';
  phaseElapsed: number;
  spiral: SpiralPath | null;
  trail: TrailParticleSystem | null;
  burst: BurstParticleSystem | null;
  totem: THREE.Mesh | null;
  totemStartScale: number;
  totemEndScale: number;
  shockwave: Shockwave | null;
  startWorldPos: THREE.Vector3;
}

class Ruins {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  container: HTMLElement;
  clock: THREE.Clock;
  ringGroup: THREE.Group;
  fragments: Fragment[] = [];
  stardust: StardustSystem;
  activeAnims: Map<Fragment, ActiveFragmentAnimation> = new Map();
  raycaster: THREE.Raycaster = new THREE.Raycaster();
  mouseNdc: THREE.Vector2 = new THREE.Vector2();
  hoveredFragment: Fragment | null = null;
  ringRotationSpeed: number = ANIMATION.RING_BASE_ROTATION_SPEED;
  globalTime: number = 0;
  private audioCtx: AudioContext | null = null;
  private ambientOsc: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;
  private audioStarted = false;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container #${containerId} not found`);
    this.container = el;
    this.clock = new THREE.Clock();
    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();
    this.container.appendChild(this.renderer.domElement);
    this.addBackground();
    this.addLights();
    this.ringGroup = new THREE.Group();
    this.scene.add(this.ringGroup);
    this.createFragments();
    this.stardust = new StardustSystem(this.scene, 150);
    window.addEventListener('resize', this.onResize);
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    this.onResize();
    this.animate();
  }

  private createScene(): THREE.Scene {
    const s = new THREE.Scene();
    return s;
  }

  private addBackground() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const grd = ctx.createRadialGradient(128, 128, 10, 128, 128, 180);
    const c1 = new THREE.Color().setHSL(250 / 360, 0.7, 0.08);
    const c2 = new THREE.Color().setHSL(275 / 360, 0.8, 0.04);
    grd.addColorStop(0, `rgb(${c1.r * 255},${c1.g * 255},${c1.b * 255})`);
    grd.addColorStop(1, `rgb(${c2.r * 255},${c2.g * 255},${c2.b * 255})`);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = tex;
    this.scene.fog = new THREE.FogExp2(0x080418, 0.08);
  }

  private createCamera(): THREE.PerspectiveCamera {
    const c = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    c.position.set(0, 2.8, 5.2);
    c.lookAt(0, 0, 0);
    return c;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const r = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.setSize(window.innerWidth, window.innerHeight);
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.1;
    r.outputColorSpace = THREE.SRGBColorSpace;
    return r;
  }

  private createControls(): OrbitControls {
    const c = new OrbitControls(this.camera, this.renderer.domElement);
    c.enableDamping = true;
    c.dampingFactor = 0.07;
    c.minDistance = 2.5;
    c.maxDistance = 12;
    c.autoRotate = false;
    c.enablePan = false;
    c.maxPolarAngle = Math.PI * 0.88;
    c.minPolarAngle = Math.PI * 0.12;
    return c;
  }

  private addLights() {
    const ambient = new THREE.AmbientLight(0x4a3a7a, 0.55);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffc98b, 1.1);
    dir.position.set(4, 5, 3);
    this.scene.add(dir);
    const fill = new THREE.DirectionalLight(0x7788ff, 0.35);
    fill.position.set(-3, 2, -4);
    this.scene.add(fill);
    const center = new THREE.PointLight(0xffaa55, 0.6, 6, 2);
    center.position.set(0, 0, 0);
    this.scene.add(center);
  }

  private createFragments() {
    const arc = (Math.PI * 2) / RING.FRAGMENT_COUNT;
    for (let i = 0; i < RING.FRAGMENT_COUNT; i++) {
      const cfg: FragmentConfig = {
        index: i,
        arcAngle: arc,
        ringInnerRadius: RING.INNER_RADIUS,
        ringOuterRadius: RING.OUTER_RADIUS,
        thickness: RING.THICKNESS,
        outerHeight: RING.OUTER_HEIGHT,
        innerHeight: RING.INNER_HEIGHT,
      };
      const f = new Fragment(this.ringGroup, cfg);
      this.fragments.push(f);
    }
  }

  private onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };

  private updateNdcFromEvent(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouseNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private pickFragment(): Fragment | null {
    this.raycaster.setFromCamera(this.mouseNdc, this.camera);
    const idleMeshes = this.fragments
      .filter((f) => f.state === FragmentState.Idle)
      .map((f) => f.mesh);
    if (idleMeshes.length === 0) return null;
    const hits = this.raycaster.intersectObjects(idleMeshes, false);
    if (hits.length === 0) return null;
    return this.fragments.find((f) => f.mesh === hits[0].object) || null;
  }

  private onPointerMove = (e: PointerEvent) => {
    this.updateNdcFromEvent(e);
    const f = this.pickFragment();
    const dom = this.renderer.domElement;
    if (this.hoveredFragment && this.hoveredFragment !== f) {
      this.hoveredFragment = null;
    }
    if (f && !this.hoveredFragment) {
      this.hoveredFragment = f;
    }
    dom.style.cursor = f ? 'pointer' : 'grab';
  };

  private onPointerDown = (e: PointerEvent) => {
    if (!this.audioStarted) {
      this.ensureAmbientAudio();
      this.audioStarted = true;
    }
    this.updateNdcFromEvent(e);
    const f = this.pickFragment();
    if (f && f.state === FragmentState.Idle && !this.activeAnims.has(f)) {
      this.triggerMemoryRepair(f);
    }
  };

  private ensureAmbientAudio() {
    try {
      const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      this.audioCtx = new Ctx();
      const ctx = this.audioCtx;
      this.ambientOsc = ctx.createOscillator();
      this.ambientGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 180;
      filter.Q.value = 0.7;
      this.ambientOsc.type = 'sine';
      this.ambientOsc.frequency.value = 55;
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = 82.4;
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.08;
      lfoGain.gain.value = 4;
      lfo.connect(lfoGain);
      lfoGain.connect(this.ambientOsc.frequency);
      this.ambientGain.gain.value = 0;
      this.ambientGain.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 2);
      this.ambientOsc.connect(filter);
      osc2.connect(filter);
      filter.connect(this.ambientGain);
      this.ambientGain.connect(ctx.destination);
      this.ambientOsc.start();
      osc2.start();
      lfo.start();
    } catch {
      // ignore audio errors
    }
  }

  private playRepairChime() {
    if (!this.audioCtx) return;
    try {
      const ctx = this.audioCtx;
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0, now + i * 0.08);
        g.gain.linearRampToValueAtTime(0.15, now + i * 0.08 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.9);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 1);
      });
    } catch {
      // ignore
    }
  }

  private triggerMemoryRepair(f: Fragment) {
    f.state = FragmentState.FlyingToCenter;
    f.mesh.updateMatrixWorld(true);
    const worldPos = new THREE.Vector3();
    f.mesh.getWorldPosition(worldPos);
    const localStart = this.ringGroup.worldToLocal(worldPos.clone());
    const spiral = new SpiralPath(localStart, ANIMATION.SPIRAL_PITCH, ANIMATION.SPIRAL_TURNS);
    const trail = new TrailParticleSystem(this.scene, 2400, 0.8);
    const anim: ActiveFragmentAnimation = {
      fragment: f,
      phase: 'flyTo',
      phaseElapsed: 0,
      spiral,
      trail,
      burst: null,
      totem: null,
      totemStartScale: 0.01,
      totemEndScale: 0.3,
      shockwave: null,
      startWorldPos: worldPos,
    };
    this.activeAnims.set(f, anim);
  }

  private updateActiveAnimations(delta: number) {
    for (const [f, a] of Array.from(this.activeAnims.entries())) {
      a.phaseElapsed += delta * 1000;
      switch (a.phase) {
        case 'flyTo': {
          const dur = ANIMATION.FLY_TO_CENTER_DURATION;
          const t = Math.min(1, a.phaseElapsed / dur);
          const eased = easeInOutCubic(t);
          const pt = a.spiral!.getPoint(t, false);
          f.group.position.copy(pt);
          f.group.rotation.y += delta * 2.5;
          f.group.rotation.x = Math.sin(t * Math.PI) * 0.6;
          f.group.scale.setScalar(1 - eased * 0.25);
          if (a.trail) {
            const world = f.group.localToWorld(new THREE.Vector3(0, 0, 0));
            a.trail.emit(world, ANIMATION.TRAIL_PARTICLES_PER_FRAME);
            a.trail.update(delta);
          }
          if (t >= 1) {
            a.phase = 'burst';
            a.phaseElapsed = 0;
            f.state = FragmentState.Bursting;
            f.setVisible(false);
            a.burst = new BurstParticleSystem(this.scene, ANIMATION.BURST_PARTICLE_COUNT);
            if (a.trail) {
              setTimeout(() => {
                if (a.trail) {
                  this.scene.remove(a.trail.points);
                  a.trail.dispose();
                  a.trail = null;
                }
              }, 900);
            }
          }
          break;
        }
        case 'burst': {
          const done = a.burst!.update(delta, a.phaseElapsed / 1000);
          if (a.phaseElapsed >= ANIMATION.BURST_DURATION) {
            a.phase = 'coalesce';
            a.phaseElapsed = 0;
            f.state = FragmentState.Coalescing;
            a.burst!.startCoalesce();
          }
          void done;
          break;
        }
        case 'coalesce': {
          const coalesceDone = a.burst!.update(delta, a.phaseElapsed / 1000);
          if (!a.totem) {
            const { mesh } = TotemFactory.createRandom(this.scene);
            mesh.position.set(0, 0, 0);
            mesh.visible = true;
            a.totem = mesh;
            a.totemStartScale = 0.01;
            a.totemEndScale = 0.3;
          }
          const ct = Math.min(1, a.phaseElapsed / ANIMATION.COALESCE_DURATION);
          const easedCt = easeInOutCubic(ct);
          const s = THREE.MathUtils.lerp(a.totemStartScale, a.totemEndScale, easedCt);
          a.totem.scale.setScalar(s);
          a.totem.rotation.y += delta * 4;
          a.totem.rotation.x = Math.sin(ct * Math.PI) * 0.3;
          if (coalesceDone || ct >= 1) {
            if (a.burst) {
              this.scene.remove(a.burst.points);
              a.burst.dispose();
              a.burst = null;
            }
            a.phase = 'flyBack';
            a.phaseElapsed = 0;
            f.state = FragmentState.FlyingBack;
            const endLocal = f.originalLocalPos.clone();
            const backStart = new THREE.Vector3(0, 0, 0);
            a.spiral = new SpiralPath(endLocal, ANIMATION.SPIRAL_PITCH, ANIMATION.SPIRAL_TURNS);
            void backStart;
          }
          break;
        }
        case 'flyBack': {
          const dur = ANIMATION.FLY_BACK_DURATION;
          const t = Math.min(1, a.phaseElapsed / dur);
          const eased = easeInOutCubic(t);
          const pt = a.spiral!.getPoint(t, true);
          if (a.totem) {
            a.totem.position.copy(pt);
            a.totem.rotation.y += delta * 5;
            a.totem.rotation.z = Math.sin(t * Math.PI) * 0.4;
            const sc = THREE.MathUtils.lerp(a.totemEndScale, 0.6, eased);
            a.totem.scale.setScalar(sc * (1 - eased * 0.4));
          }
          if (t >= 1) {
            f.resetToOriginalTransform();
            f.setVisible(true);
            f.markAsRepaired();
            this.playRepairChime();
            if (a.totem) {
              const geo = a.totem.geometry as THREE.BufferGeometry;
              const mat = a.totem.material as THREE.Material;
              geo.dispose();
              mat.dispose();
              this.scene.remove(a.totem);
              a.totem = null;
            }
            a.shockwave = new Shockwave(this.scene, f.originalLocalPos.clone(), ANIMATION.SHOCKWAVE_DURATION / 1000);
            this.ringRotationSpeed = Math.min(
              ANIMATION.RING_MAX_ROTATION_SPEED,
              this.ringRotationSpeed + ANIMATION.RING_SPEED_INCREMENT
            );
            a.phaseElapsed = 0;
            setTimeout(() => {
              if (a.shockwave) {
                this.scene.remove(a.shockwave.mesh);
                a.shockwave.dispose();
                a.shockwave = null;
              }
              this.activeAnims.delete(f);
            }, ANIMATION.SHOCKWAVE_DURATION + 50);
          }
          break;
        }
      }
      if (a.shockwave) {
        a.shockwave.update(delta);
      }
    }
  }

  private animate = () => {
    requestAnimationFrame(this.animate);
    const delta = Math.min(0.05, this.clock.getDelta());
    this.globalTime += delta;
    this.ringGroup.rotation.y += this.ringRotationSpeed * delta;
    for (const f of this.fragments) {
      f.updateShaderTime(this.globalTime);
    }
    this.stardust.update(delta, this.globalTime);
    this.updateActiveAnimations(delta);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };
}

new Ruins('app');
