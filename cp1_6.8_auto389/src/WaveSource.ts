import * as THREE from 'three';

export class WaveSource {
  public readonly position: THREE.Vector3;
  public readonly creationTime: number;
  public readonly id: number;

  private static nextId = 0;

  constructor(position: THREE.Vector3, creationTime: number) {
    this.position = position.clone();
    this.creationTime = creationTime;
    this.id = WaveSource.nextId++;
  }

  static resetIdCounter(): void {
    WaveSource.nextId = 0;
  }
}
