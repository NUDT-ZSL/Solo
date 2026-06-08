import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LavaSurface } from './LavaSurface';
import { BubbleSystem } from './BubbleSystem';
import { InfoCard } from './InfoCard';

export interface SceneParams {
  flowSpeed: number;
  heatWaveIntensity: number;
  coolingRate: number;
}

export class CoreScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private lavaSurface: LavaSurface;
  private bubbleSystem: BubbleSystem;
  private infoCard: InfoCard;
  private clock: THREE.Clock;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private params: SceneParams;
  private defaultCameraPos = new THREE.Vector3(0, 8, 12);
  private defaultCameraTarget = new THREE.Vector3(0, 0, 0);
  private ambientParticles: THREE.Points | null = null;

  constructor(container: HTMLElement) {
    this.params = {
      flowSpeed: 1.0,
      heatWaveIntensity: 1.0,
      coolingRate: 0.5,
    };

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x1a0500, 0.015);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.copy(this.defaultCameraPos);
    this.camera.lookAt(this.defaultCameraTarget);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 30;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.target.copy(this.defaultCameraTarget);

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.lavaSurface = new LavaSurface(this.scene, this.params);
    this.bubbleSystem = new BubbleSystem(this.scene, this.params);
    this.infoCard = new InfoCard();

    this.setupLights();
    this.setupAmbientParticles();
    this.setupEvents();

    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x331100, 0.5);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xff4400, 3, 50);
    pointLight1.position.set(5, 5, 5);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff6600, 2, 50);
    pointLight2.position.set(-5, 5, -5);
    this.scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0xff2200, 2.5, 40);
    pointLight3.position.set(0, 8, 0);
    this.scene.add(pointLight3);
  }

  private setupAmbientParticles(): void {
    const count = 500;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = Math.random() * 15;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
      velocities[i * 3] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 1] = Math.random() * 0.03 + 0.01;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
      sizes[i] = Math.random() * 0.15 + 0.05;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aVelocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute vec3 aVelocity;
        attribute float aSize;
        uniform float uTime;
        varying float vAlpha;
        void main() {
          vec3 pos = position;
          pos += aVelocity * uTime * 60.0;
          pos.y = mod(pos.y, 15.0);
          pos.xz = mod(pos.xz + 20.0, 40.0) - 20.0;
          vAlpha = smoothstep(15.0, 5.0, pos.y) * 0.6;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = aSize * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, d) * vAlpha;
          gl_FragColor = vec4(1.0, 0.4, 0.1, alpha);
        }
      `,
    });

    this.ambientParticles = new THREE.Points(geometry, material);
    this.scene.add(this.ambientParticles);
  }

  private setupEvents(): void {
    window.addEventListener('resize', this.onResize);

    this.renderer.domElement.addEventListener('click', this.onMouseClick);
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private onMouseClick = (event: MouseEvent): void => {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const bubbleMeshes = this.bubbleSystem.getBubbleMeshes();
    const intersects = this.raycaster.intersectObjects(bubbleMeshes);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const bubbleData = this.bubbleSystem.getBubbleData(hit.object as THREE.Mesh);
      if (bubbleData) {
        const worldPos = new THREE.Vector3();
        hit.object.getWorldPosition(worldPos);
        const projected = worldPos.clone().project(this.camera);
        const screenX = (projected.x * 0.5 + 0.5) * window.innerWidth;
        const screenY = (-projected.y * 0.5 + 0.5) * window.innerHeight;

        this.bubbleSystem.burstBubble(hit.object as THREE.Mesh, worldPos);
        this.infoCard.show(screenX, screenY, bubbleData);
      }
    } else {
      this.infoCard.hide();
    }
  };

  updateParams(params: Partial<SceneParams>): void {
    Object.assign(this.params, params);
  }

  resetCamera(): void {
    this.camera.position.copy(this.defaultCameraPos);
    this.controls.target.copy(this.defaultCameraTarget);
    this.controls.update();
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const elapsed = this.clock.getElapsedTime();
    const delta = this.clock.getDelta();

    this.controls.update();

    this.lavaSurface.update(elapsed);
    this.bubbleSystem.update(elapsed);

    if (this.ambientParticles) {
      (this.ambientParticles.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;
    }

    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.renderer.domElement.removeEventListener('click', this.onMouseClick);
    this.controls.dispose();
    this.lavaSurface.dispose();
    this.bubbleSystem.dispose();
    this.infoCard.dispose();
    this.renderer.dispose();
  }
}
