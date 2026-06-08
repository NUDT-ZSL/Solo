import * as THREE from 'three';
import { Fragment, createFragments, createReferencePot, resetFragments, getLockedCount } from './fragments';
import { InteractionSystem, ParticleBurst } from './interaction';
import { TextureManager, PatternType } from './textureManager';

type LightingMode = 'sunlight' | 'museum' | 'darkroom';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private clock: THREE.Clock;

  private fragments: Fragment[] = [];
  private referencePot: THREE.Mesh | null = null;
  private interaction: InteractionSystem | null = null;
  private particles: ParticleBurst | null = null;
  private textureManager: TextureManager;

  private lightingMode: LightingMode = 'sunlight';
  private ambientLight: THREE.AmbientLight;
  private hemiLight: THREE.HemisphereLight;
  private directionalLight: THREE.DirectionalLight;
  private spotLight: THREE.SpotLight;
  private spotLightTarget: THREE.Object3D;
  private emissiveGlow: THREE.PointLight;

  private pattern: PatternType = 'diamond';
  private patternSequence: PatternType[] = ['diamond', 'wave', 'figure'];

  private targetSceneColor: THREE.Color = new THREE.Color(0x2D2D2D);
  private currentSceneColor: THREE.Color = new THREE.Color(0x2D2D2D);
  private sceneColorTransitionStart: number = 0;
  private sceneColorTransitionDuration: number = 1000;

  private highlightMaterialCache: Map<number, THREE.MeshStandardMaterial> = new Map();
  private originalMaterialCache: Map<number, THREE.MeshStandardMaterial> = new Map();

  private hintTimer: number | null = null;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2D2D2D);

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    this.textureManager = new TextureManager();

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xffeebb, 0x332211, 0.6);
    this.scene.add(this.hemiLight);

    this.directionalLight = new THREE.DirectionalLight(0xfff0dd, 1.2);
    this.directionalLight.position.set(5, 8, 5);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.set(1024, 1024);
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 30;
    this.directionalLight.shadow.camera.left = -8;
    this.directionalLight.shadow.camera.right = 8;
    this.directionalLight.shadow.camera.top = 8;
    this.directionalLight.shadow.camera.bottom = -8;
    this.scene.add(this.directionalLight);

    this.spotLightTarget = new THREE.Object3D();
    this.spotLightTarget.position.set(0, 0, 0);
    this.scene.add(this.spotLightTarget);

    this.spotLight = new THREE.SpotLight(0xffffff, 0);
    this.spotLight.position.set(2, 6, 4);
    this.spotLight.angle = Math.PI / 6;
    this.spotLight.penumbra = 0.5;
    this.spotLight.decay = 2;
    this.spotLight.distance = 20;
    this.spotLight.target = this.spotLightTarget;
    this.spotLight.castShadow = true;
    this.scene.add(this.spotLight);

    this.emissiveGlow = new THREE.PointLight(0xf7c948, 0, 8);
    this.emissiveGlow.position.set(0, 0, 0);
    this.scene.add(this.emissiveGlow);

    const groundGeo = new THREE.CircleGeometry(15, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.9,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -3.5;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.interaction = new InteractionSystem(this.scene, this.camera, this.renderer, this.renderer.domElement);
    this.particles = new ParticleBurst(this.scene);
  }

  init(): void {
    this.textureManager.init();

    this.referencePot = createReferencePot();
    this.scene.add(this.referencePot);

    this.fragments = createFragments(7);
    this.fragments.forEach((f, i) => {
      const material = f.mesh.material as THREE.MeshStandardMaterial;
      material.bumpMap = this.textureManager.getBumpMap();
      material.bumpScale = 0.05;
      this.originalMaterialCache.set(f.id, material);
      this.scene.add(f.mesh);
      const patIdx = i % this.patternSequence.length;
      this.pattern = this.patternSequence[patIdx];
    });

    this.interaction?.setFragments(this.fragments);
    this.interaction?.onSnap((f) => this.handleFragmentSnap(f));
    this.interaction?.init();

    this.updateUI();
    this.showHint();
    this.bindUI();
    this.setLighting('sunlight');
    window.addEventListener('resize', this.handleResize);
    this.animate();
  }

  private showHint(): void {
    const hint = document.getElementById('hint');
    if (hint) {
      hint.classList.add('show');
      if (this.hintTimer) clearTimeout(this.hintTimer);
      this.hintTimer = window.setTimeout(() => {
        hint.classList.remove('show');
      }, 4000);
    }
  }

  private handleFragmentSnap(fragment: Fragment): void {
    const pos = fragment.mesh.position.clone();
    this.particles?.trigger(pos, 0xF7C948);

    const idx = fragment.id % this.patternSequence.length;
    const pattern = this.patternSequence[idx];
    const material = fragment.mesh.material as THREE.MeshStandardMaterial;
    this.animatePatternReveal(material, pattern);

    this.highlightSnap(fragment);

    this.updateUI();

    const locked = getLockedCount(this.fragments);
    if (locked === this.fragments.length) {
      this.handleComplete();
    }
  }

  private highlightSnap(fragment: Fragment): void {
    const material = fragment.mesh.material as THREE.MeshStandardMaterial;
    const origEmissive = material.emissive.getHex();
    material.emissive.setHex(0xF7C948);
    material.emissiveIntensity = 0.6;
    const startTime = performance.now();
    const duration = 600;
    const animateHighlight = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - t;
      material.emissiveIntensity = 0.6 * ease;
      if (t < 1) {
        requestAnimationFrame(animateHighlight);
      } else {
        material.emissive.setHex(origEmissive);
        material.emissiveIntensity = 0;
      }
    };
    animateHighlight();
  }

  private animatePatternReveal(material: THREE.MeshStandardMaterial, pattern: PatternType): void {
    const startTime = performance.now();
    const duration = 800;
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      this.textureManager.updateReveal(material, pattern, eased);
      if (t < 1) requestAnimationFrame(animate);
    };
    animate();
  }

  private handleComplete(): void {
    const hint = document.getElementById('hint');
    if (hint) {
      hint.textContent = '🎉 修复完成！您已成功复原古代陶器';
      hint.classList.add('show');
      setTimeout(() => hint.classList.remove('show'), 5000);
    }
    if (this.referencePot) {
      this.animateOutReference();
    }
  }

  private animateOutReference(): void {
    if (!this.referencePot) return;
    const mat = this.referencePot.material as THREE.MeshStandardMaterial;
    const startTime = performance.now();
    const duration = 1200;
    const startOp = mat.opacity;
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      mat.opacity = startOp * (1 - t);
      if (t < 1) requestAnimationFrame(animate);
    };
    animate();
  }

  private updateUI(): void {
    const locked = getLockedCount(this.fragments);
    const total = this.fragments.length;
    const currentEl = document.getElementById('progress-current');
    const totalEl = document.getElementById('progress-total');
    const fillEl = document.getElementById('progress-fill');
    if (currentEl) currentEl.textContent = String(locked);
    if (totalEl) totalEl.textContent = String(total);
    if (fillEl) fillEl.style.width = `${(locked / total) * 100}%`;
  }

  private bindUI(): void {
    const resetBtn = document.getElementById('reset-btn');
    resetBtn?.addEventListener('click', () => this.handleReset());

    const exportBtn = document.getElementById('export-btn');
    exportBtn?.addEventListener('click', () => this.handleExportScreenshot());

    const lightBtns = document.querySelectorAll<HTMLButtonElement>('.light-btn');
    lightBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.light as LightingMode;
        if (mode) {
          lightBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          btn.classList.remove('ripple');
          void btn.offsetWidth;
          btn.classList.add('ripple');
          setTimeout(() => btn.classList.remove('ripple'), 800);
          this.setLighting(mode);
        }
      });
    });
  }

  private handleReset(): void {
    resetFragments(this.fragments);
    this.fragments.forEach(f => {
      const mat = f.mesh.material as THREE.MeshStandardMaterial;
      mat.map = null;
      mat.needsUpdate = true;
    });
    if (this.referencePot) {
      const mat = this.referencePot.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.25;
    }
    this.updateUI();
    this.showHint();
  }

  private handleExportScreenshot(): void {
    this.renderer.render(this.scene, this.camera);
    const dataURL = this.renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = `pottery-restoration-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  public setLighting(mode: LightingMode): void {
    this.lightingMode = mode;
    this.sceneColorTransitionStart = performance.now();

    if (mode === 'sunlight') {
      this.targetSceneColor = new THREE.Color(0x2D2D2D);
      this.animateLightTo(this.ambientLight, 0.35, 0xffffff);
      this.animateLightTo(this.hemiLight, 0.55, 0xffeebb, 0x332211);
      this.animateLightTo(this.directionalLight, 1.1, 0xfff0dd);
      this.animateLightTo(this.spotLight, 0, 0xffffff);
      this.animateLightTo(this.emissiveGlow, 0, 0xf7c948);
      this.animateExposureTo(1.0);
    } else if (mode === 'museum') {
      this.targetSceneColor = new THREE.Color(0x0d1117);
      this.animateLightTo(this.ambientLight, 0.08, 0x8899aa);
      this.animateLightTo(this.hemiLight, 0.05, 0xaaaacc, 0x111122);
      this.animateLightTo(this.directionalLight, 0, 0xffffff);
      this.animateLightTo(this.spotLight, 3.0, 0xf5f5ff);
      this.animateLightTo(this.emissiveGlow, 0, 0xf7c948);
      this.animateExposureTo(0.95);
    } else if (mode === 'darkroom') {
      this.targetSceneColor = new THREE.Color(0x050505);
      this.animateLightTo(this.ambientLight, 0.02, 0x221111);
      this.animateLightTo(this.hemiLight, 0.0, 0x000000, 0x000000);
      this.animateLightTo(this.directionalLight, 0, 0x000000);
      this.animateLightTo(this.spotLight, 0, 0x000000);
      this.animateLightTo(this.emissiveGlow, 2.5, 0xf7c948);
      this.animateExposureTo(1.15);
      this.animateFragmentsEmissive();
    }
  }

  private animateLightTo(light: THREE.Light, targetIntensity: number, targetColorHex: number, groundColorHex?: number): void {
    const startTime = performance.now();
    const duration = 1000;
    const startIntensity = light.intensity;
    const startColor = new THREE.Color().copy(light.color);
    const targetColor = new THREE.Color(targetColorHex);

    let startGroundColor: THREE.Color | null = null;
    let targetGroundColor: THREE.Color | null = null;
    if (light instanceof THREE.HemisphereLight && groundColorHex !== undefined) {
      startGroundColor = new THREE.Color().copy(light.groundColor);
      targetGroundColor = new THREE.Color(groundColorHex);
    }

    const step = () => {
      const t = Math.min((performance.now() - startTime) / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      light.intensity = startIntensity + (targetIntensity - startIntensity) * eased;
      light.color.copy(startColor).lerp(targetColor, eased);
      if (light instanceof THREE.HemisphereLight && startGroundColor && targetGroundColor) {
        light.groundColor.copy(startGroundColor).lerp(targetGroundColor, eased);
      }
      if (t < 1) requestAnimationFrame(step);
    };
    step();
  }

  private animateExposureTo(target: number): void {
    const startTime = performance.now();
    const duration = 1000;
    const start = this.renderer.toneMappingExposure;
    const step = () => {
      const t = Math.min((performance.now() - startTime) / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      this.renderer.toneMappingExposure = start + (target - start) * eased;
      if (t < 1) requestAnimationFrame(step);
    };
    step();
  }

  private animateFragmentsEmissive(): void {
    this.fragments.forEach(f => {
      if (!f.isLocked) return;
      const mat = f.mesh.material as THREE.MeshStandardMaterial;
      const startTime = performance.now();
      const duration = 1000;
      const startIntensity = mat.emissiveIntensity || 0;
      const target = 0.4;
      const targetColor = new THREE.Color(0xf7c948);
      const step = () => {
        const t = Math.min((performance.now() - startTime) / duration, 1);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        mat.emissiveIntensity = startIntensity + (target - startIntensity) * eased;
        mat.emissive.copy(targetColor);
        if (t < 1) requestAnimationFrame(step);
      };
      step();
    });
  }

  private handleResize = (): void => {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();

    if (performance.now() - this.sceneColorTransitionStart < this.sceneColorTransitionDuration) {
      const t = Math.min((performance.now() - this.sceneColorTransitionStart) / this.sceneColorTransitionDuration, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      this.currentSceneColor.copy(new THREE.Color(0x2D2D2D)).lerp(this.targetSceneColor, 0);
      const bg = this.scene.background as THREE.Color;
      if (bg) {
        const start = bg.clone();
        bg.lerpColors(start, this.targetSceneColor, eased);
      }
    } else {
      (this.scene.background as THREE.Color).copy(this.targetSceneColor);
    }

    this.particles?.update();

    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    window.removeEventListener('resize', this.handleResize);
    this.interaction?.dispose();
    this.textureManager.dispose();
    this.fragments.forEach(f => {
      f.mesh.geometry.dispose();
      const mat = f.mesh.material as THREE.Material;
      mat.dispose();
    });
    if (this.referencePot) {
      this.referencePot.geometry.dispose();
      (this.referencePot.material as THREE.Material).dispose();
    }
    this.renderer.dispose();
    if (this.hintTimer) clearTimeout(this.hintTimer);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
  (window as any).__app = app;
});
