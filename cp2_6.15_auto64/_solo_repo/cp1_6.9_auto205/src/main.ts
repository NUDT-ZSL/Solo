import * as THREE from 'three';
import { SceneManager } from './scene';
import { IslandManager, Island } from './island';
import { ParticleSystem } from './particles';
import { UIManager, createUIHandlers, UIChangeHandler } from './ui';

class LightOceanApp {
  private container: HTMLElement;
  private sceneManager: SceneManager;
  private islandManager: IslandManager;
  private particleSystem: ParticleSystem;
  private uiManager: UIManager;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private clickCooldown: number = 0;

  private rippleBursts: {
    mesh: THREE.Mesh;
    material: THREE.ShaderMaterial;
    life: number;
    maxLife: number;
  }[] = [];

  constructor() {
    const container = document.getElementById('canvas-container');
    if (!container) {
      throw new Error('Canvas container not found');
    }
    this.container = container;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.sceneManager = new SceneManager(this.container);
    this.islandManager = new IslandManager(this.sceneManager.scene, 'deep');
    this.particleSystem = new ParticleSystem(this.sceneManager.scene, 220, 'deep');

    const handlers = createUIHandlers(
      this.sceneManager,
      this.islandManager,
      this.particleSystem
    );
    this.uiManager = new UIManager(handlers);
  }

  public start(): void {
    const state = this.uiManager.getState();
    this.islandManager.generateIslands(state.islandCount);
    this.islandManager.setWaveSpeed(state.waveSpeed);

    this.setupClickHandler();
    this.setupTouchHandler();

    this.sceneManager.render((delta, elapsed) => {
      this.update(delta, elapsed);
    });
  }

  private setupClickHandler(): void {
    const canvas = this.sceneManager.renderer.domElement;

    canvas.addEventListener('click', (e: MouseEvent) => {
      if (this.clickCooldown > 0) return;

      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.handlePick(e.clientX, e.clientY);
    });
  }

  private setupTouchHandler(): void {
    const canvas = this.sceneManager.renderer.domElement;
    let touchStartTime = 0;
    let touchStartPos = { x: 0, y: 0 };

    canvas.addEventListener('touchstart', (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartTime = Date.now();
        touchStartPos = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        };
      }
    }, { passive: true });

    canvas.addEventListener('touchend', (e: TouchEvent) => {
      const duration = Date.now() - touchStartTime;
      const touch = e.changedTouches[0];
      if (!touch) return;

      const dx = touch.clientX - touchStartPos.x;
      const dy = touch.clientY - touchStartPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (duration < 300 && distance < 10 && this.clickCooldown <= 0) {
        const rect = canvas.getBoundingClientRect();
        this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
        this.handlePick(touch.clientX, touch.clientY);
      }
    }, { passive: true });
  }

  private handlePick(screenX: number, screenY: number): void {
    this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);

    const islandMeshes = this.islandManager.getMeshes();
    const intersects = this.raycaster.intersectObjects(islandMeshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const island = (hit.object as THREE.Mesh).userData.island as Island;
      if (island && hit.point) {
        island.triggerRipple(hit.point);
        this.createBurstEffect(hit.point);
        this.clickCooldown = 0.1;
      }
    }
  }

  private createBurstEffect(position: THREE.Vector3): void {
    const burstGeometry = new THREE.RingGeometry(0.1, 0.3, 32);
    burstGeometry.rotateX(-Math.PI / 2);

    const state = this.uiManager.getState();
    const themeColors = {
      coral: new THREE.Color(0xff4081),
      aurora: new THREE.Color(0x00e5ff),
      lava: new THREE.Color(0xffd740),
      deep: new THREE.Color(0xb388ff)
    };
    const burstColor = themeColors[state.theme as keyof typeof themeColors] || themeColors.deep;

    const burstMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vPosition;
        void main() {
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vPosition;
        uniform vec3 uColor;
        uniform float uAlpha;
        void main() {
          float dist = length(vPosition.xz);
          float glow = 1.0 - smoothstep(0.0, 1.0, dist);
          gl_FragColor = vec4(uColor + glow * 0.5, uAlpha * glow);
        }
      `,
      uniforms: {
        uColor: { value: burstColor },
        uAlpha: { value: 1.0 }
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const burstMesh = new THREE.Mesh(burstGeometry, burstMaterial);
    burstMesh.position.copy(position);
    burstMesh.position.y += 0.1;

    this.sceneManager.scene.add(burstMesh);
    this.rippleBursts.push({
      mesh: burstMesh,
      material: burstMaterial,
      life: 1.2,
      maxLife: 1.2
    });
  }

  private update(delta: number, elapsed: number): void {
    if (this.clickCooldown > 0) {
      this.clickCooldown -= delta;
    }

    this.islandManager.update(delta, elapsed);

    const rippleInfos = this.islandManager.getAllRippleInfos();
    this.particleSystem.update(delta, elapsed, rippleInfos);

    this.updateBursts(delta);
  }

  private updateBursts(delta: number): void {
    for (let i = this.rippleBursts.length - 1; i >= 0; i--) {
      const burst = this.rippleBursts[i];
      burst.life -= delta;

      const lifeRatio = burst.life / burst.maxLife;
      const scale = 1 + (1 - lifeRatio) * 12;
      burst.mesh.scale.setScalar(scale);
      burst.material.uniforms.uAlpha.value = lifeRatio;

      if (burst.life <= 0) {
        this.sceneManager.scene.remove(burst.mesh);
        burst.mesh.geometry.dispose();
        burst.material.dispose();
        this.rippleBursts.splice(i, 1);
      }
    }
  }

  public dispose(): void {
    this.islandManager.clearIslands();
    this.particleSystem.dispose();

    for (const burst of this.rippleBursts) {
      this.sceneManager.scene.remove(burst.mesh);
      burst.mesh.geometry.dispose();
      burst.material.dispose();
    }
    this.rippleBursts = [];
  }
}

function initApp(): void {
  try {
    const app = new LightOceanApp();
    app.start();

    window.addEventListener('beforeunload', () => {
      app.dispose();
    });
  } catch (error) {
    console.error('Failed to initialize Light Ocean Islands:', error);

    const container = document.getElementById('canvas-container');
    if (container) {
      container.innerHTML = `
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: #ff6b6b;
          font-family: sans-serif;
          text-align: center;
          padding: 30px;
          background: rgba(0,0,0,0.7);
          border-radius: 12px;
          max-width: 500px;
        ">
          <h2 style="margin-bottom: 16px;">初始化失败</h2>
          <p style="color: #ccc; font-size: 14px; line-height: 1.6;">
            ${error instanceof Error ? error.message : String(error)}
          </p>
          <p style="color: #888; font-size: 12px; margin-top: 16px;">
            请检查浏览器是否支持 WebGL，或按 F12 查看详细错误信息
          </p>
        </div>
      `;
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
