import * as THREE from 'three';

export interface SoilSize {
  width: number;
  height: number;
  depth: number;
}

export interface Rock {
  mesh: THREE.Mesh;
  radius: number;
}

export interface WaterZone {
  mesh: THREE.Mesh;
  radius: number;
  center: THREE.Vector3;
}

export class SoilModule {
  public readonly soilSize: SoilSize = { width: 10, height: 8, depth: 10 };
  public readonly soilGroup: THREE.Group = new THREE.Group();
  public soilBounds!: THREE.Box3;
  public soilMesh!: THREE.Mesh;
  public rocks: Rock[] = [];
  public waterZones: WaterZone[] = [];
  public seed: THREE.Mesh | null = null;
  public seedPosition: THREE.Vector3 | null = null;

  private readonly maxRocks = 3;
  private readonly rockColor = 0xD3D3D3;
  private readonly waterColor = 0x4A90D9;
  private readonly seedColor = 0x4CAF50;

  constructor() {
    this.createSoilBox();
  }

  private createSoilBox(): void {
    const { width, height, depth } = this.soilSize;

    const borderGeo = new THREE.BoxGeometry(width, height, depth);
    const edges = new THREE.EdgesGeometry(borderGeo);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x5C4033, linewidth: 2 });
    const borderLines = new THREE.LineSegments(edges, lineMat);
    this.soilGroup.add(borderLines);

    const fillGeo = new THREE.BoxGeometry(width - 0.02, height - 0.02, depth - 0.02);
    const fillMat = new THREE.MeshPhongMaterial({
      color: 0x8B6F47,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.soilMesh = new THREE.Mesh(fillGeo, fillMat);
    this.soilMesh.name = 'soilMesh';
    this.soilGroup.add(this.soilMesh);

    this.soilBounds = new THREE.Box3(
      new THREE.Vector3(-width / 2, -height, -depth / 2),
      new THREE.Vector3(width / 2, 0, depth / 2)
    );

    const gridHelper = new THREE.GridHelper(
      Math.max(width, depth),
      10,
      0x5C4033,
      0x5C4033
    );
    gridHelper.material.opacity = 0.3;
    gridHelper.material.transparent = true;
    gridHelper.position.y = -0.01;
    this.soilGroup.add(gridHelper);
  }

  public placeSeed(position: THREE.Vector3): THREE.Mesh | null {
    if (this.seed !== null) {
      return null;
    }
    const seedGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const seedMat = new THREE.MeshPhongMaterial({
      color: this.seedColor,
      emissive: 0x1B5E20,
      emissiveIntensity: 0.2,
      shininess: 60
    });
    this.seed = new THREE.Mesh(seedGeo, seedMat);
    const clamped = this.clampToSoil(position);
    clamped.y = 0;
    this.seed.position.copy(clamped);
    this.seed.castShadow = true;
    this.seedPosition = clamped.clone();
    this.soilGroup.add(this.seed);
    return this.seed;
  }

  public placeRock(position: THREE.Vector3): Rock | null {
    if (this.rocks.length >= this.maxRocks) {
      return null;
    }
    const radius = 0.5 + Math.random() * 0.5;
    const rockGeo = new THREE.SphereGeometry(radius, 24, 16);
    const positions = rockGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const v = new THREE.Vector3();
      v.fromBufferAttribute(positions, i);
      v.multiplyScalar(0.85 + Math.random() * 0.3);
      positions.setXYZ(i, v.x, v.y, v.z);
    }
    rockGeo.computeVertexNormals();

    const rockMat = new THREE.MeshPhongMaterial({
      color: this.rockColor,
      flatShading: true,
      shininess: 20
    });
    const rockMesh = new THREE.Mesh(rockGeo, rockMat);
    const clamped = this.clampToSoil(position);
    clamped.y = Math.max(clamped.y, -radius);
    rockMesh.position.copy(clamped);
    rockMesh.castShadow = true;
    rockMesh.receiveShadow = true;

    const rock: Rock = { mesh: rockMesh, radius };
    this.rocks.push(rock);
    this.soilGroup.add(rockMesh);
    return rock;
  }

  public addWaterZone(position: THREE.Vector3): WaterZone | null {
    const radius = 1 + Math.random();
    const waterGeo = new THREE.SphereGeometry(radius, 24, 16);
    const waterMat = new THREE.MeshPhongMaterial({
      color: this.waterColor,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
      emissive: 0x1976D2,
      emissiveIntensity: 0.15
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    const clamped = this.clampToSoil(position);
    waterMesh.position.copy(clamped);

    const wireGeo = new THREE.SphereGeometry(radius, 12, 8);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x64B5F6,
      wireframe: true,
      transparent: true,
      opacity: 0.3
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    waterMesh.add(wireMesh);

    const zone: WaterZone = {
      mesh: waterMesh,
      radius,
      center: clamped.clone()
    };
    this.waterZones.push(zone);
    this.soilGroup.add(waterMesh);
    return zone;
  }

  public clampToSoil(pos: THREE.Vector3): THREE.Vector3 {
    const min = this.soilBounds.min;
    const max = this.soilBounds.max;
    return new THREE.Vector3(
      Math.max(min.x + 0.3, Math.min(max.x - 0.3, pos.x)),
      Math.max(min.y + 0.3, Math.min(max.y - 0.1, pos.y)),
      Math.max(min.z + 0.3, Math.min(max.z - 0.3, pos.z))
    );
  }

  public isInsideSoil(pos: THREE.Vector3, margin: number = 0.05): boolean {
    const min = this.soilBounds.min;
    const max = this.soilBounds.max;
    return (
      pos.x >= min.x + margin && pos.x <= max.x - margin &&
      pos.y >= min.y + margin && pos.y <= max.y - margin &&
      pos.z >= min.z + margin && pos.z <= max.z - margin
    );
  }

  public checkRockCollision(pos: THREE.Vector3, radius: number = 0.05): Rock | null {
    for (const rock of this.rocks) {
      const dist = pos.distanceTo(rock.mesh.position);
      if (dist < rock.radius + radius) {
        return rock;
      }
    }
    return null;
  }

  public getWaterAttraction(pos: THREE.Vector3): THREE.Vector3 {
    const attraction = new THREE.Vector3(0, 0, 0);
    for (const zone of this.waterZones) {
      const toZone = new THREE.Vector3().subVectors(zone.center, pos);
      const dist = toZone.length();
      if (dist < zone.radius * 1.5 && dist > 0.01) {
        const strength = Math.max(0, 1 - dist / (zone.radius * 1.5));
        attraction.add(toZone.normalize().multiplyScalar(strength));
      }
    }
    return attraction;
  }

  public isInWaterZone(pos: THREE.Vector3): boolean {
    for (const zone of this.waterZones) {
      const dist = pos.distanceTo(zone.center);
      if (dist < zone.radius) {
        return true;
      }
    }
    return false;
  }

  public removeSeed(): void {
    if (this.seed) {
      this.soilGroup.remove(this.seed);
      this.seed = null;
      this.seedPosition = null;
    }
  }

  public clearAll(): void {
    for (const rock of this.rocks) {
      this.soilGroup.remove(rock.mesh);
    }
    this.rocks = [];
    for (const zone of this.waterZones) {
      this.soilGroup.remove(zone.mesh);
    }
    this.waterZones = [];
    this.removeSeed();
  }
}
