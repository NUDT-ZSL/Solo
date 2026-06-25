import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createBuildings, createGround } from './building';
import { LightController } from './lightController';
import { createUI } from './ui';

class CityShadowSimulator {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private lightController: LightController;
  private sunSphere: THREE.Mesh;
  private infoElement: HTMLElement;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x263238);
    this.scene.fog = new THREE.FogExp2(0x263238, 0.0015);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.set(200, 180, 250);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    document.body.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 30, 0);
    this.controls.maxPolarAngle = Math.PI / 2.05;
    this.controls.minDistance = 50;
    this.controls.maxDistance = 600;

    this.lightController = new LightController(this.scene, this.renderer);

    const buildings = createBuildings();
    this.scene.add(buildings);

    const ground = createGround();
    this.scene.add(ground);

    const sunGeometry = new THREE.SphereGeometry(10, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd54f,
      transparent: true,
      opacity: 0.9,
    });
    this.sunSphere = new THREE.Mesh(sunGeometry, sunMaterial);
    this.scene.add(this.sunSphere);

    const sunGlow = new THREE.PointLight(0xffd54f, 0.3, 200);
    this.sunSphere.add(sunGlow);

    this.infoElement = document.createElement('div');
    this.infoElement.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      color: #ffffff;
      font-size: 16px;
      font-family: monospace;
      background: rgba(0,0,0,0.5);
      border-radius: 8px;
      padding: 8px;
      z-index: 100;
      line-height: 1.6;
    `;
    document.body.appendChild(this.infoElement);

    createUI(this.lightController);

    this.updateSunPosition();
    this.lightController.setOnUpdate(() => this.updateSunPosition());

    window.addEventListener('resize', () => this.onResize());

    this.animate();
  }

  private updateSunPosition(): void {
    const { azimuth, elevation } = this.lightController.getSunAngles();
    const { x, y, z } = this.lightController.getSunPosition();
    this.sunSphere.position.set(x, y, z);
    this.infoElement.innerHTML =
      `方位角: ${azimuth.toFixed(1)}°<br>高度角: ${elevation.toFixed(1)}°`;
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    this.controls.update();
    this.lightController.update();
    this.renderer.render(this.scene, this.camera);
  };
}

new CityShadowSimulator();
