import * as THREE from 'three';

export class TideSystem {
  private time = 0;
  private period = 30.0;
  private phase = 0;

  update(delta: number) {
    this.time += delta;
    this.phase = ((this.time % this.period) / this.period) * Math.PI * 2;
  }

  getPhase(): number {
    return this.phase;
  }

  getPhaseNormalized(): number {
    return (Math.sin(this.phase) + 1) / 2;
  }

  getFlowDirection(position: THREE.Vector3): THREE.Vector3 {
    const sinPhase = Math.sin(this.phase);
    const cosPhase = Math.cos(this.phase);

    const angle = Math.atan2(position.z, position.x) + sinPhase * 0.5;
    const radial = new THREE.Vector3(
      Math.cos(angle) * cosPhase,
      sinPhase * 0.3,
      Math.sin(angle) * cosPhase,
    );

    const swirl = new THREE.Vector3(
      -position.z * 0.02 * sinPhase,
      0,
      position.x * 0.02 * sinPhase,
    );

    const dir = radial.add(swirl);
    dir.normalize();
    return dir;
  }

  getFlowSpeed(): number {
    return (Math.sin(this.phase) + 1) * 0.5 + 0.2;
  }

  isHighTide(): boolean {
    return Math.sin(this.phase) > 0.5;
  }

  isLowTide(): boolean {
    return Math.sin(this.phase) < -0.5;
  }

  getTideLevel(): number {
    return Math.sin(this.phase);
  }

  getClusterStrength(): number {
    return Math.max(0, Math.sin(this.phase) * 0.8 + 0.2);
  }
}
