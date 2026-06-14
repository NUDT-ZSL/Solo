import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import * as TWEEN from '@tweenjs/tween.js';
import { eventBus } from './EventBus';
import type { PlanetData, PlanetPosition } from './types';

interface PlanetObject {
  mesh: THREE.Mesh;
  orbit: THREE.Line;
  highlight: THREE.Sprite;
  data: PlanetData;
}

export class SceneManager {
  private container: HTMLElement;
  private planets: PlanetData[];
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private css2DRenderer: CSS2DRenderer;
  private planetObjects: Map<string, PlanetObject> = new Map();
  private animationFrameId: number | null = null;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private timeLabel: CSS2DObject;
  private selectedPlanet: string | null = null;
  private isAnimatingCamera: boolean = false;
  private currentTarget: THREE.Vector3 = new THREE.Vector3();

  constructor(container: HTMLElement, planets: PlanetData[], css2DRenderer: CSS2DRenderer) {
    this.container = container;
    this.planets = planets;
    this.css2DRenderer = css2DRenderer;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 8, 12);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.css2DRenderer.setSize(container.clientWidth, container.clientHeight);
    this.css2DRenderer.domElement.style.position = 'absolute';
    this.css2DRenderer.domElement.style.top = '0';
    this.css2DRenderer.domElement.style.left = '0';
    this.css2DRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(this.css2DRenderer.domElement);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.timeLabel = this.createTimeLabel();

    this.setupLighting();
    this.createSun();
    this.createPlanets();
    this.createOrbitRings();
    this.createStarfield();
    this.setupEventListeners();
    this.animate();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    const sunLight = new THREE.PointLight(0xffffff, 1.5, 100);
    sunLight.position.set(0, 0, 0);
    this.scene.add(sunLight);
  }

  private createSun(): void {
    const geometry = new THREE.SphereGeometry(0.6, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const sun = new THREE.Mesh(geometry, material);
    this.scene.add(sun);

    const glowGeometry = new THREE.SphereGeometry(0.8, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.scene.add(glow);
  }

  private createRingTexture(color: string): THREE.Texture {
    const canvas = document.createElement('canvas');
    const size = 256;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const innerRadius = size * 0.35;
    const outerRadius = size * 0.5;
    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, innerRadius,
      size / 2, size / 2, outerRadius
    );

    const alphaSteps = [0, 0.6, 0.8, 0.6, 0];
    const posSteps = [0, 0.3, 0.5, 0.7, 1];
    for (let i = 0; i < alphaSteps.length; i++) {
      gradient.addColorStop(posSteps[i], `rgba(255, 255, 255, ${alphaSteps[i]})`);
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, outerRadius, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createPlanets(): void {
    this.planets.forEach((planet) => {
      const geometry = new THREE.SphereGeometry(planet.radius, 16, 16);
      const material = new THREE.MeshStandardMaterial({
        color: planet.color,
        roughness: 0.8,
        metalness: 0.2
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData = { planetName: planet.name };

      const ringTexture = this.createRingTexture(planet.color);
      const highlightMaterial = new THREE.SpriteMaterial({
        map: ringTexture,
        color: planet.color,
        transparent: true,
        opacity: 0,
        depthWrite: false
      });
      const highlight = new THREE.Sprite(highlightMaterial);
      const highlightScale = planet.radius * 3.5;
      highlight.scale.set(highlightScale, highlightScale, 1);
      highlight.userData = { isHighlight: true, planetName: planet.name };

      const orbitPoints: THREE.Vector3[] = [];
      const { semiMajorAxis, eccentricity } = planet.orbitParams;
      const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);
      for (let i = 0; i <= 128; i++) {
        const angle = (i / 128) * Math.PI * 2;
        const x = semiMajorAxis * Math.cos(angle);
        const z = semiMinorAxis * Math.sin(angle);
        orbitPoints.push(new THREE.Vector3(x, 0, z));
      }
      const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
      const orbitMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3,
        linewidth: 1
      });
      const orbit = new THREE.Line(orbitGeometry, orbitMaterial);

      this.scene.add(mesh);
      this.scene.add(highlight);
      this.scene.add(orbit);

      this.planetObjects.set(planet.name, { mesh, orbit, highlight, data: planet });
    });
  }

  private createOrbitRings(): void {
  }

  private createStarfield(): void {
    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 200;
      positions[i + 1] = (Math.random() - 0.5) * 200;
      positions[i + 2] = (Math.random() - 0.5) * 200;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(stars);
  }

  private createTimeLabel(): CSS2DObject {
    const div = document.createElement('div');
    div.className = 'time-label';
    div.textContent = '模拟运行：0天 0小时 0分';
    div.style.cssText = `
      color: #ffffff;
      font-size: 14px;
      font-family: sans-serif;
      background: rgba(0, 0, 0, 0.5);
      padding: 8px 12px;
      border-radius: 6px;
      pointer-events: none;
      user-select: none;
      position: absolute;
      top: 16px;
      right: 16px;
      margin: 0;
    `;

    const label = new CSS2DObject(div);
    label.position.set(0, 0, 0);
    this.scene.add(label);

    return label;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize);
    this.renderer.domElement.addEventListener('click', this.onMouseClick);
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove);

    eventBus.on('update', this.onOrbitUpdate);
    eventBus.on('timeUpdate', this.onTimeUpdate);
  }

  private onWindowResize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.css2DRenderer.setSize(width, height);
  };

  private onMouseMove = (event: MouseEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  };

  private onMouseClick = (event: MouseEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = Array.from(this.planetObjects.values()).map(p => p.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object;
      const planetName = clickedMesh.userData.planetName;
      if (planetName) {
        this.focusPlanet(planetName);
      }
    }
  };

  private onOrbitUpdate = (positions: PlanetPosition[]): void => {
    positions.forEach(({ name, position }) => {
      const planetObj = this.planetObjects.get(name);
      if (planetObj) {
        planetObj.mesh.position.copy(position);
        planetObj.highlight.position.copy(position);

        if (this.selectedPlanet === name) {
          this.currentTarget.copy(position);
        }
      }
    });

    if (this.selectedPlanet && !this.isAnimatingCamera) {
      this.camera.lookAt(this.currentTarget);
    }
  };

  private onTimeUpdate = (payload: { formatted: string }): void => {
    const div = this.timeLabel.element as HTMLDivElement;
    div.textContent = payload.formatted;
  };

  focusPlanet(planetName: string): void {
    const planetObj = this.planetObjects.get(planetName);
    if (!planetObj || this.isAnimatingCamera) return;

    if (this.selectedPlanet && this.selectedPlanet !== planetName) {
      this.clearHighlight(this.selectedPlanet);
    }

    this.selectedPlanet = planetName;
    this.setHighlight(planetName, true);

    const targetPos = planetObj.mesh.position.clone();
    const cameraOffset = new THREE.Vector3(0, planetObj.data.radius * 3, planetObj.data.radius * 5);
    const targetCameraPos = targetPos.clone().add(cameraOffset);

    this.animateCamera(targetCameraPos, targetPos, () => {
      this.currentTarget.copy(targetPos);
    });
  }

  setCameraView(view: 'top' | 'side'): void {
    if (this.isAnimatingCamera) return;

    if (this.selectedPlanet) {
      this.clearHighlight(this.selectedPlanet);
      this.selectedPlanet = null;
    }

    let targetPos: THREE.Vector3;
    let targetLookAt: THREE.Vector3;

    if (view === 'top') {
      targetPos = new THREE.Vector3(0, 15, 0.001);
      targetLookAt = new THREE.Vector3(0, 0, 0);
    } else {
      targetPos = new THREE.Vector3(15, 0, 0.001);
      targetLookAt = new THREE.Vector3(0, 0, 0);
    }

    this.animateCamera(targetPos, targetLookAt, () => {
      this.currentTarget.copy(targetLookAt);
    });
  }

  private animateCamera(
    targetPos: THREE.Vector3,
    targetLookAt: THREE.Vector3,
    onComplete?: () => void
  ): void {
    this.isAnimatingCamera = true;
    const startPos = this.camera.position.clone();
    const startLookAt = new THREE.Vector3();
    this.camera.getWorldDirection(startLookAt);
    startLookAt.add(this.camera.position);

    new TWEEN.Tween({ t: 0 })
      .to({ t: 1 }, 1000)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(({ t }) => {
        this.camera.position.lerpVectors(startPos, targetPos, t);
        const currentLookAt = startLookAt.clone().lerp(targetLookAt, t);
        this.camera.lookAt(currentLookAt);
      })
      .onComplete(() => {
        this.isAnimatingCamera = false;
        this.camera.lookAt(targetLookAt);
        if (onComplete) onComplete();
      })
      .start();
  }

  private setHighlight(planetName: string, visible: boolean): void {
    const planetObj = this.planetObjects.get(planetName);
    if (planetObj) {
      const material = planetObj.highlight.material as THREE.SpriteMaterial;
      const targetOpacity = visible ? 0.7 : 0;

      new TWEEN.Tween({ opacity: material.opacity })
        .to({ opacity: targetOpacity }, 300)
        .onUpdate(({ opacity }) => {
          material.opacity = opacity;
        })
        .start();
    }
  }

  private clearHighlight(planetName: string): void {
    this.setHighlight(planetName, false);
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    TWEEN.update();
    this.renderer.render(this.scene, this.camera);
    this.css2DRenderer.render(this.scene, this.camera);
  };

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  getCSS2DRenderer(): CSS2DRenderer {
    return this.css2DRenderer;
  }

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onWindowResize);
    this.renderer.domElement.removeEventListener('click', this.onMouseClick);
    this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove);
    eventBus.off('update', this.onOrbitUpdate);
    eventBus.off('timeUpdate', this.onTimeUpdate);

    this.planetObjects.forEach(({ mesh, orbit, highlight }) => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      orbit.geometry.dispose();
      (orbit.material as THREE.Material).dispose();
      const highlightMaterial = highlight.material as THREE.SpriteMaterial;
      if (highlightMaterial.map) {
        highlightMaterial.map.dispose();
      }
      highlightMaterial.dispose();
    });

    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
    this.container.removeChild(this.css2DRenderer.domElement);
  }

  private stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
