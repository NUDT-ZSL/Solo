import * as THREE from 'three';
import gsap from 'gsap';

export interface NodeData {
  id: number;
  position: THREE.Vector3;
  mesh: THREE.Mesh;
  connections: number[];
  baseColor: THREE.Color;
  isHighlighted: boolean;
  isPulseSource: boolean;
}

export interface ConnectionData {
  id: string;
  from: number;
  to: number;
  line: THREE.Line;
  baseColor: THREE.Color;
  isHighlighted: boolean;
}

export type DensityLevel = 'low' | 'medium' | 'high';

export class NeuralNetwork {
  public nodes: NodeData[] = [];
  public connections: ConnectionData[] = [];
  public group: THREE.Group;
  public nodeMeshes: THREE.Mesh[] = [];

  private scene: THREE.Scene;
  private readonly NODE_RADIUS = 0.3;
  private readonly SPREAD_RADIUS = 12;
  private readonly CONNECTION_DISTANCE = 6;

  private densityConfig: Record<DensityLevel, { min: number; max: number; distance: number }> = {
    low: { min: 3, max: 5, distance: 4.5 },
    medium: { min: 5, max: 8, distance: 6 },
    high: { min: 8, max: 12, distance: 8 }
  };

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
  }

  public generate(nodeCount: number, density: DensityLevel): void {
    this.clear();

    const positions = this.generateSphericalPositions(nodeCount);
    const config = this.densityConfig[density];

    for (let i = 0; i < nodeCount; i++) {
      const color = new THREE.Color().setHSL(Math.random() * 0.2 + 0.55, 0.8, 0.5);
      const geometry = new THREE.SphereGeometry(this.NODE_RADIUS, 16, 16);
      const material = new THREE.MeshPhongMaterial({
        color: color,
        transparent: true,
        opacity: 0.8,
        emissive: color,
        emissiveIntensity: 0.3
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(positions[i]);
      mesh.userData.nodeId = i;
      mesh.userData.type = 'node';

      this.group.add(mesh);
      this.nodeMeshes.push(m