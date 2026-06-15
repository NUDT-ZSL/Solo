import * as THREE from 'three';

export type ParticleColorGroup = 'blue' | 'purple' | 'pink' | 'cyan' | 'orange';

export const PARTICLE_COLORS: Record<ParticleColorGroup, { hex: number; css: string; label: string }> = {
  blue: { hex: 0x4488ff, css: '#4488ff', label: '蓝' },
  purple: { hex: 0xaa44ff, css: '#aa44ff', label: '紫' },
  pink: { hex: 0xff44aa, css: '#ff44aa', label: '粉' },
  cyan: { hex: 0x44ffcc, css: '#44ffcc', label: '青' },
  orange: { hex: 0xff8844, css: '#ff8844', label: '橙' },
};

type CollapseState = 'normal' | 'collapsing' | 'exploding' | 'recovering';

export class ParticleUnit {
  public colorGroup: ParticleColorGroup;
  public size: number;
  public mesh: THREE.Mesh;
  public lastCollapseTime: number = 0;

  private center: THREE.Vector3;
  private orbitRadius: number;
  private orbitSpeed: number;
  private orbitalAngle: number;
  private collapseState: CollapseState = 'normal';
  private collapseStartTime: number = 0;
  private collapseOrigin: THREE.Vector3 = new THREE.Vector3();
  private collapseDirection: THREE.Vector3 = new THREE.Vector3();

  constructor(
    colorGroup: ParticleColorGroup,
    center: THREE.Vector3,
    orbitRadius: number,
    orbitSpeed: number,
    size: number,
  ) {
    this.colorGroup = colorGroup;
    this.center = center;
    this.orbitRadius = orbitRadius;
    this.orbitSpeed = orbitSpeed;
    this.size = size;
    this.orbitalAngle = Math.random() * Math.PI * 2;

    const geometry = new THREE.SphereGeometry(size, 8, 8);
    const material = new THREE.MeshStandardMaterial({
      emissive: PARTICLE_COLORS[colorGroup].hex,
      emissiveIntensity: 1.5,
      metalness: 0.3,
      roughness: 0.4,
    });
    this.mesh = new THREE.Mesh(geometry, material);

    this.updateOrbitalPosition();
  }

  public triggerCollapse(): void {
    if (this.collapseState !== 'normal') return;
    this.collapseState = 'collapsing';
    this.collapseStartTime = performance.now();
    this.collapseOrigin.copy(this.mesh.position);
    this.lastCollapseTime = this.collapseStartTime;
  }

  public update(deltaTime: number, speedMultiplier: number): void {
    if (this.collapseState === 'normal') {
      this.orbitalAngle += this.orbitSpeed * speedMultiplier * deltaTime;
      this.updateOrbitalPosition();
    } else {
      const elapsed = (performance.now() - this.collapseStartTime) / 1000;

      if (this.collapseState === 'collapsing') {
        const duration = 1;
        const t = Math.min(elapsed / duration, 1);
        const eased = t * t;
        this.mesh.position.lerpVectors(this.collapseOrigin, this.center, eased);
        if (t >= 1) {
          this.collapseState = 'exploding';
          this.collapseStartTime = performance.now();
          this.collapseOrigin.copy(this.mesh.position);
          this.collapseDirection
            .copy(this.mesh.position)
            .sub(this.center)
            .normalize()
            .multiplyScalar(this.orbitRadius * 2);
          this.collapseDirection.y += (Math.random() - 0.5) * this.orbitRadius;
        }
      } else if (this.collapseState === 'exploding') {
        const duration = 0.8;
        const t = Math.min(elapsed / duration, 1);
        const eased = t * (2 - t);
        const target = this.collapseOrigin.clone().add(this.collapseDirection);
        this.mesh.position.lerpVectors(this.collapseOrigin, target, eased);
        if (t >= 1) {
          this.collapseState = 'recovering';
          this.collapseStartTime = performance.now();
          this.collapseOrigin.copy(this.mesh.position);
        }
      } else if (this.collapseState === 'recovering') {
        const duration = 1;
        const t = Math.min(elapsed / duration, 1);
        const eased = t * t * (3 - 2 * t);
        this.updateOrbitalPosition();
        const orbitalPos = this.mesh.position.clone();
        this.mesh.position.lerpVectors(this.collapseOrigin, orbitalPos, eased);
        if (t >= 1) {
          this.collapseState = 'normal';
        }
      }
    }
  }

  public getPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }

  private updateOrbitalPosition(): void {
    this.mesh.position.x = this.center.x + Math.cos(this.orbitalAngle) * this.orbitRadius;
    this.mesh.position.z = this.center.z + Math.sin(this.orbitalAngle) * this.orbitRadius;
    this.mesh.position.y = this.center.y + Math.sin(this.orbitalAngle * 2) * this.orbitRadius * 0.15;
  }
}
