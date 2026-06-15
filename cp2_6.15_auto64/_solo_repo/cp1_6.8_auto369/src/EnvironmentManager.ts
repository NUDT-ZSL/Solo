import * as THREE from 'three';

type TreeType = 'pine' | 'bush' | 'tall';

interface PlacedElement {
  mesh: THREE.Object3D;
  type: 'tree' | 'rock' | 'river';
}

export class EnvironmentManager {
  private scene: THREE.Scene;
  private terrain: { getHeightAt: (x: number, z: number) => number };
  private placedElements: PlacedElement[] = [];
  private density: number = 1;
  private riverFlowTime: number = 0;
  private riverMeshes: THREE.Mesh[] = [];
  private treeMeshes: THREE.Object3D[] = [];

  constructor(scene: THREE.Scene, terrain: { getHeightAt: (x: number, z: number) => number }) {
    this.scene = scene;
    this.terrain = terrain;
  }

  placeTree(position: THREE.Vector3, type?: TreeType): void {
    const treeType = type || (['pine', 'bush', 'tall'] as TreeType)[Math.floor(Math.random() * 3)];
    const height = this.terrain.getHeightAt(position.x, position.z);
    const pos = new THREE.Vector3(position.x, height, position.z);

    let tree: THREE.Group;

    switch (treeType) {
      case 'pine':
        tree = this.createPineTree();
        break;
      case 'bush':
        tree = this.createBushTree();
        break;
      case 'tall':
        tree = this.createTallTree();
        break;
    }

    const scale = (0.6 + Math.random() * 0.8) * this.density;
    tree.scale.setScalar(scale);
    tree.position.copy(pos);
    tree.rotation.y = Math.random() * Math.PI * 2;

    tree.castShadow = true;
    this.scene.add(tree);
    this.placedElements.push({ mesh: tree, type: 'tree' });
    this.treeMeshes.push(tree);
  }

  private createPineTree(): THREE.Group {
    const group = new THREE.Group();

    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.2, 6);
    const trunkMat = new THREE.MeshLambertMaterial({ color: '#8D6E63', flatShading: true });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.6;
    trunk.castShadow = true;
    group.add(trunk);

    const leafGeo = new THREE.ConeGeometry(0.8, 2, 7);
    const leafMat = new THREE.MeshLambertMaterial({ color: '#2E7D32', flatShading: true });
    const leaves = new THREE.Mesh(leafGeo, leafMat);
    leaves.position.y = 2.2;
    leaves.castShadow = true;
    group.add(leaves);

    return group;
  }

  private createBushTree(): THREE.Group {
    const group = new THREE.Group();

    const trunkGeo = new THREE.CylinderGeometry(0.1, 0.15, 0.6, 6);
    const trunkMat = new THREE.MeshLambertMaterial({ color: '#8D6E63', flatShading: true });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.3;
    trunk.castShadow = true;
    group.add(trunk);

    const leafGeo = new THREE.SphereGeometry(0.7, 6, 5);
    const leafMat = new THREE.MeshLambertMaterial({ color: '#558B2F', flatShading: true });
    const leaves = new THREE.Mesh(leafGeo, leafMat);
    leaves.position.y = 1.0;
    leaves.scale.y = 0.7;
    leaves.castShadow = true;
    group.add(leaves);

    return group;
  }

  private createTallTree(): THREE.Group {
    const group = new THREE.Group();

    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.8, 6);
    const trunkMat = new THREE.MeshLambertMaterial({ color: '#8D6E63', flatShading: true });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.9;
    trunk.castShadow = true;
    group.add(trunk);

    const colors = ['#33691E', '#2E7D32', '#558B2F'];

    for (let i = 0; i < 3; i++) {
      const size = 1.0 - i * 0.25;
      const leafGeo = new THREE.ConeGeometry(size * 0.6, size, 6);
      const leafMat = new THREE.MeshLambertMaterial({ color: colors[i], flatShading: true });
      const leaves = new THREE.Mesh(leafGeo, leafMat);
      leaves.position.y = 1.8 + i * 0.7;
      leaves.castShadow = true;
      group.add(leaves);
    }

    return group;
  }

  placeRock(position: THREE.Vector3): void {
    const height = this.terrain.getHeightAt(position.x, position.z);
    const pos = new THREE.Vector3(position.x, height, position.z);

    const detail = Math.floor(Math.random() * 2) + 1;
    const geo = new THREE.IcosahedronGeometry(0.4 + Math.random() * 0.3, detail);

    const positions = geo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const offset = 0.8 + Math.random() * 0.4;
      positions.setXYZ(i, x * offset, y * (0.6 + Math.random() * 0.5), z * offset);
    }
    geo.computeVertexNormals();

    const grayBase = 0.55 + Math.random() * 0.2;
    const mat = new THREE.MeshLambertMaterial({
      color: new THREE.Color(grayBase, grayBase, grayBase * 0.95),
      flatShading: true,
    });

    const rock = new THREE.Mesh(geo, mat);
    const scale = (0.5 + Math.random() * 1.0) * this.density;
    rock.scale.setScalar(scale);
    rock.position.copy(pos);
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    rock.castShadow = true;
    rock.receiveShadow = true;

    this.scene.add(rock);
    this.placedElements.push({ mesh: rock, type: 'rock' });
  }

  placeRiver(start: THREE.Vector3, end: THREE.Vector3): void {
    const startY = this.terrain.getHeightAt(start.x, start.z);
    const endY = this.terrain.getHeightAt(end.x, end.z);

    const midX = (start.x + end.x) / 2 + (Math.random() - 0.5) * 8;
    const midZ = (start.z + end.z) / 2 + (Math.random() - 0.5) * 8;
    const midY = this.terrain.getHeightAt(midX, midZ);

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(start.x, startY + 0.05, start.z),
      new THREE.Vector3(midX, midY + 0.05, midZ),
      new THREE.Vector3(end.x, endY + 0.05, end.z),
    ]);

    const tubeGeo = new THREE.TubeGeometry(curve, 30, 0.4, 6, false);
    const riverMat = new THREE.MeshPhongMaterial({
      color: '#4FC3F7',
      transparent: true,
      opacity: 0.6,
      flatShading: true,
      shininess: 80,
      specular: '#ffffff',
    });

    const river = new THREE.Mesh(tubeGeo, riverMat);
    river.castShadow = false;
    river.receiveShadow = true;

    this.scene.add(river);
    this.placedElements.push({ mesh: river, type: 'river' });
    this.riverMeshes.push(river);
  }

  updateRiverFlow(delta: number): void {
    this.riverFlowTime += delta;
    for (const river of this.riverMeshes) {
      const mat = river.material as THREE.MeshPhongMaterial;
      mat.opacity = 0.5 + Math.sin(this.riverFlowTime * 2) * 0.1;
    }
  }

  animateTrees(time: number): void {
    for (const tree of this.treeMeshes) {
      tree.rotation.z = Math.sin(time * 1.5 + tree.position.x) * 0.02;
    }
  }

  setDensity(density: number): void {
    this.density = density;
  }

  clearAll(): void {
    for (const element of this.placedElements) {
      this.scene.remove(element.mesh);
      if (element.mesh instanceof THREE.Mesh) {
        element.mesh.geometry.dispose();
        if (element.mesh.material instanceof THREE.Material) {
          element.mesh.material.dispose();
        }
      } else if (element.mesh instanceof THREE.Group) {
        element.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (child.material instanceof THREE.Material) {
              child.material.dispose();
            }
          }
        });
      }
    }
    this.placedElements = [];
    this.riverMeshes = [];
    this.treeMeshes = [];
  }

  getPlacedCount(): number {
    return this.placedElements.length;
  }
}
