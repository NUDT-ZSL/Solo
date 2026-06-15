import * as THREE from 'three';

export class CaveGenerator {
  public group: THREE.Group;
  private seed: number;

  constructor(seed: number = Math.random()) {
    this.seed = seed;
    this.group = new THREE.Group();
    this.generate();
  }

  private seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  private random(i: number): number {
    this.seed += i;
    return this.seededRandom(this.seed);
  }

  private generate(): void {
    const caveRadius = 22 + this.random(1) * 3;

    const caveGeo = new THREE.SphereGeometry(caveRadius, 64, 48);
    const positions = caveGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const noise = (this.random(i) - 0.5) * 2 * 1.5;
      const length = Math.sqrt(x * x + y * y + z * z);
      const nx = x / length;
      const ny = y / length;
      const nz = z / length;
      positions.setXYZ(i, x + nx * noise, y + ny * noise, z + nz * noise);
    }
    caveGeo.computeVertexNormals();

    const caveMat = new THREE.MeshPhysicalMaterial({
      color: 0x3A4A5C,
      transparent: true,
      opacity: 0.7,
      side: THREE.BackSide,
      roughness: 0.85,
      metalness: 0.1,
      flatShading: true
    });

    const cave = new THREE.Mesh(caveGeo, caveMat);
    this.group.add(cave);

    const groundRadius = 30;
    const groundDivisions = 60;
    const groundGeo = new THREE.PlaneGeometry(groundRadius * 2, groundRadius * 2, groundDivisions, groundDivisions);
    groundGeo.rotateX(-Math.PI / 2);
    const gPositions = groundGeo.attributes.position;
    for (let i = 0; i < gPositions.count; i++) {
      const y = (this.random(i + 1000) - 0.5) * 0.3;
      gPositions.setY(i, y);
    }
    groundGeo.computeVertexNormals();
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2C3E50,
      transparent: true,
      opacity: 0.9,
      roughness: 0.9,
      metalness: 0.05
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -caveRadius * 0.58;
    this.group.add(ground);

    const gridHelper = new THREE.GridHelper(groundRadius * 2, groundDivisions, 0x2C3E50, 0x2C3E50);
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.3;
    gridHelper.position.y = -caveRadius * 0.581;
    this.group.add(gridHelper);

    const ambientLight = new THREE.AmbientLight(0x667788, 0.4);
    this.group.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x88CCFF, 0.8);
    dirLight.position.set(15, 20, 15);
    this.group.add(dirLight);
  }

  public getGroundY(): number {
    return -22 * 0.58 + 0.2;
  }
}
