import * as THREE from 'three';

interface PollenParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  trail: THREE.Line;
  trailPositions: THREE.Vector3[];
  baseEmissive: number;
}

export class SceneManager {
  public group: THREE.Group;
  private flowers: THREE.Group[] = [];
  private leaves: THREE.Mesh[] = [];
  private pollenParticles: PollenParticle[] = [];
  private defaultFlowerColor1: THREE.Color = new THREE.Color(0xFF69B4);
  private defaultFlowerColor2: THREE.Color = new THREE.Color(0xFF1493);
  private defaultLeafColor: THREE.Color = new THREE.Color(0x228B22);
  private defaultPollenEmissive: number = 0.3;
  private vividMode: boolean = false;
  private colorTemperature: number = 1.0;
  private flowerColors: THREE.Color[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.createScene();
  }

  private createScene(): void {
    this.createFlowers();
    this.createLeaves();
    this.createPollen();
  }

  private createFlowers(): void {
    const flowerPositions = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1.2, -0.3, 0.8),
      new THREE.Vector3(-1.0, -0.2, -0.6),
      new THREE.Vector3(0.5, 0.2, -1.2)
    ];

    flowerPositions.forEach((pos, idx) => {
      const flower = this.createFlower(idx);
      flower.position.copy(pos);
      flower.rotation.set(
        Math.random() * 0.3,
        Math.random() * Math.PI * 2,
        Math.random() * 0.3
      );
      this.flowers.push(flower);
      this.group.add(flower);
    });
  }

  private createFlower(index: number): THREE.Group {
    const flower = new THREE.Group();
    const petalCount = 8 + Math.floor(Math.random() * 4);
    const petalColor1 = this.defaultFlowerColor1.clone();
    const petalColor2 = this.defaultFlowerColor2.clone();
    this.flowerColors.push(petalColor1.clone());

    const petalGeometry = new THREE.SphereGeometry(0.15, 16, 12);

    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2;
      const radius = 0.25;

      const t = i / petalCount;
      const color = petalColor1.clone().lerp(petalColor2, t);

      const material = new THREE.MeshPhongMaterial({
        color: color,
        shininess: 80,
        specular: 0x444444,
        side: THREE.DoubleSide
      });

      const petal = new THREE.Mesh(petalGeometry, material);
      petal.position.set(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      );
      petal.scale.set(1.2, 0.3, 0.6);
      petal.rotation.y = -angle;
      petal.rotation.x = -0.3;
      flower.add(petal);
    }

    const centerGeometry = new THREE.SphereGeometry(0.12, 16, 12);
    const centerMaterial = new THREE.MeshPhongMaterial({
      color: 0xFFD700,
      emissive: 0xFFA500,
      emissiveIntensity: 0.3,
      shininess: 100
    });
    const center = new THREE.Mesh(centerGeometry, centerMaterial);
    flower.add(center);

    const stemGeometry = new THREE.CylinderGeometry(0.03, 0.04, 1.5, 8);
    const stemMaterial = new THREE.MeshPhongMaterial({ color: 0x228B22 });
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.y = -0.9;
    flower.add(stem);

    return flower;
  }

  private createLeaves(): void {
    const leafCount = 12;
    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, 0);
    leafShape.bezierCurveTo(0.3, 0.1, 0.4, 0.4, 0, 0.6);
    leafShape.bezierCurveTo(-0.4, 0.4, -0.3, 0.1, 0, 0);

    const extrudeSettings = { depth: 0.02, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2 };
    const leafGeometry = new THREE.ExtrudeGeometry(leafShape, extrudeSettings);

    for (let i = 0; i < leafCount; i++) {
      const material = new THREE.MeshPhongMaterial({
        color: this.defaultLeafColor.clone(),
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
      });

      const leaf = new THREE.Mesh(leafGeometry, material);

      const angle = Math.random() * Math.PI * 2;
      const distance = 1 + Math.random() * 2;
      leaf.position.set(
        Math.cos(angle) * distance,
        -0.5 + Math.random() * 0.8,
        Math.sin(angle) * distance
      );
      leaf.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI * 2,
        Math.random() * 0.5
      );
      const scale = 0.8 + Math.random() * 0.8;
      leaf.scale.set(scale, scale, scale);

      this.leaves.push(leaf);
      this.group.add(leaf);
    }
  }

  private createPollen(): void {
    const pollenCount = 30;
    const pollenGeometry = new THREE.SphereGeometry(0.02, 8, 8);

    for (let i = 0; i < pollenCount; i++) {
      const material = new THREE.MeshPhongMaterial({
        color: 0xFFD700,
        emissive: 0xFFD700,
        emissiveIntensity: this.defaultPollenEmissive
      });

      const mesh = new THREE.Mesh(pollenGeometry, material);

      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 1.5;
      mesh.position.set(
        Math.cos(angle) * radius,
        Math.random() * 1.5 - 0.3,
        Math.sin(angle) * radius
      );

      const trailPositions: THREE.Vector3[] = [];
      for (let j = 0; j < 5; j++) {
        trailPositions.push(mesh.position.clone());
      }

      const trailGeometry = new THREE.BufferGeometry().setFromPoints(trailPositions);
      const trailMaterial = new THREE.LineBasicMaterial({
        color: 0xFFD700,
        transparent: true,
        opacity: 0.4
      });
      const trail = new THREE.Line(trailGeometry, trailMaterial);

      this.group.add(trail);

      this.pollenParticles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.3
        ),
        trail,
        trailPositions,
        baseEmissive: this.defaultPollenEmissive
      });

      this.group.add(mesh);
    }
  }

  set vivid(value: boolean) {
    this.vividMode = value;
    this.updateColors();
  }

  get vivid(): boolean {
    return this.vividMode;
  }

  set temperature(value: number) {
    this.colorTemperature = Math.max(0.3, Math.min(2.0, value));
    this.updateColors();
  }

  get temperature(): number {
    return this.colorTemperature;
  }

  private updateColors(): void {
    const satMultiplier = this.vividMode ? 1.5 : 1.0;

    this.flowers.forEach((flower, idx) => {
      const baseColor = this.defaultFlowerColor1.clone();
      const targetColor = this.defaultFlowerColor2.clone();

      flower.traverse((child) => {
        if (child instanceof THREE.Mesh && child !== flower.children[flower.children.length - 1]) {
          const mat = child.material as THREE.MeshPhongMaterial;
          if (mat.color) {
            const originalColor = this.flowerColors[idx] || baseColor;
            const hsl = { h: 0, s: 0, l: 0 };
            originalColor.getHSL(hsl);
            hsl.s = Math.min(1, hsl.s * satMultiplier);
            hsl.l = Math.min(1, hsl.l * this.colorTemperature);
            mat.color.setHSL(hsl.h, hsl.s, hsl.l);
          }
        }
      });
    });

    const leafColor = this.vividMode ? new THREE.Color(0x7CFC00) : this.defaultLeafColor.clone();
    this.leaves.forEach(leaf => {
      const mat = leaf.material as THREE.MeshPhongMaterial;
      mat.color.copy(leafColor);
    });

    const emissiveIntensity = (this.vividMode ? this.defaultPollenEmissive * 2 : this.defaultPollenEmissive);
    this.pollenParticles.forEach(p => {
      const mat = p.mesh.material as THREE.MeshPhongMaterial;
      mat.emissiveIntensity = emissiveIntensity;
      p.baseEmissive = emissiveIntensity;
    });
  }

  public update(delta: number): void {
    const time = performance.now() * 0.001;

    this.flowers.forEach((flower, idx) => {
      flower.rotation.y += delta * 0.1;
      flower.position.y += Math.sin(time * 0.8 + idx) * delta * 0.05;
    });

    this.leaves.forEach((leaf, idx) => {
      leaf.rotation.y += delta * 0.05;
      leaf.rotation.z += Math.sin(time * 0.5 + idx) * delta * 0.02;
    });

    this.pollenParticles.forEach((p, idx) => {
      const jitter = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.5
      );

      p.velocity.add(jitter.multiplyScalar(delta * 2));
      p.velocity.multiplyScalar(0.98);

      const maxSpeed = 0.5;
      if (p.velocity.length() > maxSpeed) {
        p.velocity.normalize().multiplyScalar(maxSpeed);
      }
      if (p.velocity.length() < 0.1) {
        p.velocity.normalize().multiplyScalar(0.1);
      }

      p.mesh.position.add(p.velocity.clone().multiplyScalar(delta));

      const distFromCenter = p.mesh.position.distanceTo(new THREE.Vector3(0, 0.3, 0));
      if (distFromCenter > 2.5) {
        const toCenter = new THREE.Vector3(0, 0.3, 0).sub(p.mesh.position).normalize();
        p.velocity.lerp(toCenter.multiplyScalar(0.3), 0.1);
      }

      if (p.mesh.position.y < -1) p.mesh.position.y = 1;
      if (p.mesh.position.y > 1.5) p.mesh.position.y = -0.5;

      p.trailPositions.shift();
      p.trailPositions.push(p.mesh.position.clone());
      const positions = new Float32Array(p.trailPositions.length * 3);
      p.trailPositions.forEach((pos, i) => {
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;
      });
      p.trail.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      p.trail.geometry.computeBoundingSphere();

      const trailMat = p.trail.material as THREE.LineBasicMaterial;
      trailMat.opacity = 0.3 + Math.sin(time * 3 + idx) * 0.15;

      const mat = p.mesh.material as THREE.MeshPhongMaterial;
      mat.emissiveIntensity = p.baseEmissive + Math.sin(time * 4 + idx * 0.5) * 0.15;
    });
  }

  public getAllObjects(): THREE.Object3D[] {
    const objects: THREE.Object3D[] = [];
    this.flowers.forEach(f => objects.push(f));
    this.leaves.forEach(l => objects.push(l));
    this.pollenParticles.forEach(p => objects.push(p.mesh));
    return objects;
  }

  public dispose(): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}
