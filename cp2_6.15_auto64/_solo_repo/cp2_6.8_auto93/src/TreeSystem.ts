import * as THREE from 'three';

export type TreeSpecies = 'pine' | 'oak' | 'maple';
export type ForestType = 'conifer' | 'broadleaf' | 'mixed';

export interface TreeData {
  id: number;
  species: TreeSpecies;
  position: THREE.Vector3;
  height: number;
  crownRadius: number;
  rootRadius: number;
  health: number;
  group: THREE.Group;
  crown: THREE.Object3D;
  trunk: THREE.Mesh;
}

export interface CompetitionData {
  treeA: number;
  treeB: number;
  coefficient: number;
}

const GROUND_SIZE = 20;
const MIN_TREE_SPACING = 0.5;
const MIN_TREES_PER_SPECIES = 6;

const SPECIES_CONFIG: Record<TreeSpecies, {
  heightRange: [number, number];
  crownRadiusRange: [number, number];
  rootRadiusRange: [number, number];
  crownColor: number;
}> = {
  pine: {
    heightRange: [3, 5],
    crownRadiusRange: [1.2, 1.8],
    rootRadiusRange: [1.5, 2.5],
    crownColor: 0x1B5E20
  },
  oak: {
    heightRange: [2, 4],
    crownRadiusRange: [1.5, 2.2],
    rootRadiusRange: [1.8, 2.8],
    crownColor: 0x8BC34A
  },
  maple: {
    heightRange: [2.5, 4.5],
    crownRadiusRange: [1.4, 2.0],
    rootRadiusRange: [1.6, 2.6],
    crownColor: 0xE65100
  }
};

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class TreeSystem {
  private scene: THREE.Scene;
  private trees: TreeData[] = [];
  private competitionLines: THREE.Line[] = [];
  private mycorrhizaLines: THREE.Line[] = [];
  private competitionData: CompetitionData[] = [];
  private forestType: ForestType = 'mixed';
  private mycorrhizaStrength: number = 0.5;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  generateTrees(forestType: ForestType): void {
    this.clearAll();
    this.forestType = forestType;

    const speciesDistribution: Record<ForestType, TreeSpecies[]> = {
      conifer: Array(12).fill('pine').concat(['oak', 'maple']),
      broadleaf: Array(6).fill('oak').concat(Array(6).fill('maple')).concat(['pine']),
      mixed: Array(MIN_TREES_PER_SPECIES).fill('pine')
        .concat(Array(MIN_TREES_PER_SPECIES).fill('oak'))
        .concat(Array(MIN_TREES_PER_SPECIES).fill('maple'))
    };

    const speciesList = speciesDistribution[forestType];
    const positions: THREE.Vector3[] = [];

    for (let i = 0; i < speciesList.length; i++) {
      const species = speciesList[i];
      let position: THREE.Vector3;
      let attempts = 0;

      do {
        position = new THREE.Vector3(
          randomInRange(-GROUND_SIZE / 2 + 2, GROUND_SIZE / 2 - 2),
          0,
          randomInRange(-GROUND_SIZE / 2 + 2, GROUND_SIZE / 2 - 2)
        );
        attempts++;
      } while (this.hasOverlap(position, positions) && attempts < 100);

      positions.push(position);
      this.createTree(i, species, position);
    }

    this.calculateCompetition();
    this.updateLines();
  }

  private hasOverlap(pos: THREE.Vector3, existingPositions: THREE.Vector3[]): boolean {
    for (const existing of existingPositions) {
      if (pos.distanceTo(existing) < MIN_TREE_SPACING * 2) {
        return true;
      }
    }
    return false;
  }

  private createTree(id: number, species: TreeSpecies, position: THREE.Vector3): void {
    const config = SPECIES_CONFIG[species];
    const height = randomInRange(config.heightRange[0], config.heightRange[1]);
    const crownRadius = randomInRange(config.crownRadiusRange[0], config.crownRadiusRange[1]);
    const rootRadius = randomInRange(config.rootRadiusRange[0], config.rootRadiusRange[1]);

    const group = new THREE.Group();
    group.position.copy(position);

    const trunkGeo = new THREE.CylinderGeometry(0.08, 0.15, height * 0.4, 8);
    const trunkMat = new THREE.MeshStandardMaterial({
      vertexColors: false,
      color: 0x5C4033,
      roughness: 0.9,
      metalness: 0.05
    });

    const colors = new Float32Array(trunkGeo.attributes.position.count * 3);
    const topColor = new THREE.Color(0x5C4033);
    const bottomColor = new THREE.Color(0x3E2723);
    const posAttr = trunkGeo.attributes.position;

    for (let i = 0; i < posAttr.count; i++) {
      const y = posAttr.getY(i);
      const t = (y + height * 0.2) / (height * 0.4);
      const color = topColor.clone().lerp(bottomColor, t);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    trunkGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    trunkMat.vertexColors = true;

    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = height * 0.2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    let crown: THREE.Object3D;

    if (species === 'pine') {
      crown = this.createPineCrown(height, crownRadius, config.crownColor);
    } else if (species === 'oak') {
      crown = this.createOakCrown(crownRadius, config.crownColor);
    } else {
      crown = this.createMapleCrown(height, crownRadius, config.crownColor);
    }

    crown.position.y = height * 0.45 + crownRadius * 0.3;
    group.add(crown);

    this.scene.add(group);

    this.trees.push({
      id,
      species,
      position,
      height,
      crownRadius,
      rootRadius,
      health: 1.0,
      group,
      crown,
      trunk
    });
  }

  private createPineCrown(height: number, radius: number, baseColor: number): THREE.Object3D {
    const group = new THREE.Group();
    const layers = 4;

    for (let i = 0; i < layers; i++) {
      const t = i / layers;
      const layerHeight = height * 0.15 * (1 - t * 0.3);
      const layerRadius = radius * (1 - t * 0.6);
      const coneGeo = new THREE.ConeGeometry(layerRadius, layerHeight, 8);
      const coneMat = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.85,
        metalness: 0.02
      });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.y = t * height * 0.35;
      cone.castShadow = true;
      cone.receiveShadow = true;
      group.add(cone);
    }

    return group;
  }

  private createOakCrown(radius: number, baseColor: number): THREE.Object3D {
    const group = new THREE.Group();
    const offsets = [
      [0, 0, 0],
      [radius * 0.5, radius * 0.2, 0],
      [-radius * 0.5, radius * 0.1, radius * 0.3],
      [0, radius * 0.3, -radius * 0.5],
      [radius * 0.3, -radius * 0.1, radius * 0.4]
    ];

    for (const [x, y, z] of offsets) {
      const r = radius * randomInRange(0.55, 0.75);
      const sphereGeo = new THREE.SphereGeometry(r, 12, 10);
      const hueShift = randomInRange(-0.05, 0.05);
      const color = new THREE.Color(baseColor).offsetHSL(hueShift, 0, randomInRange(-0.08, 0.08));
      const sphereMat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.8,
        metalness: 0.03
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.set(x, y, z);
      sphere.castShadow = true;
      sphere.receiveShadow = true;
      group.add(sphere);
    }

    return group;
  }

  private createMapleCrown(height: number, radius: number, baseColor: number): THREE.Object3D {
    const group = new THREE.Group();
    const layers = 3;

    for (let i = 0; i < layers; i++) {
      const t = i / layers;
      const layerRadius = radius * (1 - t * 0.5);
      const flattenedHeight = layerRadius * 0.35;
      const sphereGeo = new THREE.SphereGeometry(layerRadius, 14, 10);
      const scaleMatrix = new THREE.Matrix4().makeScale(1, 0.45, 1);
      sphereGeo.applyMatrix4(scaleMatrix);

      const hueShift = randomInRange(-0.03, 0.03) + t * 0.02;
      const color = new THREE.Color(baseColor).offsetHSL(hueShift, 0, randomInRange(-0.1, 0.05));
      const sphereMat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.78,
        metalness: 0.04
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.y = t * height * 0.2 + flattenedHeight * 0.3;
      sphere.castShadow = true;
      sphere.receiveShadow = true;
      group.add(sphere);
    }

    return group;
  }

  calculateCompetition(): void {
    this.competitionData = [];

    for (let i = 0; i < this.trees.length; i++) {
      for (let j = i + 1; j < this.trees.length; j++) {
        const treeA = this.trees[i];
        const treeB = this.trees[j];
        const distance = treeA.position.distanceTo(treeB.position);

        const crownOverlap = this.calculateCircleOverlap(
          treeA.crownRadius,
          treeB.crownRadius,
          distance
        );
        const maxCrownArea = Math.PI * Math.max(treeA.crownRadius, treeB.crownRadius) ** 2;
        const crownOverlapRatio = maxCrownArea > 0 ? crownOverlap / maxCrownArea : 0;

        const rootOverlap = this.calculateCircleOverlap(
          treeA.rootRadius,
          treeB.rootRadius,
          distance
        );
        const maxRootArea = Math.PI * Math.max(treeA.rootRadius, treeB.rootRadius) ** 2;
        const rootOverlapRatio = maxRootArea > 0 ? rootOverlap / maxRootArea : 0;

        const coefficient = clamp(crownOverlapRatio * 0.5 + rootOverlapRatio * 0.5, 0, 1);

        if (coefficient > 0.05) {
          this.competitionData.push({
            treeA: i,
            treeB: j,
            coefficient
          });
        }
      }
    }

    this.updateTreeHealth();
  }

  private calculateCircleOverlap(r1: number, r2: number, d: number): number {
    if (d >= r1 + r2) return 0;
    if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;

    const a = (r1 ** 2 - r2 ** 2 + d ** 2) / (2 * d);
    const h = Math.sqrt(r1 ** 2 - a ** 2);
    const alpha = 2 * Math.acos(a / r1);
    const beta = 2 * Math.acos((d - a) / r2);

    return 0.5 * (alpha * r1 ** 2 + beta * r2 ** 2 - d * h * 2);
  }

  private updateTreeHealth(): void {
    const competitionMap: Map<number, number> = new Map();

    for (const comp of this.competitionData) {
      competitionMap.set(comp.treeA, (competitionMap.get(comp.treeA) || 0) + comp.coefficient);
      competitionMap.set(comp.treeB, (competitionMap.get(comp.treeB) || 0) + comp.coefficient);
    }

    for (let i = 0; i < this.trees.length; i++) {
      const totalCompetition = competitionMap.get(i) || 0;
      this.trees[i].health = clamp(1 - totalCompetition * 0.3, 0.3, 1);
      this.updateCrownColor(this.trees[i]);
    }
  }

  private updateCrownColor(tree: TreeData): void {
    const baseColor = SPECIES_CONFIG[tree.species].crownColor;
    const healthColor = new THREE.Color(baseColor);
    healthColor.lerp(new THREE.Color(0x8B4513), (1 - tree.health) * 0.5);

    tree.crown.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat.color) {
          mat.color.copy(healthColor);
          mat.color.offsetHSL((Math.random() - 0.5) * 0.04, 0, (Math.random() - 0.5) * 0.06);
        }
      }
    });
  }

  updateLines(): void {
    this.clearLines();

    for (const comp of this.competitionData) {
      if (comp.coefficient > 0.15) {
        const treeA = this.trees[comp.treeA];
        const treeB = this.trees[comp.treeB];
        const midHeight = (treeA.height * 0.3 + treeB.height * 0.3) / 2;

        const points = [
          new THREE.Vector3(treeA.position.x, midHeight, treeA.position.z),
          new THREE.Vector3(treeB.position.x, midHeight, treeB.position.z)
        ];

        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({
          color: 0xFF4444,
          transparent: true,
          opacity: Math.min(comp.coefficient * 0.8, 0.8)
        });
        const line = new THREE.Line(geo, mat);
        this.competitionLines.push(line);
        this.scene.add(line);
      }
    }

    if (this.mycorrhizaStrength > 0.5) {
      for (let i = 0; i < this.trees.length; i++) {
        for (let j = i + 1; j < this.trees.length; j++) {
          const treeA = this.trees[i];
          const treeB = this.trees[j];
          const distance = treeA.position.distanceTo(treeB.position);
          const maxMycorrhizaDist = (treeA.rootRadius + treeB.rootRadius) * 1.5;

          if (distance < maxMycorrhizaDist && this.mycorrhizaStrength > 0.5) {
            const points = [
              new THREE.Vector3(treeA.position.x, 0.05, treeA.position.z),
              new THREE.Vector3(
                (treeA.position.x + treeB.position.x) / 2,
                -0.3 - Math.random() * 0.3,
                (treeA.position.z + treeB.position.z) / 2
              ),
              new THREE.Vector3(treeB.position.x, 0.05, treeB.position.z)
            ];

            const geo = new THREE.BufferGeometry().setFromPoints(points);
            const strength = (this.mycorrhizaStrength - 0.5) * 2;
            const color = new THREE.Color().setHSL(0.75 + (1 - strength) * 0.1, 0.6, 0.55);
            const mat = new THREE.LineBasicMaterial({
              color,
              transparent: true,
              opacity: 0.35 + strength * 0.35
            });
            const line = new THREE.Line(geo, mat);
            this.mycorrhizaLines.push(line);
            this.scene.add(line);
          }
        }
      }
    }
  }

  private clearLines(): void {
    for (const line of [...this.competitionLines, ...this.mycorrhizaLines]) {
      this.scene.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    this.competitionLines = [];
    this.mycorrhizaLines = [];
  }

  private clearAll(): void {
    this.clearLines();
    for (const tree of this.trees) {
      this.scene.remove(tree.group);
      tree.group.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            (mesh.material as THREE.Material).dispose();
          }
        }
      });
    }
    this.trees = [];
    this.competitionData = [];
  }

  setMycorrhizaStrength(strength: number): void {
    if (Math.abs(strength - this.mycorrhizaStrength) > 0.05) {
      this.mycorrhizaStrength = strength;
      this.updateLines();
    }
  }

  getTrees(): TreeData[] {
    return this.trees;
  }

  getTreeCount(): number {
    return this.trees.length;
  }

  getCompetitionData(): CompetitionData[] {
    return this.competitionData;
  }

  getForestType(): ForestType {
    return this.forestType;
  }

  dispose(): void {
    this.clearAll();
  }
}
