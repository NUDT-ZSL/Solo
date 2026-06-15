import * as THREE from 'three';

const TERRAIN_SIZE = 120;
const TERRAIN_SEGMENTS = 60;
const CRYSTAL_COUNT = 12;

interface CrystalData {
  mesh: THREE.Mesh;
  glow: THREE.PointLight;
  position: THREE.Vector3;
  energy: number;
  baseScale: number;
  burstActive: boolean;
  burstTime: number;
  burstScale: number;
}

interface ClickInfo {
  position: THREE.Vector3;
  energy: number;
}

export class TerrainManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private terrain: THREE.Mesh;
  private crystals: CrystalData[] = [];
  private crystalBrightness: number = 1.0;
  private infoCard: HTMLDivElement | null = null;
  private lightBeams: THREE.Mesh[] = [];
  public onCrystalClick: ((data: ClickInfo) => void) | null = null;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.terrain = this.createTerrain();
    this.scene.add(this.terrain);
    this.createCrystals();
    this.createInfoCard();

    domElement.addEventListener('click', this.onClick);
  }

  private createTerrain(): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const dist = Math.sqrt(x * x + z * z);
      const y = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 2
        + Math.sin(x * 0.05 + z * 0.03) * 3
        + (Math.random() - 0.5) * 0.5;
      const falloff = Math.max(0, 1 - dist / (TERRAIN_SIZE * 0.45));
      pos.setY(i, y * falloff);
    }
    geo.computeVertexNormals();

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uLightColor: { value: new THREE.Color(0x8899cc) },
        uDarkColor: { value: new THREE.Color(0x1a1a3e) },
        uGlow: { value: 0.3 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying float vHeight;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          vHeight = position.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uLightColor;
        uniform vec3 uDarkColor;
        uniform float uGlow;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying float vHeight;
        void main() {
          float nDot = dot(vNormal, normalize(vec3(0.0, 1.0, 0.0))) * 0.5 + 0.5;
          vec3 col = mix(uDarkColor, uLightColor, nDot);
          col += uGlow * vec3(0.2, 0.3, 0.6) * (1.0 + vHeight * 0.2);
          float edge = fract(vWorldPos.x * 0.5) * fract(vWorldPos.z * 0.5);
          col += step(0.95, edge) * vec3(0.05, 0.08, 0.15);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    return new THREE.Mesh(geo, mat);
  }

  private createCrystals(): void {
    const geo = new THREE.OctahedronGeometry(0.6, 0);

    for (let i = 0; i < CRYSTAL_COUNT; i++) {
      const angle = (i / CRYSTAL_COUNT) * Math.PI * 2 + Math.random() * 0.5;
      const radius = 8 + Math.random() * 25;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const terrainY = this.getTerrainHeight(x, z);
      const y = terrainY + 0.8;

      const hue = 0.5 + Math.random() * 0.15;
      const color = new THREE.Color().setHSL(hue, 0.7, 0.7);

      const mat = new THREE.MeshPhongMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.85,
        shininess: 100,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.scale.setScalar(0.6 + Math.random() * 0.5);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      this.scene.add(mesh);

      const glow = new THREE.PointLight(color, 2, 8);
      glow.position.set(x, y + 0.5, z);
      this.scene.add(glow);

      this.crystals.push({
        mesh,
        glow,
        position: new THREE.Vector3(x, y, z),
        energy: 20 + Math.random() * 80,
        baseScale: mesh.scale.x,
        burstActive: false,
        burstTime: 0,
        burstScale: 1,
      });
    }
  }

  private getTerrainHeight(x: number, z: number): number {
    const dist = Math.sqrt(x * x + z * z);
    const y = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 2
      + Math.sin(x * 0.05 + z * 0.03) * 3;
    const falloff = Math.max(0, 1 - dist / (TERRAIN_SIZE * 0.45));
    return y * falloff;
  }

  private createInfoCard(): void {
    this.infoCard = document.createElement('div');
    Object.assign(this.infoCard.style, {
      position: 'fixed',
      padding: '16px 24px',
      background: 'rgba(10, 15, 40, 0.65)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRadius: '12px',
      border: '1px solid rgba(100, 140, 220, 0.25)',
      color: '#c0d0f0',
      fontFamily: '"Segoe UI", system-ui, sans-serif',
      fontSize: '14px',
      lineHeight: '1.6',
      pointerEvents: 'none',
      opacity: '0',
      transition: 'opacity 0.4s ease, transform 0.4s ease',
      transform: 'translateY(10px)',
      zIndex: '20',
      boxShadow: '0 8px 32px rgba(0, 40, 120, 0.3), inset 0 0 20px rgba(80, 120, 200, 0.05)',
    });
    document.body.appendChild(this.infoCard);
  }

  private showInfoCard(crystal: CrystalData): void {
    if (!this.infoCard) return;

    const vec = crystal.position.clone();
    vec.y += 2;
    vec.project(this.camera);
    const x = (vec.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vec.y * 0.5 + 0.5) * window.innerHeight;

    this.infoCard.innerHTML = `
      <div style="font-size:13px;opacity:0.6;margin-bottom:4px;">❄ 冰晶信息</div>
      <div>坐标: <span style="color:#7eb8ff">(${crystal.position.x.toFixed(1)}, ${crystal.position.y.toFixed(1)}, ${crystal.position.z.toFixed(1)})</span></div>
      <div>能量: <span style="color:#a0ffcc">${crystal.energy.toFixed(1)}</span> EU</div>
    `;
    this.infoCard.style.left = `${Math.min(x, window.innerWidth - 200)}px`;
    this.infoCard.style.top = `${Math.max(y - 80, 10)}px`;
    this.infoCard.style.opacity = '1';
    this.infoCard.style.transform = 'translateY(0)';

    setTimeout(() => {
      if (this.infoCard) {
        this.infoCard.style.opacity = '0';
        this.infoCard.style.transform = 'translateY(10px)';
      }
    }, 2500);
  }

  private triggerBurst(crystal: CrystalData): void {
    crystal.burstActive = true;
    crystal.burstTime = 0;
    crystal.burstScale = 1;

    const beamGeo = new THREE.CylinderGeometry(0.05, 0.3, 20, 8, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: (crystal.mesh.material as THREE.MeshPhongMaterial).color,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.copy(crystal.position);
    beam.position.y += 10;
    this.scene.add(beam);
    this.lightBeams.push(beam);

    crystal.glow.intensity = 8;
    crystal.glow.distance = 20;
  }

  private onClick = (event: MouseEvent): void => {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.crystals.map((c) => c.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const crystal = this.crystals.find((c) => c.mesh === hit);
      if (crystal && !crystal.burstActive) {
        this.triggerBurst(crystal);
        this.showInfoCard(crystal);
        if (this.onCrystalClick) {
          this.onCrystalClick({ position: crystal.position.clone(), energy: crystal.energy });
        }
      }
    }
  };

  setCrystalBrightness(value: number): void {
    this.crystalBrightness = value;
  }

  update(elapsed: number, auroraSpeed: number): void {
    const auroraIntensity = (Math.sin(elapsed * 0.5 * auroraSpeed) * 0.5 + 0.5) * 0.5 + 0.5;

    for (const crystal of this.crystals) {
      const flicker = Math.sin(elapsed * 3 + crystal.position.x) * 0.3 + 0.7;
      const intensity = flicker * auroraIntensity * this.crystalBrightness;

      (crystal.mesh.material as THREE.MeshPhongMaterial).emissiveIntensity = intensity;
      crystal.glow.intensity = crystal.burstActive ? crystal.glow.intensity : intensity * 2.5;
      crystal.mesh.rotation.y += 0.005;

      if (crystal.burstActive) {
        crystal.burstTime += 0.016;
        if (crystal.burstTime < 0.5) {
          crystal.burstScale = 1 + crystal.burstTime * 6;
        } else if (crystal.burstTime < 1.2) {
          crystal.burstScale = 1 + (1.2 - crystal.burstTime) * 4;
        } else {
          crystal.burstActive = false;
          crystal.burstScale = 1;
          crystal.glow.intensity = intensity * 2.5;
          crystal.glow.distance = 8;
        }
        crystal.mesh.scale.setScalar(crystal.baseScale * crystal.burstScale);
      }
    }

    for (let i = this.lightBeams.length - 1; i >= 0; i--) {
      const beam = this.lightBeams[i];
      const mat = beam.material as THREE.MeshBasicMaterial;
      mat.opacity -= 0.008;
      if (mat.opacity <= 0) {
        this.scene.remove(beam);
        beam.geometry.dispose();
        mat.dispose();
        this.lightBeams.splice(i, 1);
      }
    }
  }

  dispose(): void {
    this.domElement.removeEventListener('click', this.onClick);
    if (this.infoCard && this.infoCard.parentElement) {
      this.infoCard.parentElement.removeChild(this.infoCard);
    }
    this.terrain.geometry.dispose();
    (this.terrain.material as THREE.ShaderMaterial).dispose();
    this.scene.remove(this.terrain);
    for (const crystal of this.crystals) {
      crystal.mesh.geometry.dispose();
      (crystal.mesh.material as THREE.MeshPhongMaterial).dispose();
      this.scene.remove(crystal.mesh);
      this.scene.remove(crystal.glow);
    }
    for (const beam of this.lightBeams) {
      beam.geometry.dispose();
      (beam.material as THREE.MeshBasicMaterial).dispose();
      this.scene.remove(beam);
    }
  }
}
