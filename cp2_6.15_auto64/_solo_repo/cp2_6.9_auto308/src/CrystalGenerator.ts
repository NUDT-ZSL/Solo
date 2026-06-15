import * as THREE from 'three';

export interface CrystalColorTheme {
  name: string;
  colors: string[];
}

export const ColorThemes: Record<string, CrystalColorTheme> = {
  default: {
    name: 'default',
    colors: ['#4A6FFF', '#00D4AA', '#FFB347', '#FF6B9D']
  },
  spring: {
    name: 'spring',
    colors: ['#FF9EC7', '#7ED957', '#B5E48C', '#FFD6A5']
  },
  summer: {
    name: 'summer',
    colors: ['#4A6FFF', '#00B4D8', '#FFB703', '#FFD60A']
  },
  autumn: {
    name: 'autumn',
    colors: ['#FF6B35', '#9D4EDD', '#FF8500', '#7B2CBF']
  },
  winter: {
    name: 'winter',
    colors: ['#A8DADC', '#457B9D', '#C1DFF0', '#8ECAE6']
  }
};

export interface CrystalMesh extends THREE.Mesh {
  userData: {
    swayAxis: 'x' | 'y';
    swaySpeed: number;
    swayAmount: number;
    swayOffset: number;
    basePosition: THREE.Vector3;
    faceCount: number;
    colorHex: string;
  };
}

export class CrystalGenerator {
  private scene: THREE.Scene;
  private currentTheme: CrystalColorTheme = ColorThemes.default;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  setTheme(themeName: string): void {
    if (ColorThemes[themeName]) {
      this.currentTheme = ColorThemes[themeName];
    }
  }

  getThemeColors(): string[] {
    return this.currentTheme.colors;
  }

  private randomRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private pickRandomColor(excludeColor?: string): string {
    const colors = this.currentTheme.colors;
    let color = colors[Math.floor(Math.random() * colors.length)];
    if (excludeColor) {
      let attempts = 0;
      while (color === excludeColor && attempts < 10) {
        color = colors[Math.floor(Math.random() * colors.length)];
        attempts++;
      }
    }
    return color;
  }

  createCrystalGeometry(faceCount: number): THREE.BufferGeometry {
    const vertices: number[] = [];
    const indices: number[] = [];

    const baseRadius = this.randomRange(0.4, 0.9);
    const vertexCount = Math.ceil(faceCount / 2) + 2;

    for (let i = 0; i < vertexCount; i++) {
      const phi = Math.acos(this.randomRange(-0.8, 0.8));
      const theta = this.randomRange(0, Math.PI * 2);
      const r = baseRadius * this.randomRange(0.7, 1.2);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      vertices.push(x, y, z);
    }

    for (let i = 0; i < faceCount; i++) {
      const a = Math.floor(Math.random() * vertexCount);
      let b = Math.floor(Math.random() * vertexCount);
      let c = Math.floor(Math.random() * vertexCount);

      while (b === a) b = Math.floor(Math.random() * vertexCount);
      while (c === a || c === b) c = Math.floor(Math.random() * vertexCount);

      indices.push(a, b, c);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.center();

    return geometry;
  }

  createCrystalMaterial(colorHex: string, opacity: number): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(colorHex),
      transparent: true,
      opacity: opacity,
      metalness: 0.2,
      roughness: 0.1,
      transmission: 0.3,
      thickness: 0.5,
      envMapIntensity: 1.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide,
      ior: 1.5,
      reflectivity: 0.8
    });
  }

  createEdges(geometry: THREE.BufferGeometry, colorHex: string): THREE.LineSegments {
    const edges = new THREE.EdgesGeometry(geometry, 20);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(colorHex).offsetHSL(0, 0, 0.3),
      transparent: true,
      opacity: 0.6,
      linewidth: 1
    });
    return new THREE.LineSegments(edges, edgeMaterial);
  }

  createCrystal(
    position: THREE.Vector3,
    excludeColor?: string,
    targetFaceCount?: number
  ): CrystalMesh {
    const faceCount = targetFaceCount ?? Math.floor(this.randomRange(12, 31));
    const colorHex = this.pickRandomColor(excludeColor);
    const opacity = this.randomRange(0.3, 0.6);

    const geometry = this.createCrystalGeometry(faceCount);
    const material = this.createCrystalMaterial(colorHex, opacity);
    const crystal = new THREE.Mesh(geometry, material) as unknown as CrystalMesh;
    crystal.position.copy(position);

    crystal.scale.setScalar(this.randomRange(0.8, 1.3));

    const edges = this.createEdges(geometry, colorHex);
    crystal.add(edges);

    crystal.userData = {
      swayAxis: Math.random() > 0.5 ? 'x' : 'y',
      swaySpeed: this.randomRange(0.3, 0.8),
      swayAmount: THREE.MathUtils.degToRad(this.randomRange(10, 15)),
      swayOffset: this.randomRange(0, Math.PI * 2),
      basePosition: position.clone(),
      faceCount: faceCount,
      colorHex: colorHex
    };

    crystal.castShadow = true;
    crystal.receiveShadow = true;

    this.scene.add(crystal);
    return crystal;
  }

  createCrystalCluster(count: number): CrystalMesh[] {
    const crystals: CrystalMesh[] = [];
    const radius = 4;

    for (let i = 0; i < count; i++) {
      const phi = Math.acos(this.randomRange(-0.9, 0.9));
      const theta = this.randomRange(0, Math.PI * 2);
      const r = this.randomRange(radius * 0.3, radius);

      const position = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );

      crystals.push(this.createCrystal(position));
    }

    return crystals;
  }

  getPeripheryPosition(): THREE.Vector3 {
    const radius = this.randomRange(4.5, 6);
    const phi = Math.acos(this.randomRange(-0.9, 0.9));
    const theta = this.randomRange(0, Math.PI * 2);

    return new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi)
    );
  }

  updateCrystalSway(crystal: CrystalMesh, t: number): void {
    const { swayAxis, swaySpeed, swayAmount, swayOffset, basePosition } = crystal.userData;
    const angle = Math.sin(t * swaySpeed + swayOffset) * swayAmount;

    if (swayAxis === 'x') {
      crystal.rotation.x = angle;
      crystal.rotation.y = Math.sin(t * swaySpeed * 0.7 + swayOffset) * swayAmount * 0.3;
    } else {
      crystal.rotation.y = angle;
      crystal.rotation.x = Math.sin(t * swaySpeed * 0.7 + swayOffset) * swayAmount * 0.3;
    }

    const floatY = Math.sin(t * swaySpeed * 0.5 + swayOffset) * 0.1;
    crystal.position.y = basePosition.y + floatY;
  }

  removeCrystal(crystal: CrystalMesh): void {
    this.scene.remove(crystal);
    if (crystal.geometry) crystal.geometry.dispose();
    if (crystal.material) {
      if (Array.isArray(crystal.material)) {
        crystal.material.forEach(m => m.dispose());
      } else {
        crystal.material.dispose();
      }
    }
  }

  createFragments(crystal: CrystalMesh, onComplete: () => void): void {
    const fragmentCount = Math.floor(this.randomRange(20, 31));
    const worldPos = new THREE.Vector3();
    crystal.getWorldPosition(worldPos);
    const colorHex = crystal.userData.colorHex;

    const fragments: THREE.Mesh[] = [];
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < fragmentCount; i++) {
      const size = this.randomRange(0.03, 0.08);
      const geometry = new THREE.TetrahedronGeometry(size);
      const material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(colorHex),
        transparent: true,
        opacity: 0.8,
        metalness: 0.3,
        roughness: 0.2,
        transmission: 0.2
      });

      const fragment = new THREE.Mesh(geometry, material);
      fragment.position.copy(worldPos);
      fragment.position.add(new THREE.Vector3(
        this.randomRange(-0.2, 0.2),
        this.randomRange(-0.2, 0.2),
        this.randomRange(-0.2, 0.2)
      ));

      const velocity = new THREE.Vector3(
        this.randomRange(-1, 1),
        this.randomRange(-0.5, 1),
        this.randomRange(-1, 1)
      ).normalize().multiplyScalar(this.randomRange(1.5, 3.5));

      this.scene.add(fragment);
      fragments.push(fragment);
      velocities.push(velocity);
    }

    const duration = 1.5;
    let startTime = performance.now() / 1000;

    const animateFragments = () => {
      const now = performance.now() / 1000;
      const elapsed = now - startTime;

      if (elapsed >= duration) {
        fragments.forEach(f => {
          this.scene.remove(f);
          f.geometry.dispose();
          (f.material as THREE.Material).dispose();
        });
        onComplete();
        return;
      }

      const progress = elapsed / duration;
      const easeProgress = 1 - Math.pow(1 - progress, 2);

      fragments.forEach((f, i) => {
        const dt = 0.016;
        velocities[i].y -= 1.5 * dt;
        f.position.add(velocities[i].clone().multiplyScalar(dt));
        f.rotation.x += dt * 5;
        f.rotation.y += dt * 3;

        const mat = f.material as THREE.MeshPhysicalMaterial;
        mat.opacity = 0.8 * (1 - easeProgress);
      });

      requestAnimationFrame(animateFragments);
    };

    animateFragments();
  }
}
