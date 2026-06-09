import * as THREE from 'three';

export class Crystal {
  public mesh: THREE.Mesh;
  public material: THREE.MeshPhongMaterial;
  public baseScale: number;
  public breathPhase: number;
  public breathSpeed: number;
  public depth: number;
  public createdAt: number;

  constructor(
    position: THREE.Vector3,
    rotation: THREE.Euler,
    colorStart: THREE.Color,
    colorEnd: THREE.Color,
    colorProgress: number,
    opacity: number,
    depth: number,
    scale: number = 1
  ) {
    this.depth = depth;
    this.baseScale = scale;
    this.breathPhase = Math.random() * Math.PI * 2;
    this.breathSpeed = 1 / (1 + Math.random());
    this.createdAt = performance.now();

    const geometry = this.createCrystalGeometry();

    const color = colorStart.clone().lerp(colorEnd, colorProgress);

    this.material = new THREE.MeshPhongMaterial({
      color: color,
      transparent: true,
      opacity: opacity,
      shininess: 100,
      specular: 0xffffff,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.copy(position);
    this.mesh.rotation.copy(rotation);
    this.mesh.scale.setScalar(scale);
  }

  private createCrystalGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];

    const top = new THREE.Vector3(0, 0.6, 0);
    const bottom = new THREE.Vector3(0, -0.6, 0);
    const midPoints: THREE.Vector3[] = [];

    const midCount = 6;
    for (let i = 0; i < midCount; i++) {
      const angle = (i / midCount) * Math.PI * 2;
      const radius = 0.25 + Math.random() * 0.1;
      const y = (Math.random() - 0.5) * 0.3;
      midPoints.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius
      ));
    }

    const vertexData = [top, bottom, ...midPoints];
    vertexData.forEach(v => {
      vertices.push(v.x, v.y, v.z);
    });

    for (let i = 0; i < midCount; i++) {
      const next = (i + 1) % midCount;
      indices.push(0, 2 + i, 2 + next);
      indices.push(1, 2 + next, 2 + i);
    }

    for (let i = 0; i < midCount; i += 2) {
      const next = (i + 1) % midCount;
      const next2 = (i + 2) % midCount;
      indices.push(2 + i, 2 + next, 2 + next2);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }

  public updateBreath(time: number): void {
    const breath = 0.9 + 0.1 * Math.sin(time * this.breathSpeed + this.breathPhase);
    this.mesh.scale.setScalar(this.baseScale * breath);
  }

  public updateColor(colorStart: THREE.Color, colorEnd: THREE.Color, colorProgress: number): void {
    const color = colorStart.clone().lerp(colorEnd, colorProgress);
    this.material.color.copy(color);
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
