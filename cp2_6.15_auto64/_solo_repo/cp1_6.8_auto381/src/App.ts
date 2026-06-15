import * as THREE from 'three';
import { ParticleSystem } from './ParticleSystem';
import { WebManager } from './WebManager';
import { InteractionHandler } from './InteractionHandler';
import { ControlPanel } from './ControlPanel';

export class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particleSystem!: ParticleSystem;
  private webManager!: WebManager;
  private interactionHandler!: InteractionHandler;
  private controlPanel!: ControlPanel;
  private clock: THREE.Clock;
  private backgroundMesh!: THREE.Mesh;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.clock = new THREE.Clock();
  }

  init() {
    this.createBackground();

    this.particleSystem = new ParticleSystem(150, 0.02);
    this.scene.add(this.particleSystem.points);
    this.scene.add(this.particleSystem.haloPoints);

    this.webManager = new WebManager(this.particleSystem, 8);
    this.scene.add(this.webManager.getObject());

    this.interactionHandler = new InteractionHandler(
      this.camera,
      this.renderer,
      this.particleSystem
    );

    this.controlPanel = new ControlPanel({
      particleCount: 150,
      connectionDistance: 8,
      restoreSpeed: 0.02,
      onParticleCountChange: (count) => this.handleParticleCountChange(count),
      onConnectionDistanceChange: (dist) => this.handleConnectionDistanceChange(dist),
      onRestoreSpeedChange: (speed) => this.handleRestoreSpeedChange(speed),
      onResetLayout: () => this.handleResetLayout(),
    });
  }

  private createBackground() {
    const geo = new THREE.PlaneGeometry(200, 200);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        void main() {
          vec2 center = vUv - 0.5;
          float dist = length(center);
          vec3 black = vec3(0.02, 0.0, 0.05);
          vec3 deepPurple = vec3(0.08, 0.02, 0.15);
          float t = smoothstep(0.0, 0.7, dist);
          vec3 col = mix(black, deepPurple, t);
          float pulse = sin(uTime * 0.3) * 0.01 + 0.01;
          col += vec3(pulse * 0.5, 0.0, pulse);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      depthWrite: false,
      depthTest: false,
    });
    this.backgroundMesh = new THREE.Mesh(geo, mat);
    this.backgroundMesh.position.z = -50;
    this.backgroundMesh.renderOrder = -1;
    this.scene.add(this.backgroundMesh);
  }

  private handleParticleCountChange(count: number) {
    const intCount = Math.round(count);
    if (intCount === this.particleSystem.count) return;

    this.scene.remove(this.particleSystem.points);
    this.scene.remove(this.particleSystem.haloPoints);
    this.scene.remove(this.webManager.getObject());

    this.particleSystem.regenerate(intCount);
    this.webManager.onParticleCountChanged(intCount);

    this.scene.add(this.particleSystem.points);
    this.scene.add(this.particleSystem.haloPoints);
    this.scene.add(this.webManager.getObject());
  }

  private handleConnectionDistanceChange(dist: number) {
    this.webManager.setConnectionDistance(dist);
  }

  private handleRestoreSpeedChange(speed: number) {
    this.particleSystem.restoreSpeed = speed;
  }

  private handleResetLayout() {
    this.particleSystem.resetLayout();
  }

  update() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;

    if (this.backgroundMesh) {
      const mat = this.backgroundMesh.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = elapsed;
    }

    this.particleSystem.update(dt);
    this.webManager.update();
  }

  dispose() {
    this.interactionHandler.dispose();
    this.controlPanel.dispose();
  }
}
