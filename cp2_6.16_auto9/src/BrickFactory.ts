declare const THREE: any;
import { BrickType, BRICK_LIBRARY } from './types';

export interface BrickMeshData {
  mesh: any;
  boundingBox: any;
  type: BrickType;
}

function getBrickColor(type: BrickType): string {
  const info = BRICK_LIBRARY.find(b => b.type === type);
  return info ? info.color : '#ffffff';
}

export class BrickFactory {
  private materialCache: Map<BrickType, any> = new Map();

  private getMaterial(type: BrickType): any {
    if (this.materialCache.has(type)) {
      return this.materialCache.get(type);
    }
    const color = getBrickColor(type);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.4,
      metalness: 0.15,
      flatShading: false
    });
    this.materialCache.set(type, material);
    return material;
  }

  createBrick(type: BrickType): BrickMeshData {
    let geometry: any;
    let boundingBox: any;

    switch (type) {
      case BrickType.Cube: {
        geometry = new THREE.BoxGeometry(1, 1, 1);
        boundingBox = new THREE.Box3(
          new THREE.Vector3(-0.5, -0.5, -0.5),
          new THREE.Vector3(0.5, 0.5, 0.5)
        );
        break;
      }
      case BrickType.Cuboid: {
        geometry = new THREE.BoxGeometry(2, 1, 1);
        boundingBox = new THREE.Box3(
          new THREE.Vector3(-1, -0.5, -0.5),
          new THREE.Vector3(1, 0.5, 0.5)
        );
        break;
      }
      case BrickType.TriangularPrism: {
        const shape = new THREE.Shape();
        shape.moveTo(-0.5, -0.5);
        shape.lineTo(0.5, -0.5);
        shape.lineTo(-0.5, 0.5);
        shape.lineTo(-0.5, -0.5);
        const extrudeSettings = {
          depth: 1,
          bevelEnabled: false
        };
        geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.translate(0, 0, -0.5);
        geometry.rotateZ(0);
        boundingBox = new THREE.Box3(
          new THREE.Vector3(-0.5, -0.5, -0.5),
          new THREE.Vector3(0.5, 0.5, 0.5)
        );
        break;
      }
      case BrickType.Cylinder: {
        geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
        boundingBox = new THREE.Box3(
          new THREE.Vector3(-0.5, -0.5, -0.5),
          new THREE.Vector3(0.5, 0.5, 0.5)
        );
        break;
      }
      case BrickType.Sphere: {
        geometry = new THREE.SphereGeometry(0.5, 32, 32);
        boundingBox = new THREE.Box3(
          new THREE.Vector3(-0.5, -0.5, -0.5),
          new THREE.Vector3(0.5, 0.5, 0.5)
        );
        break;
      }
      default:
        throw new Error(`Unknown brick type: ${type}`);
    }

    const material = this.getMaterial(type);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.brickType = type;
    mesh.userData.baseBoundingBox = boundingBox.clone();

    return { mesh, boundingBox: boundingBox.clone(), type };
  }

  createWireframe(mesh: any): any {
    const edges = new THREE.EdgesGeometry(mesh.geometry);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      linewidth: 2
    });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);
    wireframe.userData.isWireframe = true;
    return wireframe;
  }

  getBoundingBoxWorld(mesh: any): any {
    const box = mesh.userData.baseBoundingBox.clone();
    box.applyMatrix4(mesh.matrixWorld);
    return box;
  }

  getLocalBoundingBox(type: BrickType): any {
    const { boundingBox } = this.createBrick(type);
    return boundingBox;
  }

  createPreviewBrick(type: BrickType): any {
    const { mesh } = this.createBrick(type);
    mesh.scale.set(0.8, 0.8, 0.8);
    return mesh;
  }

  createGhostBrick(type: BrickType): any {
    const color = getBrickColor(type);
    let geometry: any;

    switch (type) {
      case BrickType.Cube:
        geometry = new THREE.BoxGeometry(1, 1, 1);
        break;
      case BrickType.Cuboid:
        geometry = new THREE.BoxGeometry(2, 1, 1);
        break;
      case BrickType.TriangularPrism: {
        const shape = new THREE.Shape();
        shape.moveTo(-0.5, -0.5);
        shape.lineTo(0.5, -0.5);
        shape.lineTo(-0.5, 0.5);
        shape.lineTo(-0.5, -0.5);
        geometry = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
        geometry.translate(0, 0, -0.5);
        break;
      }
      case BrickType.Cylinder:
        geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
        break;
      case BrickType.Sphere:
        geometry = new THREE.SphereGeometry(0.5, 32, 32);
        break;
      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
    }

    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.isGhost = true;
    mesh.userData.brickType = type;

    const edges = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8
    });
    const wireframe = new THREE.LineSegments(edges, edgeMaterial);
    mesh.add(wireframe);

    return mesh;
  }
}
