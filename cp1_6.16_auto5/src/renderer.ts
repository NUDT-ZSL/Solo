import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PlanetState, PlanetData, PLANET_DATA } from './solarSystem';

export interface ConstellationData {
  name: string;
  stars: { x: number; y: number; z: number }[];
  connections: [number, number][];
  labelPosition: { x: number; y: number; z: number };
}

const CONSTELLATIONS: ConstellationData[] = [
  {
    name: 'Ursa Major',
    stars: [
      { x: -300, y: 200, z: -400 },
      { x: -280, y: 180, z: -410 },
      { x: -250, y: 190, z: -395 },
      { x: -230, y: 170, z: -405 },
      { x: -260, y: 150, z: -380 },
      { x: -290, y: 140, z: -390 },
      { x: -310, y: 160, z: -385 }
    ],
    connections: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0], [1, 5], [2, 4]],
    labelPosition: { x: -270, y: 220, z: -400 }
  },
  {
    name: 'Orion',
    stars: [
      { x: 350, y: 100, z: -350 },
      { x: 370, y: 130, z: -340 },
      { x: 340, y: 80, z: -360 },
      { x: 380, y: 70, z: -355 },
      { x: 355, y: 50, z: -345 },
      { x: 365, y: 50, z: -348 },
      { x: 375, y: 50, z: -351 }
    ],
    connections: [[0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 6], [4, 5], [5, 6]],
    labelPosition: { x: 360, y: 160, z: -350 }
  },
  {
    name: 'Cassiopeia',
    stars: [
      { x: -100, y: 280, z: -420 },
      { x: -80, y: 250, z: -415 },
      { x: -60, y: 270, z: -410 },
      { x: -40, y: 245, z: -405 },
      { x: -20, y: 265, z: -400 }
    ],
    connections: [[0, 1], [1, 2], [2, 3], [3, 4]],
    labelPosition: { x: -60, y: 310, z: -410 }
  },
  {
    name: 'Leo',
    stars: [
      { x: 150, y: -50, z: -380 },
      { x: 175, y: -30, z: -375 },
      { x: 200, y: -45, z: -370 },
      { x: 220, y: -25, z: -365 },
      { x: 240, y: -40, z: -360 }
    ],
    connections: [[0, 1], [1, 2], [2, 3], [3, 4]],
    labelPosition: { x: 190, y: -10, z: -370 }
  }
];

export class Renderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private sun: THREE.Mesh | null = null;
  private sunParticles: THREE.Points | null = null;
  private planetMeshes: Map<string, THREE.Mesh> = new Map();
  private planetHighlights: Map<string, THREE.Mesh> = new Map();
  private planetAxisLines: Map<string, THREE.Line> = new Map();
  private orbitLines: Map<string, THREE.Line> = new Map();
  private orbitPhases: Map<string, number> = new Map();
  private saturnRings: Map<string, THREE.Points> = new Map();
  private saturnRingSizes: Map<string, Float32Array> = new Map();
  private saturnRingPhases: Map<string, Float32Array> = new Map();
  private trajectoryLines: Map<string, THREE.Points> = new Map();
  private constellationGroup: THREE.Group | null = null;
  private constellationLabels: Map<string, HTMLDivElement> = new Map();
  private container: HTMLElement;
  private selectedPlanetId: string | null = null;
  private hoveredPlanetId: string | null = null;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private constellationsVisible: boolean = true;
  private trajectoryFadeProgress: Map<string, number> = new Map();

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0B0C10);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      2000
    );
    this.camera.position.set(0, 80, 120);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 400;
    this.controls.enablePan = false;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupLighting();
    this.createSun();
    this.createPlanets();
    this.createOrbits();
    this.createSaturnRings();
    this.createConstellations();
    this.createBackgroundStars();

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(ambientLight);

    const sunLight = new THREE.PointLight(0xFFD700, 2, 500);
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    this.scene.add(sunLight);
  }

  private createSun(): void {
    const sunGeometry = new THREE.SphereGeometry(8, 64, 64);
    const sunMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vec3 color1 = vec3(1.0, 0.843, 0.0);
          vec3 color2 = vec3(1.0, 0.549, 0.0);
          
          float noise = sin(vPosition.x * 10.0 + time) * sin(vPosition.y * 10.0 + time * 0.7) * 0.5 + 0.5;
          float gradient = dot(normalize(vNormal), vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;
          
          vec3 finalColor = mix(color2, color1, gradient * 0.7 + noise * 0.3);
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });

    this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
    this.scene.add(this.sun);

    const sunGlowGeometry = new THREE.SphereGeometry(10, 32, 32);
    const sunGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFD700,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide
    });
    const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
    this.scene.add(sunGlow);

    const particleCount = 500;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const radius = 9 + Math.random() * 3;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      sizes[i] = Math.random() * 2 + 0.5;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleMaterial = new THREE.PointsMaterial({
      color: 0xFFA500,
      size: 0.5,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    this.sunParticles = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(this.sunParticles);
  }

  private createPlanets(): void {
    PLANET_DATA.forEach((data: PlanetData) => {
      const geometry = new THREE.SphereGeometry(data.size, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: data.color,
        roughness: 0.7,
        metalness: 0.1
      });

      const planet = new THREE.Mesh(geometry, material);
      planet.castShadow = true;
      planet.receiveShadow = true;
      planet.userData = { planetId: data.id };
      this.planetMeshes.set(data.id, planet);
      this.scene.add(planet);

      const highlightGeometry = new THREE.SphereGeometry(data.size * 1.5, 32, 32);
      const highlightMaterial = new THREE.MeshBasicMaterial({
        color: data.color,
        transparent: true,
        opacity: 0,
        side: THREE.BackSide
      });
      const highlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
      highlight.visible = false;
      this.planetHighlights.set(data.id, highlight);
      this.scene.add(highlight);

      const axisLength = data.size * 1.5;
      const axisPoints = [
        new THREE.Vector3(0, -axisLength, 0),
        new THREE.Vector3(0, axisLength, 0)
      ];
      const axisGeometry = new THREE.BufferGeometry().setFromPoints(axisPoints);
      const axisMaterial = new THREE.LineBasicMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.4
      });
      const axisLine = new THREE.Line(axisGeometry, axisMaterial);
      this.planetAxisLines.set(data.id, axisLine);
      this.scene.add(axisLine);
    });
  }

  private createOrbits(): void {
    PLANET_DATA.forEach((data: PlanetData) => {
      const points: THREE.Vector3[] = [];
      const segments = 128;

      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(
          Math.cos(theta) * data.orbitalRadius,
          0,
          Math.sin(theta) * data.orbitalRadius
        ));
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.15
      });

      const orbitLine = new THREE.Line(geometry, material);
      this.orbitLines.set(data.id, orbitLine);
      this.scene.add(orbitLine);
      this.orbitPhases.set(data.id, Math.random() * Math.PI * 2);
    });
  }

  private createSaturnRings(): void {
    const saturnData = PLANET_DATA.find(d => d.hasRing);
    if (!saturnData) return;

    const particleCount = 2000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const baseSizes = new Float32Array(particleCount);
    const phases = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const innerRadius = saturnData.size * 1.4;
      const outerRadius = saturnData.size * 2.2;
      const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
      const theta = Math.random() * Math.PI * 2;

      positions[i * 3] = radius * Math.cos(theta);
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
      positions[i * 3 + 2] = radius * Math.sin(theta);

      const gray = 0.6 + Math.random() * 0.3;
      colors[i * 3] = gray;
      colors[i * 3 + 1] = gray * 0.9;
      colors[i * 3 + 2] = gray * 0.8;

      baseSizes[i] = 0.06 + Math.random() * 0.08;
      sizes[i] = baseSizes[i];
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });

    const ring = new THREE.Points(geometry, material);
    ring.rotation.x = Math.PI / 2.5;
    this.saturnRings.set(saturnData.id, ring);
    this.saturnRingSizes.set(saturnData.id, baseSizes);
    this.saturnRingPhases.set(saturnData.id, phases);
    this.scene.add(ring);
  }

  private createConstellations(): void {
    this.constellationGroup = new THREE.Group();

    CONSTELLATIONS.forEach((constellation) => {
      const starGeometry = new THREE.BufferGeometry();
      const starPositions = new Float32Array(constellation.stars.length * 3);

      constellation.stars.forEach((star, i) => {
        starPositions[i * 3] = star.x;
        starPositions[i * 3 + 1] = star.y;
        starPositions[i * 3 + 2] = star.z;
      });

      starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

      const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.5,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: false
      });

      const stars = new THREE.Points(starGeometry, starMaterial);
      this.constellationGroup!.add(stars);

      constellation.connections.forEach(([startIdx, endIdx]) => {
        const start = constellation.stars[startIdx];
        const end = constellation.stars[endIdx];

        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(start.x, start.y, start.z),
          new THREE.Vector3(end.x, end.y, end.z)
        ]);

        const lineMaterial = new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.15
        });

        const line = new THREE.Line(lineGeometry, lineMaterial);
        this.constellationGroup!.add(line);
      });

      const labelDiv = document.createElement('div');
      labelDiv.textContent = constellation.name;
      labelDiv.style.position = 'absolute';
      labelDiv.style.color = '#A9B2C3';
      labelDiv.style.fontSize = '11px';
      labelDiv.style.fontFamily = 'Georgia, serif';
      labelDiv.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.125)';
      labelDiv.style.pointerEvents = 'none';
      labelDiv.style.whiteSpace = 'nowrap';
      this.container.appendChild(labelDiv);
      this.constellationLabels.set(constellation.name, labelDiv);
    });

    this.scene.add(this.constellationGroup);
  }

  private createBackgroundStars(): void {
    const starCount = 5000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 600 + Math.random() * 400;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const brightness = 0.5 + Math.random() * 0.5;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: false
    });

    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
  }

  public updateTrajectory(planetId: string, points: { x: number; z: number }[]): void {
    let trajectory = this.trajectoryLines.get(planetId);
    const fadeProgress = this.trajectoryFadeProgress.get(planetId) || 0;

    if (points.length === 0) {
      if (trajectory && fadeProgress < 1) {
        const newFade = fadeProgress + 0.02;
        this.trajectoryFadeProgress.set(planetId, newFade);
        (trajectory.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - newFade);
        if (newFade >= 1) {
          this.scene.remove(trajectory);
          this.trajectoryLines.delete(planetId);
          this.trajectoryFadeProgress.delete(planetId);
        }
      }
      return;
    }

    this.trajectoryFadeProgress.set(planetId, 0);

    const positions = new Float32Array(points.length * 3);
    const colors = new Float32Array(points.length * 3);
    const sizes = new Float32Array(points.length);

    points.forEach((point, i) => {
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = 0.1;
      positions[i * 3 + 2] = point.z;

      const alpha = i / points.length;
      colors[i * 3] = 1 * alpha + 0.3 * (1 - alpha);
      colors[i * 3 + 1] = 0.8 * alpha + 0.2 * (1 - alpha);
      colors[i * 3 + 2] = 0.2 * alpha + 0.1 * (1 - alpha);
      sizes[i] = 0.15 + alpha * 0.2;
    });

    if (!trajectory) {
      const geometry = new THREE.BufferGeometry();
      const material = new THREE.PointsMaterial({
        size: 0.3,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true
      });
      trajectory = new THREE.Points(geometry, material);
      this.trajectoryLines.set(planetId, trajectory);
      this.scene.add(trajectory);
    }

    trajectory.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    trajectory.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    trajectory.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    trajectory.geometry.attributes.position.needsUpdate = true;
    trajectory.geometry.attributes.color.needsUpdate = true;
  }

  public render(planetStates: PlanetState[], time: number): void {
    if (this.sun && this.sun.material instanceof THREE.ShaderMaterial) {
      this.sun.material.uniforms.time.value = time * 0.001;
    }

    if (this.sunParticles) {
      this.sunParticles.rotation.y += 0.001;
    }

    this.orbitLines.forEach((line, id) => {
      const phase = this.orbitPhases.get(id) || 0;
      const breathe = Math.sin(time * Math.PI / 2000 + phase) * 0.5 + 0.5;
      const opacity = 0.3 + breathe * 0.4;
      (line.material as THREE.LineBasicMaterial).opacity = opacity;
    });

    planetStates.forEach((state) => {
      const planet = this.planetMeshes.get(state.id);
      if (planet) {
        planet.position.set(state.x, state.y, state.z);
        planet.rotation.y = state.rotationY;
      }

      const axisLine = this.planetAxisLines.get(state.id);
      if (axisLine) {
        axisLine.position.set(state.x, state.y, state.z);
        axisLine.rotation.y = state.rotationY;
      }

      const highlight = this.planetHighlights.get(state.id);
      if (highlight) {
        highlight.position.set(state.x, state.y, state.z);
        const isHighlighted = this.selectedPlanetId === state.id || this.hoveredPlanetId === state.id;
        highlight.visible = isHighlighted;
        if (isHighlighted) {
          const material = highlight.material as THREE.MeshBasicMaterial;
          material.opacity = 0.3 + Math.sin(time * 0.005) * 0.1;
        }
      }

      const ring = this.saturnRings.get(state.id);
      if (ring) {
        ring.position.set(state.x, state.y, state.z);
        ring.rotation.z += 0.002;

        const baseSizes = this.saturnRingSizes.get(state.id);
        const phases = this.saturnRingPhases.get(state.id);
        if (baseSizes && phases) {
          const sizeAttr = ring.geometry.getAttribute('size') as THREE.BufferAttribute;
          const colorAttr = ring.geometry.getAttribute('color') as THREE.BufferAttribute;
          
          for (let i = 0; i < baseSizes.length; i++) {
            const flicker = Math.sin(time * 0.003 + phases[i]) * 0.3 + 0.7;
            sizeAttr.setX(i, baseSizes[i] * flicker);
            
            const colorFlicker = 0.8 + flicker * 0.2;
            colorAttr.setX(i, colorAttr.getX(i) * colorFlicker);
            colorAttr.setY(i, colorAttr.getY(i) * colorFlicker);
            colorAttr.setZ(i, colorAttr.getZ(i) * colorFlicker);
          }
          sizeAttr.needsUpdate = true;
          colorAttr.needsUpdate = true;
        }
      }
    });

    this.trajectoryLines.forEach((_, id) => {
      const trajectory = this.trajectoryLines.get(id);
      const fadeProgress = this.trajectoryFadeProgress.get(id);
      if (trajectory && fadeProgress && fadeProgress > 0 && fadeProgress < 1) {
        (trajectory.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - fadeProgress);
      }
    });

    this.updateConstellationLabels();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  private updateConstellationLabels(): void {
    if (!this.constellationsVisible) {
      this.constellationLabels.forEach((label) => {
        label.style.display = 'none';
      });
      return;
    }

    CONSTELLATIONS.forEach((constellation) => {
      const label = this.constellationLabels.get(constellation.name);
      if (!label) return;

      label.style.display = 'block';

      const vector = new THREE.Vector3(
        constellation.labelPosition.x,
        constellation.labelPosition.y,
        constellation.labelPosition.z
      );
      vector.project(this.camera);

      const x = (vector.x * 0.5 + 0.5) * this.container.clientWidth;
      const y = (-vector.y * 0.5 + 0.5) * this.container.clientHeight;

      label.style.left = `${x}px`;
      label.style.top = `${y}px`;
      label.style.transform = 'translate(-50%, -50%)';
    });
  }

  public setSelectedPlanet(planetId: string | null): void {
    this.selectedPlanetId = planetId;
  }

  public setHoveredPlanet(planetId: string | null): void {
    this.hoveredPlanetId = planetId;
  }

  public getPlanetIdFromMouseEvent(event: MouseEvent): string | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const planetMeshes = Array.from(this.planetMeshes.values());
    const intersects = this.raycaster.intersectObjects(planetMeshes);

    if (intersects.length > 0) {
      return intersects[0].object.userData.planetId as string;
    }
    return null;
  }

  public toggleConstellations(): boolean {
    this.constellationsVisible = !this.constellationsVisible;
    if (this.constellationGroup) {
      this.constellationGroup.visible = this.constellationsVisible;
    }
    return this.constellationsVisible;
  }

  public areConstellationsVisible(): boolean {
    return this.constellationsVisible;
  }

  private onResize(): void {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public getDomElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  public dispose(): void {
    this.renderer.dispose();
    window.removeEventListener('resize', this.onResize.bind(this));
    this.constellationLabels.forEach((label) => {
      label.remove();
    });
    this.planetAxisLines.clear();
    this.orbitPhases.clear();
    this.saturnRingSizes.clear();
    this.saturnRingPhases.clear();
  }
}
