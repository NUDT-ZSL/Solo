import * as THREE from 'three';

export interface TotemInfo {
  direction: string;
  windSpeed: string;
  era: string;
}

const TOTEM_NAMES = ['东·苍龙', '西·白虎', '南·朱雀', '北·玄武', '中·麒麟'];
const TOTEM_DIRECTIONS = ['东方·震位', '西方·兑位', '南方·离位', '北方·坎位', '中央·太极'];
const TOTEM_WINDS = ['东风·3.2m/s', '西风·4.8m/s', '南风·2.1m/s', '北风·5.6m/s', '旋风·6.3m/s'];
const TOTEM_ERAS = ['新石器时代·约8000年前', '青铜时代·约3500年前', '铁器时代·约2500年前', '丝路时代·约1800年前', '黄金时代·约1200年前'];

const RUNE_COUNT = 6;
const RAY_COUNT = 12;

export class TotemPillar {
  readonly group: THREE.Group;
  readonly mesh: THREE.Mesh;
  readonly info: TotemInfo;
  private runeRings: THREE.Mesh[] = [];
  private rays: THREE.Mesh[] = [];
  private glowLight: THREE.PointLight;
  private isResonating: boolean = false;
  private resonanceTime: number = 0;
  private baseEmissive: THREE.Color;
  private readonly index: number;
  private onResonate: ((pillar: TotemPillar) => void) | null = null;

  constructor(position: THREE.Vector3, index: number, scene: THREE.Scene) {
    this.index = index;
    this.info = {
      direction: TOTEM_DIRECTIONS[index] || '未知方位',
      windSpeed: TOTEM_WINDS[index] || '未知风速',
      era: TOTEM_ERAS[index] || '未知年代',
    };

    this.group = new THREE.Group();
    this.group.position.copy(position);

    const height = 4.0 + Math.random() * 1.5;
    const radius = 0.4 + Math.random() * 0.15;

    const geo = new THREE.CylinderGeometry(
      radius * 0.7, radius, height, 8, 6
    );
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x8b7355),
      roughness: 0.9,
      metalness: 0.1,
      emissive: new THREE.Color(0x1a0e05),
      emissiveIntensity: 0.2,
    });
    this.baseEmissive = mat.emissive.clone();

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.y = height / 2;
    this.group.add(this.mesh);

    this.addWeatheredTexture(height);
    this.addRuneRings(height);
    this.addGlowLight();
    this.addRays();

    scene.add(this.group);
  }

  private addWeatheredTexture(height: number): void {
    const detailCount = 12;
    for (let i = 0; i < detailCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const y = Math.random() * height;
      const size = 0.05 + Math.random() * 0.1;
      const detailGeo = new THREE.BoxGeometry(size, size * 2, size);
      const detailMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x6b5b45),
        roughness: 1.0,
      });
      const detail = new THREE.Mesh(detailGeo, detailMat);
      detail.position.set(
        Math.cos(angle) * 0.45,
        y,
        Math.sin(angle) * 0.45
      );
      this.group.add(detail);
    }
  }

  private addRuneRings(height: number): void {
    for (let i = 0; i < RUNE_COUNT; i++) {
      const y = (height * 0.15) + (height * 0.7 / RUNE_COUNT) * i;
      const ringGeo = new THREE.TorusGeometry(0.42, 0.03, 6, 8);
      const ringMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xd4a855),
        emissive: new THREE.Color(0x332200),
        emissiveIntensity: 0.3,
        roughness: 0.4,
        metalness: 0.6,
        transparent: true,
        opacity: 0.8,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = y;
      ring.rotation.x = Math.PI / 2;
      this.runeRings.push(ring);
      this.group.add(ring);
    }
  }

  private addGlowLight(): void {
    this.glowLight = new THREE.PointLight(0xd4a855, 0.3, 8);
    this.glowLight.position.y = 3;
    this.group.add(this.glowLight);
  }

  private addRays(): void {
    const rayMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    for (let i = 0; i < RAY_COUNT; i++) {
      const angle = (i / RAY_COUNT) * Math.PI * 2;
      const rayGeo = new THREE.CylinderGeometry(0.02, 0.01, 4, 4);
      const ray = new THREE.Mesh(rayGeo, rayMat.clone());
      ray.position.set(Math.cos(angle) * 0.5, 2.5, Math.sin(angle) * 0.5);
      ray.rotation.z = Math.PI / 4 * (i % 2 === 0 ? 1 : -1);
      ray.rotation.y = angle;
      ray.visible = false;
      this.rays.push(ray);
      this.group.add(ray);
    }
  }

  setOnResonate(cb: (pillar: TotemPillar) => void): void {
    this.onResonate = cb;
  }

  triggerResonance(): void {
    if (this.isResonating) return;
    this.isResonating = true;
    this.resonanceTime = 0;
    for (const ray of this.rays) {
      ray.visible = true;
      (ray.material as THREE.MeshBasicMaterial).opacity = 0;
    }
    if (this.onResonate) this.onResonate(this);
  }

  update(dt: number): void {
    for (let i = 0; i < this.runeRings.length; i++) {
      const ring = this.runeRings[i];
      ring.rotation.z += dt * (0.5 + i * 0.1);
    }

    if (this.isResonating) {
      this.resonanceTime += dt;
      const t = this.resonanceTime;

      const emissiveIntensity = 0.5 + Math.sin(t * 4) * 0.5;
      const mat = this.mesh.material as THREE.MeshStandardMaterial;
      mat.emissive.setRGB(
        this.baseEmissive.r + emissiveIntensity * 0.5,
        this.baseEmissive.g + emissiveIntensity * 0.3,
        this.baseEmissive.b + emissiveIntensity * 0.05,
      );
      mat.emissiveIntensity = 0.5 + emissiveIntensity;

      this.glowLight.intensity = 2.0 + Math.sin(t * 6) * 1.5;

      for (const ring of this.runeRings) {
        const rMat = ring.material as THREE.MeshStandardMaterial;
        rMat.emissiveIntensity = 1.0 + Math.sin(t * 5) * 0.8;
        rMat.emissive.setRGB(0.6 + Math.sin(t * 3) * 0.3, 0.4, 0.05);
      }

      for (let i = 0; i < this.rays.length; i++) {
        const ray = this.rays[i];
        const rMat = ray.material as THREE.MeshBasicMaterial;
        const fadeIn = Math.min(t * 2, 1);
        const fadeOut = t > 2.5 ? Math.max(0, 1 - (t - 2.5) / 1.5) : 1;
        rMat.opacity = fadeIn * fadeOut * 0.6;
        ray.rotation.z += dt * 0.5 * (i % 2 === 0 ? 1 : -1);
        ray.rotation.y += dt * 0.3;
      }

      if (this.resonanceTime > 4.0) {
        this.isResonating = false;
        mat.emissive.copy(this.baseEmissive);
        mat.emissiveIntensity = 0.2;
        this.glowLight.intensity = 0.3;
        for (const ring of this.runeRings) {
          const rMat = ring.material as THREE.MeshStandardMaterial;
          rMat.emissiveIntensity = 0.3;
          rMat.emissive.setRGB(0.2, 0.13, 0.0);
        }
        for (const ray of this.rays) {
          ray.visible = false;
        }
      }
    }
  }

  getPosition(): THREE.Vector3 {
    return this.group.position.clone();
  }

  dispose(): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });
  }
}
