import * as THREE from 'three';
import gsap from 'gsap';

const CRYSTAL_COLORS = [
  0xFF6B35,
  0x00D4FF,
  0xB388FF,
  0xFF4081,
  0x76FF03
];

export class CrystalCluster {
  public group: THREE.Group;
  private crystals: THREE.Mesh[] = [];
  private baseColor: THREE.Color;
  private shattered: boolean = false;
  private glowMesh?: THREE.Mesh;
  private time: number = 0;
  private materials: THREE.MeshPhysicalMaterial[] = [];

  constructor(position: THREE.Vector3) {
    this.group = new THREE.Group();
    this.group.position.copy(position);

    const colorHex = CRYSTAL_COLORS[Math.floor(Math.random() * CRYSTAL_COLORS.length)];
    this.baseColor = new THREE.Color(colorHex);

    const crystalCount = 3 + Math.floor(Math.random() * 5);
    for (let i = 0; i < crystalCount; i++) {
      this.createCrystal(i);
    }
  }

  private createCrystal(index: number): void {
    const radius = 0.6 + Math.random() * 1.2;
    const detail = 0;
    const geo = new THREE.OctahedronGeometry(radius, detail);

    const hueOffset = (Math.random() - 0.5) * 0.15;
    const hsl = { h: 0, s: 0, l: 0 };
    this.baseColor.getHSL(hsl);
    const crystalColor = new THREE.Color().setHSL(
      Math.max(0, Math.min(1, hsl.h + hueOffset)),
      hsl.s,
      hsl.l
    );

    const mat = new THREE.MeshPhysicalMaterial({
      color: crystalColor,
      transparent: true,
      opacity: 0.4 + Math.random() * 0.3,
      roughness: 0.1,
      metalness: 0.05,
      transmission: 0.3,
      thickness: 0.5,
      ior: 1.5,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
      emissive: crystalColor,
      emissiveIntensity: 0.1,
      side: THREE.DoubleSide
    });
    this.materials.push(mat);

    const crystal = new THREE.Mesh(geo, mat);

    const angle = (index / 7) * Math.PI * 2 + Math.random() * 0.5;
    const dist = Math.random() * 0.8;
    crystal.position.set(
      Math.cos(angle) * dist,
      radius * 0.5 + Math.random() * radius * 0.5,
      Math.sin(angle) * dist
    );
    crystal.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    crystal.userData.basePosition = crystal.position.clone();
    crystal.userData.baseRotation = crystal.rotation.clone();
    crystal.userData.rotSpeed = new THREE.Vector3(
      (Math.random() - 0.5) * 0.01,
      (Math.random() - 0.5) * 0.01,
      (Math.random() - 0.5) * 0.01
    );

    this.crystals.push(crystal);
    this.group.add(crystal);
  }

  public isShattered(): boolean {
    return this.shattered;
  }

  public getBaseColor(): THREE.Color {
    return this.baseColor;
  }

  public getWorldCenter(): THREE.Vector3 {
    const center = new THREE.Vector3();
    this.group.getWorldPosition(center);
    return center;
  }

  public shatter(particleBurst: (pos: THREE.Vector3, color: THREE.Color) => void): void {
    if (this.shattered) return;
    this.shattered = true;

    const center = this.getWorldCenter();
    particleBurst(center, this.baseColor);

    this.createGlow(center);

    this.crystals.forEach((crystal, i) => {
      const direction = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 0.8 + 0.2,
        (Math.random() - 0.5) * 2
      ).normalize();
      const distance = 5 + Math.random() * 3;
      const targetPos = crystal.position.clone().add(direction.multiplyScalar(distance));

      const delay = i * 0.05;

      gsap.to(crystal.position, {
        x: targetPos.x,
        y: targetPos.y,
        z: targetPos.z,
        duration: 1.5,
        delay: delay,
        ease: 'power2.out'
      });

      gsap.to(crystal.rotation, {
        x: crystal.rotation.x + (Math.random() - 0.5) * Math.PI * 4,
        y: crystal.rotation.y + (Math.random() - 0.5) * Math.PI * 4,
        z: crystal.rotation.z + (Math.random() - 0.5) * Math.PI * 4,
        duration: 2,
        delay: delay,
        ease: 'power1.out'
      });

      gsap.to(crystal.scale, {
        x: 0.1,
        y: 0.1,
        z: 0.1,
        duration: 1.2,
        delay: delay + 1.2,
        ease: 'power2.in',
        onComplete: () => {
          crystal.visible = false;
        }
      });

      const mat = crystal.material as THREE.MeshPhysicalMaterial;
      gsap.to(mat, {
        opacity: 0,
        duration: 1.5,
        delay: delay + 0.8,
        ease: 'power2.in'
      });
    });
  }

  private createGlow(center: THREE.Vector3): void {
    const glowGeo = new THREE.CircleGeometry(1.5, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: this.baseColor,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    this.glowMesh = new THREE.Mesh(glowGeo, glowMat);
    this.glowMesh.position.copy(center);
    this.glowMesh.position.y = this.group.position.y + 0.05;
    this.glowMesh.rotation.x = -Math.PI / 2;
    this.glowMesh.renderOrder = 2;
  }

  public getGlowMesh(): THREE.Mesh | undefined {
    return this.glowMesh;
  }

  public update(delta: number): void {
    this.time += delta;

    if (!this.shattered) {
      this.crystals.forEach((crystal) => {
        crystal.rotation.x += crystal.userData.rotSpeed.x;
        crystal.rotation.y += crystal.userData.rotSpeed.y;
        crystal.rotation.z += crystal.userData.rotSpeed.z;

        const floatY = Math.sin(this.time * 1.5 + crystal.userData.basePosition.x) * 0.05;
        crystal.position.y = crystal.userData.basePosition.y + floatY;
      });
    }

    if (this.glowMesh) {
      const mat = this.glowMesh.material as THREE.MeshBasicMaterial;
      const pulse = 0.35 + Math.sin(this.time * 2) * 0.15;
      mat.opacity = pulse;
      const scale = 1 + Math.sin(this.time * 2) * 0.15;
      this.glowMesh.scale.set(scale, scale, scale);
    }
  }
}
