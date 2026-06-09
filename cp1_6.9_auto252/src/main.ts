import * as THREE from 'three';
import { BubbleManager } from './bubbleManager.js';
import { ParticleEffect } from './particleEffect.js';
import { TextDisplay } from './textDisplay.js';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private clock: THREE.Clock;

  private bubbleManager: BubbleManager;
  private particleEffect: ParticleEffect;
  private textDisplay: TextDisplay;

  private hoveredBubble: THREE.Mesh | null = null;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 15);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    document.getElementById('app')!.appendChild(this.renderer.domElement);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();

    this.setupLights();

    this.particleEffect = new ParticleEffect(this.scene);
    this.textDisplay = new TextDisplay(this.scene, this.camera);
    this.bubbleManager = new BubbleManager(this.scene);

    this.setupEventListeners();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(-8, 10, 6);
    this.scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffaa66, 1.2, 50);
    pointLight.position.set(8, -6, 4);
    this.scene.add(pointLight);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('click', (e) => this.onClick(e));
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.textDisplay.onResize();
  }

  private onMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.bubbleManager.getBubbles());

    if (this.hoveredBubble && (!intersects.length || intersects[0].object !== this.hoveredBubble)) {
      this.bubbleManager.resetBubbleScale(this.hoveredBubble);
      this.hoveredBubble = null;
      document.body.style.cursor = 'default';
    }

    if (intersects.length > 0) {
      const bubble = intersects[0].object as THREE.Mesh;
      if (this.hoveredBubble !== bubble) {
        this.hoveredBubble = bubble;
        this.bubbleManager.hoverBubble(bubble);
        document.body.style.cursor = 'pointer';
      }
    }
  }

  private onClick(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.bubbleManager.getBubbles());

    if (intersects.length > 0) {
      const bubble = intersects[0].object as THREE.Mesh;
      const data = this.bubbleManager.getBubbleData(bubble);
      if (data) {
        const worldPos = new THREE.Vector3();
        bubble.getWorldPosition(worldPos);
        const color = (bubble.material as THREE.ShaderMaterial).uniforms.uBaseColor.value.clone();

        this.particleEffect.spawnBurst(worldPos, color);
        this.textDisplay.showText(data.poem, worldPos);
        this.bubbleManager.popBubble(bubble);

        if (this.hoveredBubble === bubble) {
          this.hoveredBubble = null;
          document.body.style.cursor = 'default';
        }
      }
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    this.bubbleManager.update(delta, time);
    this.particleEffect.update(delta);
    this.textDisplay.update(delta);

    const cameraAngle = time * 0.05;
    const radius = 15;
    this.camera.position.x = Math.sin(cameraAngle) * radius;
    this.camera.position.z = Math.cos(cameraAngle) * radius;
    this.camera.position.y = Math.sin(time * 0.03) * 2;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  };

  public start(): void {
    this.animate();
  }
}

const app = new App();
app.start();
